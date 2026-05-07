// ============================================================
//  Ret.Village 管理者ページ  —  admin.js
// ============================================================
const ADMIN_PASS  = "nasu-admin";
const SESSION_KEY = "rv_admin";
const TOKEN_KEY   = "rv_token";
const GH_OWNER    = "ayumiokumura";
const GH_REPO     = "retvil";
const GH_BRANCH   = "main";

const REQUIRED_PHOTOS = [
  { path: "assets/images/nasu.jpg",        desc: "トップページ 背景",     pages: "index.html" },
  { path: "assets/images/logo.png",        desc: "ロゴ（丸アイコン）",    pages: "index.html" },
  { path: "assets/images/owner_yumi.png",  desc: "オーナー YUMI 顔写真",  pages: "owner.html" },
  { path: "assets/images/owner_mikio.png", desc: "オーナー MIKIO 顔写真", pages: "owner.html" },
];

const GALLERY_SECTIONS = [
  { id: "interior", title: "内装",            title_en: "Interior",              folder: "assets/images/interior" },
  { id: "exterior", title: "外装",            title_en: "Exterior & Garden",     folder: "assets/images/exterior" },
  { id: "amenity",  title: "アメニティ・設備", title_en: "Amenities & Equipment", folder: "assets/images/amenity"  },
];

const FACILITY_SECTIONS = [
  { id: "bath",    title: "バス・トイレ", folder: "assets/images/amenity"  },
  { id: "ac",      title: "エアコン",     folder: "assets/images/interior" },
  { id: "parking", title: "駐車場",       folder: "assets/images"          },
];

// ================================================================
// ページ単位の編集状態
// ================================================================

// 写真ページ（gallery）
const _gallery = {
  editing: false,
  secDefs: [],           // [{id,title,title_en,folder}] — 現在の順序
  origSecDefs: [],       // キャンセル用バックアップ
  secPhotos: {},         // [id]: {photos[], orig[], toDelete Set}
  delSecIds: new Set()   // コミット時にJSONから削除するセクションID
};

// 基本情報ページ（facility）
const _facility = {
  editing: false,
  secPhotos: {}          // [id]: {photos[], orig[], toDelete Set}
};

function galSP(id) {
  if (!_gallery.secPhotos[id])
    _gallery.secPhotos[id] = { photos: [], orig: [], toDelete: new Set() };
  return _gallery.secPhotos[id];
}
function facSP(id) {
  if (!_facility.secPhotos[id])
    _facility.secPhotos[id] = { photos: [], orig: [], toDelete: new Set() };
  return _facility.secPhotos[id];
}
function getGalleryFolder(id) {
  const d = GALLERY_SECTIONS.find(s => s.id === id);
  return d ? d.folder : `assets/images/${id}`;
}
function anyEditing() { return _gallery.editing || _facility.editing; }

window.addEventListener("beforeunload", e => {
  if (anyEditing()) { e.preventDefault(); e.returnValue = ""; }
});

// ================================================================
// GitHub API
// ================================================================

function ghHeaders() {
  return {
    Authorization: `token ${localStorage.getItem(TOKEN_KEY) || ""}`,
    Accept: "application/vnd.github.v3+json",
    "Content-Type": "application/json",
  };
}
function encodePath(p) { return p.split("/").map(encodeURIComponent).join("/"); }

