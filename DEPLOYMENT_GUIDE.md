# Deployment Guide - Phoebe App

This guide will help you deploy the Phoebe application to production.

## 📋 Prerequisites

1. **GitHub Account** - Your code should be in a GitHub repository
2. **Vercel Account** - For frontend deployment (free tier available)
3. **Render Account** - For backend deployment (free tier available)
4. **Database** - PostgreSQL database (Supabase or any PostgreSQL provider)

## 🗂️ Project Structure

```
phoebe_app/
├── frontend/          # React frontend (Vercel)
├── backend/           # Flask backend (Render)
└── ...
```

---

## 🚀 Step 1: Prepare Your Codebase

### 1.1 Clean Unnecessary Files (See CLEANUP_FILES.md)

Before deploying, clean up development files:
- `__pycache__/` directories
- `.pyc` files
- Test files (if not needed)
- Development scripts

### 1.2 Verify Environment Variables

Ensure you have the following environment variables ready:

**Backend (.env):**
```
DATABASE_URL=postgresql+psycopg2://user:password@host:port/database?sslmode=require
FLASK_ENV=production
FLASK_DEBUG=0
APP_SECRET_KEY=your-secure-secret-key-here
JWT_SECRET_KEY=your-secure-jwt-secret-key-here
```

**Frontend (.env):**
```
REACT_APP_API_BASE=https://your-backend-url.onrender.com
```

---

## 🔧 Step 2: Deploy Backend to Render

### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up/login with your GitHub account

### 2.2 Create New Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Select the repository containing your code

### 2.3 Configure Backend Service
- **Name**: `phoebe-backend` (or your preferred name)
- **Environment**: `Python 3`
- **Root Directory**: `backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`

### 2.4 Set Environment Variables in Render
Go to **Environment** section and add:

```
DATABASE_URL=your-database-url
JWT_SECRET_KEY=generate-a-secure-random-string
APP_SECRET_KEY=generate-a-secure-random-string
FLASK_ENV=production
FLASK_DEBUG=0
```

**Generate secure keys:**
```bash
# Use Python to generate secure keys
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 2.5 Deploy
- Click **"Create Web Service"**
- Render will automatically build and deploy your backend
- Wait for deployment to complete (may take 5-10 minutes)
- Note your service URL: `https://your-service-name.onrender.com`

### 2.6 Verify Backend Deployment
- Check health endpoint: `https://your-backend-url.onrender.com/api/health`
- Should return: `{"status": "ok"}`

---

## 🎨 Step 3: Deploy Frontend to Vercel

### 3.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with your GitHub account

### 3.2 Import Project
1. Click **"Add New..."** → **"Project"**
2. Import your GitHub repository
3. Select the repository

### 3.3 Configure Frontend Project
- **Framework Preset**: `Create React App`
- **Root Directory**: `frontend`
- **Build Command**: `npm run build` (should be auto-detected)
- **Output Directory**: `build`

### 3.4 Set Environment Variables
Go to **Environment Variables** and add:

```
REACT_APP_API_BASE=https://your-backend-url.onrender.com
```

Replace `your-backend-url.onrender.com` with your actual Render backend URL.

### 3.5 Deploy
- Click **"Deploy"**
- Vercel will build and deploy your frontend
- Deployment typically takes 2-3 minutes
- Your app will be available at: `https://your-project.vercel.app`

---

## ✅ Step 4: Post-Deployment Checklist

### 4.1 Test Backend
- [ ] Health check endpoint works: `/api/health`
- [ ] Database connection is working
- [ ] CORS is configured correctly
- [ ] Authentication endpoints work

### 4.2 Test Frontend
- [ ] Frontend loads without errors
- [ ] Can connect to backend API
- [ ] Login functionality works
- [ ] All API calls are using correct backend URL

### 4.3 Security Checklist
- [ ] All environment variables are set (no defaults in production)
- [ ] JWT_SECRET_KEY is strong and unique
- [ ] APP_SECRET_KEY is strong and unique
- [ ] Database credentials are secure
- [ ] CORS origins are properly configured (if restricting)

### 4.4 Performance
- [ ] Backend responds within acceptable time
- [ ] Frontend loads quickly
- [ ] Static assets are cached properly

---

## 🔄 Step 5: Update CORS (if needed)

If you want to restrict CORS to your frontend domain only, update `backend/app.py`:

```python
CORS(app, resources={r"/api/*": {
    "origins": ["https://your-frontend.vercel.app"],
    "methods": ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type", "Authorization"]
}})
```

---

## 📝 Step 6: Custom Domain (Optional)

### Vercel Custom Domain
1. Go to your project settings
2. Navigate to **Domains**
3. Add your custom domain
4. Follow DNS configuration instructions

### Render Custom Domain
1. Go to your service settings
2. Navigate to **Custom Domains**
3. Add your custom domain
4. Update DNS records as instructed

---

## 🐛 Troubleshooting

### Backend Issues

**Problem**: Deployment fails with "Module not found"
- **Solution**: Ensure `requirements.txt` includes all dependencies

**Problem**: Database connection fails
- **Solution**: Check `DATABASE_URL` format and credentials

**Problem**: Health check fails
- **Solution**: Verify database is accessible and tables exist

### Frontend Issues

**Problem**: API calls fail with CORS error
- **Solution**: Check CORS configuration in backend and ensure `REACT_APP_API_BASE` is set correctly

**Problem**: Build fails
- **Solution**: Check for TypeScript/linting errors, ensure all dependencies are in `package.json`

**Problem**: Blank page after deployment
- **Solution**: Check browser console for errors, verify API base URL is correct

### General Issues

**Problem**: Environment variables not working
- **Solution**: Ensure variables are set in deployment platform (not just local `.env`)

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Flask Deployment Guide](https://flask.palletsprojects.com/en/latest/deploying/)
- [React Deployment Guide](https://create-react-app.dev/docs/deployment/)

---

## 🔐 Security Notes

1. **Never commit `.env` files** - They are in `.gitignore`
2. **Use strong secrets** - Generate random keys for production
3. **Enable HTTPS** - Both platforms provide HTTPS by default
4. **Monitor logs** - Check Render and Vercel logs for errors
5. **Database security** - Use connection pooling and SSL for database connections

---

## 📞 Support

If you encounter issues:
1. Check the deployment logs in Render/Vercel
2. Verify all environment variables are set correctly
3. Test endpoints using Postman or curl
4. Check browser console for frontend errors

---

**Last Updated**: Deployment configuration v1.0

