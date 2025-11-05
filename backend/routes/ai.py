import os
import json
import requests
import time
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pickle
import logging
import sys
sys.path.append('services')
from fuzzy_matcher import fuzzy_matcher
from ai_training import ai_training
from conversational_ai import conversational_ai
from advanced_conversational_ai import advanced_conversational_ai
from advanced_intent_classifier import advanced_intent_classifier
from ultra_advanced_ai import ultra_advanced_ai
from services.ai_metrics import record_feedback as record_feedback_metric
from services.semantic_embeddings import SemanticEmbeddingService

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ai_bp = Blueprint('ai', __name__, url_prefix='/api/ai')

# Database connection
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg2://postgres:PhoebeDrugStore01@db.xybuirzvlfuwmtcokkwm.supabase.co:5432/postgres?sslmode=require')
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# Cache for medical information (in production, use Redis)
medical_cache = {}
CACHE_DURATION = 24 * 60 * 60  # 24 hours in seconds

class AIAssistantService:
    def __init__(self):
        self.vectorizer = None
        self.product_vectors = None
        self.product_data = None
        self.semantic = SemanticEmbeddingService()
        self.load_models()
    
    def load_models(self):
        """Load or initialize recommendation models"""
        try:
            # Try to load existing models
            with open('ai_models/tfidf_vectorizer.pkl', 'rb') as f:
                self.vectorizer = pickle.load(f)
            with open('ai_models/product_vectors.pkl', 'rb') as f:
                self.product_vectors = pickle.load(f)
            with open('ai_models/product_data.pkl', 'rb') as f:
                self.product_data = pickle.load(f)
            logger.info("Loaded existing AI models")
        except FileNotFoundError:
            logger.info("No existing models found, will train new ones")
            self.train_models()
    
    def train_models(self):
        """Train recommendation models based on current data"""
        try:
            # Get product data from database
            query = """
            SELECT p.id, p.name, p.unit_price, p.location, 
                   pc.name as category_name,
                   i.current_stock, i.available_stock
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.id
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.is_active = true
            """
            
            with engine.connect() as conn:
                df = pd.read_sql(query, conn)
            
            if df.empty:
                logger.warning("No product data found for training")
                return
            
            # Prepare text features for content-based filtering
            df['text_features'] = df['name'] + ' ' + df['category_name'].fillna('')
            
            # Add common medicine terms for better matching
            medicine_terms = {
                'pain': ['analgesic', 'painkiller', 'relief', 'ache'],
                'fever': ['antipyretic', 'fever', 'temperature'],
                'cold': ['cough', 'cold', 'flu', 'respiratory'],
                'headache': ['headache', 'migraine', 'tension'],
                'stomach': ['stomach', 'digestive', 'gastric', 'antacid'],
                'antibiotic': ['antibiotic', 'bacterial', 'infection'],
                'vitamin': ['vitamin', 'supplement', 'nutrition']
            }
            
            # Expand product names with related terms
            def expand_medicine_terms(text):
                text_lower = text.lower()
                expanded_terms = [text]
                for category, terms in medicine_terms.items():
                    if any(term in text_lower for term in terms):
                        expanded_terms.extend(terms)
                return ' '.join(expanded_terms)
            
            df['text_features'] = df['text_features'].apply(expand_medicine_terms)
            
            # Initialize TF-IDF vectorizer with better parameters
            self.vectorizer = TfidfVectorizer(
                max_features=2000,
                stop_words='english',
                ngram_range=(1, 3),  # Include trigrams
                min_df=1,  # Include all terms
                max_df=0.95  # Exclude very common terms
            )
            
            # Fit and transform product text
            self.product_vectors = self.vectorizer.fit_transform(df['text_features'])
            self.product_data = df
            
            # Create models directory if it doesn't exist
            os.makedirs('ai_models', exist_ok=True)
            
            # Save models
            with open('ai_models/tfidf_vectorizer.pkl', 'wb') as f:
                pickle.dump(self.vectorizer, f)
            with open('ai_models/product_vectors.pkl', 'wb') as f:
                pickle.dump(self.product_vectors, f)
            with open('ai_models/product_data.pkl', 'wb') as f:
                pickle.dump(self.product_data, f)
            
            logger.info("AI models trained and saved successfully")
            
        except Exception as e:
            logger.error(f"Error training models: {str(e)}")
    
    def get_recommendations(self, query, pharmacy_id, limit=5):
        """Get product recommendations based on query with fuzzy matching"""
        try:
            # First try fuzzy matching for medicine names
            if any(word in query.lower() for word in ['paracetamol', 'biogesic', 'aspirin', 'ibuprofen', 'tempra', 'amoxicillin']):
                fuzzy_results = fuzzy_matcher.fuzzy_search_products(query, pharmacy_id, limit=limit)
                if fuzzy_results:
                    return fuzzy_results
            
            # Try SBERT semantic search first (hybrid retrieval)
            try:
                # Ensure models are trained/loaded
                if self.product_data is None or self.vectorizer is None or self.product_vectors is None:
                    self.train_models()
                # Prepare catalog for the embedding service using currently available products
                # Use pharmacy-filtered products to keep results relevant
                df_source = self.product_data if self.product_data is not None else None
                if df_source is not None:
                    pharmacy_products_all = df_source.copy()
                else:
                    pharmacy_products_all = None
                # Build the medicine database from the data frame if available
                if pharmacy_products_all is not None and not pharmacy_products_all.empty:
                    catalog_dict = {}
                    for _, row in pharmacy_products_all.iterrows():
                        name_key = str(row['name'])
                        catalog_dict[name_key] = {
                            'name': str(row['name']),
                            'category': str(row.get('category_name') or ''),
                            'location': str(row.get('location') or ''),
                            'unit_price': float(row.get('unit_price') or 0),
                            'quantity': int((row.get('current_stock') or 0) + (row.get('available_stock') or 0)),
                        }
                    # Build or load embeddings
                    self.semantic.load_or_build(catalog_dict)
                    # Run semantic search
                    sbert_hits = self.semantic.search(query, top_k=max(10, limit * 3))
                else:
                    sbert_hits = []
            except Exception:
                sbert_hits = []

            # Fallback to original TF-IDF logic if SBERT is unavailable or empty
            if self.vectorizer is None or self.product_vectors is None:
                self.train_models()
            
            if self.product_data is None:
                return []
            
            # Filter products by pharmacy and available stock
            pharmacy_products = self.product_data[
                (self.product_data['current_stock'] > 0) | 
                (self.product_data['available_stock'] > 0)
            ].copy()
            
            if pharmacy_products.empty:
                return []
            
            # Vectorize the query for TF-IDF
            query_vector = self.vectorizer.transform([query])

            # Get product indices for pharmacy
            pharmacy_indices = pharmacy_products.index.tolist()
            pharmacy_vectors = self.product_vectors[pharmacy_indices]

            # Calculate TF-IDF similarities
            similarities = cosine_similarity(query_vector, pharmacy_vectors).flatten()

            recommendations = []

            # If SBERT hits are available, map them to pharmacy products first
            if sbert_hits:
                name_to_rows = {}
                for idx_row, row in pharmacy_products.iterrows():
                    key = str(row['name']).lower()
                    name_to_rows.setdefault(key, []).append((idx_row, row))
                added_ids = set()
                for name, score in sbert_hits:
                    rows = name_to_rows.get(str(name).lower())
                    if not rows:
                        continue
                    for idx_row, row in rows:
                        if row['id'] in added_ids:
                            continue
                        recommendations.append({
                            'id': int(row['id']),
                            'name': row['name'],
                            'category': row['category_name'],
                            'price': float(row['unit_price']),
                            'stock': int(row['current_stock'] or 0),
                            'location': row['location'],
                            'similarity_score': float(score)
                        })
                        added_ids.add(row['id'])
                        if len(recommendations) >= limit:
                            break
                    if len(recommendations) >= limit:
                        break

            # If still not enough, backfill with TF-IDF top matches
            if len(recommendations) < limit:
                # Rank TF-IDF within pharmacy scope
                tfidf_ranked = np.argsort(similarities)[::-1]
                for idx in tfidf_ranked:
                    if len(recommendations) >= limit:
                        break
                    if similarities[idx] <= 0.05:
                        continue
                    product = pharmacy_products.iloc[idx]
                    if any(rec['id'] == int(product['id']) for rec in recommendations):
                        continue
                    recommendations.append({
                        'id': int(product['id']),
                        'name': product['name'],
                        'category': product['category_name'],
                        'price': float(product['unit_price']),
                        'stock': int(product['current_stock'] or 0),
                        'location': product['location'],
                        'similarity_score': float(similarities[idx])
                    })
            
            # Always try keyword matching for medicine-related queries
            query_lower = query.lower()
            keyword_matches = []
            
            # Define medicine-related keywords for better matching
            medicine_keywords = {
                'pain': ['paracetamol', 'acetaminophen', 'ibuprofen', 'aspirin', 'biogesic', 'tempra', 'diclofenac', 'mefenamic', 'tramadol', 'aspilets', 'aspilet'],
                'fever': ['paracetamol', 'acetaminophen', 'tempra', 'biogesic', 'antipyretic'],
                'cold': ['cough', 'cold', 'flu', 'decongestant', 'antihistamine', 'mucolytic'],
                'headache': ['paracetamol', 'ibuprofen', 'aspirin', 'migraine', 'tension', 'biogesic'],
                'stomach': ['antacid', 'ranitidine', 'omeprazole', 'lansoprazole', 'digestive'],
                'antibiotic': ['amoxicillin', 'ampicillin', 'cefuroxime', 'azithromycin', 'ciprofloxacin'],
                'vitamin': ['vitamin', 'multivitamin', 'ascorbic', 'calcium', 'iron', 'ascorbic-acid'],
                'relief': ['biogesic', 'paracetamol', 'ibuprofen', 'aspirin', 'tempra']
            }
            
            # Find matching keywords
            matched_keywords = []
            for category, keywords in medicine_keywords.items():
                if any(word in query_lower for word in [category] + keywords):
                    matched_keywords.extend(keywords)
            
            for idx, product in pharmacy_products.iterrows():
                product_text = (product['name'] + ' ' + str(product['category_name'] or '')).lower()
                
                # Check for direct keyword matches
                if any(keyword in product_text for keyword in matched_keywords):
                    keyword_matches.append((idx, product, 0.8))  # High score for keyword match
                # Check for category matches
                elif any(word in product_text for word in query_lower.split()):
                    # Only include if it's in a medicine category
                    if product['category_name'] and 'TABLETS AND CAPSULES' in str(product['category_name']):
                        keyword_matches.append((idx, product, 0.6))  # Medium score for category match
            
            # Sort by score first, then by stock level
            keyword_matches.sort(key=lambda x: (x[2], x[1]['current_stock'] or 0), reverse=True)
            
            # Add keyword matches to recommendations
            for idx, product, score in keyword_matches[:limit]:
                recommendations.append({
                    'id': int(product['id']),
                    'name': product['name'],
                    'category': product['category_name'],
                    'price': float(product['unit_price']),
                    'stock': int(product['current_stock'] or 0),
                    'location': product['location'],
                    'similarity_score': score
                })
            
            # Remove duplicates and sort by score
            seen_ids = set()
            unique_recommendations = []
            for rec in recommendations:
                if rec['id'] not in seen_ids:
                    unique_recommendations.append(rec)
                    seen_ids.add(rec['id'])
            
            # Sort by similarity score
            unique_recommendations.sort(key=lambda x: x['similarity_score'], reverse=True)
            recommendations = unique_recommendations[:limit]
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error getting recommendations: {str(e)}")
            return []
    
    def locate_product(self, product_name, pharmacy_id):
        """Find product location and availability with fuzzy matching"""
        try:
            # First try fuzzy matching
            fuzzy_results = fuzzy_matcher.fuzzy_search_products(product_name, pharmacy_id, limit=5)
            
            if fuzzy_results:
                return fuzzy_results
            
            # Fallback to original logic if fuzzy matching fails
            # Map common medicine names to actual product names
            medicine_mapping = {
                'aspirin': 'aspilet',
                'paracetamol': 'paracetamol',
                'biogesic': 'biogesic',
                'tempra': 'tempra',
                'ibuprofen': 'ibuprofen',
                'vitamin c': 'ascorbic',
                'vitamin': 'vitamin'
            }
            
            # Try to find mapped name
            search_terms = [product_name.lower()]
            if product_name.lower() in medicine_mapping:
                search_terms.append(medicine_mapping[product_name.lower()])
            
            # Also try partial matches
            search_terms.append(product_name.split()[0].lower())
            
            query = """
            SELECT p.id, p.name, p.location, p.unit_price,
                   pc.name as category_name,
                   i.current_stock, i.available_stock, i.expiration_date
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.id
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.pharmacy_id = :pharmacy_id 
            AND (LOWER(p.name) LIKE LOWER(:product_name) 
                 OR LOWER(pc.name) LIKE LOWER(:product_name)
                 OR LOWER(p.name) LIKE LOWER(:product_name_partial)
                 OR LOWER(p.name) LIKE LOWER(:product_name_mapped))
            AND p.is_active = true
            ORDER BY 
                CASE 
                    WHEN LOWER(p.name) LIKE LOWER(:product_name) THEN 1
                    WHEN LOWER(p.name) LIKE LOWER(:product_name_mapped) THEN 2
                    WHEN LOWER(p.name) LIKE LOWER(:product_name_partial) THEN 3
                    ELSE 4
                END,
                i.current_stock DESC
            """
            
            with engine.connect() as conn:
                result = conn.execute(text(query), {
                    'pharmacy_id': pharmacy_id,
                    'product_name': f'%{product_name}%',
                    'product_name_partial': f'%{product_name.split()[0]}%',
                    'product_name_mapped': f'%{medicine_mapping.get(product_name.lower(), product_name)}%'
                })
                products = result.fetchall()
            
            locations = []
            for product in products:
                locations.append({
                    'id': product.id,
                    'name': product.name,
                    'category': product.category_name,
                    'location': product.location,
                    'price': float(product.unit_price),
                    'stock': int(product.current_stock or 0),
                    'available_stock': int(product.available_stock or 0),
                    'expiration_date': product.expiration_date.isoformat() if product.expiration_date else None
                })
            
            return locations
            
        except Exception as e:
            logger.error(f"Error locating product: {str(e)}")
            return []
    
    def get_medical_info(self, medicine_name):
        """Get medical information from external APIs"""
        try:
            # Check cache first
            cache_key = medicine_name.lower()
            if cache_key in medical_cache:
                cached_data, timestamp = medical_cache[cache_key]
                if time.time() - timestamp < CACHE_DURATION:
                    return cached_data
            
            # Try RxNorm first for drug normalization
            rxnorm_id = self._get_rxnorm_id(medicine_name)
            
            # Get information from MedlinePlus
            medical_info = self._get_medlineplus_info(medicine_name, rxnorm_id)
            
            # Cache the result
            medical_cache[cache_key] = (medical_info, time.time())
            
            return medical_info
            
        except Exception as e:
            logger.error(f"Error getting medical info: {str(e)}")
            return {
                'name': medicine_name,
                'description': 'Information not available',
                'uses': ['Consult your pharmacist for detailed information'],
                'side_effects': ['Consult your healthcare provider'],
                'source': 'Local database'
            }
    
    def _get_rxnorm_id(self, medicine_name):
        """Get RxNorm ID for drug normalization"""
        try:
            # This is a simplified version - in production, use the actual RxNorm API
            # For now, return None to use direct MedlinePlus lookup
            return None
        except Exception as e:
            logger.error(f"Error getting RxNorm ID: {str(e)}")
            return None
    
    def _get_medlineplus_info(self, medicine_name, rxnorm_id=None):
        """Get medical information from MedlinePlus"""
        try:
            # Simplified medical information - in production, integrate with actual APIs
            # For now, return basic information based on common medicine patterns
            
            medicine_lower = medicine_name.lower()
            
            # Basic pattern matching for common medicines
            if 'paracetamol' in medicine_lower or 'acetaminophen' in medicine_lower:
                return {
                    'name': medicine_name,
                    'description': 'Paracetamol (also known as acetaminophen) is a pain reliever and fever reducer commonly used for mild to moderate pain.',
                    'uses': [
                        'Pain relief (headaches, toothaches, muscle aches)',
                        'Fever reduction',
                        'Cold and flu symptoms',
                        'Arthritis pain management'
                    ],
                    'side_effects': [
                        'Nausea (rare)',
                        'Allergic reactions (rare)',
                        'Liver damage (with overdose)',
                        'Skin rash (rare)'
                    ],
                    'precautions': [
                        'Do not exceed recommended dose (max 4g per day)',
                        'Consult doctor if pregnant or breastfeeding',
                        'Avoid alcohol while taking',
                        'Check with doctor if taking other medications'
                    ],
                    'dosage': 'Typical dose: 500mg-1000mg every 4-6 hours',
                    'source': 'MedlinePlus (simplified)'
                }
            elif 'biogesic' in medicine_lower:
                return {
                    'name': medicine_name,
                    'description': 'Biogesic is a brand of paracetamol (acetaminophen) used for pain relief and fever reduction.',
                    'uses': [
                        'Pain relief (headaches, toothaches, muscle aches)',
                        'Fever reduction',
                        'Cold and flu symptoms',
                        'Mild to moderate pain'
                    ],
                    'side_effects': [
                        'Nausea (rare)',
                        'Allergic reactions (rare)',
                        'Liver damage (with overdose)'
                    ],
                    'precautions': [
                        'Do not exceed recommended dose',
                        'Consult doctor if pregnant or breastfeeding',
                        'Avoid alcohol while taking'
                    ],
                    'dosage': 'Typical dose: 500mg-1000mg every 4-6 hours',
                    'source': 'Product information'
                }
            elif 'aspilet' in medicine_lower or 'aspirin' in medicine_lower:
                return {
                    'name': medicine_name,
                    'description': 'Aspilet is a brand of aspirin, a nonsteroidal anti-inflammatory drug (NSAID) used for pain relief and blood thinning.',
                    'uses': [
                        'Pain relief (headaches, muscle aches)',
                        'Fever reduction',
                        'Anti-inflammatory effects',
                        'Blood thinning (cardiovascular protection)'
                    ],
                    'side_effects': [
                        'Stomach irritation',
                        'Nausea',
                        'Heartburn',
                        'Bleeding risk (rare)'
                    ],
                    'precautions': [
                        'Take with food to reduce stomach irritation',
                        'Avoid if allergic to aspirin',
                        'Consult doctor before use if taking blood thinners',
                        'Not recommended for children with fever'
                    ],
                    'dosage': 'Typical dose: 75mg-325mg as directed',
                    'source': 'Product information'
                }
            elif 'amoxicillin' in medicine_lower:
                return {
                    'name': medicine_name,
                    'description': 'Amoxicillin is an antibiotic used to treat bacterial infections.',
                    'uses': [
                        'Bacterial infections',
                        'Respiratory tract infections',
                        'Urinary tract infections',
                        'Skin infections'
                    ],
                    'side_effects': [
                        'Nausea',
                        'Diarrhea',
                        'Rash',
                        'Allergic reactions'
                    ],
                    'precautions': [
                        'Complete full course as prescribed',
                        'May cause allergic reactions',
                        'Inform doctor of any allergies'
                    ],
                    'source': 'MedlinePlus (simplified)'
                }
            else:
                return {
                    'name': medicine_name,
                    'description': 'Please consult your pharmacist or healthcare provider for detailed information about this medicine.',
                    'uses': ['Consult healthcare provider'],
                    'side_effects': ['Consult healthcare provider'],
                    'precautions': ['Consult healthcare provider'],
                    'source': 'General guidance'
                }
                
        except Exception as e:
            logger.error(f"Error getting MedlinePlus info: {str(e)}")
            return {
                'name': medicine_name,
                'description': 'Information not available',
                'uses': ['Consult your pharmacist'],
                'side_effects': ['Consult your healthcare provider'],
                'source': 'Local database'
            }

