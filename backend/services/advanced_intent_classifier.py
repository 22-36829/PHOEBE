#!/usr/bin/env python3
"""
Advanced Intent Classification Service
Enhanced with NLP, context awareness, and machine learning
"""

import re
import json
import pickle
import os
import numpy as np
from typing import Dict, List, Tuple, Optional
from collections import defaultdict, Counter
from datetime import datetime
import logging

# Advanced NLP imports
try:
    from textblob import TextBlob
    TEXTBLOB_AVAILABLE = True
except ImportError:
    TEXTBLOB_AVAILABLE = False

try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.tokenize import word_tokenize, sent_tokenize
    from nltk.stem import WordNetLemmatizer, PorterStemmer
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.naive_bayes import MultinomialNB
    from sklearn.linear_model import LogisticRegression
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.pipeline import Pipeline
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, accuracy_score
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

logger = logging.getLogger(__name__)

class IntentPattern:
    """Represents an intent pattern with confidence scoring"""
    
    def __init__(self, patterns: List[str], keywords: List[str], 
                 context_words: List[str] = None, confidence: float = 1.0):
        self.patterns = patterns
        self.keywords = keywords
        self.context_words = context_words or []
        self.confidence = confidence
        self.usage_count = 0
        self.success_rate = 1.0
        
    def score(self, text: str) -> float:
        """Score text against this intent pattern"""
        text_lower = text.lower()
        score = 0.0
        
        # Pattern matching
        for pattern in self.patterns:
            if re.search(pattern, text_lower):
                score += self.confidence * 2.0
                
        # Keyword matching
        keyword_matches = sum(1 for keyword in self.keywords if keyword in text_lower)
        if keyword_matches > 0:
            score += self.confidence * (keyword_matches / len(self.keywords))
            
        # Context word bonus
        context_matches = sum(1 for word in self.context_words if word in text_lower)
        if context_matches > 0:
            score += 0.5 * (context_matches / len(self.context_words))
            
        # Adjust by success rate
        score *= self.success_rate
        
        return score

