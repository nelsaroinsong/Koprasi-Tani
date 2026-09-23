# Arsitektur Sistem Koperasi Sinar Pagi Sejahtera

## Overview

Sistem Koperasi Sinar Pagi Sejahtera dibangun menggunakan arsitektur modern berbasis service-oriented application dengan pemisahan Frontend, Backend, Database, Cache, dan layanan pihak ketiga untuk memastikan performa, keamanan, dan skalabilitas.

Teknologi utama:

* Frontend: Next.js + Tailwind CSS
* Admin Panel: Next.js + Shadcn UI + Tailwind CSS
* Backend API: NestJS
* Database: PostgreSQL
* Cache & Queue: Redis
* Authentication: Passport.js + JWT + Google OAuth
* Payment Gateway: Midtrans
* Reverse Proxy & SSL: Cloudflare
* Backup Storage: Wasabi
* Containerization: Docker & Docker Compose

---

# High Level Architecture

```mermaid
flowchart TB

    USER[Anggota / Pembeli]
    FARMER[Petani]
    ADMIN[Admin Koperasi]

    CF[Cloudflare SSL + WAF]

    USER --> CF
    FARMER --> CF
    ADMIN --> CF

    CF --> FE[Frontend Next.js]
    CF --> AP[Admin Panel Next.js]

    FE --> API[NestJS REST API]
    AP --> API

    API --> AUTH[JWT Authentication]
    API --> REDIS[(Redis Cache)]
    API --> DB[(PostgreSQL)]

    API --> MIDTRANS[Midtrans QRIS]

    DB --> BACKUP[Backup Service]
    BACKUP --> WASABI[Wasabi Storage]
```

---

# Deployment Architecture

```mermaid
flowchart TB

    INTERNET[Internet]
    INTERNET --> CLOUDFLARE[Cloudflare]

    CLOUDFLARE --> VPS[VPS Biznet Gio]

    subgraph Docker Environment

        NGINX[Nginx Reverse Proxy]

        FRONTEND[Next.js Frontend]
        ADMINPANEL[Next.js Admin Panel]
        BACKEND[NestJS API]

        REDIS[(Redis)]
        POSTGRES[(PostgreSQL)]

    end

    NGINX --> FRONTEND
    NGINX --> ADMINPANEL

    FRONTEND --> BACKEND
    ADMINPANEL --> BACKEND

    BACKEND --> REDIS
    BACKEND --> POSTGRES
```

---

# Monitoring & Reliability

```mermaid
flowchart LR

    APP[NestJS & Next.js]

    APP --> SENTRY[Sentry Error Tracking]

    APP --> LOGGER[Centralized Logging]

    VPS --> UPTIME[Uptime Kuma]

    GITHUB[GitHub Actions]

    GITHUB --> DEPLOY[Auto Deploy]

    DEPLOY --> VPS
```

Monitoring stack:

* Uptime Kuma / UptimeRobot
* Sentry
* Grafana Loki / Papertrail
* GitHub Actions
* Docker Health Check

---

# Security Architecture

```mermaid
flowchart TB

    USER[User]

    USER --> CLOUDFLARE[Cloudflare WAF]

    CLOUDFLARE --> JWT[JWT Authentication]

    JWT --> RBAC[RBAC Authorization]

    RBAC --> API[NestJS API]

    API --> LOG[Audit Log]

    API --> MFA[2FA]

    ADMIN[Admin]

    ADMIN --> IPWL[IP Whitelist]

    IPWL --> API

    API --> DB[(PostgreSQL)]
```

Security Features:

* JWT Authentication
* Google OAuth
* Role Based Access Control (RBAC)
* Audit Log
* Two-Factor Authentication (2FA)
* Maker Checker Approval
* IP Whitelisting Admin
* CSP Header
* HSTS Header
* Secrets Management

---

# Role & Access Management

## Admin Koperasi

Hak akses:

* Kelola petani
* Kelola pembeli
* Kelola produk
* Kelola transaksi
* Approval pengguna
* Laporan keseluruhan

## Petani / Penjual

Hak akses:

* Kelola produk
* Kelola stok
* Kelola pesanan
* Melihat pendapatan
* Riwayat penjualan

## Pembeli

Hak akses:

* Cari produk
* Checkout
* Pembayaran QRIS
* Tracking pesanan
* Riwayat pembelian
* Rating dan ulasan

---

# Performance Optimization & High Scalability

* **Load Balancing**: Nginx Load Balancer (`least_conn` & `round-robin`) untuk cluster multi-container Next.js & NestJS.
* **Database Query & Indexing**: B-Tree & compound indexing pada kolom filter utama (`role`, `isVerified`, `createdAt`) dan server-side pagination (`skip`/`take`).
* **Redis Caching**: Cache-Aside pattern untuk data katalog produk, kelompok tani, profil, dan session store (TTL 15-60 menit).
* **Connection Pooling**: PgBouncer / Prisma Connection Pool untuk efisiensi koneksi konkuren tinggi tanpa kehabisan thread memori.
* **Database Partitioning & Sharding**: Range partitioning pada tabel transaksi (`transactions_2026_q1`, dll.) dan sharding berbasis wilayah.
* **Read Replicas (1 Primary + 2 Replicas)**: Pemisahan Write (Master) dan Read (Replica 1 & Replica 2) untuk menangani beban tinggi secara horizontal.
* **Network & Aset**: Cloudflare CDN & WAF, Next.js Image Optimization, Code Splitting, Lazy Loading, serta kompresi Brotli & Gzip.

> Detail implementasi teknis, konfigurasi Nginx upstream, dan setup Docker Compose dapat dibaca di file [DEPLOYMENT_DAN_SKALABILITAS.md](file:///d:/Koperasi_Tani/DEPLOYMENT_DAN_SKALABILITAS.md).

---

# Backup Strategy

Standar Backup: 3-2-1 Backup Strategy

* 3 salinan data
* 2 media penyimpanan berbeda
* 1 salinan berada di lokasi berbeda

Primary Storage:

* PostgreSQL

Backup Storage:

* Wasabi Object Storage

Backup Schedule:

* Daily Database Backup
* Weekly Full Backup
* Monthly Archive Backup

---

# Infrastruktur Awal

| Komponen   | Spesifikasi          |
| ---------- | -------------------- |
| VPS        | 4 vCPU               |
| RAM        | 8 GB                 |
| Storage    | SSD                  |
| Database   | PostgreSQL           |
| Cache      | Redis                |
| SSL        | Cloudflare           |
| Container  | Docker Compose       |
| Backup     | Wasabi               |
| Monitoring | Uptime Kuma + Sentry |

Target kapasitas awal:

* > 2000 anggota aktif
* Dapat ditingkatkan secara horizontal ketika trafik meningkat
* Siap untuk migrasi ke Docker Swarm atau Kubernetes apabila skala sistem bertambah besar

```

Dokumen ini disusun dari spesifikasi stack, monitoring, optimasi, keamanan, dan role yang terdapat pada file yang Anda unggah.

Jika ingin untuk GitHub repository, saya juga bisa membuat versi yang lebih lengkap dengan **C4 Diagram, ERD PostgreSQL, dan folder structure NestJS + Next.js monorepo**.
```
