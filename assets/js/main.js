/**
 * Kaveh Eskandari - Academic Portfolio Interactive Logic
 * Features:
 * - Dynamic single-page tab transitions (Overview, About, News, Publications, Service)
 * - Smooth fade transitions without page reload
 * - Dark/Light mode theme toggle with localStorage persistence
 * - URL Hash routing (#publications, #news, etc.) with browser back/forward support
 * - Expandable BibTeX drawers with 1-click copy to clipboard
 * - In-page anchor click interception for smooth tab switching
 */

(function() {
  'use strict';

  // 1. Theme Management
  const THEME_KEY = 'kaveh-site-theme';
  
  function getPreferredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    updateThemeToggleBtn(theme);
  }

  function updateThemeToggleBtn(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    const isDark = theme === 'dark';
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    const icon = btn.querySelector('.theme-icon');
    if (icon) {
      icon.innerHTML = isDark 
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
  }

  function initTheme() {
    const theme = getPreferredTheme();
    applyTheme(theme);

    const btn = document.getElementById('theme-toggle-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
      });
    }

    // Listen for OS theme changes if user hasn't explicitly set one
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(THEME_KEY)) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  // 2. Section Segmentation from Markdown
  let registeredSections = [];

  function segmentMarkdownContent() {
    const container = document.getElementById('markdown-content');
    if (!container) return;

    // Collect all direct child elements
    const children = Array.from(container.children);
    if (children.length === 0) return;

    // Find all h2 elements
    const h2Elements = children.filter(el => el.tagName === 'H2');
    if (h2Elements.length === 0) return;

    registeredSections = [];

    // About section (everything before the first H2)
    const firstH2Index = children.indexOf(h2Elements[0]);
    if (firstH2Index > 0) {
      const aboutDiv = document.createElement('section');
      aboutDiv.className = 'content-section tab-pane';
      aboutDiv.id = 'section-about';
      aboutDiv.setAttribute('data-tab', 'about');

      const aboutHeading = document.createElement('h2');
      aboutHeading.className = 'section-title';
      aboutHeading.textContent = 'About Me';
      aboutDiv.appendChild(aboutHeading);

      for (let i = 0; i < firstH2Index; i++) {
        aboutDiv.appendChild(children[i]);
      }
      registeredSections.push({ id: 'about', label: 'About', el: aboutDiv });
    }

    // Process each H2 and its subsequent elements until the next H2
    for (let i = 0; i < h2Elements.length; i++) {
      const h2 = h2Elements[i];
      const startIdx = children.indexOf(h2);
      const nextH2 = h2Elements[i + 1];
      const endIdx = nextH2 ? children.indexOf(nextH2) : children.length;

      const rawTitle = h2.textContent.trim();
      let tabId = rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (tabId.includes('news')) tabId = 'news';
      else if (tabId.includes('publi')) tabId = 'publications';
      else if (tabId.includes('service') || tabId.includes('review')) tabId = 'service';

      const secDiv = document.createElement('section');
      secDiv.className = 'content-section tab-pane';
      secDiv.id = `section-${tabId}`;
      secDiv.setAttribute('data-tab', tabId);

      h2.className = 'section-title';
      secDiv.appendChild(h2);

      for (let j = startIdx + 1; j < endIdx; j++) {
        secDiv.appendChild(children[j]);
      }

      registeredSections.push({ id: tabId, label: rawTitle, el: secDiv });
    }

    // Clear and re-append segmented sections
    container.innerHTML = '';
    registeredSections.forEach(sec => container.appendChild(sec.el));

    // Render navigation tabs
    buildNavigationTabs(registeredSections);
  }

  // 3. Navigation Tabs & Smooth In-Page Switching
  function buildNavigationTabs(sections) {
    const navContainer = document.getElementById('section-tabs');
    if (!navContainer) return;

    navContainer.innerHTML = '';

    // 'Overview' tab to view everything
    const allBtn = document.createElement('button');
    allBtn.type = 'button';
    allBtn.className = 'tab-btn';
    allBtn.setAttribute('data-target', 'all');
    allBtn.innerHTML = '<span class="tab-text">Overview</span>';
    navContainer.appendChild(allBtn);

    // Add buttons for each section
    sections.forEach(sec => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tab-btn';
      btn.setAttribute('data-target', sec.id);
      btn.innerHTML = `<span class="tab-text">${sec.label}</span>`;
      navContainer.appendChild(btn);
    });

    // Attach click handlers to tabs
    navContainer.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const target = btn.getAttribute('data-target');
        switchTab(target, true);
      });
    });

    // Determine initial tab from URL hash (defaults to 'about')
    let initialTab = 'about';
    const hash = window.location.hash.replace('#', '').toLowerCase();
    if (hash) {
      if (hash === 'all' || hash === 'overview') {
        initialTab = 'all';
      } else if (sections.some(s => s.id === hash)) {
        initialTab = hash;
      }
    }
    switchTab(initialTab, false);
  }

  function switchTab(tabId, updateHash = true) {
    const normalizedTab = (tabId === 'overview') ? 'all' : tabId;
    const navContainer = document.getElementById('section-tabs');
    const sections = document.querySelectorAll('.content-section');
    if (!sections.length) return;

    // Update active tab button
    if (navContainer) {
      navContainer.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.getAttribute('data-target') === normalizedTab) {
          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-selected', 'false');
        }
      });
    }

    // Toggle visibility with smooth animation
    sections.forEach(sec => {
      if (normalizedTab === 'all' || sec.getAttribute('data-tab') === normalizedTab) {
        sec.style.display = 'block';
        sec.classList.remove('tab-fade-in');
        // Trigger reflow for transition restart
        void sec.offsetWidth;
        sec.classList.add('tab-fade-in');
      } else {
        sec.style.display = 'none';
        sec.classList.remove('tab-fade-in');
      }
    });

    // Update URL hash without page jump
    if (updateHash) {
      const newHash = normalizedTab === 'all' ? '#overview' : `#${normalizedTab}`;
      if (window.location.hash !== newHash) {
        history.pushState(null, '', newHash);
      }
      // Smoothly scroll back to top of content area on navigation
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    const hash = window.location.hash.replace('#', '').toLowerCase() || 'about';
    switchTab(hash, false);
  });

  // Handle internal anchor links (e.g. href="#publications")
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (link) {
      const targetHash = link.getAttribute('href').replace('#', '').toLowerCase();
      if (targetHash === 'all' || targetHash === 'overview' || registeredSections.some(s => s.id === targetHash)) {
        e.preventDefault();
        switchTab(targetHash, true);
      }
    }
  });

  // 4. BibTeX Interactive Drawer & Clipboard Copy
  function initBibtexButtons() {
    document.addEventListener('click', (e) => {
      // Toggle button
      const toggleBtn = e.target.closest('.bibtex-btn');
      if (toggleBtn) {
        e.preventDefault();
        const targetId = toggleBtn.getAttribute('data-bibtex');
        const block = document.getElementById(`bibtex-${targetId}`);
        if (block) {
          const isOpen = block.classList.contains('open');
          block.classList.toggle('open', !isOpen);
          toggleBtn.classList.toggle('active', !isOpen);
        }
        return;
      }

      // Copy button
      const copyBtn = e.target.closest('.copy-bibtex-btn');
      if (copyBtn) {
        e.preventDefault();
        const targetId = copyBtn.getAttribute('data-target');
        const codeEl = document.querySelector(`#bibtex-${targetId} code`);
        if (codeEl) {
          const text = codeEl.textContent.trim();
          navigator.clipboard.writeText(text).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied! ✓';
            copyBtn.classList.add('copied');
            setTimeout(() => {
              copyBtn.textContent = originalText;
              copyBtn.classList.remove('copied');
            }, 2000);
          }).catch(err => {
            console.error('Clipboard copy failed:', err);
          });
        }
      }
    });
  }

  // Initialize all on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    segmentMarkdownContent();
    initBibtexButtons();
  });
})();
