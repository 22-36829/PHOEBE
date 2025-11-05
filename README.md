# Phoebe Pharmacy Management System

A comprehensive pharmacy management system with AI-powered assistant, inventory management, POS system, and forecasting capabilities.

## 🚀 Features

### AI Pharmacy Assistant
- **Smart Medicine Search**: Find medicines by name, symptoms, or categories
- **Real-time Inventory**: Check stock levels and availability
- **Product Locator**: Find where products are located in the pharmacy
- **Medicine Information**: Get detailed uses, benefits, and medical information
- **Enhanced AI**: Advanced search with 690+ medicines in database

### Inventory Management
- Real-time stock tracking
- Low stock alerts
- Product categorization
- Location management
- Stock history and analytics

### Point of Sale (POS)
- Quick transaction processing
- Barcode scanning support
- Receipt generation
- Sales analytics

### Forecasting System
- Demand prediction
- Sales forecasting
- Inventory optimization
- Trend analysis

## 🛠️ Tech Stack

### Frontend
- React.js
- Tailwind CSS
- Lucide React (Icons)
- Chart.js (Analytics)

### Backend
- Python Flask
- SQLAlchemy (ORM)
- PostgreSQL (Database)
- AI/ML Services

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- Python (v3.8 or higher)
- PostgreSQL

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp env_example.txt .env
# Configure your database settings in .env
python app.py
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

## 🗄️ Database

The system uses PostgreSQL with the following main tables:
- `products`: Medicine/product information
- `inventory`: Stock levels and locations
- `sales`: Transaction records
- `users`: User accounts and permissions

## 🤖 AI Services

### Enhanced AI Service
- Live database integration
- Advanced search algorithms
- Category-based classification
- Real-time inventory queries
- Automated metrics tracking with nightly flush
- Scheduled retraining script (`scripts/retrain_enhanced_ai.py`) keeps synonyms and embeddings fresh

### Automation & Monitoring
- Supabase cron job invokes `/api/ai/enhanced/flush-metrics` (protected by `AI_METRICS_SERVICE_TOKEN`) to persist aggregated counters and prune historical rows automatically.
- Weekly retraining calls `scripts/retrain_enhanced_ai.py` to refresh keyword overrides, rebuild embeddings, run regression tests, and hit `/api/ai/enhanced/refresh-cache` for zero-downtime updates.
- Only aggregated counts and sanitized tokens are stored—no raw chat transcripts.

### Conversational AI
- Natural language processing
- Intent classification
- Context-aware responses
- Learning capabilities

## 📱 User Interfaces

### Manager Dashboard
- AI Assistant with tutorial sidebar
- Inventory management
- Forecasting analytics
- Staff management

### Admin Dashboard
- System overview
- User management
- Database administration
- System settings

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the backend directory:
```
DATABASE_URL=postgresql://user:password@localhost/phoebe_db
SECRET_KEY=your_secret_key
FLASK_ENV=development
```

## 📊 Data Sources

The system includes sample data in CSV format:
- Medicine categories (Tablets, Syrups, Supplements, etc.)
- Inventory data with stock levels
- Sales history for forecasting

## 🚀 Deployment

### Production Setup
1. Configure production database
2. Set up environment variables
3. Build frontend: `npm run build`
4. Deploy backend with WSGI server
5. Configure reverse proxy (nginx)

## 📝 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

For development and contribution guidelines, please contact the development team.

---

**Phoebe Pharmacy Management System** - Streamlining pharmacy operations with AI-powered intelligence.
