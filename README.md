# Complete README.md

Replace the entire contents of `README.md` with this:

```markdown
# SmileScan by Carestack

**A 2-minute AI-powered oral health screening widget that turns anonymous website visitors into triaged, contactable leads for Carestack clinics.**

Built for Carestack's hackathon — addresses Problem Statement 1 (Oral Health Screening Widget) with a B2B SaaS framing designed for Carestack's clinic network.

---

## The Problem

Carestack's dental practices spend lakhs on patient acquisition. The bottleneck isn't traffic — it's **qualifying** it:

- Half of website visitors bounce without identifying a need
- Reception staff waste time on unqualified calls
- Patients with visible dental issues sit at home, unsure if it's worth a visit

Meanwhile, no acquisition tool tells a practice **who to call and why**.

---

## The Solution

A white-label screening widget any Carestack clinic can embed on their own website. Patients get a free 2-minute oral health check. The clinic gets a triaged lead in a live operations dashboard — with a name, phone number, and the specific findings that prompted the visit.

**The dashboard is the product. The widget is how patients arrive.**

---

## Live Demo

- **Patient view:** `https://your-deployment-url.vercel.app`
- **Clinic console:** `https://your-deployment-url.vercel.app/metrics`

---

## Key Features

### Patient Experience
- **Guided 5-photo capture** — live face detection frames each shot correctly
- **Real-time feedback** — "Move closer", "Open wider", "Hold still" prompts
- **Instant AI report** — findings with severity, confidence, and location
- **Visual annotations** — bounding boxes on photos showing what was detected
- **Digital smile design** *(planned)* — treatment simulation preview
- **One-tap booking** — pre-filled consultation request to the nearest clinic
- **Privacy controls** — delete photos on demand; auto-purge if no booking

### Clinic Dashboard
- **Live leads table** — every screening, newest first, with contact info
- **Send SMS** — one tap opens messaging app with pre-filled outreach
- **Triage-aware prioritization** — urgent findings surfaced first
- **Conversion analytics** — booking rate, triage distribution, pipeline value
- **Report link** — open any patient's full report in a new tab

### AI Pipeline
- **Vision-language analysis** — Agnes AI's `agnes-2.5-flash` via OpenAI-compatible API
- **Structured JSON output** — findings with type, severity, confidence, and bounding box
- **Safety guardrails** — prompt forbids diagnostic language ("cavity", "caries")
- **Confidence filtering** — only findings ≥ 0.8 shown in the UI
- **SHA-256 cache** — repeat screenings cost zero AI tokens
- **Graceful degradation** — partial results returned with warnings if some images fail

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 + shadcn/ui patterns |
| **State** | Zustand |
| **Icons** | Lucide React |
| **Face Detection** | MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) |
| **Image Processing** | sharp |
| **Database** | Supabase Postgres |
| **File Storage** | Supabase Storage (private bucket) |
| **AI Model** | Agnes AI — `agnes-2.5-flash` (OpenAI-compatible) |
| **Hosting** | Vercel |
| **Package Manager** | npm |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      PATIENT (browser/phone)                 │
│                                                              │
│  Landing → Prepare → Scan (5 photos) → Review → Report      │
│                          │                                   │
│                          ├─ MediaPipe face detection         │
│                          ├─ On-device quality checks         │
│                          └─ Capture to canvas → base64       │
└──────────────────────────┬───────────────────────────────────┘
                           │ POST multipart/form-data
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                   NEXT.JS API ROUTES (Vercel)                │
│                                                              │
│  /api/screen   →  Preprocess → Hash → Cache check            │
│                   → Agnes AI (5 parallel-ish calls)          │
│                   → Aggregate → Guardrails → Persist         │
│                                                              │
│  /api/report/[id]           →  Fetch report + signed URLs    │
│  /api/report/[id]/purge     →  Delete photos from storage    │
│  /api/book                  →  Create booking lead           │
│  /api/leads                 →  Dashboard leads list          │
│  /api/metrics               →  Aggregate analytics           │
│  /api/health                →  Connectivity check            │
└──────────────────────────┬───────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
    ┌──────────────────┐      ┌──────────────────┐
    │  Supabase DB     │      │  Supabase Storage│
    │  ─ assessments   │      │  ─ oral-scans    │
    │  ─ images        │      │    (private)     │
    │  ─ bookings      │      │                  │
    │  ─ analysis_cache│      │  Signed URLs     │
    └──────────────────┘      │  (1hr expiry)    │
                              └──────────────────┘
