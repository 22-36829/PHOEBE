# Files to Clean Before Deployment

This document lists files and directories that should be cleaned or removed before deploying to production.

## 🗑️ Files/Directories to Remove

### Python Cache Files
These are automatically generated and should not be in version control:

```
backend/__pycache__/
backend/routes/__pycache__/
backend/services/__pycache__/
backend/**/*.pyc
backend/**/*.pyo
backend/**/*.pyd
```

**Action**: These are already in `.gitignore`, but if committed, remove them:
```bash
find backend -type d -name __pycache__ -exec rm -r {} +
find backend -type f -name "*.pyc" -delete
find backend -type f -name "*.pyo" -delete
```

### Duplicate/Unused Directories
These appear to be accidentally created duplicates:

```
backend/backend/                    # Duplicate nested backend directory
backend/backend/backend/           # Triple nested directory
```

**Action**: Remove these nested directories:
```bash
rm -rf backend/backend/
```

### Development/Test Scripts (Optional)
These are useful for development but not needed in production:

```
backend/add_dummy_sales.py          # Development script
backend/check_table_structure.py    # Development script
scripts/check_duplicate_tables.py   # One-time cleanup script
scripts/cleanup_database.py         # One-time cleanup script
scripts/drop_duplicate_tables.py   # One-time cleanup script
scripts/drop_old_tables.py         # One-time cleanup script
scripts/verify_database_clean.py   # One-time verification script
```

**Note**: Keep these if you need them for future maintenance. They're safe to keep but not required for deployment.

### CSV Data Files (Optional)
If these are only used for initial data seeding:

```
datasets_clean/                     # CSV files for initial data
```

**Action**: Keep if you need to re-seed data, otherwise remove or move to a separate data repository.

### Test Files (Optional)
```
backend/tests/test_enhanced_ai_service.py
```

**Note**: Tests are useful but not required for deployment. Keep them if you want to run tests in CI/CD.

### Old Environment Example
```
backend/env_example.txt             # Old format, use .env.example instead
```

**Action**: Remove after confirming `.env.example` is created (if needed).

---

## 📦 Files to Keep

### Configuration Files
```
backend/config/ai_synonyms.json     # Keep - application config
backend/migrations/                 # Keep - database migrations
```

### AI Models (Large Files)
```
backend/ai_models/*.pkl             # Keep if needed for AI features
backend/ai_models/*.joblib          # Keep if needed for AI features
backend/ai_models/*.json            # Keep if needed for AI features
backend/ai_models/*.npy             # Keep if needed for AI features
```

**Note**: These are large files. Consider:
- Using Git LFS for these files
- Or storing them in cloud storage (S3, etc.) and loading at runtime
- Or excluding them from repo and regenerating on first deployment

### Database Schema
```
file_dump/schema.sql                # Keep - useful reference
```

---

## 🧹 Quick Cleanup Script

Create and run this cleanup script (optional):

```bash
#!/bin/bash
# cleanup.sh

echo "Cleaning Python cache files..."
find backend -type d -name __pycache__ -exec rm -r {} + 2>/dev/null
find backend -type f -name "*.pyc" -delete 2>/dev/null
find backend -type f -name "*.pyo" -delete 2>/dev/null

echo "Removing duplicate nested directories..."
rm -rf backend/backend/

echo "Cleaning complete!"
```

**Windows PowerShell version:**
```powershell
# cleanup.ps1
Write-Host "Cleaning Python cache files..."
Get-ChildItem -Path backend -Recurse -Directory -Filter __pycache__ | Remove-Item -Recurse -Force
Get-ChildItem -Path backend -Recurse -Filter *.pyc | Remove-Item -Force
Get-ChildItem -Path backend -Recurse -Filter *.pyo | Remove-Item -Force

Write-Host "Removing duplicate nested directories..."
Remove-Item -Path backend\backend -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Cleaning complete!"
```

---

## ✅ Verification Checklist

After cleanup, verify:

- [ ] No `__pycache__` directories in backend
- [ ] No `.pyc` files in backend
- [ ] No duplicate `backend/backend/` directories
- [ ] `.gitignore` is properly configured
- [ ] All necessary config files are present
- [ ] Environment variables are documented in `.env.example`

---

## 📝 Notes

1. **Git Ignore**: Most of these files should already be in `.gitignore`, but verify they're not committed
2. **Backup**: If unsure about removing files, create a backup branch first
3. **AI Models**: Large model files may need special handling (Git LFS or external storage)
4. **Scripts**: Development scripts can be kept in a separate branch or documented for future use

---

**Last Updated**: Pre-deployment cleanup checklist

