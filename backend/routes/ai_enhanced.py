#!/usr/bin/env python3
"""
Enhanced AI Routes with Inventory Classification
"""

import os
import time
import pandas as pd
from flask import Blueprint, request, jsonify
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import logging

# Import AI services
from services.ultra_advanced_ai import ultra_advanced_ai
from services.ai_inventory_classifier import ai_inventory_manager
from services.enhanced_ai_service import enhanced_ai_service
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from services.ai_metrics import (
    flush_metrics,
    get_metrics_snapshot,
    record_interaction,
)

METRICS_SERVICE_TOKEN = os.getenv('AI_METRICS_SERVICE_TOKEN')


def _require_service_token():
    if not METRICS_SERVICE_TOKEN:
        return
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    provided = auth_header.split(' ', 1)[1]
    if provided != METRICS_SERVICE_TOKEN:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 401
    return None


ai_enhanced_bp = Blueprint('ai_enhanced', __name__, url_prefix='/api/ai/enhanced')

# Database connection - lazy initialization to avoid import-time connection
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg2://postgres:PhoebeDrugStore01@db.xybuirzvlfuwmtcokkwm.supabase.co:5432/postgres?sslmode=require')
_ai_enhanced_engine = None

def get_ai_enhanced_engine():
    """Get database engine, creating it lazily if needed"""
    global _ai_enhanced_engine
    if _ai_enhanced_engine is None:
        try:
            _ai_enhanced_engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args={"connect_timeout": 10})
        except Exception as e:
            logger.error(f"Could not create database engine: {e}")
            raise
    return _ai_enhanced_engine

@ai_enhanced_bp.route('/build-index', methods=['POST'])
def build_semantic_index():
    """Build semantic search index from CSV datasets"""
    try:
        csv_directory = request.json.get('csv_directory', '../datasets_clean')
        
        # Build semantic index
        medicines = ai_inventory_manager.build_semantic_index_from_csv(csv_directory)
        
        return jsonify({
            'success': True,
            'message': f'Semantic index built successfully with {len(medicines)} medicines',
            'total_medicines': len(medicines),
            'categories_found': len(set(med['ai_categories'][0] for med in medicines if med['ai_categories']))
        })
        
    except Exception as e:
        logger.error(f"Error building semantic index: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to build semantic index: {str(e)}'
        }), 500

@ai_enhanced_bp.route('/search', methods=['POST'])
def enhanced_medicine_search():
    """Enhanced medicine search with multiple strategies"""
    try:
        data = request.get_json()
        query = data.get('query', '').strip()
        limit = data.get('limit', 10)
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Query is required'
            }), 400
        
        # Perform intelligent search
        search_results = ai_inventory_manager.smart_medicine_search(query)
        
        # Format results
        formatted_results = {
            'query': query,
            'total_strategies': len([x for x in search_results.values() if isinstance(x, list) and x]),
            'direct_matches': len(search_results['direct_matches']),
            'category_matches': len(search_results['category_matches']),
            'semantic_matches': len(search_results['semantic_matches']),
            'ai_matches': len(search_results['ai_classified_matches']),
            'results': {
                'direct_matches': search_results['direct_matches'][:limit//4],
                'category_matches': search_results['category_matches'][:limit//4],
                'semantic_matches': search_results['semantic_matches'][:limit//4],
                'ai_classified_matches': search_results['ai_classified_matches'][:limit//4]
            },
            'query_analysis': search_results['query_analysis']
        }
        
        return jsonify({
            'success': True,
            'search_results': formatted_results
        })
        
    except Exception as e:
        logger.error(f"Error in enhanced search: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Search failed: {str(e)}'
        }), 500

@ai_enhanced_bp.route('/recommendations', methods=['POST'])
def get_medicine_recommendations():
    """Get AI-powered medicine recommendations"""
    try:
        data = request.get_json()
        condition = data.get('condition', '').strip()
        
        if not condition:
            return jsonify({
                'success': False,
                'error': 'Condition is required'
            }), 400
        
        # Get recommendations
        recommendations = ai_inventory_manager.get_medicine_recommendations(condition)
        
        # Format recommendations
        formatted_recommendations = []
        for rec in recommendations:
            formatted_rec = {
                'name': rec['name'],
                'category': rec.get('category', ''),
                'ai_category': rec.get('ai_categories', [])[0] if rec.get('ai_categories') else 'others',
                'quantity': rec.get('quantity', 0),
                'price': rec.get('unit_price', 0),
                'location': rec.get('location', ''),
                'recommendation_reason': rec.get('recommendation_reason', ''),
                'medicine_info': rec.get('medicine_info', {})
            }
            formatted_recommendations.append(formatted_rec)
        
        return jsonify({
            'success': True,
            'condition': condition,
            'recommendations': formatted_recommendations,
            'total_found': len(formatted_recommendations)
        })
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to get recommendations: {str(e)}'
        }), 500

@ai_enhanced_bp.route('/classify', methods=['POST'])
def classify_medicine():
    """Classify a medicine using AI"""
    try:
        data = request.get_json()
        medicine_name = data.get('medicine_name', '').strip()
        
        if not medicine_name:
            return jsonify({
                'success': False,
                'error': 'Medicine name is required'
            }), 400
        
        # Classify medicine
        classification = ai_inventory_manager.classifier.get_medicine_info(medicine_name)
        
        return jsonify({
            'success': True,
            'medicine_name': medicine_name,
            'classification': classification
        })
        
    except Exception as e:
        logger.error(f"Error classifying medicine: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Classification failed: {str(e)}'
        }), 500

