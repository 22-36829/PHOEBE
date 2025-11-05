# 🚨 Render Python 3.13 Error - Complete Fix

## ❌ The Error

```
ImportError: /opt/render/project/src/.venv/lib/python3.13/site-packages/psycopg2/_psycopg.cpython-313-x86_64-linux-gnu.so: undefined symbol: _PyInterpreterState_Get
```

**Problem:** Render is using Python 3.13.4, but `psycopg2-binary` doesn't have pre-built wheels for Python 3.13 yet.

---

## ✅ Solution 1: Set Python Version in Render Dashboard (RECOMMENDED)

### Step 1: Go to Render Dashboard
1. Go to [render.com](https://render.com)
2. Click on your backend service (`phoebe-backend`)
3. Click **"Settings"** tab (left sidebar)

### Step 2: Set Python Version
1. Scroll down to **"Python Version"** section
2. You'll see it probably says `3.13.4` or `Latest`
3. **Change it to:** `3.11.0` (from dropdown)
4. **Click "Save Changes"**

### Step 3: Clear Build Cache and Redeploy
1. Go to **"Manual Deploy"** tab
2. Click **"Clear build cache & deploy"**
3. Wait for deployment to complete

**This is the BEST solution** - it will use Python 3.11 which is fully compatible with all packages.

---

## ✅ Solution 2: Use psycopg2 (Non-Binary) - Already Fixed in Code

I've updated `requirements.txt` to automatically use `psycopg2` (non-binary) for Python 3.13. This will compile from source and work with any Python version.

**You still need to set Python version to 3.11.0 in Render dashboard** (Solution 1) for best compatibility.

---

## ✅ Solution 3: Move runtime.txt to Correct Location

If `runtime.txt` isn't being detected:

1. **Make sure `runtime.txt` is in the root directory** (not in `backend/`)
2. Content should be:
   ```
   python-3.11.0
   ```
3. **Commit and push:**
   ```bash
   git add runtime.txt
   git commit -m "Ensure Python 3.11.0 in runtime.txt"
   git push origin main
   ```

---

## 🎯 Step-by-Step: Complete Fix

### Step 1: Set Python Version in Render Dashboard
1. Render Dashboard → Your Service → **Settings**
2. Find **"Python Version"**
3. Change to **`3.11.0`**
4. Click **"Save Changes"**

### Step 2: Clear Build Cache
1. Go to **"Manual Deploy"** tab
2. Click **"Clear build cache & deploy"**
3. This ensures a fresh build with Python 3.11

### Step 3: Wait for Deployment
- Build will take 3-5 minutes
- Watch the logs to ensure it's using Python 3.11
- Should see: `Python 3.11.0` in build logs

---

## 📋 Verification

After deployment, check the logs. You should see:
```
Python 3.11.0
Installing dependencies...
Successfully installed psycopg2-binary-2.9.9
```

**NOT:**
```
Python 3.13.4
```

---

## 🔍 Why This Happens

- Render defaults to Python 3.13 (latest)
- `psycopg2-binary` doesn't have wheels for Python 3.13 yet
- Setting Python 3.11.0 explicitly fixes this
- `runtime.txt` should work, but dashboard setting is more reliable

---

## ✅ After Fix

Once Python 3.11 is set:
- ✅ All packages will install correctly
- ✅ `psycopg2-binary` will work
- ✅ No more import errors
- ✅ Backend will deploy successfully

---

## 🆘 If Still Not Working

1. **Double-check Python version** in Render Settings
2. **Clear build cache** and redeploy
3. **Check build logs** - should show Python 3.11.0
4. **Verify `runtime.txt`** is in root directory

---

**The most important step: Set Python Version to 3.11.0 in Render Dashboard Settings!**

