/**
 * Official Explorer Profile System - Dynamic Multi-User Support
 * Ensures every reviewer, team member, and user has their OWN unique name, photo, and official designation.
 * Full-screen & Red-White brand aesthetic.
 */
(function () {
  'use strict';

  // Global capture click listener: Intercepts all profile avatar clicks across navbars & menus
  document.addEventListener('click', function (e) {
    const trigger = e.target.closest('#nav-user-profile-anchor, #user-button, #we-unified-user-avatar, .we-user-avatar-btn, .cl-userButtonTrigger, .cl-userButtonBox, [data-clerk-user-button], [data-localization-key*="userButton"], #menu-explorer-profile, .mob-avatar-wrap');
    if (trigger) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (window.ExplorerProfile && typeof window.ExplorerProfile.open === 'function') {
        window.ExplorerProfile.open();
      }
    }
  }, true);

  const MY_PROFILE_KEY = 'we_my_profile_v3';

  // Helper: Read session from localStorage if authenticated
  function getStoredSession() {
    try {
      const raw = localStorage.getItem('we_auth_session');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.authenticated === true) return parsed;
    } catch (e) {}
    return null;
  }

  // Get current user's own profile state
  function getMyProfileState() {
    try {
      const raw = localStorage.getItem(MY_PROFILE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    const session = getStoredSession();
    let name = (session && session.name) || 'Gautam N';
    let handle = (session && session.username) || 'gautam_n';
    let avatar = (session && session.imageUrl)
      ? `<img src="${session.imageUrl}" class="exp-avatar-img" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      : `<img src="assets/team/gowtham_badge.png" class="exp-avatar-img" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;

    if (window.Clerk && window.Clerk.user) {
      name = window.Clerk.user.fullName || window.Clerk.user.firstName || name;
      handle = window.Clerk.user.username || (name.toLowerCase().replace(/[^a-z0-9_]/g, '_'));
      if (window.Clerk.user.imageUrl) {
        avatar = `<img src="${window.Clerk.user.imageUrl}" class="exp-avatar-img" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      }
    }

    return {
      name: name,
      handle: handle,
      role: 'Founder & Lead Developer • Weekend Explore Official',
      avatar: avatar,
      region: 'Karnataka, India',
      status: 'Active & Verified',
      isSelf: true
    };
  }

  function saveMyProfileState(s) {
    try {
      localStorage.setItem(MY_PROFILE_KEY, JSON.stringify(s));
    } catch (e) {}
  }

  let myState = getMyProfileState();
  let currentViewingProfile = myState;

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
  }

  // Generate a distinct avatar image or colorful initial badge for each user
  function getAvatarForUser(name, customImg) {
    if (customImg) {
      return `<img src="${customImg}" class="exp-avatar-img" alt="${escapeHtml(name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
    const clean = (name || '').trim().toLowerCase();
    if (clean.includes('divya')) {
      return `<img src="assets/team/divya_badge.png" class="exp-avatar-img" alt="Divya Shettar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
    if (clean.includes('gowtham') || clean.includes('gautam')) {
      return `<img src="assets/team/gowtham_badge.png" class="exp-avatar-img" alt="Gautam N" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }
    if (clean.includes('deekshith') || clean.includes('deekishth')) {
      return `<img src="assets/team/deekishth_badge.png" class="exp-avatar-img" alt="Deekshith KR" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }

    // Deterministic colorful avatar gradients based on name
    const palettes = [
      { bg: 'linear-gradient(135deg, #bd232f 0%, #e11d48 100%)', text: '#ffffff' }, // Crimson
      { bg: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)', text: '#ffffff' }, // Blue
      { bg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)', text: '#ffffff' }, // Emerald
      { bg: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)', text: '#ffffff' }, // Purple
      { bg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)', text: '#ffffff' }, // Amber
      { bg: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)', text: '#ffffff' }, // Cyan
      { bg: 'linear-gradient(135deg, #db2777 0%, #ec4899 100%)', text: '#ffffff' }, // Pink
      { bg: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', text: '#ffffff' }  // Indigo
    ];
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
      hash = (hash << 5) - hash + clean.charCodeAt(i);
      hash |= 0;
    }
    const palette = palettes[Math.abs(hash) % palettes.length];
    const initial = (name || 'E').trim().charAt(0).toUpperCase();

    return `<div style="width:100%;height:100%;border-radius:50%;background:${palette.bg};color:${palette.text};display:flex;align-items:center;justify-content:center;font-size:3.2rem;font-weight:800;font-family:'Outfit',sans-serif;box-shadow:inset 0 2px 4px rgba(255,255,255,0.3);">${initial}</div>`;
  }

  // Get distinct role for user
  function getRoleForUser(name, customRole) {
    if (customRole) return customRole;
    const clean = (name || '').trim().toLowerCase();
    if (clean.includes('divya')) return 'Co-Founder • Weekend Explore Official';
    if (clean.includes('gowtham') || clean.includes('gautam')) return 'Founder & Lead Developer • Weekend Explore Official';
    if (clean.includes('deekshith') || clean.includes('deekishth')) return 'Co-Founder • Weekend Explore Official';
    return 'Verified Traveler & Reviewer';
  }

  // Render the Profile Modal DOM dynamically for the given user profile
  function renderProfileModal(profile) {
    let overlay = document.getElementById('exp-profile-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'exp-profile-overlay';
      overlay.className = 'exp-profile-overlay';
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          window.ExplorerProfile.close();
        }
      });
    }

    const isSelf = !!profile.isSelf;
    const titleText = isSelf ? 'My Official Profile' : `${escapeHtml(profile.name)}'s Profile`;

    overlay.innerHTML = `
      <div class="exp-profile-card exp-profile-fullscreen">
        <!-- Top App Bar -->
        <div class="exp-profile-topbar exp-official-topbar">
          <button type="button" class="exp-profile-back-btn" onclick="window.ExplorerProfile.close()" title="Return to Website">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          <div class="exp-official-title-wrap">
            <span class="exp-official-title">${titleText}</span>
            <span class="exp-official-badge-tag">Verified</span>
          </div>
          <button type="button" class="exp-profile-close-btn" onclick="window.ExplorerProfile.close()" title="Close Profile">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Fullscreen Scroll Body -->
        <div class="exp-profile-scroll-body exp-official-body">
          <!-- Official Profile Hero -->
          <div class="exp-official-hero">
            <div class="exp-official-avatar-ring" ${isSelf ? 'onclick="window.ExplorerProfile.promptAvatarChange()" title="Tap to change profile picture"' : ''}>
              <div class="exp-official-avatar-inner" id="exp-render-avatar">
                ${profile.avatar}
              </div>
              ${isSelf ? `
                <button type="button" class="exp-official-avatar-edit-badge" title="Upload new photo" onclick="window.ExplorerProfile.promptAvatarChange()">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                    <circle cx="12" cy="13" r="4"></circle>
                  </svg>
                </button>
              ` : ''}
            </div>

            <div class="exp-official-name-row">
              <h1 class="exp-official-name" id="exp-render-fullname">${escapeHtml(profile.name)}</h1>
              <span class="exp-verified-badge" title="Verified Official Profile">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#bd232f">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </span>
            </div>

            <div class="exp-official-handle" id="exp-render-handle">@${escapeHtml(profile.handle)}</div>
            <div class="exp-official-role-tag" id="exp-render-role">${escapeHtml(profile.role)}</div>
          </div>

          <!-- Official Account Information Card -->
          <div class="exp-official-card">
            <div class="exp-official-row">
              <span class="exp-official-label">Account Status</span>
              <span class="exp-official-val exp-val-active">
                <span class="exp-active-dot"></span> Active &amp; Verified
              </span>
            </div>
            <div class="exp-official-row">
              <span class="exp-official-label">Designation</span>
              <span class="exp-official-val" id="exp-render-designation">${escapeHtml(profile.role)}</span>
            </div>
            <div class="exp-official-row">
              <span class="exp-official-label">Region</span>
              <span class="exp-official-val">${escapeHtml(profile.region || 'Karnataka, India')}</span>
            </div>
            <div class="exp-official-row">
              <span class="exp-official-label">Platform</span>
              <span class="exp-official-val">Weekend Explorer</span>
            </div>
          </div>

          <!-- Actions -->
          ${isSelf ? `
            <div class="exp-official-actions">
              <button type="button" class="exp-official-btn-edit" onclick="window.ExplorerProfile.promptAvatarChange()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                <span>Change Photo</span>
              </button>
              <button type="button" class="exp-official-btn-secondary" onclick="window.ExplorerProfile.promptNameChange()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                <span>Edit Name</span>
              </button>
            </div>
          ` : `
            <div class="exp-official-actions">
              <button type="button" class="exp-official-btn-edit" style="background:#bd232f;width:100%;max-width:320px;" onclick="window.ExplorerProfile.close()">
                <span>✓ Verified Community Profile</span>
              </button>
            </div>
          `}

          <!-- Return Button -->
          <div style="margin-top: 24px; width: 100%; max-width: 440px;">
            <button type="button" class="exp-official-return-btn" onclick="window.ExplorerProfile.close()">
              ← Return to Website
            </button>
          </div>
        </div>
      </div>
      <input type="file" id="exp-avatar-file-input" accept="image/*" style="display:none" onchange="window.ExplorerProfile.handleAvatarUpload(event)">
    `;
  }

  // Exposed Global ExplorerProfile API
  window.ExplorerProfile = {
    open: function () {
      myState = getMyProfileState();
      myState.isSelf = true;
      currentViewingProfile = myState;
      renderProfileModal(currentViewingProfile);
      const overlay = document.getElementById('exp-profile-overlay');
      if (overlay) overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    },

    openForUser: function (userName, meta) {
      if (!userName || !userName.trim()) {
        this.open();
        return;
      }
      const trimmedName = userName.trim();
      const role = (meta && meta.role) || getRoleForUser(trimmedName, meta && meta.tag);
      const region = (meta && meta.location) || 'Karnataka, India';
      const handle = trimmedName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const avatar = (meta && meta.img) ? getAvatarForUser(trimmedName, meta.img) : getAvatarForUser(trimmedName);

      // Check if this user is actually the logged in self
      const isSelf = myState && myState.name && myState.name.toLowerCase() === trimmedName.toLowerCase();

      currentViewingProfile = {
        name: trimmedName,
        handle: handle,
        role: role,
        avatar: avatar,
        region: region,
        status: 'Active & Verified',
        isSelf: isSelf
      };

      renderProfileModal(currentViewingProfile);
      const overlay = document.getElementById('exp-profile-overlay');
      if (overlay) overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    },

    close: function () {
      const overlay = document.getElementById('exp-profile-overlay');
      if (overlay) overlay.classList.remove('open');
      document.body.style.overflow = '';
    },

    promptAvatarChange: function () {
      if (!currentViewingProfile || !currentViewingProfile.isSelf) return;
      const fileInp = document.getElementById('exp-avatar-file-input');
      if (fileInp) fileInp.click();
    },

    handleAvatarUpload: function (e) {
      const file = e.target && e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        myState.avatar = `<img src="${dataUrl}" class="exp-avatar-img" alt="${myState.name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        saveMyProfileState(myState);
        currentViewingProfile = myState;
        renderProfileModal(currentViewingProfile);

        // Update any avatar in navbar
        const navAvatars = document.querySelectorAll('.mob-avatar-wrap, #we-unified-user-avatar');
        navAvatars.forEach(el => {
          el.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${myState.name}">`;
        });
      };
      reader.readAsDataURL(file);
    },

    promptNameChange: function () {
      if (!currentViewingProfile || !currentViewingProfile.isSelf) return;
      const newName = prompt('Enter your official profile name:', myState.name);
      if (newName && newName.trim()) {
        myState.name = newName.trim();
        myState.handle = myState.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        saveMyProfileState(myState);
        currentViewingProfile = myState;
        renderProfileModal(currentViewingProfile);
      }
    },

    syncUI: function () {
      if (currentViewingProfile) renderProfileModal(currentViewingProfile);
    },

    // Compatibility stubs for other modules
    togglePrivacy: function () {},
    switchTab: function () {},
    openEditModal: function () { this.promptNameChange(); },
    openNewPostModal: function () { this.promptAvatarChange(); },
    promptAddPlace: function () {},
    addReachedPlace: function () {},
    closeSubmodal: function () {},
    closePostLightbox: function () {}
  };
})();
