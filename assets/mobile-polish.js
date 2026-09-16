/* Atlas mobile-only density helpers. */
const root = document.documentElement;
const mobile = matchMedia('(max-width: 800px)');
let compact = false;
let pending = false;
let anchorY = 0;
const masthead = document.querySelector('.masthead');
const nav = masthead?.querySelector('nav');
const measure = () => { if (nav) root.style.setProperty('--mobile-header-offset', nav.offsetTop + 'px'); };
if (typeof ResizeObserver !== 'undefined' && masthead) new ResizeObserver(measure).observe(masthead);
measure();
masthead?.addEventListener('focusin', () => applyCompact(false));

function applyCompact(next) {
  if (compact === next) return;
  compact = next;
  root.classList.toggle('atlas-mobile-compact', next);
  for (const el of masthead?.querySelectorAll('.brand,.header-actions') || []) el.inert = next;
}

function syncCompactHeader() {
  pending = false;

  if (!mobile.matches) {
    applyCompact(false);
    return;
  }

  const y = Math.max(0, window.scrollY || window.pageYOffset || 0);

  const delta = y - anchorY;
  if (y < 72) { applyCompact(false); anchorY = y; }
  else if (Math.abs(delta) > 24) {
    const interacting = document.activeElement?.closest('.brand,.header-actions') || !document.querySelector('#activity-popover')?.hidden;
    applyCompact(y > 140 && delta > 0 && !interacting);
    anchorY = y;
  }
}

function scheduleCompactHeader() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(syncCompactHeader);
}

addEventListener('scroll', scheduleCompactHeader, { passive: true });
addEventListener('pageshow', scheduleCompactHeader, { passive: true });
mobile.addEventListener?.('change', scheduleCompactHeader);
scheduleCompactHeader();
