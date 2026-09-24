# Curify AI — Healthcare Financing & Clinical Underwriting Platform

> **Curify AI** is a full-stack intelligent medical financing and clinical decision-support platform built as a **7th semester college project**. It bridges patient healthcare inquiries, procedure cost estimation, NABH-accredited hospital discovery across Indian cities, and lender underwriting for medical loans.

---

## 📑 Table of Contents

1. [AI & LLM Context Primer](#-ai--llm-context-primer)
2. [End-to-End System Workflows & User Journeys](#-end-to-end-system-workflows--user-journeys)
3. [Tech Stack & Architecture](#-tech-stack--architecture)
4. [Project Structure](#-project-structure)
5. [Implemented Features — Frontend](#-implemented-features--frontend)
6. [Implemented Features — Backend](#-implemented-features--backend)
7. [Database Schema](#-database-schema)
8. [API Endpoints Reference](#-api-endpoints-reference)
9. [Authentication Flow](#-authentication-flow)
10. [City-Specific Hospital Data](#-city-specific-hospital-data)
11. [What is Pending / Incomplete](#-what-is-pending--incomplete)
12. [Known Issues & Gotchas](#-known-issues--gotchas)
13. [Getting Started](#-getting-started)
14. [Environment Variables](#-environment-variables)
15. [Context for AI Agents](#-context-for-ai-agents)

---

## 🧠 AI & LLM Context Primer

> **Important for any AI model or developer taking over this project:**
> Read this section first to understand the business domain, architecture, data flow, and runtime behavior.

### What Curify Solves

In India, patients face immense **cost opacity** when advised surgery or treatment. Medical lending institutions (NBFCs/banks) lack structured clinical taxonomy and hospital tariff benchmarks to quickly underwrite healthcare loans.

- **For Patients:** Natural language search → structured clinical pathways → transparent cost breakdowns (min-max tariff ranges) → accredited hospital matches across 5 Indian cities.
- **For Lenders:** Patients submit a structured **Loan Case Dossier** (`CUR-YYYY-XXXXXX`) with ICD-10 taxonomy, componentized cost caps, clinical confidence scores, and applicant details for instant risk review and decisioning.

### Dual Persona System

The app is partitioned into two role-based portals:
- **Patient (`role: 'patient'`):** Registers via Clerk → Completes onboarding → Searches procedures → Views AI taxonomy analysis → Filters hospitals → Constructs treatment plans → Submits financing cases → Tracks case statuses.
- **Lender (`role: 'lender'`):** Uses demo credentials → Operates underwriting desk → Reviews case queues → Audits tariff components → Adds review notes → Approves/Rejects/Requests verification with audit logs.

### State Management Architecture

| Context | File | Purpose |
|---|---|---|
| `AuthContext` | `src/context/AuthContext.tsx` | Clerk SSO integration, JWT sync, user session, role routing, `localStorage` persistence |
| `AppContext` | `src/context/AppContext.tsx` | Cases, intake state, clinical mappings, hospital matching, treatment plans, case CRUD |

**Key State Flow:**
- New patients start with **zero cases** (empty array) — no demo data leaks.
- Cases are fetched from backend API on login; local fallback for lender demo mode.
- `setIntake()` clears stale hospital results to force re-matching when location changes.
- Audit activities are appended immutably to each case's `activities[]` array.

---

## 🔄 End-to-End System Workflows & User Journeys

### 1. Patient Journey: Clinical Discovery to Loan Disbursal

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               PATIENT USER JOURNEY                                     │
└────────────────────────────────────────────────────────────────────────────────────────┘
  1. Discovery & Authentication
     Visitor on Landing (/) ──► Click "Get Started" ──► Login (/login)
     Select "Create Account" (Patient-Dedicated) ──► Enter Details (+91 Phone)
     Receive & Enter 6-digit OTP ──► Auto-navigates to Onboarding

  2. 4-Step Patient Onboarding (/patient/onboarding)
     Step 1: Personal Info (Age, Gender, City, 10-digit Mobile)
     Step 2: Medical History (Existing conditions + clinical notes)
     Step 3: Financial Profile (Monthly income, treatment budget, city tier)
     Step 4: Review & Finalize ──► PUT /api/onboarding ──► Navigates to Dashboard

  3. Procedure Search & Clinical Intake (/patient/intake)
     Patient enters natural language query (e.g. "advised total knee replacement")
     Selects city preset (Ahmedabad / Mumbai / Delhi NCR / Bengaluru / Pune)
     Sets budget & comorbidities ──► Submits to AppContext.setIntake()

  4. AI Clinical Analysis (/patient/analysis)
     POST /api/clinical/analyze (Google Gemini 3.6 Flash + Deterministic fallback)
     Outputs: ICD-10 Code (e.g. M17.1), Category, Milestones & Confidence Score

  5. Hospital Discovery & Side-by-Side Comparison (/patient/hospitals)
     Matches 5 accredited hospitals (NABH / JCI) with Haversine distance scoring
     Renders interactive Leaflet Map + dynamic min-max tariff breakdowns
     Action: Click "Compare" ──► Modal compares 2–3 hospitals on tariffs, ratings & distance

  6. Treatment Plan Builder (/patient/plan)
     Customizes componentized costs (OT charges, implants, bed stay, diagnostics)
     Click "Finalize & Submit Case" ──► POST /api/cases
     Generates unique Loan Dossier Number (CUR-YYYY-XXXXXX)

  7. Real-Time Tracking & Offer Selection (/patient/case)
     Subscribes to live SSE stream (/api/cases/:id/events/stream)
     Receives syndicated loan offers from partner NBFCs (rates, tenure, EMIs)
     Action: Patient selects preferred loan offer ──► Status updates to "Selected"
     Export: One-click download of official 2-Page PDF Case Dossier with native ₹ font
```

### 2. Lender & Underwriter Journey: Case Audit to Disbursal

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             LENDER / UNDERWRITER JOURNEY                               │
└────────────────────────────────────────────────────────────────────────────────────────┘
  1. Authentication & Access
     Senior Underwriter enters credentials (lender@curify.ai) or preview drawer
     Redirected to /lender with sessionStorage-isolated underwriter session

  2. Broker Marketplace Console (/lender)
     Inspects high-level KPIs: Total Dossiers, Pending Queue, Disbursed Capital,
     Portfolio Risk Distribution, and Average Turnaround Time (TAT)

  3. Case Queue Management (/lender/cases)
     Filters dossiers by status: Pending Review, Needs Review, Approved, Rejected
     Searches by patient name, procedure, or CUR-YYYY-XXXXXX case number

  4. Comprehensive Case Audit (/lender/cases/:id)
     Audits Patient Demographics, Medical History, and Financial Capacity
     Reviews Clinical Taxonomy (ICD-10 classification, primary concern, pathway)
     Itemized Tariff Benchmark Audit (checks hospital quote against city medians)

  5. Multi-Offer Syndication & NBFC Matching
     Matches eligible lending partners based on risk score and loan limits
     Dispatches syndicated offers to selected NBFCs ("Send Offers")
     Monitors borrower offer selection state in real time

  6. Underwriting Decisioning & Immutable Audit Trail
     Approve: Sets approved loan amount and interest rate terms
     Reject: Enforces mandatory rejection reason code
     Request Review: Flags dossier with specific document verification requests
     Add Review Notes: Appends chronological notes with underwriter attribution
     State Change triggers real-time SSE event to patient and appends to audit_logs

  7. Lending Partners Directory (/lender/companies)
     Directory of registered NBFCs and health lending institutions
     View & search interest rate ranges, loan caps, processing TAT, and partner ratings

  8. Disbursements Ledger (/lender/disbursements)
     Tracks capital deployment across all approved medical procedures
     Detailed breakdown: Case ID, patient name, procedure, disbursal date, amount

  9. Performance Analytics (/lender/analytics)
     Visualizes average turnaround time (TAT in days) and monthly approval rate trends
     via interactive Recharts bar and line charts
```

---

## 🛠 Tech Stack & Architecture

### Frontend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | React + TypeScript | React 19, TS ~6 | Core UI & type-safe components |
| **Build Tool** | Vite | 8.2 | HMR dev server & production bundler |
| **Routing** | React Router | v7 | Client-side routing with role guards (`ProtectedRoute`) |
| **Styling** | Tailwind CSS | v4 | Utility-first CSS (Teal/Navy patient palette, Slate/Stone lender palette) |
| **Auth** | Clerk React SDK | v5.61 | SSO, Google login, session management |
| **Charts** | Recharts | v3.10 | Turnaround time and approval trend visualizations |
| **Icons** | Lucide React | v1.33 | Consistent medical/financial iconography |
| **Maps** | Leaflet + React-Leaflet | v1.9 / v5.0 | Hospital location mapping with city coordinates |

### Backend

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Runtime** | Node.js + Express | Express 4.21 | REST API server |
| **Language** | TypeScript | ~5.6 | Type-safe backend code |
| **Auth** | Clerk Express SDK | v2.1 | JWT verification, user auto-provisioning from Clerk |
| **Database** | 3-Tier Persistence Engine | PostgreSQL + SQLite + pg-mem | Tier 1: Real Postgres; Tier 2: File-backed SQLite (`server/data/curify.db`, WAL mode); Tier 3: In-memory `pg-mem` |
| **AI Engine** | Google Gemini 3.6 / Flash | v0.24 | Natural language clinical taxonomy categorization & underwriting rationale with key rotation & fallback |
| **Quota System** | Daily AI Quota Tracker | In-memory + SQLite | 3 AI requests/day per patient, resetting at 12:00:00 AM IST (Asia/Kolkata) |
| **Validation** | Zod | v3.23 | Request schema validation |
| **Security** | Helmet + CORS + bcryptjs | — | HTTP security headers, password hashing |
| **Reports** | PDFKit | v0.15 | PDF dossier generation with native Indian Rupee (`₹`) font rendering |
| **Dev Runner** | tsx | v4.19 | TypeScript execution with hot file watching |

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (Vite)                       │
│                    http://localhost:5173                    │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  ┌────────┐  │
│  │  Clerk   │  │  React   │  │  Tailwind v4   │  │ Leaflet│  │
│  │  Auth    │  │  Router  │  │  Styles & UI   │  │ Maps   │  │
│  └────┬─────┘  └────┬─────┘  └───────────────┘  └────────┘  │
│       │              │                                      │
│  ┌────┴──────────────┴──────────────────────────────────┐   │
│  │  AuthContext ──── AppContext                         │   │
│  │  (Clerk JWT)     (Cases, Hospitals, Intake,          │   │
│  │                   Clinical Mappings, AI Quota State) │   │
│  └────────────────────────┬─────────────────────────────┘   │
│                           │ /api/* (Vite Proxy)             │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                    Backend (Express)                        │
│                  http://localhost:5000                      │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  ┌────────┐  │
│  │  Clerk   │  │  Helmet  │  │  Zod          │  │ AI Rate│  │
│  │  Verify  │  │  + CORS  │  │  Validators   │  │ Limit  │  │
│  └────┬─────┘  └──────────┘  └───────────────┘  └────┬───┘  │
│       │                                              │      │
│  ┌────┴──────────────────────────────────────────────┴──┐   │
│  │  Controllers → Services → Gemini Clinical Analyzer   │   │
│  └────────────────────────┬─────────────────────────────┘   │
│                           │                                 │
│  ┌────────────────────────┴─────────────────────────────┐   │
│  │  3-TIER DATABASE PERSISTENCE ENGINE                  │   │
│  │  • Tier 1: External PostgreSQL (Production)          │   │
│  │  • Tier 2: Persistent SQLite (server/data/curify.db) │   │
│  │  • Tier 3: In-Memory pg-mem (Fallback)               │   │
│  │  Auto-seeds 99 hospitals, 693 pricing records        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
CURIFY_TEST/
├── .env                          # Frontend env (Clerk publishable key)
├── .env.example                  # Frontend env template
├── index.html                    # Vite entry HTML
├── package.json                  # Frontend dependencies
├── vite.config.ts                # Vite config (proxy /api → :5000)
├── tsconfig.json                 # Frontend TypeScript config
│
├── src/                          # ── FRONTEND SOURCE ──
│   ├── main.tsx                  # React 19 entry point + Clerk provider
│   ├── App.tsx                   # Route definitions + ProtectedRoute guard
│   ├── index.css                 # Global Tailwind v4 styles + design tokens
│   │
│   ├── context/
│   │   ├── AuthContext.tsx        # Clerk SSO ↔ backend user sync
│   │   └── AppContext.tsx         # Global app state (cases, intake, hospitals)
│   │
│   ├── types/
│   │   └── index.ts              # All TypeScript interfaces (User, Hospital, LoanCase, etc.)
│   │
│   ├── lib/
│   │   ├── api.ts                # Centralized API client with Clerk JWT auth
│   │   └── useCaseSSE.ts         # Real-time SSE hook for live case status updates
│   │
│   ├── data/
│   │   ├── hospitals.ts          # Master hospital data + procedure cost blueprints
│   │   └── cases.ts              # Mock lender demo cases (fallback)
│   │
│   ├── utils/
│   │   └── index.ts              # Helpers: formatINR, formatDate, getGreeting, generateCaseId
│   │
│   ├── components/
│   │   ├── shared.tsx            # Reusable UI: StatusBadge, ConfidenceGauge, CostBar, etc.
│   │   └── HospitalMap.tsx       # Leaflet map with city-specific coordinates
│   │
│   ├── layouts/
│   │   ├── PatientLayout.tsx     # Patient sidebar + navigation shell
│   │   └── LenderLayout.tsx      # Lender sidebar + navigation shell
│   │
│   └── pages/
│       ├── Landing.tsx           # Public marketing landing page
│       ├── Login.tsx             # Clerk-powered login & patient-dedicated account registration
│       │
│       ├── patient/
│       │   ├── Onboarding.tsx    # 4-step fullscreen onboarding (personal, medical, financial, review)
│       │   ├── Dashboard.tsx     # Patient home: search bar, active cases, pathway steps
│       │   ├── Intake.tsx        # Procedure search form with city presets
│       │   ├── Analysis.tsx      # Clinical taxonomy analysis (ICD-10, pathway, confidence)
│       │   ├── Hospitals.tsx     # Hospital comparison grid with filters & map
│       │   ├── HospitalDetails.tsx  # Individual hospital detail view
│       │   ├── Plan.tsx          # Treatment plan builder with cost breakdown
│       │   ├── Case.tsx          # Patient's finalized case dossier, timeline & SSE live badge
│       │   ├── History.tsx       # All past cases listing
│       │   └── profile/          # Modular account & health profile suite
│       │       ├── index.tsx     # Tabbed shell (Personal, Medical, Insurance, Saved, Docs, etc.)
│       │       ├── PersonalInfo.tsx      # Demographic & personal information editor
│       │       ├── HealthcareInfo.tsx    # Medical history, conditions, vitals
│       │       ├── EmergencyInfo.tsx     # Emergency contacts & caregiver info
│       │       ├── Insurance.tsx         # Health insurance policy & cashless status
│       │       ├── Preferences.tsx       # Hospital & treatment preferences
│       │       ├── SavedHospitals.tsx    # Bookmarked hospitals collection
│       │       ├── MedicalDocuments.tsx  # Document repository (scans, reports, prescriptions)
│       │       ├── Security.tsx          # Password & authentication management
│       │       └── Privacy.tsx           # Data privacy & consent management
│       │
│       └── lender/
│           ├── Dashboard.tsx     # Broker Marketplace Console & KPI overview
│           ├── Cases.tsx         # All loan cases queue with status filters
│           ├── CaseDetails.tsx   # Comprehensive case review, syndication & decisioning
│           ├── Companies.tsx     # Lending partners directory & broker marketplace
│           ├── Analytics.tsx     # Performance analytics charts (TAT, approval trends)
│           └── Disbursements.tsx # Disbursements ledger & capital deployment tracking
│
└── server/                       # ── BACKEND SOURCE ──
    ├── .env                      # Backend env (DB, Clerk keys, port, Gemini API keys)
    ├── .env.example              # Backend env template
    ├── package.json              # Backend dependencies
    ├── tsconfig.json             # Backend TypeScript config
    │
    ├── assets/
    │   └── fonts/                # TrueType Unicode fonts for native ₹ currency rendering in PDFKit
    │       ├── Font-Regular.ttf  # Regular font
    │       └── Font-Bold.ttf     # Bold font
    │
    └── src/
        ├── server.ts             # Express app bootstrap + middleware chain
        │
        ├── config/
        │   ├── env.ts            # Environment variable loader
        │   ├── database.ts       # 3-Tier DB auto-fallback connection (Postgres / SQLite / pg-mem)
        │   └── sqlite-adapter.ts # PostgreSQL-to-SQLite query & migration translation adapter
        │
        ├── db/
        │   ├── schema.sql        # Full relational schema (19 tables)
        │   ├── seed.ts           # Seed data: 99 hospitals, 693 procedures, demo users, partner NBFCs
        │   ├── migrate.ts        # Schema migration runner
        │   ├── create-database.ts # Database creation utility
        │   └── reset.ts          # Database reset utility
        │
        ├── middleware/
        │   ├── auth.ts           # Clerk JWT verification, token query param extraction & user auto-provisioning
        │   ├── roleGuard.ts      # Role-based access control (patient/lender/admin)
        │   ├── aiRateLimit.ts    # 3-request daily AI quota enforcement with midnight IST reset
        │   ├── errorHandler.ts   # Global error handler
        │   └── validation.ts     # Zod validation middleware
        │
        ├── validators/
        │   ├── auth.validator.ts  # Auth request schemas
        │   └── case.validator.ts  # Case request schemas
        │
        ├── routes/
        │   ├── auth.routes.ts         # /api/auth/* (login, register, sync, me, logout)
        │   ├── onboarding.routes.ts   # /api/onboarding/* (state persistence)
        │   ├── patient.routes.ts      # /api/patient/* (profile, saved-hospitals, documents)
        │   ├── lender.routes.ts       # /api/lender/* (profile, analytics dashboard)
        │   ├── clinical.routes.ts     # /api/clinical/* (Gemini taxonomy analyzer & daily quota)
        │   ├── hospital.routes.ts     # /api/hospitals/* (matching, scoring, distance)
        │   ├── treatment.routes.ts    # /api/treatment-plans/* (treatment plan lifecycle)
        │   ├── case.routes.ts         # /api/cases/* (CRUD, SSE stream, timeline events)
        │   ├── report.routes.ts       # /api/reports/* (2-page case dossier PDF)
        │   ├── loan-company.routes.ts # /api/loan-companies/* (partner NBFCs)
        │   └── loan-offer.routes.ts   # /api/loan-offers/* (syndicated loan offers)
        │
        ├── controllers/              # Route handlers (thin layer → services)
        │   ├── auth.controller.ts
        │   ├── onboarding.controller.ts
        │   ├── patient.controller.ts
        │   ├── lender.controller.ts
        │   ├── clinical.controller.ts
        │   ├── hospital.controller.ts
        │   ├── treatment.controller.ts
        │   ├── case.controller.ts
        │   ├── report.controller.ts
        │   ├── loan-company.controller.ts
        │   └── loan-offer.controller.ts
        │
        └── services/                 # Business logic layer
            ├── auth.service.ts            # User registration, login, Clerk sync
            ├── onboarding.service.ts      # Multi-step onboarding state persistence
            ├── patient.service.ts         # Patient profile, saved hospitals, medical documents
            ├── lender.service.ts          # Lender profile & dashboard analytics
            ├── clinical.service.ts        # Clinical analysis coordination & deterministic fallback
            ├── gemini-clinical.service.ts # Google Gemini 3.6 / Flash AI clinical analyzer with key rotation
            ├── gemini.service.ts          # Core Gemini API client wrapper & prompt templates
            ├── quota.service.ts           # Daily AI prompt quota tracker (resetting at midnight IST)
            ├── pricing.service.ts         # Procedural Pricing Engine with geo-economic multipliers
            ├── hospital.service.ts        # Hospital matching (city-aware, haversine distance, scoring)
            ├── treatment.service.ts       # Treatment plan CRUD & cost rollup
            ├── case.service.ts            # Loan case lifecycle (create, approve, reject, audit logs)
            ├── case-event.service.ts      # Case event persistence & notification dispatching
            ├── event-bus.service.ts       # In-process pub/sub event bus for real-time SSE updates
            ├── loan-company.service.ts    # Partner NBFCs directory & performance metrics
            ├── loan-offer.service.ts      # Multi-offer syndication, risk matching & borrower selection
            ├── email.service.ts           # Modular email notification service
            ├── underwriting.service.ts    # Risk scoring & underwriting rules
            └── report.service.ts          # 2-page PDF case dossier generator with native ₹ font
```

---

## ✅ Implemented Features — Frontend

### 1. Landing Page (`Landing.tsx`)
- Full marketing homepage with hero section, feature cards, and call-to-action
- Animated sections with modern glassmorphism design
- Responsive across desktop and mobile

### 2. Authentication & Login (`Login.tsx` & `login-ambient.css`)
- **Clerk-Powered Authentication:** Email/password and Google SSO authentication integrated via `@clerk/clerk-react` with custom OTP verification and password reset workflows.
- **Patient-Dedicated Account Creation:** Signup is strictly dedicated to patients. Lenders and underwriters sign in using assigned partner credentials or launch the underwriter portal preview drawer.
- **Centered-Card Ambient Composition:**
  - **Aesthetic Refinement:** Restrained healthcare-fintech aesthetic featuring a quiet warm-neutral background (`#fbfdfc` to `#f7faf9`), softened atmospheric teal/mint gradients (`100px+` blur), and a gentle SVG ambient wave.
  - **Understated Orbit & Asymmetric Balance:** Subdued, thin orbital dashed arcs (`strokeWidth="1"`, `rgba(13, 148, 136, 0.16)`) with subtle nodal markers and art-directed vertical asymmetry (left column offset slightly higher, right column offset lower with varied card-to-center spacing).
  - **Compact Feature Badges:** 50px rounded icon badges with Lucide icons and concise, punchy copy (*Find verified hospitals*, *Compare treatment estimates*, *Guidance throughout your journey*, *Explore financing options*).
  - **Zero Layout Shift:** Authentication card remains firmly anchored when toggling between "Sign In" and "Create Account". Only the form contents cross-fade in-place (`200ms cubic-bezier(0.16, 1, 0.3, 1)` with 4px subtle translation and 0.99→1 scale) with an animated sliding pill glider.
  - **Zero Desktop Scrollbars & Viewport Polish:** Built with strict `100dvh` flex staging across desktop viewports (`>=1024px`, including 1024x768, 1280x720, 1366x768, 1440x900, and 1920x1080). Orbit SVGs, badge bounds (350px column height), card proportions (42px inputs and buttons), and top/bottom header-footer padding are vertically balanced to prevent document overflow, ensuring the brand footer bar and feature badges remain completely unclipped with zero artificial scrollbars.
  - **Full Responsiveness & Mobile Preservation:** On mobile (320px–767px) and tablet (768px–1023px) viewports, the card centers comfortably with full-width touch targets (16px input font size to prevent iOS Safari auto-zoom) and renders a responsive mobile feature strip beneath the security badge so brand values remain visible without screen clutter.
  - **Accessibility:** Full keyboard navigability, visible focus rings, ARIA role tabs, and complete `prefers-reduced-motion` compliance.
- **Intelligent Auto-Redirection for Authenticated Sessions:** Authenticated users navigating to `/login` are automatically and immediately routed to `/patient` (or `/patient/onboarding` if initial setup is pending), preventing dead-ends or session-trapping.
- **Immediate State Hydration & Bounce Prevention:** Signing in immediately commits user credentials and role tokens to `localStorage` and memory prior to route dispatch, guaranteeing `ProtectedRoute` never encounters an unauthenticated intermediate state or bounces back.
- **Clerk `session_exists` Resilience:** Handles browser autofill conflicts when a Clerk session is already active (`session_exists` or `identifier_already_signed_in`), seamlessly directing the user into their dashboard.
- Lender demo login with dedicated credentials (`lender@curify.ai` / `Curify@2026`) for immediate access to the underwriting desk

### 3. Patient Onboarding (`Onboarding.tsx`)
- **4-step fullscreen onboarding flow:**
  1. **Personal Info** — Age, gender, city selection (5 cities: Ahmedabad, Mumbai, Delhi NCR, Bengaluru, Pune), phone number with 10-digit validation
  2. **Medical History** — Pre-existing conditions selector (9 common conditions), additional notes
  3. **Financial Profile** — Monthly income, treatment budget (slider + input), preferred treatment city
  4. **Review & Submit** — Summary card with edit capability
- State persisted to backend via `/api/onboarding` endpoints
- Skip option with banner reminder on dashboard
- **No prefilled data** — blank fields for new users
- **No state field** — auto-derived from city selection via `CITY_TO_STATE` mapping
- **Input validation** — Mobile number strictly 10 digits

### 4. Patient Dashboard (`Dashboard.tsx`)
- Personalized greeting with time-based message
- Full-width search bar → navigates to Intake
- 6 common procedure suggestion chips
- 5-step Curify Pathway explainer
- **Active Treatment Files** section — shows only cases belonging to logged-in user
- **New users see empty state** ("No active cases registered") — not demo data
- Accreditation Standards sidebar with hospital highlight

### 5. Clinical Intake (`Intake.tsx`)
- Natural language procedure search with textarea
- **5 city presets:** Ahmedabad, Mumbai, Delhi NCR, Bengaluru, Pune
- 6 prompt suggestion pills
- Optional advanced fields: age, gender, comorbidities, budget
- Submits to `AppContext.setIntake()` → navigates to Analysis

### 6. Clinical Analysis (`Analysis.tsx`)
- Animated step-by-step analysis progress (4 stages)
- Displays ICD-10 code, clinical category, primary concern
- Shows potential clinical pathway steps
- Target procedure identification
- Confidence score visualization
- Calls backend `/api/clinical/analyze` with local fallback

### 7. Hospital Comparison (`Hospitals.tsx`)
- City-aware hospital grid with match scores and interactive split/full view toggle
- **Filters:** City, distance, budget, accreditation (NABH/JCI), minimum rating
- **Sort by:** Match score, cost, distance, rating
- **Instant Side-by-Side Comparison Modal (`HospitalComparisonModal`):**
  - Triggered directly from the "Compare" button on any hospital card (auto-pairs immediately with the top alternative hospital)
  - Comparative criteria matrix: Match Score, Indicative Tariff (with "Lowest Cost" highlight badge), Patient Rating (with "Top Rated" highlight badge), Accreditation (NABH/JCI), Distance from patient city, Clinical Specialties, and Reliability Confidence
  - In-modal dynamic provider staging: add up to 3 hospitals from a selector dropdown, remove individual columns `(✕)`, and select directly into a treatment plan via "Select & View"
  - **Clean UI Lifecycle:** The card action permanently remains "Compare" (no label flipping to "Comparing"). Dismissing the modal immediately resets staged comparison state with zero lingering floating docks or badges
- Cost breakdown component bars (min-max ranges)
- Confidence gauge for each hospital
- Match factor analysis (distance, accreditation, rating, procedure availability)
- **Leaflet map integration** with hospital markers and city coordinates
- Re-fetches hospitals when location changes in intake

### 8. Hospital Details (`HospitalDetails.tsx`)
- Individual hospital view with full specialties
- Cost breakdown table
- Match factor radar
- Select & proceed to treatment plan

### 9. Treatment Plan (`Plan.tsx`)
- Componentized cost breakdown table
- Total cost range with confidence indicators
- Hospital information summary
- Clinical pathway steps
- "Finalize & Submit Case" button → creates loan case
- **PDF Dossier Export:** Instant generation and download of complete clinical loan dossier for patient records

### 10. Case Tracker (`Case.tsx`) & History (`History.tsx`)
- **Real-Time Live Updates (SSE):** Custom `useCaseSSE` hook subscribing to `/api/cases/:id/events/stream` with live connection status pill (`Live` indicator) and real-time toast alerts upon lender decisions
- **Interactive Case Activity Timeline:** Displays complete chronological event history (`CASE_SUBMITTED`, `CASE_UNDER_REVIEW`, `CASE_NEEDS_VERIFICATION`, `CASE_APPROVED`, `CASE_REJECTED`, `CASE_NOTE_ADDED`) with multi-layer resilience (SSE events → `c.activities` fallback → initial submission baseline) so the timeline is never blank
- **Loan Offer Comparison & Selection:** Patients can compare syndicated loan offers from partner NBFCs (interest rate, processing fees, monthly EMI, and tenure) and select their preferred loan offer with a single click, immediately updating the dossier state
- Case history listing with color-coded status badges and itemized procedural costs
- **Redesigned PDF Dossier Download:** Direct one-click download of the official 2-page healthcare-financing case dossier featuring native Indian Rupee (`₹`) symbol formatting, itemized tariff benchmarks, and underwriter rationale

### 11. Patient Profile Suite (`pages/patient/profile/`)
- Comprehensive 9-tab account and health management console:
  - **Personal Information (`PersonalInfo.tsx`):** Editable demographics, birth date, gender, blood group, contact phone, and location with in-place edit/save toggle.
  - **Healthcare Profile (`HealthcareInfo.tsx`):** Pre-existing conditions, allergies, regular medications, past surgeries, and chronic conditions.
  - **Emergency Info (`EmergencyInfo.tsx`):** Primary emergency contact name, relationship, and 24/7 contact number.
  - **Insurance & Financing (`Insurance.tsx`):** Provider name, policy number, coverage type, expiry date, TPA details, and cashless authorization.
  - **Preferences (`Preferences.tsx`):** Preferred hospital class, facility tier, and language choice.
  - **Saved Hospitals (`SavedHospitals.tsx`):** Bookmarked hospitals collection with one-click direct access and un-saving capability.
  - **Medical Documents (`MedicalDocuments.tsx`):** Document repository with category badges (Lab Report, Prescription, Discharge Summary, Scan/MRI), metadata entry, and direct deletion.
  - **Account & Security (`Security.tsx`):** Active sessions, authentication provider sync, and password management.
  - **Privacy & Data (`Privacy.tsx`):** Consents, data retention controls, and audit trail disclosures.
- Direct synchronization with backend through `PUT /api/patient/profile`, `GET/POST/DELETE /api/patient/saved-hospitals`, and `GET/POST/DELETE /api/patient/documents`.

### 12. Lender Dashboard (`lender/Dashboard.tsx`)
- Broker Marketplace Console with high-level KPI cards (total dossiers, pending review queue, approved volume, average portfolio risk score, conversion rates)
- Quick action shortcuts to pending high-priority dossiers
- Portfolio risk distribution breakdown

### 13. Lender Case Queue (`lender/Cases.tsx`)
- Filterable and searchable medical loan case list
- Status-based filtering tabs (All, Pending Review, Needs Review, Approved, Rejected)
- Direct navigation to individual dossier review

### 14. Lender Case Details (`lender/CaseDetails.tsx`)
- Full case review interface with:
  - Patient demographics, medical history, comorbidities, and financial profile
  - Clinical mapping details (ICD-10 classification, category, pathway)
  - Hospital tariff benchmark audit (itemized breakdown against city tariff medians)
  - Confidence scoring gauge
  - **Multi-Offer Syndication:** Selects eligible lending institutions/NBFCs from marketplace and syndicates the loan request (`Send Offers`)
  - **Audit trail** — immutable activity log
  - **Add notes** functionality with underwriter attribution
  - **Action buttons:** Approve (with approved amount and rate), Reject (with mandatory reason), Request Verification (with deficiency notes)
  - **Download Dossier (PDF):** One-click export of the underwriting file, patient profile, tariff breakdown, and audit activity (works seamlessly with live JWT as well as demo-role fallback)

### 15. Lending Partners & Broker Marketplace (`lender/Companies.tsx`)
- Directory of registered healthcare lending NBFCs and partner banking institutions
- Search and filter partners by institution name or company type
- Displays institutional terms: interest rate ranges, average processing turnaround (days), loan limits, and partner credibility ratings

### 16. Lender Performance Analytics (`lender/Analytics.tsx`)
- Executive performance and underwriting analytics console
- Interactive Recharts bar chart tracking average turnaround time (TAT in days) month-over-month
- Interactive Recharts line chart tracking portfolio approval rate trends (%)

### 17. Disbursements Ledger (`lender/Disbursements.tsx`)
- Tracks total capital deployment across approved and disbursed medical cases
- Itemized disbursal ledger: Case ID, patient name, procedure, disbursal timestamp, and disbursed loan amount
- Quick navigation shortcut to individual case dossiers

### 18. Shared Components (`components/shared.tsx`)
- `HospitalComparisonModal` — side-by-side comparative matrix modal comparing tariffs, ratings, distance, and clinical focus with dynamic provider staging/removal
- `StatusBadge` — color-coded case status chips
- `ConfidenceGauge` — animated circular confidence score
- `CostBar` — min-max cost range bars
- Various reusable UI primitives

### 19. Hospital Map (`components/HospitalMap.tsx`)
- Leaflet-based interactive map
- City coordinate presets for all 5 cities + extras (Hyderabad, Chennai)
- Hospital markers with popups
- OpenStreetMap tiles (no API key required)

---

## ✅ Implemented Features — Backend

### 1. Authentication Service (`auth.service.ts`)
- Clerk JWT verification middleware
- **Auto-provisioning:** When a Clerk user hits `/api/auth/me`, the backend automatically creates a database user record if one doesn't exist
- Role-based user creation (patient gets `patient_profile`, lender gets `lender_profile`)
- Login/register endpoints with bcrypt password hashing (for direct credential auth)
- Session sync between Clerk and backend database

### 2. Onboarding Service (`onboarding.service.ts`)
- Multi-step onboarding state persistence
- GET current state / PUT update state
- Tracks `onboarding_step` (1-4) and `profile_completion_percentage`

### 3. Clinical Analysis & Gemini Service (`clinical.service.ts` & `gemini-clinical.service.ts`)
- **Real Gemini AI Integration:** Powered by Google Gemini 3.6 / Flash with automated multi-key rotation and structured JSON prompt contracts
- **ICD-10 Classification:** Accurately extracts medical concerns into standardized ICD-10 taxonomy codes (e.g. M17.1, K80.20, H25.9, I25.1)
- **Care Pathways:** Synthesizes structured clinical pathways from diagnostics to post-op recovery
- **Daily Quota Budgeting:** Strictly enforces 3 analyses/day per patient via `aiRateLimit.ts` and `ai_usage_quotas` (resetting at 12:00:00 AM IST)
- **Deterministic Keyword Fallback:** High-reliability fallback taxonomy system instantly activates if API keys are exhausted, rate-limited, or during network latency

### 4. Hospital Service (`hospital.service.ts`)
- **City-aware hospital matching** with fuzzy city name lookup (`LIKE` patterns)
- Haversine distance calculation between user city and hospital coordinates
- Multi-factor scoring algorithm:
  - Distance (weight: 25%)
  - Accreditation (NABH/JCI, weight: 25%)
  - Rating (weight: 25%)
  - Procedure availability (weight: 25%)
- Cost breakdown generation per hospital per procedure
- Handles Delhi NCR/New Delhi and Bengaluru/Bangalore aliases

### 5. Case Service (`case.service.ts`)
- Full loan case lifecycle:
  - Create case with auto-generated `CUR-YYYY-XXXXXX` number
  - Approve with approved amount
  - Reject with reason
  - Request review with notes
  - Add case notes
- **Audit logging** — every status change creates an `audit_logs` entry
- **Dual-ID Resolution:** Seamlessly accepts both `CUR-YYYY-XXXXXX` display numbers and database UUIDs, preventing cast errors
- Cases scoped to authenticated user (patients see own cases, lenders see all)

### 6. Real-Time Event Bus & Case Event Service (`event-bus.service.ts` & `case-event.service.ts`)
- **In-Process Pub/Sub:** Built on Node.js `EventEmitter` to fan out real-time case updates to connected SSE clients
- **Server-Sent Events (SSE) Streaming:** `/api/cases/:id/events/stream` streams live status transitions and notes to the patient dashboard
- **Dual-Source Persistence & Fallback:** Stores dedicated events in `case_events` and automatically queries `audit_logs` as fallback for legacy/seeded cases, ensuring timeline events are never lost

### 7. Treatment Plan Service (`treatment.service.ts`)
- Treatment plan CRUD
- Links clinical mapping + hospital + cost breakdown
- Finalization state management

### 8. Underwriting Service (`underwriting.service.ts`)
- Risk score calculation (0–100 scale)
- Risk level classification (Low/Moderate/High)
- Policy ceiling and financial capacity validation

### 9. Report Service (`report.service.ts`)
- **2-Page Healthcare-Financing Dossier:**
  - **Native Rupee Symbol (`₹`) Support:** Bundled TrueType Unicode fonts in `server/assets/fonts/` (`Font-Regular.ttf`, `Font-Bold.ttf`) with dynamic Windows system font fallback (`segoeui.ttf`, `arial.ttf`)
  - **Strict Multi-Page Pagination:** Uses PDFKit `bufferPages: true` with margin protection to output **exactly 2 pages** (`Page 1 of 2` and `Page 2 of 2`) with zero phantom blank pages
  - **Structured Clinical Hierarchy:** Executive summary banner, 1. Patient Profile, 2. Clinical Assessment (decision-support labeling), 3. Selected Hospital, 4. Treatment Cost Estimate ("Indicative Treatment Cost Estimate"), 5. Financing Assessment, 6. Underwriting Decision, 7. Case Timeline, 8. Professional Disclaimer, and running footers

### 10. 3-Tier Database Persistence Engine (`config/database.ts`)
- **Three-tiered fallback architecture:**
  - **Tier 1 (Production):** Real PostgreSQL (via `DATABASE_URL` or `DB_HOST`)
  - **Tier 2 (Local Development Default):** File-backed SQLite via `better-sqlite3` at `server/data/curify.db` with WAL mode enabled, preserving all cases, users, and AI quotas across restarts
  - **Tier 3 (Ephemeral Fallback):** In-memory `pg-mem` engine for zero-dependency testing
- Schema and reference data (99 hospitals, 693 procedure pricing records, partner NBFCs) auto-seeded seamlessly

### 11. Lending Partners & Brokerage Services (`loan-company.service.ts` & `loan-offer.service.ts`)
- Registry of partner NBFCs and health lending institutions (`loan_companies` table)
- Risk-based NBFC eligibility matching algorithm
- Multi-offer syndication dispatching (`loan_offers` table)
- Patient offer selection and lender underwriting decisioning workflows

### 12. Procedural Pricing Engine (`pricing.service.ts`)
- Benchmark base tariffs for top surgical and diagnostic procedures
- Geo-economic cost multipliers across Indian metropolitan tiers (Mumbai 1.22x, Delhi NCR 1.16x, Bengaluru 1.10x, Pune 1.02x, Ahmedabad 1.00x)
- Hospital facility tier factors (Public/Municipal 0.70x, Trust 0.78x, Multi-specialty 0.94x–1.05x, JCI Flagship 1.16x)
- Componentized mathematical consistency: OT, implants, bed stay, surgeon fees, diagnostics, and medications sum exactly to min and max ranges

### 13. Patient Data & Document Repository (`patient.service.ts`)
- Full patient profile CRUD for demographic, medical, emergency, and insurance data
- Bookmarked hospital collection management (`saved_hospitals` table)
- Medical record and prescription document repository (`patient_documents` table)

---

## 🗃 Database Schema

19 tables with proper foreign key relationships, cascade rules, and indexes:

| Table | Purpose |
|---|---|
| `users` | Core user identity (patients, lenders, admins). Links to Clerk via `clerk_user_id` |
| `patient_profiles` | Comprehensive patient profile: demographics, vitals, medical history, insurance, onboarding state |
| `lender_profiles` | Lender underwriting profile: organization, designation, employee ID |
| `hospitals` | 99 accredited hospitals across 5 Indian cities with geolocation, ratings, facility tier, and accreditation |
| `hospital_service_tags` | Hospital capability tags and specialty services taxonomy |
| `hospital_procedures` | 693 procedure pricing records linked to hospitals with city-tier pricing tariffs |
| `clinical_mappings` | Natural language procedure queries → ICD-10 classifications, reasoning & care pathways |
| `treatment_plans` | Structured financing plans linking clinical mapping + hospital + itemized cost breakdown |
| `loan_cases` | Medical financing cases with status lifecycle (`CUR-YYYY-XXXXXX`), risk scores, amounts, and underwriting notes |
| `case_notes` | Chronological underwriter review notes per case with author attribution |
| `audit_logs` | Immutable compliance audit trail recording all case status changes and actors |
| `case_events` | Dedicated case lifecycle events for real-time SSE streaming and patient activity timeline |
| `ai_usage_quotas` | Patient daily AI usage budget tracking (3 analyses/day, resetting at 12:00 AM IST) |
| `case_dossier_summaries` | Cached AI-generated executive summaries for official 2-page PDF loan dossiers |
| `case_note_summaries` | AI-generated synthesized summaries of historical case notes |
| `loan_companies` | Partner NBFCs and health lending institutions (interest rates, limits, TAT, rating) |
| `loan_offers` | Syndicated loan offers generated for applicants (offered amount, rate, tenure, EMI, fees, status) |
| `saved_hospitals` | Patient bookmarked hospitals collection for quick access and comparison |
| `patient_documents` | Patient medical document repository (lab reports, prescriptions, scans, discharge summaries) |

---

## 🔌 API Endpoints Reference

### System & Health
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Health check endpoint (service status, timestamp, version) |

### Authentication
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/auth/me` | Get current user (auto-provisions from Clerk JWT) |
| `POST` | `/api/auth/login` | Email/password login |
| `POST` | `/api/auth/register` | New user registration |
| `POST` | `/api/auth/sync` | Sync Clerk user data to backend |
| `POST` | `/api/auth/complete-signup` | Complete signup with role selection |
| `POST` | `/api/auth/logout` | Logout |

### Onboarding
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/onboarding` | Get current onboarding state |
| `PUT` | `/api/onboarding` | Update onboarding state (multi-step) |

### Patient & Profile
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/patient/profile` | Get comprehensive patient profile |
| `PUT` | `/api/patient/profile` | Update patient profile (demographics, medical, insurance) |
| `GET` | `/api/patient/saved-hospitals` | List patient's bookmarked hospitals |
| `POST` | `/api/patient/saved-hospitals` | Bookmark a hospital |
| `DELETE` | `/api/patient/saved-hospitals/:hospitalId` | Remove a bookmarked hospital |
| `GET` | `/api/patient/documents` | List patient's uploaded medical records and documents |
| `POST` | `/api/patient/documents` | Register/upload medical document (report, scan, prescription) |
| `DELETE` | `/api/patient/documents/:documentId` | Remove a medical document |

### Lender
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/lender/profile` | Get lender profile |
| `GET` | `/api/lender/dashboard` | Get dashboard analytics |

### Clinical Analysis & AI Quota
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/clinical/quota` | Get authenticated patient's daily AI quota (prompt count, daily limit, resetAt timestamp in IST) |
| `POST` | `/api/clinical/analyze` | Analyze natural language query → ICD-10 mapping & care pathway (with AI rate limit & quota tracking) |

### Hospitals
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/hospitals` | List hospitals (with city/accreditation filters) |
| `GET` | `/api/hospitals/:id` | Get hospital by ID |
| `POST` | `/api/hospitals/match` | Match hospitals for a clinical mapping + city + budget |

### Treatment Plans
| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/treatment-plans` | Create treatment plan |
| `GET` | `/api/treatment-plans` | List patient's treatment plans |
| `GET` | `/api/treatment-plans/:id` | Get treatment plan by ID |
| `PUT` | `/api/treatment-plans/:id/finalize` | Finalize treatment plan |

### Loan Cases
| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/cases` | Create loan case |
| `GET` | `/api/cases` | List cases (with status/search filters) |
| `GET` | `/api/cases/:id` | Get case by ID |
| `POST` | `/api/cases/:id/approve` | Approve case |
| `POST` | `/api/cases/:id/reject` | Reject case |
| `POST` | `/api/cases/:id/review` | Flag case for review |
| `POST` | `/api/cases/:id/notes` | Add case note |
| `GET` | `/api/cases/:id/audit` | Get audit log |
| `GET` | `/api/cases/:id/events` | Get persistent patient timeline events (with audit_logs fallback) |
| `GET` | `/api/cases/:id/events/stream` | Server-Sent Events (SSE) live update stream |

### Reports
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/reports/:caseId/pdf` | Download PDF dossier |

### Lending Partners & Marketplace
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/loan-companies` | List partner NBFCs and health lending institutions |
| `POST` | `/api/loan-companies` | Register new lending partner (lender/admin) |
| `PUT` | `/api/loan-companies/:id` | Update lending partner parameters (lender/admin) |
| `GET` | `/api/loan-companies/:id/performance` | Get partner conversion & underwriting metrics |

### Loan Offers & Brokerage
| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/loan-offers/case/:caseId` | List generated loan offers for a dossier |
| `GET` | `/api/loan-offers/case/:caseId/eligible-companies` | Match eligible lending institutions based on applicant risk |
| `POST` | `/api/loan-offers/case/:caseId` | Issue multi-offer syndication to selected NBFCs |
| `POST` | `/api/loan-offers/:id/select` | Patient selects preferred loan offer |
| `POST` | `/api/loan-offers/:id/decision` | Lender underwrites offer decision (approve/reject/disburse) |

---

## 🔐 Authentication Flow

```
User opens app
  │
  ├─ Guest / Unauthenticated Landing Page (http://localhost:5173/)
  │   │
  │   ├─ Default visitor state starts unauthenticated (zero auto-login)
  │   └─ Stale persistent demo sessions are automatically purged on app boot
  │
  ├─ Clerk SSO & Direct Patient Login (/login)
  │   │
  │   ├─ Active Session Auto-Route: Authenticated users are redirected immediately
  │   │  to /patient (or /patient/onboarding), eliminating session deadlock on /login
  │   ├─ Immediate Session Hydration: Memory and localStorage are populated before
  │   │  route transitions, preventing ProtectedRoute timing race conditions
  │   ├─ Autofill Resilience: Catches session_exists from Clerk and smoothly directs
  │   │  users straight into the patient portal
  │   ├─ Frontend: ClerkProvider wraps app
  │   ├─ Frontend: useClerkAuth() → getToken() → JWT
  │   ├─ API Client: Attaches "Authorization: Bearer <JWT>" to all requests
  │   │
  │   └─ Backend: clerkMiddleware() verifies JWT
  │       │
  │       ├─ auth.ts middleware extracts clerk_user_id
  │       ├─ Looks up user in PostgreSQL by clerk_user_id
  │       ├─ If not found → AUTO-CREATES user + profile
  │       └─ Attaches user to req.user
  │
  └─ Lender Desk (Demo & Direct Login)
      │
      ├─ Quick Access: "Explore Lender Underwriter Portal" on login screen
      ├─ Credential Login: lender@curify.ai / Curify@2026 (or neha@curify.ai)
      ├─ Session Scoping: Isolated in sessionStorage (curify_demo_user) so
      │  refreshing in a new tab or returning to home does not leak sticky logins
      └─ API Transport: JWT token + x-demo-role header fallback in auth middleware
```

---

## 🏥 City-Specific Hospital Data

The database contains **99 accredited hospitals** across **5 Indian cities** with **693 procedure pricing records** across 5 clinical categories, loaded from `hospitals_expanded.sql` and `procedure_pricing_import_template.csv` with realistic geo-economic pricing computed by `pricing.service.ts`:

- **Ahmedabad (19 hospitals):** Apollo Hospitals International (4.8★), Sterling Hospitals (4.6★), Zydus Hospitals (4.5★), HCG Cancer Centre (4.4★), Shalby Hospitals (4.3★), KD Hospital, CIMS Hospital, Marengo CIMS, Sal Hospital, and more.
- **Mumbai (20 hospitals):** Kokilaben Dhirubhai Ambani Hospital (4.9★), Lilavati Hospital (4.7★), Hinduja Hospital (4.6★), Nanavati Max Hospital (4.5★), Wockhardt Hospital (4.4★), Jaslok Hospital, Bombay Hospital, Fortis Mulund, Tata Memorial, and more.
- **Delhi NCR (20 hospitals):** Medanta — The Medicity (4.9★), Fortis Memorial Research Institute (4.8★), Max Super Speciality Hospital (4.7★), BLK-Max Super Speciality Hospital (4.6★), Sir Ganga Ram Hospital (4.5★), Apollo Indraprastha, Artemis Hospital, and more.
- **Bengaluru (20 hospitals):** Narayana Health City (4.8★), Manipal Hospital (4.7★), Aster CMI Hospital (4.6★), Columbia Asia Hospital (4.5★), Fortis Hospital (4.4★), Apollo Bangalore, Sagar Hospitals, St. John's Medical College, and more.
- **Pune (20 hospitals):** Ruby Hall Clinic (4.7★), Sahyadri Hospitals (4.6★), Jupiter Hospital (4.5★), Jehangir Hospital (4.4★), Deenanath Mangeshkar Hospital (4.3★), Inamdar Multispecialty, Poona Hospital, Aditya Birla Memorial, and more.

### Procedure Categories (per hospital)
Procedures are categorized across 5 clinical surgical & diagnostic disciplines:
- **Orthopedics** (Total Knee Replacement, Total Hip Replacement, Arthroscopy)
- **Gastroenterology & Laparoscopy** (Laparoscopic Cholecystectomy, Appendectomy, Endoscopy)
- **Ophthalmology** (Cataract Surgery with Phacoemulsification, Refractive Surgery)
- **Cardiology** (Coronary Angiography, Angioplasty PCI, Valve Repair/Replacement)
- **General Surgery & Urology** (Inguinal/Umbilical Hernia Repair, Laser Lithotripsy, Kidney Stone RIRS)

**Pricing variation by city tier:**
- **Mumbai / Delhi NCR:** ~1.16x–1.22x multiplier (higher real estate & operating expenses)
- **Bengaluru:** ~1.10x
- **Pune:** ~1.02x
- **Ahmedabad:** ~1.00x (baseline economic benchmark)

---

## ⚠️ What is Pending / Incomplete

### High Priority (Core Functionality)

| Item | Description | Files Involved |
|---|---|---|
| 🟢 **Real AI/LLM Integration** | ✅ **Implemented:** Powered by **Google Gemini 3.6 Flash** with automatic multi-key rotation, daily quota budgeting (3 analyses/day strictly resetting at 12:00 AM midnight IST), and deterministic rule-based clinical fallback. | `server/src/services/gemini-clinical.service.ts`, `server/src/services/clinical.service.ts` |
| 🟢 **Lender Brokerage & NBFC Marketplace** | ✅ **Implemented:** Lending Partners directory, multi-offer syndication, risk-based NBFC matching, and disbursements ledger. | `src/pages/lender/Companies.tsx`, `src/pages/lender/Disbursements.tsx`, `server/src/routes/loan-company.routes.ts` |
| 🟢 **Lender Dashboard & Analytics** | ✅ **Implemented:** Live aggregated metrics (total dossiers, approval rates, average risk score, monthly cashflow graphs, and turnaround times). | `src/pages/lender/Dashboard.tsx`, `src/pages/lender/Analytics.tsx`, `server/src/services/lender.service.ts` |
| 🟢 **Real-Time Live Updates (SSE)** | ✅ **Implemented:** Server-Sent Events (SSE) via `/api/cases/:id/events/stream` with in-process event bus, live connection indicators, and real-time toast alerts on decisions. | `server/src/services/event-bus.service.ts`, `src/lib/useCaseSSE.ts` |
| 🟢 **Case Dossier PDF Export** | ✅ **Implemented:** Official 2-page healthcare-financing dossier with native Indian Rupee (`₹`) typography, indicative tariff benchmarks, underwriting rationale, and multi-page running footers. | `server/src/services/report.service.ts` |
| 🟡 **Payment Gateway** | Simulated money flow — loan offers are underwritten, approved, and tracked in disbursements ledger without live banking settlement. | Future enhancement |
| ⚪ **Production Email Deliverability** | Email service infrastructure is modularized and disabled in local dev (`EMAIL_NOTIFICATIONS_ENABLED=false`). Ready for production domain verification via Resend or AWS SES. | `server/src/services/email.service.ts` |

### Medium Priority (Polish & UX)

| Item | Description | Files Involved |
|---|---|---|
| 🟢 **Onboarding Form UX & Phone Formatting** | ✅ **Polished:** Unified input group flex layout for Mobile Contact Phone with dedicated `+91` country code badge, strictly eliminating text overlap and enforcing 10-digit validation. | `src/pages/patient/Onboarding.tsx` |
| 🟢 **Patient Profile Suite & Inline Editing** | ✅ **Implemented:** Complete 9-tab account console (`PersonalInfo`, `HealthcareInfo`, `EmergencyInfo`, `Insurance`, `Preferences`, `SavedHospitals`, `MedicalDocuments`, `Security`, `Privacy`) with in-place editing and real-time backend persistence. | `src/pages/patient/profile/` |
| 🟢 **Medical Document Repository** | ✅ **Implemented:** Upload and management of medical records, scans, prescriptions, and lab reports with category tagging and persistent storage. | `src/pages/patient/profile/MedicalDocuments.tsx` |
| 🟡 **Hospital Images** | Hospitals currently display with placeholder card badges; actual hospital building photography not integrated. | `src/pages/patient/Hospitals.tsx` |
| 🟡 **Search History** | Search queries create clinical mappings in the database, but patient dashboard does not yet show a past search history timeline. | `src/pages/patient/Dashboard.tsx` |

### Low Priority (Nice to Have / Future Enhancements)

| Item | Description | Status |
|---|---|---|
| **Admin Panel** | Admin role/dashboard for managing hospitals, users, or platform configuration | ⚪ Future Enhancement |
| **Hospital Reviews** | Patient review and rating submission system for hospitals | ⚪ Future Enhancement |
| **Multi-language Support** | Language preference is stored but UI is English-only | ⚪ Future Enhancement |
| **Dark Mode** | Dark mode theme toggle for patient portal | ⚪ Future Enhancement |
| **Mobile App** | React Native mobile application for iOS / Android | ⚪ Future Enhancement |
| **Deployment CI/CD** | Automated CI/CD pipeline and cloud deployment setup | ⚪ Future Enhancement |

---

## 🐛 Known Issues & Architecture Notes

1. **3-Tier Database Persistence & Loan Case Durability (Resolved):** In addition to PostgreSQL and `pg-mem`, Curify incorporates a persistent SQLite engine (`better-sqlite3` at `server/data/curify.db` with WAL mode enabled). This guarantees submitted loan cases, user accounts, and AI usage records persist permanently across backend restarts and patient logout/login sessions without relying on insecure client-side `localStorage`.

2. **Vite Watcher Optimization (Resolved):** SQLite database transactions write to `server/data/curify.db` and its associated WAL/SHM files. To prevent infinite browser reload loops when patients submit inquiries on `/patient/intake`, `vite.config.ts` includes `server.watch.ignored` patterns for `**/server/**`, `**/*.db*`, and `**/.quota_cache.json`.

3. **Daily AI Quota Tracking & Real-Time Sync (Resolved):** Patients are allocated 3 AI healthcare analyses per day. Quota is tracked in `ai_usage_quotas` and verified via `aiRateLimit.ts`. The frontend maintains real-time synchronization through `AppContext` (`aiQuota` state + `refreshQuota()`), updating the quota gauge on `/patient/intake` and displaying quota attribution on `/patient/analysis`.

4. **Healthcare Analysis Safety Race Timeout (Resolved):** The stage 2 analysis screen (`Analysis.tsx`) executes an 8-second safety race between the Gemini API and an automatic deterministic taxonomy fallback (`resolveClinicalMapping()`). This guarantees the "Structuring Healthcare Analysis" progress screen never hangs indefinitely even during upstream API latency.

5. **Session Scoping & Auto-Sign-In Prevention:** The demo underwriter session is explicitly scoped to `sessionStorage` (`curify_demo_user`). Persistent `localStorage` is purged on cold boot to ensure visitors always start on the clean landing page rather than inadvertently entering the lender desk.

6. **Lender Auth Dual-Path:** The lender underwriting desk works seamlessly through both the direct form login (`lender@curify.ai` / `Curify@2026`) and the preview drawer. Requests attach JWT tokens or fallback `x-demo-role: lender` headers supported by backend auth middleware.

7. **RoleGuard Variadic & Array Support:** The `requireRole` middleware automatically flattens role arguments (`roles.flat()`), ensuring both `requireRole('lender')` and `requireRole(['lender', 'admin'])` route contracts function correctly.

8. **Hospital Data is Seeded:** Hospital and procedure data are pre-seeded across 5 Indian cities with differentiated geographic economics multipliers and facility tiers. Prices are realistic benchmarks modeled on market research.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ 
- **npm** v9+
- **PostgreSQL** (optional — app auto-falls back to in-memory DB)
- **Clerk Account** — Get keys from [dashboard.clerk.com](https://dashboard.clerk.com)

### 1. Clone & Install

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Configure Environment Variables

```bash
# Frontend (.env)
cp .env.example .env
# Add your VITE_CLERK_PUBLISHABLE_KEY

# Backend (server/.env)
cp server/.env.example server/.env
# Add your CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY
# Optionally configure PostgreSQL connection
```

### 3. Start Development Servers

```bash
# Terminal 1 — Backend (auto-seeds database on first run)
cd server
npm run dev

# Terminal 2 — Frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000
- Health Check: http://localhost:5000/api/health

### 4. Database Commands (optional, for real PostgreSQL)

```bash
cd server
npm run db:create    # Create database
npm run db:migrate   # Run schema migration
npm run db:seed      # Seed demo data
npm run db:reset     # Drop all tables and re-seed
```

### Default Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Lender** | `lender@curify.ai` | `Curify@2026` |
| **Lender (alt)** | `neha@curify.ai` | `Curify@2026` |
| **Patient** | Register via Clerk SSO (Google) | — |

---

## 🔧 Environment Variables

### Frontend (`.env`)

| Variable | Required | Description |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key (starts with `pk_test_`) |
| `VITE_CARTO_API_KEY` | ❌ | Optional CARTO map key. Falls back to OpenStreetMap |
| `VITE_MAP_TILES_URL` | ❌ | Optional custom map tile URL |

### Backend (`server/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ❌ | PostgreSQL connection string. Falls back to SQLite / pg-mem |
| `DB_HOST` | ❌ | PostgreSQL host (default: `localhost`) |
| `DB_PORT` | ❌ | PostgreSQL port (default: `5432`) |
| `DB_USER` | ❌ | PostgreSQL user (default: `postgres`) |
| `DB_PASSWORD` | ❌ | PostgreSQL password |
| `DB_NAME` | ❌ | PostgreSQL database name (default: `curify`) |
| `CLERK_PUBLISHABLE_KEY` | ✅ | Clerk publishable key |
| `CLERK_SECRET_KEY` | ✅ | Clerk secret key (starts with `sk_test_`) |
| `PORT` | ❌ | Server port (default: `5000`) |
| `CLIENT_URL` | ❌ | Frontend URL (default: `http://localhost:5173`) |
| `NODE_ENV` | ❌ | Environment (default: `development`) |
| `GEMINI_API_KEY` | ❌ | Google Gemini API key(s) (comma-separated for rotation; falls back to rule-based) |
| `GEMINI_MODEL` | ❌ | Gemini model identifier (default: `gemini-2.0-flash`) |
| `AI_TIMEOUT_MS` | ❌ | Request timeout in milliseconds for Gemini calls (default: `4000`) |
| `AI_CACHE_ENABLED` | ❌ | Enable database caching for clinical mappings (default: `true`) |
| `AI_DAILY_LIMIT` | ❌ | Maximum AI analyses per user per day (default: `3`, resets at midnight IST) |

---

## 🤖 Context for AI Agents

> **This section is specifically for AI coding agents (Claude, GPT, Gemini, etc.) that may continue development on this project.**

### Critical Architecture Decisions

1. **3-Tier Database Architecture:** The backend in `server/src/config/database.ts` initializes with a 3-tier fallback strategy:
   - **Tier 1:** Real PostgreSQL (if `DATABASE_URL` or `DB_HOST` is accessible).
   - **Tier 2:** Persistent SQLite via `better-sqlite3` (`server/data/curify.db` with WAL mode & foreign keys). This is the default in local development, ensuring loan cases, user accounts, and AI quota counts permanently survive server restarts and browser re-logins.
   - **Tier 3:** Ephemeral `pg-mem` in-memory engine (last-resort fallback).
   - All SQL queries and migrations run through a PostgreSQL-to-SQLite translation adapter (`server/src/config/sqlite-adapter.ts`).

2. **Auth Flow:** Clerk JWT → `server/src/middleware/auth.ts` → auto-provisions user in PostgreSQL/SQLite → attaches `req.user` (UUID). The frontend's `AuthContext` syncs Clerk state with backend via `/api/auth/me` on every page load.

3. **Hospital Matching:** The matching algorithm in `server/src/services/hospital.service.ts` uses haversine distance + multi-factor scoring. City names are matched with fuzzy `LIKE` patterns (handles "Delhi NCR" → `%delhi%`, "Bengaluru"/"Bangalore" aliases).

4. **Client-Side Fallbacks:** Every API call in `AppContext.tsx` has a `try/catch` with local data fallback. This means the app works even if the backend is down — but with static mock data instead of database-backed data.

5. **Cases Isolation:** Patient cases are filtered by `patientId === user.id` on both frontend and backend. New users will always see zero cases. Mock cases in `src/data/cases.ts` are only loaded for lender demo sessions.

6. **Hospital Comparison Lifecycle:** The "Compare" button on hospital cards triggers an instant side-by-side modal (`HospitalComparisonModal`) pairing the chosen hospital with the highest-ranked alternative. Crucial UX rule: the card button permanently renders text "Compare" (never flips to "Comparing" or toggles clutter), and closing the modal resets all staged comparison state (`compareList = []`) so no lingering floating docks or badges remain.

7. **PDF Report Dossier Architecture:** Loan dossiers are compiled dynamically on `/api/reports/:caseId/pdf` using PDFKit in `server/src/services/report.service.ts`. The template is designed as a strict **2-page healthcare-financing case dossier**. It bundles TrueType fonts in `server/assets/fonts/` (`Font-Regular.ttf`, `Font-Bold.ttf`) to natively render the Indian Rupee (`₹`) symbol (avoiding Type 1 Helvetica encoding corruptions). In addition, `doc.page.margins.bottom = 0` and `{ lineBreak: false }` are applied during the `bufferedPageRange()` loop to prevent PDFKit's default margins from triggering unwanted extra pages.

8. **Real-Time SSE Event Bus:** Real-time updates use an in-process pub/sub event bus (`server/src/services/event-bus.service.ts`) over Server-Sent Events (`GET /api/cases/:id/events/stream`). When a lender reviews, approves, or rejects a case, `CaseEventService.createEvent()` records the event in PostgreSQL/pg-mem and publishes it to active SSE clients. Authentication supports both Authorization headers and `?token=` query parameters for native browser `EventSource` compatibility.

9. **Patient-Dedicated Account Creation & Centered-Card Ambient Architecture:** Account creation (`Login.tsx` signup mode) is strictly reserved for patients. The lender role is restricted to authenticated partner underwriting staff; lenders sign in using their assigned credentials or the partner preview drawer. The authentication page employs a refined centered-card ambient layout (`src/login-ambient.css`) engineered with `100dvh` flex sizing to prevent desktop scrollbars, subtle asymmetric orbital feature wings, and a strictly anchored card footprint with an in-place `200ms cubic-bezier` form cross-fade that eliminates layout shift between Sign In and Create Account modes.

10. **Differentiated Procedural Pricing Engine:** The matching and pricing system in `server/src/services/pricing.service.ts` and `hospital.service.ts` resolves procedure-specific pricing rather than uniform default values. The engine computes:
    - **Clinical Procedure Baseline:** Benchmarked against real-world Indian healthcare data (Knee Replacement ~₹1.35L–₹1.65L, Hip Replacement ~₹1.50L–₹1.95L, Gallbladder Cholecystectomy ~₹58k–₹78k, Cataract Surgery ~₹32k–₹50k, Coronary Angiography ~₹16k–₹24k, Angioplasty PCI ~₹1.35L–₹1.95L, Hernia Repair ~₹50k–₹70k, Kidney Stone RIRS ~₹58k–₹79k).
    - **Geographic Economics Multipliers:** City-adjusted tariffs (Mumbai 1.22x, Delhi NCR 1.16x, Bengaluru 1.10x, Pune 1.02x, Ahmedabad 1.00x).
    - **Hospital Facility & Accreditation Tier:** Public/Municipal (0.70x), Subsidized Trust (0.78x), Leading Multi-specialty (0.94x–1.05x), and JCI International Flagships (1.16x).
    - **Deterministic Facility Micro-Variance:** Facility ID/name hash offsets (±3.5%) guaranteeing every hospital has a distinct quote.
    - **Component Consistency:** Itemized clinical components (OT fees, USFDA implants, stay, surgeon fees, diagnostics, medications) sum with 100% mathematical precision to `totalMin` and `totalMax`.
    - **UI Badging:** Hospitals with the lowest tariff dynamically render a green "Lowest Tariff" badge and sorting by "Lowest Estimated Cost" / "Highest Tier Facilities" re-sorts providers accurately.

11. **Daily AI Quota & Gemini Clinical Analyzer:** The backend invokes Google Gemini 3.6 / Flash (`gemini-clinical.service.ts`) with multi-key rotation and an automated rule-based fallback. Patient daily usage is capped at 3 requests/day, resetting strictly at 12:00:00 AM IST (Asia/Kolkata timezone). Quotas are enforced in `aiRateLimit.ts` via atomic DB operations on `ai_usage_quotas` backed by persistent file cache. The frontend binds `aiQuota` and `refreshQuota()` into `AppContext`, updating gauges and enforcing the limit in real time.

### Common Modification Patterns

**Adding a new procedure type:**
1. Add clinical mapping to `src/data/hospitals.ts` → `mockClinicalMappings`
2. Add keyword matching in `server/src/services/clinical.service.ts`
3. Add procedure entries in `procedure_pricing_import_template.csv` or `server/src/db/seed.ts`

**Adding a new city:**
1. Add to `CITIES` array in `src/pages/patient/Onboarding.tsx`
2. Add to `cityPresets` in `src/pages/patient/Intake.tsx`
3. Add coordinates in `server/src/services/hospital.service.ts` → `getCityCoordinates()`
4. Add coordinates in `src/components/HospitalMap.tsx` → `CITY_COORDS`
5. Add hospitals + procedures in `server/src/db/seed.ts`
6. Re-run `npm run db:seed` or restart server (pg-mem auto-seeds)

**Adding a new API endpoint:**
1. Create/update service in `server/src/services/`
2. Create/update controller in `server/src/controllers/`
3. Create/update route in `server/src/routes/`
4. Register route in `server/src/server.ts`
5. Add API call in `src/lib/api.ts`

### File Size Indicators (for context budget)

| File | Lines | Notes |
|---|---|---|
| `src/pages/Login.tsx` | ~1,450 | Clerk authentication, custom OTP flow, viewport-fitted ambient layout & auto-redirect |
| `src/data/hospitals.ts` | ~1,069 | Hospital master records and clinical procedure benchmarks |
| `src/pages/lender/CaseDetails.tsx` | ~971 | Comprehensive case review, tariff audit, and syndication |
| `src/pages/Landing.tsx` | ~871 | Full marketing landing page with interactive widgets |
| `src/pages/patient/Hospitals.tsx` | ~760 | Hospital comparison matrix, filtering, and map view |
| `src/pages/patient/Onboarding.tsx` | ~668 | 4-step onboarding flow with validation |
| `server/src/db/seed.ts` | ~547 | Master database seeder for hospitals, procedures, and NBFCs |
| `src/pages/patient/Case.tsx` | ~540 | Live case dossier, SSE event feed, and offer selection |
| `src/context/AppContext.tsx` | ~534 | Central application state, case CRUD, and AI quota sync |
| `server/src/services/report.service.ts` | ~518 | 2-page PDF loan dossier generator with native ₹ font |
| `src/pages/patient/Plan.tsx` | ~484 | Treatment plan builder and itemized cost rollup |
| `src/pages/patient/Intake.tsx` | ~427 | Procedure search interface with real-time AI quota gauge |

### Development Commands Quick Reference

```bash
# Frontend
npm run dev          # Start Vite dev server (:5173)
npm run build        # Production build
npm run preview      # Preview production build

# Backend
cd server
npm run dev          # Start Express with tsx watch (:5000)
npm run build        # Compile TypeScript
npm run start        # Run compiled JS
npm run db:seed      # Re-seed database
npm run db:reset     # Reset + re-seed database
```

---

*Built as a 7th semester college project. For questions or contributions, reach out to the development team.*
