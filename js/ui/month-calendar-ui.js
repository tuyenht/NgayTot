/**
 * NgayTot — UI Controller cho Lịch Tháng Âm Dương Toàn Cảnh (Full-Month View Calendar).
 * 
 * Tính năng kiến trúc cao cấp:
 *  - Hệ thống 6 vị trí chỉ báo đa chiều cố định (Dedicated Spatial Multi-Indicator):
 *      1. Top-Left: Hoàng Đạo (🟡) / Hắc Đạo (⚫)
 *      2. Top-Right: Sao Cát (⭐) / Bách Kỵ Hung Sát (⚠️)
 *      3. Center: Số Dương lịch lớn sắc nét
 *      4. Sub-Center: Ngày Âm lịch (kèm tên tháng nếu mùng 1)
 *      5. Bottom-Left: Tuần tiết Sóc Vọng (🌕 Rằm 15 / 🌑 Mùng một)
 *      6. Bottom-Right: Ngày Giỗ Gia Tiên (🕯️) từ Sổ Giỗ
 *  - Bảng chú giải trực quan (Legend) giúp phân biệt rõ ràng không bao giờ nhầm lẫn.
 *  - Panel chi tiết ngày: chỉ thông tin lịch (3 Trụ Can Chi, thần nhật, sao, tục kiêng, 6 Giờ Hoàng Đạo, Hướng Hỷ/Tài Thần).
 *    Không chấm điểm, không xếp loại ngày (QĐ-17): điểm chỉ có ở kết quả chọn ngày.
 */
