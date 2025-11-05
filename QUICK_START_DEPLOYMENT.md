# Quick Start Deployment Guide

This is a condensed version of the deployment guide for quick reference.

## 🚀 Quick Steps

### Backend (Render)

1. **Go to Render.com** → New Web Service
2. **Connect GitHub** repo
3. **Configure**:
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
4. **Set Environment Variables**:
   ```
   DATABASE_URL=your-database-url
   JWT_SECRET_KEY=generate-random-key
   APP_SECRET_KEY=generate-random-key
   FLASK_ENV=production
   FLASK_DEBUG=0
   ```
5. **Deploy** → Copy your backend URL

### Frontend (Vercel)

1. **Go to Vercel.com** → Add New Project
2. **Import GitHub** repo
3. **Configure**:
   - Framework: Create React App
   - Root Directory: `frontend`
4. **Set Environment Variable**:
   ```
   REACT_APP_API_BASE=https://your-backend-url.onrender.com
   ```
5. **Deploy** → Done!

## ✅ Verify

- Backend: `https://your-backend.onrender.com/api/health` → `{"status": "ok"}`
- Frontend: Should load without errors
- Test login functionality

## 🔑 Generate Secure Keys

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Run twice to get two different keys for JWT_SECRET_KEY and APP_SECRET_KEY.

---

**For detailed instructions, see DEPLOYMENT_GUIDE.md**

