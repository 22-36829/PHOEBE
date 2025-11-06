# 🔧 MANUAL FIX: Update Render Start Command

## Problem
Render is still using the old start command with `--workers 2`, which causes memory issues. Also, the app is crashing silently.

## ✅ SOLUTION: Update Start Command in Render Dashboard

### Step 1: Go to Render Dashboard
1. Go to [render.com](https://render.com)
2. Log in to your account
3. Click on your service: **phoebe-backend**

### Step 2: Update Start Command
1. Click on **"Settings"** tab (left sidebar)
2. Scroll down to **"Start Command"** section
3. **DELETE** the existing command
4. **PASTE** this new command:
   ```
   gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 2 --timeout 120 --access-logfile - --error-logfile - --log-level info
   ```
5. Click **"Save Changes"**

### Step 3: Verify Environment Variables
Make sure these are set in **"Environment"** tab:
- `SKIP_AI_ROUTES` = `true` (to save memory)
- `DATABASE_URL` = (your Supabase pooler connection string)
- `JWT_SECRET_KEY` = (your secret key)
- `APP_SECRET_KEY` = (your secret key)
- `FLASK_ENV` = `production`
- `FLASK_DEBUG` = `0`

### Step 4: Manual Deploy
1. After saving, click **"Manual Deploy"** button (top right)
2. Select **"Deploy latest commit"**
3. Watch the logs - you should now see startup messages

## Expected Logs
After fixing, you should see:
```
[INFO] ========================================
[INFO] Phoebe Backend app module loaded
[INFO] Flask app object: <Flask 'app'>
...
[INFO] App should be ready to bind to port
```

If you see errors instead, share them and we'll fix them!

