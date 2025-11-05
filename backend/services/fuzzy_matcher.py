import os
import re
from typing import List, Tuple, Optional
from fuzzywuzzy import fuzz, process
import pandas as pd
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg2://postgres:PhoebeDrugStore01@db.xybuirzvlfuwmtcokkwm.supabase.co:5432/postgres?sslmode=require')
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

class FuzzyMedicineMatcher:
    def __init__(self):
        self.medicine_database = []
        self.common_misspellings = {
            'paracetamol': ['paracetemol', 'paracetamol', 'paracetemol', 'paracetamal', 'paracetamol'],
            'biogesic': ['biogesic', 'biogesic', 'biogesic', 'biogesic', 'biogesic'],
            'aspirin': ['aspirin', 'aspirin', 'aspirin', 'aspirin', 'aspirin'],
            'ibuprofen': ['ibuprofen', 'ibuprofen', 'ibuprofen', 'ibuprofen', 'ibuprofen'],
            'amoxicillin': ['amoxicillin', 'amoxicillin', 'amoxicillin', 'amoxicillin', 'amoxicillin'],
            'tempra': ['tempra', 'tempra', 'tempra', 'tempra', 'tempra'],
            'vitamin': ['vitamin', 'vitamin', 'vitamin', 'vitamin', 'vitamin'],
            'ascorbic': ['ascorbic', 'ascorbic', 'ascorbic', 'ascorbic', 'ascorbic']
        }
        self.load_medicine_database()
    
    def load_medicine_database(self):
        """Load all medicine names from database for fuzzy matching"""
        try:
            query = """
            SELECT DISTINCT p.name, pc.name as category_name
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.id
            WHERE p.is_active = true
            ORDER BY p.name
            """
            
            with engine.connect() as conn:
                df = pd.read_sql(query, conn)
            
            # Create a list of all medicine names and their normalized versions
            self.medicine_database = []
            for _, row in df.iterrows():
                medicine_name = row['name']
                category = row['category_name'] or ''
                
                # Add original name
                self.medicine_database.append({
                    'original': medicine_name,
                    'normalized': self.normalize_medicine_name(medicine_name),
                    'category': category,
                    'type': 'original'
                })
                
                # Add common variations
                variations = self.generate_variations(medicine_name)
                for variation in variations:
                    self.medicine_database.append({
                        'original': medicine_name,
                        'normalized': variation,
                        'category': category,
                        'type': 'variation'
                    })
            
            print(f"Loaded {len(self.medicine_database)} medicine entries for fuzzy matching")
            
        except Exception as e:
            print(f"Error loading medicine database: {e}")
            self.medicine_database = []
    
    def normalize_medicine_name(self, name: str) -> str:
        """Normalize medicine name for better matching"""
        if not name:
            return ""
        
        # Convert to lowercase
        normalized = name.lower()
        
        # Remove common suffixes and prefixes
        normalized = re.sub(r'\s+\d+\s*mg\b', '', normalized)  # Remove dosage
        normalized = re.sub(r'\s+\d+\s*ml\b', '', normalized)  # Remove volume
        normalized = re.sub(r'\s+\d+\s*tabs?\b', '', normalized)  # Remove tablet count
        normalized = re.sub(r'\s+\d+\s*caps?\b', '', normalized)  # Remove capsule count
        normalized = re.sub(r'\s+\(\w+\)', '', normalized)  # Remove parenthetical info
        normalized = re.sub(r'\s+ec\b', '', normalized)  # Remove EC suffix
        normalized = re.sub(r'\s+sr\b', '', normalized)  # Remove SR suffix
        normalized = re.sub(r'\s+cr\b', '', normalized)  # Remove CR suffix
        
        # Remove extra spaces
        normalized = ' '.join(normalized.split())
        
        return normalized
    
    def generate_variations(self, name: str) -> List[str]:
        """Generate common variations of medicine names"""
        variations = []
        normalized = self.normalize_medicine_name(name)
        
        # Split into words
        words = normalized.split()
        
        # Add variations for each word
        for word in words:
            if len(word) > 3:  # Only for longer words
                # Common misspellings
                if word in self.common_misspellings:
                    variations.extend(self.common_misspellings[word])
                
                # Add word without last letter (common typo)
                if len(word) > 4:
                    variations.append(word[:-1])
                
                # Add word with extra letter (common typo)
                variations.append(word + word[-1])
                
                # Add word with swapped adjacent letters
                for i in range(len(word) - 1):
                    swapped = word[:i] + word[i+1] + word[i] + word[i+2:]
                    variations.append(swapped)
        
        return list(set(variations))  # Remove duplicates
    
    def find_best_match(self, query: str, limit: int = 5) -> List[Tuple[str, int, str]]:
        """Find best fuzzy matches for a medicine query"""
        if not query or not self.medicine_database:
            return []
        
        # Normalize the query
        normalized_query = self.normalize_medicine_name(query)
        
        # Prepare choices for fuzzy matching
        choices = [item['normalized'] for item in self.medicine_database]
        
        # Use fuzzy matching
        matches = process.extract(normalized_query, choices, limit=limit, scorer=fuzz.ratio)
        
        # Filter matches with minimum score
        min_score = 60  # Minimum similarity score
        good_matches = [(match[0], match[1], self.get_original_name(match[0])) 
                       for match in matches if match[1] >= min_score]
        
        return good_matches
    
    def get_original_name(self, normalized_name: str) -> str:
        """Get original medicine name from normalized name"""
        for item in self.medicine_database:
            if item['normalized'] == normalized_name:
                return item['original']
        return normalized_name
    
    def suggest_correction(self, query: str) -> Optional[str]:
        """Suggest correction for misspelled medicine name"""
        matches = self.find_best_match(query, limit=1)
        if matches and matches[0][1] >= 70:  # Slightly lower threshold to catch close words
            return matches[0][2]  # Return original name
        return None
    
    def fuzzy_search_products(self, query: str, pharmacy_id: int, limit: int = 5) -> List[dict]:
        """Search products using fuzzy matching"""
        try:
            # First try exact match
            exact_matches = self.exact_search(query, pharmacy_id)
            if exact_matches:
                return exact_matches
            
            # If no exact match, try fuzzy matching
            fuzzy_matches = self.find_best_match(query, limit=10)
            
            if not fuzzy_matches:
                return []
            
            # Get products for fuzzy matches
            results = []
            for normalized_name, score, original_name in fuzzy_matches:
                products = self.exact_search(original_name, pharmacy_id)
                for product in products:
                    product['fuzzy_score'] = score
                    product['matched_via'] = 'fuzzy'
                    results.append(product)
            
            # Remove duplicates and sort by fuzzy score
            seen_ids = set()
            unique_results = []
            for product in results:
                if product['id'] not in seen_ids:
                    unique_results.append(product)
                    seen_ids.add(product['id'])
            
            # Sort by fuzzy score
            unique_results.sort(key=lambda x: x.get('fuzzy_score', 0), reverse=True)
            
            return unique_results[:limit]
            
        except Exception as e:
            print(f"Error in fuzzy search: {e}")
            return []
    
    def exact_search(self, query: str, pharmacy_id: int) -> List[dict]:
        """Exact search for products"""
        try:
            query_sql = """
            SELECT p.id, p.name, p.location, p.unit_price,
                   pc.name as category_name,
                   i.current_stock, i.available_stock, i.expiration_date
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.id
            LEFT JOIN inventory i ON p.id = i.product_id
            WHERE p.pharmacy_id = :pharmacy_id 
            AND LOWER(p.name) LIKE LOWER(:query)
            AND p.is_active = true
            ORDER BY i.current_stock DESC
            """
            
            with engine.connect() as conn:
                result = conn.execute(text(query_sql), {
                    'pharmacy_id': pharmacy_id,
                    'query': f'%{query}%'
                })
                products = result.fetchall()
            
            results = []
            for product in products:
                results.append({
                    'id': product.id,
                    'name': product.name,
                    'category': product.category_name,
                    'price': float(product.unit_price),
                    'stock': int(product.current_stock or 0),
                    'available_stock': int(product.available_stock or 0),
                    'location': product.location,
                    'expiration_date': product.expiration_date.isoformat() if product.expiration_date else None,
                    'matched_via': 'exact'
                })
            
            return results
            
        except Exception as e:
            print(f"Error in exact search: {e}")
            return []

_fuzzy_matcher_instance: Optional[FuzzyMedicineMatcher] = None


def get_fuzzy_matcher() -> FuzzyMedicineMatcher:
    """Lazily create a singleton matcher to avoid heavy startup work."""
    global _fuzzy_matcher_instance
    if _fuzzy_matcher_instance is None:
        _fuzzy_matcher_instance = FuzzyMedicineMatcher()
    return _fuzzy_matcher_instance


class _LazyFuzzyMatcher:
    """Proxy object that initializes the matcher on first use."""

    def __getattr__(self, item):
        return getattr(get_fuzzy_matcher(), item)


# Backwards-compatible proxy used by existing imports
fuzzy_matcher = _LazyFuzzyMatcher()
