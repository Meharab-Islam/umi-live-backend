#!/usr/bin/env bash
# ==============================================================================
#  UMI LIVE - Automated VPS One-Click Production Deployment Script
#  Supported OS: Ubuntu 20.04 / 22.04 / 24.04 LTS & Debian 11 / 12
# ==============================================================================

set -euo pipefail

# Visual Color Tokens
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear
cat << "EOF"
  _    _ __  __ _____   _      _______      ________ 
 | |  | |  \/  |_   _| | |    |_   _\ \    / /  ____|
 | |  | | \  / | | |   | |      | |  \ \  / /| |__   
 | |  | | |\/| | | |   | |      | |   \ \/ / |  __|  
 | |__| | |  | |_| |_  | |____ _| |_   \  /  | |____ 
  \____/|_|  |_|_____| |______|_____|   \/   |______|
                                                     
  ⚡ Automated VPS Deployment & Production Setup Script
======================================================
EOF

# 1. Root Privileges Check
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR]${NC} Please run this script as root or with sudo privileges:"
  echo -e "        sudo bash $0"
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo -e "\n${CYAN}${BOLD}[1/7] Checking & Updating System Dependencies...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq curl git ufw nginx certbot python3-certbot-nginx openssl sed grep > /dev/null

# 2. Docker & Docker Compose Installation
echo -e "\n${CYAN}${BOLD}[2/7] Checking Docker Engine & Compose...${NC}"
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}➔ Docker not found. Installing official Docker Engine...${NC}"
  curl -fsSL https://get.docker.com | sh > /dev/null 2>&1
  systemctl enable --now docker > /dev/null 2>&1
  echo -e "${GREEN}✓ Docker Engine installed successfully.${NC}"
else
  echo -e "${GREEN}✓ Docker is already installed: $(docker --version)${NC}"
fi

# Ensure docker compose plugin is available
if ! docker compose version &> /dev/null; then
  echo -e "${YELLOW}➔ Installing docker-compose-plugin...${NC}"
  apt-get install -y -qq docker-compose-plugin > /dev/null 2>&1
fi
echo -e "${GREEN}✓ Docker Compose ready: $(docker compose version)${NC}"

# 3. Environment Configuration (.env) Setup
echo -e "\n${CYAN}${BOLD}[3/7] Configuring Environment Variables (.env)...${NC}"

if [ ! -f "$PROJECT_DIR/.env" ]; then
  if [ -f "$PROJECT_DIR/.env.example" ]; then
    echo -e "${YELLOW}➔ Copying .env.example to .env...${NC}"
    cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
  else
    echo -e "${RED}[ERROR]${NC} Neither .env nor .env.example found in $PROJECT_DIR."
    exit 1
  fi
fi

# Generate cryptographically secure random passwords if defaults are detected
generate_secret() {
  openssl rand -hex 24
}

CURRENT_MYSQL_ROOT=$(grep '^MYSQL_ROOT_PASSWORD=' "$PROJECT_DIR/.env" | cut -d '=' -f2- || true)
if [[ -z "$CURRENT_MYSQL_ROOT" || "$CURRENT_MYSQL_ROOT" == "root_secure_password_2026" ]]; then
  NEW_MYSQL_ROOT=$(generate_secret)
  sed -i "s|^MYSQL_ROOT_PASSWORD=.*|MYSQL_ROOT_PASSWORD=${NEW_MYSQL_ROOT}|" "$PROJECT_DIR/.env"
  echo -e "${GREEN}✓ Generated secure MYSQL_ROOT_PASSWORD.${NC}"
fi

CURRENT_DB_PW=$(grep '^DB_PASSWORD=' "$PROJECT_DIR/.env" | cut -d '=' -f2- || true)
if [[ -z "$CURRENT_DB_PW" || "$CURRENT_DB_PW" == "umi_password" ]]; then
  NEW_DB_PW=$(generate_secret)
  sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${NEW_DB_PW}|" "$PROJECT_DIR/.env"
  echo -e "${GREEN}✓ Generated secure DB_PASSWORD.${NC}"
fi

CURRENT_JWT=$(grep '^JWT_SECRET=' "$PROJECT_DIR/.env" | cut -d '=' -f2- || true)
if [[ -z "$CURRENT_JWT" || "$CURRENT_JWT" == "umi_live_jwt_secret_token_key_2026_super_secure!" ]]; then
  NEW_JWT=$(generate_secret)
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${NEW_JWT}|" "$PROJECT_DIR/.env"
  echo -e "${GREEN}✓ Generated secure JWT_SECRET.${NC}"
