// Cloudflare Pages Function: /api/health
// Liveness + D1 connectivity probe used by the frontend to detect whether a
// serverless backend is available (versus local-first standalone mode).

interface Env {
  DB: any;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await context.env.DB.prepare('SELECT 1').first();
    return Response.json({
      ok: true,
      database: 'connected',
      service: 'erode-exam-duty-allotment',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return Response.json(
      { ok: false, database: 'unavailable', error: err.message },
      { status: 503 }
    );
  }
};
