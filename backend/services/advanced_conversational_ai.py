#!/usr/bin/env python3
"""
Advanced Conversational AI Service for Pharmacy Assistant
Enhanced with context memory, personality, and learning capabilities
"""

import re
import random
import json
import pickle
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import numpy as np
from collections import defaultdict, deque
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
    from nltk.stem import WordNetLemmatizer
    NLTK_AVAILABLE = True
except ImportError:
    NLTK_AVAILABLE = False

logger = logging.getLogger(__name__)

class ConversationMemory:
    """Manages conversation context and memory"""
    
    def __init__(self, max_context_length=20, memory_duration_hours=24):
        self.conversations = {}  # user_id -> conversation history
        self.user_preferences = {}  # user_id -> preferences
        self.session_context = {}  # user_id -> current session context
        self.max_context_length = max_context_length
        self.memory_duration = timedelta(hours=memory_duration_hours)
        
    def add_interaction(self, user_id: str, user_message: str, bot_response: str, 
                       intent: str, entities: Dict, timestamp: datetime = None):
        """Add a conversation interaction to memory"""
        if timestamp is None:
            timestamp = datetime.now()
            
        if user_id not in self.conversations:
            self.conversations[user_id] = deque(maxlen=self.max_context_length)
            
        interaction = {
            'timestamp': timestamp,
            'user_message': user_message,
            'bot_response': bot_response,
            'intent': intent,
            'entities': entities,
            'context': self.get_current_context(user_id)
        }
        
        self.conversations[user_id].append(interaction)
        self._cleanup_old_memories(user_id)
        
    def get_conversation_history(self, user_id: str, last_n: int = 5) -> List[Dict]:
        """Get recent conversation history"""
        if user_id not in self.conversations:
            return []
        return list(self.conversations[user_id])[-last_n:]
        
    def get_current_context(self, user_id: str) -> Dict:
        """Get current conversation context"""
        if user_id not in self.session_context:
            self.session_context[user_id] = {
                'current_topic': None,
                'mentioned_products': [],
                'user_mood': 'neutral',
                'conversation_flow': 'general',
                'last_intent': None,
                'follow_up_expected': False
            }
        return self.session_context[user_id]
        
    def update_context(self, user_id: str, **kwargs):
        """Update conversation context"""
        context = self.get_current_context(user_id)
        context.update(kwargs)
        
    def _cleanup_old_memories(self, user_id: str):
        """Remove old memories beyond the time limit"""
        if user_id not in self.conversations:
            return
            
        cutoff_time = datetime.now() - self.memory_duration
        conversations = self.conversations[user_id]
        
        # Remove old interactions
        while conversations and conversations[0]['timestamp'] < cutoff_time:
            conversations.popleft()

class PersonalityEngine:
    """Manages AI personality traits and response style"""
    
    def __init__(self):
        self.personality_traits = {
            'helpfulness': 0.9,
            'friendliness': 0.8,
            'professionalism': 0.95,
            'empathy': 0.7,
            'humor': 0.3,
            'directness': 0.6
        }
        
        self.response_styles = {
            'formal': {
                'greetings': ["Hello! How may I assist you today?", "Good day! What can I help you with?"],
                'confirmations': ["I understand you're looking for", "Let me help you with"],
                'apologies': ["I apologize for any confusion", "I'm sorry, but"]
            },
            'casual': {
                'greetings': ["Hey there! What's up?", "Hi! How can I help you today?"],
                'confirmations': ["Got it! You need", "Sure thing! Let me find"],
                'apologies': ["Sorry about that", "My bad, but"]
            },
            'professional': {
                'greetings': ["Good day! I'm here to assist with your pharmacy needs.", "Hello! I can help you with product information and recommendations."],
                'confirmations': ["I'll assist you with finding", "Let me locate"],
                'apologies': ["I apologize, but I couldn't find", "Unfortunately, I'm unable to locate"]
            }
        }
        
        self.current_style = 'professional'
        
    def get_personality_response(self, template_type: str, **kwargs) -> str:
        """Get a personality-appropriate response"""
        style_templates = self.response_styles[self.current_style]
        
        if template_type in style_templates:
            templates = style_templates[template_type]
            base_template = random.choice(templates)
        else:
            base_template = kwargs.get('fallback', '')
            
        # Add personality modifiers
        if self.personality_traits['empathy'] > 0.7:
            if 'sorry' in base_template.lower() or 'apologize' in base_template.lower():
                base_template += " I understand this can be frustrating."
                
        if self.personality_traits['humor'] > 0.5 and random.random() < 0.2:
            base_template += self._add_humor()
            
        return base_template.format(**kwargs)
        
    def _add_humor(self) -> str:
        """Add appropriate humor to responses"""
        humor_phrases = [
            " 😊",
            " Hope this helps!",
            " Let's get you sorted!",
            " I've got your back!",
            " No worries, I'm here to help!"
        ]
        return random.choice(humor_phrases)
        
    def adjust_personality_based_on_user(self, user_mood: str, interaction_count: int):
        """Adjust personality based on user interaction"""
        if user_mood == 'frustrated':
            self.personality_traits['empathy'] = min(0.95, self.personality_traits['empathy'] + 0.1)
            self.personality_traits['directness'] = max(0.3, self.personality_traits['directness'] - 0.1)
        elif user_mood == 'happy':
            self.personality_traits['humor'] = min(0.6, self.personality_traits['humor'] + 0.05)
            self.personality_traits['friendliness'] = min(0.95, self.personality_traits['friendliness'] + 0.05)
            
        if interaction_count > 5:  # Regular user
            self.current_style = 'casual'
        else:  # New user
            self.current_style = 'professional'

