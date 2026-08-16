// Cloudflare Pages Function: /api/sync
// Full bidirectional district-dataset synchronisation with the D1 database.
//
// GET  → returns the entire master dataset (camelCase, matching frontend types).
// POST → atomically replaces the server dataset with the posted snapshot.
//
// The constraint-solving engines run client-side (to stay within the Workers
// CPU budget), so the portal pushes the final solution here in one batch write.

interface Env {
  DB: any;
}

interface SyncPayload {
  blocks?: any[];
  schools?: any[];
  centres?: any[];
  teachers?: any[];
  dutyHistory?: any[];
  examCycles?: any[];
  allotments?: any[];
  batches?: any[];
  auditLogs?: any[];
  activeCycle?: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const q = async (sql: string) => (await context.env.DB.prepare(sql).all()).results ?? [];

    const [blocks, schools, centres, teachers, history, cycles, allotments, batches, audit, state] =
      await Promise.all([
        q('SELECT * FROM blocks ORDER BY code ASC'),
        q('SELECT * FROM schools ORDER BY name ASC'),
        q('SELECT * FROM centres ORDER BY name ASC'),
        q('SELECT * FROM teachers ORDER BY seniority_rank ASC'),
        q('SELECT * FROM duty_history ORDER BY year DESC, allotment_date DESC'),
        q('SELECT * FROM exam_cycles ORDER BY start_date ASC'),
        q('SELECT * FROM duty_allotment ORDER BY created_at ASC'),
        q('SELECT * FROM batches ORDER BY id ASC'),
        q('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 500'),
        context.env.DB.prepare("SELECT value FROM app_state WHERE key = 'active_cycle'").first<any>(),
      ]);

