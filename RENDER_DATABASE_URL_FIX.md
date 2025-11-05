# 🚨 Render Backend Error: DATABASE_URL Fix

## ❌ The Error

```
ValueError: invalid literal for int() with base 10: 'port'
```

This means your `DATABASE_URL` environment variable in Render contains placeholder text instead of actual values.

## ✅ Solution: Fix DATABASE_URL in Render Dashboard

### Step 1: Go to Render Dashboard

1. Go to [render.com](https://render.com)
2. Click on your backend service (`phoebe-backend`)
3. Click **"Environment"** tab (left sidebar)

### Step 2: Check DATABASE_URL

Look for the `DATABASE_URL` variable. It probably looks like:
```
postgresql+psycopg2://user:password@host:port/database?sslmode=require
```

**This is wrong!** It has placeholder text.

### Step 3: Get Your Real Database URL

#### Option A: If Using Supabase

1. Go to your Supabase project dashboard
2. Go to **"Settings"** → **"Database"**
3. Scroll to **"Connection string"**
4. Select **"URI"** tab
5. Copy the connection string
6. It should look like:
   ```
   postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
7. **Convert it to SQLAlchemy format:**
   ```
   postgresql+psycopg2://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```
   - Replace `postgresql://` with `postgresql+psycopg2://`
   - Add `?sslmode=require` at the end
   - Replace `[YOUR-PASSWORD]` with your actual database password

#### Option B: If Using Other PostgreSQL Provider

1. Get your database connection string from your provider
2. Format should be:
   ```
   postgresql+psycopg2://username:password@host:port/database?sslmode=require
   ```
3. Replace all placeholders with actual values

### Step 4: Update DATABASE_URL in Render

1. In Render Dashboard → **"Environment"** tab
2. Find `DATABASE_URL` variable
3. Click **"Edit"** or the pencil icon
4. **Paste your real database URL** (from Step 3)
5. Click **"Save"**

### Step 5: Redeploy

1. Go to **"Manual Deploy"** tab
2. Click **"Deploy latest commit"**
3. Wait for deployment to complete

---

## 📋 Correct DATABASE_URL Format

✅ **Correct:**
```
postgresql+psycopg2://postgres.xxxxx:yourpassword@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

❌ **Wrong (has placeholders):**
```
postgresql+psycopg2://user:password@host:port/database?sslmode=require
```

---

## 🔍 How to Verify

After fixing and redeploying:

1. Check Render logs - should show no DATABASE_URL errors
2. Test health endpoint: `https://your-backend.onrender.com/api/health`
3. Should return: `{"status": "ok"}`

---

## ⚠️ Important Notes

- **Never commit real DATABASE_URL to Git** - it's a security risk
- **Always use environment variables** in Render
- **Use `?sslmode=require`** for Supabase connections
- **Port number must be a number** (5432, 6543, etc.), not the word "port"

---

## 🐍 Python Version Issue

**Also noticed:** Render is still using Python 3.13.4 instead of 3.11.0.

**To fix:**
1. Go to Render Dashboard → Your Service → **"Settings"**
2. Scroll to **"Python Version"**
3. Change from `3.13.4` to `3.11.0`
4. Click **"Save"**
5. **Redeploy**

Or the `runtime.txt` file should work if Render detects it. Make sure it's in the root directory.

