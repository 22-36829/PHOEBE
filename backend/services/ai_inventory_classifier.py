#!/usr/bin/env python3
"""
AI-Powered Inventory Classifier
Automatically categorizes medicines and builds semantic search index
"""

import os
import json
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
import logging
from datetime import datetime

# Import ultra-advanced AI components
from ultra_advanced_ai import ultra_advanced_ai

logger = logging.getLogger(__name__)

class MedicineClassifier:
    """AI-powered medicine classification system"""
    
    def __init__(self):
        self.medicine_categories = {
            'antibiotics': [
                'amoxicillin', 'ampicillin', 'penicillin', 'azithromycin', 'ciprofloxacin',
                'cephalexin', 'doxycycline', 'erythromycin', 'clindamycin', 'metronidazole',
                'trimethoprim', 'sulfamethoxazole', 'cefuroxime', 'ceftriaxone'
            ],
            'pain_relief': [
                'paracetamol', 'acetaminophen', 'ibuprofen', 'aspirin', 'naproxen',
                'diclofenac', 'mefenamic', 'tramadol', 'codeine', 'morphine',
                'biogesic', 'tempra', 'aspilet', 'brufen', 'voltaren'
            ],
            'antihistamines': [
                'loratadine', 'cetirizine', 'fexofenadine', 'diphenhydramine',
                'chlorpheniramine', 'promethazine', 'hydroxyzine'
            ],
            'antacids': [
                'omeprazole', 'lansoprazole', 'ranitidine', 'cimetidine',
                'calcium_carbonate', 'magnesium_hydroxide', 'aluminum_hydroxide'
            ],
            'vitamins': [
                'vitamin_c', 'ascorbic', 'vitamin_d', 'multivitamin', 'calcium',
                'iron', 'folic_acid', 'vitamin_b12', 'vitamin_e', 'vitamin_a',
                'ceelin', 'growee', 'cherifer'
            ],
            'cough_medicine': [
                'dextromethorphan', 'guaifenesin', 'codeine', 'bromhexine',
                'ambroxol', 'carbocisteine'
            ],
            'diabetes': [
                'metformin', 'glipizide', 'gliclazide', 'insulin', 'glimepiride'
            ],
            'blood_pressure': [
                'amlodipine', 'lisinopril', 'metoprolol', 'atenolol', 'captopril',
                'enalapril', 'telmisartan', 'losartan', 'valsartan', 'catapres'
            ],
            'respiratory': [
                'salbutamol', 'albuterol', 'beclomethasone', 'budesonide',
                'montelukast', 'theophylline'
            ],
            'antifungal': [
                'fluconazole', 'clotrimazole', 'miconazole', 'ketoconazole',
                'terbinafine', 'nystatin'
            ],
            'supplements': [
                'protein', 'omega', 'glucosamine', 'chondroitin', 'probiotics',
                'milk', 'formula', 'nutrition'
            ],
            'topical': [
                'ointment', 'cream', 'gel', 'lotion', 'drops', 'spray'
            ]
        }
        
        self.brand_mappings = {
            'biogesic': 'paracetamol',
            'tempra': 'paracetamol',
            'aspilet': 'aspirin',
            'brufen': 'ibuprofen',
            'voltaren': 'diclofenac',
            'ceelin': 'vitamin_c',
            'growee': 'vitamin',
            'cherifer': 'vitamin',
            'catapres': 'clonidine'
        }
    
    def classify_medicine(self, medicine_name: str) -> List[str]:
        """Classify a medicine into categories"""
        name_lower = medicine_name.lower()
        categories = []
        
        # Check for exact matches in categories
        for category, medicines in self.medicine_categories.items():
            if any(med in name_lower for med in medicines):
                categories.append(category)
        
        # Check brand mappings
        for brand, generic in self.brand_mappings.items():
            if brand in name_lower:
                # Find category for generic name
                for category, medicines in self.medicine_categories.items():
                    if generic in medicines:
                        if category not in categories:
                            categories.append(category)
        
        # Check for dosage forms
        if any(form in name_lower for form in ['tablet', 'tab', 'capsule', 'cap']):
            if 'pain_relief' not in categories and any(pain in name_lower for pain in ['mg', 'strength']):
                categories.append('tablets_capsules')
        elif any(form in name_lower for form in ['syrup', 'suspension', 'drops']):
            categories.append('liquid_form')
        elif any(form in name_lower for form in ['injection', 'vial', 'ampule']):
            categories.append('injectable')
        
        return categories if categories else ['others']
    
    def get_medicine_info(self, medicine_name: str) -> Dict:
        """Get detailed information about a medicine"""
        categories = self.classify_medicine(medicine_name)
        
        info = {
            'name': medicine_name,
            'categories': categories,
            'primary_category': categories[0] if categories else 'others',
            'is_antibiotic': 'antibiotics' in categories,
            'is_pain_relief': 'pain_relief' in categories,
            'is_vitamin': 'vitamins' in categories,
            'is_prescription': self._is_prescription_medicine(medicine_name),
            'common_uses': self._get_common_uses(categories)
        }
        
        return info
    
    def _is_prescription_medicine(self, medicine_name: str) -> bool:
        """Check if medicine requires prescription"""
        prescription_keywords = [
            'antibiotic', 'amoxicillin', 'ampicillin', 'penicillin',
            'morphine', 'codeine', 'tramadol', 'insulin'
        ]
        
        name_lower = medicine_name.lower()
        return any(keyword in name_lower for keyword in prescription_keywords)
    
    def _get_common_uses(self, categories: List[str]) -> List[str]:
        """Get common uses for medicine categories"""
        uses_mapping = {
            'antibiotics': ['bacterial infections', 'respiratory infections', 'skin infections'],
            'pain_relief': ['headache', 'fever', 'muscle pain', 'arthritis'],
            'vitamins': ['immune support', 'nutritional deficiency', 'general health'],
            'antihistamines': ['allergies', 'cold symptoms', 'itchy skin'],
            'antacids': ['heartburn', 'stomach acid', 'digestive issues'],
            'cough_medicine': ['cough', 'cold', 'respiratory symptoms'],
            'diabetes': ['blood sugar control', 'diabetes management'],
            'blood_pressure': ['hypertension', 'heart health'],
            'respiratory': ['asthma', 'breathing problems'],
            'antifungal': ['fungal infections', 'skin infections'],
            'supplements': ['nutritional support', 'health maintenance']
        }
        
        uses = []
        for category in categories:
            if category in uses_mapping:
                uses.extend(uses_mapping[category])
        
        return list(set(uses))  # Remove duplicates

