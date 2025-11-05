from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from forecasting_service import ForecastingService
import os

# Create blueprint for forecasting routes
forecasting_bp = Blueprint('forecasting', __name__, url_prefix='/api/forecasting')

# Initialize forecasting service
forecasting_service = ForecastingService()

@forecasting_bp.route('/train', methods=['POST'])
@jwt_required()
def train_forecasting_model():
    """
    Train a forecasting model for a specific product or category
    """
    try:
        data = request.get_json()
        product_id = data.get('product_id')
        category = data.get('category')
        model_type = data.get('model_type', 'sarima')
        
        # Get historical data
        historical_data = forecasting_service.get_historical_data(
            product_id=product_id,
            category=category,
            days=365
        )
        
        if historical_data.empty:
            return jsonify({
                'error': 'No historical data available for forecasting'
            }), 400
        
        # Prepare time series data
        ts_data = forecasting_service.prepare_time_series(historical_data, product_id)
        
        if ts_data.empty:
            return jsonify({
                'error': 'Unable to prepare time series data'
            }), 400
        
        # Train the model
        result = forecasting_service.train_model(ts_data, model_type)
        
        if 'error' in result:
            return jsonify({'error': result['error']}), 400
        
        # Save the model
        model_name = f"{model_type}_{product_id or category or 'global'}"
        model_path = forecasting_service.save_model(
            result['model'], 
            model_name,
            product_id=product_id,
            category=category
        )
        
        return jsonify({
            'message': 'Model trained successfully',
            'model_type': model_type,
            'accuracy': result['accuracy'],
            'mae': result['mae'],
            'mse': result['mse'],
            'rmse': result['rmse'],
            'model_path': model_path,
            'product_id': product_id,
            'category': category
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@forecasting_bp.route('/predictions', methods=['GET'])
@jwt_required()
def get_forecasts():
    """
    Get forecast predictions for a product or category
    """
    try:
        product_id = request.args.get('product_id')
        category = request.args.get('category')
        model_type = request.args.get('model_type', 'sarima')
        days = int(request.args.get('days', 30))
        
        # Load the trained model
        model_name = f"{model_type}_{product_id or category or 'global'}"
        model = forecasting_service.load_model(model_name, product_id, category)
        
        if model is None:
            return jsonify({
                'error': 'No trained model found. Please train a model first.'
            }), 404
        
        # Generate forecast
        forecast_result = forecasting_service.generate_forecast(model, steps=days)
        
        if 'error' in forecast_result:
            return jsonify({'error': forecast_result['error']}), 400
        
        return jsonify({
            'forecast': forecast_result,
            'model_type': model_type,
            'product_id': product_id,
            'category': category,
            'days': days
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@forecasting_bp.route('/models', methods=['GET'])
@jwt_required()
def get_forecasting_models():
    """
    Get list of available forecasting models
    """
    try:
        # Return available model types and their configurations
        models = []
        
        # Check for existing saved models
        models_dir = 'backend/ai_models'
        if os.path.exists(models_dir):
            for filename in os.listdir(models_dir):
                if filename.endswith('.pkl') and any(model_type in filename for model_type in ['sarima', 'arima', 'exponential']):
                    model_info = {
                        'name': filename.replace('.pkl', ''),
                        'type': filename.split('_')[0],
                        'target': filename.split('_')[1] if len(filename.split('_')) > 1 else 'global',
                        'file': filename
                    }
                    models.append(model_info)
        
        return jsonify({
            'models': models,
            'available_types': ['sarima', 'arima', 'exponential']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@forecasting_bp.route('/accuracy', methods=['GET'])
@jwt_required()
def get_forecasting_accuracy():
    """
    Get forecasting accuracy metrics
    """
    try:
        product_id = request.args.get('product_id')
        category = request.args.get('category')
        
        accuracy_data = forecasting_service.get_model_accuracy(
            product_id=product_id,
            category=category
        )
        
        return jsonify(accuracy_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@forecasting_bp.route('/products', methods=['GET'])
@jwt_required()
def get_forecastable_products():
    """
    Get list of products that can be used for forecasting
    """
    try:
        products = forecasting_service.get_forecastable_products()
        
        return jsonify({
            'products': products,
            'count': len(products)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@forecasting_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_forecastable_categories():
    """
    Get list of categories that can be used for forecasting
    """
    try:
        categories = forecasting_service.get_forecastable_categories()
        
        return jsonify({
            'categories': categories,
            'count': len(categories)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@forecasting_bp.route('/historical', methods=['GET'])
@jwt_required()
def get_historical_data():
    """
    Get historical data for a product or category
    """
    try:
        product_id = request.args.get('product_id')
        category = request.args.get('category')
        days = int(request.args.get('days', 365))
        
        historical_data = forecasting_service.get_historical_data(
            product_id=product_id,
            category=category,
            days=days
        )
        
        if historical_data.empty:
            return jsonify({
                'error': 'No historical data found'
            }), 404
        
        # Convert to JSON-serializable format
        data = []
        for date, row in historical_data.iterrows():
            data.append({
                'date': date.isoformat(),
                'quantity': float(row['quantity']),
                'product_id': row.get('product_id'),
                'category': row.get('category')
            })
        
        return jsonify({
            'historical_data': data,
            'product_id': product_id,
            'category': category,
            'days': days,
            'count': len(data)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@forecasting_bp.route('/bulk-forecast', methods=['POST'])
@jwt_required()
def bulk_forecast():
    """
    Generate forecasts for multiple products or categories
    """
    try:
        data = request.get_json()
        products = data.get('products', [])
        categories = data.get('categories', [])
        model_type = data.get('model_type', 'sarima')
        days = int(data.get('days', 30))
        
        results = []
        
        # Forecast for products
        for product_id in products:
            try:
                # Get historical data
                historical_data = forecasting_service.get_historical_data(
                    product_id=product_id,
                    days=365
                )
                
                if not historical_data.empty:
                    ts_data = forecasting_service.prepare_time_series(historical_data, product_id)
                    
                    if not ts_data.empty:
                        # Train model if not exists
                        model_name = f"{model_type}_{product_id}"
                        model = forecasting_service.load_model(model_name, product_id)
                        
                        if model is None:
                            train_result = forecasting_service.train_model(ts_data, model_type)
                            if 'error' not in train_result:
                                model = train_result['model']
                                forecasting_service.save_model(model, model_name, product_id=product_id)
                        
                        if model:
                            forecast = forecasting_service.generate_forecast(model, steps=days)
                            results.append({
                                'product_id': product_id,
                                'forecast': forecast,
                                'status': 'success'
                            })
                        else:
                            results.append({
                                'product_id': product_id,
                                'error': 'Failed to train model',
                                'status': 'error'
                            })
                    else:
                        results.append({
                            'product_id': product_id,
                            'error': 'Insufficient time series data',
                            'status': 'error'
                        })
                else:
                    results.append({
                        'product_id': product_id,
                        'error': 'No historical data',
                        'status': 'error'
                    })
            except Exception as e:
                results.append({
                    'product_id': product_id,
                    'error': str(e),
                    'status': 'error'
                })
        
        # Forecast for categories
        for category in categories:
            try:
                # Similar logic for categories
                historical_data = forecasting_service.get_historical_data(
                    category=category,
                    days=365
                )
                
                if not historical_data.empty:
                    ts_data = forecasting_service.prepare_time_series(historical_data)
                    
                    if not ts_data.empty:
                        model_name = f"{model_type}_{category}"
                        model = forecasting_service.load_model(model_name, category=category)
                        
                        if model is None:
                            train_result = forecasting_service.train_model(ts_data, model_type)
                            if 'error' not in train_result:
                                model = train_result['model']
                                forecasting_service.save_model(model, model_name, category=category)
                        
                        if model:
                            forecast = forecasting_service.generate_forecast(model, steps=days)
                            results.append({
                                'category': category,
                                'forecast': forecast,
                                'status': 'success'
                            })
                        else:
                            results.append({
                                'category': category,
                                'error': 'Failed to train model',
                                'status': 'error'
                            })
                    else:
                        results.append({
                            'category': category,
                            'error': 'Insufficient time series data',
                            'status': 'error'
                        })
                else:
                    results.append({
                        'category': category,
                        'error': 'No historical data',
                        'status': 'error'
                    })
            except Exception as e:
                results.append({
                    'category': category,
                    'error': str(e),
                    'status': 'error'
                })
        
        return jsonify({
            'results': results,
            'total': len(results),
            'successful': len([r for r in results if r.get('status') == 'success']),
            'failed': len([r for r in results if r.get('status') == 'error'])
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
