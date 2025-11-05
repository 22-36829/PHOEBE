## Phoebe App — System Overview

This document explains the system in clear, research-friendly terms: what it does, how components interact, and how the core features are built. It describes only code-verified parts and avoids environment-specific details.

### Tech stack (used)
- Backend: Python 3, Flask, Flask-CORS, Flask-JWT-Extended, SQLAlchemy (engine), psycopg2 (POS)
- Frontend: JavaScript (React 18, React Router v6), TailwindCSS, Chart.js via react-chartjs-2
- Data/ML: pandas, numpy, scikit-learn, statsmodels
- Database: PostgreSQL (configured via `DATABASE_URL`)

Note: Advanced NLP/embedding libs (transformers, sentence-transformers, FAISS) are used. Active AI retrieval uses Sentence‑BERT (all‑MiniLM‑L6‑v2) with a hybrid SBERT + TF‑IDF + fuzzy matching pipeline; forecasting uses classical time‑series models.

---

### What the system does (at a glance)
- Helps pharmacy managers and admins run operations: inventory, POS sales, demand forecasting, and an AI assistant for product/medical queries.
- Provides role-based web dashboards (Admin and Manager) backed by a Python API and a PostgreSQL database.

---

### Architecture and flows

- API server (Flask)
  - Configures CORS and JWT.
  - Creates a SQLAlchemy engine from `DATABASE_URL`.
  - Registers feature blueprints for AI, Forecasting, and POS.

- POS endpoints (`backend/routes/pos.py`)
  - `GET /api/pos/products`: products with current stock.
  - `GET /api/pos/categories`: product categories.
  - `POST /api/pos/process-sale`: creates `sales` + `sale_items`, decrements `inventory` in a single transaction (psycopg2 cursor).
  - `POST /api/pos/check-stock`: stock availability for product list.
  - `GET /api/pos/transactions`: recent sales with items.

- Forecasting endpoints (`backend/routes/forecasting.py`)
  - `POST /api/forecasting/train`: trains SARIMA/ARIMA/Exponential model on historical data.
  - `GET /api/forecasting/predictions`: loads model and returns forecast.
  - `GET /api/forecasting/historical`: returns time series used for charts.
  - `GET /api/forecasting/models`, `GET /api/forecasting/accuracy`, `POST /api/forecasting/bulk-forecast`.

- AI endpoints (`backend/routes/ai.py`)
  - Classic pipeline: TF‑IDF + cosine similarity, fuzzy matching, and intent classification utilities over product/medical text.
  - Enhanced AI service exists; optional.

- Frontend SPA (React)
  - Auth context guards routes by role.
  - Admin: `/admin` with dashboard, accounts, subscriptions, announcements, chat.
  - Manager: `/manager` with dashboard, profile, staff, inventory, POS, sustainability, forecasting, AI assistant, announcements, support.
  - Uses an API client (axios) to call the backend.

---

### How data flows through the system (conceptual)
1) A user signs in on the frontend. The app stores a JWT (issued by the backend) and attaches it to API requests where needed.
2) The frontend calls REST endpoints. The backend validates the JWT (when required), runs SQL against PostgreSQL (via SQLAlchemy or psycopg2), and returns JSON.
3) For forecasting calls, the backend loads time series from sales history, trains/loads a classical model, and returns future demand predictions.
4) For AI queries, the backend uses TF‑IDF/cosine and fuzzy matching (plus intent utilities) to find relevant products/medical info and returns answers or suggestions.

---

### Machine learning (active paths)
- Forecasting
  - Methods: SARIMA/ARIMA (statsmodels SARIMAX), Exponential Smoothing.
  - Artifacts: models saved as `.pkl` under `backend/ai_models/`.
  - Metrics: MAE/MSE/RMSE computed via scikit-learn.

- AI assistant/search
  - Methods: TF‑IDF vectorization + cosine similarity; fuzzy matching for synonyms/variants; intent helpers.
  - Data sources: DB-backed product/medical text; optional CSV corpus supported by enhanced service.

