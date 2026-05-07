// ============================================================
//  Ret.Village 管理者ページ  —  admin.js
//  パスワード変更: ADMIN_PASS を書き換えてください
// ============================================================
const ADMIN_PASS  = "nasu-admin";
const SESSION_KEY = "rv_admin";
const TOKEN_KEY   = "rv_token";
const GH_OWNER    = "ayumiokumura";
const GH_REPO     = "retvil";
const GH_BRANCH   = "main";

// ----------------------------------------------------------------
// 必須写真（差し替えのみ・削除不可）
// ----------------------------------------------------------------
const REQUIRED_PHOTOS = [
  { path: "assets/images/nasu.jpg",        desc: "トップページ 背景",     pages: "index.html" },
  { path: "assets/images/logo.png",        desc: "ロゴ（丸アイコン）",    pages: "index.html" },
  { path: "assets/images/owner_yumi.png",  desc: "オーナー YUMI 顔写真",  pages: "owner.html" },
  { path: "assets/images/owner_mikio.png", desc: "オーナー MIKIO 顔写真", pages: "owner.html" },
];

// ----------------------------------------------------------------
// ギャラリーセクション定義（写真ページ）
// ----------------------------------------------------------------
const GALLERY_SECTIONS = [
  { id: "interior", title: "内装",             title_en: "Interior",              folder: "assets/images/interior" },
  { id: "exterior", title: "外装",             title_en: "Exterior & Garden",     folder: "assets/images/exterior" },
  { id: "amenity",  title: "アメニティ・設備",  title_en: "Amenities & Equipment", folder: "assets/images/amenity"  },
];

// ----------------------------------------------------------------
// 施設写真セクション定義（基本情報ページ）
// ----------------------------------------------------------------
const FACILITY_SECTIONS = [
  { id: "bath",    title: "バス・トイレ", folder: "assets/images/amenity"  },
  { id: "ac",      title: "エアコン",     folder: "assets/images/interior" },
  { id: "parking", title: "駐車場",       folder: "assets/images"          },
];

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

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

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
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.message || res.status);
  }
  return res.json();
}

