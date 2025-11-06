# EC2 Deployment (Single Backend with AI Enabled)

This guide deploys the entire backend (core + forecasting + AI) on one EC2 instance.

## 1) Pick an instance
- Recommended: Ubuntu 22.04, t3.large (2 vCPU, 8 GB RAM). Start with t3.medium (4 GB) if cost sensitive.
- Security Group: open 22 (SSH), 80 (HTTP), 443 (HTTPS).

## 2) Connect and install dependencies
```bash
# login
ssh ubuntu@YOUR_EC2_PUBLIC_IP

# base packages
sudo apt update -y
sudo apt install -y build-essential git curl nginx python3-venv python3-dev libpq-dev pkg-config

# optional: Node (only if you will build frontend here)
# curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
# sudo apt install -y nodejs
```

## 3) Clone code and set up venv
```bash
cd /opt
sudo mkdir phoebe && sudo chown $USER:$USER phoebe
cd phoebe

git clone https://github.com/22-36829/PHOEBE.git .
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r backend/requirements.txt
```

## 4) Environment variables
Create `/opt/phoebe/.env` (owned by ubuntu) with:
```bash
DATABASE_URL=postgresql+psycopg2://postgres.<PROJECT_REF>:<PASSWORD>@aws-<region>.pooler.supabase.com:6543/postgres?sslmode=require
JWT_SECRET_KEY=<your_jwt_secret>
APP_SECRET_KEY=<your_app_secret>
FLASK_ENV=production
FLASK_DEBUG=0
# Enable AI and forecasting on EC2
SKIP_AI_ROUTES=false
```

## 5) Gunicorn systemd unit
Create `/etc/systemd/system/phoebe.service`:
```ini
[Unit]
Description=Phoebe Backend (Gunicorn)
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/opt/phoebe/backend
Environment="PYTHONPATH=/opt/phoebe/backend"
EnvironmentFile=/opt/phoebe/.env
ExecStart=/opt/phoebe/.venv/bin/gunicorn app:app \
  --bind 127.0.0.1:8000 \
  --workers 2 --threads 2 --timeout 180 \
  --access-logfile - --error-logfile -
Restart=always

[Install]
WantedBy=multi-user.target
```
Then:
```bash
sudo systemctl daemon-reload
sudo systemctl enable phoebe
sudo systemctl start phoebe
sudo systemctl status phoebe --no-pager
```

## 6) Nginx reverse proxy
Create `/etc/nginx/sites-available/phoebe`:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    client_max_body_size 25m;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 180s;
    }
}
```
Enable and test:
```bash
sudo ln -s /etc/nginx/sites-available/phoebe /etc/nginx/sites-enabled/phoebe
sudo nginx -t && sudo systemctl reload nginx
```

## 7) HTTPS (Let’s Encrypt)
```bash
sudo snap install core; sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot
sudo certbot --nginx -d YOUR_DOMAIN
```
Certbot will edit Nginx to listen on 443 and auto‑renew.

## 8) Update/deploy flow
```bash
cd /opt/phoebe
sudo -u ubuntu git pull
source .venv/bin/activate
pip install -r backend/requirements.txt
sudo systemctl restart phoebe
```

## 9) Health check
- http(s)://YOUR_DOMAIN/api/health → should return `{ status: "ok" }`

## 10) Tuning notes
- Instance: increase RAM for heavier AI models.
- Gunicorn: keep `workers=2 threads=2` for CPU‑bound analytics; adjust based on CPU.
- DB: use Supabase Pooler URL (port 6543) as above.
- Environment: SKIP_AI_ROUTES=false to enable forecasting/AI.

That’s it. Your single backend (core + AI) runs on EC2 with Nginx + Gunicorn + systemd.
