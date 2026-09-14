/* Atlas mobile-only density helpers. */
const root = document.documentElement;
const mobile = matchMedia('(max-width: 800px)');
let compact = false;
let pending = false;

function applyCompact(next) {
  if (compact === next) return;
  compact = next;
  root.classList.toggle('atlas-mobile-compact', next);
}

function syncCompactHeader() {
  pending = false;

  if (!mobile.matches) {
    applyCompact(false);
    return;
  }

  const y = Math.max(0, window.scrollY || window.pageYOffset || 0);

  // Hysteresis avoids flicker around the threshold while iOS adjusts its browser chrome.
  if (compact) {
    if (y < 72) applyCompact(false);
  } else if (y > 140) {
    applyCompact(true);
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
