# Koperasi Sinar Pagi Sejahtera — Web Agribisnis Terintegrasi

Platform digital modern untuk **Koperasi Produsen Pertanian Sinar Pagi Sejahtera** di Kabupaten Minahasa Utara, Sulawesi Utara. Sistem ini menghubungkan petani binaan, pengurus koperasi, dan pembeli/konsumen secara transparan, akuntabel, dan terintegrasi.

---

## 📚 Dokumentasi Arsitektur & Teknis

Repositori ini telah dilengkapi dengan dokumentasi arsitektur dan spesifikasi teknis mendalam:

1. 🏛️ **[ARSITEKTUR.md](file:///d:/Koperasi_Tani/ARSITEKTUR.md)**  
   *Arsitektur Sistem Keseluruhan, High-Level Flow, Security (RBAC, JWT, Cloudflare WAF), Monitoring (Uptime Kuma, Sentry), dan Hak Akses Peran.*

2. ⚡ **[DEPLOYMENT_DAN_SKALABILITAS.md](file:///d:/Koperasi_Tani/DEPLOYMENT_DAN_SKALABILITAS.md)**  
   *Panduan Rencana Deployment Produksi, Arsitektur Load Balancer (Nginx/Cloudflare), serta 5 Lapis Optimasi Database (Query Indexing, Redis Cache-Aside, Connection Pooling PgBouncer, Sharding, dan Read Replicas 1 Primary + 2 Replicas).*

---

## 🛠️ Tech Stack

* **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, Shadcn UI, Lucide Icons.
* **Backend**: NestJS REST API, Next.js API Routes, NextAuth.js.
* **Database & ORM**: PostgreSQL 16, Prisma ORM.
* **Cache & Storage**: Redis 7, Cloudflare R2 / Object Storage, Wasabi Backup.
* **DevOps & Container**: Docker Compose, Nginx Reverse Proxy & Load Balancer.

---

## 🚀 Menjalankan Project (Lokal)

### 1. Database & Cache
Pastikan Docker Desktop aktif, lalu jalankan:
```bash
docker compose up -d
```
* PostgreSQL aktif di port `5433` (atau sesuai konfigurasi `.env`).
* Redis aktif di port `6379`.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Akses web aplikasi di `http://localhost:3000`.

### 3. Backend (NestJS)
```bash
cd backend
npm install
npm run start:dev
```

### 4. Prisma Studio (Database GUI)
```bash
npx prisma studio
```
Akses Prisma Studio di `http://localhost:5555`.
