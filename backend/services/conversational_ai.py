#!/usr/bin/env python3
"""
Conversational AI Service for Pharmacy Assistant
Provides natural, context-aware responses
"""

import re
import random
from datetime import datetime

class ConversationalAI:
    def __init__(self):
        self.conversation_context = {}
        self.response_templates = self._load_response_templates()
        self.greeting_responses = self._load_greeting_responses()
        self.help_responses = self._load_help_responses()
    
    def _load_response_templates(self):
        """Load natural response templates"""
        return {
            'stock_info': [
                "Great! I found {count} product(s) for {product_name}:",
                "Here's the stock information for {product_name}:",
                "I can help you with {product_name} stock levels:",
                "Let me check the inventory for {product_name}:"
            ],
            'locations': [
                "I found {product_name} in the following locations:",
                "Here's where you can find {product_name}:",
                "Let me show you where {product_name} is located:",
                "I can help you locate {product_name}:"
            ],
            'recommendations': [
                "Based on your needs, I recommend these products:",
                "Here are some great options for you:",
                "I found {count} products that might help with your request:",
                "Let me suggest some products for you:"
            ],
            'medical_info': [
                "Here's what I know about {medicine_name}:",
                "Let me share some information about {medicine_name}:",
                "I can help you understand {medicine_name}:",
                "Here are the details about {medicine_name}:"
            ],
            'no_results': [
                "I couldn't find any products matching '{query}'. Could you try a different search term?",
                "Sorry, I don't have any products that match '{query}'. Maybe try a different name?",
                "I couldn't locate '{query}' in our inventory. Could you check the spelling?",
                "No results found for '{query}'. Would you like to try a different search?"
            ],
            'general': [
                "I'm here to help you with your pharmacy needs! I can assist you with:",
                "Hello! I can help you with several things:",
                "Hi there! I'm your pharmacy assistant. I can help you with:",
                "Welcome! I'm here to assist you with:"
            ]
        }
    
    def _load_greeting_responses(self):
        """Load greeting responses"""
        return [
            "Hello! I'm your pharmacy assistant. How can I help you today?",
            "Hi there! I'm here to help with your pharmacy needs. What can I do for you?",
            "Welcome! I can help you find products, check stock, or provide medicine information.",
            "Hello! I'm your AI pharmacy assistant. What would you like to know?",
            "Hi! I can help you with product recommendations, locations, and medicine info."
        ]
    
    def _load_help_responses(self):
        """Load help responses"""
        return [
            "I can help you with:\n• Product recommendations\n• Finding product locations\n• Checking stock levels\n• Medicine information\n• General pharmacy questions",
            "Here's what I can do for you:\n• Recommend products for specific needs\n• Locate products in the pharmacy\n• Check current stock levels\n• Provide medicine information\n• Answer pharmacy-related questions",
            "I'm your pharmacy assistant! I can:\n• Suggest products based on your needs\n• Tell you where to find products\n• Check inventory levels\n• Explain what medicines are used for\n• Help with any pharmacy questions"
        ]
    
    def get_conversational_response(self, intent, data, query, product_name=None, medicine_name=None):
        """Generate a conversational response based on intent and data"""
        
        # Handle greetings
        if self._is_greeting(query):
            return {
                'type': 'greeting',
                'message': random.choice(self.greeting_responses),
                'data': []
            }
        
        # Handle help requests
        if self._is_help_request(query):
            return {
                'type': 'help',
                'message': random.choice(self.help_responses),
                'data': []
            }
        
        # Handle different intents
        if intent == 'stock_query':
            if data and len(data) > 0:
                template = random.choice(self.response_templates['stock_info'])
                name = product_name or data[0].get('name', 'your product')
                message = template.format(count=len(data), product_name=name)
                return {
                    'type': 'stock_info',
                    'message': message,
                    'data': data
                }
            else:
                template = random.choice(self.response_templates['no_results'])
                return {
                    'type': 'no_results',
                    'message': template.format(query=query),
                    'data': []
                }
        
        elif intent == 'location_query':
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
                    'message': template.format(query=query),
                    'data': []
                }
        
        elif intent == 'recommendation_query':
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
                    'message': template.format(query=query),
                    'data': []
                }
        
        elif intent == 'medical_info_query':
            if data:
                template = random.choice(self.response_templates['medical_info'])
                name = medicine_name or data.get('name', 'this medicine')
                message = template.format(medicine_name=name)
                return {
                    'type': 'medical_info',
                    'message': message,
                    'data': data
                }
            else:
                template = random.choice(self.response_templates['no_results'])
                return {
                    'type': 'no_results',
                    'message': template.format(query=query),
                    'data': []
                }
        
        else:
            # General response
            template = random.choice(self.response_templates['general'])
            return {
                'type': 'general',
                'message': template,
                'data': []
            }
    
    def _is_greeting(self, query):
        """Check if the query is a greeting"""
        greeting_words = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings']
        return any(word in query.lower() for word in greeting_words)
    
    def _is_help_request(self, query):
        """Check if the query is asking for help"""
        help_words = ['help', 'what can you do', 'capabilities', 'features', 'assist', 'support']
        return any(word in query.lower() for word in help_words)
    
    def add_context(self, user_id, context):
        """Add context to the conversation"""
        if user_id not in self.conversation_context:
            self.conversation_context[user_id] = []
        
        self.conversation_context[user_id].append({
            'timestamp': datetime.now(),
            'context': context
        })
        
        # Keep only last 10 interactions
        if len(self.conversation_context[user_id]) > 10:
            self.conversation_context[user_id] = self.conversation_context[user_id][-10:]
    
    def get_context(self, user_id):
        """Get conversation context for a user"""
        return self.conversation_context.get(user_id, [])
    
    def enhance_response(self, response, user_query, intent):
        """Enhance response with additional helpful information"""
        enhanced_response = response.copy()
        
        # Add helpful suggestions based on intent
        if intent == 'stock_query' and response['type'] == 'stock_info':
            if any(item.get('stock', 0) == 0 for item in response.get('data', [])):
                enhanced_response['message'] += "\n\n⚠️ Some products are out of stock. Would you like me to recommend alternatives?"
        
        elif intent == 'location_query' and response['type'] == 'locations':
            enhanced_response['message'] += "\n\n💡 Tip: You can also ask me about stock levels for any of these products!"
        
        elif intent == 'recommendation_query' and response['type'] == 'recommendations':
            enhanced_response['message'] += "\n\n💡 Need more specific information about any of these products? Just ask!"
        
        elif intent == 'medical_info_query' and response['type'] == 'medical_info':
            enhanced_response['message'] += "\n\n⚠️ Remember: Always consult your doctor or pharmacist before taking any medicine."
        
        return enhanced_response

# Global instance
conversational_ai = ConversationalAI()
