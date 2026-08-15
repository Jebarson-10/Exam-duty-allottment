// Cloudflare Pages Function: /api/teachers

interface Env {
  DB: any;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { results } = await context.env.DB.prepare('SELECT * FROM teachers ORDER BY seniority_rank ASC').all();
    const mapped = results.map((r: any) => ({
      ...r,
      schoolId: r.school_id,
      seniorityRank: r.seniority_rank,
      dateOfJoining: r.date_of_joining,
      homeLat: r.home_lat,
      homeLng: r.home_lng,
      isExempted: r.is_exempted === 1,
      exemptionReason: r.exemption_reason,
    }));
    return Response.json(mapped);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const teacher: any = await context.request.json();
    await context.env.DB.prepare(`
      INSERT INTO teachers (id, name, school_id, subject, designation, seniority_rank, date_of_joining, home_lat, home_lng, is_exempted, exemption_reason, phone, email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        school_id = excluded.school_id,
        subject = excluded.subject,
        designation = excluded.designation,
        seniority_rank = excluded.seniority_rank,
        date_of_joining = excluded.date_of_joining,
        home_lat = excluded.home_lat,
        home_lng = excluded.home_lng,
        is_exempted = excluded.is_exempted,
        exemption_reason = excluded.exemption_reason,
        phone = excluded.phone,
        email = excluded.email
    `).bind(
      teacher.id,
      teacher.name,
      teacher.schoolId || teacher.school_id,
      teacher.subject,
      teacher.designation,
      teacher.seniorityRank || teacher.seniority_rank || 999,
      teacher.dateOfJoining || teacher.date_of_joining,
      teacher.homeLat || teacher.home_lat || null,
      teacher.homeLng || teacher.home_lng || null,
      teacher.isExempted ? 1 : 0,
      teacher.exemptionReason || '',
      teacher.phone || '',
      teacher.email || ''
    ).run();

    return Response.json({ success: true, teacher });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};
