import { escapeHtml, raw } from '../lib/html.mjs';

// Interface icons: 24 × 24, drawn with a fine stroke to match the typography.
const UI = {
  whatsapp:
    '<path d="M4.1 20l1.2-3.9A8.4 8.4 0 1 1 8.3 19z"/><path d="M9.3 8.4c.3-.4.8-.4 1 0l.8 1.5c.1.3 0 .6-.2.8l-.5.5a5.6 5.6 0 0 0 2.4 2.4l.5-.5c.2-.2.5-.3.8-.2l1.5.8c.4.2.4.7 0 1-.6.7-1.4 1-2.3.8a6.7 6.7 0 0 1-4.8-4.8c-.2-.9.1-1.7.8-2.3z"/>',
  arrow: '<path d="M4 12h15"/><path d="M14 7l5 5-5 5"/>',
  globe:
    '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5s1.2-6.1 3.5-8.5z"/>',
  menu: '<path d="M4 8h16"/><path d="M4 16h16"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
  chevronStart: '<path d="M15 5l-7 7 7 7"/>',
  chevronEnd: '<path d="M9 5l7 7-7 7"/>',
  expand: '<path d="M14 4h6v6"/><path d="M10 20H4v-6"/><path d="M20 4l-6 6"/><path d="M4 20l6-6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><path d="M12 8h.01"/>',
  lock: '<rect x="5" y="10.5" width="14" height="9.5" rx="1.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
  photo: '<rect x="3.5" y="5.5" width="17" height="13" rx="1.5"/><circle cx="9" cy="10.5" r="1.6"/><path d="M20.5 16l-4.5-4.5-7 7"/>',
  instagram: '<rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="3.6"/><path d="M16.8 7.2h.01"/>',
  facebook: '<path d="M14.5 20v-7h2.4l.4-2.8h-2.8V8.6c0-.8.3-1.4 1.4-1.4h1.5V4.7c-.3 0-1.2-.1-2.2-.1-2.2 0-3.6 1.3-3.6 3.7v1.9H9.2V13h2.4v7"/>',
  tiktok: '<path d="M14 4v10.6a3.4 3.4 0 1 1-3.4-3.4"/><path d="M14 4c.4 2.3 2 3.9 4.5 4.1"/>',
  pinterest: '<circle cx="12" cy="12" r="8.5"/><path d="M10.7 20.3l1.6-6.6"/><path d="M10 13.6c-.9-1.9.2-5 2.9-5 2.2 0 3.3 1.6 3.1 3.4-.2 2-1.3 3.4-2.8 3.4-1 0-1.6-.7-1.4-1.6"/>',
};

// Line drawings shown inside photo placeholders, one per collection (48 × 48).
const CRAFT = {
  rings:
    '<circle cx="19" cy="28" r="9"/><circle cx="29" cy="28" r="9"/><path d="M16.5 14.5l2.5-3.5h0l2.5 3.5-2.5 4z"/>',
  hoop:
    '<circle cx="24" cy="26" r="13"/><circle cx="24" cy="26" r="10.5"/><path d="M21.5 13.2V9.5h5v3.7"/><path d="M17 33c3-1 4-5 7-6s5 2 8-1"/><path d="M35.5 37.5l6-6"/>',
  knot:
    '<path d="M8 9h32"/><path d="M13 9c0 7 6 10 11 15"/><path d="M35 9c0 7-6 10-11 15"/><path d="M20 9c0 5 2 9 4 15"/><path d="M28 9c0 5-2 9-4 15"/><circle cx="24" cy="26" r="2.4"/><path d="M23 28.5l-5 12M24 28.5v12M25 28.5l5 12"/>',
  baby:
    '<path d="M18 10h12l7 6.5-4.2 4.2-3-2.7V39H18.2V18l-3 2.7-4.2-4.2z"/><path d="M21 10c.5 2.4 1.6 3.5 3 3.5s2.5-1.1 3-3.5"/>',
  brush:
    '<path d="M39 8.5L26.5 21"/><path d="M28.5 23.5l-4-4"/><path d="M24.5 19.5c-3.5 0-6 2.3-6 5.3 0 2.2-1.4 3.7-3.5 4.2 5.2 2 11.5.2 13-4.8"/><path d="M6 40c6-3.5 11 1.5 17-1.5s11-3 19-.5"/>',
  yarn:
    '<circle cx="21" cy="26" r="11"/><path d="M12 21c6-1 13 3 17 10"/><path d="M14.5 33c3-6 9-11 16-12.5"/><path d="M19 15.5c4 3 6 9 5 21"/><path d="M32 33l7-24.5c.4-1.4 2.5-1.2 2.4.4"/>',
  gift:
    '<rect x="10" y="20" width="28" height="19" rx="1"/><rect x="8" y="14.5" width="32" height="5.5" rx="1"/><path d="M24 14.5V39"/><path d="M24 14.5c-2.5-4.5-9-6-9-2.2 0 2.2 4.8 2.2 9 2.2"/><path d="M24 14.5c2.5-4.5 9-6 9-2.2 0 2.2-4.8 2.2-9 2.2"/>',
  portrait:
    '<circle cx="24" cy="18" r="7"/><path d="M11 40c1.5-7.5 6.5-11.5 13-11.5S35.5 32.5 37 40"/>',
  atelier:
    '<path d="M10 38h28"/><path d="M14 38V22"/><path d="M34 38V22"/><path d="M10 22h28"/><path d="M19 22c0-4 2.2-8 5-8s5 4 5 8"/><circle cx="24" cy="10" r="1.6"/>',
};

export function icon(name, { className = 'icon', label } = {}) {
  const a11y = label ? `role="img" aria-label="${escapeHtml(label)}"` : 'aria-hidden="true" focusable="false"';
  return raw(
    `<svg class="${className}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${UI[name]}</svg>`,
  );
}

export function craftIcon(name) {
  return raw(
    `<svg class="ph__icon" viewBox="0 0 48 48" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${CRAFT[name] ?? CRAFT.gift}</svg>`,
  );
}