# Initialize AI service
ai_service = AIAssistantService()

@ai_bp.route('/chat', methods=['POST'])
def chat():
    """Main chat endpoint for AI Assistant"""
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        pharmacy_id = data.get('pharmacy_id', 1)  # Default to pharmacy 1
        
        if not message:
            return jsonify({
                'success': False,
                'error': 'Message is required'
            }), 400
        
        # Improved intent classification using AI training service
        intent = ai_training.classify_intent(message)
        
        if intent == 'stock_query':
            # Stock/availability query
            # Extract product name using training service
            product_name = ai_training.extract_medicine_name(message, intent)
            
            # Try fuzzy matching to correct product name
            if product_name:
                corrected_name = fuzzy_matcher.suggest_correction(product_name)
                if corrected_name:
                    product_name = corrected_name
            
            locations = ai_service.locate_product(product_name, pharmacy_id)
            
            if locations:
                # Format as stock information
                stock_info = []
                for location in locations:
                    stock_info.append({
                        'name': location['name'],
                        'stock': location['stock'],
                        'location': location['location'],
                        'price': location['price'],
                        'status': 'In Stock' if location['stock'] > 0 else 'Out of Stock'
                    })
                
                # Use conversational AI for natural response
                response = conversational_ai.get_conversational_response(
                    intent, stock_info, message, product_name=product_name
                )
            else:
                # Use conversational AI for no results
                response = conversational_ai.get_conversational_response(
                    intent, [], message, product_name=product_name
                )
        
        elif intent == 'location_query':
            # Product locator
            # Extract product name using training service
            product_name = ai_training.extract_medicine_name(message, intent)
            
            locations = ai_service.locate_product(product_name, pharmacy_id)
            
            # Use conversational AI for natural response
            response = conversational_ai.get_conversational_response(
                intent, locations, message, product_name=product_name
            )
        
        elif intent == 'medical_info_query':
            # Medical information
            # Extract medicine name using training service
            medicine_name = ai_training.extract_medicine_name(message, intent)
            
            # Try fuzzy matching to correct medicine name
            if medicine_name:
                corrected_name = fuzzy_matcher.suggest_correction(medicine_name)
                if corrected_name:
                    medicine_name = corrected_name
            
            medical_info = ai_service.get_medical_info(medicine_name)
            
            # Use conversational AI for natural response
            response = conversational_ai.get_conversational_response(
                intent, medical_info, message, medicine_name=medicine_name
            )
        
        elif intent == 'recommendation_query':
            # Product recommendations
            # Extract query using training service
            query = ai_training.extract_medicine_name(message, 'recommendation_query')
            
            recommendations = ai_service.get_recommendations(query, pharmacy_id)
            
            # Use conversational AI for natural response
            response = conversational_ai.get_conversational_response(
                intent, recommendations, message
            )
        
        else:
            # Use conversational AI for general response
            response = conversational_ai.get_conversational_response(
                intent, [], message
            )
        
        # Enhance response with additional helpful information
        enhanced_response = conversational_ai.enhance_response(response, message, intent)
        
        return jsonify({
            'success': True,
            'response': enhanced_response
        })
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An error occurred while processing your request'
        }), 500

