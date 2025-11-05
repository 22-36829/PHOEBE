# What's Next? - Deployment Steps

Based on your current progress, here's what to do next:

## ✅ What You've Completed

- ✅ Code pushed to GitHub
- ✅ Vercel "New Project" page is open (or ready)

## 🚀 Next Steps

### Step 1: Deploy Backend to Render FIRST (Required!)

**Why first?** You need the backend URL before deploying the frontend.

1. **Go to [render.com](https://render.com)** and sign up/login
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository** (`22-36829/PHOEBE`)
4. **Configure Backend:**
   - Name: `phoebe-backend`
   - Environment: `Python 3`
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`

5. **Set Environment Variables (Use "Add from .env"):**
   - Go to "Environment" tab
   - Click "Add from .env"
   - Copy content from `backend/env.production.template`
   - Replace `DATABASE_URL` with your actual database connection string
   - Paste and click "Add variables"

6. **Deploy:**
   - Click "Create Web Service"
   - Wait 5-10 minutes for deployment
   - **Copy your backend URL** (e.g., `https://phoebe-backend-xxxx.onrender.com`)

7. **Verify:**
   - Test: `https://your-backend-url.onrender.com/api/health`
   - Should return: `{"status": "ok"}`

---

### Step 2: Deploy Frontend to Vercel (After Backend is Ready)

Now that you have your backend URL, continue with Vercel:

1. **In Vercel "New Project" page (already open):**

2. **Configure Project:**
   - ✅ Project Name: `phoebe_frontend` (already set)
   - ⚠️ **Framework Preset**: Click dropdown and select **"Create React App"**
   - ⚠️ **Root Directory**: Click "Edit" and change from `./` to `frontend`

3. **Set Environment Variable:**
   - Click to expand **"Environment Variables"** section
   - Click **"Add from .env"** button
   - Copy content from `frontend/env.production.template`
   - **Replace `https://your-backend-url.onrender.com`** with your actual Render backend URL from Step 1
   - Paste and click "Add variables"

4. **Deploy:**
   - Click **"Deploy"** button
   - Wait 2-3 minutes
   - Your app will be live!

---

## 📋 Quick Checklist

### Backend (Render) - Do This First:
- [ ] Create Render account
- [ ] Create new Web Service
- [ ] Connect GitHub repo
- [ ] Set Root Directory to `backend`
- [ ] Set Build Command: `pip install -r requirements.txt`
- [ ] Set Start Command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
- [ ] Add environment variables (use "Add from .env")
- [ ] Deploy and wait for completion
- [ ] Copy backend URL
- [ ] Test health endpoint

### Frontend (Vercel) - Do This After Backend:
- [ ] Set Framework Preset to "Create React App"
- [ ] Set Root Directory to `frontend`
- [ ] Add environment variable `REACT_APP_API_BASE` (use "Add from .env")
- [ ] Replace backend URL in .env content
- [ ] Click Deploy
- [ ] Test frontend

---

## 🎯 Current Status

**You're at:** Vercel project setup page

**Next action:** 
1. **First** - Complete backend deployment on Render (get backend URL)
2. **Then** - Complete frontend deployment on Vercel (use backend URL)

---

## 💡 Pro Tip

**Don't deploy frontend yet if backend isn't ready!** You need the backend URL to set `REACT_APP_API_BASE`. 

**Recommended order:**
1. ✅ Backend (Render) - Get URL
2. ✅ Frontend (Vercel) - Use backend URL

---

## 📚 Reference Files

- `DEPLOYMENT_STEPS.md` - Full detailed guide
- `backend/env.production.template` - Backend .env template
- `frontend/env.production.template` - Frontend .env template
- `QUICK_ENV_REFERENCE.md` - Quick copy-paste reference