class AdvancedIntentClassifier:
    """Advanced intent classification with ML and context awareness"""
    
    def __init__(self):
        self.intent_patterns = self._load_enhanced_patterns()
        self.ml_classifier = None
        self.vectorizer = None
        self.training_data = []
        self.context_history = defaultdict(list)
        self.intent_confidence_threshold = 0.3
        
        if NLTK_AVAILABLE:
            try:
                self.lemmatizer = WordNetLemmatizer()
                self.stemmer = PorterStemmer()
                self.stop_words = set(stopwords.words('english'))
            except Exception as e:
                logger.warning(f"NLTK setup failed: {e}")
                self.lemmatizer = None
                self.stemmer = None
                self.stop_words = set()
        
        if SKLEARN_AVAILABLE:
            self._initialize_ml_classifier()
        else:
            logger.warning("Scikit-learn not available. Using pattern-based classification only.")
            
    def _load_enhanced_patterns(self) -> Dict[str, IntentPattern]:
        """Load enhanced intent patterns with better coverage"""
        return {
            'stock_query': IntentPattern(
                patterns=[
                    r'\b(?:stock|stocks|available|inventory|how many|quantity|count|left|remaining)\b',
                    r'\b(?:in stock|out of stock|stock level|current stock|stock status)\b',
                    r'\b(?:do we have|is there|are there)\b.*\b(?:in stock|available)\b',
                    r'\b(?:check|verify|confirm)\b.*\b(?:stock|inventory|availability)\b'
                ],
                keywords=['stock', 'available', 'inventory', 'quantity', 'count', 'remaining'],
                context_words=['medicine', 'product', 'item', 'drug'],
                confidence=1.0
            ),
            
            'location_query': IntentPattern(
                patterns=[
                    r'\b(?:where|locate|find|location|shelf|aisle)\b',
                    r'\b(?:can i find|where is|where are|where can)\b',
                    r'\b(?:show me|tell me|help me find)\b.*\b(?:where|location)\b',
                    r'\b(?:position|placement|situated)\b'
                ],
                keywords=['where', 'locate', 'find', 'location', 'shelf', 'aisle'],
                context_words=['medicine', 'product', 'item', 'drug'],
                confidence=1.0
            ),
            
            'recommendation_query': IntentPattern(
                patterns=[
                    r'\b(?:recommend|suggest|need|looking for|help with)\b',
                    r'\b(?:best|good for|treat|medicine for|what for)\b',
                    r'\b(?:i need something for|looking for something for|help me with)\b',
                    r'\b(?:what medicine|which medicine|suggest medicine)\b',
                    r'\b(?:pain relief|fever medicine|cold medicine|headache medicine)\b'
                ],
                keywords=['recommend', 'suggest', 'need', 'looking for', 'help with', 'best', 'good for'],
                context_words=['fever', 'pain', 'headache', 'cold', 'flu', 'cough', 'medicine'],
                confidence=1.0
            ),
            
            'medical_info_query': IntentPattern(
                patterns=[
                    r'\b(?:what is|used for|benefits|side effects|information)\b',
                    r'\b(?:how does|work|dosage|precautions|contraindications)\b',
                    r'\b(?:tell me about|explain|describe)\b',
                    r'\b(?:medicine info|drug info|medication details)\b'
                ],
                keywords=['what is', 'used for', 'benefits', 'side effects', 'information', 'how does'],
                context_words=['medicine', 'drug', 'medication', 'tablet', 'capsule'],
                confidence=1.0
            ),
            
            'price_query': IntentPattern(
                patterns=[
                    r'\b(?:price|cost|how much|expensive|cheap|affordable)\b',
                    r'\b(?:pricing|rates|costs|prices)\b',
                    r'\b(?:what does.*cost|how much is|price of)\b'
                ],
                keywords=['price', 'cost', 'how much', 'expensive', 'cheap', 'affordable'],
                context_words=['medicine', 'product', 'item', 'drug'],
                confidence=1.0
            ),
            
            'order_query': IntentPattern(
                patterns=[
                    r'\b(?:order|purchase|buy|get|obtain)\b',
                    r'\b(?:i want to|i need to|can i|would like to)\b.*\b(?:order|buy|purchase)\b',
                    r'\b(?:place an order|make an order|request)\b'
                ],
                keywords=['order', 'purchase', 'buy', 'get', 'obtain'],
                context_words=['medicine', 'product', 'item', 'drug'],
                confidence=0.8
            ),
            
            'availability_query': IntentPattern(
                patterns=[
                    r'\b(?:available|unavailable|in stock|out of stock|backorder)\b',
                    r'\b(?:when will|when is|available when)\b',
                    r'\b(?:restock|reorder|back in stock)\b'
                ],
                keywords=['available', 'unavailable', 'in stock', 'out of stock', 'when'],
                context_words=['medicine', 'product', 'item', 'drug'],
                confidence=0.9
            ),
            
            'comparison_query': IntentPattern(
                patterns=[
                    r'\b(?:compare|comparison|difference|better|vs|versus)\b',
                    r'\b(?:which is better|what\'s the difference|compare)\b',
                    r'\b(?:alternative|substitute|instead of)\b'
                ],
                keywords=['compare', 'comparison', 'difference', 'better', 'vs', 'versus'],
                context_words=['medicine', 'product', 'drug', 'alternative'],
                confidence=0.8
            ),
            
            'greeting': IntentPattern(
                patterns=[
                    r'\b(?:hello|hi|hey|good morning|good afternoon|good evening)\b',
                    r'\b(?:greetings|welcome|howdy)\b'
                ],
                keywords=['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
                context_words=[],
                confidence=1.0
            ),
            
            'help_query': IntentPattern(
                patterns=[
                    r'\b(?:help|assist|support|what can you do|capabilities)\b',
                    r'\b(?:how do i|how can i|guide me|show me how)\b'
                ],
                keywords=['help', 'assist', 'support', 'what can you do', 'capabilities'],
                context_words=[],
                confidence=1.0
            ),
            
            'goodbye': IntentPattern(
                patterns=[
                    r'\b(?:bye|goodbye|see you|farewell|thanks|thank you)\b',
                    r'\b(?:that\'s all|no more questions|done)\b'
                ],
                keywords=['bye', 'goodbye', 'see you', 'farewell', 'thanks', 'thank you'],
                context_words=[],
                confidence=1.0
            )
        }
        
    def _initialize_ml_classifier(self):
        """Initialize machine learning classifier"""
        try:
            # Create pipeline with TF-IDF and classifier
            self.ml_classifier = Pipeline([
                ('tfidf', TfidfVectorizer(
                    max_features=1000,
                    stop_words='english',
                    ngram_range=(1, 2),
                    min_df=1,
                    max_df=0.95
                )),
                ('classifier', RandomForestClassifier(
                    n_estimators=100,
                    random_state=42,
                    max_depth=10
                ))
            ])
            
            # Load training data if available
            self._load_training_data()
            
        except Exception as e:
            logger.error(f"Failed to initialize ML classifier: {e}")
            self.ml_classifier = None
            
    def _load_training_data(self):
        """Load training data for ML classifier"""
        training_file = 'ai_models/intent_training_data.pkl'
        try:
            if os.path.exists(training_file):
                with open(training_file, 'rb') as f:
                    self.training_data = pickle.load(f)
                logger.info(f"Loaded {len(self.training_data)} training examples")
        except Exception as e:
            logger.error(f"Failed to load training data: {e}")
            self.training_data = []
            
    def _save_training_data(self):
        """Save training data"""
        training_file = 'ai_models/intent_training_data.pkl'
        try:
            os.makedirs(os.path.dirname(training_file), exist_ok=True)
            with open(training_file, 'wb') as f:
                pickle.dump(self.training_data, f)
        except Exception as e:
            logger.error(f"Failed to save training data: {e}")
            
    def classify_intent(self, message: str, user_id: str = None, context: Dict = None) -> Tuple[str, float, Dict]:
        """Classify intent with confidence score and context"""
        
        # Get context from history if user_id provided
        if user_id and not context:
            context = self._get_context_from_history(user_id)
            
        # Preprocess message
        processed_message = self._preprocess_message(message)
        
        # Try ML classification first if available
        ml_intent, ml_confidence = self._classify_with_ml(processed_message)
        
        # Use pattern-based classification
        pattern_intent, pattern_confidence = self._classify_with_patterns(message, context)
        
        # Combine results
        if ml_confidence > pattern_confidence and ml_confidence > self.intent_confidence_threshold:
            final_intent = ml_intent
            final_confidence = ml_confidence
        else:
            final_intent = pattern_intent
            final_confidence = pattern_confidence
            
        # Update context history
        if user_id:
            self._update_context_history(user_id, message, final_intent, final_confidence)
            
        # Generate classification details
        classification_details = {
            'intent': final_intent,
            'confidence': final_confidence,
            'ml_confidence': ml_confidence,
            'pattern_confidence': pattern_confidence,
            'context_used': context is not None,
            'processed_message': processed_message,
            'timestamp': datetime.now().isoformat()
        }
        
        return final_intent, final_confidence, classification_details
        
    def _classify_with_patterns(self, message: str, context: Dict = None) -> Tuple[str, float]:
        """Classify intent using pattern matching"""
        message_lower = message.lower()
        intent_scores = {}
        
        # Score each intent pattern
        for intent_name, pattern in self.intent_patterns.items():
            score = pattern.score(message_lower)
            
            # Context bonus
            if context and context.get('last_intent') == intent_name:
                score *= 1.2  # 20% bonus for context continuity
                
            intent_scores[intent_name] = score
            
        # Return best intent
        if intent_scores:
            best_intent = max(intent_scores, key=intent_scores.get)
            best_score = intent_scores[best_intent]
            
            # Normalize score to 0-1 range
            normalized_score = min(1.0, best_score / 5.0)  # Assuming max possible score is 5
            
            return best_intent, normalized_score
            
        return 'generic_query', 0.1
        
    def _classify_with_ml(self, message: str) -> Tuple[str, float]:
        """Classify intent using machine learning"""
        if not self.ml_classifier or not self.training_data:
            return 'generic_query', 0.0
            
        try:
            # Prepare training data
            texts = [item['text'] for item in self.training_data]
            labels = [item['intent'] for item in self.training_data]
            
            if len(set(labels)) < 2:  # Need at least 2 different intents
                return 'generic_query', 0.0
                
            # Train classifier
            self.ml_classifier.fit(texts, labels)
            
            # Predict
            prediction = self.ml_classifier.predict([message])[0]
            confidence = max(self.ml_classifier.predict_proba([message])[0])
            
            return prediction, confidence
            
        except Exception as e:
            logger.error(f"ML classification failed: {e}")
            return 'generic_query', 0.0
            
    def _preprocess_message(self, message: str) -> str:
        """Preprocess message for better classification"""
        if not NLTK_AVAILABLE or not self.lemmatizer:
            return message.lower()
            
        try:
            # Tokenize and clean
            tokens = word_tokenize(message.lower())
            
            # Remove stopwords and lemmatize
            processed_tokens = []
            for token in tokens:
                if token.isalpha() and token not in self.stop_words:
                    lemmatized = self.lemmatizer.lemmatize(token)
                    processed_tokens.append(lemmatized)
                    
            return ' '.join(processed_tokens)
        except Exception as e:
            logger.warning(f"Message preprocessing failed: {e}")
            return message.lower()
        
    def _get_context_from_history(self, user_id: str) -> Dict:
        """Get context from user's interaction history"""
        history = self.context_history.get(user_id, [])
        
        if not history:
            return {}
            
        # Get recent interactions
        recent_interactions = history[-5:]  # Last 5 interactions
        
        context = {
            'last_intent': recent_interactions[-1]['intent'] if recent_interactions else None,
            'common_intents': Counter([i['intent'] for i in recent_interactions]).most_common(3),
            'interaction_count': len(history),
            'recent_topics': [i.get('topic', '') for i in recent_interactions if i.get('topic')]
        }
        
        return context
        
    def _update_context_history(self, user_id: str, message: str, intent: str, confidence: float):
        """Update user's context history"""
        interaction = {
            'message': message,
            'intent': intent,
            'confidence': confidence,
            'timestamp': datetime.now()
        }
        
        self.context_history[user_id].append(interaction)
        
        # Keep only last 20 interactions
        if len(self.context_history[user_id]) > 20:
            self.context_history[user_id] = self.context_history[user_id][-20:]
            
    def extract_entities(self, message: str, intent: str) -> Dict:
        """Extract entities from message based on intent"""
        entities = {
            'products': [],
            'quantities': [],
            'conditions': [],
            'locations': [],
            'time_references': [],
            'dosages': [],
            'brands': []
        }
        
        message_lower = message.lower()
        
        # Product patterns
        product_patterns = [
            r'\b(?:medicine|medication|drug|tablet|capsule|syrup|injection|cream|ointment)\b',
            r'\b(?:mg|ml|tablets|capsules|pills|drops|gel)\b'
        ]
        
        # Medicine names (common ones)
        medicine_names = [
            'paracetamol', 'acetaminophen', 'ibuprofen', 'aspirin', 'amoxicillin',
            'omeprazole', 'metformin', 'simvastatin', 'lisinopril', 'atorvastatin',
            'metoprolol', 'biogesic', 'tempra', 'vitamin', 'ascorbic', 'calcium'
        ]
        
        # Condition patterns
        condition_patterns = [
            r'\b(?:fever|headache|pain|cold|flu|cough|sore throat|stomach ache|nausea|diarrhea|constipation|allergies|rash|itchy skin|inflammation|high blood pressure|diabetes|cholesterol|anxiety|stress|insomnia|depression)\b'
        ]
        
        # Quantity patterns
        quantity_patterns = [
            r'\b\d+\s*(?:mg|ml|tablets?|capsules?|pills?|drops?)\b',
            r'\b(?:how many|how much|quantity|count|amount)\b'
        ]
        
        # Dosage patterns
        dosage_patterns = [
            r'\b\d+\s*mg\b',
            r'\b\d+\s*ml\b',
            r'\b\d+\s*(?:times|daily|per day)\b'
        ]
        
        # Extract entities based on patterns
        for pattern in product_patterns:
            matches = re.findall(pattern, message_lower)
            entities['products'].extend(matches)
            
        for medicine in medicine_names:
            if medicine in message_lower:
                entities['products'].append(medicine)
                
        for pattern in condition_patterns:
            matches = re.findall(pattern, message_lower)
            entities['conditions'].extend(matches)
            
        for pattern in quantity_patterns:
            matches = re.findall(pattern, message_lower)
            entities['quantities'].extend(matches)
            
        for pattern in dosage_patterns:
            matches = re.findall(pattern, message_lower)
            entities['dosages'].extend(matches)
            
        # Remove duplicates
        for key in entities:
            entities[key] = list(set(entities[key]))
            
        return entities
        
    def add_training_example(self, message: str, intent: str, user_id: str = None):
        """Add training example for ML classifier"""
        training_example = {
            'text': self._preprocess_message(message),
            'intent': intent,
            'user_id': user_id,
            'timestamp': datetime.now()
        }
        
        self.training_data.append(training_example)
        
        # Save training data
        self._save_training_data()
        
        # Retrain if we have enough data
        if len(self.training_data) >= 50:
            self._retrain_classifier()
            
    def _retrain_classifier(self):
        """Retrain ML classifier with new data"""
        if not self.ml_classifier or len(self.training_data) < 10:
            return
            
        try:
            texts = [item['text'] for item in self.training_data]
            labels = [item['intent'] for item in self.training_data]
            
            # Train classifier
            self.ml_classifier.fit(texts, labels)
            
            logger.info(f"Retrained ML classifier with {len(self.training_data)} examples")
            
        except Exception as e:
            logger.error(f"Failed to retrain classifier: {e}")
            
    def get_intent_statistics(self) -> Dict:
        """Get statistics about intent classification"""
        stats = {
            'total_patterns': len(self.intent_patterns),
            'training_examples': len(self.training_data),
            'ml_classifier_available': self.ml_classifier is not None,
            'intent_distribution': Counter([item['intent'] for item in self.training_data]),
            'confidence_threshold': self.intent_confidence_threshold
        }
        
        return stats
        
    def update_pattern_success(self, intent: str, success: bool):
        """Update pattern success rate for learning"""
        if intent in self.intent_patterns:
            pattern = self.intent_patterns[intent]
            pattern.usage_count += 1
            
            if success:
                pattern.success_rate = (pattern.success_rate * (pattern.usage_count - 1) + 1.0) / pattern.usage_count
            else:
                pattern.success_rate = (pattern.success_rate * (pattern.usage_count - 1) + 0.0) / pattern.usage_count

# Global instance
advanced_intent_classifier = AdvancedIntentClassifier()