@ai_bp.route('/chat/advanced', methods=['POST'])
def chat_advanced():
    """Advanced chat endpoint with enhanced conversational capabilities"""
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        pharmacy_id = data.get('pharmacy_id', 1)
        user_id = data.get('user_id', 'anonymous')
        
        if not message:
            return jsonify({
                'success': False,
                'error': 'Message is required'
            }), 400
        
        # Advanced intent classification with context
        intent, confidence, classification_details = advanced_intent_classifier.classify_intent(
            message, user_id
        )
        
        # Extract entities using advanced classifier
        entities = advanced_intent_classifier.extract_entities(message, intent)
        
        # Get data based on intent
        data = []
        product_name = None
        medicine_name = None
        
        if intent == 'stock_query':
            product_name = entities.get('products', [''])[0] if entities.get('products') else ''
            if product_name:
                corrected_name = fuzzy_matcher.suggest_correction(product_name)
                if corrected_name:
                    product_name = corrected_name
            locations = ai_service.locate_product(product_name, pharmacy_id) if product_name else []
            
            if locations:
                # Format as stock information
                data = []
                for location in locations:
                    data.append({
                        'name': location['name'],
                        'stock': location['stock'],
                        'location': location['location'],
                        'price': location['price'],
                        'status': 'In Stock' if location['stock'] > 0 else 'Out of Stock'
                    })
            
        elif intent == 'location_query':
            product_name = entities.get('products', [''])[0] if entities.get('products') else ''
            if product_name:
                corrected_name = fuzzy_matcher.suggest_correction(product_name)
                if corrected_name:
                    product_name = corrected_name
            data = ai_service.locate_product(product_name, pharmacy_id) if product_name else []
            
        elif intent == 'medical_info_query':
            medicine_name = entities.get('products', [''])[0] if entities.get('products') else ''
            if medicine_name:
                corrected_name = fuzzy_matcher.suggest_correction(medicine_name)
                if corrected_name:
                    medicine_name = corrected_name
            data = ai_service.get_medical_info(medicine_name) if medicine_name else {}
            
        elif intent == 'recommendation_query':
            query = entities.get('conditions', [''])[0] if entities.get('conditions') else ''
            if not query:
                query = entities.get('products', [''])[0] if entities.get('products') else ''
            data = ai_service.get_recommendations(query, pharmacy_id) if query else []
            
        # Use advanced conversational AI
        response = advanced_conversational_ai.process_message(
            user_id, message, intent, data, product_name, medicine_name
        )
        
        # Add classification details to response
        response['classification'] = classification_details
        
        return jsonify({
            'success': True,
            'response': response,
            'advanced_mode': True
        })
        
    except Exception as e:
        logger.error(f"Error in advanced chat endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An error occurred while processing your request'
        }), 500

