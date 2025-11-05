# ✅ COPY THIS TO RENDER - READY TO USE!

## 📋 Your Complete DATABASE_URL

**Copy this entire line:**

```
postgresql+psycopg2://postgres.xybuirzvlfuwmtcokkwm:PhoebeDrugStore01@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
```

---

## 🎯 How to Update in Render

### Step 1: Go to Render Dashboard
1. Go to [render.com](https://render.com)
2. Click on your backend service (`phoebe-backend`)
3. Click **"Environment"** tab (left sidebar)

### Step 2: Update DATABASE_URL
1. Find `DATABASE_URL` variable
2. Click **"Edit"** (or pencil icon)
3. **Delete the old value**
4. **Paste this exact line:**
   ```
   postgresql+psycopg2://postgres.xybuirzvlfuwmtcokkwm:PhoebeDrugStore01@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```
5. Click **"Save Changes"**

### Step 3: Redeploy
1. Go to **"Manual Deploy"** tab
2. Click **"Clear build cache & deploy"**
3. Wait for deployment (3-5 minutes)

---

## ✅ After Deployment

Test your backend:
```
https://your-backend-url.onrender.com/api/health
```

Should return: `{"status": "ok"}`

---

## 📝 What I Found

Your Supabase project reference is: **`xybuirzvlfuwmtcokkwm`**

This is from your existing connection strings in the code. I've converted it to the pooler format for you.

---

**That's it! Just copy and paste the connection string above into Render!** 🚀

