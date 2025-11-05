#!/usr/bin/env python3
"""
Ultra Advanced AI Service
State-of-the-art AI with transformer models, semantic search, and knowledge graphs
"""

import os
import json
import pickle
import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any
from collections import defaultdict, deque
from datetime import datetime, timedelta
import logging
import re

# Advanced ML imports
try:
    from sentence_transformers import SentenceTransformer
    from transformers import pipeline, AutoTokenizer, AutoModel
    import torch
    TRANSFORMER_AVAILABLE = True
except ImportError:
    TRANSFORMER_AVAILABLE = False

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False

try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False

logger = logging.getLogger(__name__)

class SemanticSearchEngine:
    """Advanced semantic search using transformer models"""
    
    def __init__(self):
        self.model = None
        self.index = None
        self.product_embeddings = None
        self.product_data = []
        
        if TRANSFORMER_AVAILABLE:
            self._initialize_model()
    
    def _initialize_model(self):
        """Initialize sentence transformer model"""
        try:
            # Use a lightweight but effective model
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Semantic search model initialized")
        except Exception as e:
            logger.error(f"Failed to initialize semantic model: {e}")
            self.model = None
    
    def build_product_index(self, products: List[Dict]):
        """Build semantic search index for products"""
        if not self.model or not products:
            return
        
        try:
            # Prepare product text for embedding
            product_texts = []
            self.product_data = []
            
            for product in products:
                # Create rich text representation
                text = self._create_product_text(product)
                product_texts.append(text)
                self.product_data.append(product)
            
            # Generate embeddings
            self.product_embeddings = self.model.encode(product_texts)
            
            # Build FAISS index for fast similarity search
            if FAISS_AVAILABLE:
                dimension = self.product_embeddings.shape[1]
                self.index = faiss.IndexFlatIP(dimension)  # Inner product for cosine similarity
                
                # Normalize embeddings for cosine similarity
                faiss.normalize_L2(self.product_embeddings)
                self.index.add(self.product_embeddings.astype('float32'))
                
                logger.info(f"Built semantic index with {len(products)} products")
            else:
                logger.warning("FAISS not available, using numpy for similarity search")
                
        except Exception as e:
            logger.error(f"Failed to build product index: {e}")
    
    def _create_product_text(self, product: Dict) -> str:
        """Create rich text representation of product"""
        text_parts = []
        
        # Product name
        if product.get('name'):
            text_parts.append(product['name'])
        
        # Category
        if product.get('category'):
            text_parts.append(f"category: {product['category']}")
        
        # Description or uses
        if product.get('description'):
            text_parts.append(product['description'])
        
        # Common uses/conditions
        if product.get('uses'):
            text_parts.append(f"used for: {product['uses']}")
        
        # Dosage information
        if product.get('dosage'):
            text_parts.append(f"dosage: {product['dosage']}")
        
        return " | ".join(text_parts)
    
    def semantic_search(self, query: str, top_k: int = 5) -> List[Tuple[Dict, float]]:
        """Perform semantic search for products"""
        if not self.model or not self.product_data:
            return []
        
        try:
            # Encode query
            query_embedding = self.model.encode([query])
            
            if FAISS_AVAILABLE and self.index:
                # Use FAISS for fast search
                faiss.normalize_L2(query_embedding)
                scores, indices = self.index.search(query_embedding.astype('float32'), top_k)
                
                results = []
                for score, idx in zip(scores[0], indices[0]):
                    if idx < len(self.product_data):
                        results.append((self.product_data[idx], float(score)))
                
                return results
            else:
                # Fallback to numpy similarity
                return self._numpy_similarity_search(query_embedding, top_k)
                
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return []
    
    def _numpy_similarity_search(self, query_embedding: np.ndarray, top_k: int) -> List[Tuple[Dict, float]]:
        """Fallback similarity search using numpy"""
        if self.product_embeddings is None:
            return []
        
        # Calculate cosine similarity
        similarities = np.dot(self.product_embeddings, query_embedding.T).flatten()
        
        # Get top k results
        top_indices = np.argsort(similarities)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            if similarities[idx] > 0:  # Only positive similarities
                results.append((self.product_data[idx], float(similarities[idx])))
        
        return results