class AIInventoryManager:
    """AI-powered inventory management system"""
    
    def __init__(self):
        self.classifier = MedicineClassifier()
        self.semantic_index = {}
        self.medicine_database = {}
        
    def build_semantic_index_from_csv(self, csv_directory: str):
        """Build semantic search index from CSV files"""
        print("🔍 Building semantic index from CSV datasets...")
        
        csv_files = [
            'TABLETS AND CAPSULES.csv',
            'SYRUP AND SUSPENSION.csv',
            'OTHERS.csv',
            'SUPPLIES.csv',
            'AMPULES AND VIALS DEXTROSE.csv',
            'MILK.csv'
        ]
        
        all_medicines = []
        
        for csv_file in csv_files:
            file_path = os.path.join(csv_directory, csv_file)
            if os.path.exists(file_path):
                try:
                    df = pd.read_csv(file_path)
                    print(f"  📁 Processing {csv_file}: {len(df)} items")
                    
                    for _, row in df.iterrows():
                        medicine_info = {
                            'name': row['name'],
                            'quantity': row.get('quantity', 0),
                            'cost_price': row.get('cost_price', 0),
                            'unit_price': row.get('unit_price', 0),
                            'category': row.get('category', ''),
                            'location': row.get('location', ''),
                            'source_file': csv_file,
                            'ai_categories': self.classifier.classify_medicine(row['name']),
                            'medicine_info': self.classifier.get_medicine_info(row['name'])
                        }
                        
                        all_medicines.append(medicine_info)
                        
                except Exception as e:
                    print(f"  ❌ Error processing {csv_file}: {e}")
        
        print(f"  ✅ Total medicines indexed: {len(all_medicines)}")
        
        # Build semantic search index
        self.medicine_database = {med['name'].lower(): med for med in all_medicines}
        
        # Use ultra-advanced AI to build semantic index
        ultra_advanced_ai.semantic_search.build_product_index(all_medicines)
        
        return all_medicines
    
    def search_medicine_semantic(self, query: str, limit: int = 10) -> List[Dict]:
        """Search medicines using semantic search"""
        # Use ultra-advanced AI semantic search
        results = ultra_advanced_ai.semantic_search.semantic_search(query, top_k=limit)
        
        enhanced_results = []
        for product, score in results:
            enhanced_product = product.copy()
            enhanced_product['semantic_score'] = score
            enhanced_product['ai_classification'] = self.classifier.get_medicine_info(product['name'])
            enhanced_results.append(enhanced_product)
        
        return enhanced_results
    
    def find_medicine_by_category(self, category: str, limit: int = 10) -> List[Dict]:
        """Find medicines by AI-determined category"""
        results = []
        
        for medicine_name, medicine_data in self.medicine_database.items():
            if category in medicine_data['ai_categories']:
                results.append(medicine_data)
        
        # Sort by quantity (availability)
        results.sort(key=lambda x: x.get('quantity', 0), reverse=True)
        
        return results[:limit]
    
    def smart_medicine_search(self, query: str) -> Dict:
        """Intelligent medicine search with multiple strategies"""
        query_lower = query.lower()
        
        # Strategy 1: Direct name search
        direct_matches = []
        for name, data in self.medicine_database.items():
            if query_lower in name:
                direct_matches.append(data)
        
        # Strategy 2: Category-based search
        category_matches = []
        for category in self.classifier.medicine_categories.keys():
            if category in query_lower:
                category_matches.extend(self.find_medicine_by_category(category, limit=5))
        
        # Strategy 3: Semantic search
        semantic_matches = self.search_medicine_semantic(query, limit=5)
        
        # Strategy 4: AI classification of query
        query_categories = self.classifier.classify_medicine(query)
        ai_matches = []
        for category in query_categories:
            ai_matches.extend(self.find_medicine_by_category(category, limit=3))
        
        # Combine and rank results
        all_results = {
            'direct_matches': direct_matches,
            'category_matches': category_matches,
            'semantic_matches': semantic_matches,
            'ai_classified_matches': ai_matches,
            'query_analysis': {
                'original_query': query,
                'detected_categories': query_categories,
                'search_strategies_used': len([x for x in [direct_matches, category_matches, semantic_matches, ai_matches] if x])
            }
        }
        
        return all_results
    
    def get_medicine_recommendations(self, condition: str) -> List[Dict]:
        """Get medicine recommendations for a condition"""
        condition_lower = condition.lower()
        
        # Map conditions to medicine categories
        condition_mapping = {
            'fever': ['pain_relief'],
            'headache': ['pain_relief'],
            'cough': ['cough_medicine', 'antihistamines'],
            'cold': ['antihistamines', 'cough_medicine'],
            'pain': ['pain_relief'],
            'infection': ['antibiotics'],
            'bacterial': ['antibiotics'],
            'allergy': ['antihistamines'],
            'heartburn': ['antacids'],
            'vitamin': ['vitamins'],
            'immune': ['vitamins'],
            'diabetes': ['diabetes'],
            'blood pressure': ['blood_pressure'],
            'asthma': ['respiratory']
        }
        
        relevant_categories = []
        for condition_key, categories in condition_mapping.items():
            if condition_key in condition_lower:
                relevant_categories.extend(categories)
        
        if not relevant_categories:
            # Fallback to semantic search
            return self.search_medicine_semantic(condition, limit=5)
        
        # Find medicines in relevant categories
        recommendations = []
        for category in relevant_categories:
            medicines = self.find_medicine_by_category(category, limit=3)
            for medicine in medicines:
                medicine['recommendation_reason'] = f"Recommended for {condition} (category: {category})"
                recommendations.append(medicine)
        
        # Remove duplicates and sort by availability
        unique_recommendations = []
        seen_names = set()
        for rec in recommendations:
            if rec['name'] not in seen_names:
                unique_recommendations.append(rec)
                seen_names.add(rec['name'])
        
        return unique_recommendations[:10]
    
    def update_database_categories(self, db_engine):
        """Update database with AI-determined categories"""
        print("🔄 Updating database with AI categories...")
        
        # Get all products from database
        query = """
        SELECT p.id, p.name, pc.name as current_category
        FROM products p
        LEFT JOIN product_categories pc ON p.category_id = pc.id
        WHERE p.is_active = true
        """
        
        with db_engine.connect() as conn:
            result = conn.execute(query)
            products = result.fetchall()
        
        print(f"  📊 Found {len(products)} products to analyze")
        
        updates = []
        for product in products:
            ai_info = self.classifier.get_medicine_info(product.name)
            
            # Create new detailed category if needed
            primary_category = ai_info['primary_category']
            detailed_category = f"{product.current_category} - {primary_category.title()}"
            
            updates.append({
                'id': product.id,
                'name': product.name,
                'ai_categories': ai_info['categories'],
                'primary_category': primary_category,
                'is_antibiotic': ai_info['is_antibiotic'],
                'is_pain_relief': ai_info['is_pain_relief'],
                'common_uses': ai_info['common_uses'],
                'detailed_category': detailed_category
            })
        
        print(f"  ✅ Analyzed {len(updates)} products")
        
        return updates

# Global instance
ai_inventory_manager = AIInventoryManager()
