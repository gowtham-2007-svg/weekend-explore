/**
 * Official Explorer Profile System - Dynamic Multi-User & Google Auth Sync Support
 * Ensures every authenticated Google user has their ACTUAL name, photo, and official designation.
 * Full-screen & Red-White brand aesthetic preserved.
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

  // Robust extraction of user's genuine name from Google / Clerk authentication
  function getGoogleAuthUserName(user) {
    if (typeof window.getGoogleAuthUserName === 'function') {
      const globalResolved = window.getGoogleAuthUserName(user);
      if (globalResolved) return globalResolved;
    }
    if (!user) return '';

    // 1. External Accounts: Look specifically for Google OAuth account
    if (Array.isArray(user.externalAccounts) && user.externalAccounts.length > 0) {
      const googleAcc = user.externalAccounts.find(acc =>
        acc && (
          acc.provider === 'google' ||
          acc.provider === 'oauth_google' ||
          (acc.verification && acc.verification.strategy && String(acc.verification.strategy).toLowerCase().includes('google'))
        )
      ) || user.externalAccounts[0];

      if (googleAcc) {
        const gDisplayName = (googleAcc.displayName || googleAcc.fullName || '').trim();
        if (gDisplayName && !gDisplayName.includes('@') && gDisplayName.toLowerCase() !== 'null' && gDisplayName.toLowerCase() !== 'undefined') {
          return gDisplayName;
        }
        const gFirst = (googleAcc.firstName || '').trim();
        const gLast = (googleAcc.lastName || '').trim();
        const gCombined = `${gFirst} ${gLast}`.trim();
        if (gCombined && gCombined.toLowerCase() !== 'null' && gCombined.toLowerCase() !== 'undefined') {
          return gCombined;
        }
        if (googleAcc.username && !googleAcc.username.includes('@') && googleAcc.username.toLowerCase() !== 'null') {
          return googleAcc.username.trim();
        }
      }
    }

    // 2. Direct Clerk fullName (First + Last)
    if (user.fullName && user.fullName.trim() && user.fullName.trim().toLowerCase() !== 'null' && user.fullName.trim().toLowerCase() !== 'undefined') {
      return user.fullName.trim();
    }

    // 3. Combined firstName + lastName
    const first = (user.firstName || '').trim();
    const last = (user.lastName || '').trim();
    const combined = `${first} ${last}`.trim();
    if (combined && combined.toLowerCase() !== 'null' && combined.toLowerCase() !== 'undefined') {
      return combined;
    }

    // 4. Single firstName
    if (first && first.toLowerCase() !== 'null' && first.toLowerCase() !== 'undefined') {
      return first;
    }

    // 5. Username
    if (user.username && user.username.trim() && user.username.trim().toLowerCase() !== 'null' && user.username.trim().toLowerCase() !== 'undefined') {
      return user.username.trim();
    }

    // 6. Clean name from email address (e.g. gowtham.ramesh@gmail.com -> Gowtham Ramesh)
    const email = (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress)
      || (user.emailAddresses && user.emailAddresses[0] ? user.emailAddresses[0].emailAddress : '');
    if (email && email.includes('@')) {
      const prefix = email.split('@')[0].replace(/[._+0-9]/g, ' ').trim();
      if (prefix) {
        const formatted = prefix.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        if (formatted) return formatted;
      }
    }

    return '';
  }

  // Database Sync Helper: Persists profile data to backend database (MongoDB Atlas, Supabase, Local DB)
  async function syncUserProfileToDatabase(profile) {
    if (!profile || !profile.userId) return;
    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:';
      const backendHost = isLocal ? 'http://localhost:3000' : '';
      fetch(backendHost + '/api/user/sync-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.userId,
          name: profile.name,
          email: profile.email || '',
          imageUrl: profile.imageUrl || '',
          handle: profile.handle || '',
          role: profile.role || '',
          region: profile.region || 'Karnataka, India',
          provider: 'google'
        })
      }).then(res => res.json()).then(data => {
        if (data && data.success) {
          console.log('[ExplorerProfile] Synced to database:', data.profile && data.profile.name);
        }
      }).catch(err => console.warn('[ExplorerProfile DB Sync Warning]', err.message));
    } catch (e) {
      console.warn('[ExplorerProfile DB Sync Exception]', e);
    }
  }

  // Get current user's own profile state (prioritizes actual Google Auth account info)
  function getMyProfileState() {
    const clerkUser = (window.Clerk && window.Clerk.user) ? window.Clerk.user : null;
    const session = getStoredSession();
    const userId = (clerkUser && clerkUser.id) || (session && session.userId) || '';

    // 1. Fetch user-specific stored profile if exists
    let stored = null;
    if (userId) {
      try {
        const raw = localStorage.getItem('we_profile_' + userId);
        if (raw) stored = JSON.parse(raw);
      } catch (e) {}
    }
    if (!stored) {
      try {
        const raw = localStorage.getItem(MY_PROFILE_KEY);
        if (raw) stored = JSON.parse(raw);
      } catch (e) {}
    }

    // Extract actual name & photo from authenticated Google / Clerk account
    const googleName = clerkUser ? getGoogleAuthUserName(clerkUser) : ((session && session.name) || '');
    const googleAvatar = (clerkUser && clerkUser.imageUrl) || (session && session.imageUrl) || '';
    const email = (clerkUser && clerkUser.primaryEmailAddress ? clerkUser.primaryEmailAddress.emailAddress : '') || (session && session.email) || '';

    let name = '';
    if (stored && stored.name && stored.isCustomName) {
      // Explicit user manual rename
      name = stored.name;
    } else if (googleName && googleName !== 'Explorer') {
      // Real Google authenticated name
      name = googleName;
    } else if (stored && stored.name && stored.name !== 'Gautam N' && stored.name !== 'Divya Shettar') {
      name = stored.name;
    } else {
      name = googleName || (stored && stored.name) || 'Explorer';
    }

    const handle = name ? name.toLowerCase().replace(/[^a-z0-9_]/g, '_') : 'explorer';

    let avatar = '';
    if (googleAvatar) {
      avatar = `<img src="${googleAvatar}" class="exp-avatar-img" alt="${escapeHtml(name)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    } else if (stored && stored.avatar) {
      avatar = stored.avatar;
    } else {
      avatar = getAvatarForUser(name);
    }

    const role = (stored && stored.role && !stored.role.includes('Founder & Lead Developer'))
      ? stored.role
      : getRoleForUser(name);

    const profile = {
      userId: userId,
      name: name,
      email: email,
      imageUrl: googleAvatar,
      handle: handle,
      role: role,
      avatar: avatar,
      region: (stored && stored.region) || 'Karnataka, India',
      status: 'Active & Verified',
      isSelf: true,
      isCustomName: !!(stored && stored.isCustomName)
    };

    // Auto-save and sync to DB if authenticated
    if (userId && name && name !== 'Explorer') {
      saveMyProfileState(profile);
      syncUserProfileToDatabase(profile);
    }

    return profile;
  }

  function saveMyProfileState(s) {
    try {
      if (s && s.userId) {
        localStorage.setItem('we_profile_' + s.userId, JSON.stringify(s));
      }
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
            <div style="margin-top: 12px; width: 100%; max-width: 440px;">
              <button type="button" class="exp-official-btn-logout" onclick="window.ExplorerProfile.signOut()">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Log Out</span>
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

    // Synchronizes authenticated Clerk / Google account data immediately into profile system
    syncWithClerkUser: function (user) {
      if (!user) return;
      const googleName = getGoogleAuthUserName(user);
      if (!googleName) return;

      const userId = user.id;
      const email = (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) ||
                    (user.emailAddresses && user.emailAddresses[0] ? user.emailAddresses[0].emailAddress : '');
      const avatarUrl = user.imageUrl || '';
      const handle = googleName.toLowerCase().replace(/[^a-z0-9_]/g, '_');

      // Update in-memory state
      myState.userId = userId;
      myState.name = googleName;
      myState.email = email;
      myState.handle = handle;
      myState.imageUrl = avatarUrl;
      if (avatarUrl) {
        myState.avatar = `<img src="${avatarUrl}" class="exp-avatar-img" alt="${escapeHtml(googleName)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        myState.avatar = getAvatarForUser(googleName);
      }
      myState.role = getRoleForUser(googleName);
      myState.isSelf = true;

      // Persist locally & sync to server database
      saveMyProfileState(myState);
      syncUserProfileToDatabase({
        userId: userId,
        name: googleName,
        email: email,
        imageUrl: avatarUrl,
        handle: handle,
        role: myState.role,
        region: myState.region || 'Karnataka, India',
        provider: 'google'
      });

      // Update any rendered avatar in navbar / drawer
      const navAvatars = document.querySelectorAll('.mob-avatar-wrap, #we-unified-user-avatar');
      navAvatars.forEach(el => {
        if (avatarUrl) {
          el.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${escapeHtml(googleName)}">`;
        }
      });

      // If profile overlay is open and showing self, immediately refresh the modal UI
      const overlay = document.getElementById('exp-profile-overlay');
      if (overlay && overlay.classList.contains('open') && currentViewingProfile && currentViewingProfile.isSelf) {
        currentViewingProfile = myState;
        renderProfileModal(currentViewingProfile);
      }
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
        myState.imageUrl = dataUrl;
        saveMyProfileState(myState);
        currentViewingProfile = myState;
        renderProfileModal(currentViewingProfile);

        // Update any avatar in navbar
        const navAvatars = document.querySelectorAll('.mob-avatar-wrap, #we-unified-user-avatar');
        navAvatars.forEach(el => {
          el.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" alt="${myState.name}">`;
        });

        // Sync with backend database
        if (myState.userId) {
          syncUserProfileToDatabase(myState);
        }
      };
      reader.readAsDataURL(file);
    },

    promptNameChange: function () {
      if (!currentViewingProfile || !currentViewingProfile.isSelf) return;
      const newName = prompt('Enter your official profile name:', myState.name);
      if (newName && newName.trim()) {
        myState.name = newName.trim();
        myState.handle = myState.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        myState.isCustomName = true;
        saveMyProfileState(myState);
        currentViewingProfile = myState;
        renderProfileModal(currentViewingProfile);

        // Sync updated name to database
        if (myState.userId) {
          syncUserProfileToDatabase({
            userId: myState.userId,
            name: myState.name,
            email: myState.email || '',
            imageUrl: myState.imageUrl || '',
            handle: myState.handle,
            role: myState.role,
            region: myState.region || 'Karnataka, India',
            provider: 'google'
          });
        }
      }
    },

    syncUI: function () {
      if (currentViewingProfile) renderProfileModal(currentViewingProfile);
    },

    signOut: async function () {
      if (confirm('Are you sure you want to log out of your account?')) {
        this.close();
        if (window.WeekendAuth && typeof window.WeekendAuth.signOut === 'function') {
          await window.WeekendAuth.signOut();
        } else if (window.Clerk && typeof window.Clerk.signOut === 'function') {
          try { await window.Clerk.signOut(); } catch (e) {}
        }
        localStorage.removeItem(MY_PROFILE_KEY);
        if (myState && myState.userId) {
          localStorage.removeItem('we_profile_' + myState.userId);
        }
        localStorage.removeItem('we_auth_session');
        sessionStorage.setItem('we_explicit_logout', 'true');

        const toast = document.createElement('div');
        toast.textContent = '✓ Successfully logged out';
        toast.style.cssText = 'position:fixed;bottom:32px;left:50%;transform:translateX(-50%);background:#111111;border:1.5px solid #ffffff;color:#fff;padding:10px 24px;border-radius:24px;font-size:0.88rem;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,0.35);z-index:99999999;';
        document.body.appendChild(toast);
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 2500);

        setTimeout(() => {
          window.location.reload();
        }, 500);
      }
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

  // Event listener for global authentication state changes
  window.addEventListener('we-auth-state-changed', function (e) {
    if (e.detail && e.detail.authenticated && e.detail.user) {
      window.ExplorerProfile.syncWithClerkUser(e.detail.user);
    }
  });

  // Watch for Clerk loading and user availability
  function watchClerkForProfile() {
    if (window.Clerk) {
      if (window.Clerk.user) {
        window.ExplorerProfile.syncWithClerkUser(window.Clerk.user);
      }
      if (typeof window.Clerk.addListener === 'function') {
        window.Clerk.addListener(({ user }) => {
          if (user) {
            window.ExplorerProfile.syncWithClerkUser(user);
          }
        });
      }
    } else {
      setTimeout(watchClerkForProfile, 250);
    }
  }
  watchClerkForProfile();
})();