Why this design
- Classical time-series models are data-efficient and easy to interpret for retail-like daily sales.
- TF‑IDF + cosine and fuzzy matching give fast, transparent retrieval for product/medical text where exact phrasing varies.

---

### Database (used tables)
- Core inventory and catalog
  - `products`, `product_categories`, `inventory`
- POS transactions
  - `sales`, `sale_items`
- Forecasting
  - `historical_sales_daily`

Other domain tables exist in `file_dump/schema.sql` (e.g., suppliers/purchase orders, returns, support). They are available but not required by the POS, Forecasting, and classic AI flows above.

---

### Frontend pages and routing (used)
- Public: `/`, `/login`, `/register`
- Admin (guarded): `/admin` → dashboard, subscriptions, accounts, announcements, chat
- Manager (guarded): `/manager` → dashboard, profile, staff, inventory, pos, sustainability, forecasting, ai, announcements, support

---

### Build principles (how it’s built)
- Separation of concerns: routes (I/O) call services (logic), which query the database.
- Explicit transactions for POS to keep sales and inventory changes consistent.
- Stateless API with JWT auth; frontend handles role-based navigation.
- Simple, explainable ML baselines first; models saved as files for quick reuse.

---

### Local development
- Backend
  - Install deps: `pip install -r backend/requirements.txt`
  - Set env: `DATABASE_URL`, `JWT_SECRET_KEY`, `APP_SECRET_KEY` (see `backend/env_example.txt`)
  - Run Flask app (port 5000)
- Frontend
  - From `frontend/`: `npm install` then `npm start` (port 3000, proxied to 5000)

---

### Example end-to-end scenarios
- Record a sale
  - Manager scans/adds items in POS → submits to `/api/pos/process-sale` → backend creates `sales` and `sale_items`, updates `inventory`, returns a receipt summary.
- Generate a forecast
  - Manager requests `/api/forecasting/train` followed by `/api/forecasting/predictions` → backend trains/loads a SARIMA-like model and returns daily predicted quantities.
- Ask the AI assistant
  - Manager queries `/api/ai/...` → backend vectorizes text (TF‑IDF), computes cosine similarity, applies fuzzy matching for variants, and returns relevant products/info.



### UI (Frontend overview)
- Built with React 18, React Router v6, TailwindCSS.
- Role-based layouts: `AdminLayout`, `ManagerLayout`, `StaffLayout` route to guarded pages.
- Key pages:
  - Admin: `SubscriptionsPage`, `AccountsPage`, `AnnouncementsPage`, `ChatPage`.
  - Manager: `ManagerDashboard`, `InventoryManagement`, `POSPage`, `Forecasting`, `AIAssistant`, `Sustainability`, `SupportTickets`, `StaffAccounts`.
  - Staff: `POSPage`, `OwnSales`, `AIRecommendations`, `InventoryRequests`, `WasteExpiry`.
- API access is centralized in `frontend/src/services/api.js` with token-aware `apiRequest` and feature-specific clients.

### Database
- Primary: PostgreSQL (via `DATABASE_URL`).
- Used tables in core flows:
  - Catalog/Inventory: `products`, `product_categories`, `inventory`.
  - POS: `sales`, `sale_items`.
  - Forecasting: `historical_sales_daily`.
  - Support: ticketing and messages (exposed via `/api/support/...`).
  - Subscriptions: subscriptions and plans (exposed via `/api/admin/subscriptions` and `/api/admin/subscription-plans`).

### Schema
- Full SQL snapshot: `file_dump/schema.sql`.
- Incremental changes: `backend/migrations/*.sql` (e.g., `20251101_add_ai_daily_metrics.sql`, `20251105_drop_trans_type.sql`).
- The schema supports:
  - Product catalog, categories, inventory with batch/expiry metadata.
  - POS transactions (`sales`, `sale_items`) with inventory adjustments.
  - Sustainability analytics (expiry-risk views/queries surfaced by manager/staff endpoints).
  - Support tickets/messages and admin-managed subscription plans and subscriptions.