async function ghGet(path) {
  const res = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodePath(path)}?ref=${GH_BRANCH}`,
    { headers: ghHeaders() }
  );
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}
async function ghPut(path, content64, message, sha = null) {
  const body = { message, content: content64, branch: GH_BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodePath(path)}`,
    { method: "PUT", headers: ghHeaders(), body: JSON.stringify(body) }
  );
  if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.message || res.status); }
  return res.json();
}
async function ghDel(path, sha, message) {
  const res = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodePath(path)}`,
    { method: "DELETE", headers: ghHeaders(), body: JSON.stringify({ message, sha, branch: GH_BRANCH }) }
  );
  if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.message || res.status); }
  return res.json();
}

// ================================================================
// 画像圧縮
// ================================================================

function compressImage(file, maxPx = 1920, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        const r = new FileReader();
        r.onload = ev => resolve(ev.target.result.split(",")[1]);
        r.readAsDataURL(blob);
      }, "image/jpeg", quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ================================================================
// photos.json 読み書き
// ================================================================

async function loadPhotosJson() {
  try {
    const data  = await ghGet("data/photos.json");
    const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, "")), c => c.charCodeAt(0));
    return { content: JSON.parse(new TextDecoder().decode(bytes)), sha: data.sha };
  } catch (err) {
    if (err.message === "404") return { content: { sections: [], facility_sections: [] }, sha: null };
    throw err;
  }
}
async function savePhotosJson(content, sha, message) {
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(content, null, 2))));
  return ghPut("data/photos.json", b64, message, sha);
}

// ================================================================
// UI ヘルパー
// ================================================================

function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className   = "a-toast " + (isError ? "a-toast-err" : "a-toast-ok") + " a-toast-show";
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("a-toast-show"), 3500);
}
function setBusy(btn, busy) {
  if (busy)  { btn.dataset.orig = btn.textContent; btn.textContent = "処理中…"; btn.disabled = true; }
  else       { btn.textContent = btn.dataset.orig || btn.textContent; btn.disabled = false; }
}

// ================================================================
// 初期化 / ログイン
// ================================================================

document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem(SESSION_KEY) === "1" && localStorage.getItem(TOKEN_KEY)) showAdmin();

  document.getElementById("login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const pw  = document.getElementById("admin-pw").value;
    const tok = document.getElementById("admin-token").value.trim();
    const err = document.getElementById("login-error");
    if (pw !== ADMIN_PASS) { err.textContent = "パスワードが正しくありません"; return; }
    if (!tok)              { err.textContent = "GitHub トークンを入力してください"; return; }
    const btn = e.submitter;
    setBusy(btn, true); err.textContent = "";
    try {
      const r = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`,
        { headers: { Authorization: `token ${tok}` } });
      if (!r.ok) throw new Error();
      localStorage.setItem(TOKEN_KEY, tok);
      sessionStorage.setItem(SESSION_KEY, "1");
      showAdmin();
    } catch {
      err.textContent = "GitHub トークンが無効です。Scopeを確認してください。";
      setBusy(btn, false);
    }
  });

  document.getElementById("logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY); location.reload();
  });
});

function showAdmin() {
  document.getElementById("admin-login").style.display = "none";
  document.getElementById("admin-main").style.display  = "block";
  renderRequired();
  renderFacilities();
  renderGallery();
}

// ================================================================
// 必須写真（差し替えのみ）
// ================================================================

function renderRequired() {
  const grid = document.getElementById("required-grid");
  grid.innerHTML = "";
  REQUIRED_PHOTOS.forEach(photo => {
    const card = document.createElement("div");
    card.className = "a-card";
    card.innerHTML = `
      <div class="a-img-wrap">
        <img src="${photo.path}?t=${Date.now()}" alt="${photo.desc}" loading="lazy"
             onerror="this.parentElement.innerHTML='<div class=a-no-img>画像なし</div>'">
      </div>
      <div class="a-info">
        <div class="a-desc">${photo.desc}</div>
        <div class="a-pages">📄 ${photo.pages}</div>
        <div class="a-actions"><button class="a-btn-replace">差し替え</button></div>
      </div>`;
    const btn = card.querySelector(".a-btn-replace");
    btn.addEventListener("click", () => {
      const inp = document.createElement("input");
      inp.type = "file"; inp.accept = "image/*";
      inp.addEventListener("change", async () => {
        const file = inp.files[0]; if (!file) return;
        setBusy(btn, true);
        try {
          const b64 = await compressImage(file);
          let sha = null; try { sha = (await ghGet(photo.path)).sha; } catch {}
          await ghPut(photo.path, b64, `Replace: ${photo.path}`, sha);
          card.querySelector("img").src = photo.path + "?t=" + Date.now();
          showToast("差し替え完了！（サイト反映まで約1分）");
        } catch (err) { showToast("エラー: " + err.message, true); }
        finally { setBusy(btn, false); }
      });
      inp.click();
    });
    grid.appendChild(card);
  });
}

// ================================================================
// ページバー（編集 / 決定＋キャンセル）
// ================================================================

