const http = require("http");

module.exports = (req, res) => {
  const upstream =
    "http://210.61.25.6/BSTruckMIS/subsystem/JSon/keelungposition.ashx";

  http
    .get(upstream, (r) => {
      let data = "";
      r.setEncoding("utf8");

      r.on("data", (chunk) => (data += chunk));
      r.on("end", () => {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.statusCode = 200;
        res.end(data);
      });
    })
    .on("error", (err) => {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, error: String(err) }));
    });
};