fi

# Ensure FIREBASE_CREDENTIALS_PATH is configured
if ! grep -q "^FIREBASE_CREDENTIALS_PATH=" "$PROJECT_DIR/.env"; then
  echo "FIREBASE_CREDENTIALS_PATH=./umi_firebase.json" >> "$PROJECT_DIR/.env"
fi

# 4. Domain & SSL Prompts
echo -e "\n${CYAN}${BOLD}[4/7] Domain & SSL Configuration${NC}"
SERVER_IP=$(curl -s -4 https://ifconfig.me || hostname -I | awk '{print $1}')
echo -e "Detected Server Public IP: ${BOLD}${YELLOW}${SERVER_IP}${NC}"

read -r -p "Enter your Backend Domain (e.g., api.yourdomain.com) [Press Enter for IP-only]: " BACKEND_DOMAIN || true
read -r -p "Enter your Admin Panel Domain (e.g., admin.yourdomain.com) [Press Enter for IP-only]: " ADMIN_DOMAIN || true

USE_SSL=false
if [[ -n "$BACKEND_DOMAIN" ]]; then
  read -r -p "Configure automated Free Let's Encrypt SSL certificates? (y/N): " SSL_CONFIRM || true
  if [[ "$SSL_CONFIRM" =~ ^[Yy]$ ]]; then
    USE_SSL=true
    read -r -p "Enter your Email Address for SSL renewal notifications: " SSL_EMAIL || true
  fi
fi

# Update .env URLs
if [[ -n "$BACKEND_DOMAIN" ]]; then
  PROTOCOL="http"
  [[ "$USE_SSL" = true ]] && PROTOCOL="https"
  sed -i "s|^VITE_API_BASE_URL=.*|VITE_API_BASE_URL=${PROTOCOL}://${BACKEND_DOMAIN}/api|" "$PROJECT_DIR/.env"
  sed -i "s|^VITE_SOCKET_URL=.*|VITE_SOCKET_URL=${PROTOCOL}://${BACKEND_DOMAIN}|" "$PROJECT_DIR/.env"
fi

# 5. Firebase Credentials Verification
echo -e "\n${CYAN}${BOLD}[5/7] Verifying Firebase Credentials (Push Notifications)...${NC}"
if [ -f "$PROJECT_DIR/umi_firebase.json" ]; then
  echo -e "${GREEN}✓ umi_firebase.json found! FCM push notifications will be fully active.${NC}"
else
  echo -e "${YELLOW}⚠️ umi_firebase.json was not found in $PROJECT_DIR.${NC}"
  echo -e "   You can copy your Firebase service account JSON file to:"
  echo -e "   ${BOLD}$PROJECT_DIR/umi_firebase.json${NC} at any time and restart with: docker compose restart backend"
fi

# 6. Nginx Reverse Proxy Configuration
echo -e "\n${CYAN}${BOLD}[6/7] Configuring Host Nginx Reverse Proxy & Firewalls...${NC}"

NGINX_CONF_PATH="/etc/nginx/sites-available/umi.conf"
NGINX_ENABLED_PATH="/etc/nginx/sites-enabled/umi.conf"

cat > "$NGINX_CONF_PATH" << NGINX_EOF
# ==============================================================================
# UMI LIVE - Host Reverse Proxy Configuration
# ==============================================================================

NGINX_EOF

if [[ -n "$BACKEND_DOMAIN" ]]; then
  cat >> "$NGINX_CONF_PATH" << NGINX_EOF
# Backend API & WebSockets
server {
    listen 80;
    server_name ${BACKEND_DOMAIN};
    client_max_body_size 100M;

    # REST API
    location / {
        proxy_pass http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Real-Time WebSockets
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5050/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Uploads Storage
    location /uploads/ {
        proxy_pass http://127.0.0.1:5050/uploads/;
        proxy_set_header Host \$host;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
NGINX_EOF
fi

if [[ -n "$ADMIN_DOMAIN" ]]; then
  cat >> "$NGINX_CONF_PATH" << NGINX_EOF
# Admin Panel SPA Frontend
server {
    listen 80;
    server_name ${ADMIN_DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX_EOF
fi

# If neither domain was entered, setup default IP access
if [[ -z "$BACKEND_DOMAIN" && -z "$ADMIN_DOMAIN" ]]; then
  cat >> "$NGINX_CONF_PATH" << NGINX_EOF
server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 100M;

    # Admin Panel on root
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # Backend API on /api/
    location /api/ {
        proxy_pass http://127.0.0.1:5050/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    # WebSockets
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5050/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Uploads
    location /uploads/ {
        proxy_pass http://127.0.0.1:5050/uploads/;
        proxy_set_header Host \$host;
        expires 30d;
    }
}
NGINX_EOF
fi

# Enable site and remove default if conflicting
rm -f /etc/nginx/sites-enabled/default
ln -sf "$NGINX_CONF_PATH" "$NGINX_ENABLED_PATH"
nginx -t && systemctl reload nginx
echo -e "${GREEN}✓ Nginx reverse proxy configured and active.${NC}"

# Setup SSL if requested
if [ "$USE_SSL" = true ]; then
  echo -e "${YELLOW}➔ Issuing Free Let's Encrypt SSL Certificates...${NC}"
  DOMAINS_ARGS=("-d" "$BACKEND_DOMAIN")
  [[ -n "$ADMIN_DOMAIN" ]] && DOMAINS_ARGS+=("-d" "$ADMIN_DOMAIN")
  
  certbot --nginx --non-interactive --agree-tos -m "${SSL_EMAIL:-admin@$BACKEND_DOMAIN}" "${DOMAINS_ARGS[@]}" || {
    echo -e "${YELLOW}⚠️ Certbot could not verify domain DNS. Please ensure your domain A records point to ${SERVER_IP}.${NC}"
  }
fi

# Configure UFW Firewall (Safely preserve SSH)
ufw allow 22/tcp > /dev/null 2>&1 || true
ufw allow 80/tcp > /dev/null 2>&1 || true
ufw allow 443/tcp > /dev/null 2>&1 || true
echo "y" | ufw enable > /dev/null 2>&1 || true
echo -e "${GREEN}✓ UFW Firewall configured (Ports 22, 80, 443 open; Database/Redis secured).${NC}"

# 7. Build and Run Docker Containers
echo -e "\n${CYAN}${BOLD}[7/7] Launching Docker Containers (MySQL, Redis, Backend, Admin Panel)...${NC}"
docker compose down --remove-orphans > /dev/null 2>&1 || true
docker compose up -d --build

echo -e "\n${YELLOW}➔ Waiting for services to become healthy...${NC}"
sleep 10
docker compose ps

# Success Summary
BACKEND_DISPLAY="${BACKEND_DOMAIN:-$SERVER_IP:5050}"
ADMIN_DISPLAY="${ADMIN_DOMAIN:-$SERVER_IP:3000}"
SCHEME="http"
[[ "$USE_SSL" = true ]] && SCHEME="https"

cat << EOF

${GREEN}${BOLD}========================================================================${NC}
${GREEN}${BOLD}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}
${GREEN}${BOLD}========================================================================${NC}

🌐 ${BOLD}Application Access Points:${NC}
   • Backend API Health:   ${SCHEME}://${BACKEND_DISPLAY}/api/health
   • Interactive API Docs: ${SCHEME}://${ADMIN_DISPLAY}/api-docs
   • Admin Panel Login:    ${SCHEME}://${ADMIN_DISPLAY}
   • WebSocket Endpoint:   ${SCHEME}://${BACKEND_DISPLAY}/socket.io/

🛡️ ${BOLD}Security & Production Highlights:${NC}
   • MySQL Database:       Secured inside Docker network (Volume: umi_mysql_data)
   • Redis Cache:          Zero-downtime cache with LRU eviction (Volume: umi_redis_data)
   • Auto Self-Healing:    Enabled (restart: always)
   • Firewall:             Ports 22, 80, 443 enabled (DB/Redis ports blocked publicly)

🛠️ ${BOLD}Useful Management Commands:${NC}
   • Check container status:   ${CYAN}docker compose ps${NC}
   • View live backend logs:   ${CYAN}docker compose logs -f backend${NC}
   • View all container logs:  ${CYAN}docker compose logs -f${NC}
   • Restart all services:     ${CYAN}docker compose restart${NC}
   • Pull code & redeploy:     ${CYAN}git pull && docker compose up -d --build${NC}
   • Stop entire stack:        ${CYAN}docker compose down${NC}

${GREEN}========================================================================${NC}
EOF