(function (NT) {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const pad = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Icon 12 con giáp
  const ZODIAC_ICONS = {
    'Tý': '🐭', 'Sửu': '🐂', 'Dần': '🐯', 'Mão': '🐱',
    'Thìn': '🐲', 'Tỵ': '🐍', 'Ngọ': '🐴', 'Mùi': '🐐',
    'Thân': '🐵', 'Dậu': '🐔', 'Tuất': '🐶', 'Hợi': '🐷'
  };

  let currentYear = new Date().getFullYear();
  let currentMonth = new Date().getMonth() + 1; // 1-12
  let selectedDate = new Date(); // Date object
  let anniversariesCache = [];

  async function refreshAnniversariesCache() {
    try {
      if (NT.idb && NT.idb.getAllAnniversaries) {
        anniversariesCache = await NT.idb.getAllAnniversaries();
      }
    } catch {
      anniversariesCache = [];
    }
  }

  // Khởi tạo Lịch Tháng
  async function init() {
    await refreshAnniversariesCache();
    renderMonthView(currentYear, currentMonth);
    bindEvents();
  }

  // Các ngày giỗ rơi vào một ngày dương: dùng cùng phép tính với Sổ giỗ, nên tháng nhuận và
  // giỗ ngày 30 gặp tháng thiếu (lùi về 29) được chấm đúng ô.
  function getAnniversariesForSolarDate(y, m, d) {
    if (!NT.anniversary?.getAnniversaryOccurrences) return [];
    return anniversariesCache.filter((a) => {
      const leap = !!(a.isLeapMonth ?? a.isLeap);
      return NT.anniversary.getAnniversaryOccurrences(Number(a.lunarDay), Number(a.lunarMonth), y, leap)
        .some((o) => o.solarMonth === m && o.solarDay === d);
    });
  }

  // Vẽ lưới lịch tháng
  function renderMonthView(year, month) {
    const grid = $('#month-calendar-grid');
    const titleEl = $('#month-calendar-title');
    if (!grid) return;

    if (titleEl) {
      titleEl.textContent = `Tháng ${month} - ${year}`;
    }

    // Ngày đầu tiên của tháng
    const firstDay = new Date(year, month - 1, 1);
    // Thứ trong tuần của ngày 1 (0: CN, 1: Hai, ... 6: Bảy)
    const startDayOfWeek = firstDay.getDay();

    // Số ngày trong tháng
    const daysInMonth = new Date(year, month, 0).getDate();
    // Số ngày tháng trước
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

    let cellsHtml = '';
    const today = new Date();

    // 1. Các ngày của tháng trước (Padding đầu lưới)
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      cellsHtml += buildCellHtml(prevYear, prevMonth, d, true);
    }

    // 2. Các ngày trong tháng hiện tại
    for (let d = 1; d <= daysInMonth; d++) {
      cellsHtml += buildCellHtml(year, month, d, false);
    }

    // 3. Các ngày của tháng sau (Padding cuối lưới cho đủ bội số 7)
    const totalRendered = startDayOfWeek + daysInMonth;
    const remaining = (7 - (totalRendered % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      cellsHtml += buildCellHtml(nextYear, nextMonth, d, true);
    }

    grid.innerHTML = cellsHtml;

    // Cập nhật chi tiết ngày đang chọn
    renderDayDetail(selectedDate);
    bindCellClicks();
  }

  // Sinh HTML cho từng ô ngày với 6 vị trí chỉ báo cố định
  function buildCellHtml(y, m, d, isOtherMonth) {
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay();

    // Tính âm lịch
    const lunar = NT.calendar.solarToLunar(d, m, y);
    const lunarDay = lunar.day;
    const lunarMonth = lunar.month;
    const isLeap = lunar.leap;

    // Can Chi ngày
    const gz = NT.calendar.solarToGanZhi(d, m, y);
    const dayChi = gz.dChi;
    const dayCan = gz.dCan;

    // 1. Kiểm tra Hoàng đạo / Hắc đạo
    // 12 ngày hoàng đạo theo chi:
    // Dần/Thân: Tý(HĐ), Sửu(HĐ), Thìn(HĐ), Tỵ(HĐ), Mùi(HĐ), Tuất(HĐ)
    // Tý/Ngọ: Thân(HĐ), Dậu(HĐ), Tý(HĐ), Sửu(HĐ), Mão(HĐ), Ngọ(HĐ)
    // Mão/Dậu: Dần(HĐ), Mão(HĐ), Ngọ(HĐ), Mùi(HĐ), Dậu(HĐ), Tý(HĐ)
    // Thìn/Tuất: Thìn(HĐ), Tỵ(HĐ), Thân(HĐ), Dậu(HĐ), Hợi(HĐ), Dần(HĐ)
    // Tỵ/Hợi: Ngọ(HĐ), Mùi(HĐ), Tuất(HĐ), Hợi(HĐ), Sửu(HĐ), Thìn(HĐ)
    // Sửu/Mùi: Tuất(HĐ), Hợi(HĐ), Sửu(HĐ), Dần(HĐ), Thìn(HĐ), Thân(HĐ)
    const isHuangDao = checkDayHuangDao(y, m, d);

    // 2. Tính Nhị Thập Bát Tú (28 Sao) của ngày — Độc lập với Hoàng Đạo
    let starName = '';
    let isStarGood = true;
    try {
      if (typeof globalThis.Solar !== 'undefined' && globalThis.Solar.fromYmd) {
        const lObj = globalThis.Solar.fromYmd(y, m, d).getLunar();
        if (lObj) {
          isStarGood = lObj.getXiuLuck() === '吉';
          const rawXiu = lObj.getXiu();
          starName = NT.vi && NT.vi.xiu ? NT.vi.xiu(rawXiu) : rawXiu;
        }
      }
    } catch {}

    // 3. Kiểm tra Bách Kỵ (Tam Nương, Nguyệt Kỵ, Dương Công Kỵ)
    const isTamNuong = [3, 7, 13, 18, 22, 27].includes(lunarDay);
    const isNguyetKy = [5, 14, 23].includes(lunarDay);
    const isBachKy = isTamNuong || isNguyetKy;

    // 4. Kiểm tra Giỗ Gia Tiên
    const annivs = getAnniversariesForSolarDate(y, m, d);
    const hasAnniversary = annivs.length > 0;

    // 5. Tuần tiết Sóc Vọng
    const isFullMoon = lunarDay === 15; // Rằm
    const isNewMoon = lunarDay === 1;   // Mùng một

    // Check Today & Selected
    const now = new Date();
    const isToday = now.getFullYear() === y && now.getMonth() + 1 === m && now.getDate() === d;
    const isSelected = selectedDate.getFullYear() === y && selectedDate.getMonth() + 1 === m && selectedDate.getDate() === d;

    // Class list
    let classes = ['month-day-cell'];
    if (isOtherMonth) classes.push('other-month');
    if (isToday) classes.push('is-today');
    if (isSelected) classes.push('is-selected');
    if (dayOfWeek === 0) classes.push('is-sunday');
    if (dayOfWeek === 6) classes.push('is-saturday');

    // Text ngày âm
    const lunarText = lunarDay === 1 ? `${lunarDay}/${lunarMonth}` : `${lunarDay}`;

    return `
      <div class="${classes.join(' ')}" 
           data-year="${y}" data-month="${m}" data-day="${d}"
           data-lunar-day="${lunarDay}" data-lunar-month="${lunarMonth}"
           tabindex="0" role="gridcell" aria-label="Ngày ${d} tháng ${m} năm ${y}">
        
        <!-- Vị trí 1 (Top-Left): Hoàng Đạo (🟡) / Hắc Đạo (⚫) -->
        <div class="pos-top-left">
          ${isHuangDao 
            ? '<span class="indicator-hd" title="Ngày Hoàng Đạo">🟡</span>' 
            : '<span class="indicator-hei" title="Ngày Hắc Đạo">⚫</span>'}
        </div>

        <!-- Vị trí 2 (Top-Right): Sao Cát (⭐) / Sao Xấu (★) / Bách Kỵ Hung Sát (⚠️) -->
        <div class="pos-top-right">
          ${isBachKy 
            ? '<span class="indicator-bad" title="Ngày Tam Nương hoặc Nguyệt Kỵ (tục kiêng dân gian)">⚠️</span>'
            : (isStarGood 
              ? `<span class="indicator-good" title="Sao ${starName || 'Cát'} (Nhị Thập Bát Tú Cát Tinh)">⭐</span>` 
              : `<span class="indicator-bad-star" title="Sao ${starName || 'Hung'} (Nhị Thập Bát Tú Hung Tinh)">★</span>`)}
        </div>

        <!-- Vị trí 3 (Center): Số Dương Lịch Lớn -->
        <div class="pos-center">${d}</div>

        <!-- Vị trí 4 (Sub-Center): Số Âm Lịch -->
        <div class="pos-sub-center ${isFullMoon || isNewMoon ? 'highlight-lunar' : ''}">
          ${lunarText}
        </div>

        <!-- Vị trí 5 (Bottom-Left): Tuần Tiết Sóc Vọng (🌕 Rằm / 🌑 Mùng 1) -->
        <div class="pos-bottom-left">
          ${isFullMoon ? '<span class="indicator-moon" title="Ngày Rằm (15)">🌕</span>' : ''}
          ${isNewMoon ? '<span class="indicator-moon" title="Ngày Mùng Một">🌑</span>' : ''}
        </div>

        <!-- Vị trí 6 (Bottom-Right): Giỗ Gia Tiên (🕯️) -->
        <div class="pos-bottom-right">
          ${hasAnniversary ? '<span class="indicator-anniv" title="Có ngày giỗ gia tiên">🕯️</span>' : ''}
        </div>
      </div>
    `;
  }

  // Ngày hoàng đạo / hắc đạo: lấy thần nhật từ cùng nguồn với phần chọn ngày (scoring.js),
  // để lịch tháng và kết quả trạch cát không bao giờ nói khác nhau về một ngày.
  function checkDayHuangDao(y, m, d) {
    try {
      return globalThis.Solar.fromYmd(y, m, d).getLunar().getDayTianShenType() === '黄道';
    } catch {
      return false;
    }
  }

  // Hiển thị panel chi tiết ngày đang chọn (như trong ảnh screenshot của người dùng)
  function renderDayDetail(date) {
    const detailPanel = $('#month-day-detail-panel');
    if (!detailPanel) return;

    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();

    const WEEKDAYS = ['CHỦ NHẬT', 'THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY'];
    const weekdayName = WEEKDAYS[date.getDay()];

    const lunar = NT.calendar.solarToLunar(d, m, y);
    const gz = NT.calendar.solarToGanZhi(d, m, y);
    const isHuangDao = checkDayHuangDao(y, m, d);

    // 2. Tính Nhị Thập Bát Tú và Thần Nhật chi tiết
    let starName = '';
    let isStarGood = true;
    let tianShenName = '';
    try {
      if (typeof globalThis.Solar !== 'undefined' && globalThis.Solar.fromYmd) {
        const lObj = globalThis.Solar.fromYmd(y, m, d).getLunar();
        if (lObj) {
          isStarGood = lObj.getXiuLuck() === '吉';
          const rawXiu = lObj.getXiu();
          starName = NT.vi && NT.vi.xiu ? NT.vi.xiu(rawXiu) : rawXiu;
          const rawTs = lObj.getDayTianShen();
          tianShenName = NT.vi && NT.vi.tianshen ? NT.vi.tianshen(rawTs) : rawTs;
        }
      }
    } catch {}

    // Bách kỵ
    const isTamNuong = [3, 7, 13, 18, 22, 27].includes(lunar.day);
    const isNguyetKy = [5, 14, 23].includes(lunar.day);

    let kystr = '';
    if (isTamNuong) kystr = 'Ngày Tam Nương (mùng 3, 7, 13, 18, 22, 27 âm lịch): dân gian thường kiêng khởi việc lớn';
    else if (isNguyetKy) kystr = 'Ngày Nguyệt Kỵ (mùng 5, 14, 23 âm lịch): dân gian thường kiêng xuất hành, khởi việc lớn';
    else kystr = 'Không rơi vào ngày Tam Nương, Nguyệt Kỵ';

    // Thẻ chi tiết ngày chỉ nêu thông tin lịch, không chấm điểm, không xếp loại (QĐ-17)
    const hdCompare = NT.canhClock?.compareDayHoangDao ? NT.canhClock.compareDayHoangDao(d, m, y) : null;
    const hdNoteHtml = hdCompare && hdCompare.differs
      ? `<p class="source-note" id="month-hd-diff-note">Lưu ý: ứng dụng tính ngày hoàng đạo theo tiết khí nên ghi ngày này là ${hdCompare.bySolarTerm ? 'hoàng đạo' : 'hắc đạo'}; nếu tra theo tháng âm thì ngày này là ${hdCompare.byLunarMonth ? 'hoàng đạo' : 'hắc đạo'}. Các nguồn không thống nhất.</p>`
      : '';
    const calendarInfoHtml = `
      <ul class="why">
        <li>Thần nhật: <b>${esc(tianShenName || '—')}</b> (${isHuangDao ? 'hoàng đạo' : 'hắc đạo'})</li>
        <li>Sao (nhị thập bát tú): <b>${esc(starName || '—')}</b>${starName ? ` (${isStarGood ? 'sao tốt' : 'sao xấu'})` : ''}</li>
        <li>${esc(kystr)}</li>
      </ul>
      ${hdNoteHtml}
    `;

    // 12 Giờ hoàng đạo
    let hoursDetails = [];
    if (NT.canhClock && NT.canhClock.getDayHoursDetails) {
      hoursDetails = NT.canhClock.getDayHoursDetails(gz.dChi, lunar.month, lunar.day);
    }
    const huangDaoHours = hoursDetails.filter(h => h.isHuangDao);

    // Hướng xuất hành
    let directions = { hyThan: 'Đông Nam', taiThan: 'Tây Bắc', hacThan: 'Chính Bắc' };
    if (NT.canhClock && NT.canhClock.getDirections) {
      directions = NT.canhClock.getDirections(gz.dCan, gz.dChi);
    }

    // Giỗ gia tiên nếu có
    const annivs = getAnniversariesForSolarDate(y, m, d);

    detailPanel.innerHTML = `
      <div class="day-detail-card">
        <!-- Tiêu đề ngày -->
        <div class="day-detail-header">
          <h3 class="weekday-title">${weekdayName}</h3>
          <p class="solar-date-title">Ngày ${d} Tháng ${m}, ${y}</p>
          <div class="dao-status ${isHuangDao ? 'hd' : 'hei'}">
            <span class="dot">${isHuangDao ? '🟡' : '⚫'}</span>
            <span>${isHuangDao ? 'Ngày Hoàng Đạo' : 'Ngày Hắc Đạo'}</span>
          </div>
        </div>

        <!-- 3 Trụ Ngày / Tháng / Năm Âm Lịch -->
        <div class="lunar-pillars-row">
          <div class="pillar-col">
            <span class="p-lbl">NGÀY</span>
            <span class="p-num">${lunar.day}</span>
            <span class="p-gz">${gz.dCan} ${gz.dChi}</span>
          </div>
          <div class="pillar-col">
            <span class="p-lbl">THÁNG</span>
            <span class="p-num">${lunar.month}${lunar.leap ? ' (Nhuận)' : ''}</span>
            <span class="p-gz">${gz.mCan} ${gz.mChi}</span>
          </div>
          <div class="pillar-col">
            <span class="p-lbl">NĂM</span>
            <span class="p-num">${lunar.year}</span>
            <span class="p-gz">${gz.yCan} ${gz.yChi}</span>
          </div>
        </div>

        <!-- Thông tin lịch của ngày: thần nhật, sao, tục kiêng (không điểm số) -->
        <div class="detail-section">
          <h4 class="section-title">THÔNG TIN LỊCH CỦA NGÀY</h4>
          ${calendarInfoHtml}
        </div>

        <!-- Giờ Hoàng Đạo trong ngày với Icon linh vật -->
        <div class="detail-section">
          <h4 class="section-title">GIỜ HOÀNG ĐẠO</h4>
          <div class="huang-dao-hours-grid">
            ${huangDaoHours.map(h => `
              <div class="hour-mini-card">
                <span class="hour-zodiac-icon">${ZODIAC_ICONS[h.chi] || '⭐'}</span>
                <span class="hour-name">${h.chi}</span>
                <span class="hour-span">${h.chiIndex === 0 ? '0h-1h' : h.startHour + 'h-' + h.endHour + 'h'}</span>
                <span class="hour-star-tag">${h.starName}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Hướng xuất hành -->
        <div class="detail-section">
          <h4 class="section-title">HƯỚNG XUẤT HÀNH CÁT LỢI</h4>
          <p class="source-note">Hướng Tài thần là tập tục dân gian, các nguồn không thống nhất (lệch nhau ở ngày Mậu, Nhâm, Quý).</p>
          <div class="directions-pill-row">
            <span class="pill-dir hy">Hỷ Thần: <b>${directions.hyThan}</b></span>
            <span class="pill-dir tai">Tài Thần: <b>${directions.taiThan}</b></span>
            <span class="pill-dir hac">Hạc Thần (tránh): <b>${directions.hacThan}</b></span>
          </div>
        </div>

        <!-- Báo cáo ngày giỗ gia tiên nếu có -->
        ${annivs.length > 0 ? `
          <div class="detail-section anniv-alert-box">
            <div class="anniv-alert-header">
              <span>🕯️ Có ${annivs.length} ngày giỗ gia tiên hôm nay!</span>
            </div>
            <div class="anniv-alert-names">
              ${annivs.map(a => `
                <div class="anniv-item-row">
                  <span><b>${esc(a.relationship ? a.relationship + ' ' : '')}${esc(a.deceasedName)}</b></span>
                  <button type="button" class="btn btn-sm btn-primary btn-open-detail-prayer" 
                          data-name="${esc(a.deceasedName)}" data-rel="${esc(a.relationship || '')}"
                          data-day="${lunar.day}" data-month="${lunar.month}">
                    📜 Đọc Văn Khấn Giỗ
                  </button>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Nút trạch cát nhanh -->
        <div class="detail-actions">
          <button type="button" class="btn btn-secondary btn-jump-to-task" data-date="${y}-${pad(m)}-${pad(d)}">
            🎯 Xem điểm trạch cát việc đại sự ngày này
          </button>
        </div>
      </div>
    `;

    // Bind action buttons in detail panel
    detailPanel.querySelectorAll('.btn-open-detail-prayer').forEach(btn => {
      btn.addEventListener('click', () => {
        if (NT.prayersUI && NT.prayersUI.openPrayerModal) {
          NT.prayersUI.openPrayerModal('vk_gio_thuong', 'text', {
            deceasedName: `${btn.dataset.rel ? btn.dataset.rel + ' ' : ''}${btn.dataset.name}`,
            lunarDay: btn.dataset.day,
            lunarMonth: btn.dataset.month,
            lunarYearName: `${y}`
          });
        }
      });
    });

    detailPanel.querySelector('.btn-jump-to-task')?.addEventListener('click', (e) => {
      const targetDate = e.target.dataset.date;
      if ($('#t-from')) $('#t-from').value = targetDate;
      if ($('#t-to')) $('#t-to').value = targetDate;
      // Switch tab to trachcat
      $('#nav-profile')?.click();
    });
  }

  function bindCellClicks() {
    $$('.month-day-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        $$('.month-day-cell').forEach(c => c.classList.remove('is-selected'));
        cell.classList.add('is-selected');

        const y = parseInt(cell.dataset.year, 10);
        const m = parseInt(cell.dataset.month, 10);
        const d = parseInt(cell.dataset.day, 10);
        selectedDate = new Date(y, m - 1, d);

        renderDayDetail(selectedDate);
      });
    });
  }

  function bindEvents() {
    // Tháng trước
    ($('#btn-month-prev') || $('#btn-prev-month'))?.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 1) {
        currentMonth = 12;
        currentYear--;
      }
      renderMonthView(currentYear, currentMonth);
    });

    // Tháng sau
    ($('#btn-month-next') || $('#btn-next-month'))?.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
      renderMonthView(currentYear, currentMonth);
    });

    // Về hôm nay
    $('#btn-month-today')?.addEventListener('click', () => {
      const now = new Date();
      currentYear = now.getFullYear();
      currentMonth = now.getMonth() + 1;
      selectedDate = now;
      renderMonthView(currentYear, currentMonth);
    });
  }

  NT.monthCalendarUI = Object.freeze({
    init,
    render: renderMonthView,
    refreshAnniversaries: async () => {
      await refreshAnniversariesCache();
      renderMonthView(currentYear, currentMonth);
    }
  });

})(globalThis.NT ??= {});
