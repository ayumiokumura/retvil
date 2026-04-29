const wrapper = document.querySelector('.hero-wrapper');
const title   = document.querySelector('.hero-title');
const message = document.querySelector('.hero-message');
const logo    = document.querySelector('.hero-logo');
const fadeBg  = document.querySelector('.hero-fade-bg');

const ease = t => t < 0.5 ? 2*t*t : 1 - (-2*t+2)**2/2;

const MSG_START_Y  = 200;
const MSG_FINAL_Y  = -105;
const LOGO_START_Y = 300;
const LOGO_GAP     = 28;

function getLogoFinalY() {
  const msgH = message.offsetHeight || 86;
  return MSG_FINAL_Y + msgH + LOGO_GAP;
}

let logoFinalY = getLogoFinalY();
window.addEventListener('resize', () => { logoFinalY = getLogoFinalY(); });

window.addEventListener('scroll', () => {
  const maxScroll = wrapper.offsetHeight - window.innerHeight;
  const raw = Math.min(Math.max(window.scrollY / maxScroll, 0), 1);
  const p   = ease(raw);

  title.style.transform = `translate(-50%, calc(-50% + ${-p * 150}px))`;

  message.style.opacity   = p;
  message.style.transform = `translateX(-50%) translateY(${MSG_START_Y - p * (MSG_START_Y - MSG_FINAL_Y)}px)`;

  const p2 = ease(Math.min(Math.max((raw - 0.15) / 0.85, 0), 1));
  logo.style.opacity   = p2;
  logo.style.transform = `translateX(-50%) translateY(${LOGO_START_Y - p2 * (LOGO_START_Y - logoFinalY)}px)`;

  fadeBg.style.backdropFilter = `blur(${p * 6}px)`;
  fadeBg.style.background     = `rgba(255,255,255,${p * 0.35})`;
}, { passive: true });
