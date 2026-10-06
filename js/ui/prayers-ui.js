/**
 * NgayTot — UI Controller cho Kho Văn Khấn Cổ Truyền Toàn Diện & Đặc Thù Vùng Miền, Dân Tộc.
 * 
 * Tính năng:
 *  - Bộ lọc đa chiều: Từ khóa, Danh mục, Vùng miền (Bắc/Trung/Nam), Dân tộc (Kinh, Mường, Tày-Nùng, Thái, Dao, Khmer, Chăm).
 *  - Chế độ Đọc Hành Lễ (Teleprompter): Cỡ chữ tùy chỉnh (A-/A+), Tự động cuộn (Auto-scroll), Giữ màn hình luôn sáng (Screen WakeLock API).
 *  - Tự động điền thông tin gia chủ (Auto-fill) từ Profile lưu trữ cục bộ.
 *  - Chi tiết lễ vật sắm sửa & điều kiêng kỵ dân gian.
 */
(function (NT) {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let wakeLockSentinel = null;
  let scrollInterval = null;
  let isScrolling = false;
  let scrollSpeed = 1.2; // px per tick
  let currentFontSize = 19; // px
  let activePrayer = null;
  let countdownTimer = null;
  let countdownSeconds = 5;

  // Lấy thông tin gia chủ đã lưu trong IndexedDB hoặc LocalCache
  async function getStoredProfile() {
    try {
      if (NT.idb && NT.idb.getUserProfile) {
        const p = await NT.idb.getUserProfile();
        if (p) return p;
      }
    } catch { /* fallback */ }
    
    // Fallback nếu IDB chưa có
    return {
      fullName: $('#f-name')?.value || '',
      birthYear: $('#f-date')?.value ? parseInt($('#f-date').value.split('-')[0], 10) : '',
      address: ''
    };
  }

  // Khởi tạo các bộ lọc trong UI
  async function initFilters() {
    const pData = NT.prayers;
    if (!pData) return;

    // 1. Populate Categories
    const catSelect = $('#prayer-filter-cat');
    if (catSelect) {
      catSelect.innerHTML = '<option value="">— Tất cả danh mục lễ tiết —</option>' +
        pData.CATEGORIES.map(c => `<option value="${esc(c.id)}">${esc(c.icon)} ${esc(c.name)}</option>`).join('');
    }

    // 2. Populate Regions
    const regSelect = $('#prayer-filter-region');
    if (regSelect) {
      regSelect.innerHTML = '<option value="">— Tất cả vùng miền —</option>' +
        pData.REGIONS.map(r => `<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('');
    }

    // 3. Populate Ethnicities
    const ethSelect = $('#prayer-filter-eth');
    if (ethSelect) {
      ethSelect.innerHTML = '<option value="">— Tất cả dân tộc —</option>' +
        pData.ETHNICITIES.map(e => `<option value="${esc(e.id)}">${esc(e.name)}</option>`).join('');
    }

    // Cultural preferences from stored profile
    const profile = await getStoredProfile();
    const prefRegion = $('#user-pref-region');
    const prefEth = $('#user-pref-eth');
    if (prefRegion && profile.culturalRegion) {
      prefRegion.value = profile.culturalRegion;
    }
    if (prefEth && profile.culturalEthnicity) {
      prefEth.value = profile.culturalEthnicity;
    }

    const saveCulturalPrefs = async () => {
      try {
        const curr = await getStoredProfile();
        const updated = {
          ...curr,
          culturalRegion: prefRegion?.value || '',
          culturalEthnicity: prefEth?.value || ''
        };
        if (NT.idb && NT.idb.saveUserProfile) {
          await NT.idb.saveUserProfile(updated);
        }
      } catch {}
      renderPrayerList();
    };

    prefRegion?.addEventListener('change', saveCulturalPrefs);
    prefEth?.addEventListener('change', saveCulturalPrefs);

    // Event listeners
    $('#prayer-search-input')?.addEventListener('input', renderPrayerList);
    catSelect?.addEventListener('change', renderPrayerList);
    regSelect?.addEventListener('change', renderPrayerList);
    ethSelect?.addEventListener('change', renderPrayerList);
  }

  // Hiển thị danh sách các thẻ bài văn khấn với thuật toán ưu tiên bản sắc & thời điểm
  async function renderPrayerList() {
    const pData = NT.prayers;
    if (!pData) return;

    const keyword = $('#prayer-search-input')?.value || '';
    const category = $('#prayer-filter-cat')?.value || '';
    const region = $('#prayer-filter-region')?.value || '';
    const ethnicity = $('#prayer-filter-eth')?.value || '';
    const userRegion = $('#user-pref-region')?.value || '';
    const userEthnicity = $('#user-pref-eth')?.value || '';

    // Lấy ngày tháng âm lịch hiện tại để tính toán dịp lễ cận kề
    let currentLunarDay = 1;
    let currentLunarMonth = 1;
    try {
      if (typeof Solar !== 'undefined') {
        const solar = Solar.fromDate(new Date());
        const lunar = solar.getLunar();
        currentLunarDay = lunar.getDay();
        currentLunarMonth = lunar.getMonth();
      }
    } catch {}

    // Lấy danh sách ngày giỗ từ Sổ Giỗ để ưu tiên bài khấn giỗ cận kề
    let upcomingAnniversaries = [];
    try {
      if (NT.idb && NT.idb.getAllAnniversaries) {
        upcomingAnniversaries = await NT.idb.getAllAnniversaries();
      }
    } catch {}

    const list = pData.filterPrayers({
      keyword,
      category,
      region,
      ethnicity,
      userRegion,
      userEthnicity,
      currentLunarDay,
      currentLunarMonth,
      upcomingAnniversaries
    });

    const container = $('#prayers-grid');
    const countBadge = $('#prayers-count-badge');

    if (countBadge) {
      countBadge.textContent = `${list.length} bài`;
    }

    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `
        <div class="empty-state full-col">
          <div class="big-han">祝</div>
          <p>Không tìm thấy bài văn khấn nào phù hợp với bộ lọc hiện tại.</p>
          <button type="button" class="btn btn-sm btn-secondary" id="btn-reset-prayer-filters">Xóa bộ lọc</button>
        </div>
      `;
      $('#btn-reset-prayer-filters')?.addEventListener('click', () => {
        if ($('#prayer-search-input')) $('#prayer-search-input').value = '';
        if ($('#prayer-filter-cat')) $('#prayer-filter-cat').value = '';
        if ($('#prayer-filter-region')) $('#prayer-filter-region').value = '';
        if ($('#prayer-filter-eth')) $('#prayer-filter-eth').value = '';
        renderPrayerList();
      });
      return;
    }

    container.innerHTML = list.map(p => {
      const catObj = pData.CATEGORIES.find(c => c.id === p.category);
      const regObj = pData.REGIONS.find(r => r.id === p.region);
      const ethObj = pData.ETHNICITIES.find(e => e.id === p.ethnicity);

      const regBadge = p.region !== 'toan_quoc' && regObj
        ? `<span class="badge-tag region">${esc(regObj.name)}</span>` : '';
      const ethBadge = p.ethnicity !== 'kinh' && ethObj
        ? `<span class="badge-tag ethnicity">${esc(ethObj.name)}</span>` : '';
      const priBadge = p.priorityBadge
        ? `<span class="badge-tag priority-badge">${esc(p.priorityBadge)}</span>` : '';

      return `
        <article class="prayer-card" data-id="${esc(p.id)}">
          <div class="prayer-card-header">
            <span class="prayer-cat-icon">${catObj ? catObj.icon : '📜'}</span>
            <div class="prayer-tags">
              ${priBadge}
              <span class="badge-tag cat">${catObj ? esc(catObj.name) : ''}</span>
              ${regBadge}
              ${ethBadge}
            </div>
          </div>
          <h3 class="prayer-card-title">${esc(p.title)}</h3>
          <p class="prayer-card-occ"><b>Thời điểm:</b> ${esc(p.occasion)}</p>
          <p class="prayer-card-meaning">${esc(p.meaning)}</p>
          <div class="prayer-card-footer">
            <button type="button" class="btn btn-sm btn-primary btn-open-prayer" data-id="${esc(p.id)}">
              ${p.kind === 'gioi_thieu' ? '📖 Xem giới thiệu' : '📖 Đọc bài khấn'}
            </button>
            <button type="button" class="btn btn-sm btn-secondary btn-view-offerings" data-id="${esc(p.id)}">
              🍎 Sắm lễ
            </button>
          </div>
        </article>
      `;
    }).join('');

    // Bind card buttons
    container.querySelectorAll('.btn-open-prayer').forEach(btn => {
      btn.addEventListener('click', () => openPrayerModal(btn.dataset.id, 'text'));
    });
    container.querySelectorAll('.btn-view-offerings').forEach(btn => {
      btn.addEventListener('click', () => openPrayerModal(btn.dataset.id, 'offerings'));
    });
  }

  let activeCustomContext = {};
  let activeCohortList = [];

  // Mở modal Hành Lễ (Teleprompter Reader)
  async function openPrayerModal(prayerId, initialTab = 'text', customContext = {}) {
    const pData = NT.prayers;
    if (!pData) return;

    const prayer = pData.getPrayerById(prayerId);
    if (!prayer) return;
    activePrayer = prayer;
    activeCustomContext = { enablePersonalization: true, ...customContext };

    const profile = await getStoredProfile();

    const dlg = $('#prayer-dialog');
    if (!dlg) return;

    // Fill profile inputs in modal
    const nameInput = $('#modal-host-name');
    const ageInput = $('#modal-host-age');
    const addrInput = $('#modal-host-address');
    if (nameInput) nameInput.value = profile.fullName || '';
    if (ageInput) ageInput.value = profile.birthYear || '';
    if (addrInput) addrInput.value = profile.address || '';

    // Hiển thị / ẩn và điền thông tin thân nhân giỗ gia tiên (Quan hệ, Tên người quá cố, Mộ phần)
    const isAncestral = prayer.category === 'gio_cha' || prayer.id.startsWith('vk_gio_') || prayer.id === 'vk_tien_thuong';
    $$('.ancestral-input').forEach(el => el.classList.toggle('hidden', !isAncestral));
    const relInput = $('#modal-deceased-relation');
    const decNameInput = $('#modal-deceased-name');
    const burialInput = $('#modal-burial-place');
    if (relInput) relInput.value = customContext.relationship || '';
    if (decNameInput) decNameInput.value = customContext.deceasedName || '';
    if (burialInput) burialInput.value = customContext.burialPlace || '';

    // Tự động tải danh sách gia tiên hợp tự nếu là bài văn khấn giỗ / gia tiên
    if (isAncestral) {
      if (customContext.invitedAncestors && customContext.invitedAncestors.length > 0) {
        activeCohortList = customContext.invitedAncestors.map(a => ({ ...a, selected: true }));
      } else {
        try {
          if (NT.idb && NT.idb.getAllAnniversaries) {
            const allAnnivs = await NT.idb.getAllAnniversaries();
            const currName = customContext.deceasedName || '';
            activeCohortList = allAnnivs
              .filter(a => !currName.includes(a.deceasedName))
              .map(a => ({
                relationship: a.relationship || 'Hương linh',
                deceasedName: a.deceasedName,
                selected: true
              }));
          }
        } catch {
          activeCohortList = [];
        }
      }
    } else {
      activeCohortList = [];
    }

    // Render Ancestor Cohort Chips in UI
    renderCohortChips();

    // Set toggle state (mặc định bật)
    const toggleEl = $('#toggle-prayer-personalization');
    if (toggleEl) {
      toggleEl.checked = activeCustomContext.enablePersonalization !== false;
    }

    // Render Prayer Content
    updateModalContent(prayerId);

    // Switch tab
    switchPrayerModalTab(initialTab);

    // Reset controls
    cancelHandsFreeCountdown();
    stopAutoScroll();
    $('#prayer-body-container')?.classList.remove('handsfree-reading');
    applyFontSize(currentFontSize);

    dlg.showModal();

    // Xin khóa sáng màn hình sau khi mở; nếu người dùng đã đóng trước khi có kết quả thì trả lại ngay
    requestScreenWakeLock().then(() => { if (!dlg.open) releaseScreenWakeLock(); });
  }

  // Hiển thị các chip chọn lọc hương linh thỉnh mời hợp tự
  function renderCohortChips() {
    const wrap = $('#invited-ancestors-wrapper');
    const container = $('#invited-ancestors-chips');
    if (!wrap || !container) return;

    if (activeCohortList.length === 0) {
      wrap.classList.add('hidden');
      return;
    }

    wrap.classList.remove('hidden');
    container.innerHTML = activeCohortList.map((a, idx) => `
      <button type="button" class="chip-btn cohort-chip ${a.selected ? 'active' : ''}" data-idx="${idx}">
        ${a.selected ? '✓' : '+'} ${esc(a.relationship ? a.relationship + ' ' : '')}${esc(a.deceasedName)}
      </button>
    `).join('');

    container.querySelectorAll('.cohort-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        if (activeCohortList[idx]) {
          activeCohortList[idx].selected = !activeCohortList[idx].selected;
          renderCohortChips();
          if (activePrayer) updateModalContent(activePrayer.id);
        }
      });
    });
  }

  // Cập nhật nội dung văn khấn trong Modal theo thông tin gia chủ & danh sách hợp tự
  function updateModalContent(prayerId) {
    const pData = NT.prayers;
    const name = $('#modal-host-name')?.value || '';
    const age = $('#modal-host-age')?.value || '';
    const addr = $('#modal-host-address')?.value || '';
    const rel = $('#modal-deceased-relation')?.value || '';
    const decName = $('#modal-deceased-name')?.value || '';
    const burial = $('#modal-burial-place')?.value || '';
    const toggleEl = $('#toggle-prayer-personalization');
    const isPersonalized = toggleEl ? toggleEl.checked : true;

    const profile = {
      fullName: name,
      birthYear: age ? parseInt(age, 10) : '',
      address: addr
    };

    // Lưu lại profile nếu người dùng đã nhập
    if (name || addr) {
      if (NT.idb && NT.idb.saveUserProfile) {
        NT.idb.saveUserProfile(profile).catch(() => {});
      }
    }

    // Lọc danh sách hương linh được chọn
    const selectedCohort = activeCohortList.filter(a => a.selected);

    const mergedContext = {
      ...activeCustomContext,
      enablePersonalization: isPersonalized,
      relationship: rel || activeCustomContext.relationship || '',
      deceasedName: decName || activeCustomContext.deceasedName || '',
      burialPlace: burial || activeCustomContext.burialPlace || '',
      invitedAncestors: selectedCohort
    };

    const rendered = pData.renderPrayer(prayerId, profile, mergedContext);
    if (!rendered) return;

    $('#prayer-dialog-title').textContent = rendered.title;
    $('#prayer-text-view').innerHTML = `<pre class="prayer-body-text">${esc(rendered.renderedText)}</pre>`;
    
    $('#prayer-offerings-view').innerHTML = `
      <div class="prayer-guide-section">
        <h4>🧺 Sắm sửa lễ vật chu đáo</h4>
        <p class="guide-content">${esc(rendered.offerings || 'Tùy tâm sắm lễ thanh tịnh, hoa tươi quả ngọt, hương đèn trà rượu.')}</p>
        
        ${rendered.taboos ? `
          <h4>⚠️ Điều kiêng kỵ dân gian</h4>
          <p class="guide-content taboo">${esc(rendered.taboos)}</p>
        ` : ''}
        
        <h4>🕯️ Ý nghĩa & nguồn gốc nghi lễ</h4>
        <p class="guide-content">${esc(rendered.meaning)}</p>
      </div>
    `;
  }

  function switchPrayerModalTab(tabName) {
    $$('.prayer-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    $('#prayer-text-view')?.classList.toggle('hidden', tabName !== 'text');
    $('#prayer-offerings-view')?.classList.toggle('hidden', tabName !== 'offerings');
  }

  // Quản lý WakeLock API (Giữ màn hình luôn sáng khi đọc khấn)
  async function requestScreenWakeLock() {
    try {
      if (wakeLockSentinel && !wakeLockSentinel.released) return; // đang giữ rồi: không xin chồng
      if ('wakeLock' in navigator) {
        wakeLockSentinel =await navigator.wakeLock.request('screen');
        const badge = $('#wakelock-status-badge');
        if (badge) {
          badge.textContent = '💡 Màn hình sáng';
          badge.classList.add('active');
        }
      }
    } catch {
      // Wake lock not supported or battery saver active
    }
  }

  function releaseScreenWakeLock() {
    if (wakeLockSentinel) {
      wakeLockSentinel.release().catch(() => {});
      wakeLockSentinel = null;
      const badge = $('#wakelock-status-badge');
      if (badge) {
        badge.textContent = 'Màn hình';
        badge.classList.remove('active');
      }
    }
  }

  // Cuộn tự động (Auto-scroll Teleprompter)
  function toggleAutoScroll() {
    const scroller = $('#prayer-body-container');
    if (!scroller) return;

    const btn = $('#btn-toggle-scroll');

    if (isScrolling) {
      stopAutoScroll();
    } else {
      isScrolling = true;
      if (btn) btn.innerHTML = '⏸️ Tạm dừng';
      scrollInterval = setInterval(() => {
        scroller.scrollTop += scrollSpeed;
        if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 5) {
          stopAutoScroll();
        }
      }, 35);
    }
  }

  function stopAutoScroll() {
    if (scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
    isScrolling = false;
    const btn = $('#btn-toggle-scroll');
    if (btn) btn.innerHTML = '▶️ Tự cuộn';
  }

  function setScrollSpeed(speed) {
    scrollSpeed = speed;
    $$('.speed-chip').forEach(c => c.classList.toggle('active', parseFloat(c.dataset.speed) === speed));
    const slider = $('#prayer-speed-slider');
    if (slider && parseFloat(slider.value) !== speed) {
      slider.value = speed;
    }
    const speedVal = $('#prayer-speed-val');
    if (speedVal) {
      speedVal.textContent = speed.toFixed(1) + 'x';
    }
  }

  // Đếm ngược chuẩn bị hành lễ rảnh tay (Hands-free Chanting Countdown)
  function startHandsFreeCountdown() {
    const overlay = $('#handsfree-countdown-overlay');
    const numEl = $('#countdown-sec-number');
    if (!overlay || !numEl) return;

    // Tạm dừng cuộn nếu đang chạy
    stopAutoScroll();
    if (countdownTimer) clearInterval(countdownTimer);
    countdownSeconds = 5;
    numEl.textContent = '5';
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');

    countdownTimer = setInterval(() => {
      countdownSeconds--;
      if (countdownSeconds > 0) {
        numEl.textContent = countdownSeconds;
      } else {
        clearInterval(countdownTimer);
        countdownTimer = null;
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');
        executeHandsFreeChanting();
      }
    }, 1000);
  }

  function cancelHandsFreeCountdown() {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    const overlay = $('#handsfree-countdown-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
    }
  }

  function executeHandsFreeChanting() {
    const scroller = $('#prayer-body-container');
    if (!scroller) return;

    // Chuyển tab sang bài văn khấn
    switchPrayerModalTab('text');

    // Kích hoạt chế độ đọc hành lễ trang nghiêm (chữ to 24px, độ tương phản cao)
    scroller.classList.add('handsfree-reading');
    scroller.scrollTop = 0;

    // Giữ màn hình luôn sáng
    requestScreenWakeLock();

    // Bắt đầu tự động cuộn
    if (scrollInterval) clearInterval(scrollInterval);
    isScrolling = true;
    const btn = $('#btn-toggle-scroll');
    if (btn) btn.innerHTML = '⏸️ Tạm dừng';

    scrollInterval = setInterval(() => {
      scroller.scrollTop += scrollSpeed;
      if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 5) {
        stopAutoScroll();
      }
    }, 35);
  }

  function applyFontSize(size) {
    currentFontSize = Math.max(15, Math.min(32, size));
    const textView = $('#prayer-text-view');
    if (textView) {
      textView.style.fontSize = `${currentFontSize}px`;
    }
    const indicator = $('#font-size-indicator');
    if (indicator) indicator.textContent = `${currentFontSize}px`;
  }

  // Sao chép bài văn khấn vào Clipboard
  async function copyPrayerText() {
    const pre = $('#prayer-text-view pre');
    if (!pre) return;
    const text = pre.textContent;
    try {
      await navigator.clipboard.writeText(text);
      if (typeof NT.toast === 'function') NT.toast('Đã sao chép bài văn khấn vào bộ nhớ tạm');
      else alert('Đã sao chép bài văn khấn');
    } catch {
      alert('Không thể sao chép tự động, vui lòng chọn văn bản và nhấn Ctrl+C');
    }
  }

  // Khởi tạo các sự kiện trong Modal & UI
  function bindEvents() {
    // Modal Close
    const dlg = $('#prayer-dialog');
    const cleanup = () => {
      cancelHandsFreeCountdown();
      stopAutoScroll();
      releaseScreenWakeLock();
      $('#prayer-body-container')?.classList.remove('handsfree-reading');
    };
    const handleClose = () => dlg?.close();
    // Mọi cách đóng (nút, bấm ra ngoài, phím Esc) đều qua sự kiện 'close': dừng cuộn, trả khóa sáng màn hình
    dlg?.addEventListener('close', cleanup);
    $('#prayer-dlg-close')?.addEventListener('click', handleClose);
    dlg?.addEventListener('click', (e) => {
      if (e.target === dlg) handleClose();
    });

    // Profile updates in modal
    ['#modal-host-name', '#modal-host-age', '#modal-host-address', '#modal-deceased-relation', '#modal-deceased-name', '#modal-burial-place'].forEach(id => {
      $(id)?.addEventListener('input', () => {
        if (activePrayer) updateModalContent(activePrayer.id);
      });
    });

    // Tabs inside modal
    $$('.prayer-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchPrayerModalTab(btn.dataset.tab));
    });

    // Hands-free Countdown & Speed Controls
    $('#btn-start-handsfree')?.addEventListener('click', startHandsFreeCountdown);
    $('#btn-cancel-countdown')?.addEventListener('click', cancelHandsFreeCountdown);
    $('#prayer-speed-slider')?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      setScrollSpeed(val);
    });

    // Font size buttons
    $('#btn-font-smaller')?.addEventListener('click', () => applyFontSize(currentFontSize - 2));
    $('#btn-font-bigger')?.addEventListener('click', () => applyFontSize(currentFontSize + 2));

    // Auto-scroll button
    $('#btn-toggle-scroll')?.addEventListener('click', toggleAutoScroll);
    $$('.speed-chip').forEach(chip => {
      chip.addEventListener('click', () => setScrollSpeed(parseFloat(chip.dataset.speed)));
    });

    // Copy & Print buttons
    $('#btn-copy-prayer')?.addEventListener('click', copyPrayerText);
    $('#btn-print-prayer')?.addEventListener('click', () => window.print());

    // Personalization toggle
    $('#toggle-prayer-personalization')?.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      const wrap = $('#invited-ancestors-wrapper');
      if (wrap) {
        if (!isChecked) wrap.classList.add('hidden');
        else if (activeCohortList.length > 0) wrap.classList.remove('hidden');
      }
      if (activePrayer) updateModalContent(activePrayer.id);
    });
  }

  // Public API
  NT.prayersUI = Object.freeze({
    async init() {
      await initFilters();
      await renderPrayerList();
      bindEvents();
    },
    openPrayerModal,
    renderPrayerList
  });

})(globalThis.NT ??= {});
