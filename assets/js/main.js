const wrapper = document.querySelector('.hero-wrapper');
const title   = document.querySelector('.hero-title');
const message = document.querySelector('.hero-message');
const logo    = document.querySelector('.hero-logo');
const fadeBg  = document.querySelector('.hero-fade-bg');

const ease = t => t < 0.5 ? 2*t*t : 1 - (-2*t+2)**2/2;

window.addEventListener('scroll', () => {
  const maxScroll = wrapper.offsetHeight - window.innerHeight;
  const raw = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
  const p   = ease(raw);

  // タイトルが上に移動（メッセージ・ロゴ分のスペースを空ける）
  title.style.transform = `translate(-50%, calc(-50% + ${-p * 150}px))`;

  // メッセージが下から上昇してタイトル直下に合流
  message.style.opacity   = p;
  message.style.transform = `translateX(-50%) translateY(${200 - p * 305}px)`;

  // ロゴが少し遅れて上昇
  const p2 = ease(Math.min(Math.max((raw - 0.15) / 0.85, 0), 1));
  logo.style.opacity   = p2;
  logo.style.transform = `translateX(-50%) translateY(${300 - p2 * 300}px)`;

  // 背景が白ぼけ
  fadeBg.style.backdropFilter = `blur(${p * 6}px)`;
  fadeBg.style.background     = `rgba(255,255,255,${p * 0.35})`;
}, { passive: true });