```

---

## Database Schema

### `assessments`
One row per screening session.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `user_email` | TEXT | Optional, captured before unlock |
| `created_at` | TIMESTAMPTZ | |
| `triage_level` | TEXT | `routine` \| `soon` \| `urgent` |
| `report_json` | JSONB | Full report snapshot |

### `images`
One row per captured photo.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `assessment_id` | UUID | FK to `assessments`, cascade delete |
| `angle` | TEXT | `front-smile`, `upper-arch`, `lower-arch`, `left-bite`, `right-bite` |
| `storage_path` | TEXT | Nullable (null after purge) |
| `quality_score` | FLOAT | AI's assessment of image quality (0–1) |
| `created_at` | TIMESTAMPTZ | |

### `analysis_cache`
Deduplicates AI calls by image hash.

| Column | Type | Notes |
|--------|------|-------|
| `image_hash` | TEXT | Primary key, SHA-256 of processed image |
| `angle` | TEXT | |
| `model` | TEXT | Which AI model produced this result |
| `analysis_json` | JSONB | Full `ImageAnalysis` object |
| `created_at` | TIMESTAMPTZ | |

### `bookings`
Conversion events — each row is a qualified lead.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `assessment_id` | UUID | FK to `assessments`, cascade delete |
| `name` | TEXT | Required |
| `phone` | TEXT | Required |
| `email` | TEXT | Optional |
| `preferred_clinic` | TEXT | Optional |
| `notes` | TEXT | Optional |
| `status` | TEXT | `pending` \| `contacted` \| `scheduled` \| `cancelled` |
| `created_at` | TIMESTAMPTZ | |

### Storage Bucket
**`oral-scans`** — private bucket. Layout:

```
oral-scans/
└── <assessment-uuid>/
    ├── front-smile.jpg
    ├── upper-arch.jpg
    ├── lower-arch.jpg
    ├── left-bite.jpg
    └── right-bite.jpg
