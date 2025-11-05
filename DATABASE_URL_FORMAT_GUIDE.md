# 🔗 Correct DATABASE_URL Format Guide

## ✅ Standard PostgreSQL Format

### Basic Format:
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE
```

### With SSL (for Supabase):
```
postgresql://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

### For SQLAlchemy (Python):
```
postgresql+psycopg2://USERNAME:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

---

## 🎯 Supabase Connection Strings

Supabase provides **3 types of connection strings**. Here's how to get and format each:

### 1. **Direct Connection** (Port 5432)
- **Best for:** Simple connections
- **Where to find:** Supabase Dashboard → Settings → Database → Connection string → "URI"
- **Format:**
  ```
  postgresql+psycopg2://postgres.xxxxx:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres?sslmode=require
  ```
- **Example:**
  ```
  postgresql+psycopg2://postgres.abcdefghijklmnop:MySecurePassword123@db.abcdefghijklmnop.supabase.co:5432/postgres?sslmode=require
  ```

### 2. **Session Pooler** (Port 5432)
- **Best for:** Serverless functions, connection pooling
- **Where to find:** Supabase Dashboard → Settings → Database → Connection string → "Session mode"
- **Format:**
  ```
  postgresql+psycopg2://postgres.xxxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
  ```
- **Example:**
  ```
  postgresql+psycopg2://postgres.abcdefghijklmnop:MySecurePassword123@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
  ```

### 3. **Transaction Pooler** (Port 6543) ⭐ **RECOMMENDED**
- **Best for:** Production apps, high concurrency
- **Where to find:** Supabase Dashboard → Settings → Database → Connection string → "Transaction mode"
- **Format:**
  ```
  postgresql+psycopg2://postgres.xxxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
  ```
- **Example:**
  ```
  postgresql+psycopg2://postgres.abcdefghijklmnop:MySecurePassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
  ```

---

## 📋 Step-by-Step: How to Get Your Supabase Connection String

### Step 1: Go to Supabase Dashboard
1. Log in to [supabase.com](https://supabase.com)
2. Select your project

### Step 2: Navigate to Database Settings
1. Click **"Settings"** (gear icon in left sidebar)
2. Click **"Database"** (under Configuration)

### Step 3: Get Connection String
1. Scroll down to **"Connection string"** section
2. You'll see tabs: **"URI"**, **"JDBC"**, **"Session mode"**, **"Transaction mode"**
3. **For production, use "Transaction mode"** (recommended)
4. Click the **copy icon** next to the connection string

### Step 4: Convert to SQLAlchemy Format
The Supabase connection string will look like:
```
postgresql://postgres.xxxxx:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Convert it to:**
```
postgresql+psycopg2://postgres.xxxxx:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

**Changes:**
- Replace `postgresql://` with `postgresql+psycopg2://`
- Replace `[YOUR-PASSWORD]` with your actual password (remove brackets)
- Add `?sslmode=require` at the end

---

## 🔍 How to Verify Your Connection String

### Correct Format Checklist:
- ✅ Starts with `postgresql+psycopg2://`
- ✅ Has real username (not `user` or `username`)
- ✅ Has real password (not `password` or `PASSWORD`)
- ✅ Has real host (not `host` or `localhost`)
- ✅ Has real port number (5432, 6543, etc.) - **NOT the word "port"**
- ✅ Has real database name (usually `postgres`)
- ✅ Ends with `?sslmode=require` (for Supabase)

### ❌ Wrong Examples:
```
# Has placeholder text
postgresql+psycopg2://user:password@host:port/database?sslmode=require

# Missing password
postgresql+psycopg2://postgres.xxxxx@host:5432/postgres?sslmode=require

# Wrong port (word instead of number)
postgresql+psycopg2://postgres.xxxxx:password@host:port/postgres?sslmode=require

# Missing sslmode
postgresql+psycopg2://postgres.xxxxx:password@host:5432/postgres
```

### ✅ Correct Example:
```
postgresql+psycopg2://postgres.abcdefghijklmnop:MySecurePassword123@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

---

## 🎯 For Render.com Deployment

1. **Go to Render Dashboard** → Your Service → **"Environment"** tab
2. **Find or add** `DATABASE_URL`
3. **Paste your converted connection string** (from Step 4 above)
4. **Click "Save"**
5. **Redeploy** your service

---

## 🔐 Security Notes

- ⚠️ **Never commit** real DATABASE_URL to Git
- ✅ Always use environment variables
- ✅ Use different passwords for different environments
- ✅ Rotate passwords regularly

---

## 📝 Quick Reference

**Supabase Transaction Pooler (Recommended):**
```
postgresql+psycopg2://postgres.PROJECT_REF:YOUR_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

**Components:**
- `postgresql+psycopg2://` - Protocol for SQLAlchemy
- `postgres.PROJECT_REF` - Your Supabase project reference (find in URL)
- `YOUR_PASSWORD` - Your database password
- `aws-0-us-east-1.pooler.supabase.com` - Supabase pooler host
- `6543` - Transaction pooler port
- `postgres` - Database name (usually `postgres`)
- `?sslmode=require` - SSL requirement

---

## 🆘 Still Having Issues?

If your connection string looks correct but still fails:

1. **Check password** - Make sure it's correct (no extra spaces)
2. **Check host** - Should be `pooler.supabase.com` for pooler, or `db.xxxxx.supabase.co` for direct
3. **Check port** - Should be a number (5432 or 6543), not the word "port"
4. **Check SSL** - Make sure `?sslmode=require` is at the end
5. **Test connection** - Try connecting with a database client (pgAdmin, DBeaver) first

