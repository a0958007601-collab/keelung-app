Js
alert("JS 已載入");
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
