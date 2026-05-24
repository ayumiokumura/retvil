// ============================================================
//  Ret.Village 管理者ページ  —  admin.js  (Cloudinary版)
// ============================================================

const ADMIN_PASS       = "nasu-admin";
const SESSION_KEY      = "rv_admin";
const CLOUD_NAME       = "dlbkklzyo";
const UPLOAD_PRESET    = "retvil_upload";
const API_KEY_STORE    = "rv_cld_key";
const API_SECRET_STORE = "rv_cld_secret";
// Cloudinary上のphotos.json（public_idに拡張子込み）
const PHOTOS_JSON_PID  = "retvil/data/photos.json";
const PHOTOS_JSON_URL  = `https://res.cloudinary.com/${CLOUD_NAME}/raw/upload/${PHOTOS_JSON_PID}`;

const REQUIRED_PHOTOS = [
  { publicId: "retvil/required/nasu",  desc: "トップページ 背景",     pages: "index.html" },
  { publicId: "retvil/required/logo",  desc: "ロゴ（丸アイコン）",    pages: "index.html" },
  { publicId: "retvil/required/yumi",  desc: "オーナー YUMI 顔写真",  pages: "owner.html" },
  { publicId: "retvil/required/mikio", desc: "オーナー MIKIO 顔写真", pages: "owner.html" },
];

const GALLERY_SECTIONS = [
  { id: "interior", title: "内装",            title_en: "Interior",              folder: "gallery/interior" },
  { id: "exterior", title: "外装",            title_en: "Exterior & Garden",     folder: "gallery/exterior" },
  { id: "amenity",  title: "アメニティ・設備", title_en: "Amenities & Equipment", folder: "gallery/amenity"  },
];

const DEFAULT_FACILITY_SECTIONS = [
  {
    id: "bath", title_ja: "バス・トイレ", title_en: "Bath & Toilet",
    folder: "facilities/bath",
    desc_ja: "温水洗浄便座（Washlet）\n大型浴室（シャワー・給湯／追い炊き付き）― ご家族で一緒に入れます\nシャンプー・コンディショナー・ボディシャンプー完備\nバスタオル・フェイスタオル（人数分）\nヘアドライヤー\n乾燥機付洗濯機（無料）\n洗剤・柔軟剤",
    desc_en: "Washlet (warm water toilet seat)\nLarge bathroom with shower, hot water & reheat function — spacious enough for the whole family\nShampoo, conditioner & body wash provided\nBath towels & face towels (for each guest)\nHair dryer\nWasher/dryer (free of charge)\nLaundry detergent & fabric softener",
    note_ja: "＊歯ブラシはプラスチックごみ削減の観点でご用意しておりません。各自お持ちください。",
    note_en: "＊Toothbrushes are not provided in order to reduce plastic waste. Please bring your own."
  },
  {
    id: "ac", title_ja: "エアコン", title_en: "Air Conditioning",
    folder: "facilities/ac",
    desc_ja: "リビング・寝室1・寝室2 に各1台ずつ設置しています。",
    desc_en: "One unit installed in the living room, Bedroom 1, and Bedroom 2 respectively.",
    note_ja: "", note_en: ""
  },
  {
    id: "parking", title_ja: "駐車場", title_en: "Parking",
    folder: "facilities/parking",
    desc_ja: "3台まで駐車可能です。施設前に縦列でご利用いただけます。",
    desc_en: "Up to 3 cars can be parked in tandem in front of the facility.",
    note_ja: "", note_en: ""
  }
];

const HOUSE_RULE_SECTIONS = [
  { id: "bbq",         title: "BBQについて",           folder: "facilities/rules/bbq" },
  { id: "garden",      title: "庭・デッキ",             folder: "facilities/rules/garden" },
  { id: "smoking",     title: "喫煙について",           folder: "facilities/rules/smoking" },
  { id: "garbage",     title: "ゴミの分別",             folder: "facilities/rules/garbage" },
  { id: "pet",         title: "ペットについて",         folder: "facilities/rules/pet" },
  { id: "insects",     title: "虫について",             folder: "facilities/rules/insects" },
  { id: "appliances",  title: "洗濯機・リモコン",       folder: "facilities/rules/appliances" },
  { id: "cookware",    title: "調理器具・食器",         folder: "facilities/rules/cookware" },
  { id: "bedding",     title: "寝具・トイレ",           folder: "facilities/rules/bedding" },
  { id: "photography", title: "撮影利用について",       folder: "facilities/rules/photography" },
  { id: "checklist",   title: "ご用意いただくもの",     folder: "facilities/rules/checklist" },
  { id: "notes",       title: "ご注意事項まとめ",       folder: "facilities/rules/notes" },
  { id: "emergency",   title: "緊急連絡先",             folder: "facilities/rules/emergency" },
];

// ================================================================
// ページ単位の編集状態
// ================================================================

const _gallery = {
  editing: false,
  secDefs: [],
  origSecDefs: [],
  secPhotos: {},
  delSecIds: new Set()
};

const _facility = {
  editing: false,
  secDefs: [],
  origSecDefs: [],
  secPhotos: {},
  delSecIds: new Set()
};

const _houseRule = {
  editing: false,
  secPhotos: {},
  order: [],
  origOrder: []
};