function setPageBarIdle(barActsId, onEdit) {
  const el = document.getElementById(barActsId);
  el.innerHTML = "";
  const btn = document.createElement("button");
  btn.className = "a-btn-edit"; btn.textContent = "編集";
  btn.addEventListener("click", onEdit);
  el.appendChild(btn);
}

function setPageBarEditing(barActsId, onCommit, onCancel) {
  const el = document.getElementById(barActsId);
  el.innerHTML = "";
  const commitBtn = document.createElement("button");
  commitBtn.className = "a-btn-commit"; commitBtn.textContent = "決定";
  commitBtn.addEventListener("click", onCommit);
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "a-btn-cancel-edit"; cancelBtn.textContent = "キャンセル";
  cancelBtn.addEventListener("click", onCancel);
  el.appendChild(commitBtn);
  el.appendChild(cancelBtn);
}

// ================================================================
// 基本情報ページ（facility）
// ================================================================

async function renderFacilities() {
  const container = document.getElementById("facilities-container");
  container.innerHTML = "<div class='a-loading'>施設写真を読み込み中…</div>";
  let photosData;
  try { photosData = (await loadPhotosJson()).content; }
  catch (err) { container.innerHTML = `<div class='a-err-msg'>読み込み失敗: ${err.message}</div>`; return; }
  container.innerHTML = "";

  const facSecs = photosData.facility_sections || [];
  FACILITY_SECTIONS.forEach(secDef => {
    const sec = facSecs.find(s => s.id === secDef.id) || { photos: [] };
    const sp  = facSP(secDef.id);
    sp.photos = (sec.photos || []).map(p => ({ ...p }));
    sp.orig   = (sec.photos || []).map(p => ({ ...p }));
    sp.toDelete.clear();
  });

  renderFacilityContainer(container);
  setPageBarIdle("facility-bar-acts", enterFacilityEdit);
}

function renderFacilityContainer(container) {
  container.innerHTML = "";
  FACILITY_SECTIONS.forEach(secDef => container.appendChild(createSectionEl(false, secDef)));
}

function enterFacilityEdit() {
  _facility.editing = true;
  const container = document.getElementById("facilities-container");
  renderFacilityContainer(container);
  setPageBarEditing("facility-bar-acts", commitFacilityChanges, cancelFacilityEdit);
}

function cancelFacilityEdit() {
  Object.values(_facility.secPhotos).forEach(sp => {
    sp.photos.forEach(p => { if (p._previewUrl) URL.revokeObjectURL(p._previewUrl); });
    sp.photos = sp.orig.map(p => ({ ...p }));
    sp.toDelete.clear();
  });
  _facility.editing = false;
  const container = document.getElementById("facilities-container");
  renderFacilityContainer(container);
  setPageBarIdle("facility-bar-acts", enterFacilityEdit);
}

async function commitFacilityChanges() {
  const commitBtn = document.querySelector("#facility-bar-acts .a-btn-commit");
  if (commitBtn) setBusy(commitBtn, true);
  try {
    let uploaded = 0;
    const totalNew = FACILITY_SECTIONS.reduce((n, d) => n + facSP(d.id).photos.filter(p => p._isNew).length, 0);
    const savedPerSec = {};

    for (const secDef of FACILITY_SECTIONS) {
      const sp = facSP(secDef.id);
      const saved = [];
      for (const photo of sp.photos) {
        if (photo._isNew) {
          uploaded++;
          if (totalNew > 1 && commitBtn) commitBtn.textContent = `アップロード中 ${uploaded}/${totalNew}…`;
          const fname = `${Date.now()}_${Math.random().toString(36).slice(2,6)}.jpg`;
          const path  = `${secDef.folder}/${fname}`;
          await ghPut(path, await compressImage(photo._file), `Add: ${secDef.id}/${fname}`);
          URL.revokeObjectURL(photo._previewUrl);
          saved.push({ path, alt: photo.alt || "" });
        } else {
          saved.push({ path: photo.path, alt: photo.alt || "" });
        }
      }
      savedPerSec[secDef.id] = saved;
    }

    const { content, sha } = await loadPhotosJson();
    if (!content.facility_sections) content.facility_sections = [];
    for (const secDef of FACILITY_SECTIONS) {
      let s = content.facility_sections.find(s => s.id === secDef.id);
      if (!s) { s = { id: secDef.id, title: secDef.title, photos: [] }; content.facility_sections.push(s); }
      s.photos = savedPerSec[secDef.id];
    }
    await savePhotosJson(content, sha, "Update facility sections");

    FACILITY_SECTIONS.forEach(secDef => {
      const sp = facSP(secDef.id);
      const saved = savedPerSec[secDef.id];
      sp.photos = saved.map(p => ({ ...p }));
      sp.orig   = saved.map(p => ({ ...p }));
      sp.toDelete.clear();
    });
    _facility.editing = false;
    const container = document.getElementById("facilities-container");
    renderFacilityContainer(container);
    setPageBarIdle("facility-bar-acts", enterFacilityEdit);
    showToast("保存しました！（サイト反映まで約1分）");
  } catch (err) {
    showToast("エラー: " + err.message, true);
    if (commitBtn) setBusy(commitBtn, false);
  }
}