class KnowledgeGraph:
    """Medicine knowledge graph for advanced reasoning"""
    
    def __init__(self):
        self.graph = nx.DiGraph() if NETWORKX_AVAILABLE else None
        self.medicine_data = {}
        self.relationships = defaultdict(list)
        
        if self.graph:
            self._build_base_graph()
    
    def _build_base_graph(self):
        """Build base knowledge graph with medicine relationships"""
        # Medicine categories
        categories = {
            'antibiotics': ['amoxicillin', 'penicillin', 'ciprofloxacin', 'azithromycin'],
            'pain_relief': ['paracetamol', 'ibuprofen', 'aspirin', 'naproxen'],
            'antihistamines': ['loratadine', 'cetirizine', 'fexofenadine'],
            'antacids': ['omeprazole', 'ranitidine', 'calcium_carbonate'],
            'vitamins': ['vitamin_c', 'vitamin_d', 'multivitamin', 'calcium'],
            'cough_medicine': ['dextromethorphan', 'guaifenesin', 'codeine'],
            'diabetes': ['metformin', 'insulin', 'glipizide'],
            'blood_pressure': ['lisinopril', 'amlodipine', 'metoprolol']
        }
        
        # Add nodes and relationships
        for category, medicines in categories.items():
            self.graph.add_node(category, type='category')
            
            for medicine in medicines:
                self.graph.add_node(medicine, type='medicine')
                self.graph.add_edge(medicine, category, relationship='belongs_to')
                self.graph.add_edge(category, medicine, relationship='contains')
        
        # Add medicine interactions and contraindications
        interactions = {
            'warfarin': ['aspirin', 'ibuprofen'],  # Blood thinners
            'digoxin': ['furosemide'],  # Heart medications
            'lithium': ['ibuprofen']  # Mood stabilizers
        }
        
        for medicine, contraindications in interactions.items():
            if medicine not in self.graph:
                self.graph.add_node(medicine, type='medicine')
            
            for contraindication in contraindications:
                if contraindication not in self.graph:
                    self.graph.add_node(contraindication, type='medicine')
                
                self.graph.add_edge(medicine, contraindication, relationship='interacts_with')
                self.graph.add_edge(contraindication, medicine, relationship='interacts_with')
        
        logger.info(f"Built knowledge graph with {self.graph.number_of_nodes()} nodes")
    
    def find_similar_medicines(self, medicine: str, limit: int = 5) -> List[str]:
        """Find similar medicines using graph traversal"""
        if not self.graph or medicine not in self.graph:
            return []
        
        similar = []
        
        # Find medicines in the same category
        for neighbor in self.graph.neighbors(medicine):
            if self.graph.nodes[neighbor].get('type') == 'category':
                # Get all medicines in this category
                for med in self.graph.neighbors(neighbor):
                    if med != medicine and self.graph.nodes[med].get('type') == 'medicine':
                        similar.append(med)
        
        return similar[:limit]
    
    def get_medicine_category(self, medicine: str) -> Optional[str]:
        """Get category of a medicine"""
        if not self.graph or medicine not in self.graph:
            return None
        
        for neighbor in self.graph.neighbors(medicine):
            if self.graph.nodes[neighbor].get('type') == 'category':
                return neighbor
        
        return None
    
    def check_interactions(self, medicine1: str, medicine2: str) -> bool:
        """Check if two medicines interact"""
        if not self.graph:
            return False
        
        return self.graph.has_edge(medicine1, medicine2) and \
               self.graph.edges[medicine1, medicine2].get('relationship') == 'interacts_with'

