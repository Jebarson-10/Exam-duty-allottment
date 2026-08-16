// Cloudflare Pages Function: /api/schools
// Interacts with Cloudflare D1 SQLite Database

interface Env {
  DB: any; // D1 Database binding
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { results } = await context.env.DB.prepare('SELECT * FROM schools ORDER BY name ASC').all();
    const mapped = results.map((r: any) => ({
      ...r,
      blockId: r.block_id,
      studentStrength10th: r.student_strength_10th,
      studentStrength11th: r.student_strength_11th,
      studentStrength12th: r.student_strength_12th,
    }));
    return Response.json(mapped);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const school: any = await context.request.json();
    await context.env.DB.prepare(`
      INSERT INTO schools (id, name, address, lat, lng, block_id, type, phone, email, principal_name,
        student_strength_10th, student_strength_11th, student_strength_12th)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        address = excluded.address,
        lat = excluded.lat,
        lng = excluded.lng,
        block_id = excluded.block_id,
        type = excluded.type,
        phone = excluded.phone,
        email = excluded.email,
        principal_name = excluded.principal_name,
        student_strength_10th = excluded.student_strength_10th,
        student_strength_11th = excluded.student_strength_11th,
        student_strength_12th = excluded.student_strength_12th
    `).bind(
      school.id,
      school.name,
      school.address || '',
      school.lat ?? 0,
      school.lng ?? 0,
      school.blockId || school.block_id,
      school.type || 'Government',
      school.phone || '',
      school.email || '',
      school.principalName || null,
      school.studentStrength10th ?? 0,
      school.studentStrength11th ?? 0,
      school.studentStrength12th ?? 0
    ).run();

    return Response.json({ success: true, school });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};
