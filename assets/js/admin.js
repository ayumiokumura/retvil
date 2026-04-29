// ============================================================
//  Ret.Village 管理者ページ  —  admin.js
//  パスワード変更: ADMIN_PASS の値を書き換えてください
// ============================================================
const ADMIN_PASS = "nasu-admin";
const SESSION_KEY = "rv_admin";

// ----------------------------------------------------------------
// 写真データ（パス・説明・使用ページ）
// ----------------------------------------------------------------
const PHOTO_SECTIONS = [
  {
    title: "特別な写真（ヒーロー・ロゴ・オーナー）",
    photos: [
      { path: "assets/images/nasu.jpg",        desc: "トップページ 背景",              pages: "index.html" },
      { path: "assets/images/logo.png",         desc: "ロゴ 丸アイコン（トップ画面）",  pages: "index.html" },
      { path: "assets/images/owner_yumi.png",   desc: "オーナー YUMI の顔写真",         pages: "owner.html" },
      { path: "assets/images/owner_mikio.png",  desc: "オーナー MIKIO の顔写真",        pages: "owner.html" },
      { path: "assets/images/parking.JPG",      desc: "駐車場",                         pages: "facilities.html" },
    ]
  },
  {
    title: "内装 — 写真ページ",
    photos: [
      { path: "assets/images/interior/01_リビング_IMG_1851.JPG",    desc: "リビング (1)",    pages: "photos.html" },
      { path: "assets/images/interior/01_リビング_IMG_1875.JPG",    desc: "リビング (2)",    pages: "photos.html" },
      { path: "assets/images/interior/01_リビング_IMG_1824.JPG",    desc: "リビング (3)",    pages: "photos.html" },
      { path: "assets/images/interior/01_リビング_IMG_1831.JPG",    desc: "リビング広角",    pages: "photos.html" },
      { path: "assets/images/interior/02_キッチン_IMG_1870.JPG",    desc: "キッチン",        pages: "photos.html" },
      { path: "assets/images/interior/03_暖炉_IMG_1898.JPG",        desc: "暖炉",            pages: "photos.html" },
      { path: "assets/images/interior/04_ビールサーバー_IMG_1852.JPG", desc: "ビールサーバー", pages: "photos.html" },
      { path: "assets/images/interior/05_和室_IMG_4104.JPG",        desc: "和室 (1)",        pages: "photos.html / facilities.html" },
      { path: "assets/images/interior/05_和室_IMG_1885.JPG",        desc: "和室 (2)",        pages: "photos.html" },
      { path: "assets/images/interior/05_和室_IMG_4158.JPG",        desc: "和室 (3)",        pages: "photos.html / facilities.html" },
      { path: "assets/images/interior/06_ロフト_IMG_4228.JPG",      desc: "ロフト (1)",      pages: "photos.html" },
      { path: "assets/images/interior/06_ロフト_IMG_1883.JPG",      desc: "ロフト (2)",      pages: "photos.html" },
      { path: "assets/images/interior/07_洗面_IMG_1861.JPG",        desc: "洗面",            pages: "photos.html" },
      { path: "assets/images/interior/08_バスルーム_IMG_4115.JPG",  desc: "バスルーム",      pages: "photos.html" },
      { path: "assets/images/interior/09_インテリア_IMG_4067.JPG",  desc: "インテリア (1)",  pages: "photos.html" },
      { path: "assets/images/interior/09_インテリア_IMG_4172.JPG",  desc: "インテリア (2)",  pages: "photos.html" },
    ]
  },
  {
    title: "外装 — 写真ページ",
    photos: [
      { path: "assets/images/exterior/01_全景_IMG_1866.JPG",           desc: "外観全景",     pages: "photos.html" },
      { path: "assets/images/exterior/02_デッキ_IMG_1889.JPG",         desc: "デッキ",       pages: "photos.html" },
      { path: "assets/images/exterior/02_デッキ_BBQ_IMG_1897.jpg",     desc: "デッキBBQ",    pages: "photos.html" },
      { path: "assets/images/exterior/02_デッキ_遊び_IMG_1850.JPG",    desc: "外遊び",       pages: "photos.html" },
      { path: "assets/images/exterior/03_BBQ小屋_IMG_1863.JPG",        desc: "いろり小屋",   pages: "photos.html" },
      { path: "assets/images/exterior/04_看板_昼_IMG_4045.JPG",        desc: "看板（昼）",   pages: "photos.html" },
      { path: "assets/images/exterior/04_看板_夜_IMG_4240.JPG",        desc: "看板（夜）",   pages: "photos.html" },
      { path: "assets/images/exterior/05_雪景色_IMG_4277.JPG",         desc: "雪景色",       pages: "photos.html" },
    ]
  },
  {
    title: "アメニティ・設備 — 写真ページ",
    photos: [
      { path: "assets/images/amenity/01_キッチン_IMG_1872.JPG",             desc: "キッチン (1)",       pages: "photos.html" },
      { path: "assets/images/amenity/01_キッチン_食器棚_IMG_4283.JPG",      desc: "食器棚",             pages: "photos.html" },
      { path: "assets/images/amenity/01_キッチン_家電_IMG_4288.JPG",        desc: "キッチン家電",       pages: "photos.html" },
      { path: "assets/images/amenity/02_バー_ビールサーバー_IMG_1853.JPG",  desc: "ビールサーバー",     pages: "photos.html" },
      { path: "assets/images/amenity/02_バー_ワインセラー_IMG_1873.JPG",    desc: "ワインセラー",       pages: "photos.html" },
      { path: "assets/images/amenity/02_バー_ワイングラス_IMG_4113.JPG",    desc: "ワイングラス",       pages: "photos.html" },
      { path: "assets/images/amenity/03_BBQグリル_IMG_1880.JPG",            desc: "BBQグリル (1)",      pages: "photos.html" },
      { path: "assets/images/amenity/03_BBQグリル_オープン_IMG_1882.JPG",   desc: "BBQグリル (2)",      pages: "photos.html" },
      { path: "assets/images/amenity/03_BBQグリル_ツール_IMG_1826.JPG",     desc: "BBQツール",          pages: "photos.html" },
      { path: "assets/images/amenity/04_BBQ小屋_炉_IMG_1823.JPG",           desc: "いろり小屋 炉",      pages: "photos.html" },
      { path: "assets/images/amenity/04_BBQ小屋_夜_IMG_4122.JPG",           desc: "いろり小屋（夜）",   pages: "photos.html" },
      { path: "assets/images/amenity/05_薪_IMG_1822.JPG",                   desc: "薪",                 pages: "photos.html" },
      { path: "assets/images/amenity/06_暖炉_IMG_1898.jpg",                 desc: "暖炉",               pages: "photos.html" },
      { path: "assets/images/amenity/07_洗面_ランドリー_IMG_1861.JPG",      desc: "洗面・ランドリー",   pages: "photos.html / facilities.html" },
      { path: "assets/images/amenity/08_トイレ_IMG_1838.JPG",               desc: "トイレ",             pages: "photos.html / facilities.html" },
      { path: "assets/images/amenity/09_お風呂_IMG_4115.JPG",               desc: "お風呂",             pages: "photos.html / facilities.html" },
      { path: "assets/images/amenity/10_デッキ_昼_IMG_1890.JPG",            desc: "デッキ（昼）",       pages: "photos.html" },
      { path: "assets/images/amenity/10_デッキ_夜_IMG_4117.JPG",            desc: "デッキ（夜）",       pages: "photos.html" },
      { path: "assets/images/amenity/10_デッキ_夜外観_IMG_4150.JPG",        desc: "デッキ夜景",         pages: "photos.html" },
      { path: "assets/images/amenity/11_ライトアップ_IMG_4128.JPG",         desc: "ライトアップ",       pages: "photos.html" },
    ]
  }
];

