// script.js

let uiTranslations = {};

document.addEventListener("DOMContentLoaded", async () => {
  await loadTranslations();
  loadContent();
  setupNavigation();
  setupTimelineCollapse();
  setYear();
});

// --- Načtení překladů ---
async function loadTranslations() {
  try {
    const res = await fetch("translations.json");
    if (!res.ok) throw new Error("Translations file not found");
    uiTranslations = await res.json();
  } catch (e) {
    console.error("Error loading translations:", e);
    uiTranslations = {};
  }
}

// --- Získání aktuálního jazyka ---
function getCurrentLang() {
  const params = new URLSearchParams(window.location.search);
  let lang = params.get("lang");
  if (!lang) {
    const browserLang = navigator.language.toLowerCase().substring(0, 2);
    lang = (browserLang === "cs" || browserLang === "cz") ? "cz" : (browserLang === "de" ? "de" : "en");
  }
  return lang;
}

// --- Načtení obsahu stránky ---
function loadContent() {
  const params = new URLSearchParams(window.location.search);
  const lang = getCurrentLang();
  const page = params.get("page") || "home";

  const langBtn = document.getElementById("currentLangBtn");
  if (langBtn) langBtn.textContent = lang.toUpperCase();

  applyTranslations(lang);
  notifyTimeline(lang);

  let file = `${lang}/${page}`;
  fetch(file)
    .then(r => { if (!r.ok) throw new Error(); return r.text(); })
    .catch(() => fetch(`${file}.html`).then(r => { if (!r.ok) throw new Error(); return r.text(); }))
    .then(html => { const c = document.getElementById("content"); if (c) {
    c.innerHTML = html;
    parseSourceLinks(c);  // ← přidej tento řádek
  } })
    .catch(() => { const c = document.getElementById("content"); if (c) c.innerHTML = "<h1>404 - Content not found</h1>"; });
    // Po nastavení jazyka a stránky:
const container = document.querySelector('.timeline-container');
if (container) {
  container.classList.toggle('timeline-expanded', page === 'home');
}

}

// --- Aplikace překladů ---
function applyTranslations(lang) {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (uiTranslations[lang]?.[key]) el.textContent = uiTranslations[lang][key];
  });
}

// --- Oznámení iframe o jazyku ---
function notifyTimeline(lang) {
  const frame = document.getElementById('timelineFrame');
  if (!frame) return;
  const msg = { type: 'setLanguage', lang: lang.toUpperCase() };
  try { frame.contentWindow.postMessage(msg, '*'); } catch(e) {}
  frame.addEventListener('load', function onLoad() {
    frame.contentWindow.postMessage(msg, '*');
    frame.removeEventListener('load', onLoad);
  });
}

// --- Navigace ---
function navigateTo(page) {
  const lang = getCurrentLang();
  window.location.search = `?lang=${lang}&page=${page}`;
}

// --- Přepínání jazyka ---
function switchLanguage(newLang) {
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page") || "home";
  window.location.search = `?lang=${newLang}&page=${page}`;
}

// --- Aktuální rok ---
function setYear() {
  const yearSpan = document.getElementById("currentYear");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

// --- Navigace a dropdowny ---
function setupNavigation() {
  const hamburger = document.getElementById("hamburgerBtn");
  const nav = document.getElementById("mainNav");
  const dropdowns = document.querySelectorAll(".dropdown");
  const isMobile = window.innerWidth <= 768;

  if (hamburger) {
    hamburger.addEventListener("click", () => nav.classList.toggle("active"));
  }

  dropdowns.forEach(btn => {
    const button = btn.querySelector(".dropbtn");
    const content = btn.querySelector(".dropdown-content");

    if (isMobile && btn.parentElement.id === "mainNav") {
      content.classList.add("show");
      button.classList.add("active");
    }

    button.addEventListener("click", e => {
      e.stopPropagation();
      if (!isMobile) {
        document.querySelectorAll(".dropdown-content").forEach(c => { if (c !== content) c.classList.remove("show"); });
        document.querySelectorAll(".dropbtn").forEach(b => { if (b !== button) b.classList.remove("active"); });
      }
      content.classList.toggle("show");
      button.classList.toggle("active");
    });
  });

  window.addEventListener("click", e => {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll(".dropdown-content").forEach(c => c.classList.remove("show"));
      document.querySelectorAll(".dropbtn").forEach(b => b.classList.remove("active"));
    }
  });
}