class AdvancedNLPPipeline:
    """Advanced NLP pipeline with spaCy and transformers"""
    
    def __init__(self):
        self.nlp = None
        self.qa_pipeline = None
        self.sentiment_pipeline = None
        
        if SPACY_AVAILABLE:
            self._initialize_spacy()
        
        if TRANSFORMER_AVAILABLE:
            self._initialize_transformers()
    
    def _initialize_spacy(self):
        """Initialize spaCy model"""
        try:
            # Try to load English model
            self.nlp = spacy.load("en_core_web_sm")
            logger.info("spaCy model loaded")
        except OSError:
            logger.warning("spaCy English model not found. Install with: python -m spacy download en_core_web_sm")
            self.nlp = None
    
    def _initialize_transformers(self):
        """Initialize transformer pipelines"""
        try:
            # Question answering pipeline
            self.qa_pipeline = pipeline(
                "question-answering",
                model="distilbert-base-cased-distilled-squad",
                device=0 if torch.cuda.is_available() else -1
            )
            
            # Sentiment analysis pipeline
            self.sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                device=0 if torch.cuda.is_available() else -1
            )
            
            logger.info("Transformer pipelines initialized")
        except Exception as e:
            logger.error(f"Failed to initialize transformers: {e}")
    
    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """Extract entities using spaCy"""
        if not self.nlp:
            return {}
        
        doc = self.nlp(text)
        entities = defaultdict(list)
        
        for ent in doc.ents:
            entities[ent.label_].append(ent.text)
        
        return dict(entities)
    
    def answer_question(self, question: str, context: str) -> Dict:
        """Answer question using transformer model"""
        if not self.qa_pipeline:
            return {"answer": "I cannot answer questions at the moment.", "score": 0.0}
        
        try:
            result = self.qa_pipeline(question=question, context=context)
            return result
        except Exception as e:
            logger.error(f"QA pipeline failed: {e}")
            return {"answer": "I encountered an error.", "score": 0.0}
    
    def analyze_sentiment(self, text: str) -> Dict:
        """Analyze sentiment using transformer model"""
        if not self.sentiment_pipeline:
            return {"label": "NEUTRAL", "score": 0.5}
        
        try:
            result = self.sentiment_pipeline(text)
            return result[0]
        except Exception as e:
            logger.error(f"Sentiment analysis failed: {e}")
            return {"label": "NEUTRAL", "score": 0.5}

class MultiTurnReasoning:
    """Advanced multi-turn reasoning capabilities"""
    
    def __init__(self):
        self.conversation_memory = defaultdict(list)
        self.reasoning_chains = defaultdict(list)
        self.user_goals = defaultdict(list)
    
    def track_conversation_flow(self, user_id: str, message: str, response: str):
        """Track conversation flow for reasoning"""
        self.conversation_memory[user_id].append({
            'timestamp': datetime.now(),
            'user_message': message,
            'ai_response': response,
            'intent': self._extract_intent(message),
            'entities': self._extract_entities(message)
        })
        
        # Keep only last 10 interactions
        if len(self.conversation_memory[user_id]) > 10:
            self.conversation_memory[user_id] = self.conversation_memory[user_id][-10:]
    
    def _extract_intent(self, message: str) -> str:
        """Extract intent from message"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['where', 'locate', 'find']):
            return 'location_query'
        elif any(word in message_lower for word in ['stock', 'available', 'inventory']):
            return 'stock_query'
        elif any(word in message_lower for word in ['recommend', 'suggest', 'need']):
            return 'recommendation_query'
        elif any(word in message_lower for word in ['what is', 'used for', 'information']):
            return 'medical_info_query'
        else:
            return 'general_query'
    
    def _extract_entities(self, message: str) -> List[str]:
        """Extract entities from message"""
        # Simple entity extraction - can be enhanced with NER
        entities = []
        words = message.lower().split()
        
        medicine_keywords = ['paracetamol', 'ibuprofen', 'aspirin', 'amoxicillin', 'antibiotics', 'pain', 'fever']
        for word in words:
            if word in medicine_keywords:
                entities.append(word)
        
        return entities
    
    def infer_user_goal(self, user_id: str) -> str:
        """Infer user's goal from conversation history"""
        history = self.conversation_memory.get(user_id, [])
        
        if not history:
            return "unknown"
        
        # Analyze conversation patterns
        intents = [interaction['intent'] for interaction in history]
        entities = [entity for interaction in history for entity in interaction['entities']]
        
        # Simple goal inference
        if 'recommendation_query' in intents:
            return "finding_medicine"
        elif 'location_query' in intents:
            return "locating_product"
        elif 'stock_query' in intents:
            return "checking_availability"
        else:
            return "general_inquiry"
    
    def generate_contextual_response(self, user_id: str, current_message: str) -> str:
        """Generate contextual response based on conversation history"""
        history = self.conversation_memory.get(user_id, [])
        user_goal = self.infer_user_goal(user_id)
        
        # Build context-aware response
        context_parts = []
        
        if user_goal == "finding_medicine":
            context_parts.append("Based on our conversation, I understand you're looking for medicine recommendations.")
        elif user_goal == "locating_product":
            context_parts.append("I see you're trying to locate products in the pharmacy.")
        elif user_goal == "checking_availability":
            context_parts.append("You seem to be checking product availability.")
        
        # Add recent context
        if len(history) > 0:
            last_interaction = history[-1]
            if last_interaction['entities']:
                context_parts.append(f"Earlier you mentioned {', '.join(last_interaction['entities'])}.")
        
        return " ".join(context_parts) if context_parts else ""