function hrSP(id) {
  if (!_houseRule.secPhotos[id])
    _houseRule.secPhotos[id] = { photos: [], orig: [], toDelete: new Set() };
  return _houseRule.secPhotos[id];
}

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
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function getGalleryFolder(id) {
  const d = GALLERY_SECTIONS.find(s => s.id === id);
  return d ? d.folder : `gallery/${id}`;
}
function anyEditing() { return _gallery.editing || _facility.editing || _houseRule.editing; }

window.addEventListener("beforeunload", e => {
  if (anyEditing()) { e.preventDefault(); e.returnValue = ""; }
});

// ================================================================
// Cloudinary 認証情報
// ================================================================

function getApiKey()   { return localStorage.getItem(API_KEY_STORE)    || ""; }
function getSecret()   { return localStorage.getItem(API_SECRET_STORE) || ""; }
function hasCldCreds() { return !!(getApiKey() && getSecret()); }

function cldImgUrl(publicId) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto/${publicId}`;
}

// ================================================================
// Cloudinary 署名（SHA-256）
// ================================================================

const _SIGN_SKIP = new Set(["file", "api_key", "resource_type", "cloud_name", "signature"]);

async function cldSign(params) {
  const str = Object.keys(params)
    .filter(k => !_SIGN_SKIP.has(k))
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join("&") + getSecret();
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ================================================================
// Cloudinary API
// ================================================================

// 新規アップロード（unsigned preset）: ギャラリー / 施設の写真追加
async function cldUploadNew(file, folder) {
  const blob = await compressImage(file);
  const fd   = new FormData();
  fd.append("file",          blob, "photo.jpg");
  fd.append("upload_preset", UPLOAD_PRESET);
  fd.append("folder",        folder);
  const res  = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: fd }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Upload failed");
  return { path: data.secure_url, publicId: data.public_id };
}

// 上書きアップロード（signed）: 必須写真差し替え
async function cldUploadReplace(file, publicId) {
  const blob      = await compressImage(file);
  const timestamp = Math.floor(Date.now() / 1000);
  const sigP      = { invalidate: "true", overwrite: "true", public_id: publicId, timestamp };
  const sig       = await cldSign(sigP);
  const fd        = new FormData();
  fd.append("file", blob, "photo.jpg");
  Object.entries(sigP).forEach(([k, v]) => fd.append(k, String(v)));
  fd.append("api_key",   getApiKey());
  fd.append("signature", sig);
  const res  = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: fd }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Upload failed");
  return data;
}

// 削除（signed）: ギャラリー写真
async function cldDestroy(publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  const sigP      = { public_id: publicId, timestamp };
  const sig       = await cldSign(sigP);
  const fd        = new FormData();
  fd.append("public_id",  publicId);
  fd.append("timestamp",  String(timestamp));
  fd.append("api_key",    getApiKey());
  fd.append("signature",  sig);
  return fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
    { method: "POST", body: fd }
  ).then(r => r.json());
}

// ================================================================
// photos.json 読み書き（Cloudinary raw ファイル）
// ================================================================

async function loadPhotosJson() {
  const res = await fetch(PHOTOS_JSON_URL, { cache: "no-cache" });
  if (!res.ok) throw new Error("photos.json の取得に失敗しました");
  return res.json();
}

async function savePhotosJson(content) {
  const blob      = new Blob([JSON.stringify(content, null, 2)], { type: "application/json" });
  const timestamp = Math.floor(Date.now() / 1000);
  const sigP      = { invalidate: "true", overwrite: "true", public_id: PHOTOS_JSON_PID, timestamp };
  const sig       = await cldSign(sigP);
  const fd        = new FormData();
  fd.append("file",      blob, "photos.json");
  Object.entries(sigP).forEach(([k, v]) => fd.append(k, String(v)));
  fd.append("api_key",   getApiKey());
  fd.append("signature", sig);
  const res  = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
    { method: "POST", body: fd }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "JSON save failed");
  return data;
}

// ================================================================
// 画像圧縮 → Blob（JPEG）
// ================================================================

function compressImage(file, maxPx = 1920, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio  = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(resolve, "image/jpeg", quality);
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ================================================================
// UI ヘルパー
// ================================================================

function showToast(msg, isError = false) {
  const t    = document.getElementById("toast");
  t.textContent = msg;
  t.className   = "a-toast " + (isError ? "a-toast-err" : "a-toast-ok") + " a-toast-show";
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("a-toast-show"), 3500);
}
function setBusy(btn, busy) {
  if (busy) { btn.dataset.orig = btn.textContent; btn.textContent = "処理中…"; btn.disabled = true; }
  else      { btn.textContent = btn.dataset.orig || btn.textContent; btn.disabled = false; }
}

// ================================================================
// 初期化 / ログイン
// ================================================================

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });

  // 認証情報変更モーダル
  const credsModal  = document.getElementById("creds-modal");
  document.getElementById("creds-change-btn").addEventListener("click", () => {
    document.getElementById("creds-key").value    = getApiKey();
    document.getElementById("creds-secret").value = "";
    credsModal.style.display = "flex";
  });
  document.getElementById("creds-cancel").addEventListener("click", () => {
    credsModal.style.display = "none";
  });
  document.querySelector(".creds-backdrop").addEventListener("click", () => {
    credsModal.style.display = "none";
  });
  document.getElementById("creds-form").addEventListener("submit", e => {
    e.preventDefault();
    const key    = document.getElementById("creds-key").value.trim();
    const secret = document.getElementById("creds-secret").value.trim();
    if (!key) return;
    localStorage.setItem(API_KEY_STORE, key);
    if (secret) localStorage.setItem(API_SECRET_STORE, secret);
    credsModal.style.display = "none";
    showToast("認証情報を更新しました。");
  });

  if (sessionStorage.getItem(SESSION_KEY) === "1" && hasCldCreds()) {
    showAdmin();
    return;
  }

  const setupSec = document.getElementById("setup-section");
  const loginSec = document.getElementById("login-section");

  if (!hasCldCreds()) {
    setupSec.style.display = "block";
    loginSec.style.display = "none";
  }

  document.getElementById("setup-form").addEventListener("submit", e => {
    e.preventDefault();
    const key    = document.getElementById("setup-key").value.trim();
    const secret = document.getElementById("setup-secret").value.trim();
    if (!key || !secret) return;
    localStorage.setItem(API_KEY_STORE,    key);
    localStorage.setItem(API_SECRET_STORE, secret);
    setupSec.style.display = "none";
    loginSec.style.display = "block";
    document.getElementById("setup-done-notice").style.display = "block";
  });

  document.getElementById("login-form").addEventListener("submit", e => {
    e.preventDefault();
    const pw  = document.getElementById("admin-pw").value;
    const err = document.getElementById("login-error");
    if (pw !== ADMIN_PASS) { err.textContent = "パスワードが正しくありません"; return; }
    sessionStorage.setItem(SESSION_KEY, "1");
    showAdmin();
  });
});

function showAdmin() {
  document.getElementById("admin-login").style.display = "none";
  document.getElementById("admin-main").style.display  = "block";
  renderRequired();
  renderFacilities();
  renderHouseRules();
  renderGallery();
}

// ================================================================
// 必須写真（差し替えのみ）
// ================================================================

function renderRequired() {
  const grid = document.getElementById("required-grid");
  grid.innerHTML = "";
  REQUIRED_PHOTOS.forEach(req => {
    const imgUrl = cldImgUrl(req.publicId);
    const card   = document.createElement("div");
    card.className = "a-card";
    card.innerHTML = `
      <div class="a-img-wrap">
        <img src="${imgUrl}" alt="${req.desc}" loading="lazy">
      </div>
      <div class="a-info">
        <div class="a-desc">${req.desc}</div>
        <div class="a-pages">📄 ${req.pages}</div>
        <div class="a-actions"><button class="a-btn-replace">差し替え</button></div>
      </div>`;
    const btn = card.querySelector(".a-btn-replace");
    btn.addEventListener("click", () => {
      const inp  = document.createElement("input");
      inp.type   = "file";
      inp.accept = "image/*";
      inp.addEventListener("change", async () => {
        const file = inp.files[0]; if (!file) return;
        setBusy(btn, true);
        try {
          await cldUploadReplace(file, req.publicId);
          const el = card.querySelector("img");
          if (el) el.src = imgUrl + "?_v=" + Date.now();
          showToast("差し替え完了！（CDN反映まで少々お待ちください）");
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
  const el  = document.getElementById(barActsId);
  el.innerHTML = "";
  const btn = document.createElement("button");
  btn.className   = "a-btn-edit";
  btn.textContent = "編集";
  btn.addEventListener("click", onEdit);
  el.appendChild(btn);
}

function setPageBarEditing(barActsId, onCommit, onCancel) {
  const el        = document.getElementById(barActsId);
  el.innerHTML    = "";
  const commitBtn = document.createElement("button");
  commitBtn.className   = "a-btn-commit";
  commitBtn.textContent = "決定";
  commitBtn.addEventListener("click", onCommit);
  const cancelBtn = document.createElement("button");
  cancelBtn.className   = "a-btn-cancel-edit";
  cancelBtn.textContent = "キャンセル";
  cancelBtn.addEventListener("click", onCancel);
  el.appendChild(commitBtn);
  el.appendChild(cancelBtn);
}

// ================================================================
// 基本情報ページ（facility）
// ================================================================

async function renderFacilities() {
  const container = document.getElementById("facilities-container");
  container.innerHTML = "<div class='a-loading'>施設セクションを読み込み中…</div>";
  let photosData;
  try { photosData = await loadPhotosJson(); }
  catch (err) { container.innerHTML = `<div class='a-err-msg'>読み込み失敗: ${err.message}</div>`; return; }
  container.innerHTML = "";

  const jsonSecs = photosData.facility_sections || [];

  const defs = jsonSecs.map(s => {
    const d = DEFAULT_FACILITY_SECTIONS.find(d => d.id === s.id) || {};
    return {
      id:       s.id,
      title_ja: s.title_ja !== undefined ? s.title_ja : (d.title_ja || s.title || s.id),
      title_en: s.title_en !== undefined ? s.title_en : (d.title_en || ''),
      desc_ja:  s.desc_ja  !== undefined ? s.desc_ja  : (d.desc_ja  || ''),
      desc_en:  s.desc_en  !== undefined ? s.desc_en  : (d.desc_en  || ''),
      note_ja:  s.note_ja  !== undefined ? s.note_ja  : (d.note_ja  || ''),
      note_en:  s.note_en  !== undefined ? s.note_en  : (d.note_en  || ''),
      folder:   d.folder || `facilities/${s.id}`
    };
  });

  DEFAULT_FACILITY_SECTIONS.forEach(d => {
    if (!defs.find(s => s.id === d.id)) defs.push({ ...d });
  });

  _facility.secDefs     = defs.map(s => ({ ...s }));
  _facility.origSecDefs = defs.map(s => ({ ...s }));
  _facility.delSecIds.clear();

  jsonSecs.forEach(s => {
    const sp  = facSP(s.id);
    sp.photos = (s.photos || []).map(p => ({ ...p }));
    sp.orig   = (s.photos || []).map(p => ({ ...p }));
    sp.toDelete.clear();
  });
  DEFAULT_FACILITY_SECTIONS.forEach(d => {
    if (!jsonSecs.find(s => s.id === d.id)) {
      const sp  = facSP(d.id);
      sp.photos = [];
      sp.orig   = [];
      sp.toDelete.clear();
    }
  });

  renderFacilityContainer(container);
  setPageBarIdle("facility-bar-acts", enterFacilityEdit);
}

function renderFacilityContainer(container) {
  container.innerHTML = "";
  _facility.secDefs.forEach((secDef, idx) => container.appendChild(createFacilitySectionEl(secDef, idx)));
  if (_facility.editing) container.appendChild(createAddFacilitySectionCard(container));
}

function createFacilitySectionEl(secDef, idx) {
  const sp      = facSP(secDef.id);
  const editing = _facility.editing;

  const wrapper = document.createElement("div");
  wrapper.className = "a-section";

  if (editing) {
    const titleRow = document.createElement("div");
    titleRow.className = "a-section-header";

    const inputs = document.createElement("div");
    inputs.className = "a-title-row";
    inputs.innerHTML = `
      <input class="a-input-title"    value="${escHtml(secDef.title_ja)}" placeholder="カテゴリー名（日本語）">
      <input class="a-input-title-en" value="${escHtml(secDef.title_en)}" placeholder="Category Name (English)">
    `;
    inputs.querySelector('.a-input-title').addEventListener('input', e => { secDef.title_ja = e.target.value; });
    inputs.querySelector('.a-input-title-en').addEventListener('input', e => { secDef.title_en = e.target.value; });
    titleRow.appendChild(inputs);
    titleRow.appendChild(makeSecMoveButtons(idx, _facility.secDefs.length, (from, to) => {
      const [moved] = _facility.secDefs.splice(from, 1);
      _facility.secDefs.splice(to, 0, moved);
      renderFacilityContainer(document.getElementById("facilities-container"));
    }));

    const delBtn = document.createElement("button");
    delBtn.className   = "a-btn-del-section";
    delBtn.textContent = "カテゴリーを削除";
    delBtn.addEventListener("click", () => deleteFacilitySection(secDef.id, wrapper));
    titleRow.appendChild(delBtn);

    wrapper.appendChild(titleRow);

    const descBlock = document.createElement("div");
    descBlock.className = "a-desc-block";
    descBlock.innerHTML = `
      <div class="a-desc-label">説明（日本語）― 1行1項目</div>
      <textarea class="a-textarea" rows="4" placeholder="1行ごとに箇条書きになります">${escHtml(secDef.desc_ja)}</textarea>
      <div class="a-desc-label">Description (English) — one item per line</div>
      <textarea class="a-textarea" rows="4" placeholder="One item per line">${escHtml(secDef.desc_en)}</textarea>
      <div class="a-desc-label">備考（日本語）</div>
      <input class="a-input-note" value="${escHtml(secDef.note_ja)}" placeholder="＊...">
      <div class="a-desc-label">Note (English)</div>
      <input class="a-input-note" value="${escHtml(secDef.note_en)}" placeholder="＊...">
    `;
    const [taJa, taEn] = descBlock.querySelectorAll('textarea');
    taJa.addEventListener('input', e => { secDef.desc_ja = e.target.value; });
    taEn.addEventListener('input', e => { secDef.desc_en = e.target.value; });
    const [noteJa, noteEn] = descBlock.querySelectorAll('.a-input-note');
    noteJa.addEventListener('input', e => { secDef.note_ja = e.target.value; });
    noteEn.addEventListener('input', e => { secDef.note_en = e.target.value; });
    wrapper.appendChild(descBlock);
  } else {
    const header = document.createElement("div");
    header.className = "a-section-header";
    const te = secDef.title_en ? ` <span class="a-title-en">(${escHtml(secDef.title_en)})</span>` : '';
    header.innerHTML = `<div class="a-title-row"><h2>${escHtml(secDef.title_ja)}${te}</h2></div>`;
    wrapper.appendChild(header);
  }

  const grid = document.createElement("div");
  grid.className = "a-grid";
  wrapper.appendChild(grid);
  refreshGrid(grid, sp, editing, false, secDef);

  return wrapper;
}

function deleteFacilitySection(secId, wrapperEl) {
  if (!confirm("このカテゴリーを削除しますか？")) return;
  if (_facility.origSecDefs.some(s => s.id === secId)) _facility.delSecIds.add(secId);
  _facility.secDefs = _facility.secDefs.filter(s => s.id !== secId);
  const sp = _facility.secPhotos[secId];
  if (sp) sp.photos.forEach(p => { if (p._previewUrl) URL.revokeObjectURL(p._previewUrl); });
  wrapperEl.remove();
}

function createAddFacilitySectionCard(container) {
  const card = document.createElement("div");
  card.className = "a-add-section-card";

  const showBtn = () => {
    card.innerHTML    = `<span class="a-add-sec-icon">＋</span><span>カテゴリーを追加</span>`;
    card.style.cursor = "pointer";
    card.onclick      = showForm;
  };

  const showForm = () => {
    card.style.cursor = "default";
    card.innerHTML    = `
      <div class="a-add-sec-form">
        <input class="a-input-title"    placeholder="カテゴリー名（日本語）">
        <input class="a-input-title-en" placeholder="Category Name (English)">
        <button class="a-btn-add-sec-ok">追加</button>
        <button class="a-btn-add-sec-cancel">キャンセル</button>
      </div>`;
    card.onclick = null;
    card.querySelector(".a-btn-add-sec-cancel").addEventListener("click", e => {
      e.stopPropagation(); showBtn();
    });
    card.querySelector(".a-btn-add-sec-ok").addEventListener("click", e => {
      e.stopPropagation();
      const title    = card.querySelector(".a-input-title").value.trim();
      const title_en = card.querySelector(".a-input-title-en").value.trim();
      if (!title) return;
      const newId  = `fac_${Date.now()}`;
      const secDef = { id: newId, title_ja: title, title_en, desc_ja: '', desc_en: '', note_ja: '', note_en: '', folder: `facilities/${newId}` };
      _facility.secDefs.push(secDef);
      _facility.secPhotos[newId] = { photos: [], orig: [], toDelete: new Set() };
      container.insertBefore(createFacilitySectionEl(secDef), card);
      showBtn();
    });
  };

  showBtn();
  return card;
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
  _facility.secDefs   = _facility.origSecDefs.map(s => ({ ...s }));
  _facility.delSecIds.clear();
  _facility.editing   = false;
  const container = document.getElementById("facilities-container");
  renderFacilityContainer(container);
  setPageBarIdle("facility-bar-acts", enterFacilityEdit);
}

async function commitFacilityChanges() {
  const commitBtn = document.querySelector("#facility-bar-acts .a-btn-commit");
  if (commitBtn) setBusy(commitBtn, true);
  try {
    let uploaded  = 0;
    const totalNew    = _facility.secDefs.reduce((n, d) => n + facSP(d.id).photos.filter(p => p._isNew).length, 0);
    const savedPerSec = {};

    for (const secDef of _facility.secDefs) {
      const sp    = facSP(secDef.id);
      const saved = [];
      for (const photo of sp.photos) {
        if (photo._isNew) {
          uploaded++;
          if (totalNew > 1 && commitBtn) commitBtn.textContent = `アップロード中 ${uploaded}/${totalNew}…`;
          const result = await cldUploadNew(photo._file, secDef.folder);
          URL.revokeObjectURL(photo._previewUrl);
          saved.push({ path: result.path, publicId: result.publicId, alt: photo.alt || "" });
        } else {
          saved.push({ path: photo.path, publicId: photo.publicId || null, alt: photo.alt || "" });
        }
      }
      savedPerSec[secDef.id] = saved;
    }

    const content = await loadPhotosJson();
    if (!content.facility_sections) content.facility_sections = [];
    content.facility_sections = content.facility_sections.filter(s => !_facility.delSecIds.has(s.id));
    for (const secDef of _facility.secDefs) {
      let s = content.facility_sections.find(s => s.id === secDef.id);
      if (!s) {
        s = { id: secDef.id };
        content.facility_sections.push(s);
      }
      s.title_ja = secDef.title_ja;
      s.title_en = secDef.title_en;
      s.desc_ja  = secDef.desc_ja;
      s.desc_en  = secDef.desc_en;
      s.note_ja  = secDef.note_ja;
      s.note_en  = secDef.note_en;
      s.photos   = savedPerSec[secDef.id];
    }
    await savePhotosJson(content);

    _facility.origSecDefs = _facility.secDefs.map(s => ({ ...s }));
    _facility.delSecIds.clear();
    _facility.secDefs.forEach(secDef => {
      const sp    = facSP(secDef.id);
      const saved = savedPerSec[secDef.id];
      sp.photos   = saved.map(p => ({ ...p }));
      sp.orig     = saved.map(p => ({ ...p }));
      sp.toDelete.clear();
    });
    _facility.editing = false;
    const container = document.getElementById("facilities-container");
    renderFacilityContainer(container);
    setPageBarIdle("facility-bar-acts", enterFacilityEdit);
    showToast("保存しました！");
  } catch (err) {
    showToast("エラー: " + err.message, true);
    if (commitBtn) setBusy(commitBtn, false);
  }
}

// ================================================================
// ハウスルール写真（house_rule_photos）
// ================================================================

async function renderHouseRules() {
  const container = document.getElementById("houserule-container");
  container.innerHTML = "<div class='a-loading'>ハウスルール写真を読み込み中…</div>";
  let photosData;
  try { photosData = await loadPhotosJson(); }
  catch (err) { container.innerHTML = `<div class='a-err-msg'>読み込み失敗: ${err.message}</div>`; return; }
  container.innerHTML = "";

  const hrPhotos = photosData.house_rule_photos || {};
  HOUSE_RULE_SECTIONS.forEach(ruleDef => {
    const photos = hrPhotos[ruleDef.id] || [];
    const sp  = hrSP(ruleDef.id);
    sp.photos = photos.map(p => ({ ...p }));
    sp.orig   = photos.map(p => ({ ...p }));
    sp.toDelete.clear();
  });

  const allIds = HOUSE_RULE_SECTIONS.map(s => s.id);
  const savedOrder = photosData.house_rule_order;
  if (savedOrder && savedOrder.length) {
    const saved = savedOrder.filter(id => allIds.includes(id));
    const missing = allIds.filter(id => !saved.includes(id));
    _houseRule.order = [...saved, ...missing];
  } else {
    _houseRule.order = [...allIds];
  }
  _houseRule.origOrder = [..._houseRule.order];

  renderHouseRuleContainer(container);
  setPageBarIdle("houserule-bar-acts", enterHouseRuleEdit);
}

function renderHouseRuleContainer(container) {
  container.innerHTML = "";
  _houseRule.order
    .map(id => HOUSE_RULE_SECTIONS.find(s => s.id === id))
    .filter(Boolean)
    .forEach((ruleDef, idx) => container.appendChild(createHouseRuleSectionEl(ruleDef, idx)));
}

function createHouseRuleSectionEl(ruleDef, idx) {
  const sp      = hrSP(ruleDef.id);
  const editing = _houseRule.editing;

  const wrapper = document.createElement("div");
  wrapper.className = "a-section";

  const header = document.createElement("div");
  header.className = "a-section-header";
  header.innerHTML = `<div class="a-title-row"><h2>${escHtml(ruleDef.title)}</h2></div>`;
  if (editing) {
    header.appendChild(makeSecMoveButtons(idx, _houseRule.order.length, (from, to) => {
      const [moved] = _houseRule.order.splice(from, 1);
      _houseRule.order.splice(to, 0, moved);
      renderHouseRuleContainer(document.getElementById("houserule-container"));
    }));
  }
  wrapper.appendChild(header);

  const grid = document.createElement("div");
  grid.className = "a-grid";
  wrapper.appendChild(grid);
  refreshGrid(grid, sp, editing, false, { id: ruleDef.id, folder: ruleDef.folder });

  return wrapper;
}

function enterHouseRuleEdit() {
  _houseRule.editing = true;
  const container = document.getElementById("houserule-container");
  renderHouseRuleContainer(container);
  setPageBarEditing("houserule-bar-acts", commitHouseRuleChanges, cancelHouseRuleEdit);
}

function cancelHouseRuleEdit() {
  Object.values(_houseRule.secPhotos).forEach(sp => {
    sp.photos.forEach(p => { if (p._previewUrl) URL.revokeObjectURL(p._previewUrl); });
    sp.photos = sp.orig.map(p => ({ ...p }));
    sp.toDelete.clear();
  });
  _houseRule.order   = [..._houseRule.origOrder];
  _houseRule.editing = false;
  const container = document.getElementById("houserule-container");
  renderHouseRuleContainer(container);
  setPageBarIdle("houserule-bar-acts", enterHouseRuleEdit);
}

async function commitHouseRuleChanges() {
  const commitBtn = document.querySelector("#houserule-bar-acts .a-btn-commit");
  if (commitBtn) setBusy(commitBtn, true);
  try {
    let uploaded  = 0;
    const totalNew    = HOUSE_RULE_SECTIONS.reduce((n, d) => n + hrSP(d.id).photos.filter(p => p._isNew).length, 0);
    const savedPerRule = {};

    for (const ruleDef of HOUSE_RULE_SECTIONS) {
      const sp    = hrSP(ruleDef.id);
      const saved = [];
      for (const photo of sp.photos) {
        if (photo._isNew) {
          uploaded++;
          if (totalNew > 1 && commitBtn) commitBtn.textContent = `アップロード中 ${uploaded}/${totalNew}…`;
          const result = await cldUploadNew(photo._file, ruleDef.folder);
          URL.revokeObjectURL(photo._previewUrl);
          saved.push({ path: result.path, publicId: result.publicId, alt: photo.alt || "" });
        } else {
          saved.push({ path: photo.path, publicId: photo.publicId || null, alt: photo.alt || "" });
        }
      }
      savedPerRule[ruleDef.id] = saved;
    }

    for (const ruleDef of HOUSE_RULE_SECTIONS) {
      const sp = hrSP(ruleDef.id);
      for (const pubId of sp.toDelete) {
        try { await cldDestroy(pubId); } catch {}
      }
    }

    const content = await loadPhotosJson();
    if (!content.house_rule_photos) content.house_rule_photos = {};
    HOUSE_RULE_SECTIONS.forEach(ruleDef => {
      content.house_rule_photos[ruleDef.id] = savedPerRule[ruleDef.id] || [];
    });
    content.house_rule_order = _houseRule.order;
    await savePhotosJson(content);

    HOUSE_RULE_SECTIONS.forEach(ruleDef => {
      const sp    = hrSP(ruleDef.id);
      const saved = savedPerRule[ruleDef.id] || [];
      sp.photos   = saved.map(p => ({ ...p }));
      sp.orig     = saved.map(p => ({ ...p }));
      sp.toDelete.clear();
    });
    _houseRule.origOrder = [..._houseRule.order];
    _houseRule.editing   = false;
    const container = document.getElementById("houserule-container");
    renderHouseRuleContainer(container);
    setPageBarIdle("houserule-bar-acts", enterHouseRuleEdit);
    showToast("保存しました！");
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
  try { photosData = await loadPhotosJson(); }
  catch (err) { container.innerHTML = `<div class='a-err-msg'>読み込み失敗: ${err.message}</div>`; return; }
  container.innerHTML = "";

  const jsonSecs = photosData.sections || [];
  const defs     = jsonSecs.map(s => ({
    id: s.id, title: s.title, title_en: s.title_en || "", folder: getGalleryFolder(s.id)
  }));
  GALLERY_SECTIONS.forEach(gs => { if (!defs.find(s => s.id === gs.id)) defs.push({ ...gs }); });

  _gallery.secDefs     = defs.map(s => ({ ...s }));
  _gallery.origSecDefs = defs.map(s => ({ ...s }));
  _gallery.delSecIds.clear();

  jsonSecs.forEach(s => {
    const sp  = galSP(s.id);
    sp.photos = (s.photos || []).map(p => ({ ...p }));
    sp.orig   = (s.photos || []).map(p => ({ ...p }));
    sp.toDelete.clear();
  });

  renderGalleryContainer(container);
  setPageBarIdle("gallery-bar-acts", enterGalleryEdit);
}

function renderGalleryContainer(container) {
  container.innerHTML = "";
  _gallery.secDefs.forEach((secDef, idx) => container.appendChild(createSectionEl(true, secDef, idx)));
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
  _gallery.secDefs   = _gallery.origSecDefs.map(s => ({ ...s }));
  _gallery.delSecIds.clear();
  _gallery.editing   = false;
  const container = document.getElementById("gallery-container");
  renderGalleryContainer(container);
  setPageBarIdle("gallery-bar-acts", enterGalleryEdit);
}

async function commitGalleryChanges() {
  const commitBtn = document.querySelector("#gallery-bar-acts .a-btn-commit");
  if (commitBtn) setBusy(commitBtn, true);
  try {
    let uploaded  = 0;
    const totalNew    = _gallery.secDefs.reduce((n, d) => n + galSP(d.id).photos.filter(p => p._isNew).length, 0);
    const savedPerSec = {};

    for (const secDef of _gallery.secDefs) {
      const sp    = galSP(secDef.id);
      const saved = [];
      for (const photo of sp.photos) {
        if (photo._isNew) {
          uploaded++;
          if (totalNew > 1 && commitBtn) commitBtn.textContent = `アップロード中 ${uploaded}/${totalNew}…`;
          const result = await cldUploadNew(photo._file, secDef.folder);
          URL.revokeObjectURL(photo._previewUrl);
          saved.push({ path: result.path, publicId: result.publicId, alt: photo.alt || "" });
        } else {
          saved.push({ path: photo.path, publicId: photo.publicId || null, alt: photo.alt || "" });
        }
      }
      savedPerSec[secDef.id] = saved;
    }

    // Cloudinaryから削除
    for (const sp of Object.values(_gallery.secPhotos)) {
      for (const pubId of sp.toDelete) {
        try { await cldDestroy(pubId); } catch {}
      }
    }

    const content = await loadPhotosJson();
    content.sections = (content.sections || []).filter(s => !_gallery.delSecIds.has(s.id));
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
    const order = _gallery.secDefs.map(s => s.id);
    content.sections.sort((a, b) => {
      const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
    await savePhotosJson(content);

    _gallery.origSecDefs = _gallery.secDefs.map(s => ({ ...s }));
    _gallery.delSecIds.clear();
    _gallery.secDefs.forEach(secDef => {
      const sp    = galSP(secDef.id);
      const saved = savedPerSec[secDef.id] || [];
      sp.photos   = saved.map(p => ({ ...p }));
      sp.orig     = saved.map(p => ({ ...p }));
      sp.toDelete.clear();
    });
    _gallery.editing = false;
    const container = document.getElementById("gallery-container");
    renderGalleryContainer(container);
    setPageBarIdle("gallery-bar-acts", enterGalleryEdit);
    showToast("保存しました！");
  } catch (err) {
    showToast("エラー: " + err.message, true);
    if (commitBtn) setBusy(commitBtn, false);
  }
}

// ================================================================
// セクション要素作成（gallery / facility 共通）
// ================================================================

function createSectionEl(isGallery, secDef, idx) {
  const sp      = isGallery ? galSP(secDef.id) : facSP(secDef.id);
  const editing = isGallery ? _gallery.editing  : _facility.editing;
  const isNew   = isGallery && !_gallery.origSecDefs.some(s => s.id === secDef.id);

  const wrapper = document.createElement("div");
  wrapper.className = "a-section";

  const header   = document.createElement("div");
  header.className = "a-section-header";

  const titleRow = document.createElement("div");
  titleRow.className = "a-title-row";

  if (isGallery && !isNew) {
    showTitleView(titleRow, secDef, secDef);
  } else {
    const t  = secDef.title    || "";
    const te = secDef.title_en || "";
    titleRow.innerHTML = te
      ? `<h2>${t} <span class="a-title-en">(${te})</span></h2>`
      : `<h2>${t}</h2>`;
  }

  header.appendChild(titleRow);

  if (isGallery && editing) {
    header.appendChild(makeSecMoveButtons(idx, _gallery.secDefs.length, (from, to) => {
      const [moved] = _gallery.secDefs.splice(from, 1);
      _gallery.secDefs.splice(to, 0, moved);
      renderGalleryContainer(document.getElementById("gallery-container"));
    }));
    const delSecBtn = document.createElement("button");
    delSecBtn.className   = "a-btn-del-section";
    delSecBtn.textContent = "🗑️ カテゴリーを削除";
    delSecBtn.addEventListener("click", () => deleteGallerySection(secDef.id, wrapper));
    header.appendChild(delSecBtn);
  }

  wrapper.appendChild(header);

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
  if (!confirm("このカテゴリーを削除しますか？\n（Cloudinary上の写真ファイルは保持されます）")) return;
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
    card.innerHTML    = `<span class="a-add-sec-icon">＋</span><span>カテゴリーを追加</span>`;
    card.style.cursor = "pointer";
    card.onclick      = showForm;
  };

  const showForm = () => {
    card.style.cursor = "default";
    card.innerHTML    = `
      <div class="a-add-sec-form">
        <input class="a-input-title"    placeholder="カテゴリー名（日本語）">
        <input class="a-input-title-en" placeholder="Category Name (English)">
        <button class="a-btn-add-sec-ok">追加</button>
        <button class="a-btn-add-sec-cancel">キャンセル</button>
      </div>`;
    card.onclick = null;
    card.querySelector(".a-btn-add-sec-cancel").addEventListener("click", e => {
      e.stopPropagation(); showBtn();
    });
    card.querySelector(".a-btn-add-sec-ok").addEventListener("click", e => {
      e.stopPropagation();
      const title    = card.querySelector(".a-input-title").value.trim();
      const title_en = card.querySelector(".a-input-title-en").value.trim();
      if (!title) return;
      const newId  = `sec_${Date.now()}`;
      const secDef = { id: newId, title, title_en, folder: `gallery/${newId}` };
      _gallery.secDefs.push(secDef);
      _gallery.secPhotos[newId] = { photos: [], orig: [], toDelete: new Set() };
      container.insertBefore(createSectionEl(true, secDef, _gallery.secDefs.length - 1), card);
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

function makeSecMoveButtons(idx, total, swapFn) {
  const wrap = document.createElement("div");
  wrap.className = "a-sec-move-btns";
  const upBtn = document.createElement("button");
  upBtn.className   = "a-btn-sec-move";
  upBtn.textContent = "↑";
  upBtn.title       = "上へ移動";
  upBtn.disabled    = (idx === 0);
  upBtn.addEventListener("click", () => swapFn(idx, idx - 1));
  const downBtn = document.createElement("button");
  downBtn.className   = "a-btn-sec-move";
  downBtn.textContent = "↓";
  downBtn.title       = "下へ移動";
  downBtn.disabled    = (idx === total - 1);
  downBtn.addEventListener("click", () => swapFn(idx, idx + 1));
  wrap.appendChild(upBtn);
  wrap.appendChild(downBtn);
  return wrap;
}

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
  img.src     = photo._previewUrl || photo.path;
  img.alt     = photo.alt || "";
  img.loading = "lazy";
  img.onerror = () => { imgWrap.innerHTML = '<div class="a-no-img">画像なし</div>'; };
  imgWrap.appendChild(img);
  card.appendChild(imgWrap);

  const info = document.createElement("div");
  info.className = "a-info";
  const desc = document.createElement("div");
  desc.className   = "a-desc";
  desc.textContent = photo.alt || "（説明なし）";
  info.appendChild(desc);
  card.appendChild(info);

  if (editing) {
    const delBtn = document.createElement("button");
    delBtn.className = "a-card-del";
    delBtn.innerHTML = "&times;";
    delBtn.title     = "削除";
    delBtn.addEventListener("click", e => {
      e.stopPropagation();
      if (photo._isNew) URL.revokeObjectURL(photo._previewUrl);
      else if (isGallery && photo.publicId) sp.toDelete.add(photo.publicId);
      sp.photos.splice(idx, 1);
      refreshGrid(gridEl, sp, editing, isGallery, secDef);
    });
    imgWrap.appendChild(delBtn);

    const handle = document.createElement("div");
    handle.className   = "a-drag-handle";
    handle.textContent = "⠿";
    imgWrap.appendChild(handle);

    card.setAttribute("draggable", "true");
    card.addEventListener("dragstart", e => {
      _dragIdx = idx; _dragSecId = secDef.id;
      card.classList.add("a-dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    card.addEventListener("dragend",   () => card.classList.remove("a-dragging"));
    card.addEventListener("dragover",  e => {
      if (_dragSecId !== secDef.id || _dragIdx === idx) return;
      e.preventDefault();
      card.classList.add("a-drag-over");
    });
    card.addEventListener("dragleave", () => card.classList.remove("a-drag-over"));
    card.addEventListener("drop",      e => {
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

  const inp      = document.createElement("input");
  inp.type       = "file";
  inp.accept     = "image/*";
  inp.multiple   = true;
  inp.style.display = "none";
  card.appendChild(inp);

  card.addEventListener("click", () => inp.click());
  inp.addEventListener("change", () => {
    Array.from(inp.files).forEach(file => {
      sp.photos.push({
        path: "", publicId: null, alt: file.name.replace(/\.[^.]+$/, ""),
        _isNew: true, _file: file, _previewUrl: URL.createObjectURL(file)
      });
    });
    inp.value = "";
    refreshGrid(gridEl, sp, true, isGallery, secDef);
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
      const content = await loadPhotosJson();
      if (!content.sections) content.sections = [];
      let s = content.sections.find(s => s.id === section.id);
      if (!s) {
        s = { id: section.id, title: newTitle, title_en: newTitleEn, photos: [] };
        content.sections.push(s);
      } else {
        s.title    = newTitle;
        s.title_en = newTitleEn;
      }
      await savePhotosJson(content);
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
