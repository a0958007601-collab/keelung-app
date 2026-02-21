Js
(() => {
  const OFFICIAL = "https://green-cycle.klcg.gov.tw/"; // 官方即時地圖
  const $ = (id) => document.getElementById(id);

  // ---- SW register ----
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }

  // ---- Online/Offline pill ----
  function renderNet() {
    const el = $("netPill");
    const on = navigator.onLine;
    el.textContent = on ? "● 線上" : "● 離線";
    el.style.opacity = on ? "1" : "0.7";
  }
  window.addEventListener("online", renderNet);
  window.addEventListener("offline", renderNet);
  renderNet();

  // ---- Install prompt (Android Chrome) ----
  let deferredPrompt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $("btnInstall").style.display = "inline-flex";
  });
  $("btnInstall").addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt = null;
    $("btnInstall").style.display = "none";
  });

  // ---- Notifications ----
  $("btnNotify").addEventListener("click", async () => {
    if (!("Notification" in window)) return alert("此瀏覽器不支援通知");
    const p = await Notification.requestPermission();
    if (p !== "granted") alert("你未允許通知，提醒功能會受限。");
  });

  // ---- Favorites store ----
  const loadFavs = () => JSON.parse(localStorage.getItem("favs") || "[]");
  const saveFavs = (arr) => localStorage.setItem("favs", JSON.stringify(arr));

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function getAnleUrl() {
    const favs = loadFavs();
    const hit = favs.find((f) => (f.name || "").trim().startsWith("安樂區"));
    return (hit && hit.url) ? hit.url : OFFICIAL;
  }

  function syncQuickLinks() {
    $("btnOfficial").href = OFFICIAL;
    $("btnAnle").href = getAnleUrl();
  }

  function renderFavs() {
    syncQuickLinks();

    const favs = loadFavs();
    const list = $("favList");
    const sel = $("remTarget");

    list.innerHTML = "";
    sel.innerHTML = '<option value="">（預設）官方即時地圖</option>';

    if (favs.length === 0) {
      list.innerHTML = '<div class="muted">尚未加入收藏。</div>';
      return;
    }

    favs.forEach((f, i) => {
      const url = f.url || OFFICIAL;

      // populate reminder target
      const opt = document.createElement("option");
      opt.value = url;
      opt.textContent = f.name || url;
      sel.appendChild(opt);

      const div = document.createElement("div");
      div.className = "fav";
      div.innerHTML = `
        <div style="flex:1; min-width:0">
          <a href="${url}" target="_blank" rel="noreferrer"><b>${escapeHtml(f.name || "未命名")}</b></a>
          <span class="small">${escapeHtml(url)}</span>
        </div>
        <div class="actions">
          <a class="btn secondary" href="${url}" target="_blank" rel="noreferrer">打開</a>
          <button class="btn danger" data-del="${i}">刪除</button>
        </div>
      `;
      list.appendChild(div);
    });

    list.querySelectorAll("button[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-del"));
        const next = loadFavs().filter((_, j) => j !== idx);
        saveFavs(next);
        renderFavs();
      });
    });
  }

  $("btnAddFav").addEventListener("click", () => {
    const name = $("favName").value.trim();
    const url = ($("favUrl").value.trim() || OFFICIAL);
    if (!name) return alert("請輸入名稱（建議：安樂區-...）");

    const favs = loadFavs();
    favs.unshift({ name, url });
    saveFavs(favs.slice(0, 50));
    $("favName").value = "";
    $("favUrl").value = "";
    renderFavs();
  });

  // Add a sample favorite for Anle (always works because it uses OFFICIAL)
  $("btnAddSample").addEventListener("click", () => {
    const favs = loadFavs();
    // Avoid duplicates
    if (!favs.some(f => (f.name || "") === "安樂區-官方即時地圖")) {
      favs.unshift({ name: "安樂區-官方即時地圖", url: OFFICIAL });
      saveFavs(favs.slice(0, 50));
      renderFavs();
      alert("已加入安樂區範例（之後你可以用真正站點/路線網址取代）");
    } else {
      alert("已經有安樂區範例了");
    }
  });

  // ---- Reminders (foreground) ----
  const loadRem = () => JSON.parse(localStorage.getItem("rems") || "[]");
  const saveRem = (arr) => localStorage.setItem("rems", JSON.stringify(arr));

  function renderRems() {
    const list = $("remList");
    const rems = loadRem();
    list.innerHTML = "";

    if (rems.length === 0) {
      list.innerHTML = '<div class="muted">尚無提醒。</div>';
      return;
    }

    rems.forEach((r, i) => {
      const div = document.createElement("div");
      div.className = "rem";
      div.innerHTML = `
        <div style="flex:1">
          <b>${escapeHtml(r.title || "提醒")}</b>
          <span class="small">觸發：${new Date(r.fireAt).toLocaleString("zh-Hant-TW")}</span>
        </div>
        <div class="actions">
          <a class="btn secondary" href="${escapeHtml(r.url || OFFICIAL)}" target="_blank" rel="noreferrer">開啟</a>
          <button class="btn danger" data-rdel="${i}">刪除</button>
        </div>
      `;
      list.appendChild(div);
    });

    list.querySelectorAll("button[data-rdel]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-rdel"));
        const next = loadRem().filter((_, j) => j !== idx);
        saveRem(next);
        renderRems();
      });
    });
  }

  $("btnAddRem").addEventListener("click", () => {
    const time = $("remTime").value;
    if (!time) return alert("請選提醒時間");

    const [hh, mm] = time.split(":").map(Number);
    const title = ($("remTitle").value || "基隆垃圾車提醒").trim();
    const url = $("remTarget").value || OFFICIAL;

    const d = new Date();
    d.setHours(hh, mm, 0, 0);
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);

    const rems = loadRem();
    rems.unshift({ title, url, fireAt: d.toISOString() });
    saveRem(rems.slice(0, 50));
    renderRems();
    alert("已新增提醒（需保持 App 開著）");
  });

  // Tick every 5s
  setInterval(() => {
    const rems = loadRem();
    if (rems.length === 0) return;

    const now = Date.now();
    const due = rems.filter((r) => new Date(r.fireAt).getTime() <= now);
    if (due.length === 0) return;

    due.forEach((r) => {
      if (Notification?.permission === "granted") {
        new Notification(r.title || "基隆垃圾車提醒", {
          body: "點我開啟地圖/站點",
          data: { url: r.url || OFFICIAL },
        });
      }
    });

    const next = rems.filter((r) => new Date(r.fireAt).getTime() > now);
    saveRem(next);
    renderRems();
  }, 5000);

  // Notification click (works better via SW, but keep a fallback)
  window.addEventListener("click", () => {});

  // initial render
  syncQuickLinks();
  renderFavs();
  renderRems();
})();
// ===== Live tracking (Map + positions) =====
(function liveTracking() {
  const mapEl = document.getElementById("map");
  const pill = document.getElementById("livePill");
  const info = document.getElementById("liveInfo");
  const btnCenterAnle = document.getElementById("btnCenterAnle");
  const btnRefreshNow = document.getElementById("btnRefreshNow");

  // 如果你還沒把「即時追蹤地圖」那段 HTML 加到 index.html，這裡會找不到元素，直接略過
  if (!mapEl || !pill || !info) return;

  // Leaflet 若未載入也略過
  if (!window.L) {
    pill.textContent = "● 地圖庫未載入";
    info.textContent = "請確認 index.html 已加入 Leaflet CSS/JS。";
    return;
  }

  const KEELUNG_CENTER = [25.128, 121.741];
  const ANLE_CENTER = [25.132, 121.728];

  const map = L.map("map").setView(KEELUNG_CENTER, 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap",
  }).addTo(map);

  const markers = new Map();

  function setPill(t, ok = true) {
    pill.textContent = t;
    pill.style.opacity = ok ? "1" : "0.7";
  }

  function pick(obj, keys) {
    for (const k of keys) {
      if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
    }
    return null;
  }

  function toNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function guessLatLng(item) {
    const lat = toNum(pick(item, ["lat", "Lat", "LAT", "Latitude", "latitude", "Y", "y"]));
    const lng = toNum(pick(item, ["lng", "Lon", "LON", "Longitude", "longitude", "X", "x"]));
    return (lat && lng) ? [lat, lng] : null;
  }

  function guessId(item, idx) {
    return String(
      pick(item, ["id", "ID", "carId", "CarID", "truckId", "TruckID", "車號", "Plate", "plate", "plateNo"])
      ?? idx
    );
  }

  function guessLabel(item, id) {
    const plate = pick(item, ["車號", "Plate", "plate", "plateNo"]);
    const status = pick(item, ["狀態", "Status", "status"]);
    const route = pick(item, ["路線", "Route", "route", "RouteName", "routeName"]);
    const parts = [];
    if (plate) parts.push(`車號:${plate}`);
    if (route) parts.push(`路線:${route}`);
    if (status) parts.push(`狀態:${status}`);
    return parts.length ? parts.join(" / ") : `車輛 ${id}`;
  }

  // ⚠️ 重要：Vercel 代理會 502，所以先試著從官方站找資料端點（若能）
  // 你之後若能提供官方地圖實際抓資料的 API，我可以把 URL 換成正確的。
  const CANDIDATES = [
    // 先保留你之前嘗試的主機（可能會被 Mixed Content 擋）
    "http://210.61.25.6/BSTruckMIS/subsystem/JSon/keelungposition.ashx",
    // 可能的同源（如果官方站有轉發/代理）
    "https://green-cycle.klcg.gov.tw/api/position",
    "https://green-cycle.klcg.gov.tw/position",
  ];

  async function fetchText(url) {
    const r = await fetch(url, { cache: "no-store" });
    return await r.text();
  }

  async function fetchPositions() {
    setPill("● 更新中…");
    info.textContent = "";

    let lastErr = null;
    let text = null;
    let usedUrl = null;

    for (const url of CANDIDATES) {
      try {
        text = await fetchText(url);
        usedUrl = url;
        break;
      } catch (e) {
        lastErr = e;
      }
    }

    if (!text) {
      setPill("● 更新失敗", false);
      const msg = String(lastErr || "");
      if (msg.includes("Mixed Content") || msg.includes("blocked")) {
        info.textContent =
          "瀏覽器擋下 HTTP 資料（Mixed Content）。要做真正即時追蹤，需要改成：① Android 原生 App（WebView + 本機代理）或 ② 放在台灣本地伺服器/Cloudflare Worker 做 HTTPS 代理。";
      } else {
        info.textContent =
          "讀取資料失敗。可能是端點不存在或被阻擋。你可以把「官方即時地圖」打開後的網頁網址貼給我，我來找它真正的資料 API。";
      }
      return;
    }

    // 嘗試 parse JSON（資料可能是 array 或包在某個欄位）
    let data;
    try { data = JSON.parse(text); } catch { data = null; }

    if (!data) {
      setPill("● 格式不明", false);
      info.textContent = `拿到資料但不是 JSON。使用來源：${usedUrl}`;
      return;
    }

    const arr = Array.isArray(data) ? data
      : Array.isArray(data?.data) ? data.data
      : Array.isArray(data?.Data) ? data.Data
      : Array.isArray(data?.rows) ? data.rows
      : [];

    let plotted = 0;
    const seen = new Set();

    arr.forEach((item, idx) => {
      const ll = guessLatLng(item);
      if (!ll) return;

      const id = guessId(item, idx);
      seen.add(id);

      const label = guessLabel(item, id);

      if (!markers.has(id)) {
        const m = L.marker(ll).addTo(map);
        m.bindPopup(label);
        markers.set(id, m);
      } else {
        markers.get(id).setLatLng(ll);
      }
      plotted++;
    });

    for (const [id, m] of markers.entries()) {
      if (!seen.has(id)) {
        map.removeLayer(m);
        markers.delete(id);
      }
    }

    const now = new Date();
    setPill("● 已更新");
    info.textContent = `更新時間：${now.toLocaleString("zh-Hant-TW")}｜顯示車輛：${plotted} 台｜來源：${usedUrl}`;
  }

  btnCenterAnle?.addEventListener("click", () => map.setView(ANLE_CENTER, 14));
  btnRefreshNow?.addEventListener("click", fetchPositions);

  fetchPositions();
  setInterval(fetchPositions, 10000);
})();