class AdvancedNLPAnalyzer:
    """Advanced NLP analysis for better understanding"""
    
    def __init__(self):
        self.lemmatizer = None
        self.stop_words = set()
        
        if NLTK_AVAILABLE:
            try:
                # Download required NLTK data
                nltk.download('punkt', quiet=True)
                nltk.download('stopwords', quiet=True)
                nltk.download('wordnet', quiet=True)
                
                self.lemmatizer = WordNetLemmatizer()
                self.stop_words = set(stopwords.words('english'))
            except Exception as e:
                logger.warning(f"NLTK setup failed: {e}")
                
    def analyze_sentiment(self, text: str) -> Dict:
        """Analyze sentiment of user message"""
        if TEXTBLOB_AVAILABLE:
            try:
                blob = TextBlob(text)
                polarity = blob.sentiment.polarity
                subjectivity = blob.sentiment.subjectivity
                
                if polarity > 0.1:
                    sentiment = 'positive'
                elif polarity < -0.1:
                    sentiment = 'negative'
                else:
                    sentiment = 'neutral'
                    
                return {
                    'sentiment': sentiment,
                    'polarity': polarity,
                    'subjectivity': subjectivity,
                    'confidence': abs(polarity)
                }
            except Exception as e:
                logger.warning(f"Sentiment analysis failed: {e}")
                return {'sentiment': 'neutral', 'polarity': 0.0, 'subjectivity': 0.0, 'confidence': 0.0}
        else:
            return {'sentiment': 'neutral', 'polarity': 0.0, 'subjectivity': 0.0, 'confidence': 0.0}
            
    def extract_entities(self, text: str) -> Dict:
        """Extract entities from text"""
        entities = {
            'products': [],
            'quantities': [],
            'conditions': [],
            'locations': [],
            'time_references': []
        }
        
        # Product patterns
        product_patterns = [
            r'\b(?:medicine|medication|drug|tablet|capsule|syrup|injection|cream|ointment)\b',
            r'\b(?:mg|ml|tablets|capsules|pills)\b'
        ]
        
        # Quantity patterns
        quantity_patterns = [
            r'\b\d+\s*(?:mg|ml|tablets?|capsules?|pills?)\b',
            r'\b(?:how many|how much|quantity|count)\b'
        ]
        
        # Condition patterns
        condition_patterns = [
            r'\b(?:fever|headache|pain|cold|flu|cough|sore throat|stomach ache|nausea|diarrhea|constipation|allergies|rash|itchy skin|inflammation|high blood pressure|diabetes|cholesterol|anxiety|stress|insomnia|depression)\b'
        ]
        
        # Location patterns
        location_patterns = [
            r'\b(?:where|locate|find|aisle|shelf|section)\b'
        ]
        
        text_lower = text.lower()
        
        for pattern in product_patterns:
            matches = re.findall(pattern, text_lower)
            entities['products'].extend(matches)
            
        for pattern in quantity_patterns:
            matches = re.findall(pattern, text_lower)
            entities['quantities'].extend(matches)
            
        for pattern in condition_patterns:
            matches = re.findall(pattern, text_lower)
            entities['conditions'].extend(matches)
            
        for pattern in location_patterns:
            matches = re.findall(pattern, text_lower)
            entities['locations'].extend(matches)
            
        return entities
        
    def detect_user_mood(self, text: str, sentiment: Dict) -> str:
        """Detect user mood from text and sentiment"""
        text_lower = text.lower()
        
        # Mood indicators
        frustrated_words = ['frustrated', 'annoyed', 'angry', 'upset', 'disappointed', 'terrible', 'awful']
        happy_words = ['happy', 'great', 'excellent', 'wonderful', 'amazing', 'fantastic', 'perfect']
        confused_words = ['confused', 'don\'t understand', 'not sure', 'unclear', 'help me']
        
        if any(word in text_lower for word in frustrated_words) or sentiment['polarity'] < -0.3:
            return 'frustrated'
        elif any(word in text_lower for word in happy_words) or sentiment['polarity'] > 0.3:
            return 'happy'
        elif any(word in text_lower for word in confused_words):
            return 'confused'
        else:
            return 'neutral'

