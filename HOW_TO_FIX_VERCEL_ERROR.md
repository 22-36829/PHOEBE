# 🚨 HOW TO FIX VERCEL BUILD ERROR - STEP BY STEP

## ❌ The Error You're Seeing

```
sh: line 1: react-scripts: command not found
Error: Command "react-scripts build" exited with 127
```

## 🔍 Root Cause

Vercel is trying to build from the root directory (`./`) but your React app is in the `frontend/` subdirectory. Dependencies aren't being installed because Vercel can't find `package.json` in the root.

---

## ✅ SOLUTION 1: Fix Root Directory in Vercel Dashboard (MOST IMPORTANT!)

### Step 1: Open Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Log in to your account
3. Click on your project: **"phoebe_frontend"**

### Step 2: Go to Settings
1. Click **"Settings"** tab (top navigation bar)
2. Click **"General"** (left sidebar)

### Step 3: Fix Root Directory
1. Scroll down to **"Root Directory"** section
2. You'll see it probably says `./` or is empty
3. **Click "Edit"** or the pencil icon next to it
4. **Change it to:** `frontend`
5. **Click "Save"**

### Step 4: Verify Framework Preset
1. Check **"Framework Preset"** setting
2. Should be: **"Create React App"**
3. If it's not, change it to **"Create React App"**

### Step 5: Redeploy
1. Go to **"Deployments"** tab
2. Click the **three dots (⋯)** on the latest failed deployment
3. Click **"Redeploy"**
4. Make sure it says it will use the latest commit

---

## ✅ SOLUTION 2: Manual Build Settings (If Root Directory doesn't work)

### In Vercel Dashboard → Settings → General:

1. Expand **"Build and Output Settings"** section
2. Set these values:
   - **Install Command:** `cd frontend && npm install`
   - **Build Command:** `cd frontend && npm run build`
   - **Output Directory:** `frontend/build`
3. Click **"Save"**
4. **Redeploy**

---

## ✅ SOLUTION 3: Force Latest Commit (If Vercel is using old commit)

Your error shows it's deploying commit `71b7e97` (old). The latest commits have fixes.

### To force latest commit:

1. Go to **"Deployments"** tab
2. Click **"Redeploy"** button (top right)
3. In the dialog:
   - Select **"Use existing Build Cache"** = **OFF** (unchecked)
   - This forces a fresh build
4. Click **"Redeploy"**

---

## ✅ SOLUTION 4: Delete and Recreate Project (Last Resort)

If nothing works:

1. **Go to Settings → General**
2. **Scroll to bottom**
3. **Click "Delete Project"** (or cancel the project)
4. **Create New Project:**
   - Click **"Add New Project"**
   - Import your GitHub repo: `22-36829/PHOEBE`
   - On configuration page:
     - **Framework Preset:** `Create React App`
     - **Root Directory:** Click "Edit" → Change to `frontend` ⚠️ **CRITICAL!**
     - Build Command: Leave default (`npm run build`)
     - Output Directory: Leave default (`build`)
   - Click **"Deploy"**

---

## 📋 Quick Checklist

Before redeploying, verify:
- [ ] Root Directory = `frontend` (not `./`)
- [ ] Framework Preset = `Create React App`
- [ ] Latest commit is being deployed (check commit hash)
- [ ] Redeploy after making changes

---

## 🎯 Expected Result

After fixing, you should see in build logs:
```
✓ Cloning repository...
✓ Installing dependencies...
✓ Building...
✓ Build completed successfully
```

---

## 🚨 Why This Keeps Happening

Vercel is looking for `package.json` in the root directory, but yours is in `frontend/package.json`. When it can't find it, it skips `npm install`, so `react-scripts` is never installed.

**The fix:** Tell Vercel to look in the `frontend/` directory by setting Root Directory to `frontend`.

---

**THE MOST IMPORTANT STEP: Set Root Directory to `frontend` in Vercel Dashboard!**