@ai_bp.route('/recommendations', methods=['POST'])
def get_recommendations():
    """Get product recommendations"""
    try:
        data = request.get_json()
        query = data.get('query', '').strip()
        pharmacy_id = data.get('pharmacy_id', 1)
        limit = data.get('limit', 5)
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Query is required'
            }), 400
        
        recommendations = ai_service.get_recommendations(query, pharmacy_id, limit)
        
        return jsonify({
            'success': True,
            'recommendations': recommendations
        })
        
    except Exception as e:
        logger.error(f"Error getting recommendations: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An error occurred while getting recommendations'
        }), 500

@ai_bp.route('/learn', methods=['POST'])
def learn_from_interaction():
    """Learn from user interaction feedback"""
    try:
        data = request.get_json()
        user_id = data.get('user_id', 'anonymous')
        message = data.get('message', '')
        intent = data.get('intent', '')
        feedback_score = data.get('feedback_score', 0.5)  # 0-1 scale
        
        if not message or not intent:
            return jsonify({
                'success': False,
                'error': 'Message and intent are required'
            }), 400
        
        # Add training example
        advanced_intent_classifier.add_training_example(message, intent, user_id)
        
        # Update pattern success
        success = feedback_score > 0.5
        advanced_intent_classifier.update_pattern_success(intent, success)

        record_feedback_metric(pharmacy_id=data.get('pharmacy_id'), feedback_score=feedback_score)
        
        return jsonify({
            'success': True,
            'message': 'Learning data recorded successfully'
        })
        
    except Exception as e:
        logger.error(f"Error in learning endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An error occurred while recording learning data'
        }), 500

