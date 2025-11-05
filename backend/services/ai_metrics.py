import os
import json
from collections import Counter, defaultdict
from datetime import date, datetime
from threading import Lock
from typing import Any, Dict, Iterable, List, Optional, Tuple

from sqlalchemy import text


_metrics_lock = Lock()
_metrics_cache: Dict[Tuple[Optional[int], date], Dict[str, Any]] = defaultdict(
    lambda: {
        "total": 0,
        "no_match": 0,
        "positive": 0,
        "negative": 0,
        "latency_total": 0.0,
        "latency_count": 0,
        "unmatched_categories": Counter(),
        "unmatched_tokens": Counter(),
    }
)

_STOPWORDS: set[str] = {
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "what",
    "have",
    "need",
    "want",
    "show",
    "please",
    "give",
    "help",
    "find",
    "where",
    "about",
    "info",
    "information",
    "medicine",
    "medicines",
    "items",
    "item",
    "stock",
    "stocks",
    "list",
    "available",
}

_MAX_TOKEN_ENTRIES = int(os.getenv("AI_METRICS_MAX_TOKENS", "100"))
_RETENTION_DAYS_DEFAULT = int(os.getenv("AI_METRICS_RETENTION_DAYS", "90"))


def _extract_tokens(query_text: str) -> Iterable[str]:
    if not query_text:
        return []
    tokens: List[str] = []
    for raw in query_text.lower().split():
        cleaned = ''.join(ch for ch in raw if ch.isalpha())
        if len(cleaned) < 4:
            continue
        if cleaned in _STOPWORDS:
            continue
        tokens.append(cleaned)
    return tokens


def record_interaction(
    *,
    pharmacy_id: Optional[int],
    query_text: str,
    match_count: int,
    detected_categories: Optional[List[str]],
    latency_ms: float,
) -> None:
    if isinstance(pharmacy_id, str):
        try:
            pharmacy_id = int(pharmacy_id)
        except ValueError:
            pharmacy_id = None
    metric_date = date.today()
    key = (pharmacy_id, metric_date)
    with _metrics_lock:
        bucket = _metrics_cache[key]
        bucket["total"] += 1
        bucket["latency_total"] += float(latency_ms)
        bucket["latency_count"] += 1
        if match_count == 0:
            bucket["no_match"] += 1
            if detected_categories:
                bucket["unmatched_categories"].update(cat for cat in detected_categories if cat)
            token_counter = bucket["unmatched_tokens"]
            token_counter.update(_extract_tokens(query_text))
            if len(token_counter) > _MAX_TOKEN_ENTRIES:
                most_common = Counter(dict(token_counter.most_common(_MAX_TOKEN_ENTRIES)))
                bucket["unmatched_tokens"] = most_common


def record_feedback(*, pharmacy_id: Optional[int], feedback_score: float) -> None:
    if isinstance(pharmacy_id, str):
        try:
            pharmacy_id = int(pharmacy_id)
        except ValueError:
            pharmacy_id = None
    metric_date = date.today()
    key = (pharmacy_id, metric_date)
    with _metrics_lock:
        bucket = _metrics_cache[key]
        if feedback_score >= 0.5:
            bucket["positive"] += 1
        else:
            bucket["negative"] += 1


def _counter_to_payload(counter: Counter, limit: int = 5, key_name: str = "name") -> List[Dict[str, Any]]:
    return [
        {key_name: item, "count": int(count)}
        for item, count in counter.most_common(limit)
        if count
    ]


def flush_metrics(engine, *, retention_days: Optional[int] = None) -> Dict[str, Any]:
    retention = _RETENTION_DAYS_DEFAULT if retention_days is None else max(retention_days, 0)

    with _metrics_lock:
        snapshot: List[Tuple[Tuple[Optional[int], date], Dict[str, Any]]] = []
        for key, bucket in _metrics_cache.items():
            snapshot.append(
                (
                    key,
                    {
                        "total": bucket["total"],
                        "no_match": bucket["no_match"],
                        "positive": bucket["positive"],
                        "negative": bucket["negative"],
                        "latency_total": bucket["latency_total"],
                        "latency_count": bucket["latency_count"],
                        "unmatched_categories": Counter(bucket["unmatched_categories"]),
                        "unmatched_tokens": Counter(bucket["unmatched_tokens"]),
                    },
                )
            )
        _metrics_cache.clear()

    if not snapshot:
        return {"flushed": 0, "pruned": 0}

    payload_rows: List[Dict[str, Any]] = []
    for (pharmacy_id, metric_date), bucket in snapshot:
        if bucket["total"] == 0:
            continue
        avg_latency = (
            bucket["latency_total"] / bucket["latency_count"]
            if bucket["latency_count"]
            else 0.0
        )
        payload_rows.append(
            {
                "metric_date": metric_date,
                "pharmacy_id": pharmacy_id,
                "total_queries": bucket["total"],
                "no_match_queries": bucket["no_match"],
                "positive_feedback": bucket["positive"],
                "negative_feedback": bucket["negative"],
                "avg_latency_ms": round(avg_latency, 2),
                "top_unmatched_categories": json.dumps(
                    _counter_to_payload(bucket["unmatched_categories"], key_name="category")
                ),
                "top_unmatched_tokens": json.dumps(
                    _counter_to_payload(bucket["unmatched_tokens"], key_name="token")
                ),
            }
        )

    if not payload_rows:
        return {"flushed": 0, "pruned": 0}

    insert_stmt = text(
        """
        INSERT INTO public.ai_daily_metrics (
            metric_date,
            pharmacy_id,
            total_queries,
            no_match_queries,
            positive_feedback,
            negative_feedback,
            avg_latency_ms,
            top_unmatched_categories,
            top_unmatched_tokens)
        VALUES (
            :metric_date,
            :pharmacy_id,
            :total_queries,
            :no_match_queries,
            :positive_feedback,
            :negative_feedback,
            :avg_latency_ms,
            :top_unmatched_categories::jsonb,
            :top_unmatched_tokens::jsonb)
        ON CONFLICT (metric_date, pharmacy_id) DO UPDATE SET
            total_queries = public.ai_daily_metrics.total_queries + EXCLUDED.total_queries,
            no_match_queries = public.ai_daily_metrics.no_match_queries + EXCLUDED.no_match_queries,
            positive_feedback = public.ai_daily_metrics.positive_feedback + EXCLUDED.positive_feedback,
            negative_feedback = public.ai_daily_metrics.negative_feedback + EXCLUDED.negative_feedback,
            avg_latency_ms = EXCLUDED.avg_latency_ms,
            top_unmatched_categories = EXCLUDED.top_unmatched_categories,
            top_unmatched_tokens = EXCLUDED.top_unmatched_tokens,
            updated_at = NOW();
        """
    )

    with engine.begin() as conn:
        conn.execute(insert_stmt, payload_rows)
        pruned = 0
        if retention > 0:
            prune_stmt = text(
                """
                DELETE FROM public.ai_daily_metrics
                WHERE metric_date < CURRENT_DATE - (:retention || ' days')::interval
                """
            )
            result = conn.execute(prune_stmt, {"retention": str(retention)})
            pruned = result.rowcount if result.rowcount is not None else 0

    return {"flushed": len(payload_rows), "pruned": pruned}


def get_metrics_snapshot() -> Dict[str, Any]:
    with _metrics_lock:
        return {
            "entries": len(_metrics_cache),
            "total_queries": sum(bucket["total"] for bucket in _metrics_cache.values()),
        }

