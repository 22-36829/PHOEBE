# Deployment Checklist

Use this checklist to track your deployment progress.

## ✅ Pre-Deployment

- [x] Code cleanup completed
- [x] Configuration files created
- [x] Dependencies verified
- [ ] Secure keys generated (use `generate_keys.py`)
- [ ] Database URL ready

## 🚀 Step 1: Generate Keys

- [ ] Run `python generate_keys.py`
- [ ] Copy `JWT_SECRET_KEY` and save it
- [ ] Copy `APP_SECRET_KEY` and save it

## 🚀 Step 2: Deploy Backend (Render)

- [ ] Created Render account
- [ ] Created new Web Service
- [ ] Connected GitHub repository
- [ ] Set Root Directory to `backend`
- [ ] Set Build Command: `pip install -r requirements.txt`
- [ ] Set Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
- [ ] Added `DATABASE_URL` environment variable
- [ ] Added `JWT_SECRET_KEY` environment variable
- [ ] Added `APP_SECRET_KEY` environment variable
- [ ] Added `FLASK_ENV=production`
- [ ] Added `FLASK_DEBUG=0`
- [ ] Deployed backend
- [ ] Backend URL: `https://________________.onrender.com`
- [ ] Tested health endpoint: `/api/health` returns `{"status": "ok"}`

## 🎨 Step 3: Deploy Frontend (Vercel)

- [ ] Created Vercel account
- [ ] Imported GitHub repository
- [ ] Set Root Directory to `frontend`
- [ ] Set Framework Preset: `Create React App`
- [ ] Added `REACT_APP_API_BASE` environment variable
- [ ] Set value to backend URL from Step 2
- [ ] Deployed frontend
- [ ] Frontend URL: `https://________________.vercel.app`

## ✅ Post-Deployment Verification

### Backend
- [ ] Health check works: `/api/health`
- [ ] No errors in Render logs
- [ ] Database connection successful

### Frontend
- [ ] Frontend loads without errors
- [ ] No CORS errors in console
- [ ] Login page displays correctly

### Integration
- [ ] Can login successfully
- [ ] API calls work correctly
- [ ] Dashboard loads
- [ ] All features functional

## 🎉 Deployment Complete!

Your application is now live!

- Frontend: _________________________________
- Backend: _________________________________

---

**Notes:**
- Save your keys securely
- Keep your backend URL handy
- Monitor logs for first 24 hours

