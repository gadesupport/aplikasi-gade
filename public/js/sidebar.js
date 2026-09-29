/**
 * Aplikasi Gade - Sidebar & Topbar Component Generator
 * Lightweight, zero-dependency, automated layout injection
 */

(function () {
  const MENU_GROUPS = [
    {
      title: 'Data Utama',
      items: [
        { path: '/lokasi.html', name: 'Menu Lokasi', icon: '📍' },
        { path: '/bidang-tanah.html', name: 'Bidang Tanah', icon: '🏞️' },
        { path: '/pihak.html', name: 'Pihak / Pemilik', icon: '👥' },
      ],
    },
    {
      title: 'Operasional & GIS',
      items: [
        { path: '/survey.html', name: 'Data Survey', icon: '📋' },
        { path: '/pembahasan.html', name: 'Pembahasan', icon: '🤝' },
        { path: '/pemetaan.html', name: 'Pemetaan GIS', icon: '🗺️' },
        { path: '/project.html', name: 'Project Lahan', icon: '🏗️' },
      ],
    },
    {
      title: 'Legalitas & Keuangan',
      items: [
        { path: '/legalitas.html', name: 'Legalitas Tanah', icon: '⚖️' },
        { path: '/pembebasan.html', name: 'Pembebasan', icon: '💰' },
        { path: '/arsip-legal.html', name: 'Arsip Legal', icon: '📂' },
        { path: '/bast.html', name: 'BAST Berkas', icon: '📑' },
      ],
    },
    {
      title: 'Output & Dokumen',
      items: [
        { path: '/laporan.html', name: 'Laporan & Rekap', icon: '📊' },
        { path: '/generate-dokumen.html', name: 'Generate Dokumen', icon: '📄' },
      ],
    },
    {
      title: 'Sistem & Pengaturan',
      items: [
        { path: '/audit-log.html', name: 'Audit Log', icon: '📜' },
        { path: '/pengaturan.html', name: 'Pengaturan & User', icon: '⚙️' },
        { path: '/swagger', name: 'API Docs', icon: '📖', target: '_blank' },
      ],
    },
  ];

  function initSidebar() {
    const currentPath = window.location.pathname.toLowerCase() || '/lokasi.html';

    // Find current active item title
    let currentPageTitle = 'Dashboard Lahan';
    MENU_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        if (currentPath.endsWith(item.path.toLowerCase()) || (currentPath === '/' && item.path === '/lokasi.html')) {
          currentPageTitle = item.name;
        }
      });
    });

    // 1. Harvest any action buttons from the legacy top nav before hiding it
    const legacyNav = document.querySelector('header .nav-links');
    const actionButtons = [];
    if (legacyNav) {
      const buttons = legacyNav.querySelectorAll('button');
      buttons.forEach((btn) => {
        actionButtons.push(btn);
      });
    }

    // Hide or tag old legacy header
    const oldHeader = document.querySelector('body > header');
    if (oldHeader) {
      oldHeader.classList.add('legacy-header');
      oldHeader.style.display = 'none';
    }

    // 2. Build Sidebar DOM
    const sidebar = document.createElement('aside');
    sidebar.className = 'app-sidebar';
    sidebar.id = 'appSidebar';

    let menuHtml = '';
    MENU_GROUPS.forEach((group) => {
      menuHtml += `<div class="sidebar-group">
        <div class="sidebar-group-title">${group.title}</div>`;
      group.items.forEach((item) => {
        const isActive =
          currentPath.endsWith(item.path.toLowerCase()) ||
          (currentPath === '/' && item.path === '/lokasi.html');
        menuHtml += `
          <a href="${item.path}" class="sidebar-link ${isActive ? 'active' : ''}" ${item.target ? `target="${item.target}"` : ''}>
            <span class="sidebar-link-icon">${item.icon}</span>
            <span>${item.name}</span>
          </a>
        `;
      });
      menuHtml += `</div>`;
    });

    sidebar.innerHTML = `
      <a href="/lokasi.html" class="sidebar-brand">
        <div class="sidebar-logo">G</div>
        <div class="sidebar-brand-text">
          <span class="sidebar-brand-title">Aplikasi Gade</span>
          <span class="sidebar-brand-sub">Land Management</span>
        </div>
      </a>
      <div class="sidebar-menu">
        ${menuHtml}
      </div>
      <div class="sidebar-footer">
        <img id="sidebarUserAvatar" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="Avatar" class="sidebar-user-avatar">
        <div class="sidebar-user-meta">
          <div id="sidebarUserName" class="sidebar-user-name">Super Admin</div>
          <div class="sidebar-user-status">
            <span class="status-dot"></span> Online
          </div>
        </div>
      </div>
    `;

    // 3. Build Backdrop for Mobile
    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    backdrop.id = 'sidebarBackdrop';
    backdrop.onclick = () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('active');
    };

    // 4. Build Topbar DOM
    const topbar = document.createElement('header');
    topbar.className = 'app-topbar';
    topbar.innerHTML = `
      <div class="topbar-left">
        <button class="topbar-toggle-btn" id="btnToggleSidebar" aria-label="Toggle Menu">☰</button>
        <div class="topbar-breadcrumb">
          <span class="crumb-root">Sistem Gade</span>
          <span class="crumb-sep">/</span>
          <span class="crumb-current">${currentPageTitle}</span>
        </div>
      </div>
      <div class="topbar-right">
        <span class="system-badge-online">● Online</span>
        <div class="topbar-actions" id="topbarActionSlot"></div>
        <a href="/pengaturan.html" class="nav-btn nav-btn-secondary" style="padding: 0.35rem 0.65rem; border-radius: 8px; font-size: 0.8rem; text-decoration: none; color: #475569;" title="Pengaturan Akun">
          ⚙️
        </a>
      </div>
    `;

    // 5. Wrap main content inside .app-main
    let mainContainer = document.querySelector('.container') || document.querySelector('.main-container');
    const appMain = document.createElement('main');
    appMain.className = 'app-main';

    // Insert sidebar, backdrop, topbar, and main at top of body
    document.body.prepend(backdrop);
    document.body.prepend(topbar);
    document.body.prepend(sidebar);

    // If mainContainer exists, move it and any subsequent siblings (modals, scripts) into appMain
    if (mainContainer) {
      const parent = mainContainer.parentNode;
      parent.insertBefore(appMain, mainContainer);
      appMain.appendChild(mainContainer);
    }

    // 6. Move harvested action buttons into topbarActionSlot
    const actionSlot = topbar.querySelector('#topbarActionSlot');
    actionButtons.forEach((btn) => {
      // Style button nicely for topbar
      btn.style.margin = '0';
      btn.style.fontSize = '0.8rem';
      btn.style.padding = '0.35rem 0.8rem';
      btn.style.borderRadius = '6px';
      actionSlot.appendChild(btn);
    });

    // 7. Hamburger toggle handler
    const toggleBtn = topbar.querySelector('#btnToggleSidebar');
    if (toggleBtn) {
      toggleBtn.onclick = () => {
        sidebar.classList.toggle('open');
        backdrop.classList.toggle('active');
      };
    }

    // 8. Fetch active profile data dynamically for sidebar footer
    fetch('/api/profile')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          const u = json.data;
          const nameEl = document.getElementById('sidebarUserName');
          const avatarEl = document.getElementById('sidebarUserAvatar');
          if (nameEl && u.name) nameEl.textContent = u.name;
          if (avatarEl && u.avatar) avatarEl.src = u.avatar;
        }
      })
      .catch(() => {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSidebar);
  } else {
    initSidebar();
  }
})();