// ================================================================
// 写真ページ（gallery）
// ================================================================

async function renderGallery() {
  const container = document.getElementById("gallery-container");
  container.innerHTML = "<div class='a-loading'>ギャラリーを読み込み中…</div>";
  let photosData;
  try { photosData = (await loadPhotosJson()).content; }
  catch (err) { container.innerHTML = `<div class='a-err-msg'>読み込み失敗: ${err.message}</div>`; return; }
  container.innerHTML = "";

  // sections from JSON + fill-in from GALLERY_SECTIONS if missing
  const jsonSecs = photosData.sections || [];
  const defs = jsonSecs.map(s => ({
    id: s.id, title: s.title, title_en: s.title_en || "", folder: getGalleryFolder(s.id)
  }));
  GALLERY_SECTIONS.forEach(gs => { if (!defs.find(s => s.id === gs.id)) defs.push({ ...gs }); });

  _gallery.secDefs     = defs.map(s => ({ ...s }));
  _gallery.origSecDefs = defs.map(s => ({ ...s }));
  _gallery.delSecIds.clear();

  jsonSecs.forEach(s => {
    const sp = galSP(s.id);
    sp.photos = (s.photos || []).map(p => ({ ...p }));
    sp.orig   = (s.photos || []).map(p => ({ ...p }));
    sp.toDelete.clear();
  });

  renderGalleryContainer(container);
  setPageBarIdle("gallery-bar-acts", enterGalleryEdit);
}

function renderGalleryContainer(container) {
  container.innerHTML = "";
  _gallery.secDefs.forEach(secDef => container.appendChild(createSectionEl(true, secDef)));
  if (_gallery.editing) container.appendChild(createAddSectionCard(container));
}

function enterGalleryEdit() {
  _gallery.editing = true;
  const container = document.getElementById("gallery-container");
  renderGalleryContainer(container);
  setPageBarEditing("gallery-bar-acts", commitGalleryChanges, cancelGalleryEdit);
}

function cancelGalleryEdit() {
  Object.values(_gallery.secPhotos).forEach(sp => {
    sp.photos.forEach(p => { if (p._previewUrl) URL.revokeObjectURL(p._previewUrl); });
    sp.photos = sp.orig.map(p => ({ ...p }));
    sp.toDelete.clear();
  });
  _gallery.secDefs = _gallery.origSecDefs.map(s => ({ ...s }));
  _gallery.delSecIds.clear();
  _gallery.editing = false;
  const container = document.getElementById("gallery-container");
  renderGalleryContainer(container);
  setPageBarIdle("gallery-bar-acts", enterGalleryEdit);
}