```

Photos are served via **signed URLs** with 1-hour expiry.

---

## API Reference

All endpoints return JSON. Errors follow `{ "error": "message" }`.

### `POST /api/screen`
Analyze 5 photos and generate a screening report.

**Request:** `multipart/form-data`

| Field | Type | Required |
|-------|------|----------|
| `front-smile` | File | ✅ |
| `upper-arch` | File | ✅ |
| `lower-arch` | File | ✅ |
| `left-bite` | File | ✅ |
| `right-bite` | File | ✅ |
| `email` | string | Optional |

**Constraints:**
- Each file: max 10 MB, `image/*` mime type
- All 5 angles required

**Response:**
```json
{
  "assessmentId": "uuid",
  "triageLevel": "routine" | "soon" | "urgent",
  "summary": "Plain-language summary",
  "findings": [
    {
      "type": "discoloration",
      "location": "upper anterior",
      "severity": "mild",
      "confidence": 0.85,
      "evidence": "Yellowish staining on labial surfaces",
      "bounding_box": [ymin, xmin, ymax, xmax],
      "angle": "front-smile"
    }
  ],
  "alert": "Optional urgent message" | null,
  "disclaimer": "This is a screening tool...",
  "imagesAnalyzed": 5,
  "imagesSkipped": 0,
  "warnings": ["optional array of per-image failures"]
}
```

### `GET /api/report/[id]`
Fetch a report by assessment UUID.

**Response:** Same shape as `/api/screen` plus `email`, `createdAt`, `photos[]`, `photosDeleted`.

**Error codes:**
- `400` — malformed UUID
- `404` — assessment not found
- `500` — database error

### `POST /api/report/[id]/purge`
Delete all photos for an assessment from storage. Keeps the report and the `images` rows (with `storage_path` nulled).

**Response:**
```json
{
  "assessmentId": "uuid",
  "deleted": true,
  "message": "Photos deleted. Your report remains available."
}
```

### `POST /api/book`
Create a booking request.

**Request:** `application/json`

```json
{
  "assessmentId": "uuid",
  "name": "Priya Sharma",
  "phone": "+91 98765 43210",
  "email": "priya@example.com",
  "preferredClinic": "Koramangala, Bangalore",
  "notes": "Available weekday evenings"
}
```

**Validation:**
- `name` — min 2 characters
- `phone` — min 10 digits
- `email` — valid format if provided

**Response:**
```json
{
  "bookingId": "uuid",
  "status": "pending",
  "createdAt": "ISO timestamp",
  "assessmentId": "uuid",
  "message": "Your consultation request has been received..."
}
```

### `GET /api/leads?limit=20&offset=0`
Paginated list of assessments with attached booking info.

**Response:**
```json
{
  "leads": [
    {
      "assessmentId": "uuid",
      "createdAt": "ISO timestamp",
      "triageLevel": "soon",
      "email": "user@example.com",
      "booking": {
        "id": "uuid",
        "name": "Priya Sharma",
        "phone": "+91 98765 43210",
        "status": "pending",
        "preferredClinic": "Koramangala",
        "createdAt": "ISO timestamp"
      } | null
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

### `GET /api/metrics`
Aggregate analytics for the dashboard.

**Response:**
```json
{
  "assessments": {
    "total": 42,
    "byTriage": { "routine": 20, "soon": 14, "urgent": 8 }
  },
  "bookings": {
    "total": 12,
    "byStatus": { "pending": 10, "contacted": 2, "scheduled": 0, "cancelled": 0 }
  },
  "conversion": {
    "bookingRate": 0.29,
    "bookingRateByTriage": { "routine": 0.15, "soon": 0.36, "urgent": 0.63 }
  },
  "cache": {
    "uniqueImagesAnalyzed": 87,
    "totalAnalyses": 203,
    "cacheHitRate": 0.57
  },
  "recent": { "last24hAssessments": 5, "last24hBookings": 2 },
  "generatedAt": "ISO timestamp"
}
```

### `GET /api/health`
Connectivity check for Supabase and Agnes AI.

**Response:**
```json
{ "supabase": "connected", "agnes": "ok" }
```

---

## AI Pipeline

### Prompt Strategy
The screening prompt (`lib/screening.ts`) enforces:

- **10 allowed finding types:** `discoloration`, `crowding`, `spacing`, `wear`, `chip`, `gum_inflammation`, `plaque`, `tartar`, `dark_spot`, `missing_tooth`
- **3 severity levels:** `mild`, `moderate`, `severe`
- **Structured JSON output** with bounding boxes normalized 0–1000
- **Explicit prohibition** on diagnostic terms ("cavity", "caries", "disease")
- **Mandatory disclaimer** on every report

### Aggregation Logic
- Deduplicates findings by `(type, location)` — keeps highest confidence
- Skips images with quality score < 0.4
- Sorts by severity, then confidence

### Safety Guardrails
Automatic triage escalation based on findings:

| Rule | Result |
|------|--------|
| 2+ severe findings OR acute keyword (`abscess`, `pus`, `severe pain`, `trauma`, `facial swelling`) | `urgent` |
| 1 severe finding OR confidence ≥ 0.85 OR moderate+ dark spot OR concern keyword (`bleeding`, `swelling`, `receding`, `exposed`) on non-mild finding | `soon` |
| Otherwise | `routine` |

### Caching
Every processed image gets a SHA-256 hash. Before calling Agnes:
1. Compute hash of processed image bytes
2. Check `analysis_cache` for existing result
3. **Cache hit** → return stored JSON, zero AI cost
4. **Cache miss** → call Agnes, then store result

This makes repeat screenings effectively free — a key economic advantage.

---

## Privacy & Security

### Photo Handling
- **Private storage bucket** — no public access
- **Signed URLs** — 1-hour expiry, generated on demand
- **User-controlled deletion** — "Delete my photos" button purges files instantly
- **Retention policy** — photos auto-delete after 24 hours if no booking is made
- **Booking consent** — photos shared only with the clinic the patient chooses

### Data Minimization
- Face images are never stored — only mouth-region photos
- Face detection runs entirely in the browser (MediaPipe) — no face data leaves the device
- After purge, `images` rows remain for analytics but contain no file reference

### Secrets
- `SUPABASE_SERVICE_ROLE_KEY` — backend-only, never exposed to browser
- `AGNES_API_KEY` — backend-only
- All secrets in Vercel environment variables, never in git

### Compliance Posture
- Every report includes a mandatory disclaimer: **"This is a screening tool, not a diagnosis."**
- Prompt-level prohibition on diagnostic language
- Confidence threshold (≥ 0.8) filters out uncertain findings
- Explicit user consent before sharing with a clinic

---

## Local Development

### Prerequisites
- Node.js 20 LTS or higher
- npm
- A Supabase project (free tier works)
- An Agnes AI API key (free tier, unlimited requests)

### Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MadhavPraveenfr/SmileScan.git
   cd SmileScan
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env.local` from the template:**
   ```bash
   cp .env.example .env.local
   ```

   Then fill in the three values:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   AGNES_API_KEY=sk-your-agnes-key
   ```

4. **Set up the database schema:**
   Open Supabase SQL Editor and run the SQL from the "Database Schema" section above.

5. **Create the storage bucket:**
   In Supabase Storage, create a bucket named `oral-scans`. Keep it **private**.

6. **Run the dev server:**
   ```bash
   npm run dev
   ```

7. **Verify everything works:**
   ```
   http://localhost:3000/api/health
   ```
   Should return: `{"supabase":"connected","agnes":"ok"}`

### Testing the Pipeline

Use the `test-screen.http` file with the **REST Client** VS Code extension. It includes 10 test cases covering:
- Health check
- Full screening pipeline
- Report fetch (success, 404, 400)
- Booking (success, missing fields, invalid ID)
- Metrics

---

## Deployment

### Vercel (recommended)

1. Push the repository to GitHub
2. Import the project at `vercel.com/new`
3. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `AGNES_API_KEY`
4. Deploy

Every push to `main` auto-deploys.

### Required Supabase Settings

The schema must be applied to the Supabase project **before** the app will work. See "Database Schema" above.

The `storage_path` column in `images` must be **nullable** (for the purge feature):
```sql
ALTER TABLE images ALTER COLUMN storage_path DROP NOT NULL;
```

---

## Project Structure

```
caresmile-backend/
├── app/
│   ├── api/
│   │   ├── book/route.ts              # Booking creation
│   │   ├── health/route.ts            # Connectivity check
│   │   ├── leads/route.ts             # Dashboard leads list
│   │   ├── metrics/route.ts           # Aggregate analytics
│   │   ├── report/[id]/
│   │   │   ├── route.ts               # Report fetch
│   │   │   └── purge/route.ts         # Photo deletion
│   │   └── screen/route.ts            # Main screening pipeline
│   ├── metrics/page.tsx               # Clinic console (leads + analytics)
│   ├── prepare/page.tsx               # Preparation tips
│   ├── report/[id]/page.tsx           # Patient report display
│   ├── review/page.tsx                # Photo review + submit
│   ├── scan/
│   │   ├── page.tsx                   # Suspense wrapper
│   │   └── scan-inner.tsx             # Camera flow
│   ├── globals.css                    # Carestack theme tokens
│   ├── layout.tsx
│   └── page.tsx                       # Landing
├── components/
│   ├── report/
│   │   ├── booking-cta.tsx
│   │   ├── finding-card.tsx
│   │   ├── photo-gallery.tsx
│   │   └── smile-design.tsx
│   ├── scan/
│   │   ├── camera-view.tsx
│   │   ├── feedback-banner.tsx
│   │   ├── guide-overlay.tsx
│   │   └── scan-header.tsx
│   └── ui/
│       ├── button.tsx
│       ├── card.tsx
│       └── triage-badge.tsx
├── lib/
│   ├── hooks/use-camera.ts            # getUserMedia wrapper
│   ├── vision/face-detector.ts        # MediaPipe wrapper
│   ├── cn.ts                          # className helper
│   ├── scan-steps.ts                  # 5-angle configuration
│   ├── scan-store.ts                  # Zustand state
│   └── screening.ts                   # Prompt + aggregation + guardrails
├── public/
├── .env.example
├── .gitignore
├── next.config.ts
├── package.json
├── test-screen.http
└── tsconfig.json
```

---

## Design System

Carestack brand palette (in `app/globals.css`):

| Token | Value | Use |
|-------|-------|-----|
| `--color-ink` | `#0F1F18` | Primary text |
| `--color-regal` | `#1B3D2F` | Dark accents, primary surfaces |
| `--color-regal-soft` | `#EAF3EC` | Soft sage backgrounds |
| `--color-lime` | `#C8F169` | **Primary CTAs** |
| `--color-emerald` | `#12A67A` | Success states |
| `--color-amber` | `#D69E2E` | Warning / "soon" triage |
| `--color-coral` | `#E53E3E` | Error / "urgent" triage |
| `--color-canvas` | `#F7F7F2` | Page background |
| `--color-border` | `#E5E8E1` | Borders |

Typography: **Inter** via `next/font/google`.

---

## Why This Isn't eDentist

| | eDentist | SmileScan |
|---|---|---|
| **Model** | Standalone consumer app | White-label widget for clinic websites |
| **Destination** | Patients go to eDentist | Patients stay on the practice's site |
| **Value to clinic** | Referral source | Direct lead in their CRM |
| **Business** | Direct-to-consumer | B2B SaaS sold by Carestack |

**eDentist is a destination. SmileScan is an acquisition engine.**

---

## Roadmap

Things intentionally scoped out of the hackathon build:

- **Full Digital Smile Design** — 3D scans + CAD manipulation (current version is CSS-filter simulation)
- **Automated retention cron** — `pg_cron` job to purge photos older than 24h (currently user-initiated only)
- **Carestack CRM integration** — push leads directly into Carestack's patient records via API
- **Multi-clinic routing** — geo-match patients to the nearest Carestack clinic
- **Async analysis queue** — Redis-based worker for very high traffic
- **Paid AI tier** — swap Agnes free tier for a paid tier with SLA guarantees
- **Email/SMS confirmation** — transactional emails via Resend/Postmark

---

## Acknowledgments

- **Carestack** — for the problem statement and brand inspiration
- **Agnes AI** — for unlimited free vision inference
- **Supabase** — for a generous free tier that handled everything
- **MediaPipe** — for on-device face detection
- **Vercel** — for instant Next.js deploys

---

## License

Built for the Carestack hackathon. Not licensed for commercial use.
```

Save. Then commit and push:

```bash
git add README.md
git commit -m "Rewrite README with full project documentation"
git push
```

Vercel doesn't rebuild on README-only changes but the GitHub repo will show the new version immediately.