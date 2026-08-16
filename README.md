# Exam Duty Allotment System — Erode CEO Office

[![CI Build & Automated Tests](https://github.com/Jebarson-10/Exam-duty-allottment/actions/workflows/ci.yml/badge.svg)](https://github.com/Jebarson-10/Exam-duty-allottment/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Cloudflare Pages](https://img.shields.io/badge/Hosted%20on-Cloudflare%20Pages-F38020?logo=cloudflare)](https://pages.cloudflare.com)
[![Target Cost: Rs. 0/mo](https://img.shields.io/badge/Monthly%20Cost-Rs.%200%20(Indefinitely)-brightgreen)]()

An automated, constraint-solving exam duty allotment and administration platform built for the **Chief Educational Officer (CEO) Office, Erode District, Department of School Education, Government of Tamil Nadu**.

---

## 🏛️ System Overview & Core Capabilities

The portal automates three primary examination modules across ~12–15 blocks, ~350 examination centres, and thousands of teaching staff:

1. **Theory Duty Engine (12th / 11th / 10th Public Exams)**:
   - **Exclusion rules**: Headmasters (HMs) excluded from own school and from all clubbed schools sharing that centre.
   - **2-Year No-Repeat Rule**: Staff who served at a centre within the last 2 years are strictly barred from that same centre.
   - **Proximity check**: Distance evaluated using the geodesic **Haversine formula** ($\le 10\text{ km}$ from either residence or parent school).
   - **Seniority-based Fallback**: If HMs are insufficient in a block, falls back automatically to senior PG Assistants strictly ordered by district seniority rank (#1 = senior-most).
   - **Chief & Department Officers**: Chief Superintendent assigned to Principal/HM (or senior PG), Department Officer assigned to senior PG Assistant.

2. **Practical Duty Engine**:
   - **Batch partitioning**: Splits student strength into standard 50-student batches (or proportional sizes across Physics, Chemistry, Biology, Computer Science, and Vocational streams).
   - **Parallel sessions**: Generates concurrent Morning (FN) and Afternoon (AN) batches across science laboratories.
   - **Paired Examiner Role Swapping**: Enforces automatic year-over-year role alternation (if Teacher A was Internal and Teacher B was External last year, their roles swap this year).
   - **Target window**: Enforces completion within the mandatory 2–3 day school window.

3. **Hall Invigilation Engine**:
   - **Hall calculation**: Allocates 1 invigilator per hall ($\text{Halls} = \lceil \text{Total Students} / 20 \rceil$).
   - **10% Emergency Standby Pool**: Reserves a dedicated standby buffer for each centre.
   - **Exemption Filtering**: Physically challenged, medical board certified, and retiring staff are automatically excluded.

4. **Interactive Leaflet GPS Coordinate Capture**:
   - OpenStreetMap tiles centered on Erode District ($11.3418^\circ\text{N}, 77.7212^\circ\text{E}$).
   - Visual 10 km catchment circles around examination centres.
   - Click-to-pin coordinate editor for schools and centres.

5. **Official Proceedings & Reporting Suite**:
   - **Official CEO Office Appointment Orders**: Generates print-ready PDF appointment orders with official Government of Tamil Nadu headers, reference numbers, mandatory instructions, and digital verification seal.
   - **Master Allotment Charts**: Generates landscape master charts for CEO/DEO monitoring.
   - **Multi-Sheet Excel Workbook (`.xlsx`)**: Master roster, centre summaries, and school-wise relieved faculty lists.

6. **Real-time Conflict Inspector & Manual Override**:
   - Allows administrators to manually swap or reassign staff while auditing distance violations, double-booking, and own-school conflicts with mandatory audit justification logging.

---

## ⚡ Architecture & Rs. 0/Month Infrastructure

Because exam duty allotment usage is bursty (heavy activity for a few weeks before exams, idle the rest of the year), the stack is specifically engineered to run on **Cloudflare's Free Tier with zero pause/sleep behavior**:

| Layer | Service | Free Tier Ceiling | Erode Actual Load |
|---|---|---|---|
| Frontend Hosting | **Cloudflare Pages** | Unlimited static requests, 500 builds/mo | ~30 builds/year |
| API Layer | **Pages Functions** (Workers) | 100,000 req/day, 10ms CPU/req | Low hundreds per session |
| Database | **Cloudflare D1** (SQLite) | 5 GB storage, ~5M reads/day, 100k writes/day | ~3 MB total data |
| Backups & Archive | **Cloudflare R2** | 10 GB storage, 1M writes/mo | Weekly snapshot archives |
| Map Engine | **Leaflet.js + OSM** | Free, zero API key needed | Instant client-side render |

### Backend API (Pages Functions)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | GET | Liveness + D1 connectivity probe |
| `/api/sync` | GET | Pull the full district dataset from D1 |
| `/api/sync` | POST | Atomically push a full district snapshot to D1 |
| `/api/schools` `/api/centres` `/api/teachers` | GET/POST | Per-entity CRUD for external integrations |

### Offline-First Synchronisation

On startup the portal probes `/api/health`. When the serverless backend is reachable it hydrates from `/api/sync` (cloud wins) and every subsequent mutation is debounced-pushed to D1 automatically — the header shows a live **Cloud Synced · D1** badge. With no backend deployed (e.g. `npm run dev` without Wrangler, or GitHub Pages hosting) the portal runs unchanged in **Local-First Standalone Mode** backed by browser localStorage, and the header shows **Local-First Mode**. The first deployment against an empty D1 seeds the cloud from the local dataset.

### Deterministic Client-Side Solving
To never exceed Cloudflare Workers' 10ms CPU limit, **the constraint-solving engine runs entirely in the browser**. A dataset of several thousand teachers and 350 centres executes in sub-second time without server timeouts, and the final solution is persisted in one batch write.

---

## 🚀 Quick Start & Local Development

### 1. Prerequisites
- Node.js $\ge 18.0.0$
- npm $\ge 9.0.0$

### 2. Installation & Running Locally
```bash
# Clone repository
git clone https://github.com/Jebarson-10/Exam-duty-allottment.git
cd erode-exam-duty-allotment

# Install dependencies
npm install

# Start local development server
npm run dev
```
Open `http://localhost:3000` in your browser. The application runs immediately in **Local-First Standalone Mode** pre-seeded with authentic Erode district blocks, schools, centres, and faculty data!

---

## 🧪 Running Automated Tests

```bash
# Run Vitest test suite
npm run test

# Run tests in watch mode
npm run test:watch
```

---

## 📦 Cloudflare D1 Deployment Guide

### 1. Initialize Cloudflare D1 Database
```bash
# Install Wrangler CLI globally (if not installed)
npm install -g wrangler

# Login to your Cloudflare account (Free Tier)
wrangler login

# Create D1 SQLite database
wrangler d1 create erode-exam-duty-db
```

### 2. Apply Database Schema & Migrations
```bash
# Apply schema to remote D1 database
wrangler d1 execute erode-exam-duty-db --file=./schema.sql
```

### 3. Deploy to Cloudflare Pages
```bash
# Build production bundle
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=erode-exam-duty-allotment
```

---

## 📊 Database Relational Schema

```sql
schools        (id, name, address, lat, lng, block_id, type, studentStrength10th, studentStrength12th)
blocks         (id, name, code)
centres        (id, name, address, lat, lng, block_id, capacity, total_halls, clubbed_school_ids)
teachers       (id, name, gender, school_id, subject, designation, seniority_rank, date_of_joining, home_lat, home_lng, is_exempted, exemption_reason, phone, email)
duty_history   (id, teacher_id, year, duty_type, centre_id, role, subject)
duty_allotment (id, teacher_id, centre_id, duty_type, role, subject, exam_cycle_id, date, session, hall_number, distance_km, is_manual_override, override_reason, status)
exam_cycles    (id, label, standard, start_date, end_date, is_active)
batches        (id, school_id, centre_id, subject, size, session, day, exam_cycle_id)
audit_logs     (id, user_email, action, details, timestamp, ip_address)
```

---

## 🔒 Security, Auditability & Exemption Safeguards

- **Audit Trail**: Every generation, manual swap, override justification, and snapshot restore is recorded with timestamp and operator ID.
- **Strict Exemption Filtering**: Staff marked with medical board exemptions or locomotor disability cannot be allotted by automated engines.
- **Conflict Warning Badges**: Immediate visual alerts if travel distance exceeds 10 km or if staff are allotted to duplicate sessions.

---

## 📄 License
Released under the [MIT License](LICENSE). Built for the Chief Educational Officer (CEO) Office, Erode District, Government of Tamil Nadu.