@ai_bp.route('/personality', methods=['GET', 'POST'])
def manage_personality():
    """Get or update AI personality settings"""
    try:
        if request.method == 'GET':
            # Get current personality settings
            personality = advanced_conversational_ai.personality.personality_traits
            style = advanced_conversational_ai.personality.current_style
            
            return jsonify({
                'success': True,
                'personality': personality,
                'current_style': style
            })
            
        elif request.method == 'POST':
            # Update personality settings
            data = request.get_json()
            traits = data.get('personality_traits', {})
            style = data.get('style', None)
            
            if traits:
                for trait, value in traits.items():
                    if trait in advanced_conversational_ai.personality.personality_traits:
                        advanced_conversational_ai.personality.personality_traits[trait] = max(0.0, min(1.0, value))
            
            if style and style in advanced_conversational_ai.personality.response_styles:
                advanced_conversational_ai.personality.current_style = style
            
            return jsonify({
                'success': True,
                'message': 'Personality updated successfully',
                'personality': advanced_conversational_ai.personality.personality_traits,
                'current_style': advanced_conversational_ai.personality.current_style
            })
            
    except Exception as e:
        logger.error(f"Error in personality endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An error occurred while managing personality'
        }), 500

@ai_bp.route('/context/<user_id>', methods=['GET', 'DELETE'])
def manage_context(user_id):
    """Get or clear user conversation context"""
    try:
        if request.method == 'GET':
            # Get user context
            context = advanced_conversational_ai.memory.get_current_context(user_id)
            history = advanced_conversational_ai.memory.get_conversation_history(user_id)
            preferences = advanced_conversational_ai.get_user_preferences(user_id)
            
            return jsonify({
                'success': True,
                'context': context,
                'history_count': len(history),
                'preferences': preferences
            })
            
        elif request.method == 'DELETE':
            # Clear user context
            if user_id in advanced_conversational_ai.memory.conversations:
                del advanced_conversational_ai.memory.conversations[user_id]
            if user_id in advanced_conversational_ai.memory.session_context:
                del advanced_conversational_ai.memory.session_context[user_id]
                
            return jsonify({
                'success': True,
                'message': f'Context cleared for user {user_id}'
            })
            
    except Exception as e:
        logger.error(f"Error in context endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An error occurred while managing context'
        }), 500