// --- Zprávy od iframu ---
let timelineAxisY = null;

window.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'timelineHeight') {
    const container = document.querySelector('.timeline-container');
    if (container) container.style.setProperty('--tl-expanded-h', event.data.height + 'px');
    timelineAxisY = event.data.axisY;
    applyCollapsedOffset();
  }

  if (event.data.type === 'navigate') {
    navigateTo(event.data.page);
  }
});

function applyCollapsedOffset() {
  const frame = document.getElementById('timelineFrame');
  const container = document.querySelector('.timeline-container');
  if (!frame || timelineAxisY === null) return;
  if (container?.classList.contains('timeline-expanded')) {
    frame.style.transform = 'translateY(0)'; // home — žádný posun
    return;
  }
  const COLLAPSED_H = 32;
  const offset = -(timelineAxisY - COLLAPSED_H / 2);
  frame.style.transform = `translateY(${offset}px)`;
}

// --- Timeline collapse ---
function setupTimelineCollapse() {
  const container = document.querySelector('.timeline-container');
  const frame = document.getElementById('timelineFrame');
  if (!container || !frame) return;

  container.addEventListener('mouseenter', () => {
    if (container.classList.contains('timeline-expanded')) return; // home — ignoruj
    frame.style.transition = 'transform 0.4s cubic-bezier(0.4,0,0.2,1)';
    frame.style.transform = 'translateY(0)';
    try { frame.contentWindow.postMessage({ type: 'setCollapsed', value: false }, '*'); } catch(e) {}
  });

  container.addEventListener('mouseleave', () => {
    if (container.classList.contains('timeline-expanded')) return; // home — ignoruj
    frame.style.transition = 'transform 0.4s cubic-bezier(0.4,0,0.2,1)';
    applyCollapsedOffset();
    try { frame.contentWindow.postMessage({ type: 'setCollapsed', value: true }, '*'); } catch(e) {}
  });
}

// --- Globální přístup pro onclick v HTML ---
window.navigateTo = navigateTo;
window.switchLanguage = switchLanguage;

function parseSourceLinks(container) {
  if (!container) return;

  let linkCounter = 0;
  const footnotes = [];

  // Projdi všechny textové uzly
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach(node => {
    const text = node.textContent;
    const regex = /(https?:\/\/\S+)\s+\[([^\]]+)\]/g;
    let match;
    let lastIndex = 0;
    const parts = [];

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(document.createTextNode(text.slice(lastIndex, match.index)));
      linkCounter++;
      const url = match[1];
      const label = match[2];
      footnotes.push({ n: linkCounter, url, label });

      const sup = document.createElement('sup');
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.title = label;
      a.className = 'source-link';
      a.textContent = linkCounter;
      sup.appendChild(a);
      parts.push(sup);
      lastIndex = match.index + match[0].length;
    }

    if (parts.length > 0) {
      if (lastIndex < text.length) parts.push(document.createTextNode(text.slice(lastIndex)));
      const frag = document.createDocumentFragment();
      parts.forEach(p => frag.appendChild(p));
      node.parentNode.replaceChild(frag, node);
    }
  });

  // Přidej seznam zdrojů na konec
  if (footnotes.length > 0) {
    const sourcesList = document.createElement('div');
    sourcesList.className = 'sources-list';
    const title = document.createElement('div');
    title.className = 'sources-title';
    title.textContent = 'Zdroje';
    sourcesList.appendChild(title);
    footnotes.forEach(f => {
      const item = document.createElement('div');
      item.className = 'sources-item';
      item.innerHTML = `<span class="sources-n">${f.n}</span><a href="${f.url}" target="_blank">${f.label}</a>`;
      sourcesList.appendChild(item);
    });
    container.appendChild(sourcesList);
  }
}