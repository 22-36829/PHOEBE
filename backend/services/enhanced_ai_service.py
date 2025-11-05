#!/usr/bin/env python3
"""
Enhanced AI Service with Direct CSV Integration
Direct integration with CSV data without requiring semantic index
"""

import os
import json
import pandas as pd
import numpy as np
from typing import Any, Dict, List, Optional, Tuple
from fuzzywuzzy import fuzz
import re
import logging
from datetime import datetime, timedelta
from pathlib import Path
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from .semantic_embeddings import SemanticEmbeddingService

load_dotenv()

logger = logging.getLogger(__name__)

DEFAULT_SYNONYM_CONFIG = {
    "category_mappings": {
        "antibiotics": [
            "amoxicillin",
            "ampicillin",
            "penicillin",
            "azithromycin",
            "ciprofloxacin",
            "cephalexin",
            "doxycycline",
            "erythromycin",
            "clindamycin",
            "metronidazole",
            "trimethoprim",
            "sulfamethoxazole",
            "cefuroxime",
            "ceftriaxone",
            "antibiotic"
        ],
        "pain_relief": [
            "paracetamol",
            "acetaminophen",
            "ibuprofen",
            "aspirin",
            "naproxen",
            "diclofenac",
            "mefenamic",
            "tramadol",
            "codeine",
            "morphine",
            "biogesic",
            "tempra",
            "aspilet",
            "brufen",
            "voltaren",
            "pain",
            "fever",
            "headache"
        ],
        "vitamins": [
            "vitamin",
            "ascorbic",
            "calcium",
            "iron",
            "folic",
            "ceelin",
            "growee",
            "cherifer"
        ],
        "antihistamines": [
            "loratadine",
            "cetirizine",
            "fexofenadine",
            "diphenhydramine",
            "allergy"
        ],
        "antacids": [
            "omeprazole",
            "ranitidine",
            "cimetidine",
            "antacid",
            "heartburn"
        ],
        "cough_medicine": [
            "cough",
            "dextromethorphan",
            "guaifenesin",
            "bromhexine",
            "cold"
        ],
        "diabetes": [
            "metformin",
            "glipizide",
            "insulin",
            "diabetes",
            "glucose"
        ],
        "blood_pressure": [
            "amlodipine",
            "lisinopril",
            "metoprolol",
            "telmisartan",
            "catapres",
            "blood pressure"
        ],
        "respiratory": [
            "salbutamol",
            "albuterol",
            "asthma",
            "breathing",
            "respiratory"
        ],
        "antifungal": [
            "fluconazole",
            "clotrimazole",
            "fungal",
            "yeast"
        ],
        "supplements": [
            "protein",
            "omega",
            "supplement",
            "nutrition",
            "milk",
            "formula"
        ]
    },
    "brand_mappings": {
        "biogesic": "paracetamol",
        "tempra": "paracetamol",
        "aspilet": "aspirin",
        "brufen": "ibuprofen",
        "voltaren": "diclofenac",
        "ceelin": "vitamin_c",
        "growee": "vitamin",
        "cherifer": "vitamin",
        "catapres": "clonidine"
    },
    "keyword_overrides": {}
}