class ReinforcementLearning:
    """Reinforcement learning for continuous improvement"""
    
    def __init__(self):
        self.action_history = defaultdict(list)
        self.reward_history = defaultdict(list)
        self.policy = defaultdict(lambda: defaultdict(float))
        self.learning_rate = 0.1
        self.discount_factor = 0.9
    
    def record_action(self, user_id: str, state: str, action: str, reward: float):
        """Record action and reward for learning"""
        self.action_history[user_id].append({
            'timestamp': datetime.now(),
            'state': state,
            'action': action,
            'reward': reward
        })
        
        # Update policy using simple Q-learning
        old_value = self.policy[state][action]
        self.policy[state][action] = old_value + self.learning_rate * (reward - old_value)
    
    def get_best_action(self, state: str) -> str:
        """Get best action for given state"""
        if state not in self.policy:
            return "default_response"
        
        best_action = max(self.policy[state], key=self.policy[state].get)
        return best_action
    
    def calculate_reward(self, user_feedback: str, response_quality: float) -> float:
        """Calculate reward based on user feedback and response quality"""
        feedback_score = 1.0 if user_feedback == 'positive' else -0.5 if user_feedback == 'negative' else 0.0
        quality_score = response_quality
        
        return feedback_score + quality_score

class UltraAdvancedAI:
    """Ultra Advanced AI combining all cutting-edge technologies"""
    
    def __init__(self):
        self.semantic_search = SemanticSearchEngine()
        self.knowledge_graph = KnowledgeGraph()
        self.nlp_pipeline = AdvancedNLPPipeline()
        self.reasoning = MultiTurnReasoning()
        self.rl_system = ReinforcementLearning()
        
        # Performance metrics
        self.metrics = {
            'total_interactions': 0,
            'successful_responses': 0,
            'user_satisfaction': 0.0,
            'average_response_time': 0.0
        }
    
    def process_ultra_advanced_query(self, user_id: str, message: str, context: Dict = None) -> Dict:
        """Process query using all advanced AI capabilities"""
        start_time = datetime.now()
        
        try:
            # 1. Advanced NLP processing
            entities = self.nlp_pipeline.extract_entities(message)
            sentiment = self.nlp_pipeline.analyze_sentiment(message)
            
            # 2. Multi-turn reasoning
            contextual_info = self.reasoning.generate_contextual_response(user_id, message)
            user_goal = self.reasoning.infer_user_goal(user_id)
            
            # 3. Semantic search for products
            semantic_results = self.semantic_search.semantic_search(message, top_k=5)
            
            # 4. Knowledge graph reasoning
            medicine_category = None
            similar_medicines = []
            if entities.get('PERSON') or entities.get('ORG'):
                # Extract medicine names from entities
                medicine_names = entities.get('PERSON', []) + entities.get('ORG', [])
                if medicine_names:
                    medicine = medicine_names[0].lower()
                    medicine_category = self.knowledge_graph.get_medicine_category(medicine)
                    similar_medicines = self.knowledge_graph.find_similar_medicines(medicine)
            
            # 5. Generate intelligent response
            response = self._generate_intelligent_response(
                message, entities, sentiment, contextual_info, 
                user_goal, semantic_results, medicine_category, similar_medicines
            )
            
            # 6. Track conversation for learning
            self.reasoning.track_conversation_flow(user_id, message, response['message'])
            
            # 7. Update metrics
            response_time = (datetime.now() - start_time).total_seconds()
            self._update_metrics(response_time, True)
            
            return {
                'message': response['message'],
                'type': response['type'],
                'data': response.get('data', []),
                'confidence': response.get('confidence', 0.8),
                'entities': entities,
                'sentiment': sentiment,
                'contextual_info': contextual_info,
                'user_goal': user_goal,
                'semantic_results': semantic_results,
                'medicine_category': medicine_category,
                'similar_medicines': similar_medicines,
                'reasoning_chain': response.get('reasoning_chain', []),
                'response_time': response_time
            }
            
        except Exception as e:
            logger.error(f"Ultra advanced processing failed: {e}")
            self._update_metrics((datetime.now() - start_time).total_seconds(), False)
            
            return {
                'message': "I apologize, but I encountered an advanced processing error. Let me try a simpler approach.",
                'type': 'error',
                'data': [],
                'confidence': 0.1,
                'error': str(e)
            }
    
    def _generate_intelligent_response(self, message: str, entities: Dict, sentiment: Dict, 
                                     contextual_info: str, user_goal: str, semantic_results: List,
                                     medicine_category: str, similar_medicines: List) -> Dict:
        """Generate intelligent response using all AI capabilities"""
        
        reasoning_chain = []
        
        # Build reasoning chain
        reasoning_chain.append(f"Analyzed user message: '{message}'")
        reasoning_chain.append(f"Extracted entities: {list(entities.keys())}")
        reasoning_chain.append(f"Detected sentiment: {sentiment.get('label', 'neutral')}")
        reasoning_chain.append(f"Inferred user goal: {user_goal}")
        
        # Generate response based on analysis
        if semantic_results:
            # Found relevant products
            reasoning_chain.append(f"Found {len(semantic_results)} relevant products via semantic search")
            
            response_message = f"Based on your query, I found {len(semantic_results)} relevant products:\n\n"
            
            for i, (product, score) in enumerate(semantic_results[:3], 1):
                response_message += f"{i}. {product.get('name', 'Unknown')} (relevance: {score:.2f})\n"
                if product.get('category'):
                    response_message += f"   Category: {product['category']}\n"
                if product.get('stock'):
                    response_message += f"   Stock: {product['stock']}\n"
                response_message += "\n"
            
            if medicine_category:
                response_message += f"💡 This appears to be a {medicine_category} medication.\n"
            
            if similar_medicines:
                response_message += f"🔗 Similar medicines: {', '.join(similar_medicines[:3])}\n"
            
            if contextual_info:
                response_message += f"\n{contextual_info}"
            
            return {
                'message': response_message,
                'type': 'semantic_results',
                'data': [product for product, _ in semantic_results],
                'confidence': semantic_results[0][1] if semantic_results else 0.5,
                'reasoning_chain': reasoning_chain
            }
        
        else:
            # No direct matches, provide helpful guidance
            reasoning_chain.append("No direct semantic matches found, providing guidance")
            
            if user_goal == "finding_medicine":
                response_message = "I couldn't find exact matches, but I can help you find medicines by:\n"
                response_message += "• Specifying the condition (e.g., 'headache', 'fever')\n"
                response_message += "• Mentioning the medicine name\n"
                response_message += "• Describing symptoms\n\n"
                response_message += "What specific condition or medicine are you looking for?"
                
            elif user_goal == "locating_product":
                response_message = "To help you locate products, please:\n"
                response_message += "• Provide the exact product name\n"
                response_message += "• Mention the brand name if known\n"
                response_message += "• Describe what you're looking for\n\n"
                response_message += "What product would you like me to help you find?"
                
            else:
                response_message = "I'm here to help with your pharmacy needs. I can assist with:\n"
                response_message += "• Product recommendations\n"
                response_message += "• Finding product locations\n"
                response_message += "• Checking stock levels\n"
                response_message += "• Medicine information\n\n"
                response_message += "How can I help you today?"
            
            if contextual_info:
                response_message += f"\n\n{contextual_info}"
            
            return {
                'message': response_message,
                'type': 'guidance',
                'data': [],
                'confidence': 0.7,
                'reasoning_chain': reasoning_chain
            }
    
    def _update_metrics(self, response_time: float, success: bool):
        """Update performance metrics"""
        self.metrics['total_interactions'] += 1
        
        if success:
            self.metrics['successful_responses'] += 1
        
        # Update average response time
        total = self.metrics['total_interactions']
        current_avg = self.metrics['average_response_time']
        self.metrics['average_response_time'] = (current_avg * (total - 1) + response_time) / total
    
    def get_advanced_analytics(self) -> Dict:
        """Get advanced analytics and insights"""
        return {
            'performance_metrics': self.metrics,
            'capabilities': {
                'semantic_search': TRANSFORMER_AVAILABLE,
                'knowledge_graph': NETWORKX_AVAILABLE,
                'advanced_nlp': SPACY_AVAILABLE and TRANSFORMER_AVAILABLE,
                'reinforcement_learning': True,
                'multi_turn_reasoning': True
            },
            'model_info': {
                'semantic_model': 'all-MiniLM-L6-v2' if TRANSFORMER_AVAILABLE else None,
                'qa_model': 'distilbert-base-cased-distilled-squad' if TRANSFORMER_AVAILABLE else None,
                'sentiment_model': 'cardiffnlp/twitter-roberta-base-sentiment-latest' if TRANSFORMER_AVAILABLE else None
            }
        }
    
    def learn_from_feedback(self, user_id: str, feedback: str, response_quality: float):
        """Learn from user feedback using reinforcement learning"""
        reward = self.rl_system.calculate_reward(feedback, response_quality)
        
        # Record the learning
        self.rl_system.record_action(
            user_id, 
            f"response_{datetime.now().strftime('%Y%m%d_%H%M')}", 
            "generate_response", 
            reward
        )
        
        # Update user satisfaction metric
        feedback_score = 1.0 if feedback == 'positive' else -0.5 if feedback == 'negative' else 0.0
        current_satisfaction = self.metrics['user_satisfaction']
        total_interactions = self.metrics['total_interactions']
        
        if total_interactions > 0:
            self.metrics['user_satisfaction'] = (current_satisfaction * (total_interactions - 1) + feedback_score) / total_interactions

_ultra_ai_instance: Optional[UltraAdvancedAI] = None


def get_ultra_advanced_ai() -> UltraAdvancedAI:
    """Lazily instantiate the heavy AI service."""
    global _ultra_ai_instance
    if _ultra_ai_instance is None:
        _ultra_ai_instance = UltraAdvancedAI()
    return _ultra_ai_instance


class _LazyUltraAdvancedAI:
    """Proxy that defers initialization until the first access."""

    def __getattr__(self, item):
        return getattr(get_ultra_advanced_ai(), item)


ultra_advanced_ai = _LazyUltraAdvancedAI()
