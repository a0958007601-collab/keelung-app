export default async function handler(req, res) {
  try {
    const upstream = "http://210.61.25.6/BSTruckMIS/subsystem/JSon/keelungposition.ashx";

    const r = await fetch(upstream, {
      headers: {
        // 有些舊系統會挑 UA/Accept
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json,text/plain,*/*"
      },
      cache: "no-store",
    });

    const text = await r.text();

    // 允許前端跨來源（其實同網域不一定需要，但保險）
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(text);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}
