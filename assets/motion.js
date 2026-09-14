/*
 * Atlas Motion v1
 * Adds shared motion behavior without touching Atlas data / router logic.
 */

const root = document.documentElement;
root.classList.add('atlas-motion-v1');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const canAnimate = () =>
  !reduceMotion.matches &&
  typeof Element !== 'undefined' &&
  typeof Element.prototype.animate === 'function';

const EASE_OUT = 'cubic-bezier(.16,1,.3,1)';
const EASE_SOFT = 'cubic-bezier(.22,1,.36,1)';

function visibleEnough(rect) {
  return rect.bottom > -120 && rect.top < window.innerHeight + 120;
}

const indicatorHosts = new WeakSet();
const indicatorObservers = new WeakMap();

function activeControl(host) {
  if (host.matches('nav')) return host.querySelector(':scope > a.active');
  return host.querySelector(':scope > [aria-pressed="true"]');
}

function scheduleIndicator(host) {
  if (!host || host.dataset.motionIndicatorPending === '1') return;
  host.dataset.motionIndicatorPending = '1';

  requestAnimationFrame(() => {
    delete host.dataset.motionIndicatorPending;

    const active = activeControl(host);
    if (!active || active.hidden) {
      host.classList.remove('motion-indicator-ready');
      return;
    }

    host.style.setProperty('--motion-indicator-x', `${active.offsetLeft}px`);
    host.style.setProperty('--motion-indicator-y', `${active.offsetTop}px`);
    host.style.setProperty('--motion-indicator-w', `${active.offsetWidth}px`);
    host.style.setProperty('--motion-indicator-h', `${active.offsetHeight}px`);

    const radius = getComputedStyle(active).borderRadius;
    if (radius) host.style.setProperty('--motion-indicator-r', radius);

    host.classList.add('motion-indicator-ready');
  });
}

function bindIndicator(host) {
  if (!host || indicatorHosts.has(host)) return;
  indicatorHosts.add(host);
  host.classList.add('motion-indicator-host');

  const observer = new MutationObserver(() => scheduleIndicator(host));
  observer.observe(host, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'aria-pressed', 'hidden']
  });
  indicatorObservers.set(host, observer);

  if ('ResizeObserver' in window) {
    const resize = new ResizeObserver(() => scheduleIndicator(host));
    resize.observe(host);
    for (const child of host.children) resize.observe(child);
  }

  scheduleIndicator(host);
}

function discoverIndicators(scope = document) {
  const selectors = [
    'header nav',
    '.status-filter',
    '.network-explainer [role="group"][aria-label="网络历史范围"]',
    '.network-mobile-tabs'
  ];

  for (const selector of selectors) {
    if (scope instanceof Element && scope.matches(selector)) bindIndicator(scope);
    scope.querySelectorAll?.(selector).forEach(bindIndicator);
  }
}

discoverIndicators();

const dynamicHostObserver = new MutationObserver(records => {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node instanceof Element) discoverIndicators(node);
    }
  }
});
dynamicHostObserver.observe(document.body, { childList: true, subtree: true });

window.addEventListener('resize', () => {
  document.querySelectorAll('.motion-indicator-host').forEach(scheduleIndicator);
}, { passive: true });

document.fonts?.ready?.then(() => {
  document.querySelectorAll('.motion-indicator-host').forEach(scheduleIndicator);
});

const valueSelectors = [
  '#stat-nodes',
  '#stat-regions',
  '#stat-in',
  '#stat-out',
  '#stat-month',
  '#stat-cost',
  '#map-online',
  '#map-latency',
  '#node-count',
  '#network-count'
];

