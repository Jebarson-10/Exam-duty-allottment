// Cloudflare Pages Function: /api/centres

interface Env {
  DB: any;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { results } = await context.env.DB.prepare('SELECT * FROM centres ORDER BY name ASC').all();
    const parsed = results.map((r: any) => {
      let clubbedSchoolIds = [];
      if (r.clubbed_school_ids) {
        try {
          clubbedSchoolIds = JSON.parse(r.clubbed_school_ids);
        } catch (e) {
          clubbedSchoolIds = [];
        }
      }
      return {
        ...r,
        clubbedSchoolIds,
      };
    });
    return Response.json(parsed);
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const centre: any = await context.request.json();
    await context.env.DB.prepare(`
      INSERT INTO centres (id, centre_number, name, address, lat, lng, block_id, school_id, capacity, total_halls,
        clubbed_school_ids, chief_superintendent_room, contact_person, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        centre_number = excluded.centre_number,
        name = excluded.name,
        address = excluded.address,
        lat = excluded.lat,
        lng = excluded.lng,
        block_id = excluded.block_id,
        school_id = excluded.school_id,
        capacity = excluded.capacity,
        total_halls = excluded.total_halls,
        clubbed_school_ids = excluded.clubbed_school_ids,
        chief_superintendent_room = excluded.chief_superintendent_room,
        contact_person = excluded.contact_person,
        phone = excluded.phone
    `).bind(
      centre.id,
      centre.centreNumber || null,
      centre.name,
      centre.address || '',
      centre.lat ?? 0,
      centre.lng ?? 0,
      centre.blockId || centre.block_id,
      centre.schoolId || null,
      centre.capacity || 300,
      centre.totalHalls ?? 0,
      JSON.stringify(centre.clubbedSchoolIds || []),
      centre.chiefSuperintendentRoom || null,
      centre.contactPerson || null,
      centre.phone || ''
    ).run();

    return Response.json({ success: true, centre });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};
