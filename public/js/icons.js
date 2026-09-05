/** Arayuz ikonlari - tek satirlik inline SVG'ler (harici ikon paketi yok). */
const P = 'stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"';

export const ICONS = {
  home: `<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" ${P}/>`,
  search: `<circle cx="11" cy="11" r="7" ${P}/><path d="m20 20-3.6-3.6" ${P}/>`,
  trophy: `<path d="M7 4h10v5a5 5 0 0 1-10 0z" ${P}/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3M9 20h6M12 14v6" ${P}/>`,
  user: `<circle cx="12" cy="8" r="4" ${P}/><path d="M4 21a8 8 0 0 1 16 0" ${P}/>`,
  spin: `<path d="M21 12a9 9 0 1 1-3-6.7" ${P}/><path d="M21 4v5h-5" ${P}/>`,
  flame: `<path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s1 2 2 2 0-5 2-8z" ${P}/>`,
  sparkle: `<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" ${P}/><path d="M18 16.5 18.8 19 21 19.8 18.8 20.6 18 23l-.8-2.4L15 19.8l2.2-.8z" ${P}/>`,
  reels: `<rect x="2.5" y="6" width="19" height="12" rx="2" ${P}/><path d="M9 6v12M15 6v12" ${P}/>`,
  cards: `<rect x="3" y="5" width="11" height="15" rx="2" transform="rotate(-8 8.5 12.5)" ${P}/><rect x="10" y="4" width="11" height="15" rx="2" transform="rotate(8 15.5 11.5)" ${P}/>`,
  wheel: `<circle cx="12" cy="12" r="9" ${P}/><circle cx="12" cy="12" r="2.5" ${P}/><path d="M12 3v6M12 15v6M3 12h6M15 12h6" ${P}/>`,
  gift: `<rect x="3" y="8" width="18" height="13" rx="2" ${P}/><path d="M2 8h20M12 8v13" ${P}/><path d="M12 8S10 3 7.5 3a2.5 2.5 0 0 0 0 5M12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" ${P}/>`,
  crown: `<path d="M3 17 4.5 7l4.5 4L12 5l3 6 4.5-4L21 17z" ${P}/><path d="M3 20h18" ${P}/>`,
  bolt: `<path d="M13 2 4 14h6l-1 8 9-12h-6z" ${P}/>`,
  heart: `<path d="M12 20s-7-4.4-7-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7 2.6c0 5-7 9.4-7 9.4z" ${P}/>`,
  star: `<path d="m12 3 2.7 5.9 6.3.7-4.7 4.3 1.3 6.1-5.6-3.2-5.6 3.2 1.3-6.1L3 9.6l6.3-.7z" ${P}/>`,
  coin: `<ellipse cx="12" cy="12" rx="9" ry="9" ${P}/><path d="M12 7v10M9.5 9.5h5M9.5 14.5h5" ${P}/>`,
  calendar: `<rect x="3" y="5" width="18" height="16" rx="2" ${P}/><path d="M3 10h18M8 3v4M16 3v4" ${P}/>`,
  compass: `<circle cx="12" cy="12" r="9" ${P}/><path d="m15 9-2 5-5 2 2-5z" ${P}/>`,
  flag: `<path d="M5 21V4M5 5h11l-1.5 3.5L16 12H5" ${P}/>`,
  menu: `<path d="M4 7h16M4 12h16M4 17h16" ${P}/>`,
  close: `<path d="m6 6 12 12M18 6 6 18" ${P}/>`,
  chevron: `<path d="m9 5 7 7-7 7" ${P}/>`,
  back: `<path d="m15 5-7 7 7 7" ${P}/>`,
  logout: `<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" ${P}/>`,
  shield: `<path d="M12 3 5 6v6c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6z" ${P}/><path d="m9 12 2 2 4-4" ${P}/>`,
  info: `<circle cx="12" cy="12" r="9" ${P}/><path d="M12 11v5M12 8h.01" ${P}/>`,
  check: `<path d="m5 13 4 4L19 7" ${P}/>`,
  lock: `<rect x="4" y="10" width="16" height="11" rx="2" ${P}/><path d="M8 10V7a4 4 0 0 1 8 0v3" ${P}/>`
};

export function icon(name, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.star}</svg>`;
}
