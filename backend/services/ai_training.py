#!/usr/bin/env python3
"""
AI Training Service for Pharmacy Assistant
This service provides training data and patterns for better AI understanding
"""

class AITrainingService:
    def __init__(self):
        self.intent_patterns = self._load_intent_patterns()
        self.medicine_synonyms = self._load_medicine_synonyms()
        self.query_templates = self._load_query_templates()
    
    def _load_intent_patterns(self):
        """Load patterns for intent classification"""
        return {
            'stock_query': [
                'stock', 'stocks', 'available', 'inventory', 'how many',
                'quantity', 'count', 'left', 'remaining', 'in stock',
                'out of stock', 'stock level', 'current stock'
            ],
            'location_query': [
                'where', 'locate', 'find', 'location', 'shelf', 'aisle',
                'can i find', 'where is', 'where are', 'position'
            ],
            'recommendation_query': [
                'recommend', 'suggest', 'need', 'looking for', 'help with',
                'best', 'good for', 'treat', 'medicine for', 'what for',
                'fever', 'pain', 'headache', 'cold', 'flu', 'cough', 'medicine', 'medicines'
            ],
            'medical_info_query': [
                'what is', 'used for', 'benefits', 'side effects', 'information',
                'how does', 'work', 'dosage', 'precautions', 'contraindications'
            ],
            'price_query': [
                'price', 'cost', 'how much', 'expensive', 'cheap',
                'affordable', 'pricing', 'rates'
            ],
            'generic_query': [
                'hello', 'hi', 'help', 'assist', 'what can you do',
                'capabilities', 'features'
            ]
        }
    
    def _load_medicine_synonyms(self):
        """Load medicine name synonyms and variations"""
        return {
            'paracetamol': ['acetaminophen', 'tylenol', 'panadol', 'calpol'],
            'aspirin': ['acetylsalicylic acid', 'asa', 'aspilet'],
            'ibuprofen': ['advil', 'motrin', 'brufen'],
            'amoxicillin': ['amoxil', 'trimox', 'moxatag'],
            'omeprazole': ['prilosec', 'losec'],
            'metformin': ['glucophage', 'fortamet'],
            'simvastatin': ['zocor', 'simcor'],
            'lisinopril': ['prinivil', 'zestril'],
            'atorvastatin': ['lipitor'],
            'metoprolol': ['lopressor', 'toprol']
        }
    
    def _load_query_templates(self):
        """Load common query templates for training"""
        return {
            'stock_templates': [
                "{medicine} stock?",
                "How many {medicine} do we have?",
                "Is {medicine} available?",
                "Do we have {medicine} in stock?",
                "Check {medicine} inventory",
                "{medicine} quantity?",
                "How much {medicine} is left?"
            ],
            'location_templates': [
                "Where can I find {medicine}?",
                "Where is {medicine} located?",
                "Find {medicine}",
                "Locate {medicine}",
                "Where are the {medicine}?"
            ],
            'recommendation_templates': [
                "I need something for {condition}",
                "Recommend medicines for {condition}",
                "What's good for {condition}?",
                "Help with {condition}",
                "Best medicine for {condition}"
            ],
            'medical_info_templates': [
                "What is {medicine} used for?",
                "Tell me about {medicine}",
                "{medicine} benefits",
                "{medicine} side effects",
                "How does {medicine} work?"
            ]
        }
    
    def classify_intent(self, message):
        """Classify user intent based on message content"""
        message_lower = message.lower()
        
        # Score each intent based on pattern matches
        intent_scores = {}
        
        for intent, patterns in self.intent_patterns.items():
            score = 0
            for pattern in patterns:
                if pattern in message_lower:
                    score += 1
            
            # Weight certain patterns more heavily
            if intent == 'stock_query':
                if any(word in message_lower for word in ['stock', 'stocks', 'available']):
                    score += 2
            elif intent == 'location_query':
                if any(word in message_lower for word in ['where', 'find', 'locate']):
                    score += 2
            elif intent == 'medical_info_query':
                if any(word in message_lower for word in ['what is', 'used for']):
                    score += 2
            
            intent_scores[intent] = score
        
        # Return the intent with highest score
        if intent_scores:
            best_intent = max(intent_scores, key=intent_scores.get)
            if intent_scores[best_intent] > 0:
                return best_intent
        
        return 'generic_query'
    
    def extract_medicine_name(self, message, intent):
        """Extract medicine name from message based on intent"""
        message_lower = message.lower()
        
        # Define removal patterns based on intent
        removal_patterns = {
            'stock_query': ['stock', 'stocks', 'available', 'inventory', 'how many', 'quantity', 'count', 'left', 'remaining', 'in stock', 'out of stock', 'stock level', 'current stock', '?'],
            'location_query': ['where', 'locate', 'find', 'location', 'shelf', 'aisle', 'can i find', 'where is', 'where are', 'position', 'can', 'i', '?'],
            'medical_info_query': ['what is', 'used for', 'benefits', 'side effects', 'information', 'how does', 'work', 'dosage', 'precautions', 'contraindications', '?'],
            'recommendation_query': ['recommend', 'suggest', 'need', 'looking for', 'help with', 'best', 'good for', 'treat', 'medicine for', 'what for', 'medicine', 'medicines', '?'],
            'price_query': ['price', 'cost', 'how much', 'expensive', 'cheap', 'affordable', 'pricing', 'rates', '?']
        }
        
        # Remove patterns
        medicine_name = message
        if intent in removal_patterns:
            import re
            for pattern in removal_patterns[intent]:
                # Use word boundaries for better matching
                pattern_with_boundaries = r'\b' + re.escape(pattern) + r'\b'
                medicine_name = re.sub(pattern_with_boundaries, '', medicine_name, flags=re.IGNORECASE).strip()
        
        # Clean up extra spaces, remove empty words, and strip punctuation
        words = [word.strip('?.,! ') for word in medicine_name.split() if word.strip() and word.lower() not in ['i', 'me', 'my', 'you', 'your', 'we', 'us', 'our']]
        medicine_name = ' '.join(words).strip()
        
        return medicine_name
    
    def suggest_medicine_synonym(self, medicine_name):
        """Suggest medicine synonyms"""
        medicine_lower = medicine_name.lower()
        
        # Check direct synonyms
        for main_name, synonyms in self.medicine_synonyms.items():
            if medicine_lower == main_name:
                return main_name
            elif medicine_lower in synonyms:
                return main_name
        
        return medicine_name
    
    def generate_training_examples(self, medicine_names, conditions):
        """Generate training examples for the AI"""
        examples = []
        
        for medicine in medicine_names:
            # Stock queries
            for template in self.query_templates['stock_templates']:
                examples.append({
                    'query': template.format(medicine=medicine),
                    'intent': 'stock_query',
                    'medicine': medicine
                })
            
            # Location queries
            for template in self.query_templates['location_templates']:
                examples.append({
                    'query': template.format(medicine=medicine),
                    'intent': 'location_query',
                    'medicine': medicine
                })
            
            # Medical info queries
            for template in self.query_templates['medical_info_templates']:
                examples.append({
                    'query': template.format(medicine=medicine),
                    'intent': 'medical_info_query',
                    'medicine': medicine
                })
        
        for condition in conditions:
            # Recommendation queries
            for template in self.query_templates['recommendation_templates']:
                examples.append({
                    'query': template.format(condition=condition),
                    'intent': 'recommendation_query',
                    'condition': condition
                })
        
        return examples
    
    def get_common_conditions(self):
        """Get common medical conditions for recommendations"""
        return [
            'headache', 'fever', 'cold', 'flu', 'cough', 'sore throat',
            'pain', 'muscle pain', 'back pain', 'toothache',
            'stomach ache', 'nausea', 'diarrhea', 'constipation',
            'allergies', 'rash', 'itchy skin', 'inflammation',
            'high blood pressure', 'diabetes', 'cholesterol',
            'anxiety', 'stress', 'insomnia', 'depression'
        ]

# Global instance
ai_training = AITrainingService()
