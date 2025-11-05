# Step-by-Step Deployment Instructions

Follow these steps in order to deploy your application.

## 📋 Quick Tip: Use .env Files for Faster Setup

You can import all environment variables at once using the **"Add from .env"** feature in both Render and Vercel. See template files:
- `backend/env.production.template` - For Render backend
- `frontend/env.production.template` - For Vercel frontend

Or see `QUICK_ENV_REFERENCE.md` for copy-paste ready content.

---

## 🔑 Step 1: Generate Secure Keys

Before deploying, you need to generate secure keys for your backend.

### Option A: Using Python (Recommended)
```bash
python -c "import secrets; print('JWT_SECRET_KEY:', secrets.token_urlsafe(32))"
python -c "import secrets; print('APP_SECRET_KEY:', secrets.token_urlsafe(32))"
```

### Option B: Using PowerShell
```powershell
python -c "import secrets; print('JWT_SECRET_KEY:', secrets.token_urlsafe(32))"
python -c "import secrets; print('APP_SECRET_KEY:', secrets.token_urlsafe(32))"
```

### Option C: Use Pre-Generated Keys (Already Done!)
The following keys have already been generated for you. **Copy and use these exact values**:

**JWT_SECRET_KEY:**
```
XHvffY70jteAcebHmGcEwxRhHjFVeSDOGg5pepdGXWU
```

**APP_SECRET_KEY:**
```
ISX79vibLwDGSVZWZqVN_-atmwh3kv4Sq-W1P70HOIQ
```

**✅ Save these keys** - you'll need them in Step 2.3!

---

## 🚀 Step 2: Deploy Backend to Render