function bindValueMotion(el) {
  if (!el || el.dataset.motionValueBound === '1') return;
  el.dataset.motionValueBound = '1';
  el.classList.add('motion-value');

  let previous = el.textContent;
  let lastPlayed = 0;

  const observer = new MutationObserver(() => {
    const next = el.textContent;
    if (next === previous) return;

    const old = previous;
    previous = next;

    if (!canAnimate()) return;
    if (!next || next === '—' || old === '—') return;

    const now = performance.now();
    if (now - lastPlayed < 260) return;
    lastPlayed = now;

    el.getAnimations().forEach(animation => {
      if (animation.id === 'atlas-motion-value') animation.cancel();
    });

    const animation = el.animate(
      [
        { opacity: .46, transform: 'translateY(4px)', filter: 'blur(1.4px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }
      ],
      { duration: 190, easing: EASE_OUT, fill: 'both' }
    );
    animation.id = 'atlas-motion-value';
  });

  observer.observe(el, { childList: true, characterData: true, subtree: true });
}

valueSelectors.forEach(selector => bindValueMotion(document.querySelector(selector)));

const connection = document.querySelector('#connection');
if (connection) {
  let previous = connection.textContent;

  const observer = new MutationObserver(() => {
    const next = connection.textContent;
    if (next === previous) return;
    previous = next;
    if (!canAnimate()) return;

    connection.getAnimations().forEach(animation => {
      if (animation.id === 'atlas-motion-connection') animation.cancel();
    });

    const animation = connection.animate(
      [
        { opacity: .35, transform: 'translateY(3px)', filter: 'blur(1px)' },
        { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' }
      ],
      { duration: 210, easing: EASE_OUT, fill: 'both' }
    );
    animation.id = 'atlas-motion-connection';
  });

  observer.observe(connection, { childList: true, characterData: true, subtree: true });
}

let rowSnapshot = null;

function detailToggleFromEvent(event) {
  const target = event.target instanceof Element ? event.target.closest('[data-detail-toggle]') : null;
  if (!target) return null;
  const row = target.closest('.node-row');
  if (!row || row.hidden) return null;
  return { target, row };
}

document.addEventListener('click', event => {
  const match = detailToggleFromEvent(event);
  if (!match || !canAnimate()) {
    rowSnapshot = null;
    return;
  }

  const rows = [...document.querySelectorAll('#node-list .node-row:not([hidden])')];
  rowSnapshot = {
    clicked: match.row,
    positions: new Map(rows.map(row => {
      const rect = row.getBoundingClientRect();
      return [row, { top: rect.top, rect }];
    }))
  };
}, true);

document.addEventListener('click', event => {
  const match = detailToggleFromEvent(event);
  if (!match || !rowSnapshot || !canAnimate()) return;

  const snapshot = rowSnapshot;
  rowSnapshot = null;

  requestAnimationFrame(() => {
    for (const [row, before] of snapshot.positions) {
      if (!row.isConnected || row.hidden) continue;

      const afterRect = row.getBoundingClientRect();
      const deltaY = before.top - afterRect.top;
      if (Math.abs(deltaY) < .75) continue;
      if (!visibleEnough(before.rect) && !visibleEnough(afterRect)) continue;

      row.getAnimations().forEach(animation => {
        if (animation.id === 'atlas-motion-row-flip') animation.cancel();
      });

      const animation = row.animate(
        [
          { transform: `translate3d(0,${deltaY}px,0)` },
          { transform: 'translate3d(0,0,0)' }
        ],
        { duration: 300, easing: EASE_SOFT }
      );
      animation.id = 'atlas-motion-row-flip';
    }

    const detail = match.row.querySelector('.node-detail');
    if (detail?.open) {
      const content = match.row.querySelector('.node-detail-cell');
      content?.animate(
        [
          { opacity: 0, transform: 'translateY(-4px)', clipPath: 'inset(0 0 18% 0)' },
          { opacity: 1, transform: 'translateY(0)', clipPath: 'inset(0 0 0 0)' }
        ],
        { duration: 240, easing: EASE_OUT }
      );
    }
  });
});

const viewSections = ['#overview', '#nodes', '#network', '#activity']
  .map(selector => document.querySelector(selector))
  .filter(Boolean);

for (const section of viewSections) {
  const observer = new MutationObserver(records => {
    if (!canAnimate()) return;
    if (!records.some(record => record.attributeName === 'hidden')) return;
    if (section.hidden) return;

    section.animate(
      [
        { opacity: 0, transform: 'translateY(5px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ],
      { duration: 230, easing: EASE_OUT }
    );
  });

  observer.observe(section, { attributes: true, attributeFilter: ['hidden'] });
}

window.addEventListener('hashchange', () => {
  requestAnimationFrame(() => {
    document.querySelectorAll('.motion-indicator-host').forEach(scheduleIndicator);
  });
});

reduceMotion.addEventListener?.('change', () => {
  document.querySelectorAll('.motion-indicator-host').forEach(scheduleIndicator);
});