@ai_enhanced_bp.route('/chat', methods=['POST'])
def enhanced_ai_chat():
    """Enhanced AI chat with inventory integration"""
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        user_id = data.get('user_id', 'anonymous')
        
        if not message:
            return jsonify({
                'success': False,
                'error': 'Message is required'
            }), 400
        
        start_time = time.perf_counter()
        response_payload = enhanced_ai_service.generate_chat_response(message)
        latency_ms = (time.perf_counter() - start_time) * 1000

        record_interaction(
            pharmacy_id=data.get('pharmacy_id'),
            query_text=message,
            match_count=response_payload.get('total_matches', 0),
            detected_categories=response_payload.get('search_analysis', {}).get('detected_categories'),
            latency_ms=latency_ms,
        )

        return jsonify({
            'success': True,
            'response': response_payload
        })
        
    except Exception as e:
        logger.error(f"Error in enhanced chat: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Enhanced chat failed: {str(e)}'
        }), 500


@ai_enhanced_bp.route('/refresh-cache', methods=['POST'])
def refresh_inventory_cache():
    """Manually refresh the AI inventory cache"""
    try:
        auth_error = _require_service_token()
        if auth_error is not None:
            return auth_error
        
        enhanced_ai_service.refresh_inventory(force=True)

        last_refresh = enhanced_ai_service.last_refresh.isoformat() if enhanced_ai_service.last_refresh else None
        return jsonify({
            'success': True,
            'message': 'Inventory cache refreshed successfully',
            'last_refresh': last_refresh,
            'source': enhanced_ai_service.last_refresh_source
        })

    except Exception as e:
        logger.error(f"Error refreshing inventory cache: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to refresh cache: {str(e)}'
        }), 500


@ai_enhanced_bp.route('/flush-metrics', methods=['POST'])
def flush_ai_metrics():
    """Persist aggregated AI metrics and clear cache"""
    auth_error = _require_service_token()
    if auth_error is not None:
        return auth_error

    try:
        result = flush_metrics(engine)
        return jsonify({'success': True, **result, 'snapshot': get_metrics_snapshot()})
    except Exception as exc:
        logger.error("Error flushing AI metrics: %s", exc)
        return jsonify({'success': False, 'error': f'Failed to flush metrics: {exc}'}), 500

@ai_enhanced_bp.route('/categories', methods=['GET'])
def get_medicine_categories():
    """Get all available medicine categories"""
    try:
        categories = list(ai_inventory_manager.classifier.medicine_categories.keys())
        
        return jsonify({
            'success': True,
            'categories': categories,
            'total_categories': len(categories)
        })
        
    except Exception as e:
        logger.error(f"Error getting categories: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to get categories: {str(e)}'
        }), 500

@ai_enhanced_bp.route('/inventory-stats', methods=['GET'])
def get_inventory_stats():
    """Get inventory statistics"""
    try:
        if not ai_inventory_manager.medicine_database:
            return jsonify({
                'success': False,
                'error': 'Inventory not indexed. Please build index first.'
            }), 400
        
        # Calculate statistics
        total_medicines = len(ai_inventory_manager.medicine_database)
        
        category_counts = {}
        total_stock = 0
        total_value = 0
        
        for medicine_data in ai_inventory_manager.medicine_database.values():
            # Count by category
            for category in medicine_data.get('ai_categories', []):
                category_counts[category] = category_counts.get(category, 0) + 1
            
            # Calculate totals
            quantity = medicine_data.get('quantity', 0)
            price = medicine_data.get('unit_price', 0)
            
            total_stock += quantity
            total_value += quantity * price
        
        return jsonify({
            'success': True,
            'statistics': {
                'total_medicines': total_medicines,
                'total_stock_units': total_stock,
                'total_inventory_value': round(total_value, 2),
                'category_breakdown': category_counts,
                'average_price': round(total_value / total_stock, 2) if total_stock > 0 else 0
            }
        })
        
    except Exception as e:
        logger.error(f"Error getting inventory stats: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to get inventory stats: {str(e)}'
        }), 500
