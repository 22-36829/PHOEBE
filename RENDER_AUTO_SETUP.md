# 🚀 Automatic Render Setup Guide

## ✅ What Gets Set Automatically (via render.yaml)

When you create a new Render service and connect it to your GitHub repo, Render will **automatically** read `backend/render.yaml` and configure:

- ✅ **Start Command** - Automatically set
- ✅ **Root Directory** - Automatically set to `backend`
- ✅ **Build Command** - Automatically set
- ✅ **Python Version** - Automatically set to 3.11.0
- ✅ **Health Check Path** - Automatically set to `/api/health`
- ✅ **Environment Variable NAMES** - Automatically created (but you need to set VALUES)

## ⚠️ What You MUST Set Manually (for security)

You still need to manually set the **VALUES** of these environment variables in Render dashboard:

1. **DATABASE_URL** - Your Supabase pooler connection string
2. **JWT_SECRET_KEY** - Your secret key
3. **APP_SECRET_KEY** - Your secret key

## 📋 Step-by-Step: Create Fresh Render Service

### Step 1: Create New Web Service
1. Go to [render.com](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo: `22-36829/PHOEBE`
4. Select branch: `main`

### Step 2: Render Auto-Detects Settings
Render will automatically read `backend/render.yaml` and set:
- **Name**: `phoebe-backend` (from render.yaml)
- **Root Directory**: `backend` (from render.yaml)
- **Environment**: `Python` (from render.yaml)
- **Build Command**: `pip install -r requirements.txt` (from render.yaml)
- **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 120 --access-logfile - --error-logfile - --log-level info` (from render.yaml)
- **Python Version**: `3.11.0` (from render.yaml)

**You don't need to change these!** They're already set correctly.

### Step 3: Set Environment Variables (VALUES ONLY)
1. Scroll down to **"Environment Variables"** section
2. You'll see these variables already listed (from render.yaml):
   - `DATABASE_URL` (sync: false) ← **SET THE VALUE**
   - `JWT_SECRET_KEY` (sync: false) ← **SET THE VALUE**
   - `APP_SECRET_KEY` (sync: false) ← **SET THE VALUE**
   - `FLASK_ENV` = `production` (already set)
   - `FLASK_DEBUG` = `0` (already set)
   - `SKIP_AI_ROUTES` = `true` (already set)
   - `PYTHON_VERSION` = `3.11.0` (already set)

3. **Click on each variable** and set the value:
   - **DATABASE_URL**: `postgresql+psycopg2://postgres.xybuirzvlfuwmtcokkwm:PhoebeDrugStore01@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require`
   - **JWT_SECRET_KEY**: `XHvffY70jteAcebHmGcEwxRhHjFVeSDOGg5pepdGXWU`
   - **APP_SECRET_KEY**: `ISX79vibLwDGSVZWZqVN_-atmwh3kv4Sq-W1P70HOIQ`

### Step 4: Deploy
1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repo
   - Install dependencies
   - Start your app
3. Watch the logs - you should see `[INIT]` messages!

## 🎯 Summary

**Automatic (from render.yaml):**
- Start Command ✅
- Root Directory ✅
- Build Command ✅
- Python Version ✅
- Health Check ✅
- Environment Variable Names ✅

**Manual (you set values):**
- DATABASE_URL value ⚠️
- JWT_SECRET_KEY value ⚠️
- APP_SECRET_KEY value ⚠️

That's it! Much simpler than before.

