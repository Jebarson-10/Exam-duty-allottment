-- Erode CEO Office Exam Duty Allotment System — Cloudflare D1 Database Schema
-- v2 — aligned with frontend domain types for full /api/sync persistence.
-- NOTE: `CREATE TABLE IF NOT EXISTS` will not alter an existing database.
-- For upgrades from v1, drop the affected tables (or the whole DB) and re-run
-- this file, then push a fresh snapshot from the portal (Audit → Backup → Sync).

-- Key/Value application state (e.g. active exam cycle)
CREATE TABLE IF NOT EXISTS app_state (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Blocks Master
CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT
);

-- Schools Master
CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    lat REAL NOT NULL DEFAULT 0,
    lng REAL NOT NULL DEFAULT 0,
    block_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Government', -- Government, Government Aided, Matriculation, Self-Finance
    phone TEXT,
    email TEXT,
    principal_name TEXT,
    student_strength_10th INTEGER DEFAULT 0,
    student_strength_11th INTEGER DEFAULT 0,
    student_strength_12th INTEGER DEFAULT 0
);

-- Exam Centres Master
CREATE TABLE IF NOT EXISTS centres (
    id TEXT PRIMARY KEY,
    centre_number TEXT, -- official CEO Office centre number (மைய எண்)
    name TEXT NOT NULL,
    address TEXT,
    lat REAL NOT NULL DEFAULT 0,
    lng REAL NOT NULL DEFAULT 0,
    block_id TEXT NOT NULL,
    school_id TEXT, -- host school if the centre is located inside a school
    capacity INTEGER NOT NULL DEFAULT 300,
    total_halls INTEGER NOT NULL DEFAULT 0,
    clubbed_school_ids TEXT, -- JSON array of school IDs sharing this centre
    chief_superintendent_room TEXT,
    contact_person TEXT,
    phone TEXT
);

-- Teachers Master
CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    gender TEXT DEFAULT 'M',
    school_id TEXT NOT NULL,
    subject TEXT NOT NULL,
    designation TEXT NOT NULL, -- Principal, Headmaster, PG Assistant, B.T. Assistant, etc.
    seniority_rank INTEGER NOT NULL DEFAULT 9999,
    date_of_joining TEXT,
    home_lat REAL,
    home_lng REAL,
    is_exempted INTEGER NOT NULL DEFAULT 0, -- 0 = active, 1 = exempted (medical / physically challenged / retiring)
    exemption_reason TEXT,
    phone TEXT,
    email TEXT,
    paired_teacher_id TEXT -- practical paired-examiner role swapping
);

-- Past Duty History (for 2-year no-repeat & fairness tracking)
CREATE TABLE IF NOT EXISTS duty_history (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL,
    teacher_name TEXT,
    year INTEGER NOT NULL,
    academic_year TEXT, -- e.g. '2025-2026'
    exam_cycle_id TEXT,
    duty_type TEXT NOT NULL, -- Theory, Practical, Hall Invigilation
    centre_id TEXT NOT NULL,
    centre_name TEXT,
    role TEXT NOT NULL, -- Chief Superintendent, Department Officer, Internal/External Examiner, Invigilator, Standby
    subject TEXT,
    allotment_date TEXT,
    notes TEXT
);

-- Exam Cycles (e.g., 12th HSE March 2026)
CREATE TABLE IF NOT EXISTS exam_cycles (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    standard TEXT NOT NULL, -- 10th, 11th, 12th
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1
);

-- Practical Batches
CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    school_id TEXT NOT NULL,
    centre_id TEXT,
    subject TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 50,
    session TEXT NOT NULL, -- FN / AN
    day INTEGER NOT NULL DEFAULT 1,
    date TEXT,
    exam_cycle_id TEXT NOT NULL,
    internal_teacher_id TEXT,
    external_teacher_id TEXT
);

-- Halls Configuration per Centre
CREATE TABLE IF NOT EXISTS halls (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL,
    hall_number INTEGER NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 20,
    standby INTEGER NOT NULL DEFAULT 0,
    exam_cycle_id TEXT NOT NULL
);

-- Generated Duty Allotments
CREATE TABLE IF NOT EXISTS duty_allotment (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL,
    teacher_name TEXT,
    teacher_designation TEXT,
    teacher_school_id TEXT,
    teacher_subject TEXT,
    centre_id TEXT NOT NULL,
    centre_name TEXT,
    duty_type TEXT NOT NULL, -- Theory, Practical, Hall Invigilation
    role TEXT NOT NULL,
    subject TEXT,
    exam_cycle_id TEXT NOT NULL,
    allotment_date TEXT,
    date TEXT,
    dates TEXT, -- JSON array of dates (multi-day duty)
    session TEXT, -- FN / AN / BOTH / Full Day
    status TEXT NOT NULL DEFAULT 'Draft', -- Draft, Published, Dispatched
    hall_number INTEGER,
    distance_km REAL DEFAULT 0,
    is_manual_override INTEGER NOT NULL DEFAULT 0,
    override_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Audit Log Trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL DEFAULT 'admin@erode.tnschools.gov.in',
    action TEXT NOT NULL,
    details TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    ip_address TEXT
);

-- Indices for rapid queries
CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_id);
CREATE INDEX IF NOT EXISTS idx_teachers_designation ON teachers(designation);
CREATE INDEX IF NOT EXISTS idx_duty_history_teacher ON duty_history(teacher_id);
CREATE INDEX IF NOT EXISTS idx_duty_allotment_cycle ON duty_allotment(exam_cycle_id);
CREATE INDEX IF NOT EXISTS idx_duty_allotment_centre ON duty_allotment(centre_id);
CREATE INDEX IF NOT EXISTS idx_duty_allotment_teacher ON duty_allotment(teacher_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