    return Response.json({
      blocks: blocks.map((r: any) => ({ ...r, blockId: r.block_id, code: r.code ?? undefined })),
      schools: schools.map((r: any) => ({
        ...r,
        blockId: r.block_id,
        principalName: r.principal_name,
        studentStrength10th: r.student_strength_10th,
        studentStrength11th: r.student_strength_11th,
        studentStrength12th: r.student_strength_12th,
      })),
      centres: centres.map((r: any) => ({
        ...r,
        centreNumber: r.centre_number,
        blockId: r.block_id,
        schoolId: r.school_id,
        totalHalls: r.total_halls,
        clubbedSchoolIds: r.clubbed_school_ids ? JSON.parse(r.clubbed_school_ids) : [],
        chiefSuperintendentRoom: r.chief_superintendent_room,
        contactPerson: r.contact_person,
      })),
      teachers: teachers.map((r: any) => ({
        ...r,
        schoolId: r.school_id,
        seniorityRank: r.seniority_rank,
        dateOfJoining: r.date_of_joining,
        homeLat: r.home_lat,
        homeLng: r.home_lng,
        isExempted: r.is_exempted === 1,
        exemptionReason: r.exemption_reason,
        pairedTeacherId: r.paired_teacher_id,
      })),
      dutyHistory: history.map((r: any) => ({
        ...r,
        teacherId: r.teacher_id,
        teacherName: r.teacher_name,
        academicYear: r.academic_year,
        examCycleId: r.exam_cycle_id,
        dutyType: r.duty_type,
        centreId: r.centre_id,
        centreName: r.centre_name,
        allotmentDate: r.allotment_date,
      })),
      examCycles: cycles.map((r: any) => ({
        ...r,
        startDate: r.start_date,
        endDate: r.end_date,
        isActive: r.is_active === 1,
      })),
      allotments: allotments.map((r: any) => ({
        ...r,
        examCycleId: r.exam_cycle_id,
        teacherId: r.teacher_id,
        teacherName: r.teacher_name,
        teacherDesignation: r.teacher_designation,
        teacherSchoolId: r.teacher_school_id,
        teacherSubject: r.teacher_subject,
        centreId: r.centre_id,
        centreName: r.centre_name,
        dutyType: r.duty_type,
        hallNumber: r.hall_number,
        allotmentDate: r.allotment_date,
        dates: r.dates ? JSON.parse(r.dates) : undefined,
        distanceKm: r.distance_km,
        isManualOverride: r.is_manual_override === 1,
        overrideReason: r.override_reason,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      batches: batches.map((r: any) => ({
        ...r,
        schoolId: r.school_id,
        centreId: r.centre_id,
        examCycleId: r.exam_cycle_id,
        internalTeacherId: r.internal_teacher_id,
        externalTeacherId: r.external_teacher_id,
      })),
      auditLogs: audit.map((r: any) => ({
        ...r,
        userEmail: r.user_email,
        ipAddress: r.ip_address,
      })),
      activeCycle: state?.value ?? null,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let payload: SyncPayload;
  try {
    payload = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const num = (v: any, d = 0) => (v === undefined || v === null ? d : v);
  const str = (v: any, d: any = null) => (v === undefined || v === null || v === '' ? d : v);

  try {
    const statements: any[] = [
      context.env.DB.prepare('DELETE FROM duty_allotment'),
      context.env.DB.prepare('DELETE FROM batches'),
      context.env.DB.prepare('DELETE FROM duty_history'),
      context.env.DB.prepare('DELETE FROM audit_logs'),
      context.env.DB.prepare('DELETE FROM teachers'),
      context.env.DB.prepare('DELETE FROM centres'),
      context.env.DB.prepare('DELETE FROM schools'),
      context.env.DB.prepare('DELETE FROM exam_cycles'),
    ];

    const insBlocks = context.env.DB.prepare(
      'INSERT INTO blocks (id, name, code) VALUES (?, ?, ?)'
    );
    const insSchools = context.env.DB.prepare(
      `INSERT INTO schools (id, name, address, lat, lng, block_id, type, phone, email, principal_name,
        student_strength_10th, student_strength_11th, student_strength_12th) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    const insCentres = context.env.DB.prepare(
      `INSERT INTO centres (id, centre_number, name, address, lat, lng, block_id, school_id, capacity, total_halls,
        clubbed_school_ids, chief_superintendent_room, contact_person, phone) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    const insTeachers = context.env.DB.prepare(
      `INSERT INTO teachers (id, name, gender, school_id, subject, designation, seniority_rank, date_of_joining,
        home_lat, home_lng, is_exempted, exemption_reason, phone, email, paired_teacher_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    const insCycles = context.env.DB.prepare(
      'INSERT INTO exam_cycles (id, label, standard, start_date, end_date, is_active) VALUES (?,?,?,?,?,?)'
    );
    const insHistory = context.env.DB.prepare(
      `INSERT INTO duty_history (id, teacher_id, teacher_name, year, academic_year, exam_cycle_id, duty_type,
        centre_id, centre_name, role, subject, allotment_date, notes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    const insBatches = context.env.DB.prepare(
      `INSERT INTO batches (id, school_id, centre_id, subject, size, session, day, date, exam_cycle_id,
        internal_teacher_id, external_teacher_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    );
    const insAllotments = context.env.DB.prepare(
      `INSERT INTO duty_allotment (id, teacher_id, teacher_name, teacher_designation, teacher_school_id,
        teacher_subject, centre_id, centre_name, duty_type, role, subject, exam_cycle_id, allotment_date, date,
        dates, session, status, hall_number, distance_km, is_manual_override, override_reason, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    const insAudit = context.env.DB.prepare(
      'INSERT INTO audit_logs (id, user_email, action, details, timestamp, ip_address) VALUES (?,?,?,?,?,?)'
    );

    for (const b of payload.blocks ?? []) {
      statements.push(insBlocks.bind(b.id, b.name, str(b.code)));
    }
    for (const s of payload.schools ?? []) {
      statements.push(insSchools.bind(
        s.id, s.name, str(s.address, ''), num(s.lat), num(s.lng), s.blockId, s.type || 'Government',
        str(s.phone, ''), str(s.email, ''), str(s.principalName, ''),
        num(s.studentStrength10th), num(s.studentStrength11th), num(s.studentStrength12th)
      ));
    }
    for (const c of payload.centres ?? []) {
      statements.push(insCentres.bind(
        c.id, str(c.centreNumber), c.name, str(c.address, ''), num(c.lat), num(c.lng), c.blockId, str(c.schoolId),
        num(c.capacity, 300), num(c.totalHalls),
        c.clubbedSchoolIds ? JSON.stringify(c.clubbedSchoolIds) : null,
        str(c.chiefSuperintendentRoom), str(c.contactPerson), str(c.phone, '')
      ));
    }
    for (const t of payload.teachers ?? []) {
      statements.push(insTeachers.bind(
        t.id, t.name, t.gender || 'M', t.schoolId, t.subject || 'General', t.designation || 'B.T. Assistant',
        num(t.seniorityRank, 9999), str(t.dateOfJoining, ''), str(t.homeLat), str(t.homeLng),
        t.isExempted ? 1 : 0, str(t.exemptionReason, ''), str(t.phone, ''), str(t.email, ''),
        str(t.pairedTeacherId)
      ));
    }
    for (const cy of payload.examCycles ?? []) {
      statements.push(insCycles.bind(
        cy.id, cy.label, cy.standard, cy.startDate, cy.endDate, cy.isActive ? 1 : 0
      ));
    }
    for (const h of payload.dutyHistory ?? []) {
      statements.push(insHistory.bind(
        h.id, h.teacherId, str(h.teacherName, ''), num(h.year, new Date().getFullYear()), str(h.academicYear),
        str(h.examCycleId), h.dutyType, h.centreId, str(h.centreName, ''), h.role, str(h.subject),
        str(h.allotmentDate), str(h.notes, '')
      ));
    }
    for (const b of payload.batches ?? []) {
      statements.push(insBatches.bind(
        b.id, b.schoolId, str(b.centreId), b.subject || 'General', num(b.size, 50), b.session || 'FN',
        num(b.day, 1), str(b.date), b.examCycleId, str(b.internalTeacherId), str(b.externalTeacherId)
      ));
    }
    for (const a of payload.allotments ?? []) {
      statements.push(insAllotments.bind(
        a.id, a.teacherId, str(a.teacherName, ''), str(a.teacherDesignation), str(a.teacherSchoolId),
        str(a.teacherSubject), a.centreId, str(a.centreName, ''), a.dutyType, a.role, str(a.subject),
        a.examCycleId, str(a.allotmentDate), str(a.date),
        a.dates ? JSON.stringify(a.dates) : null, str(a.session), a.status || 'Draft', str(a.hallNumber),
        num(a.distanceKm), a.isManualOverride ? 1 : 0, str(a.overrideReason),
        str(a.createdAt, new Date().toISOString()), str(a.updatedAt, new Date().toISOString())
      ));
    }
    for (const l of payload.auditLogs ?? []) {
      statements.push(insAudit.bind(
        l.id, l.userEmail || 'admin@erode.tnschools.gov.in', l.action, str(l.details, ''),
        str(l.timestamp, new Date().toISOString()), str(l.ipAddress)
      ));
    }
    if (payload.activeCycle) {
      statements.push(
        context.env.DB.prepare(
          `INSERT INTO app_state (key, value, updated_at) VALUES ('active_cycle', ?, datetime('now'))
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`
        ).bind(payload.activeCycle)
      );
    }

    await context.env.DB.batch(statements);

    return Response.json({
      success: true,
      syncedAt: new Date().toISOString(),
      counts: {
        blocks: payload.blocks?.length ?? 0,
        schools: payload.schools?.length ?? 0,
        centres: payload.centres?.length ?? 0,
        teachers: payload.teachers?.length ?? 0,
        dutyHistory: payload.dutyHistory?.length ?? 0,
        examCycles: payload.examCycles?.length ?? 0,
        allotments: payload.allotments?.length ?? 0,
        batches: payload.batches?.length ?? 0,
        auditLogs: payload.auditLogs?.length ?? 0,
      },
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};