async function commitGalleryChanges() {
  const commitBtn = document.querySelector("#gallery-bar-acts .a-btn-commit");
  if (commitBtn) setBusy(commitBtn, true);
  try {
    let uploaded = 0;
    const totalNew = _gallery.secDefs.reduce((n, d) => n + galSP(d.id).photos.filter(p => p._isNew).length, 0);
    const savedPerSec = {};

    for (const secDef of _gallery.secDefs) {
      const sp = galSP(secDef.id);
      const saved = [];
      for (const photo of sp.photos) {
        if (photo._isNew) {
          uploaded++;
          if (totalNew > 1 && commitBtn) commitBtn.textContent = `アップロード中 ${uploaded}/${totalNew}…`;
          const fname = `${Date.now()}_${Math.random().toString(36).slice(2,6)}.jpg`;
          const path  = `${secDef.folder}/${fname}`;
          await ghPut(path, await compressImage(photo._file), `Add: ${secDef.id}/${fname}`);
          URL.revokeObjectURL(photo._previewUrl);
          saved.push({ path, alt: photo.alt || "" });
        } else {
          saved.push({ path: photo.path, alt: photo.alt || "" });
        }
      }
      savedPerSec[secDef.id] = saved;
    }

    // ギャラリーのみファイル削除
    for (const sp of Object.values(_gallery.secPhotos)) {
      for (const delPath of sp.toDelete) {
        try { const fd = await ghGet(delPath); await ghDel(delPath, fd.sha, `Delete: ${delPath}`); } catch {}
      }
    }

    const { content, sha } = await loadPhotosJson();
    // 削除セクションを除去
    content.sections = (content.sections || []).filter(s => !_gallery.delSecIds.has(s.id));
    // 各セクションを更新/追加
    for (const secDef of _gallery.secDefs) {
      let s = content.sections.find(s => s.id === secDef.id);
      if (!s) {
        s = { id: secDef.id, title: secDef.title, title_en: secDef.title_en, photos: [] };
        content.sections.push(s);
      } else {
        s.title    = secDef.title;
        s.title_en = secDef.title_en;
      }
      s.photos = savedPerSec[secDef.id] || [];
    }
    // 現在の並び順に揃える
    const order = _gallery.secDefs.map(s => s.id);
    content.sections.sort((a, b) => {
      const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
    await savePhotosJson(content, sha, "Update gallery sections");

    _gallery.origSecDefs = _gallery.secDefs.map(s => ({ ...s }));
    _gallery.delSecIds.clear();
    _gallery.secDefs.forEach(secDef => {
      const sp    = galSP(secDef.id);
      const saved = savedPerSec[secDef.id] || [];
      sp.photos = saved.map(p => ({ ...p }));
      sp.orig   = saved.map(p => ({ ...p }));
      sp.toDelete.clear();
    });
    _gallery.editing = false;
    const container = document.getElementById("gallery-container");
    renderGalleryContainer(container);
    setPageBarIdle("gallery-bar-acts", enterGalleryEdit);
    showToast("保存しました！（サイト反映まで約1分）");
  } catch (err) {
    showToast("エラー: " + err.message, true);
    if (commitBtn) setBusy(commitBtn, false);
  }
}

// ================================================================
// セクション要素作成（gallery / facility 共通）
// ================================================================

function createSectionEl(isGallery, secDef) {
  const sp      = isGallery ? galSP(secDef.id) : facSP(secDef.id);
  const editing = isGallery ? _gallery.editing  : _facility.editing;
  const isNew   = isGallery && !_gallery.origSecDefs.some(s => s.id === secDef.id);

  const wrapper = document.createElement("div");
  wrapper.className = "a-section";

  // ── ヘッダー ──────────────────────────────────────────────
  const header = document.createElement("div");
  header.className = "a-section-header";

  const titleRow = document.createElement("div");
  titleRow.className = "a-title-row";

  if (isGallery && !isNew) {
    showTitleView(titleRow, secDef, secDef);
  } else {
    // facility または新規セクションは固定タイトル
    const t  = secDef.title    || "";
    const te = secDef.title_en || "";
    titleRow.innerHTML = te
      ? `<h2>${t} <span class="a-title-en">(${te})</span></h2>`
      : `<h2>${t}</h2>`;
  }

  header.appendChild(titleRow);

  if (isGallery && editing) {
    const delSecBtn = document.createElement("button");
    delSecBtn.className = "a-btn-del-section";
    delSecBtn.textContent = "🗑️ カテゴリーを削除";
    delSecBtn.addEventListener("click", () => deleteGallerySection(secDef.id, wrapper));
    header.appendChild(delSecBtn);
  }

  wrapper.appendChild(header);

  // ── グリッド ──────────────────────────────────────────────
  const grid = document.createElement("div");
  grid.className = "a-grid";
  wrapper.appendChild(grid);
  refreshGrid(grid, sp, editing, isGallery, secDef);

  return wrapper;
}

// ================================================================
// ギャラリー: カテゴリー削除 / 追加
// ================================================================

function deleteGallerySection(secId, wrapperEl) {
  if (!confirm("このカテゴリーを削除しますか？\n（写真ファイルは保持されます）")) return;
  if (_gallery.origSecDefs.some(s => s.id === secId)) _gallery.delSecIds.add(secId);
  _gallery.secDefs = _gallery.secDefs.filter(s => s.id !== secId);
  const sp = _gallery.secPhotos[secId];
  if (sp) sp.photos.forEach(p => { if (p._previewUrl) URL.revokeObjectURL(p._previewUrl); });
  wrapperEl.remove();
}

function createAddSectionCard(container) {
  const card = document.createElement("div");
  card.className = "a-add-section-card";

  const showBtn = () => {
    card.innerHTML = `<span class="a-add-sec-icon">＋</span><span>カテゴリーを追加</span>`;
    card.style.cursor = "pointer";
    card.onclick = showForm;
  };

  const showForm = () => {
    card.style.cursor = "default";
    card.innerHTML = `
      <div class="a-add-sec-form">
        <input class="a-input-title"    placeholder="カテゴリー名（日本語）">
        <input class="a-input-title-en" placeholder="Category Name (English)">
        <button class="a-btn-add-sec-ok">追加</button>
        <button class="a-btn-add-sec-cancel">キャンセル</button>
      </div>`;
    card.onclick = null;
    card.querySelector(".a-btn-add-sec-cancel").addEventListener("click", showBtn);
    card.querySelector(".a-btn-add-sec-ok").addEventListener("click", () => {
      const title    = card.querySelector(".a-input-title").value.trim();
      const title_en = card.querySelector(".a-input-title-en").value.trim();
      if (!title) return;
      const newId  = `sec_${Date.now()}`;
      const secDef = { id: newId, title, title_en, folder: `assets/images/${newId}` };
      _gallery.secDefs.push(secDef);
      _gallery.secPhotos[newId] = { photos: [], orig: [], toDelete: new Set() };
      container.insertBefore(createSectionEl(true, secDef), card);
      showBtn();
    });
  };

  showBtn();
  return card;
}

// ================================================================
// グリッド描画
// ================================================================

let _dragIdx   = -1;
let _dragSecId = null;

function refreshGrid(gridEl, sp, editing, isGallery, secDef) {
  gridEl.innerHTML = "";
  sp.photos.forEach((photo, idx) =>
    gridEl.appendChild(makePhotoCard(photo, idx, sp, gridEl, editing, isGallery, secDef))
  );
  if (editing) gridEl.appendChild(makeAddCard(sp, gridEl, isGallery, secDef));
}

function makePhotoCard(photo, idx, sp, gridEl, editing, isGallery, secDef) {
  const card = document.createElement("div");
  card.className = "a-card" + (editing ? " a-editing" : "");

  const imgWrap = document.createElement("div");
  imgWrap.className = "a-img-wrap";
  const img = document.createElement("img");
  img.src = photo._previewUrl || photo.path;
  img.alt = photo.alt || "";
  img.loading = "lazy";
  img.onerror = () => { imgWrap.innerHTML = '<div class="a-no-img">画像なし</div>'; };
  imgWrap.appendChild(img);
  card.appendChild(imgWrap);

  const info = document.createElement("div");
  info.className = "a-info";
  const desc = document.createElement("div");
  desc.className = "a-desc";
  desc.textContent = photo.alt || "（説明なし）";
  info.appendChild(desc);
  card.appendChild(info);

  if (editing) {
    const delBtn = document.createElement("button");
    delBtn.className = "a-card-del";
    delBtn.innerHTML = "&times;";
    delBtn.title = "削除";
    delBtn.addEventListener("click", e => {
      e.stopPropagation();
      if (photo._isNew) URL.revokeObjectURL(photo._previewUrl);
      else if (isGallery) sp.toDelete.add(photo.path);
      sp.photos.splice(idx, 1);
      refreshGrid(gridEl, sp, editing, isGallery, secDef);
    });
    imgWrap.appendChild(delBtn);

    const handle = document.createElement("div");
    handle.className = "a-drag-handle";
    handle.textContent = "⠿";
    imgWrap.appendChild(handle);

    card.setAttribute("draggable", "true");
    card.addEventListener("dragstart", e => {
      _dragIdx = idx; _dragSecId = secDef.id;
      card.classList.add("a-dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend", () => card.classList.remove("a-dragging"));
    card.addEventListener("dragover", e => {
      if (_dragSecId !== secDef.id || _dragIdx === idx) return;
      e.preventDefault();
      card.classList.add("a-drag-over");
    });
    card.addEventListener("dragleave", () => card.classList.remove("a-drag-over"));
    card.addEventListener("drop", e => {
      e.preventDefault();
      card.classList.remove("a-drag-over");
      if (_dragSecId !== secDef.id || _dragIdx < 0 || _dragIdx === idx) return;
      const [moved] = sp.photos.splice(_dragIdx, 1);
      sp.photos.splice(idx, 0, moved);
      _dragIdx = -1;
      refreshGrid(gridEl, sp, editing, isGallery, secDef);
    });
  }

  return card;
}

function makeAddCard(sp, gridEl, isGallery, secDef) {
  const card = document.createElement("div");
  card.className = "a-card a-add-card";
  card.innerHTML = '<span class="a-add-icon">＋</span>';

  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "image/*"; inp.multiple = true;
  inp.style.display = "none";
  card.appendChild(inp);

  card.addEventListener("click", () => inp.click());
  inp.addEventListener("change", () => {
    Array.from(inp.files).forEach(file => {
      sp.photos.push({
        path: "", alt: file.name.replace(/\.[^.]+$/, ""),
        _isNew: true, _file: file, _previewUrl: URL.createObjectURL(file)
      });
    });
    inp.value = "";
    const editing = isGallery ? _gallery.editing : _facility.editing;
    refreshGrid(gridEl, sp, editing, isGallery, secDef);
  });

  return card;
}

// ================================================================
// カテゴリー名インライン編集（ギャラリーのみ）
// ================================================================

function showTitleView(titleRow, sec, section) {
  const title    = sec.title    || section.title    || "";
  const title_en = sec.title_en || section.title_en || "";
  titleRow.innerHTML = `
    <h2>${title} <span class="a-title-en">(${title_en})</span></h2>
    <button class="a-btn-edit-title" title="カテゴリー名を編集">✏️</button>`;
  titleRow.querySelector(".a-btn-edit-title").addEventListener("click", () =>
    showTitleEdit(titleRow, sec, section)
  );
}

function showTitleEdit(titleRow, sec, section) {
  const title    = sec.title    || section.title    || "";
  const title_en = sec.title_en || section.title_en || "";
  titleRow.innerHTML = `
    <input class="a-input-title"    value="${title}"    placeholder="日本語タイトル">
    <input class="a-input-title-en" value="${title_en}" placeholder="English title">
    <button class="a-btn-save-title">保存</button>
    <button class="a-btn-cancel-title">キャンセル</button>`;
  titleRow.querySelector(".a-btn-cancel-title").addEventListener("click", () =>
    showTitleView(titleRow, sec, section)
  );
  titleRow.querySelector(".a-btn-save-title").addEventListener("click", async () => {
    const btn        = titleRow.querySelector(".a-btn-save-title");
    const newTitle   = titleRow.querySelector(".a-input-title").value.trim();
    const newTitleEn = titleRow.querySelector(".a-input-title-en").value.trim();
    if (!newTitle) return;
    setBusy(btn, true);
    try {
      const { content, sha } = await loadPhotosJson();
      let s = content.sections.find(s => s.id === section.id);
      if (!s) {
        s = { id: section.id, title: newTitle, title_en: newTitleEn, photos: [] };
        content.sections.push(s);
      } else {
        s.title = newTitle; s.title_en = newTitleEn;
      }
      await savePhotosJson(content, sha, `Update section title: ${section.id}`);
      sec.title    = newTitle;
      sec.title_en = newTitleEn;
      showTitleView(titleRow, sec, section);
      showToast("カテゴリー名を更新しました。");
    } catch (err) {
      showToast("エラー: " + err.message, true);
      setBusy(btn, false);
    }
  });
}
