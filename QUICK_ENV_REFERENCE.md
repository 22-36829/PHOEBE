# Quick .env Reference - Copy & Paste for Deployment

Use these templates to quickly import environment variables using "Add from .env" feature.

---

## 🚀 Backend (Render) - Copy & Paste This

**Steps:**
1. Copy the content below
2. Replace `DATABASE_URL` with your actual database connection string
3. In Render → Environment tab → Click "Add from .env"
4. Paste the content
5. Click "Add variables"

**Content to paste:**
```
DATABASE_URL=postgresql+psycopg2://user:password@host:port/database?sslmode=require
JWT_SECRET_KEY=XHvffY70jteAcebHmGcEwxRhHjFVeSDOGg5pepdGXWU
APP_SECRET_KEY=ISX79vibLwDGSVZWZqVN_-atmwh3kv4Sq-W1P70HOIQ
FLASK_ENV=production
FLASK_DEBUG=0
```

**⚠️ Important:** Replace the `DATABASE_URL` line with your actual database connection string!

---

## 🎨 Frontend (Vercel) - Copy & Paste This

**Steps:**
1. Copy the content below
2. Replace `https://your-backend-url.onrender.com` with your actual Render backend URL
3. In Vercel → Settings → Environment Variables → Click "Add from .env"
4. Paste the content
5. Click "Add variables"

**Content to paste (after getting backend URL from Step 2.4):**
```
REACT_APP_API_BASE=https://phoebe-backend-xxxx.onrender.com
```

**⚠️ Important:** Replace `https://phoebe-backend-xxxx.onrender.com` with your actual Render backend URL!

---

## 📝 Format Rules

- ✅ One variable per line
- ✅ Format: `KEY=VALUE` (no spaces around `=`)
- ✅ No quotes needed around values
- ✅ Comments start with `#` (but some platforms may ignore them)
- ✅ Empty lines are ignored

---

## ✅ Verification

After pasting, verify all variables appear in the dashboard:
- Render: Should show all 5 variables
- Vercel: Should show 1 variable

---

**Quick Tip:** Use the template files in your project:
- `backend/env.production.template`
- `frontend/env.production.template`

