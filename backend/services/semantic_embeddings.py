#!/usr/bin/env python3
"""
Semantic Embedding Service using Sentence-BERT
 - Lazily loads a small SBERT model (default: all-MiniLM-L6-v2)
 - Builds and caches embeddings for the current medicine catalog
 - Provides cosine similarity search for query -> top-K product names
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import normalize
import joblib

try:
    from sentence_transformers import SentenceTransformer
except Exception:  # pragma: no cover - allow import failure in environments without deps
    SentenceTransformer = None  # type: ignore


class SemanticEmbeddingService:
    def __init__(self, model_name: str | None = None) -> None:
        self.model_name = model_name or os.getenv('AI_EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')
        self.model: SentenceTransformer | None = None
        self._catalog_names: List[str] = []
        self._catalog_embeddings: np.ndarray | None = None
        self._catalog_texts: List[str] = []

        # Keyword (TF-IDF) retrieval components
        self.keyword_vectorizer: TfidfVectorizer | None = None
        self.keyword_matrix = None  # sparse matrix

        # Persist cache alongside other AI models
        self.models_dir = Path(__file__).resolve().parent.parent / 'ai_models'
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self.vectors_path = self.models_dir / 'sbert_product_vectors.npy'
        self.names_path = self.models_dir / 'sbert_product_names.json'
        self.texts_path = self.models_dir / 'sbert_product_texts.json'
        self.tfidf_vectorizer_path = self.models_dir / 'tfidf_vectorizer.joblib'
        self.tfidf_matrix_path = self.models_dir / 'tfidf_matrix.joblib'

    def _ensure_model(self) -> None:
        if self.model is None and SentenceTransformer is not None:
            # Load once; small model is fast on CPU
            self.model = SentenceTransformer(self.model_name)

    def is_ready(self) -> bool:
        return self._catalog_embeddings is not None and len(self._catalog_names) > 0

    def load_or_build(self, medicine_database: Dict[str, Dict]) -> None:
        """Load cached embeddings and TF-IDF if compatible; otherwise build from medicine database."""
        # Attempt to load cached
        if self.vectors_path.exists() and self.names_path.exists() and self.texts_path.exists():
            try:
                cached_names = json.loads(self.names_path.read_text(encoding='utf-8'))
                cached_texts = json.loads(self.texts_path.read_text(encoding='utf-8'))
                vectors = np.load(self.vectors_path)
                if (
                    isinstance(cached_names, list)
                    and isinstance(cached_texts, list)
                    and vectors.shape[0] == len(cached_names) == len(cached_texts)
                    and vectors.ndim == 2
                ):
                    # Only accept cache if it matches current catalog size; cheap heuristic
                    if len(cached_names) == len(medicine_database):
                        self._catalog_names = cached_names
                        self._catalog_texts = cached_texts
                        self._catalog_embeddings = vectors
                        # Try load TF-IDF cache as best effort
                        try:
                            if self.tfidf_vectorizer_path.exists() and self.tfidf_matrix_path.exists():
                                self.keyword_vectorizer = joblib.load(self.tfidf_vectorizer_path)
                                self.keyword_matrix = joblib.load(self.tfidf_matrix_path)
                        except Exception:
                            self.keyword_vectorizer = None
                            self.keyword_matrix = None
                        return
            except Exception:
                pass  # fall through to rebuild

        # Build fresh
        self._build_from_database(medicine_database)

    def _build_from_database(self, medicine_database: Dict[str, Dict]) -> None:
        self._ensure_model()
        if self.model is None:
            # Cannot build without deps; leave service inactive
            return

        # Use canonical names and richer texts from entries
        names: List[str] = []
        texts: List[str] = []
        for name_key, data in medicine_database.items():
            product_name = data.get('name') or name_key
            names.append(product_name)
            texts.append(self._compose_text(data))

        # Encode in reasonably sized batches
        batch_size = int(os.getenv('AI_EMBEDDING_BATCH', '128'))
        vectors: List[np.ndarray] = []
        for idx in range(0, len(names), batch_size):
            batch = texts[idx: idx + batch_size]
            emb = self.model.encode(batch, convert_to_numpy=True, normalize_embeddings=True)
            vectors.append(emb)

        matrix = np.vstack(vectors) if vectors else np.zeros((0, 384), dtype=np.float32)
        self._catalog_names = names
        self._catalog_embeddings = matrix
        self._catalog_texts = texts

        # Persist cache
        try:
            np.save(self.vectors_path, matrix)
            self.names_path.write_text(json.dumps(names, ensure_ascii=False), encoding='utf-8')
            self.texts_path.write_text(json.dumps(texts, ensure_ascii=False), encoding='utf-8')
        except Exception:
            # Non-fatal if persisting fails
            pass

        # Build TF-IDF keyword index
        try:
            self.keyword_vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1, max_features=50000)
            tfidf = self.keyword_vectorizer.fit_transform(texts)
            # L2 normalize rows for cosine similarity via dot product
            self.keyword_matrix = normalize(tfidf, norm='l2', axis=1)
            # Persist
            joblib.dump(self.keyword_vectorizer, self.tfidf_vectorizer_path)
            joblib.dump(self.keyword_matrix, self.tfidf_matrix_path)
        except Exception:
            self.keyword_vectorizer = None
            self.keyword_matrix = None

    def search(self, query: str, top_k: int = 20) -> List[Tuple[str, float]]:
        """Return list of (product_name, score) pairs ranked by cosine similarity."""
        if not self.is_ready():
            return []
        self._ensure_model()
        if self.model is None:
            return []

        q_vec = self.model.encode([query], convert_to_numpy=True, normalize_embeddings=True)[0]
        # Cosine similarity with normalized vectors == dot product
        scores = np.dot(self._catalog_embeddings, q_vec)
        if scores.size == 0:
            return []
        idx = np.argsort(-scores)[: max(1, top_k)]
        return [(self._catalog_names[i], float(scores[i])) for i in idx]

    def keyword_search(self, query: str, top_k: int = 50) -> List[Tuple[str, float]]:
        """Return top-K by TF-IDF cosine similarity over richer product texts."""
        if self.keyword_vectorizer is None or self.keyword_matrix is None or not self._catalog_names:
            return []
        q_vec = self.keyword_vectorizer.transform([query])
        q_vec = normalize(q_vec, norm='l2', axis=1)
        scores = (self.keyword_matrix @ q_vec.T).toarray().ravel()
        if scores.size == 0:
            return []
        idx = np.argsort(-scores)[: max(1, top_k)]
        return [(self._catalog_names[i], float(scores[i])) for i in idx]

    @staticmethod
    def _compose_text(data: Dict) -> str:
        """Compose a richer text for embedding/keyword search from product fields."""
        parts: List[str] = []
        name = data.get('name') or ''
        parts.append(name)
        # Include categories, location, and any known descriptors
        categories = data.get('ai_categories') or []
        if categories:
            parts.append(' '.join(categories))
        if data.get('category'):
            parts.append(str(data.get('category')))
        if data.get('location'):
            parts.append(str(data.get('location')))
        # Basic hints from stock/price for context (not for ranking by numbers)
        if data.get('unit_price'):
            parts.append('price')
        if data.get('quantity', 0) > 0:
            parts.append('available in stock')
        # Join as a single text
        return ' | '.join(p for p in parts if p)


