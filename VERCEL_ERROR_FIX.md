# Vercel Build Error: "react-scripts: command not found" - FIX

## ❌ The Error

```
sh: line 1: react-scripts: command not found
Error: Command "react-scripts build" exited with 127
```

## 🔍 What This Means

Vercel is trying to build your app but can't find `react-scripts` because:
- Dependencies aren't being installed (`npm install` isn't running)
- OR Root Directory isn't set correctly in Vercel dashboard

## ✅ Solution: Fix Root Directory in Vercel

### Step 1: Go to Vercel Project Settings

1. **Go to your Vercel dashboard**
2. **Click on your project** (`phoebe_frontend`)
3. **Click "Settings"** (top navigation)
4. **Click "General"** (left sidebar)

### Step 2: Fix Root Directory

**Look for "Root Directory" setting:**
- **Current value:** Probably shows `./` or empty
- **Change it to:** `frontend`
- **Click "Save"**

### Step 3: Verify Framework Preset

**Also check "Framework Preset":**
- Should be: **"Create React App"**
- If it shows "Other", change it to "Create React App"

### Step 4: Redeploy

1. **Go to "Deployments" tab**
2. **Find the failed deployment**
3. **Click the three dots (⋯)** on the right
4. **Click "Redeploy"**
5. **Wait for build to complete**

---

## 🔧 Alternative: If Root Directory Can't Be Changed

If you can't change Root Directory in settings, you can set it during deployment:

### Option A: Cancel and Start Over

1. **Cancel current deployment** (if possible)
2. **Go to "Add New Project"**
3. **Import your GitHub repo again**
4. **On the configuration page:**
   - Framework Preset: **"Create React App"**
   - Root Directory: **`frontend`** (click Edit and change from `./`)
   - Click **"Deploy"**

### Option B: Use Environment Variables to Force Install

1. Go to **Settings → Environment Variables**
2. Add variable:
   - Key: `VERCEL_NPM_INSTALL_COMMAND`
   - Value: `cd frontend && npm install`
3. Redeploy

---

## 📋 Quick Checklist

Before redeploying, verify:

- [ ] **Root Directory** = `frontend` (in Vercel Settings → General)
- [ ] **Framework Preset** = `Create React App`
- [ ] **package.json** exists in `frontend/` directory
- [ ] **node_modules** is NOT committed (it's in .gitignore - this is correct)

---

## ✅ Expected Build Output

After fixing, you should see:
```
✓ Installing dependencies...
✓ Building...
✓ Build completed
```

---

## 🚨 Most Common Issue

**99% of the time, this error happens because:**
- Root Directory is set to `./` instead of `frontend`
- Vercel tries to build from the root, can't find `package.json`, and skips `npm install`

**Fix:** Set Root Directory to `frontend` in Vercel Settings → General

---

**Need help?** Check the build logs in Vercel dashboard to see exactly where it's looking for files.

