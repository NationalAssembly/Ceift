document.addEventListener("DOMContentLoaded", () => {
  loadContent();
  setupNavigation();
  setYear();
});

const uiTranslations = {
  en: {
    germany: "GERMANY",
    czechoslovakia: "CZECHOSLOVAKIA",
    na: "National Assembly",
    weimar: "Weimar Republic",
    first_rep: "First Republic",
    code: "Code",
    content: "Content"
  },
  cz: {
    germany: "NĚMECKO",
    czechoslovakia: "ČESKOSLOVENSKO",
    na: "Národní shromáždění",
    weimar: "Výmarská republika",
    first_rep: "První republika",
    code: "Kód",
    content: "Obsah"
  },
  de: {
    germany: "DEUTSCHLAND",
    czechoslovakia: "TSCHECHOSLOWAKEI",
    na: "Nationalversammlung",
    weimar: "Weimarer Republik",
    first_rep: "Erste Republik",
    code: "Code",
    content: "Inhalt"
  }
};

function getCurrentLang() {
  const params = new URLSearchParams(window.location.search);
  let lang = params.get("lang");
  if (!lang) {
    const browserLang = navigator.language.toLowerCase().substring(0, 2);
    lang = (browserLang === "cs" || browserLang === "cz") ? "cz" : (browserLang === "de" ? "de" : "en");
  }
  return lang;
}

function loadContent() {
  const params = new URLSearchParams(window.location.search);
  const lang = getCurrentLang();
  const page = params.get("page") || "home";

  // Update language button text
  const langBtn = document.getElementById("currentLangBtn");
  if (langBtn) langBtn.textContent = lang.toUpperCase();

  // Apply static UI translations
  applyTranslations(lang);

  // Notify iframe (may already be loaded)
  notifyTimeline(lang);

  // Build file path
  const file = `${lang}/${page}`;

  fetch(file)
    .then((r) => {
      if (!r.ok) throw new Error("Page not found");
      return r.text();
    })
    .then((html) => {
      const c = document.getElementById("content");
      if (c) c.innerHTML = html;
    })
    .catch(() => {
      document.getElementById("content").innerHTML = "<h1>404 - Content not found</h1>";
    });
}

function applyTranslations(lang) {
  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (uiTranslations[lang] && uiTranslations[lang][key]) {
      el.textContent = uiTranslations[lang][key];
    }
  });
}

function notifyTimeline(lang) {
  const frame = document.getElementById('timelineFrame');
  if (!frame) return;

  // Iframe může ještě načítat — pošleme zprávu po onload i hned
  const msg = { type: 'setLanguage', lang: lang.toUpperCase() };
  try { frame.contentWindow.postMessage(msg, '*'); } catch(e) {}
  frame.addEventListener('load', function onLoad() {
    frame.contentWindow.postMessage(msg, '*');
    frame.removeEventListener('load', onLoad);
  });
}

function navigateTo(page) {
  const lang = getCurrentLang();
  window.location.search = `?lang=${lang}&page=${page}`;
}

function switchLanguage(newLang) {
  const params = new URLSearchParams(window.location.search);
  const page = params.get("page") || "home";
  // Změna URL přenačte stránku — loadContent() pak zavolá notifyTimeline()
  window.location.search = `?lang=${newLang}&page=${page}`;
}

function setYear() {
  const yearSpan = document.getElementById("currentYear");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();
}

function setupNavigation() {
  const hamburger = document.getElementById("hamburgerBtn");
  const nav = document.getElementById("mainNav");
  const dropdowns = document.querySelectorAll(".dropdown");
  const isMobile = window.innerWidth <= 768;

  if (hamburger) {
    hamburger.addEventListener("click", () => {
      nav.classList.toggle("active");
    });
  }

  dropdowns.forEach(btn => {
    const button = btn.querySelector(".dropbtn");
    const content = btn.querySelector(".dropdown-content");

    if (isMobile && btn.parentElement.id === "mainNav") {
      content.classList.add("show");
      button.classList.add("active");
    }

    button.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = content.classList.contains("show");

      if (!isMobile) {
        document.querySelectorAll(".dropdown-content").forEach(c => {
          if (c !== content) c.classList.remove("show");
        });
        document.querySelectorAll(".dropbtn").forEach(b => {
          if (b !== button) b.classList.remove("active");
        });
      }

      content.classList.toggle("show");
      button.classList.toggle("active");
    });
  });

  window.addEventListener("click", (e) => {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll(".dropdown-content").forEach(c => c.classList.remove("show"));
    }
  });

  window.addEventListener("message", function(event) {
  if (!event.data) return;

  if (event.data.type === "navigate") {
    navigateTo(event.data.page);
  }
});

}