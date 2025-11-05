# Environment Variables Guide

Complete guide for setting up environment variables for deployment.

---

## 🔧 Backend Environment Variables (Render)

Add these **5 environment variables** in your Render dashboard:

### Step-by-Step Instructions:

1. **Go to your Render service dashboard**
2. **Click on "Environment" tab** (left sidebar)
3. **Click "Add Environment Variable"** for each variable below

---

### 1. DATABASE_URL

**Key:** `DATABASE_URL`

**Value:** Your PostgreSQL database connection string

**Format:**
```
postgresql+psycopg2://username:password@host:port/database?sslmode=require
```

**Examples:**
- **Supabase**: `postgresql+psycopg2://postgres:yourpassword@db.xxxxx.supabase.co:5432/postgres?sslmode=require`
- **Render PostgreSQL**: `postgresql+psycopg2://user:pass@host:5432/dbname?sslmode=require`

**Important:**
- ✅ Include `?sslmode=require` if using Supabase
- ✅ No spaces in the connection string
- ✅ Keep credentials secure

---

### 2. JWT_SECRET_KEY

**Key:** `JWT_SECRET_KEY`

**Value:**
```
XHvffY70jteAcebHmGcEwxRhHjFVeSDOGg5pepdGXWU
```

**Important:**
- ✅ Copy this exact value
- ✅ Used for JWT token encryption
- ✅ Keep this secret!

---

### 3. APP_SECRET_KEY

**Key:** `APP_SECRET_KEY`

**Value:**
```
ISX79vibLwDGSVZWZqVN_-atmwh3kv4Sq-W1P70HOIQ
```

**Important:**
- ✅ Copy this exact value
- ✅ Used for Flask session encryption
- ✅ Keep this secret!

---

### 4. FLASK_ENV

**Key:** `FLASK_ENV`

**Value:**
```
production
```

**Important:**
- ✅ Must be exactly `production` (lowercase)
- ✅ This sets Flask to production mode

---

### 5. FLASK_DEBUG

**Key:** `FLASK_DEBUG`

**Value:**
```
0
```

**Important:**
- ✅ Must be exactly `0` (as a string, not number)
- ✅ Disables debug mode in production

---

## 🎨 Frontend Environment Variables (Vercel)

Add this **1 environment variable** in your Vercel dashboard:

### Step-by-Step Instructions:

1. **Go to your Vercel project dashboard**
2. **Click on "Settings"** (top navigation)
3. **Click "Environment Variables"** (left sidebar)
4. **Click "Add New"** button

---

### 1. REACT_APP_API_BASE

**Key:** `REACT_APP_API_BASE`

**Value:** Your Render backend URL

**Format:**
```
https://your-backend-name.onrender.com
```

**Example:**
```
https://phoebe-backend-xxxx.onrender.com
```

**Important:**
- ✅ Must start with `https://`
- ✅ No trailing slash at the end
- ✅ Replace `your-backend-name.onrender.com` with your actual Render backend URL
- ✅ Get this URL from Step 2.4 in DEPLOYMENT_STEPS.md

---

## ✅ Verification Checklist

After setting all environment variables:

### Backend (Render):
- [ ] DATABASE_URL is set correctly
- [ ] JWT_SECRET_KEY is set (use the pre-generated key)
- [ ] APP_SECRET_KEY is set (use the pre-generated key)
- [ ] FLASK_ENV = `production`
- [ ] FLASK_DEBUG = `0`

### Frontend (Vercel):
- [ ] REACT_APP_API_BASE = Your Render backend URL

---

## 🔍 How to Verify

### Backend:
1. Check Render logs after deployment
2. Test health endpoint: `https://your-backend.onrender.com/api/health`
3. Should return: `{"status": "ok"}`

### Frontend:
1. Check Vercel build logs
2. Open browser console on deployed site
3. Should not see CORS errors
4. API calls should work

---

## ⚠️ Common Mistakes

1. **Missing `?sslmode=require`** in DATABASE_URL (for Supabase)
2. **Wrong variable names** (case-sensitive!)
3. **Trailing slash** in REACT_APP_API_BASE
4. **Using `http://`** instead of `https://` in REACT_APP_API_BASE
5. **Forgetting to click "Save"** after adding variables

---

## 📝 Quick Copy-Paste Reference

### Backend (Render):

```
DATABASE_URL=postgresql+psycopg2://user:pass@host:port/db?sslmode=require
JWT_SECRET_KEY=XHvffY70jteAcebHmGcEwxRhHjFVeSDOGg5pepdGXWU
APP_SECRET_KEY=ISX79vibLwDGSVZWZqVN_-atmwh3kv4Sq-W1P70HOIQ
FLASK_ENV=production
FLASK_DEBUG=0
```

### Frontend (Vercel):

```
REACT_APP_API_BASE=https://your-backend-url.onrender.com
```

---

**Note:** Replace placeholders with your actual values!

