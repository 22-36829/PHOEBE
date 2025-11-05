# Objectives of the Study

To develop an Automated Sales and Inventory System with Forecasting and AI-Assisted Product Search for Phoebe Drugstore.

## 1. Automated Sales and Inventory System

1.1 Supabase PostgreSQL as primary database  
1.2 Backend with Python Flask REST API with JWT authentication  
1.3 Frontend with React using React Router and TailwindCSS  
1.4 Stock tracking with batch and expiry date management  
1.5 Transaction logging for sales and sale items with receipt generation  
1.6 Generate reports through dashboards with CSV and print export capabilities  
1.7 Automated alerts for expiry risk and low stock coverage

## 2. Forecasting Tools

2.1 SARIMAX and ARIMA models with Exponential Smoothing for demand prediction  
2.2 Accuracy metrics using MAE MSE and RMSE evaluation  
2.3 Visualization using Chart.js in Manager dashboards  
2.4 On-demand training and predictions via API with persisted model artifacts

## 3. Sustainability Analytics

3.1 Inventory Utilization Rate indicators  
3.2 Expiry Risk Index with days to expiry and value at risk calculations  
3.3 Pharmaceutical Waste Reduction tracking for expired and expiring soon items  
3.4 ABC-VED analysis via manager analytics endpoint  
3.5 Integrated Sustainability Dashboard with filters and data export

## 4. AI Product Assistance and Recommendations

4.1 Sentence-BERT semantic retrieval using all-MiniLM-L6-v2 model for product and medical text  
4.2 Hybrid retrieval combining SBERT embeddings with TF-IDF cosine similarity and fuzzy matching  
4.3 Vectorizers trained on product and medical text from database and CSV datasets  
4.4 Product suggestions and alternatives provided in assistant and inventory views  
4.5 Product locator and search functionality across the catalog  
4.6 Intent classification for product search, location queries, and medical information requests

