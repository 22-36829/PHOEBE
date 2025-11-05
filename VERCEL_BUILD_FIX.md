# Vercel Build Error Fix

## ❌ Error You're Seeing

```
sh: line 1: react-scripts: command not found
Error: Command "react-scripts build" exited with 127
```

## 🔍 Root Cause

Vercel is trying to run `react-scripts build` but dependencies aren't installed. This happens when:
- Root Directory isn't set correctly in Vercel dashboard
- Or Vercel isn't detecting the `package.json` in the right location

## ✅ Solution: Fix Vercel Configuration

### Option 1: Fix in Vercel Dashboard (Recommended)

1. **Go to your Vercel project settings**
2. **Click "Settings" → "General"**
3. **Verify Root Directory:**
   - Should be set to: `frontend`
   - If it shows `./` or empty, change it to `frontend`
4. **Click "Save"**
5. **Redeploy:**
   - Go to "Deployments" tab
   - Click the three dots (⋯) on the latest deployment
   - Click "Redeploy"

### Option 2: Verify Configuration on Deploy Page

If you're still on the "New Project" page:

1. **Framework Preset:** Should be `Create React App`
2. **Root Directory:** Should be `frontend` (not `./`)
   - Click "Edit" next to Root Directory
   - Change from `./` to `frontend`
   - Click "Save" or "Done"
3. **Build and Output Settings:**
   - Expand this section
   - Build Command: Should be `npm run build` (or leave default)
   - Output Directory: Should be `build` (or leave default)
   - Install Command: Should be empty (Vercel auto-detects `npm install`)

### Option 3: Check Project Structure

Make sure your repository structure looks like this:
```
phoebe_app/
├── frontend/
│   ├── package.json  ← This must exist here
│   ├── package-lock.json
│   ├── src/
│   └── ...
├── backend/
└── ...
```

## 🔧 Alternative: Manual Build Command

If the above doesn't work, you can set a custom build command:

1. In Vercel dashboard → Settings → General
2. Expand "Build and Output Settings"
3. Set **Install Command**: `cd frontend && npm install`
4. Set **Build Command**: `cd frontend && npm run build`
5. Set **Output Directory**: `frontend/build`

## ✅ Verification

After fixing and redeploying:
- Build should show: "Installing dependencies..."
- Then: "Building..."
- Should complete successfully

## 📝 Quick Checklist

- [ ] Root Directory is set to `frontend` (not `./`)
- [ ] Framework Preset is `Create React App`
- [ ] `package.json` exists in `frontend/` directory
- [ ] Redeploy after making changes

---

**Most Common Fix:** Set Root Directory to `frontend` in Vercel dashboard!

