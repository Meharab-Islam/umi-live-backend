# 🚀 UMI LIVE - VPS Deployment & Operations Master Guide

এই ডকুমেন্টটিতে UMI Live ব্যাকএন্ড, অ্যাডমিন প্যানেল, MySQL ডাটাবেজ এবং Redis ক্যাশ VPS-এ ডেপ্লয় করা, স্বয়ংক্রিয় স্ক্রিপ্টের কাজের বিবরণ, ভবিষ্যতে কোড আপডেট করার নিয়ম এবং যেকোনো সমস্যা সমাধানের ম্যানুয়াল গাইড বিস্তারিতভাবে দেওয়া হয়েছে।

---

## সূচিপত্র (Table of Contents)
1. [🔄 ভবিষ্যতে কোড আপডেট করার নিয়ম (How to Update Code)](#1--ভবিষ্যতে-কোড-আপডেট-করার-নিয়ম-how-to-update-code)
2. [⚙️ deploy.sh স্ক্রিপ্ট চালালে কী কী ঘটে (What deploy.sh Does)](#2-️-deploysh-স্ক্রিপ্ট-চালালে-কী-কী-ঘটে-what-deploysh-does)
3. [🛠️ স্ক্রিপ্টে সমস্যা হলে কী করবেন (Troubleshooting & Fallback)](#3-️-স্ক্রিপ্টে-সমস্যা-হলে-কী-করবেন-troubleshooting--fallback)
4. [📋 সম্পূর্ণ ম্যানুয়াল ডেপ্লয়মেন্ট গাইড (Manual Deployment Guide)](#4--সম্পূর্ণ-ম্যানুয়াল-ডেপ্লয়মেন্ট-গাইড-manual-deployment-guide)
5. [💾 ডাটাবেজ ব্যাকআপ ও রিস্টোর (MySQL Backup & Restore)](#5--ডাটাবেজ-ব্যাকআপ-ও-রিস্টোর-mysql-backup--restore)
6. [🧰 প্রয়োজনীয় কমান্ড চিটশিট (Daily Useful Commands)](#6--প্রয়োজনীয়-কমান্ড-চিটশিট-daily-useful-commands)

---

## 1. 🔄 ভবিষ্যতে কোড আপডেট করার নিয়ম (How to Update Code)

ভবিষ্যতে যখনই আপনি আপনার লোকাল পিসি থেকে গিটহাবে নতুন কোড `git push` করবেন, তখন আপনার লাইভ VPS সার্ভারে আপডেট করার ধাপগুলো নিচে দেওয়া হলো:

### ক. সাধারণ কোড আপডেট (Standard Update - Zero Downtime)
সার্ভারে SSH দিয়ে লগইন করুন এবং প্রজেক্ট ফোল্ডারে ঢুকুন:
```bash
cd /var/www/umi_backend
git pull origin main
docker compose up -d --build
```
> **ব্যাখ্যা:** ডকার স্বয়ংক্রিয়ভাবে পরিবর্তিত ফাইলগুলো রি-বিল্ড করবে এবং সার্ভিস রিস্টার্ট করে দেবে। আগের কোনো ডাটাবেজ ডেটা নষ্ট হবে না।

---

### খ. শুধুমাত্র ব্যাকএন্ড আপডেট হলে (Only Backend Changed)
যদি শুধুমাত্র ব্যাকএন্ড কন্ট্রোলার বা রাউটে কাজ করেন, দ্রুত ডেপ্লয় করতে:
```bash
cd /var/www/umi_backend
git pull origin main
docker compose up -d --build backend
```

---

### গ. শুধুমাত্র অ্যাডমিন প্যানেল আপডেট হলে (Only Admin Panel Changed)
```bash
cd /var/www/umi_backend
git pull origin main
docker compose up -d --build admin-panel
```

---

### ঘ. পরিবেশ ভেরিয়েবল বা `.env` ফাইলে কোনো পরিবর্তন আসলে
যদি `.env`-এ কোনো নতুন ভ্যালু যোগ বা পরিবর্তন করেন:
```bash
cd /var/www/umi_backend
nano .env  # এডিট করে Ctrl + O, Enter এবং Ctrl + X
docker compose up -d
```

---

### ঙ. ডাটাবেজে নতুন টেবিল বা কলাম যোগ হলে (Database Migrations)
`backend/src/db/init.js` ফাইলে সিস্টেম এমনভাবে করা আছে যেন সার্ভার বুট হওয়ার সময় এটি স্বয়ংক্রিয়ভাবে মিসিং টেবিল এবং কলাম চেক করে সিঙ্ক করে নেয়। শুধু ব্যাকএন্ড রিস্টার্ট দিলেই হবে:
```bash
docker compose restart backend
```

---

## 2. ⚙️ `deploy.sh` স্ক্রিপ্ট চালালে কী কী ঘটে (What deploy.sh Does)

আপনি যখন `./deploy.sh` চালান, তখন এটি স্বয়ংক্রিয়ভাবে নিচের ৭টি ধাপ সম্পন্ন করে:

```
[1/7] System Dependencies ➔ apt update, Nginx, Certbot, UFW, Git ইনস্টল
[2/7] Docker Engine       ➔ Docker 24+ এবং Docker Compose v2 অটো-কনফিগারেশন
[3/7] Security & .env     ➔ ক্রিপ্টোগ্রাফিক স্ট্রং পাসওয়ার্ড ও কি জেনারেশন
[4/7] Domain & Free SSL   ➔ Let's Encrypt অটোমেটেড HTTPS ও WSS সার্টিফিকেট সেটআপ
[5/7] Firebase Guard      ➔ umi_firebase.json পুশ নোটিফিকেশন কি ভেরিফিকেশন
[6/7] Nginx Reverse Proxy ➔ WebSocket (/socket.io/) এবং API রাউটিং ও UFW ফায়ারওয়াল
[7/7] Launch Containers   ➔ MySQL, Redis, Backend, Admin Panel বিল্ড ও হেলথ চেক
```

1. **রুট পারমিশন চেক:** নিশ্চিত করে যে স্ক্রিপ্টটি রুট ইউজার দিয়ে চালানো হচ্ছে।
2. **ডকার অটো-ইনস্টল:** আপনার ভিপিএস যদি সম্পূর্ণ ফ্রেশ থাকে, তবে অফিশিয়াল স্ক্রিপ্ট এনে ডকার ও ডকার কম্পোজ ইনস্টল করে সার্ভিস স্টার্ট করে দেয়।
3. **নিরাপদ পাসওয়ার্ড জেনারেশন:** `.env` ফাইলে কোনো ডিফল্ট বা সাধারণ পাসওয়ার্ড থাকলে তা বদলে অত্যন্ত জটিল র্যান্ডম সিক্রেট কি বসিয়ে দেয়।
4. **Nginx রিভার্স প্রক্সি:** হোস্ট সার্ভারের Nginx-এ কনফিগ লিখে দেয় যেন ব্রাউজার ও মোবাইল অ্যাপ পোর্ট ছাড়াই (`https://api.yourdomain.com` বা সরাসরি আইপি দিয়ে) এপিআই, সকেট এবং আপলোড করা ফাইল অ্যাক্সেস করতে পারে।
5. **ফ্রি SSL:** ডোমেইন থাকলে Let's Encrypt থেকে স্বয়ংক্রিয়ভাবে এসএসএল এনে প্রতি ৯০ দিন পর পর অটো-রিনিউ হওয়ার ক্রনজব বসিয়ে দেয়।
6. **ফায়ারওয়াল সিকিউরিটি:** আপনার পোর্ট ২২ (SSH), ৮০ (HTTP) ও ৪৪৩ (HTTPS) খোলা রেখে ডাটাবেজ (৩৩০৬) ও রেডিস (৬৩৭৯) পোর্টকে বাইরের পৃথিবী থেকে লক করে দেয়।

---

## 3. 🛠️ স্ক্রিপ্টে সমস্যা হলে কী করবেন (Troubleshooting & Fallback)

যদি কোনো কারণে স্ক্রিপ্ট ফেইল করে বা কোনো স্টেপে আটকে যায়, নিচের সমাধানগুলো অনুসরণ করুন:

---

### সমস্যা ১: Certbot / SSL ফেইল হয়েছে ("Could not verify domain DNS")
* **কারণ:** আপনার ডোমেইনের DNS A Record এখনও VPS-এর IP অ্যাড্রেসে সঠিকভাবে পয়েন্ট করেনি।
* **সমাধান:** 
  1. আপনার ডোমেইন প্রোভাইডারে (Namecheap, Cloudflare, GoDaddy ইত্যাদি) যান।
  2. `api.yourdomain.com` এবং `admin.yourdomain.com`-এর A Record-এ আপনার VPS IP দিন।
  3. ১০-১৫ মিনিট অপেক্ষা করে DNS আপডেট হলে ম্যানুয়ালি এই কমান্ডটি চালান:
     ```bash
     sudo certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com
     ```

---

### সমস্যা ২: পোর্ট কনফ্লিক্ট ("Port 80 or 443 already in use")
* **কারণ:** সার্ভারে আগে থেকেই কোনো পুরনো Apache বা Nginx ইনস্ট্যান্স পোর্ট আটকে রেখেছে।
* **সমাধান:**
  ```bash
  # কোন প্রসেস পোর্ট ধরে রেখেছে দেখুন:
  sudo lsof -i :80 -i :443
  
  # যদি Apache থাকে যা অপ্রয়োজনীয়:
  sudo systemctl stop apache2 && sudo systemctl disable apache2
  
  # Nginx রিস্টার্ট করুন:
  sudo systemctl restart nginx
  ```

---

### সমস্যা ৩: Firebase Push Notification কাজ করছে না
* **কারণ:** `umi_firebase.json` ফাইলটি সার্ভারে নেই বা ভুল লোকেশনে আছে।
* **সমাধান:**
  1. আপনার লোকাল কম্পিউটার থেকে ফাইলটি VPS-এ পাঠান:
     ```bash
     scp /path/to/umi_firebase.json root@YOUR_SERVER_IP:/var/www/umi_backend/
     ```
  2. ব্যাকএন্ড রিস্টার্ট করুন:
     ```bash
     cd /var/www/umi_backend
     docker compose restart backend
     ```
  3. ব্যাকএন্ডের লগ চেক করুন:
     ```bash
     docker compose logs backend | grep -i firebase
     ```
     `🔥 [Firebase Admin] Initialized successfully` লেখা আসলে পুশ নোটিফিকেশন রেডি!

---

### সমস্যা ৪: স্ক্রিপ্ট Permission Denied দেখালে
* **সমাধান:**
  ```bash
  chmod +x /var/www/umi_backend/deploy.sh
  sudo bash /var/www/umi_backend/deploy.sh
  ```

---

## 4. 📋 সম্পূর্ণ ম্যানুয়াল ডেপ্লয়মেন্ট গাইড (Manual Deployment Guide)

আপনি যদি কোনো স্ক্রিপ্ট ব্যবহার না করে নিজের হাতে ধাপে ধাপে সবকিছু কনফিগার করতে চান:

### ধাপ ১: ডকার ইনস্টল করুন
```bash
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker
```

### ধাপ ২: রিপোজিটরি ক্লোন ও কনফিগারেশন
```bash
git clone https://github.com/Meharab-Islam/umi-live-backend.git /var/www/umi_backend
cd /var/www/umi_backend
cp .env.example .env
nano .env  # আপনার ডোমেইন ও পাসওয়ার্ড সেট করুন
```

### ধাপ ৩: ডকার কনটেইনার চালু করুন
```bash
docker compose up -d --build
docker compose ps
```

### ধাপ ৪: Host Nginx কনফিগারেশন
```bash
sudo nano /etc/nginx/sites-available/umi.conf
```
নিচের ব্লকটি পেস্ট করুন (আপনার ডোমেইন নাম বসিয়ে):
```nginx
server {
    server_name api.yourdomain.com;
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:5050;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5050/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:5050/uploads/;
        proxy_set_header Host $host;
    }
}

server {
    server_name admin.yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```
এনাবল করুন:
```bash
sudo ln -sf /etc/nginx/sites-available/umi.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.yourdomain.com -d admin.yourdomain.com
```

---

## 5. 💾 ডাটাবেজ ব্যাকআপ ও রিস্টোর (MySQL Backup & Restore)

প্রোডাকশন সার্ভারে ডাটাবেজের ব্যাকআপ রাখা খুবই গুরুত্বপূর্ণ:

### ডাটাবেজ ব্যাকআপ নেওয়া (Export .sql):
```bash
cd /var/www/umi_backend
docker compose exec -T mysql mysqldump -u umi_user -pumi_password umi_live > backup_$(date +%F_%T).sql
```

### ব্যাকআপ ফাইল থেকে রিস্টোর করা (Import .sql):
```bash
docker compose exec -T mysql mysql -u umi_user -pumi_password umi_live < your_backup_file.sql
```

---

## 6. 🧰 প্রয়োজনীয় কমান্ড চিটশিট (Daily Useful Commands)

| কাজ | কমান্ড |
| :--- | :--- |
| **সার্ভিসের স্ট্যাটাস দেখা** | `docker compose ps` |
| **ব্যাকএন্ডের লাইভ লগস দেখা** | `docker compose logs -f backend` |
| **অ্যাডমিন প্যানেলের লগস দেখা** | `docker compose logs -f admin-panel` |
| **সমস্ত সার্ভিস রিস্টার্ট দেওয়া** | `docker compose restart` |
| **নতুন কোড টেনে রিবিল্ড করা** | `git pull && docker compose up -d --build` |
| **সার্ভার সাময়িক বন্ধ করা** | `docker compose down` |
| **ডিস্ক ক্লিনআপ (পুরনো ডকার ক্যাশ মোছা)** | `docker system prune -af` |
| **রিসোর্স ব্যবহার দেখা (RAM & CPU)** | `docker stats` |

---

> 💡 **নোট:** এই ফাইলটি রেফারেন্স হিসেবে সবসময় আপনার প্রজেক্টের রুট ডিরেক্টরিতে [DEPLOYMENT_GUIDE.md](file:///Users/kitkat/development/projects/umi_backend/DEPLOYMENT_GUIDE.md) হিসেবে সংরক্ষিত রয়েছে।
