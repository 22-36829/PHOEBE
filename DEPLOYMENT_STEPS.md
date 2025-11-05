# Step-by-Step Deployment Instructions

Follow these steps in order to deploy your application.

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

**Save these keys** - you'll need them in Step 2!

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
Click on **"Environment"** tab and add these variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `your-database-url` | Your PostgreSQL connection string |
| `JWT_SECRET_KEY` | `[paste from Step 1]` | The key you generated |
| `APP_SECRET_KEY` | `[paste from Step 1]` | The other key you generated |
| `FLASK_ENV` | `production` | Fixed value |
| `FLASK_DEBUG` | `0` | Fixed value |

**Important**: 
- Make sure `DATABASE_URL` includes `?sslmode=require` if using Supabase
- Never use default/example values for secrets

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
Click **"Environment Variables"** and add:

| Variable | Value |
|----------|-------|
| `REACT_APP_API_BASE` | `https://your-backend-url.onrender.com` |

**⚠️ Replace `your-backend-url.onrender.com` with your actual Render backend URL from Step 2.4**

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

### Environment Variables Quick List

**Backend (Render):**
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `APP_SECRET_KEY`
- `FLASK_ENV=production`
- `FLASK_DEBUG=0`

**Frontend (Vercel):**
- `REACT_APP_API_BASE`

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

