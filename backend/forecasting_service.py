import json
import os
import pickle
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sklearn.metrics import mean_absolute_error, mean_squared_error
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.statespace.sarimax import SARIMAX

# Silence convergence warnings that are common with small pharmacy datasets
import warnings

warnings.filterwarnings('ignore')


class ForecastingService:
    """Utility responsible for training, storing and serving demand forecasts."""

    def __init__(self, db_connection_string: Optional[str] = None) -> None:
        self.db_connection_string = db_connection_string or os.getenv('DATABASE_URL')
        self.engine: Optional[Engine] = (
            create_engine(self.db_connection_string)
            if self.db_connection_string
            else None
        )

        self.models_dir = os.path.join('backend', 'ai_models')
        os.makedirs(self.models_dir, exist_ok=True)

        # Don't connect at initialization - connect lazily on first use
        # This prevents startup failures if database is temporarily unavailable
        # if self.engine:
        #     self._ensure_metadata_table()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _ensure_metadata_table(self) -> None:
        if not self.engine:
            return

        ddl = text(
            """
            CREATE TABLE IF NOT EXISTS forecasting_models (
                id bigserial PRIMARY KEY,
                pharmacy_id bigint NOT NULL,
                model_type text NOT NULL,
                target_id text NOT NULL,
                target_name text,
                accuracy_percentage numeric(6,2),
                accuracy_mae numeric,
                accuracy_rmse numeric,
                seasonal_period integer,
                model_order jsonb,
                training_rows integer,
                last_trained_at timestamptz DEFAULT now(),
                created_at timestamptz DEFAULT now(),
                updated_at timestamptz DEFAULT now(),
                UNIQUE (pharmacy_id, model_type, target_id)
            )
            """
        )

        with self.engine.begin() as conn:
            conn.execute(ddl)
            alters = [
                "ALTER TABLE forecasting_models ADD COLUMN IF NOT EXISTS accuracy_percentage numeric(6,2)",
                "ALTER TABLE forecasting_models ADD COLUMN IF NOT EXISTS accuracy_mae numeric",
                "ALTER TABLE forecasting_models ADD COLUMN IF NOT EXISTS accuracy_rmse numeric",
                "ALTER TABLE forecasting_models ADD COLUMN IF NOT EXISTS seasonal_period integer",
                "ALTER TABLE forecasting_models ADD COLUMN IF NOT EXISTS model_order jsonb",
                "ALTER TABLE forecasting_models ADD COLUMN IF NOT EXISTS training_rows integer",
                "ALTER TABLE forecasting_models ADD COLUMN IF NOT EXISTS last_trained_at timestamptz",
                "ALTER TABLE forecasting_models ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now()",
            ]
            for stmt in alters:
                conn.execute(text(stmt))
            conn.execute(
                text(
                    """
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_forecasting_models_unique
                    ON forecasting_models (pharmacy_id, model_type, target_id)
                    """
                )
            )

    @staticmethod
    def _model_filename(model_type: str, pharmacy_id: int, target_id: str) -> str:
        safe_target = str(target_id).replace('/', '_')
        return f"{model_type}_{pharmacy_id}_{safe_target}.pkl"

    @staticmethod
    def _suggest_seasonal_period(series: pd.Series) -> int:
        length = len(series)
        if length >= 365:
            return 365
        if length >= 180:
            return 90
        if length >= 90:
            return 30
        if length >= 60:
            return 14
        if length >= 30:
            return 7
        if length >= 14:
            return 7
        return max(2, min(7, length // 2 or 1))

    # ------------------------------------------------------------------
    # Data gathering
    # ------------------------------------------------------------------
    def get_historical_data(
        self,
        pharmacy_id: int,
        product_id: Optional[int] = None,
        category_id: Optional[int] = None,
        days: int = 365,
    ) -> pd.DataFrame:
        """Fetch aggregated demand data from Supabase for a product or category."""

        if not self.engine or not pharmacy_id:
            return pd.DataFrame()

        if not product_id and not category_id:
            return pd.DataFrame()

        end_date = datetime.utcnow().date()
        start_date = end_date - timedelta(days=max(days - 1, 0))

        params: Dict[str, Any] = {
            'ph': pharmacy_id,
            'start': start_date,
            'end': end_date,
        }
        
        if product_id:
            params['pid'] = int(product_id)
            sql = text(
                """
                SELECT 
                    h.sale_date::date AS sale_date,
                    SUM(h.quantity_sold) AS quantity,
                    SUM(COALESCE(h.total_revenue, h.quantity_sold * COALESCE(p.unit_price, 0))) AS revenue,
                    SUM(h.quantity_sold * COALESCE(p.cost_price, 0)) AS cost
                FROM historical_sales_daily h
                JOIN products p ON p.id = h.product_id
                WHERE h.pharmacy_id = :ph
                  AND h.product_id = :pid
                  AND h.sale_date BETWEEN :start AND :end
                GROUP BY sale_date
                ORDER BY sale_date ASC
                """
            )
        else:
            params['cid'] = int(category_id)
            sql = text(
                """
                SELECT 
                    h.sale_date::date AS sale_date,
                    SUM(h.quantity_sold) AS quantity,
                    SUM(COALESCE(h.total_revenue, h.quantity_sold * COALESCE(p.unit_price, 0))) AS revenue,
                    SUM(h.quantity_sold * COALESCE(p.cost_price, 0)) AS cost
                FROM historical_sales_daily h
                JOIN products p ON p.id = h.product_id
                WHERE h.pharmacy_id = :ph
                  AND p.category_id = :cid
                  AND h.sale_date BETWEEN :start AND :end
                GROUP BY sale_date
                ORDER BY sale_date ASC
                """
            )

        with self.engine.connect() as conn:
            df = pd.read_sql(sql, conn, params=params)

        if df.empty:
            return df
        
        df['sale_date'] = pd.to_datetime(df['sale_date'])
        df = df.set_index('sale_date').sort_index()
        df = df[['quantity', 'revenue', 'cost']]
        df[['quantity', 'revenue', 'cost']] = df[['quantity', 'revenue', 'cost']].fillna(0.0)
        return df
    
    @staticmethod
    def _prepare_series(df: pd.DataFrame) -> pd.Series:
        if df.empty:
            return pd.Series(dtype=float)

        series = df['quantity'].astype(float)
        idx = pd.date_range(series.index.min(), series.index.max(), freq='D')
        series = series.reindex(idx, fill_value=0.0)
        series = series.clip(lower=0.0)
        return series

    def prepare_series(self, df: pd.DataFrame) -> pd.Series:
        """Public wrapper so callers can obtain a cleaned series."""
        return self._prepare_series(df)

    def _fit_model(
        self, series: pd.Series, seasonal_period: int
    ) -> Tuple[Any, Dict[str, Any]]:
        try:
            seasonal_period = max(2, seasonal_period)
            order = (1, 1, 1)
            seasonal_order = (1, 1, 1, seasonal_period)
            model = SARIMAX(
                series,
                order=order,
                seasonal_order=seasonal_order,
                enforce_stationarity=False,
                enforce_invertibility=False,
            )
            fitted = model.fit(disp=False)
            return fitted, {
                'type': 'sarima',
                'order': order,
                'seasonal_order': seasonal_order,
            }
        except Exception as primary_error:
            seasonal = seasonal_period if seasonal_period >= 4 else None
            try:
                model = ExponentialSmoothing(
                    series,
                    trend='add',
                    seasonal='add' if seasonal else None,
                    seasonal_periods=seasonal,
                )
                fitted = model.fit()
                return fitted, {
                    'type': 'exponential',
                    'trend': 'add',
                    'seasonal': 'add' if seasonal else None,
                    'seasonal_periods': seasonal,
                }
            except Exception as fallback_error:
                raise RuntimeError(
                    f'Failed to fit forecasting model: {primary_error}'
                ) from fallback_error

    def _forecast_from_model(self, fitted_model: Any, steps: int) -> Tuple[np.ndarray, Optional[list]]:
        if hasattr(fitted_model, 'get_forecast'):
            res = fitted_model.get_forecast(steps=steps)
            mean = res.predicted_mean
            values = np.maximum(np.asarray(mean), 0.0)
            confidence = None
            try:
                conf_df = res.conf_int()
                lower = np.maximum(conf_df.iloc[:, 0].to_numpy(), 0.0)
                upper = np.maximum(conf_df.iloc[:, 1].to_numpy(), 0.0)
                confidence = [
                    [float(l), float(u)] for l, u in zip(lower.tolist(), upper.tolist())
                ]
            except Exception:
                confidence = None
            return values, confidence

        if hasattr(fitted_model, 'forecast'):
            mean = fitted_model.forecast(steps)
            values = np.maximum(np.asarray(mean), 0.0)
            confidence = None
            resid = getattr(fitted_model, 'resid', None)
            if resid is not None and len(resid) > 1:
                window = resid[-min(30, len(resid)) :]
                resid_std = float(np.std(window))
                if resid_std > 0:
                    confidence = [
                        [float(max(v - 1.96 * resid_std, 0.0)), float(v + 1.96 * resid_std)]
                        for v in values
                    ]
            return values, confidence

        raise ValueError('Unsupported model type for forecasting')

    def _upsert_model_metadata(
        self,
        pharmacy_id: int,
        model_type: str,
        target_id: str,
        target_name: str,
        metrics: Dict[str, Any],
        model_meta: Dict[str, Any],
    ) -> None:
        if not self.engine:
            return

        with self.engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO forecasting_models (
                        pharmacy_id,
                        model_type,
                        target_id,
                        target_name,
                        accuracy_percentage,
                        accuracy_mae,
                        accuracy_rmse,
                        seasonal_period,
                        model_order,
                        training_rows,
                        last_trained_at,
                        updated_at
                    )
                    VALUES (
                        :pharmacy_id,
                        :model_type,
                        :target_id,
                        :target_name,
                        :accuracy_percentage,
                        :accuracy_mae,
                        :accuracy_rmse,
                        :seasonal_period,
                        :model_order,
                        :training_rows,
                        now(),
                        now()
                    )
                    ON CONFLICT (pharmacy_id, model_type, target_id)
                    DO UPDATE SET
                        target_name = EXCLUDED.target_name,
                        accuracy_percentage = EXCLUDED.accuracy_percentage,
                        accuracy_mae = EXCLUDED.accuracy_mae,
                        accuracy_rmse = EXCLUDED.accuracy_rmse,
                        seasonal_period = EXCLUDED.seasonal_period,
                        model_order = EXCLUDED.model_order,
                        training_rows = EXCLUDED.training_rows,
                        last_trained_at = now(),
                        updated_at = now()
                    """
                ),
                {
                    'pharmacy_id': pharmacy_id,
                    'model_type': model_type,
                    'target_id': target_id,
                    'target_name': target_name,
                    'accuracy_percentage': metrics.get('accuracy_percentage'),
                    'accuracy_mae': metrics.get('mae'),
                    'accuracy_rmse': metrics.get('rmse'),
                    'seasonal_period': metrics.get('seasonal_period'),
                    'model_order': json.dumps(model_meta or {}),
                    'training_rows': metrics.get('training_rows'),
                },
            )

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def train_model(
        self,
        pharmacy_id: int,
        target_id: int,
        target_name: str,
        model_type: str = 'product',
        days: int = 365,
    ) -> Tuple[Optional[Dict[str, Any]], str]:
        target_key = str(target_id)
        category_id = target_id if model_type == 'category' else None
        product_id = target_id if model_type != 'category' else None

        df = self.get_historical_data(
            pharmacy_id,
            product_id=product_id,
            category_id=category_id,
            days=days,
        )

        if df.empty or df['quantity'].astype(float).sum() <= 0:
            return None, 'Insufficient historical sales data to train a forecasting model.'

        series = self._prepare_series(df)

        if len(series) < 14 or series.nunique() <= 1:
            return None, 'Historical series is too short or lacks variability for reliable training.'

        seasonal_period = self._suggest_seasonal_period(series)
        train_size = max(int(len(series) * 0.8), len(series) - 14)
        if train_size <= 0 or train_size >= len(series):
            train_size = max(1, len(series) - 7)

        train = series.iloc[:train_size]
        test = series.iloc[train_size:]

        fitted_train, model_meta = self._fit_model(train, seasonal_period)

        if not test.empty:
            preds, _ = self._forecast_from_model(fitted_train, len(test))
            preds_series = pd.Series(preds, index=test.index)
            mae = float(mean_absolute_error(test, preds_series))
            rmse = float(np.sqrt(mean_squared_error(test, preds_series)))
            denom = max(test.mean(), series.mean(), 1e-6)
            accuracy = max(0.0, min(100.0, 100.0 - (mae / denom * 100.0)))
        else:
            mae = 0.0
            rmse = 0.0
            accuracy = 100.0

        fitted_full, model_meta = self._fit_model(series, seasonal_period)
        model_path = self.save_model(
            fitted_full,
            model_meta,
            model_type,
            pharmacy_id,
            target_key,
        )

        metrics = {
            'accuracy_percentage': float(round(accuracy, 2)),
            'mae': float(round(mae, 4)),
            'rmse': float(round(rmse, 4)),
            'seasonal_period': int(seasonal_period),
            'training_rows': int(len(series)),
        }

        self._upsert_model_metadata(
            pharmacy_id,
            model_type,
            target_key,
            target_name,
            metrics,
            model_meta,
        )

        message = f'Model trained on {len(series)} days of real sales for {target_name}'
        result = {
            'model_path': model_path,
            'model_meta': model_meta,
            'metrics': metrics,
            'data_points': int(len(series)),
        }
        return result, message

    def generate_forecast(
        self,
        model: Any,
        steps: int = 30,
        last_date: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        values, confidence = self._forecast_from_model(model, steps)

        if last_date is None:
            try:
                last_label = getattr(model.data, 'row_labels', [None])[-1]
                if last_label is not None:
                    last_date = pd.to_datetime(last_label).date()
            except Exception:
                last_date = None

        if last_date is None:
            last_date = datetime.utcnow().date()
        else:
            if not isinstance(last_date, datetime):
                last_date = pd.to_datetime(last_date).date()
            else:
                last_date = last_date.date()

        future_dates = [
            (last_date + timedelta(days=offset)).isoformat()
            for offset in range(1, steps + 1)
        ]

        forecast_values = [float(v) for v in values.tolist()]
        return {
            'dates': future_dates,
            'values': forecast_values,
            'confidence': confidence,
        }

    # ------------------------------------------------------------------
    # Model persistence
    # ------------------------------------------------------------------
    def save_model(
        self,
        model: Any,
        model_meta: Dict[str, Any],
        model_type: str,
        pharmacy_id: int,
        target_id: str,
    ) -> str:
        filename = self._model_filename(model_type, pharmacy_id, target_id)
        filepath = os.path.join(self.models_dir, filename)

        payload = {'model': model, 'meta': model_meta}
        with open(filepath, 'wb') as f:
            pickle.dump(payload, f)

        return filepath

    def load_model(
        self,
        model_type: str,
        pharmacy_id: int,
        target_id: str,
    ) -> Tuple[Optional[Any], Optional[Dict[str, Any]]]:
        filename = self._model_filename(model_type, pharmacy_id, target_id)
        filepath = os.path.join(self.models_dir, filename)

        if not os.path.exists(filepath):
            return None, None

        with open(filepath, 'rb') as f:
            payload = pickle.load(f)

        if isinstance(payload, dict) and 'model' in payload:
            return payload['model'], payload.get('meta')

        return payload, None

    # ------------------------------------------------------------------
    # Metadata accessors
    # ------------------------------------------------------------------
    def get_model_accuracy(
        self, pharmacy_id: int, model_type: str, target_id: str
    ) -> Optional[Dict[str, Any]]:
        if not self.engine:
            return None

        with self.engine.connect() as conn:
            row = conn.execute(
                text(
                    """
                    SELECT accuracy_percentage, accuracy_mae, accuracy_rmse,
                           seasonal_period, training_rows, last_trained_at
                FROM forecasting_models
                    WHERE pharmacy_id = :ph
                      AND model_type = :model_type
                      AND target_id = :target_id
                ORDER BY last_trained_at DESC
                LIMIT 1
                    """
                ),
                {
                    'ph': pharmacy_id,
                'model_type': model_type,
                    'target_id': target_id,
                },
            ).mappings().first()

        if not row:
            return None

        return dict(row)

    def get_forecastable_products(
        self, pharmacy_id: Optional[int], min_days: int = 14
    ) -> list:
        if not self.engine or not pharmacy_id:
            return []

        with self.engine.connect() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT 
                        p.id,
                        p.name,
                        COALESCE(pc.name, '') AS category_name,
                        COUNT(DISTINCT h.sale_date) AS sales_days,
                        AVG(h.quantity_sold) AS avg_daily_sales,
                        SUM(h.quantity_sold) AS total_units
                    FROM historical_sales_daily h
                    JOIN products p ON p.id = h.product_id
                    LEFT JOIN product_categories pc ON pc.id = p.category_id
                    WHERE h.pharmacy_id = :ph
                    GROUP BY p.id, p.name, pc.name
                    HAVING COUNT(DISTINCT h.sale_date) >= :min_days
                    ORDER BY avg_daily_sales DESC
                    LIMIT 250
                    """
                ),
                {'ph': pharmacy_id, 'min_days': min_days},
            ).mappings().all()

        return [dict(row) for row in rows]

    def get_forecastable_categories(
        self, pharmacy_id: Optional[int], min_days: int = 14
    ) -> list:
        if not self.engine or not pharmacy_id:
            return []

        with self.engine.connect() as conn:
            rows = conn.execute(
                text(
                    """
                    SELECT 
                        pc.id,
                        pc.name,
                        COUNT(DISTINCT h.sale_date) AS sales_days,
                        AVG(h.quantity_sold) AS avg_daily_sales,
                        SUM(h.quantity_sold) AS total_units
                    FROM historical_sales_daily h
                    JOIN products p ON p.id = h.product_id
                    JOIN product_categories pc ON pc.id = p.category_id
                    WHERE h.pharmacy_id = :ph
                    GROUP BY pc.id, pc.name
                    HAVING COUNT(DISTINCT h.sale_date) >= :min_days
                    ORDER BY avg_daily_sales DESC
                    LIMIT 100
                    """
                ),
                {'ph': pharmacy_id, 'min_days': min_days},
            ).mappings().all()

        return [dict(row) for row in rows]

    # ------------------------------------------------------------------
    # Fallback utilities
    # ------------------------------------------------------------------
    @staticmethod
    def build_naive_forecast(
        series: pd.Series, steps: int, last_date: datetime
    ) -> Dict[str, Any]:
        if series.empty:
            base = 0.0
        else:
            base = float(series.iloc[-min(14, len(series)) :].mean())

        future_dates = [
            (last_date + timedelta(days=offset)).isoformat()
            for offset in range(1, steps + 1)
        ]

        values = [float(max(base, 0.0)) for _ in range(steps)]
        return {'dates': future_dates, 'values': values, 'confidence': None}