@ai_bp.route('/stats', methods=['GET'])
def get_ai_stats():
    """Get AI system statistics"""
    try:
        intent_stats = advanced_intent_classifier.get_intent_statistics()
        memory_stats = {
            'active_conversations': len(advanced_conversational_ai.memory.conversations),
            'total_interactions': sum(len(conv) for conv in advanced_conversational_ai.memory.conversations.values())
        }
        
        return jsonify({
            'success': True,
            'intent_classification': intent_stats,
            'conversation_memory': memory_stats,
            'personality_traits': advanced_conversational_ai.personality.personality_traits,
            'current_style': advanced_conversational_ai.personality.current_style
        })
        
    except Exception as e:
        logger.error(f"Error in stats endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An error occurred while getting statistics'
        }), 500

@ai_bp.route('/locate', methods=['POST'])
def locate_product():
    """Locate product in pharmacy"""
    try:
        data = request.get_json()
        product_name = data.get('product_name', '').strip()
        pharmacy_id = data.get('pharmacy_id', 1)
        
        if not product_name:
            return jsonify({
                'success': False,
                'error': 'Product name is required'
            }), 400
        
        locations = ai_service.locate_product(product_name, pharmacy_id)
        
        return jsonify({
            'success': True,
            'locations': locations
        })
        
    except Exception as e:
        logger.error(f"Error locating product: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An error occurred while locating the product'
        }), 500