### The models (ML artifacts)
- Location: `backend/ai_models/` with persisted `.pkl`, `.joblib`, `.npy` artifacts.
- Forecasting models: classical time-series (ARIMA/SARIMAX, Exponential Smoothing) saved per series/product.
- Retrieval/AI assets (active):
  - Sentence‑BERT embeddings: `sbert_product_vectors.npy`, `sbert_product_names.json`, `sbert_product_texts.json`
  - TF‑IDF assets: `tfidf_vectorizer.*`, `tfidf_matrix.joblib`

### Forecasting
- Endpoints: `/api/forecasting/train`, `/api/forecasting/predictions`, `/api/forecasting/historical`, `/api/forecasting/models`, `/api/forecasting/accuracy`.
- Frontend usage: Manager pages request historical series and predictions to render charts and KPIs.
- Implementation: `backend/routes/forecasting.py` orchestrates, `backend/forecasting_service.py` trains/loads models; metrics via scikit-learn.

### AI
- Endpoints: `backend/routes/ai.py` (active assistant and recommendations); `backend/services/semantic_embeddings.py` for SBERT.
- Techniques (active):
  - Sentence‑BERT semantic retrieval (all‑MiniLM‑L6‑v2) over product/medical text
  - Hybrid ranking: SBERT scores first, backfilled by TF‑IDF cosine; fuzzy matching and intent helpers
  - Intent classification supports product search, product location, and medical info queries
- Artifacts and caching: embeddings and TF‑IDF persisted under `backend/ai_models/` for fast subsequent queries
- Datasets: product text from database; optional CSVs under `datasets_clean/` for enrichment

### Sustainability and Analytics
- Purpose: reduce waste/expiry and guide purchasing via risk and value concentration analytics.
- Frontend: Manager `Sustainability` (expiry risk, utilization) and Staff `WasteExpiry`.
- Endpoints (token-protected), as seen in `ManagerAPI`/`StaffAPI`:
  - Manager: `/api/manager/sustainability/expiry-risk`, `/inventory-utilization`, `/waste-reduction`, `/dashboard`
  - Staff: `/api/staff/sustainability/expiry-risk`
- ABC‑VED analysis: `/api/manager/analytics/abc-ved` for inventory classification by value (ABC) and criticality (VED)
- Data shown: risk level, days to expiry, quantities, total value, value‑at‑risk, next expiration per item/batch; ABC‑VED class distributions

### Chat support (ticketing)
- Frontend:
  - Admin `ChatPage`: manage, assign, and respond to tickets with stats and filters.
  - Manager `SupportTickets`: create/view/close tickets and message in-thread.
- Endpoints (via `SupportAPI`):
  - `POST /api/support/tickets` (create), `GET /api/support/tickets` (list with filters),
  - `GET /api/support/tickets/:id` (details), `POST /api/support/tickets/:id/messages` (reply),
  - `PATCH /api/support/tickets/:id` (update status/priority/assignee), `DELETE /api/support/tickets/:id`,
  - `GET /api/support/tickets/stats` (overview KPIs).

### Subscription management
- Frontend: Admin `SubscriptionsPage` manages plans and subscriptions, shows MRR and storage usage.
- Endpoints (via `AdminAPI`):
  - Plans: `GET/POST/PATCH/DELETE /api/admin/subscription-plans`.
  - Subscriptions: `GET/POST/PATCH/DELETE /api/admin/subscriptions` with filters and pagination.
  - Pharmacies: `GET /api/admin/pharmacies` to bind subscriptions.
  - Storage/usage: `GET /api/admin/pharmacy/:id/storage` for storage limit and breakdown.
- Billing metadata: plan prices per billing cycle (monthly/quarterly/semi-annual/annual), price overrides per subscription, payment method refs (Xendit/GCash) stored per subscription.
