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
      INSERT INTO centres (id, name, address, lat, lng, block_id, capacity, clubbed_school_ids)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        address = excluded.address,
        lat = excluded.lat,
        lng = excluded.lng,
        block_id = excluded.block_id,
        capacity = excluded.capacity,
        clubbed_school_ids = excluded.clubbed_school_ids
    `).bind(
      centre.id,
      centre.name,
      centre.address || '',
      centre.lat,
      centre.lng,
      centre.blockId || centre.block_id,
      centre.capacity || 300,
      JSON.stringify(centre.clubbedSchoolIds || [])
    ).run();

    return Response.json({ success: true, centre });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
};