@ai_bp.route('/medical-info', methods=['POST'])
def get_medical_info():
    """Get medical information about a medicine"""
    try:
        data = request.get_json()
        medicine_name = data.get('medicine_name', '').strip()
        
        if not medicine_name:
            return jsonify({
                'success': False,
                'error': 'Medicine name is required'
            }), 400
        
        medical_info = ai_service.get_medical_info(medicine_name)
        
        return jsonify({
            'success': True,
            'medical_info': medical_info
        })
        
    except Exception as e:
        logger.error(f"Error getting medical info: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An error occurred while getting medical information'
        }), 500

@ai_bp.route('/chat/ultra', methods=['POST'])
def chat_ultra():
    """Ultra Advanced AI endpoint with cutting-edge capabilities"""
    try:
        data = request.get_json()
        message = data.get('message', '').strip()
        pharmacy_id = data.get('pharmacy_id', 1)
        user_id = data.get('user_id', 'anonymous')
        
        if not message:
            return jsonify({
                'success': False,
                'error': 'Message is required'
            }), 400
        
        # Get product data for semantic search
        query = """
        SELECT p.id, p.name, p.unit_price, p.location, 
               pc.name as category_name,
               i.current_stock, i.available_stock
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        LEFT JOIN inventory i ON p.id = i.product_id
        WHERE p.is_active = true AND p.pharmacy_id = :pharmacy_id
        """
        
        with engine.connect() as conn:
            df = pd.read_sql(query, conn, params={'pharmacy_id': pharmacy_id})
        
        # Convert to list of dicts for semantic search
        products = []
        for _, row in df.iterrows():
            products.append({
                'id': int(row['id']),
                'name': row['name'],
                'category': row['category_name'],
                'price': float(row['unit_price']),
                'stock': int(row['current_stock'] or 0),
                'location': row['location']
            })
        
        # Build semantic search index
        ultra_advanced_ai.semantic_search.build_product_index(products)
        
        # Process with ultra-advanced AI
        response = ultra_advanced_ai.process_ultra_advanced_query(user_id, message)
        
        return jsonify({
            'success': True,
            'response': response,
            'ultra_mode': True
        })
        
    except Exception as e:
        logger.error(f"Error in ultra advanced chat endpoint: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An error occurred while processing your request'
        }), 500

