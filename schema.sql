-- Erode CEO Office Exam Duty Allotment System — Cloudflare D1 Database Schema

-- Blocks Master
CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

-- Schools Master
CREATE TABLE IF NOT EXISTS schools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    block_id TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'Government' -- Government, Aided, Matriculation, etc.
);

-- Exam Centres Master
CREATE TABLE IF NOT EXISTS centres (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    block_id TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    capacity INTEGER NOT NULL DEFAULT 300,
    clubbed_school_ids TEXT -- JSON array of school IDs sharing this centre
);

-- Teachers Master
CREATE TABLE IF NOT EXISTS teachers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    designation TEXT NOT NULL, -- Principal, Headmaster, PG Assistant, BEd Assistant, etc.
    seniority_rank INTEGER NOT NULL DEFAULT 9999,
    date_of_joining TEXT NOT NULL,
    home_lat REAL,
    home_lng REAL,
    is_exempted INTEGER NOT NULL DEFAULT 0, -- 0 = active, 1 = exempted (e.g. medical / physically challenged)
    exemption_reason TEXT,
    phone TEXT,
    email TEXT
);

-- Past Duty History (for 2-year no-repeat & fairness tracking)
CREATE TABLE IF NOT EXISTS duty_history (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    duty_type TEXT NOT NULL, -- Theory, Practical, Hall Invigilation
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- Chief Superintendent, Department Officer, Internal Examiner, External Examiner, Invigilator, Standby
    subject TEXT
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
    school_id TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    centre_id TEXT REFERENCES centres(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 50,
    session TEXT NOT NULL, -- FN / AN / BOTH / Full Day
    day INTEGER NOT NULL DEFAULT 1,
    exam_cycle_id TEXT NOT NULL REFERENCES exam_cycles(id) ON DELETE CASCADE
);

-- Halls Configuration per Centre
CREATE TABLE IF NOT EXISTS halls (
    id TEXT PRIMARY KEY,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    hall_number INTEGER NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 20,
    standby INTEGER NOT NULL DEFAULT 0,
    exam_cycle_id TEXT NOT NULL REFERENCES exam_cycles(id) ON DELETE CASCADE
);

-- Generated Duty Allotments
CREATE TABLE IF NOT EXISTS duty_allotment (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    centre_id TEXT NOT NULL REFERENCES centres(id) ON DELETE CASCADE,
    duty_type TEXT NOT NULL, -- Theory, Practical, Hall Invigilation
    role TEXT NOT NULL, -- Chief Superintendent, Department Officer, Internal Examiner, External Examiner, Invigilator, Standby
    subject TEXT,
    exam_cycle_id TEXT NOT NULL REFERENCES exam_cycles(id) ON DELETE CASCADE,
    date TEXT,
    session TEXT, -- FN / AN / BOTH / Full Day
    status TEXT NOT NULL DEFAULT 'Draft', -- Draft, Published, Dispatched
    hall_number INTEGER,
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