class LearningSystem:
    """Learns from user interactions to improve responses"""
    
    def __init__(self, learning_file='ai_models/conversation_learning.pkl'):
        self.learning_file = learning_file
        self.interaction_patterns = defaultdict(list)
        self.successful_responses = defaultdict(list)
        self.user_feedback = defaultdict(list)
        self.load_learning_data()
        
    def record_interaction(self, user_id: str, user_message: str, bot_response: str, 
                          intent: str, success_score: float):
        """Record an interaction for learning"""
        pattern_key = f"{intent}_{len(user_message.split())}"
        
        self.interaction_patterns[pattern_key].append({
            'user_message': user_message,
            'bot_response': bot_response,
            'success_score': success_score,
            'timestamp': datetime.now()
        })
        
        if success_score > 0.7:  # Successful interaction
            self.successful_responses[pattern_key].append(bot_response)
            
        self._cleanup_old_data()
        
    def get_learned_response(self, intent: str, message_length: int) -> Optional[str]:
        """Get a learned response based on similar interactions"""
        pattern_key = f"{intent}_{message_length}"
        
        if pattern_key in self.successful_responses and self.successful_responses[pattern_key]:
            # Return a successful response from the past
            return random.choice(self.successful_responses[pattern_key])
            
        return None
        
    def save_learning_data(self):
        """Save learning data to file"""
        try:
            os.makedirs(os.path.dirname(self.learning_file), exist_ok=True)
            
            learning_data = {
                'interaction_patterns': dict(self.interaction_patterns),
                'successful_responses': dict(self.successful_responses),
                'user_feedback': dict(self.user_feedback),
                'last_updated': datetime.now()
            }
            
            with open(self.learning_file, 'wb') as f:
                pickle.dump(learning_data, f)
                
        except Exception as e:
            logger.error(f"Failed to save learning data: {e}")
            
    def load_learning_data(self):
        """Load learning data from file"""
        try:
            if os.path.exists(self.learning_file):
                with open(self.learning_file, 'rb') as f:
                    learning_data = pickle.load(f)
                    
                self.interaction_patterns = defaultdict(list, learning_data.get('interaction_patterns', {}))
                self.successful_responses = defaultdict(list, learning_data.get('successful_responses', {}))
                self.user_feedback = defaultdict(list, learning_data.get('user_feedback', {}))
                
        except Exception as e:
            logger.error(f"Failed to load learning data: {e}")
            
    def _cleanup_old_data(self):
        """Remove old learning data"""
        cutoff_date = datetime.now() - timedelta(days=30)
        
        for pattern in list(self.interaction_patterns.keys()):
            self.interaction_patterns[pattern] = [
                interaction for interaction in self.interaction_patterns[pattern]
                if interaction['timestamp'] > cutoff_date
            ]
            
            if not self.interaction_patterns[pattern]:
                del self.interaction_patterns[pattern]