@ai_bp.route('/analytics', methods=['GET'])
def get_ultra_analytics():
    """Get ultra-advanced AI analytics and insights"""
    try:
        analytics = ultra_advanced_ai.get_advanced_analytics()
        
        return jsonify({
            'success': True,
            'analytics': analytics
        })
        
    except Exception as e:
        logger.error(f"Error getting ultra analytics: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An error occurred while getting analytics'
        }), 500

@ai_bp.route('/feedback/ultra', methods=['POST'])
def ultra_feedback():
    """Provide feedback for ultra-advanced AI learning"""
    try:
        data = request.get_json()
        user_id = data.get('user_id', 'anonymous')
        feedback = data.get('feedback', 'neutral')  # positive, negative, neutral
        response_quality = data.get('response_quality', 0.5)  # 0-1 scale
        
        # Learn from feedback
        ultra_advanced_ai.learn_from_feedback(user_id, feedback, response_quality)
        
        return jsonify({
            'success': True,
            'message': 'Feedback recorded successfully'
        })
        
    except Exception as e:
        logger.error(f"Error recording ultra feedback: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An error occurred while recording feedback'
        }), 500

@ai_bp.route('/retrain', methods=['POST'])
def retrain_models():
    """Retrain AI models with latest data"""
    try:
        ai_service.train_models()
        
        return jsonify({
            'success': True,
            'message': 'AI models retrained successfully'
        })
        
    except Exception as e:
        logger.error(f"Error retraining models: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An error occurred while retraining models'
        }), 500
