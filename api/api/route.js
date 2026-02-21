export default async function handler(req, res) {
  try {
    const upstream = "http://210.61.25.6/BSTruckMIS/subsystem/JSon/keelungroute.ashx";

    const r = await fetch(upstream, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json,text/plain,*/*"
      },
      cache: "no-store",
    });

    const text = await r.text();

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(text);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
}