class EnhancedAIService:
    """Enhanced AI service with direct CSV data integration"""
    
    def __init__(self, csv_directory: str = "../datasets_clean", use_database: bool = True):
        self.csv_directory = csv_directory
        self.use_database = use_database
        self.medicine_database = {}
        self.last_refresh: Optional[datetime] = None
        self.last_refresh_source: Optional[str] = None
        self.refresh_interval_seconds = int(os.getenv('AI_INVENTORY_REFRESH_SECONDS', '300'))
        self.keyword_overrides: Dict[str, List[str]] = {}
        self.synonym_config_path = Path(os.getenv(
            'AI_SYNONYM_CONFIG_PATH',
            Path(__file__).resolve().parent.parent / 'config' / 'ai_synonyms.json'
        ))
        self._synonym_config_mtime: Optional[float] = None
        
        # Database connection for live data
        if use_database:
            self.database_url = os.getenv('DATABASE_URL', 'postgresql+psycopg2://postgres:PhoebeDrugStore01@db.xybuirzvlfuwmtcokkwm.supabase.co:5432/postgres?sslmode=require')
            self.engine = create_engine(self.database_url, pool_pre_ping=True)
        self.category_mappings: Dict[str, List[str]] = {}
        self.brand_mappings: Dict[str, str] = {}
        self._load_synonym_config(force=True)
        # Initialize semantic embedding service (lazy, optional)
        self.semantic_service = SemanticEmbeddingService()
        
        # Load data from database or CSV
        if use_database:
            self.load_database_data()
        else:
            self.load_csv_data()
        # Warm up semantic embeddings (best-effort, non-blocking)
        try:
            self.semantic_service.load_or_build(self.medicine_database)
        except Exception:
            pass
    
    def load_csv_data(self):
        """Load and process CSV data"""
        logger.info("Loading CSV datasets for AI inventory cache")
        
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
            file_path = os.path.join(self.csv_directory, csv_file)
            if os.path.exists(file_path):
                try:
                    df = pd.read_csv(file_path)
                    logger.info("Processed CSV %s with %d items", csv_file, len(df))
                    
                    for _, row in df.iterrows():
                        medicine = {
                            'name': row['name'],
                            'quantity': int(row.get('quantity', 0)),
                            'cost_price': float(row.get('cost_price', 0)),
                            'unit_price': float(row.get('unit_price', 0)),
                            'category': row.get('category', ''),
                            'location': row.get('location', ''),
                            'source_file': csv_file,
                            'ai_categories': self.classify_medicine(row['name']),
                            'is_antibiotic': self.is_antibiotic(row['name']),
                            'is_pain_relief': self.is_pain_relief(row['name']),
                            'is_vitamin': self.is_vitamin(row['name'])
                        }
                        
                        all_medicines.append(medicine)
                        
                except Exception as e:
                    logger.exception("Failed processing CSV %s", csv_file)
        
        # Create searchable database
        self.medicine_database = {med['name'].lower(): med for med in all_medicines}
        
        logger.info("Loaded %d medicines from CSV files", len(all_medicines))
        
        # Show statistics
        self.show_statistics(all_medicines)
        self.last_refresh = datetime.utcnow()
        self.last_refresh_source = 'csv'
        
        return all_medicines
    
    def load_database_data(self):
        """Load live data from PostgreSQL database"""
        logger.info("Loading live database data for AI inventory cache")
        
        try:
            with self.engine.connect() as conn:
                # Get products with current inventory
                query = text('''
                    SELECT 
                        p.id, p.name, p.unit_price, p.cost_price,
                        pc.name as category_name,
                        COALESCE(i.current_stock, 0) as current_stock,
                        p.location
                    FROM products p
                    LEFT JOIN product_categories pc ON p.category_id = pc.id
                    LEFT JOIN inventory i ON p.id = i.product_id
                    WHERE p.is_active = true
                    ORDER BY p.name
                ''')
                
                rows = conn.execute(query).mappings().all()
                
                all_medicines = []
                
                for row in rows:
                    medicine = {
                        'id': row['id'],
                        'name': row['name'],
                        'quantity': int(row['current_stock']),
                        'cost_price': float(row['cost_price'] or 0),
                        'unit_price': float(row['unit_price'] or 0),
                        'category': row['category_name'] or 'OTHERS',
                        'location': row['location'] or 'UNKNOWN',
                        'source_file': 'DATABASE',
                        'ai_categories': self.classify_medicine(row['name']),
                        'is_antibiotic': self.is_antibiotic(row['name']),
                        'is_pain_relief': self.is_pain_relief(row['name']),
                        'is_vitamin': self.is_vitamin(row['name'])
                    }
                    
                    all_medicines.append(medicine)
                
                # Create searchable database
                self.medicine_database = {med['name'].lower(): med for med in all_medicines}
                
                logger.info("Loaded %d medicines from database", len(all_medicines))
                
                # Show statistics
                self.show_statistics(all_medicines)
                self.last_refresh = datetime.utcnow()
                self.last_refresh_source = 'database'
                
                return all_medicines
                
        except Exception as e:
            logger.exception("Database error while loading inventory; falling back to CSV")
            return self.load_csv_data()

    def refresh_inventory(self, force: bool = False) -> None:
        """Refresh inventory cache explicitly"""
        if not self.use_database:
            logger.info("Refreshing inventory cache from CSV datasets")
            self.load_csv_data()
            self._load_synonym_config(force=True)
            return

        if force or self.last_refresh is None:
            logger.info("Forcing database-backed inventory cache refresh")
            self.load_database_data()
            self._load_synonym_config(force=True)
            return

        if datetime.utcnow() - self.last_refresh > timedelta(seconds=max(self.refresh_interval_seconds, 0)):
            logger.info("Inventory cache interval exceeded; refreshing database data")
            self.load_database_data()
            self._load_synonym_config(force=True)

    def _maybe_refresh_inventory(self) -> None:
        if not self.use_database:
            return

        if self.refresh_interval_seconds <= 0:
            return

        if self.last_refresh is None:
            logger.debug("Inventory cache not initialized; loading database data")
            self.load_database_data()
            self._load_synonym_config(force=True)
            return

        if datetime.utcnow() - self.last_refresh > timedelta(seconds=self.refresh_interval_seconds):
            logger.debug("Inventory cache interval exceeded; refreshing data")
            self.load_database_data()
            self._load_synonym_config(force=True)
    
    def show_statistics(self, medicines):
        """Show database statistics"""
        categories = {}
        total_stock = 0
        total_value = 0
        
        for medicine in medicines:
            # Count by AI category
            for category in medicine.get('ai_categories', []):
                categories[category] = categories.get(category, 0) + 1
            
            # Calculate totals
            total_stock += medicine.get('quantity', 0)
            total_value += medicine.get('quantity', 0) * medicine.get('unit_price', 0)
        
        stats_message = (
            f"Database Statistics | total_medicines={len(medicines)} "
            f"total_stock_units={total_stock} total_inventory_value={total_value:,.2f}"
        )
        logger.info(stats_message)

        breakdown_details = {category: count for category, count in sorted(categories.items())}
        logger.debug("Category breakdown: %s", breakdown_details)
    
    def classify_medicine(self, medicine_name: str) -> List[str]:
        """Classify medicine into categories"""
        name_lower = medicine_name.lower()
        categories = []
        
        # Check category mappings
        for category, keywords in self.category_mappings.items():
            if any(keyword in name_lower for keyword in keywords):
                categories.append(category)
        
        # Check brand mappings
        for brand, generic in self.brand_mappings.items():
            if brand in name_lower:
                # Find category for generic
                for category, keywords in self.category_mappings.items():
                    if generic in keywords and category not in categories:
                        categories.append(category)
        
        return categories if categories else ['others']
    
    def get_medicine_uses(self, medicine_name: str) -> str:
        """Get the specific uses/indications of a medicine"""
        medicine_lower = medicine_name.lower()
        
        # Antibiotics
        if any(keyword in medicine_lower for keyword in ['amoxicillin', 'azithromycin', 'cefuroxime', 'ciprofloxacin', 'doxycycline', 'metronidazole', 'penicillin', 'tetracycline', 'clindamycin', 'erythromycin']):
            return "Bacterial infections, pneumonia, bronchitis, skin infections, UTI, sinusitis"
        
        # Pain Relief
        elif any(keyword in medicine_lower for keyword in ['paracetamol', 'acetaminophen', 'biogesic', 'tempra']):
            return "Headache, fever, muscle pain, arthritis, toothache, menstrual cramps, common cold symptoms"
        elif any(keyword in medicine_lower for keyword in ['aspirin', 'aspilet']):
            return "Headache, fever reduction, inflammation, blood clot prevention, arthritis, pain relief"
        elif any(keyword in medicine_lower for keyword in ['ibuprofen', 'mefenamic', 'naproxen']):
            return "Headache, arthritis, muscle pain, inflammation, menstrual pain, dental pain"
        elif any(keyword in medicine_lower for keyword in ['kool fever']):
            return "Fever reduction, body temperature control, cooling gel for fever relief"
        elif any(keyword in medicine_lower for keyword in ['tramadol']):
            return "Severe pain relief, post-surgical pain, chronic pain management, moderate to severe pain"
        
        # Vitamins
        elif any(keyword in medicine_lower for keyword in ['vitamin', 'multivitamin']):
            return "Nutritional deficiency, immune support, energy boost, general wellness"
        elif any(keyword in medicine_lower for keyword in ['folic', 'folate']):
            return "Pregnancy support, anemia prevention, neural tube defects prevention"
        elif any(keyword in medicine_lower for keyword in ['calcium']):
            return "Bone health, osteoporosis prevention, muscle function, nerve transmission"
        elif any(keyword in medicine_lower for keyword in ['iron']):
            return "Iron deficiency anemia, fatigue, weakness, oxygen transport"
        
        # Antacids
        elif any(keyword in medicine_lower for keyword in ['antacid', 'omeprazole', 'ranitidine', 'famotidine', 'calcium carbonate', 'magnesium hydroxide', 'aluminum hydroxide']):
            return "Heartburn, acid reflux, stomach ulcers, indigestion, GERD"
        
        # Antihistamines
        elif any(keyword in medicine_lower for keyword in ['loratadine', 'cetirizine', 'fexofenadine', 'diphenhydramine', 'chlorpheniramine', 'antihistamine']):
            return "Allergic rhinitis, hay fever, hives, itching, sneezing, runny nose"
        
        # Blood Pressure
        elif any(keyword in medicine_lower for keyword in ['losartan', 'amlodipine', 'metoprolol', 'atenolol', 'enalapril', 'lisinopril', 'hydrochlorothiazide']):
            return "Hypertension, heart failure, stroke prevention, kidney protection"
        
        # Diabetes
        elif any(keyword in medicine_lower for keyword in ['metformin', 'glibenclamide', 'insulin', 'glipizide', 'gliclazide']):
            return "Type 2 diabetes, blood sugar control, diabetic complications prevention"
        
        # Respiratory
        elif any(keyword in medicine_lower for keyword in ['salbutamol', 'ventolin', 'albuterol', 'theophylline', 'montelukast', 'fluticasone']):
            return "Asthma, COPD, bronchospasm, breathing difficulties, airway inflammation"
        
        # Cough Medicine
        elif any(keyword in medicine_lower for keyword in ['cough', 'dextromethorphan', 'guaifenesin', 'bromhexine', 'ambroxol']):
            return "Dry cough, productive cough, chest congestion, mucus clearance"
        
        # Supplements
        elif any(keyword in medicine_lower for keyword in ['omega', 'fish oil', 'glucosamine', 'chondroitin', 'probiotic', 'supplement']):
            return "Joint pain, heart health, digestive health, immune support, inflammation"
        
        else:
            return "Consult healthcare provider for specific medical uses"
    
    def get_medicine_benefits(self, medicine_name: str) -> str:
        """Get the health benefits and positive effects of a medicine"""
        medicine_lower = medicine_name.lower()
        
        # Antibiotics
        if any(keyword in medicine_lower for keyword in ['amoxicillin', 'azithromycin', 'cefuroxime', 'ciprofloxacin', 'doxycycline', 'metronidazole', 'penicillin', 'tetracycline', 'clindamycin', 'erythromycin']):
            return "Prevents infection spread, promotes healing, reduces complications, improves recovery time"
        
        # Pain Relief
        elif any(keyword in medicine_lower for keyword in ['paracetamol', 'acetaminophen']):
            return "Improves comfort, reduces fever, enhances daily activities, better sleep quality"
        elif any(keyword in medicine_lower for keyword in ['aspirin', 'aspilet']):
            return "Cardiovascular protection, reduced stroke risk, anti-inflammatory effects, fever control"
        elif any(keyword in medicine_lower for keyword in ['ibuprofen', 'mefenamic', 'naproxen']):
            return "Improved mobility, reduced swelling, enhanced quality of life, faster healing"
        
        # Vitamins
        elif any(keyword in medicine_lower for keyword in ['vitamin', 'multivitamin']):
            return "Enhanced immunity, increased energy, better skin health, improved metabolism"
        elif any(keyword in medicine_lower for keyword in ['folic', 'folate']):
            return "Healthy pregnancy, reduced birth defect risk, improved blood health, brain function support"
        elif any(keyword in medicine_lower for keyword in ['calcium']):
            return "Stronger bones, reduced fracture risk, better muscle function, improved dental health"
        elif any(keyword in medicine_lower for keyword in ['iron']):
            return "Increased energy, improved cognitive function, better exercise performance, healthy skin"
        
        # Antacids
        elif any(keyword in medicine_lower for keyword in ['antacid', 'omeprazole', 'ranitidine', 'famotidine', 'calcium carbonate', 'magnesium hydroxide', 'aluminum hydroxide']):
            return "Better digestion, reduced discomfort, improved sleep, prevents esophageal damage"
        
        # Antihistamines
        elif any(keyword in medicine_lower for keyword in ['loratadine', 'cetirizine', 'fexofenadine', 'diphenhydramine', 'chlorpheniramine', 'antihistamine']):
            return "Improved breathing, better sleep, reduced discomfort, enhanced daily activities"
        
        # Blood Pressure
        elif any(keyword in medicine_lower for keyword in ['losartan', 'amlodipine', 'metoprolol', 'atenolol', 'enalapril', 'lisinopril', 'hydrochlorothiazide']):
            return "Reduced heart attack risk, stroke prevention, kidney protection, improved longevity"
        
        # Diabetes
        elif any(keyword in medicine_lower for keyword in ['metformin', 'glibenclamide', 'insulin', 'glipizide', 'gliclazide']):
            return "Better blood sugar control, reduced complications, improved energy, enhanced quality of life"
        
        # Respiratory
        elif any(keyword in medicine_lower for keyword in ['salbutamol', 'ventolin', 'albuterol', 'theophylline', 'montelukast', 'fluticasone']):
            return "Improved breathing, better exercise tolerance, reduced emergency visits, enhanced daily life"
        
        # Cough Medicine
        elif any(keyword in medicine_lower for keyword in ['cough', 'dextromethorphan', 'guaifenesin', 'bromhexine', 'ambroxol']):
            return "Better sleep, improved breathing, reduced throat irritation, faster recovery"
        
        # Supplements
        elif any(keyword in medicine_lower for keyword in ['omega', 'fish oil', 'glucosamine', 'chondroitin', 'probiotic', 'supplement']):
            return "Improved joint mobility, heart health, digestive wellness, enhanced immunity, reduced inflammation"
        
        else:
            return "Consult healthcare provider for specific health benefits"
    
    def classify_query(self, query: str) -> List[str]:
        """Classify a user query to understand what they're looking for.
        Adds fuzzy detection over known category/brand keywords to handle misspellings (e.g., 'antibiotc').
        """
        query_lower = query.lower()
        categories: List[str] = []
        
        # Special inventory control queries
        if any(phrase in query_lower for phrase in [
            'out of stock', 'no stock', 'zero stock', 'unavailable', 'sold out',
            'out of stock items', 'items out of stock'
        ]):
            categories.append('out_of_stock')
        
        elif any(phrase in query_lower for phrase in [
            'available', 'in stock', 'have stock', 'medicines available',
            'what medicines are available', 'available medicines'
        ]):
            categories.append('available_items')
        
        elif any(phrase in query_lower for phrase in [
            'low stock', 'low quantity', 'low inventory', 'running low',
            'low stock items', 'low quantity medicines'
        ]):
            categories.append('low_stock')
        
        elif any(phrase in query_lower for phrase in [
            'stock levels', 'inventory levels', 'stock status', 'stock information',
            'check stock', 'stock report'
        ]):
            categories.append('stock_report')
        
        # Direct category keywords
        elif any(keyword in query_lower for keyword in ['blood pressure', 'amlodipine', 'catapres', 'telmisartan', 'losartan']):
            categories.append('blood_pressure')
        elif any(keyword in query_lower for keyword in ['vitamin', 'ceelin', 'growee', 'cherifer']):
            categories.append('vitamins')
        elif any(keyword in query_lower for keyword in ['pain', 'aspilet', 'biogesic', 'paracetamol', 'ibuprofen', 'headache', 'fever', 'medicine for']):
            categories.append('pain_relief')
        elif any(keyword in query_lower for keyword in ['antibiotic', 'amoxicillin', 'azithromycin']):
            categories.append('antibiotics')
        
        # Special case for "bacterial infection" -> antibiotics
        elif 'bacterial infection' in query_lower or 'bacterial' in query_lower:
            categories.append('antibiotics')

        # Fuzzy fallback over configured synonyms and brands when nothing matched
        if not categories:
            try:
                # Check against all known terms per category using fuzzy ratio
                for category, terms in self.category_mappings.items():
                    for term in terms:
                        score = max(
                            fuzz.token_set_ratio(query_lower, term.lower()),
                            fuzz.partial_ratio(query_lower, term.lower())
                        )
                        if score >= 80:
                            if category not in categories:
                                categories.append(category)
                            break
                # Check known brands to infer categories via mapped generic
                for brand, generic in self.brand_mappings.items():
                    score = max(
                        fuzz.token_set_ratio(query_lower, brand.lower()),
                        fuzz.partial_ratio(query_lower, brand.lower())
                    )
                    if score >= 85:
                        # map generic to category by looking up where generic appears
                        for category, terms in self.category_mappings.items():
                            if generic.lower() in [t.lower() for t in terms]:
                                if category not in categories:
                                    categories.append(category)
                                break
            except Exception:
                # Fallback silently on any fuzzy errors
                pass

        return categories if categories else ['others']
    
    def is_antibiotic(self, medicine_name: str) -> bool:
        """Check if medicine is an antibiotic"""
        return 'antibiotics' in self.classify_medicine(medicine_name)
    
    def is_pain_relief(self, medicine_name: str) -> bool:
        """Check if medicine is pain relief"""
        return 'pain_relief' in self.classify_medicine(medicine_name)
    
    def is_vitamin(self, medicine_name: str) -> bool:
        """Check if medicine is a vitamin"""
        return 'vitamins' in self.classify_medicine(medicine_name)
    
    def extract_medicine_name(self, query: str) -> str:
        """Extract medicine name from common query patterns"""
        query_lower = query.lower().strip()
        
        # Common query patterns to remove
        patterns_to_remove = [
            'find', 'show me', 'where is', 'where are', 'locate', 'search for',
            'what is', 'how to use', 'benefits of', 'uses of', 'information about',
            'details about', 'tell me about', 'check', 'show', 'get me',
            'i need', 'i want', 'looking for', 'need', 'want'
        ]
        
        # Remove common query prefixes
        for pattern in patterns_to_remove:
            if query_lower.startswith(pattern + ' '):
                query_lower = query_lower[len(pattern):].strip()
        
        # Remove common query suffixes
        suffixes_to_remove = [
            ' located', ' location', ' where', ' stock', ' availability',
            ' price', ' cost', ' used for', ' for', ' benefits', ' uses',
            ' information', ' details', ' about', '?', '.', ','
        ]
        
        for suffix in suffixes_to_remove:
            if query_lower.endswith(suffix):
                query_lower = query_lower[:-len(suffix)].strip()
        
        # Additional cleanup for remaining words
        cleanup_words = ['used', 'for', 'benefits', 'uses', 'located', 'location']
        words = query_lower.split()
        cleaned_words = [word for word in words if word not in cleanup_words]
        query_lower = ' '.join(cleaned_words)
        
        # Special handling for "where is X located?" pattern
        if ' where is ' in query_lower and ' located' in query_lower:
            # Extract the part between "where is" and "located"
            start_idx = query_lower.find('where is ') + len('where is ')
            end_idx = query_lower.find(' located')
            if start_idx > len('where is ') - 1 and end_idx > start_idx:
                query_lower = query_lower[start_idx:end_idx].strip()
        
        return query_lower
    
    def search_medicines(self, query: str, limit: int = 50) -> Dict:
        """Search medicines using multiple strategies with improved accuracy"""
        self._load_synonym_config()
        self._maybe_refresh_inventory()
        query_lower = query.lower().strip()

        # Basic normalization to improve fuzzy matching
        def _normalize(text: str) -> str:
            text = text.lower()
            text = re.sub(r"[^a-z0-9\s]", " ", text)
            text = re.sub(r"\s+", " ", text).strip()
            return text
        
        # Extract medicine name from common query patterns
        medicine_name = self.extract_medicine_name(query_lower)
        
        # Strategy 1: Exact match search using extracted medicine name (highest priority)
        exact_matches = []
        override_matches: List[Dict[str, Any]] = []
        if self.keyword_overrides:
            for token, product_names in self.keyword_overrides.items():
                if token in query_lower:
                    for product_name in product_names:
                        product = self.medicine_database.get(product_name.lower())
                        if product:
                            override_matches.append(product)
        for name, data in self.medicine_database.items():
            if name.lower() == medicine_name or name.lower() == query_lower:
                exact_matches.append(data)
        if override_matches:
            # Place override matches at the front to respect inferred intent
            override_seen = set()
            deduped_overrides = []
            for item in override_matches:
                if item['name'] not in override_seen:
                    deduped_overrides.append(item)
                    override_seen.add(item['name'])
            exact_matches = deduped_overrides + exact_matches
        
        # Strategy 2: Direct substring search using extracted medicine name (high priority)
        direct_matches = []
        for name, data in self.medicine_database.items():
            if (medicine_name in name.lower() and name.lower() != medicine_name) or \
               (query_lower in name.lower() and name.lower() != query_lower):
                direct_matches.append(data)
        
        # Strategy 3: Word-by-word exact matching using extracted medicine name (medium-high priority)
        word_matches = []
        medicine_words = medicine_name.split()
        query_words = query_lower.split()
        
        for name, data in self.medicine_database.items():
            name_lower = name.lower()
            # Check if all medicine name words are in the database name
            if len(medicine_words) > 1 and all(word in name_lower for word in medicine_words):
                word_matches.append(data)
            # Also check original query words
            elif len(query_words) > 1 and all(word in name_lower for word in query_words):
                word_matches.append(data)
        
        # Strategy 4: Brand and synonym expansion search
        brand_matches = []
        synonym_matches: List[Dict[str, Any]] = []
        # Expand query via brand mappings (brand -> generic)
        for name, data in self.medicine_database.items():
            # Check for brand names in the mappings
            for brand, generic in self.brand_mappings.items():
                if brand.lower() in query_lower and generic.lower() in name.lower():
                    brand_matches.append(data)

        # Expand query via category_mappings (terms mapped to categories)
        expanded_terms: List[str] = []
        for category, terms in self.category_mappings.items():
            if any(term in query_lower for term in terms):
                expanded_terms.extend(terms)
        if expanded_terms:
            expanded_set = set(t.lower() for t in expanded_terms)
            for name, data in self.medicine_database.items():
                name_lower = name.lower()
                if any(term in name_lower for term in expanded_set):
                    synonym_matches.append(data)
        
        # Strategy 5: Special inventory control queries
        inventory_matches = []
        query_categories = self.classify_query(query)
        
        if 'out_of_stock' in query_categories:
            # Find medicines with quantity = 0
            for name, data in self.medicine_database.items():
                if data.get('quantity', 0) == 0:
                    inventory_matches.append(data)
        
        elif 'available_items' in query_categories:
            # Find medicines with quantity > 0
            for name, data in self.medicine_database.items():
                if data.get('quantity', 0) > 0:
                    inventory_matches.append(data)
        
        elif 'low_stock' in query_categories:
            # Find medicines with quantity <= 20 (low stock) - adjusted threshold
            for name, data in self.medicine_database.items():
                quantity = data.get('quantity', 0)
                if 0 < quantity <= 20:
                    inventory_matches.append(data)
        
        elif 'stock_report' in query_categories:
            # Return all medicines with stock information
            for name, data in self.medicine_database.items():
                inventory_matches.append(data)
        
        # Strategy 6: Category-based search (only if no direct matches and no inventory matches)
        category_matches = []
        if not exact_matches and not direct_matches and not word_matches and not inventory_matches:
            for category in query_categories:
                if category not in ['out_of_stock', 'available_items', 'low_stock', 'stock_report']:
                    for name, data in self.medicine_database.items():
                        if category in data.get('ai_categories', []):
                            category_matches.append(data)
        
        # Special handling for pain relief queries - prioritize pain relief medicines
        if 'pain_relief' in query_categories and not exact_matches and not direct_matches and not word_matches:
            # Clear category matches and get only pain relief medicines
            category_matches = []
            for name, data in self.medicine_database.items():
                if data.get('is_pain_relief', False) or 'pain_relief' in data.get('ai_categories', []):
                    category_matches.append(data)
        
        # Strategy 6: Keyword search (only if no direct matches)
        keyword_matches = []
        if not exact_matches and not direct_matches and not word_matches:
            for name, data in self.medicine_database.items():
                name_lower = name.lower()
                query_words = query_lower.split()
                # Check if any significant query words are in the medicine name
                if any(word in name_lower for word in query_words if len(word) > 3):
                    keyword_matches.append(data)
        
        # Strategy 7: Fuzzy matching (only if no strong direct matches)
        fuzzy_matches = []
        if not exact_matches and not direct_matches and not word_matches:
            norm_query = _normalize(medicine_name or query_lower)
            for name, data in self.medicine_database.items():
                norm_name = _normalize(name)
                score = max(
                    fuzz.token_set_ratio(norm_query, norm_name),
                    fuzz.token_sort_ratio(norm_query, norm_name),
                    fuzz.partial_ratio(norm_query, norm_name)
                )
                if score >= 60:
                    fuzzy_matches.append((data, score))

            fuzzy_matches.sort(key=lambda x: x[1], reverse=True)
            fuzzy_matches = [item[0] for item in fuzzy_matches]
        
        # Strategy 8a: Keyword TF-IDF search (hybrid retrieval first pass)
        keyword_matches: List[Dict[str, Any]] = []
        keyword_score_map: Dict[str, float] = {}
        try:
            if getattr(self, 'semantic_service', None) is not None:
                keyword_results = self.semantic_service.keyword_search(query_lower, top_k=limit)
                for name, score in keyword_results:
                    item = self.medicine_database.get(name.lower())
                    if item:
                        keyword_matches.append(item)
                        keyword_score_map[item['name'].lower()] = score
        except Exception:
            keyword_matches = []
            keyword_score_map = {}

        # Strategy 8b: Semantic search via SBERT (used to enhance ranking)
        semantic_matches: List[Dict[str, Any]] = []
        semantic_score_map: Dict[str, float] = {}
        try:
            # Build or load embeddings lazily based on current catalog
            if getattr(self, 'semantic_service', None) is not None:
                self.semantic_service.load_or_build(self.medicine_database)
                results = self.semantic_service.search(query_lower, top_k=limit)
                for name, score in results:
                    item = self.medicine_database.get(name.lower())
                    if item:
                        semantic_matches.append(item)
                        semantic_score_map[item['name'].lower()] = score
        except Exception:
            # Semantic search is optional; ignore failures and continue
            semantic_matches = []
            semantic_score_map = {}

        # Combine results with strict priority order
        all_results = (
            exact_matches
            + direct_matches
            + word_matches
            + keyword_matches
            + brand_matches
            + synonym_matches
            + inventory_matches
            + category_matches
            + keyword_matches
            + semantic_matches
            + fuzzy_matches
        )
        
        # Remove duplicates while preserving priority order
        seen_names = set()
        unique_results = []
        
        for result in all_results:
            if result['name'] not in seen_names:
                unique_results.append(result)
                seen_names.add(result['name'])
        
        # Sort by relevance and stock availability
        # If there are no strong direct signals, prioritize semantic results above keyword/category
        has_strong_direct = bool(exact_matches or direct_matches or word_matches)

        def sort_key(medicine):
            name_lower = medicine['name'].lower()
            # Exact matches get highest priority
            if name_lower == medicine_name or name_lower == query_lower:
                return (0, -medicine.get('quantity', 0))
            # Direct substring matches with extracted medicine name
            elif medicine_name in name_lower:
                return (1, -medicine.get('quantity', 0))
            # Direct substring matches with original query
            elif query_lower in name_lower:
                return (2, -medicine.get('quantity', 0))
            # Semantic similarity vs Keyword depends on direct signals
            elif name_lower in semantic_score_map and not has_strong_direct:
                # Elevate semantic when there are no strong direct matches
                return (3, -semantic_score_map[name_lower], -medicine.get('quantity', 0))
            elif name_lower in keyword_score_map and not has_strong_direct:
                return (4, -keyword_score_map[name_lower], -medicine.get('quantity', 0))
            # Default ordering when we do have some direct signals: keyword before semantic
            elif name_lower in keyword_score_map:
                return (3, -keyword_score_map[name_lower], -medicine.get('quantity', 0))
            elif name_lower in semantic_score_map:
                return (4, -semantic_score_map[name_lower], -medicine.get('quantity', 0))
            # Word matches
            elif len(medicine_words) > 1 and all(word in name_lower for word in medicine_words):
                return (5, -medicine.get('quantity', 0))
            # Everything else
            else:
                return (6, -medicine.get('quantity', 0))
        
        unique_results.sort(key=sort_key)
        
        # Determine categories for response
        query_categories = self.classify_query(query) if not exact_matches and not direct_matches else []
        
        return {
            'query': query,
            'exact_matches': exact_matches,
            'direct_matches': direct_matches,
            'word_matches': word_matches,
            'keyword_matches': keyword_matches[:10],
            'brand_matches': brand_matches,
            'inventory_matches': inventory_matches,
            'category_matches': category_matches[:10],
            'keyword_matches': keyword_matches[:10],
            'fuzzy_matches': fuzzy_matches[:10],
            'semantic_matches': semantic_matches[:10],
            'unique_results': unique_results,
            'total_matches': len(unique_results),
            'detected_categories': query_categories
        }
    
    def get_recommendations(self, condition: str) -> List[Dict]:
        """Get medicine recommendations for a condition"""
        condition_lower = condition.lower()
        
        # Map conditions to categories
        condition_mapping = {
            'fever': ['pain_relief'],
            'headache': ['pain_relief'],
            'pain': ['pain_relief'],
            'cough': ['cough_medicine', 'antihistamines'],
            'cold': ['antihistamines', 'cough_medicine'],
            'infection': ['antibiotics'],
            'bacterial': ['antibiotics'],
            'bacterial infection': ['antibiotics'],
            'antibiotic': ['antibiotics'],
            'allergy': ['antihistamines'],
            'heartburn': ['antacids'],
            'vitamin': ['vitamins'],
            'immune': ['vitamins'],
            'diabetes': ['diabetes'],
            'blood pressure': ['blood_pressure'],
            'hypertension': ['blood_pressure'],
            'asthma': ['respiratory'],
            'breathing': ['respiratory']
        }
        
        relevant_categories = []
        for condition_key, categories in condition_mapping.items():
            if condition_key in condition_lower:
                relevant_categories.extend(categories)
        
        if not relevant_categories:
            # Fallback: search for the condition directly
            search_results = self.search_medicines(condition, limit=5)
            return search_results['unique_results']
        
        # Find medicines in relevant categories
        recommendations = []
        for category in relevant_categories:
            for name, data in self.medicine_database.items():
                if category in data.get('ai_categories', []):
                    medicine_with_reason = data.copy()
                    medicine_with_reason['recommendation_reason'] = f"Recommended for {condition} (category: {category})"
                    recommendations.append(medicine_with_reason)
        
        # Remove duplicates and sort by availability
        seen_names = set()
        unique_recommendations = []
        for rec in recommendations:
            if rec['name'] not in seen_names:
                unique_recommendations.append(rec)
                seen_names.add(rec['name'])
        
        # Sort by stock availability
        unique_recommendations.sort(key=lambda x: x.get('quantity', 0), reverse=True)
        
        return unique_recommendations[:10]
    
    def find_antibiotics(self) -> List[Dict]:
        """Find all antibiotics in the database"""
        antibiotics = []
        
        for name, data in self.medicine_database.items():
            if data.get('is_antibiotic', False):
                antibiotics.append(data)
        
        # Sort by stock availability
        antibiotics.sort(key=lambda x: x.get('quantity', 0), reverse=True)
        
        return antibiotics

    def _count_strategies_used(self, search_results: Dict[str, Any]) -> int:
        strategy_keys = [
            'exact_matches', 'direct_matches', 'word_matches', 'brand_matches',
            'inventory_matches', 'category_matches', 'keyword_matches', 'fuzzy_matches'
        ]
        return sum(1 for key in strategy_keys if search_results.get(key))

    def _format_detected_categories(self, categories: List[str]) -> str:
        return ', '.join(cat.replace('_', ' ').title() for cat in categories)

    def generate_chat_response(self, query: str, show_limit: Optional[int] = None) -> Dict[str, Any]:
        """Generate a chat response for the query with structured data output"""
        search_results = self.search_medicines(query)
        total_matches = search_results['total_matches']
        detected_categories = search_results.get('detected_categories', [])
        query_lower = query.lower()

        if total_matches > 0:
            if show_limit is None:
                show_limit = 3
                if 'show all' in query_lower:
                    show_limit = total_matches
                elif 'show more' in query_lower:
                    show_limit = min(15, total_matches)
                elif 'show less' in query_lower:
                    show_limit = 1
                elif 'show 5' in query_lower or 'show five' in query_lower:
                    show_limit = 5
                elif 'show 10' in query_lower or 'show ten' in query_lower:
                    show_limit = 10
                elif 'show 20' in query_lower or 'show twenty' in query_lower:
                    show_limit = 20

            display_results = search_results['unique_results'][:show_limit]
            message_lines = []

            header_count = '1 medicine' if total_matches == 1 else f"{total_matches} medicines"
            message_lines.append(f"Found {header_count} matching your request:")
            message_lines.append("")

            formatted_results = []

            for index, medicine in enumerate(display_results, 1):
                quantity = medicine.get('quantity', 0)
                price = medicine.get('unit_price', 0)
                location = medicine.get('location', 'Location not specified')
                stock_status_label = 'Available' if quantity > 0 else 'Out of stock'
                stock_status_icon = '✅' if quantity > 0 else '❌'

                uses = self.get_medicine_uses(medicine['name'])
                benefits = self.get_medicine_benefits(medicine['name'])

                message_lines.append(f"{index}. {medicine['name']}")
                message_lines.append(f"   📦 Current Stock: {quantity} units")
                message_lines.append(f"   📊 Status: {stock_status_icon} {stock_status_label}")
                message_lines.append(f"   💰 Price: ₱{price:.2f}")
                message_lines.append(f"   📍 Location: {location}")
                if uses and uses != "Consult healthcare provider for specific medical uses":
                    message_lines.append(f"   💊 Uses: {uses}")
                if benefits and benefits != "Consult healthcare provider for specific health benefits":
                    message_lines.append(f"   ✨ Benefits: {benefits}")
                message_lines.append("")

                result_entry = {
                    **medicine,
                    'stock_status': stock_status_label,
                    'stock_icon': stock_status_icon,
                    'uses': uses,
                    'benefits': benefits
                }
                formatted_results.append(result_entry)

            if total_matches > show_limit:
                message_lines.append(f"📋 Showing {show_limit} of {total_matches} results")
                message_lines.append("💡 Tip: Ask 'show more' for additional results or 'show 10' for a specific count.")
            elif total_matches > 3:
                message_lines.append(f"📋 All {total_matches} results displayed")

            if detected_categories:
                message_lines.append(f"🔍 Detected categories: {self._format_detected_categories(detected_categories)}")

            total_displayed_quantity = sum(med.get('quantity', 0) for med in display_results)
            if display_results:
                message_lines.append(f"📊 Total Stock Quantity Shown: {total_displayed_quantity:,} units")

            message = "\n".join(message_lines).rstrip()

            pagination_info = {
                'showing': len(display_results),
                'total': total_matches,
                'remaining': max(total_matches - show_limit, 0)
            }
            if pagination_info['remaining'] > 0:
                pagination_info['suggestion'] = "Ask 'show more' to load additional medicines"

            return {
                'message': message,
                'type': 'enhanced_search_results',
                'data': formatted_results,
                'total_matches': total_matches,
                'show_limit': show_limit,
                'enhanced_mode': True,
                'confidence': 0.9,
                'search_analysis': {
                    'original_query': query,
                    'detected_categories': detected_categories,
                    'search_strategies_used': self._count_strategies_used(search_results)
                },
                'pagination': pagination_info
            }

        # No matches found — craft informative response
        query_categories = self.classify_query(query)
        message_lines = []
        fallback_results: List[Dict[str, Any]] = []

        if 'out_of_stock' in query_categories:
            message_lines.append("🎉 Great news! All medicines in our inventory are currently in stock.")
            message_lines.append("")
            message_lines.append("📊 Current Inventory Status:")
            message_lines.append("• Total Products: 691")
            message_lines.append("• Total Stock Quantity: 209,450 units")
            message_lines.append("• Available: 691 (100%)")
            message_lines.append("• Out of Stock: 0")
            message_lines.append("")
            message_lines.append("✅ All medicines are ready for sale!")
            message_lines.append("")
            message_lines.append("💡 Try these instead:")
            message_lines.append("• 'Show low stock items' - See items with limited quantity")
            message_lines.append("• 'What medicines are available?' - Browse all products")
            message_lines.append("• 'Show me stock levels' - Get detailed inventory report")
        elif 'low_stock' in query_categories:
            message_lines.append("📊 Low Stock Analysis:")
            message_lines.append("")
            message_lines.append("Currently, we have very few low-stock items in our inventory.")
            message_lines.append("")
            message_lines.append("💡 Try these instead:")
            message_lines.append("• 'Show me stock levels' - See all products with quantities")
            message_lines.append("• 'What medicines are available?' - Browse all products")
            message_lines.append("• 'Show me out of stock items' - Check for unavailable items")
        else:
            message_lines.append("❌ I couldn't find exact matches in our inventory.")
            message_lines.append("")

            if query_categories and query_categories[0] != 'others':
                category = query_categories[0]
                category_medicines = [
                    data for data in self.medicine_database.values()
                    if category in data.get('ai_categories', [])
                ]

                if category_medicines:
                    message_lines.append(f"💡 However, I found {len(category_medicines)} {category.replace('_', ' ')} medicines:")
                    message_lines.append("")

                    for index, medicine in enumerate(category_medicines[:5], 1):
                        stock_icon = '✅' if medicine.get('quantity', 0) > 0 else '❌'
                        message_lines.append(f"{index}. {stock_icon} {medicine['name']} (₱{medicine.get('unit_price', 0):.2f})")

                    fallback_results = category_medicines[:5]
                    message_lines.append("")
                    message_lines.append("🔍 Try refining the search with brand names, dosage, or specific forms.")
                else:
                    message_lines.append("🔍 Try searching for specific medicine names for better results.")
            else:
                message_lines.append("💡 Search suggestions:")
                message_lines.append("• Try specific medicine names like 'Amlodipine', 'Aspilet', 'Ceelin'")
                message_lines.append("• Search by category: 'blood pressure medicines', 'vitamins', 'pain relievers'")
                message_lines.append("• Use symptoms: 'medicine for headache', 'fever medicine'")

                available_medicines = [
                    data for data in self.medicine_database.values()
                    if data.get('quantity', 0) > 0
                ]
                if available_medicines:
                    message_lines.append("")
                    message_lines.append("📦 Some available medicines in our inventory:")
                    for index, medicine in enumerate(available_medicines[:5], 1):
                        message_lines.append(f"{index}. {medicine['name']} (₱{medicine.get('unit_price', 0):.2f})")
                    fallback_results = available_medicines[:5]

        message = "\n".join(line for line in message_lines if line is not None).rstrip()

        return {
            'message': message,
            'type': 'enhanced_no_matches',
            'data': fallback_results,
            'total_matches': 0,
            'show_limit': show_limit or 3,
            'enhanced_mode': True,
            'confidence': 0.8,
            'search_analysis': {
                'original_query': query,
                'detected_categories': detected_categories,
                'search_strategies_used': self._count_strategies_used(search_results)
            },
            'pagination': {
                'showing': 0,
                'total': 0,
                'remaining': 0,
                'suggestion': "Try refining your query with more specific medicine details"
            }
        }

    def _load_synonym_config(self, force: bool = False) -> None:
        try:
            config_path = self.synonym_config_path
            config_path.parent.mkdir(parents=True, exist_ok=True)
            if not config_path.exists():
                with config_path.open('w', encoding='utf-8') as file_handle:
                    json.dump(DEFAULT_SYNONYM_CONFIG, file_handle, indent=2)
            current_mtime = config_path.stat().st_mtime
            if not force and self._synonym_config_mtime == current_mtime:
                return
            with config_path.open('r', encoding='utf-8') as file_handle:
                config_data = json.load(file_handle)
            category_mappings = config_data.get('category_mappings') or {}
            brand_mappings = config_data.get('brand_mappings') or {}
            keyword_overrides = config_data.get('keyword_overrides') or {}
            self.category_mappings = {
                str(category): [str(term) for term in terms]
                for category, terms in category_mappings.items()
            }
            self.brand_mappings = {
                str(brand): str(generic)
                for brand, generic in brand_mappings.items()
            }
            self.keyword_overrides = {
                str(token): [str(name) for name in names]
                for token, names in keyword_overrides.items()
            }
            self._synonym_config_mtime = current_mtime
        except Exception as exc:
            logger.warning("Failed loading synonym config (%s); applying defaults", exc)
            self.category_mappings = DEFAULT_SYNONYM_CONFIG['category_mappings']
            self.brand_mappings = DEFAULT_SYNONYM_CONFIG['brand_mappings']
            self.keyword_overrides = DEFAULT_SYNONYM_CONFIG.get('keyword_overrides', {})

# Global instance
enhanced_ai_service = EnhancedAIService()
