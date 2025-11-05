# 🐍 How to Set Python Version in Render (When No Option in Dashboard)

## ✅ Method 1: Add PYTHON_VERSION Environment Variable (BEST)

### Step 1: Go to Render Dashboard
1. Go to [render.com](https://render.com)
2. Click on your backend service (`phoebe-backend`)
3. Click **"Environment"** tab (left sidebar)

### Step 2: Add PYTHON_VERSION Variable
1. Click **"Add Environment Variable"** button
2. Enter:
   - **Key:** `PYTHON_VERSION`
   - **Value:** `3.11.0`
3. Click **"Save Changes"**

### Step 3: Redeploy
1. Go to **"Manual Deploy"** tab
2. Click **"Clear build cache & deploy"**
3. Wait for deployment

---

## ✅ Method 2: Use .python-version File (Already Created)

I've created a `.python-version` file in your root directory with `3.11.0`.

**Just push to GitHub and redeploy:**
```bash
git add .python-version
git commit -m "Set Python version to 3.11.0"
git push origin main
```

Then manually redeploy in Render.

---

## ✅ Method 3: Both Methods (Most Reliable)

**Use BOTH methods for maximum reliability:**
1. Add `PYTHON_VERSION=3.11.0` environment variable in Render dashboard
2. Keep `.python-version` file in root (already created)

---

## 📋 What I've Done

✅ Created `.python-version` file in root directory
✅ Added `PYTHON_VERSION` to `render.yaml`
✅ Updated `requirements.txt` to handle Python 3.13

---

## 🚀 Next Steps

1. **Go to Render Dashboard** → Your Service → **"Environment"** tab
2. **Add environment variable:**
   - Key: `PYTHON_VERSION`
   - Value: `3.11.0`
3. **Click "Save Changes"**
4. **Go to "Manual Deploy"** tab
5. **Click "Clear build cache & deploy"**
6. **Wait for deployment**

---

## 🔍 Verify It's Working

After deployment, check the build logs. You should see:
```
Python 3.11.0
Installing dependencies...
```

**NOT:**
```
Python 3.13.4
```

---

## ✅ Summary

**The easiest way:** Add `PYTHON_VERSION=3.11.0` as an environment variable in Render dashboard Environment tab.

The `.python-version` file is a backup method that should also work.