// ----------------------------------------------------------------
// 初期化
// ----------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem(SESSION_KEY) === "1") {
    showAdmin();
  }

  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const pw = document.getElementById("admin-pw").value;
    if (pw === ADMIN_PASS) {
      sessionStorage.setItem(SESSION_KEY, "1");
      showAdmin();
    } else {
      document.getElementById("login-error").textContent = "パスワードが正しくありません";
    }
  });

  document.getElementById("logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });
});

function showAdmin() {
  document.getElementById("admin-login").style.display = "none";
  document.getElementById("admin-main").style.display = "block";
  renderPhotos();
}

// ----------------------------------------------------------------
// 写真グリッドのレンダリング
// ----------------------------------------------------------------
function renderPhotos() {
  const container = document.getElementById("photo-container");
  container.innerHTML = "";

  PHOTO_SECTIONS.forEach(section => {
    const sec = document.createElement("div");
    sec.className = "a-section";
    sec.innerHTML = `<h2>${section.title}</h2>`;

    const grid = document.createElement("div");
    grid.className = "a-grid";

    section.photos.forEach(photo => {
      const card = document.createElement("div");
      card.className = "a-card";
      card.innerHTML = `
        <div class="a-img-wrap">
          <img src="${photo.path}" alt="${photo.desc}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=a-no-img>画像なし</div>'">
        </div>
        <div class="a-info">
          <div class="a-desc">${photo.desc}</div>
          <div class="a-pages">📄 ${photo.pages}</div>
          <div class="a-path" title="${photo.path}">${photo.path}</div>
          <div class="a-actions">
            <button class="a-btn-preview" onclick="openPreview('${photo.path}', this)">テスト表示</button>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    sec.appendChild(grid);
    container.appendChild(sec);
  });
}

// ----------------------------------------------------------------
// プレビューモーダル
// ----------------------------------------------------------------
let _currentPreviewPath = "";

function openPreview(path, btn) {
  _currentPreviewPath = path;
  const input = document.getElementById("file-input");
  input.value = "";
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      document.getElementById("preview-current").src = path;
      document.getElementById("preview-new").src = ev.target.result;
      document.getElementById("preview-filename").textContent = file.name;
      document.getElementById("preview-modal").style.display = "flex";
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function closePreview() {
  document.getElementById("preview-modal").style.display = "none";
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closePreview();
});