async function ghDel(path, sha, message) {
  const res = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/contents/${encodePath(path)}`,
    { method: "DELETE", headers: ghHeaders(), body: JSON.stringify({ message, sha, branch: GH_BRANCH }) }
  );
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.message || res.status);
  }
  return res.json();
}

// ================================================================
// 画像圧縮（最大1920px・JPEG 82%）
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
      canvas.toBlob(blob => {
        const reader = new FileReader();
        reader.onload = ev => resolve(ev.target.result.split(",")[1]);
        reader.readAsDataURL(blob);
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
    const content = JSON.parse(new TextDecoder().decode(bytes));
    return { content, sha: data.sha };
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
  if (busy) {
    btn.dataset.orig = btn.textContent;
    btn.textContent  = "処理中…";
    btn.disabled     = true;
  } else {
    btn.textContent = btn.dataset.orig || btn.textContent;
    btn.disabled    = false;
  }
}

// ================================================================
// ファイルピッカー
// ================================================================

const _picker = (() => {
  const inp = document.createElement("input");
  inp.type   = "file";
  inp.accept = "image/*";
  inp.style.display = "none";
  document.body.appendChild(inp);
  let _cb = null;
  inp.addEventListener("change", () => {
    const f = inp.files[0];
    inp.value = "";
    if (f && _cb) _cb(f);
    _cb = null;
  });
  return cb => { _cb = cb; inp.click(); };
})();

// ================================================================
// 初期化
// ================================================================

document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem(SESSION_KEY) === "1" && localStorage.getItem(TOKEN_KEY)) {
    showAdmin();
  }

  document.getElementById("login-form").addEventListener("submit", async e => {
    e.preventDefault();
    const pw  = document.getElementById("admin-pw").value;
    const tok = document.getElementById("admin-token").value.trim();
    const err = document.getElementById("login-error");

    if (pw !== ADMIN_PASS) { err.textContent = "パスワードが正しくありません"; return; }
    if (!tok)              { err.textContent = "GitHub トークンを入力してください"; return; }

    const btn = e.submitter;
    setBusy(btn, true);
    err.textContent = "";

    try {
      const r = await fetch(`https://api.github.com/repos/${GH_OWNER}/${GH_REPO}`, {
        headers: { Authorization: `token ${tok}` }
      });
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
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
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
// 必須写真セクション
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
        <div class="a-actions">
          <button class="a-btn-replace">差し替え</button>
        </div>
      </div>
    `;
    const btn = card.querySelector(".a-btn-replace");
    btn.addEventListener("click", () => {
      _picker(async file => {
        setBusy(btn, true);
        try {
          const content64 = await compressImage(file);
          let sha = null;
          try { sha = (await ghGet(photo.path)).sha; } catch {}
          await ghPut(photo.path, content64, `Replace: ${photo.path}`, sha);
          card.querySelector("img").src = photo.path + "?t=" + Date.now();
          showToast("差し替え完了！（サイト反映まで約1分）");
        } catch (err) {
          showToast("エラー: " + err.message, true);
        } finally {
          setBusy(btn, false);
        }
      });
    });
    grid.appendChild(card);
  });
}

// ================================================================
// 施設写真セクション（基本情報ページ）
// ================================================================

async function renderFacilities() {
  const container = document.getElementById("facilities-container");
  container.innerHTML = "<div class='a-loading'>施設写真を読み込み中…</div>";

  let photosData;
  try {
    photosData = (await loadPhotosJson()).content;
  } catch (err) {
    container.innerHTML = `<div class='a-err-msg'>読み込み失敗: ${err.message}</div>`;
    return;
  }

  container.innerHTML = "";
  const facilitySections = photosData.facility_sections || [];

  FACILITY_SECTIONS.forEach(section => {
    const sec     = facilitySections.find(s => s.id === section.id) || { photos: [] };
    const wrapper = document.createElement("div");
    wrapper.className = "a-section";
    wrapper.innerHTML = `
      <div class="a-section-header">
        <h2>${section.title}</h2>
        <button class="a-btn-add">＋ 写真を追加</button>
      </div>
    `;
    const grid = document.createElement("div");
    grid.className = "a-grid";
    grid.id = `fac-grid-${section.id}`;

    sec.photos.forEach(photo => grid.appendChild(makeFacilityCard(photo, section)));

    wrapper.appendChild(grid);
    container.appendChild(wrapper);

    wrapper.querySelector(".a-btn-add").addEventListener("click", e => {
      addFacilityPhotoFlow(section, e.currentTarget);
    });
  });
}

function makeFacilityCard(photo, section) {
  const card = document.createElement("div");
  card.className   = "a-card";
  card.dataset.path = photo.path;
  card.innerHTML = `
    <div class="a-img-wrap">
      <img src="${photo.path}" alt="${photo.alt || ""}" loading="lazy"
           onerror="this.parentElement.innerHTML='<div class=a-no-img>画像なし</div>'">
    </div>
    <div class="a-info">
      <div class="a-desc">${photo.alt || "（説明なし）"}</div>
      <div class="a-actions">
        <button class="a-btn-replace-sm">差し替え</button>
        <button class="a-btn-delete">削除</button>
      </div>
    </div>
  `;

  card.querySelector(".a-btn-replace-sm").addEventListener("click", e => {
    const btn = e.currentTarget;
    _picker(async file => {
      setBusy(btn, true);
      try {
        const filename  = `${Date.now()}.jpg`;
        const newPath   = `${section.folder}/${filename}`;
        const content64 = await compressImage(file);
        await ghPut(newPath, content64, `Replace facility photo: ${section.id}/${filename}`);

        const { content, sha } = await loadPhotosJson();
        if (!content.facility_sections) content.facility_sections = [];
        const s = content.facility_sections.find(s => s.id === section.id);
        if (s) {
          const p = s.photos.find(p => p.path === photo.path);
          if (p) { p.path = newPath; photo.path = newPath; }
        }
        await savePhotosJson(content, sha, `Replace facility photo: ${section.id}`);
        card.querySelector("img").src = newPath + "?t=" + Date.now();
        showToast("差し替え完了！（サイト反映まで約1分）");
      } catch (err) {
        showToast("エラー: " + err.message, true);
      } finally {
        setBusy(btn, false);
      }
    });
  });

  card.querySelector(".a-btn-delete").addEventListener("click", async e => {
    const btn = e.currentTarget;
    if (!confirm(`「${photo.alt || photo.path}」を削除しますか？\n（ファイルは保持されます）`)) return;
    setBusy(btn, true);
    try {
      const { content, sha } = await loadPhotosJson();
      if (!content.facility_sections) content.facility_sections = [];
      const s = content.facility_sections.find(s => s.id === section.id);
      if (s) s.photos = s.photos.filter(p => p.path !== photo.path);
      await savePhotosJson(content, sha, `Remove from facility: ${photo.path}`);
      card.remove();
      showToast("削除しました。（サイト反映まで約1分）");
    } catch (err) {
      showToast("エラー: " + err.message, true);
      setBusy(btn, false);
    }
  });

  return card;
}

async function addFacilityPhotoFlow(section, addBtn) {
  _picker(async file => {
    const alt = prompt("写真の説明を入力してください\n例：浴室、洗面台、駐車場など", "");
    if (alt === null) return;

    setBusy(addBtn, true);
    try {
      const filename  = `${Date.now()}.jpg`;
      const path      = `${section.folder}/${filename}`;
      const content64 = await compressImage(file);
      await ghPut(path, content64, `Add facility photo: ${section.id}/${filename}`);

      const { content, sha } = await loadPhotosJson();
      if (!content.facility_sections) content.facility_sections = [];
      let s = content.facility_sections.find(s => s.id === section.id);
      if (!s) {
        s = { id: section.id, title: section.title, photos: [] };
        content.facility_sections.push(s);
      }
      const newPhoto = { path, alt: alt.trim() };
      s.photos.push(newPhoto);
      await savePhotosJson(content, sha, `Add facility photo: ${section.id}/${filename}`);

      document.getElementById(`fac-grid-${section.id}`)
              .appendChild(makeFacilityCard(newPhoto, section));

      showToast("追加しました！（サイト反映まで約1分）");
    } catch (err) {
      showToast("エラー: " + err.message, true);
    } finally {
      setBusy(addBtn, false);
    }
  });
}

// ================================================================
// ギャラリーセクション（写真ページ）
// ================================================================

async function renderGallery() {
  const container = document.getElementById("gallery-container");
  container.innerHTML = "<div class='a-loading'>ギャラリーを読み込み中…</div>";

  let photosData;
  try {
    photosData = (await loadPhotosJson()).content;
  } catch (err) {
    container.innerHTML = `<div class='a-err-msg'>読み込み失敗: ${err.message}</div>`;
    return;
  }

  container.innerHTML = "";

  GALLERY_SECTIONS.forEach(section => {
    const sec = photosData.sections.find(s => s.id === section.id)
      || { id: section.id, title: section.title, title_en: section.title_en, photos: [] };

    const wrapper = document.createElement("div");
    wrapper.className = "a-section";

    const header = document.createElement("div");
    header.className = "a-section-header";
    const titleRow = document.createElement("div");
    titleRow.className = "a-title-row";
    const addBtn = document.createElement("button");
    addBtn.className = "a-btn-add";
    addBtn.textContent = "＋ 写真を追加";
    header.appendChild(titleRow);
    header.appendChild(addBtn);
    wrapper.appendChild(header);

    showTitleView(titleRow, sec, section);

    const grid = document.createElement("div");
    grid.className = "a-grid";
    grid.id = `grid-${section.id}`;

    sec.photos.forEach(photo => grid.appendChild(makeGalleryCard(photo, section)));

    wrapper.appendChild(grid);
    container.appendChild(wrapper);

    addBtn.addEventListener("click", () => addPhotoFlow(section, addBtn));
  });
}

function showTitleView(titleRow, sec, section) {
  const title    = sec.title    || section.title;
  const title_en = sec.title_en || section.title_en;
  titleRow.innerHTML = `
    <h2>${title} <span class="a-title-en">(${title_en})</span></h2>
    <button class="a-btn-edit-title" title="カテゴリー名を編集">✏️</button>
  `;
  titleRow.querySelector(".a-btn-edit-title").addEventListener("click", () => {
    showTitleEdit(titleRow, sec, section);
  });
}

function showTitleEdit(titleRow, sec, section) {
  const title    = sec.title    || section.title;
  const title_en = sec.title_en || section.title_en;
  titleRow.innerHTML = `
    <input class="a-input-title"    value="${title}"    placeholder="日本語タイトル">
    <input class="a-input-title-en" value="${title_en}" placeholder="English title">
    <button class="a-btn-save-title">保存</button>
    <button class="a-btn-cancel-title">キャンセル</button>
  `;
  titleRow.querySelector(".a-btn-cancel-title").addEventListener("click", () => {
    showTitleView(titleRow, sec, section);
  });
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
        s.title    = newTitle;
        s.title_en = newTitleEn;
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

function makeGalleryCard(photo, section) {
  const card = document.createElement("div");
  card.className  = "a-card";
  card.dataset.path = photo.path;
  card.innerHTML = `
    <div class="a-img-wrap">
      <img src="${photo.path}" alt="${photo.alt || ""}" loading="lazy"
           onerror="this.parentElement.innerHTML='<div class=a-no-img>画像なし</div>'">
    </div>
    <div class="a-info">
      <div class="a-desc">${photo.alt || "（説明なし）"}</div>
      <div class="a-actions">
        <button class="a-btn-replace-sm">差し替え</button>
        <button class="a-btn-delete">削除</button>
      </div>
    </div>
  `;

  card.querySelector(".a-btn-replace-sm").addEventListener("click", e => {
    const btn = e.currentTarget;
    _picker(async file => {
      setBusy(btn, true);
      try {
        const content64 = await compressImage(file);
        let sha = null;
        try { sha = (await ghGet(photo.path)).sha; } catch {}
        await ghPut(photo.path, content64, `Replace: ${photo.path}`, sha);
        card.querySelector("img").src = photo.path + "?t=" + Date.now();
        showToast("差し替え完了！（サイト反映まで約1分）");
      } catch (err) {
        showToast("エラー: " + err.message, true);
      } finally {
        setBusy(btn, false);
      }
    });
  });

  card.querySelector(".a-btn-delete").addEventListener("click", async e => {
    const btn = e.currentTarget;
    if (!confirm(`「${photo.alt || photo.path}」を削除しますか？`)) return;
    setBusy(btn, true);
    try {
      const fileData = await ghGet(photo.path);
      await ghDel(photo.path, fileData.sha, `Delete: ${photo.path}`);
      const { content, sha } = await loadPhotosJson();
      const s = content.sections.find(s => s.id === section.id);
      if (s) s.photos = s.photos.filter(p => p.path !== photo.path);
      await savePhotosJson(content, sha, `Remove from gallery: ${photo.path}`);
      card.remove();
      showToast("削除しました。（サイト反映まで約1分）");
    } catch (err) {
      showToast("エラー: " + err.message, true);
      setBusy(btn, false);
    }
  });

  return card;
}

async function addPhotoFlow(section, addBtn) {
  _picker(async file => {
    const alt = prompt("写真の説明を入力してください\n例：リビング、外観、BBQグリルなど", "");
    if (alt === null) return;

    setBusy(addBtn, true);
    try {
      const filename   = `${Date.now()}.jpg`;
      const path       = `${section.folder}/${filename}`;
      const content64  = await compressImage(file);
      await ghPut(path, content64, `Add photo: ${section.id}/${filename}`);

      const { content, sha } = await loadPhotosJson();
      let s = content.sections.find(s => s.id === section.id);
      if (!s) {
        s = { id: section.id, title: section.title, title_en: section.title_en, photos: [] };
        content.sections.push(s);
      }
      const newPhoto = { path, alt: alt.trim() };
      s.photos.push(newPhoto);
      await savePhotosJson(content, sha, `Add to gallery: ${section.id}/${filename}`);

      document.getElementById(`grid-${section.id}`)
              .appendChild(makeGalleryCard(newPhoto, section));

      showToast("追加しました！（サイト反映まで約1分）");
    } catch (err) {
      showToast("エラー: " + err.message, true);
    } finally {
      setBusy(addBtn, false);
    }
  });
}