class AdvancedConversationalAI:
    """Advanced conversational AI with memory, personality, and learning"""
    
    def __init__(self):
        self.memory = ConversationMemory()
        self.personality = PersonalityEngine()
        self.nlp_analyzer = AdvancedNLPAnalyzer()
        self.learning_system = LearningSystem()
        
        # Enhanced response templates
        self.response_templates = self._load_enhanced_templates()
        self.follow_up_questions = self._load_follow_up_questions()
        
    def _load_enhanced_templates(self) -> Dict:
        """Load enhanced response templates with personality"""
        return {
            'greeting': [
                "Hello! I'm your pharmacy assistant. How can I help you today?",
                "Hi there! I'm here to help with your pharmacy needs. What can I do for you?",
                "Welcome! I can help you find products, check stock, or provide medicine information.",
                "Hello! I'm your AI pharmacy assistant. What would you like to know?",
                "Hi! I can help you with product recommendations, locations, and medicine info."
            ],
            'help': [
                "I can help you with:\n• Product recommendations\n• Finding product locations\n• Checking stock levels\n• Medicine information\n• General pharmacy questions",
                "Here's what I can do for you:\n• Recommend products for specific needs\n• Locate products in the pharmacy\n• Check current stock levels\n• Provide medicine information\n• Answer pharmacy-related questions",
                "I'm your pharmacy assistant! I can:\n• Suggest products based on your needs\n• Tell you where to find products\n• Check inventory levels\n• Explain what medicines are used for\n• Help with any pharmacy questions"
            ],
            'stock_info': [
                "Great! I found {count} product(s) for {product_name}:",
                "Here's the stock information for {product_name}:",
                "I can help you with {product_name} stock levels:",
                "Let me check the inventory for {product_name}:",
                "Perfect! Here's what I found for {product_name}:"
            ],
            'locations': [
                "I found {product_name} in the following locations:",
                "Here's where you can find {product_name}:",
                "Let me show you where {product_name} is located:",
                "I can help you locate {product_name}:",
                "Great! {product_name} is available in these locations:"
            ],
            'recommendations': [
                "Based on your needs, I recommend these products:",
                "Here are some great options for you:",
                "I found {count} products that might help with your request:",
                "Let me suggest some products for you:",
                "Perfect! Here are some recommendations for you:"
            ],
            'medical_info': [
                "Here's what I know about {medicine_name}:",
                "Let me share some information about {medicine_name}:",
                "I can help you understand {medicine_name}:",
                "Here are the details about {medicine_name}:",
                "Great question! Here's information about {medicine_name}:"
            ],
            'no_results': [
                "I couldn't find any products matching '{query}'. Could you try a different search term?",
                "Sorry, I don't have any products that match '{query}'. Maybe try a different name?",
                "I couldn't locate '{query}' in our inventory. Could you check the spelling?",
                "No results found for '{query}'. Would you like to try a different search?",
                "Hmm, I couldn't find '{query}' in our system. Could you try a different approach?"
            ],
            'clarification': [
                "I want to make sure I understand correctly. Are you looking for {clarification}?",
                "Just to clarify, you need help with {clarification}, right?",
                "Let me confirm - you're asking about {clarification}?",
                "I want to help you best. Are you referring to {clarification}?"
            ],
            'follow_up': [
                "Is there anything else I can help you with?",
                "Would you like to know more about any of these products?",
                "Do you need help with anything else today?",
                "Is there anything specific you'd like to know about these recommendations?",
                "Would you like me to find more information about any of these?"
            ]
        }
        
    def _load_follow_up_questions(self) -> Dict:
        """Load follow-up questions for different intents"""
        return {
            'stock_query': [
                "Would you like me to check if we have alternatives?",
                "Should I notify you when this product is back in stock?",
                "Would you like to know the expiration dates for these items?"
            ],
            'location_query': [
                "Would you like me to check the stock levels for these products?",
                "Do you need help finding any other products?",
                "Would you like to know the prices of these items?"
            ],
            'recommendation_query': [
                "Would you like more information about any of these products?",
                "Do you need help with the recommended dosages?",
                "Would you like me to check if these are in stock?"
            ],
            'medical_info_query': [
                "Would you like to know about similar medicines?",
                "Do you need help with dosage information?",
                "Would you like me to check if we have this medicine in stock?"
            ]
        }
        
    def process_message(self, user_id: str, message: str, intent: str, data: List, 
                       product_name: str = None, medicine_name: str = None) -> Dict:
        """Process user message with advanced conversational capabilities"""
        
        # Analyze user message
        sentiment = self.nlp_analyzer.analyze_sentiment(message)
        entities = self.nlp_analyzer.extract_entities(message)
        user_mood = self.nlp_analyzer.detect_user_mood(message, sentiment)
        
        # Update personality based on user
        interaction_count = len(self.memory.get_conversation_history(user_id))
        self.personality.adjust_personality_based_on_user(user_mood, interaction_count)
        
        # Get conversation context
        context = self.memory.get_current_context(user_id)
        history = self.memory.get_conversation_history(user_id, last_n=3)
        
        # Generate response
        response = self._generate_contextual_response(
            intent, data, message, user_mood, context, history,
            product_name, medicine_name, entities
        )
        
        # Add follow-up questions
        response = self._add_follow_up_questions(response, intent, context)
        
        # Record interaction for learning
        success_score = self._calculate_success_score(response, data, user_mood)
        self.learning_system.record_interaction(user_id, message, response['message'], intent, success_score)
        
        # Update memory
        self.memory.add_interaction(user_id, message, response['message'], intent, entities)
        self.memory.update_context(user_id, 
                                 current_topic=intent,
                                 user_mood=user_mood,
                                 last_intent=intent,
                                 follow_up_expected=True)
        
        # Enhance with personality
        response['message'] = self._enhance_with_personality(response['message'], user_mood)
        
        return response
        
    def _generate_contextual_response(self, intent: str, data: List, message: str, 
                                    user_mood: str, context: Dict, history: List,
                                    product_name: str, medicine_name: str, 
                                    entities: Dict) -> Dict:
        """Generate contextual response based on conversation history"""
        
        # Check if we need clarification
        if self._needs_clarification(message, intent, entities):
            return self._generate_clarification_response(message, entities)
            
        # Check for learned responses
        learned_response = self.learning_system.get_learned_response(intent, len(message.split()))
        if learned_response:
            return {
                'type': intent,
                'message': learned_response,
                'data': data,
                'learned': True
            }
            
        # Generate standard response
        if intent == 'greeting' or self._is_greeting(message):
            return {
                'type': 'greeting',
                'message': random.choice(self.response_templates['greeting']),
                'data': []
            }
            
        elif intent == 'help' or self._is_help_request(message):
            return {
                'type': 'help',
                'message': random.choice(self.response_templates['help']),
                'data': []
            }
            
        elif intent == 'stock_query':
            return self._generate_stock_response(data, product_name, user_mood)
            
        elif intent == 'location_query':
            return self._generate_location_response(data, product_name, user_mood)
            
        elif intent == 'recommendation_query':
            return self._generate_recommendation_response(data, user_mood)
            
        elif intent == 'medical_info_query':
            return self._generate_medical_info_response(data, medicine_name, user_mood)
            
        else:
            return self._generate_general_response(message, user_mood, context)
            
    def _generate_stock_response(self, data: List, product_name: str, user_mood: str) -> Dict:
        """Generate stock information response"""
        if data and len(data) > 0:
            template = random.choice(self.response_templates['stock_info'])
            name = product_name or data[0].get('name', 'your product')
            message = template.format(count=len(data), product_name=name)
            
            # Add mood-appropriate enhancements
            if user_mood == 'frustrated':
                message += "\n\nI hope this helps! Let me know if you need anything else."
            elif user_mood == 'confused':
                message += "\n\nFeel free to ask if you need clarification on anything!"
                
            return {
                'type': 'stock_info',
                'message': message,
                'data': data
            }
        else:
            template = random.choice(self.response_templates['no_results'])
            return {
                'type': 'no_results',
                'message': template.format(query=product_name or 'your search'),
                'data': []
            }
            
    def _generate_location_response(self, data: List, product_name: str, user_mood: str) -> Dict:
        """Generate location response"""
        if data and len(data) > 0:
            template = random.choice(self.response_templates['locations'])
            name = product_name or data[0].get('name', 'your product')
            message = template.format(product_name=name)
            
            return {
                'type': 'locations',
                'message': message,
                'data': data
            }
        else:
            template = random.choice(self.response_templates['no_results'])
            return {
                'type': 'no_results',
                'message': template.format(query=product_name or 'your search'),
                'data': []
            }
            
    def _generate_recommendation_response(self, data: List, user_mood: str) -> Dict:
        """Generate recommendation response"""
        if data and len(data) > 0:
            template = random.choice(self.response_templates['recommendations'])
            message = template.format(count=len(data))
            
            return {
                'type': 'recommendations',
                'message': message,
                'data': data
            }
        else:
            template = random.choice(self.response_templates['no_results'])
            return {
                'type': 'no_results',
                'message': template.format(query='your request'),
                'data': []
            }
            
    def _generate_medical_info_response(self, data: Dict, medicine_name: str, user_mood: str) -> Dict:
        """Generate medical information response"""
        if data:
            template = random.choice(self.response_templates['medical_info'])
            name = medicine_name or data.get('name', 'this medicine')
            message = template.format(medicine_name=name)
            
            # Add medical disclaimer
            message += "\n\n⚠️ Remember: Always consult your doctor or pharmacist before taking any medicine."
            
            return {
                'type': 'medical_info',
                'message': message,
                'data': data
            }
        else:
            template = random.choice(self.response_templates['no_results'])
            return {
                'type': 'no_results',
                'message': template.format(query=medicine_name or 'this medicine'),
                'data': []
            }
            
    def _generate_clarification_response(self, message: str, entities: Dict) -> Dict:
        """Generate clarification request"""
        if entities['products']:
            clarification = f"products like {', '.join(entities['products'][:2])}"
        elif entities['conditions']:
            clarification = f"medicines for {', '.join(entities['conditions'][:2])}"
        else:
            clarification = "a specific product or condition"
            
        template = random.choice(self.response_templates['clarification'])
        
        return {
            'type': 'clarification',
            'message': template.format(clarification=clarification),
            'data': []
        }
        
    def _generate_general_response(self, message: str, user_mood: str, context: Dict) -> Dict:
        """Generate general response"""
        if context.get('current_topic'):
            return {
                'type': 'general',
                'message': f"I understand you're asking about {context['current_topic']}. Let me help you with that!",
                'data': []
            }
        else:
            return {
                'type': 'general',
                'message': "I'm here to help you with your pharmacy needs! I can assist you with product recommendations, locations, stock information, and medicine details.",
                'data': []
            }
            
    def _add_follow_up_questions(self, response: Dict, intent: str, context: Dict) -> Dict:
        """Add follow-up questions to response"""
        if intent in self.follow_up_questions and response['type'] != 'no_results':
            follow_up = random.choice(self.follow_up_questions[intent])
            response['message'] += f"\n\n{follow_up}"
            response['follow_up'] = follow_up
            
        return response
        
    def _enhance_with_personality(self, message: str, user_mood: str) -> str:
        """Enhance message with personality traits"""
        if self.personality.personality_traits['empathy'] > 0.8 and user_mood == 'frustrated':
            message += "\n\nI understand this can be frustrating. I'm here to help make this easier for you."
            
        if self.personality.personality_traits['humor'] > 0.5 and random.random() < 0.1:
            message += "\n\nHope this helps! 😊"
            
        return message
        
    def _needs_clarification(self, message: str, intent: str, entities: Dict) -> bool:
        """Check if clarification is needed"""
        # Check for ambiguous requests
        ambiguous_phrases = ['something for', 'help with', 'medicine for', 'product for']
        
        if any(phrase in message.lower() for phrase in ambiguous_phrases):
            if not entities['products'] and not entities['conditions']:
                return True
                
        return False
        
    def _is_greeting(self, message: str) -> bool:
        """Check if message is a greeting"""
        greeting_words = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings']
        return any(word in message.lower() for word in greeting_words)
        
    def _is_help_request(self, message: str) -> bool:
        """Check if message is asking for help"""
        help_words = ['help', 'what can you do', 'capabilities', 'features', 'assist', 'support']
        return any(word in message.lower() for word in help_words)
        
    def _calculate_success_score(self, response: Dict, data: List, user_mood: str) -> float:
        """Calculate success score for learning"""
        score = 0.5  # Base score
        
        if response['type'] != 'no_results':
            score += 0.3
            
        if data and len(data) > 0:
            score += 0.2
            
        if user_mood == 'happy':
            score += 0.1
        elif user_mood == 'frustrated':
            score -= 0.2
            
        return max(0.0, min(1.0, score))
        
    def get_user_preferences(self, user_id: str) -> Dict:
        """Get user preferences based on interaction history"""
        history = self.memory.get_conversation_history(user_id)
        
        preferences = {
            'common_intents': defaultdict(int),
            'mentioned_products': set(),
            'preferred_response_style': 'professional',
            'interaction_frequency': len(history)
        }
        
        for interaction in history:
            preferences['common_intents'][interaction['intent']] += 1
            preferences['mentioned_products'].update(interaction['entities'].get('products', []))
            
        return preferences
        
    def save_conversation_data(self):
        """Save conversation data for persistence"""
        self.learning_system.save_learning_data()

# Global instance
advanced_conversational_ai = AdvancedConversationalAI()
