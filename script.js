// script.js

let uiTranslations = {};

document.addEventListener("DOMContentLoaded", async () => {
  await loadTranslations();
  loadContent();
  setupNavigation();
  setupTimelineCollapse();
  setYear();
    await loadCursors();          // ← přidat
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
    .then(html => { 
      const c = document.getElementById("content"); 
      const tc = document.getElementById("top-content");
      if (c) {
        c.innerHTML = html;
        
        if (tc) {
          tc.innerHTML = "";
          if (page === "home") {
            tc.style.display = "block";
            tc.style.maxWidth = "1000px";
            tc.style.margin = "40px auto 20px auto";
            tc.style.padding = "0 20px";
            c.style.marginTop = "20px";
            
            const h2s = c.querySelectorAll("h2");
            // Najde druhý nadpis H2 ("About the Website") a vše nad ním přesune nahoru
            const stopNode = h2s.length > 1 ? h2s[1] : null;
            if (stopNode) {
              while (c.firstChild && c.firstChild !== stopNode) {
                tc.appendChild(c.firstChild);
              }
            }
            parseSourceLinks(tc);
          } else {
            tc.style.display = "none";
            c.style.marginTop = "40px";
          }
        }
        
        parseSourceLinks(c);
      } 
    })
    .catch(() => { 
      const c = document.getElementById("content"); 
      const tc = document.getElementById("top-content");
      if (tc) tc.style.display = "none";
      if (c) {
        c.innerHTML = "<h1>404 - Content not found</h1>"; 
        c.style.marginTop = "40px";
      }
    });

  // Po nastavení jazyka a stránky:
  const container = document.querySelector('.timeline-container');
  if (container) {
    const isHome = (page === 'home');
    container.classList.toggle('timeline-expanded', isHome);

    const frame = document.getElementById('timelineFrame');
    if (frame) {
      const setFrameMode = () => {
        try {
          if (frame.contentDocument?.body) {
            frame.contentDocument.body.classList.toggle('home-mode', isHome);
          }
        } catch(e) {}
      };
      setFrameMode();
      frame.addEventListener('load', setFrameMode, { once: true });
    }
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
// --- Navigace a dropdowny ---
function setupNavigation() {
  const hamburger = document.getElementById("hamburgerBtn");
  const nav = document.getElementById("mainNav");
  // Vynechej cursor-switch z dropdownů!
  const dropdowns = document.querySelectorAll("#mainNav .dropdown, .lang-switch .dropdown");
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
    if (!e.target.closest('.dropdown') && !e.target.closest('.cursor-switch')) {
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
    const lang = getCurrentLang();
    title.textContent = uiTranslations[lang]?.['sources'] || 'Sources';
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

function loadImageFromFile(){
  let fileInput = document.getElementById("file");
  let files = fileInput.files;
  if (files.length == 0) {
    return;
  }
  let file = files[0];
  fileReader = new FileReader();
  fileReader.onload = function(e){
    document.getElementById("image").src = e.target.result;
    document.getElementById("imageHidden").src = e.target.result;
  };
  fileReader.onerror = function () {
    console.warn('oops, something went wrong.');
  };
  fileReader.readAsDataURL(file);
}
// --- Kurzory ---
async function loadCursors() {
    const menu = document.getElementById("cursorMenu");
    if (!menu) return;

    try {
        const response = await fetch("./cursors.json");
        if (!response.ok) throw new Error("Nelze načíst cursors.json");
        const cursors = await response.json();

        menu.innerHTML = "";

        // Přidej výchozí systémový kurzor
        const defaultButton = document.createElement("button");
        defaultButton.className = "cursor-option";
        defaultButton.onclick = () => selectCursor("default");

        const defaultIcon = document.createElement("span");
        defaultIcon.className = "material-symbols-outlined";
        defaultIcon.textContent = "arrow_selector_tool";
        defaultIcon.style.width = "32px";
        defaultIcon.style.height = "32px";
        defaultIcon.style.display = "inline-flex";
        defaultIcon.style.alignItems = "center";
        defaultIcon.style.justifyContent = "center";

        const defaultLabel = document.createElement("span");
        const lang = getCurrentLang();
        defaultLabel.textContent = uiTranslations[lang]?.['default'] || 'Default cursor';

        defaultButton.appendChild(defaultIcon);
        defaultButton.appendChild(defaultLabel);
        menu.appendChild(defaultButton);

        cursors.forEach(folderName => {
            const button = document.createElement("button");
            button.className = "cursor-option";
            button.onclick = () => selectCursor(folderName);

            const img = document.createElement("img");
            img.src = `./cursor/${folderName}/head.png`;
            img.alt = folderName;
            img.className = "cursor-icon";

            const label = document.createElement("span");
            label.textContent = folderName;

            button.appendChild(img);
            button.appendChild(label);
            menu.appendChild(button);
        });

        // Obnov uložený kurzor
        const saved = localStorage.getItem("selectedCursor");
        const defaultCursor = "Tomáš Garrigue Masaryk";
        const toApply = (saved && (saved === "default" || cursors.includes(saved))) ? saved : defaultCursor;

        if (!saved) localStorage.setItem("selectedCursor", defaultCursor);

        // Počkej až se iframe načte, pak teprve nastav kurzory
        const frame = document.getElementById("timelineFrame");
        if (frame) {
            frame.addEventListener("load", () => applyCursor(toApply), { once: true });
        }
        applyCursor(toApply); // nastav i hlavní stránku hned

    } catch (error) {
        console.error("Nepodařilo se načíst kurzory:", error);
        menu.innerHTML = "<p style='color:white;padding:8px'>Chyba načítání</p>";
    }
}

function selectCursor(folderName) {
    document.getElementById("cursorMenu").classList.remove("show");
    localStorage.setItem("selectedCursor", folderName);
    applyCursor(folderName);
}

function applyCursor(folderName) {
    // Speciální případ: výchozí systémový kurzor
    if (folderName === "default") {
        document.body.style.cursor = "auto";

        function applyToFrame() {
            const frame = document.getElementById("timelineFrame");
            if (!frame?.contentDocument?.body) return;

            frame.contentDocument.body.style.cursor = "auto";

            const tlWrap = frame.contentDocument.querySelector(".tl-wrap");
            if (tlWrap) {
                tlWrap.style.cursor = "pointer";
            }
        }

        applyToFrame();

        const frame = document.getElementById("timelineFrame");
        if (frame) {
            frame.addEventListener("load", applyToFrame, { once: true });
        }

        setTimeout(applyToFrame, 500);
        return;
    }

    const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
    const cursorUrl = `${base}cursor/${folderName}/cursor.png`;
    const mgUrl = `${base}cursor/${folderName}/magnifying_glass.png`;

    // Hlavní kurzor
    document.body.style.cursor = `url('${cursorUrl}') 0 0, auto`;

    // Nastav do iframu – s retrym pokud ještě není připravený
    function applyToFrame() {
        const frame = document.getElementById("timelineFrame");
        if (!frame?.contentDocument?.body) return;

        frame.contentDocument.body.style.cursor = `url('${cursorUrl}') 0 0, auto`;

        const tlWrap = frame.contentDocument.querySelector(".tl-wrap");
        if (tlWrap) {
            tlWrap.style.cursor = `url('${mgUrl}') 20 22, pointer`;
        }
    }

    applyToFrame();

    // Pokud iframe ještě není ready, zkus znovu po načtení
    const frame = document.getElementById("timelineFrame");
    if (frame) {
        frame.addEventListener("load", applyToFrame, { once: true });
    }

    // Záloha – zkus znovu za 500ms
    setTimeout(applyToFrame, 500);
}

function toggleCursorMenu(e) {
    e.stopPropagation();
    document.getElementById("cursorMenu").classList.toggle("show");
}

window.toggleCursorMenu = toggleCursorMenu;