### 2.1 Create Render Account & Service
1. Go to **[render.com](https://render.com)** and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select your repository

### 2.2 Configure Backend Service
Fill in the following settings:

- **Name**: `phoebe-backend` (or your preferred name)
- **Environment**: `Python 3`
- **Region**: Choose closest to your users
- **Branch**: `main` (or your default branch)
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`

### 2.3 Set Environment Variables

You can set environment variables in two ways:

#### **Option A: Import from .env File (Recommended & Faster)**

1. **Open the file** `backend/env.production.template` in your project
2. **Copy the entire content** from that file
3. **Replace `DATABASE_URL`** with your actual database connection string
   - Example format: `postgresql+psycopg2://user:password@host:port/database?sslmode=require`
   - If using Supabase: Make sure to include `?sslmode=require` at the end
4. **In Render Dashboard:**
   - Go to **"Environment"** tab
   - Click **"Add from .env"** button (or "Import from file")
   - **Paste your .env contents** into the text area
   - Click **"Add variables"**
   - ✅ All 5 variables will be imported automatically!

**Example .env content to paste:**
```
DATABASE_URL=postgresql+psycopg2://user:password@host:port/database?sslmode=require
JWT_SECRET_KEY=XHvffY70jteAcebHmGcEwxRhHjFVeSDOGg5pepdGXWU
APP_SECRET_KEY=ISX79vibLwDGSVZWZqVN_-atmwh3kv4Sq-W1P70HOIQ
FLASK_ENV=production
FLASK_DEBUG=0
```

**⚠️ Important:** 
- Replace `DATABASE_URL` with your actual database connection string before pasting
- Make sure the format is `KEY=VALUE` (one per line)
- No spaces around the `=` sign

#### **Option B: Add Manually (One by One)**

If you prefer to add variables manually:

1. Click on **"Environment"** tab
2. Click **"Add Environment Variable"** for each:

**Variable 1: DATABASE_URL**
- **Key**: `DATABASE_URL`
- **Value**: Your PostgreSQL connection string
  - Format: `postgresql+psycopg2://user:password@host:port/database?sslmode=require`

**Variable 2: JWT_SECRET_KEY**
- **Key**: `JWT_SECRET_KEY`
- **Value**: `XHvffY70jteAcebHmGcEwxRhHjFVeSDOGg5pepdGXWU`

**Variable 3: APP_SECRET_KEY**
- **Key**: `APP_SECRET_KEY`
- **Value**: `ISX79vibLwDGSVZWZqVN_-atmwh3kv4Sq-W1P70HOIQ`

**Variable 4: FLASK_ENV**
- **Key**: `FLASK_ENV`
- **Value**: `production`

**Variable 5: FLASK_DEBUG**
- **Key**: `FLASK_DEBUG`
- **Value**: `0`

**Important Notes**: 
- ✅ Click "Add" after each variable (if using Option B)
- ✅ Make sure variable names match exactly (case-sensitive)
- ✅ Never use default/example values for secrets
- ✅ Double-check `DATABASE_URL` format and credentials

### 2.4 Deploy Backend
1. Click **"Create Web Service"**
2. Wait for deployment to complete (5-10 minutes)
3. **Copy your service URL** - it will look like: `https://phoebe-backend-xxxx.onrender.com`

### 2.5 Verify Backend
Test your backend health endpoint:
```
https://your-backend-url.onrender.com/api/health
```

You should see: `{"status": "ok"}`

**✅ Save your backend URL** - you'll need it for frontend deployment!

---

## 🎨 Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account & Project
1. Go to **[vercel.com](https://vercel.com)** and sign up/login
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository

### 3.2 Configure Frontend Project
Fill in the following settings:

- **Framework Preset**: `Create React App` (auto-detected)
- **Root Directory**: `frontend` ⚠️ **IMPORTANT: Change this from root to `frontend`**
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `build` (auto-detected)

### 3.3 Set Environment Variable

You can set the environment variable in two ways:

#### **Option A: Import from .env File (Recommended & Faster)**

1. **Open the file** `frontend/env.production.template` in your project
2. **Copy the content** from that file
3. **Replace `https://your-backend-url.onrender.com`** with your actual Render backend URL from Step 2.4
   - Example: If your backend URL is `https://phoebe-backend-xxxx.onrender.com`, use that exact URL
   - Make sure to include `https://` at the beginning
   - No trailing slash at the end
4. **In Vercel Dashboard:**
   - Go to **"Settings"** → **"Environment Variables"**
   - Click **"Add from .env"** button (or "Import from file")
   - **Paste your .env content** into the text area
   - Click **"Add variables"**
   - ✅ Variable will be imported automatically!

**Example .env content to paste:**
```
REACT_APP_API_BASE=https://phoebe-backend-xxxx.onrender.com
```

**⚠️ Important:** 
- Replace `https://your-backend-url.onrender.com` with your actual backend URL from Step 2.4
- Get your backend URL from Render dashboard after Step 2.4 completes

#### **Option B: Add Manually**

1. Go to **"Settings"** → **"Environment Variables"**
2. Click **"Add New"**
3. Enter:
   - **Key**: `REACT_APP_API_BASE`
   - **Value**: Your Render backend URL (from Step 2.4)
     - Example: `https://phoebe-backend-xxxx.onrender.com`
     - Must include `https://`
     - No trailing slash
4. Click **"Save"**

### 3.4 Deploy Frontend
1. Click **"Deploy"**
2. Wait for deployment (2-3 minutes)
3. Your app will be live at: `https://your-project.vercel.app`

---

## ✅ Step 4: Post-Deployment Verification

### 4.1 Test Backend
- [ ] Health check: `https://your-backend.onrender.com/api/health` → `{"status": "ok"}`
- [ ] Backend logs show no errors
- [ ] Database connection is working

### 4.2 Test Frontend
- [ ] Frontend loads without errors
- [ ] No CORS errors in browser console
- [ ] Login page loads
- [ ] Can connect to backend API

### 4.3 Test Full Flow
- [ ] Can register/login
- [ ] Can access dashboard
- [ ] API calls work correctly
- [ ] No 401/403 errors

---

## 🔧 Step 5: Troubleshooting

### Backend Issues

**Problem**: Build fails with "Module not found"
- **Solution**: Check `requirements.txt` includes all dependencies

**Problem**: Service crashes on startup
- **Solution**: Check Render logs, verify all environment variables are set

**Problem**: Database connection fails
- **Solution**: Verify `DATABASE_URL` format and credentials

**Problem**: Health check returns 500
- **Solution**: Check database is accessible and tables exist

### Frontend Issues

**Problem**: API calls fail with CORS error
- **Solution**: Verify `REACT_APP_API_BASE` is set correctly in Vercel

**Problem**: Blank page after deployment
- **Solution**: Check browser console, verify API base URL

**Problem**: Build fails
- **Solution**: Check for TypeScript/linting errors, ensure all dependencies are in `package.json`

---

## 📝 Quick Reference

### Backend URL Format
```
https://your-service-name.onrender.com
```

### Frontend URL Format
```
https://your-project-name.vercel.app
```

### Environment Variables Quick Reference

**Backend (Render) - Add these 5 variables:**

1. **DATABASE_URL**
   - Value: Your PostgreSQL connection string
   - Format: `postgresql+psycopg2://user:password@host:port/database?sslmode=require`

2. **JWT_SECRET_KEY**
   - Value: `XHvffY70jteAcebHmGcEwxRhHjFVeSDOGg5pepdGXWU`

3. **APP_SECRET_KEY**
   - Value: `ISX79vibLwDGSVZWZqVN_-atmwh3kv4Sq-W1P70HOIQ`

4. **FLASK_ENV**
   - Value: `production`

5. **FLASK_DEBUG**
   - Value: `0`

**Frontend (Vercel) - Add this 1 variable:**

1. **REACT_APP_API_BASE**
   - Value: Your Render backend URL (e.g., `https://phoebe-backend-xxxx.onrender.com`)

---

## 🎉 Success!

Once all steps are complete, your application is live!

- **Frontend**: https://your-project.vercel.app
- **Backend**: https://your-backend.onrender.com

---

## 📞 Need Help?

1. Check deployment logs in Render/Vercel dashboards
2. Verify all environment variables are set correctly
3. Test endpoints using Postman or curl
4. Check browser console for frontend errors
5. Review `DEPLOYMENT_GUIDE.md` for detailed information

---

**Ready to deploy? Start with Step 1!** 🚀

