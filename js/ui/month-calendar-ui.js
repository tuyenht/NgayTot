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
 *  - Panel chi tiết ngày: 3 Trụ Can Chi, 6 Giờ Hoàng Đạo (với icon linh vật), Quẻ xuất hành Lý Thuần Phong, Hướng Hỷ/Tài Thần.
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
            ? '<span class="indicator-bad" title="Ngày Bách Kỵ (Tam Nương/Nguyệt Kỵ) — Đại Kỵ Bất Khả Dụng">⚠️</span>' 
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
    if (isTamNuong) kystr = 'Tam Nương (ngày 3, 7, 13, 18, 22, 27 âm lịch) : Trăm sự đều kỵ, chánh kỵ xuất hành, khởi công, giá thú';
    else if (isNguyetKy) kystr = 'Nguyệt Kỵ (ngày 5, 14, 23 âm lịch) : "Mùng năm mười bốn hai ba - Đi chơi cũng thiệt nữa là đi buôn"';
    else kystr = 'Không phạm bách kỵ lớn trong dân gian';

    // Đánh giá ma trận phối hợp 6 Kịch Bản giữa Thần Nhật (Hoàng/Hắc Đạo), Nhị Thập Bát Tú (Sao Cát/Hung) và Bách Kỵ
    const isBachKy = isTamNuong || isNguyetKy;
    let scenario = {};
    if (isHuangDao && isBachKy) {
      scenario = {
        num: '5 / 6',
        badgeCls: 'bad',
        cardCls: 'bad-bg',
        scoreCls: 'bad',
        scoreText: 'Đại Kỵ (Ghi Đè) · 0đ',
        name: 'Hoàng Đạo Phùng Bách Kỵ',
        symbols: `🟡 Hoàng Đạo (${tianShenName}) + ⚠️ ${isTamNuong ? 'Tam Nương' : 'Nguyệt Kỵ'}`,
        desc: `Dù ngày có Thần Hoàng Đạo (${tianShenName}) chiếu sáng nhưng lại phạm vào <b>${esc(kystr)}</b>. Theo tục xưa: <i>"Thần lành không bằng ngày kỵ"</i>, cơ chế Bách Kỵ Gatekeeper ghi đè toàn bộ điểm số về mức Cấm Kỵ.`,
        dos: 'Tế tự nội bộ, đọc sách, lễ Phật sám hối, làm việc thiện nguyện.',
        donts: 'Khởi công xây dựng, cất nóc, cưới hỏi, xuất hành xa, khai trương cửa hàng.'
      };
    } else if (!isHuangDao && isBachKy) {
      scenario = {
        num: '6 / 6',
        badgeCls: 'dark',
        cardCls: 'dark-bg',
        scoreCls: 'bad',
        scoreText: 'Cực Hung · 0đ',
        name: 'Hắc Đạo Phùng Bách Kỵ',
        symbols: `⚫ Hắc Đạo (${tianShenName}) + ⚠️ ${isTamNuong ? 'Tam Nương' : 'Nguyệt Kỵ'}`,
        desc: `Ngày Hắc Đạo đồng thời phạm vào <b>${esc(kystr)}</b>. Đây là ngày sát khí hội tụ mạnh nhất trong tháng, năng lượng trường khí bất ổn định.`,
        dos: 'An phận thủ thường tại gia, giữ tâm tĩnh lặng, giữ hòa khí gia đình.',
        donts: 'Trăm việc đại sự đều kiêng cữ tuyệt đối. Tránh đi xa, tranh chấp, ký kết quan trọng.'
      };
    } else if (isHuangDao && isStarGood) {
      scenario = {
        num: '1 / 6',
        badgeCls: 'good',
        cardCls: 'good-bg',
        scoreCls: 'good',
        scoreText: 'Đại Cát · 90–100đ',
        name: 'Song Cát Toàn Bích',
        symbols: `🟡 Hoàng Đạo (${tianShenName}) + ⭐ Sao ${starName} (Cát Tinh 28 Tú)`,
        desc: `Hội tụ trọn vẹn: Vừa là ngày Hoàng Đạo (${tianShenName} cát thần soi chiếu) vừa gặp Sao ${starName} là Cát Tinh trong Nhị Thập Bát Tú, lại không vướng Bách Kỵ. Trường khí cực kỳ cát tường, vạn sự hanh thông.`,
        dos: 'Khởi công, động thổ, cất nóc, cưới hỏi rước dâu, khai trương, ký hợp đồng lớn, xuất hành cát lợi, nhập trạch.',
        donts: 'Hầu như không kiêng kỵ việc gì, chỉ cần tránh các khung giờ xung với tuổi gia chủ.'
      };
    } else if (isHuangDao && !isStarGood) {
      scenario = {
        num: '2 / 6',
        badgeCls: 'warn',
        cardCls: 'warn-bg',
        scoreCls: 'warn',
        scoreText: 'Thứ Cát / Phân Hóa · 50–65đ',
        name: 'Hoàng Đạo Đới Hung',
        symbols: `🟡 Hoàng Đạo (${tianShenName}) + ★ Sao ${starName} (Hung Tinh 28 Tú)`,
        desc: `Ngày có khí tiết thanh sáng nhờ Thần Hoàng Đạo (${tianShenName}), nhưng lại bị Sao ${starName} là Tú Hung trong Nhị Thập Bát Tú chiếu mệnh. Cần phân định rõ việc nào nên làm và việc nào bắt buộc phải tránh.`,
        dos: 'Tế tự gia tiên, lễ Phật, cầu an giải hạn, họp mặt gia tộc, làm công đức, tu sửa nội thất nhẹ.',
        donts: '<b>ĐẠI KỴ CẤT NÓC, ĐỘNG THỔ, CƯỚI HỎI, XUẤT HÀNH XA</b>. Nếu bắt buộc làm phải chọn giờ Hoàng Đạo cát nhất để chế hóa.'
      };
    } else if (!isHuangDao && isStarGood) {
      scenario = {
        num: '3 / 6',
        badgeCls: 'info',
        cardCls: 'info-bg',
        scoreCls: 'info',
        scoreText: 'Bình Hòa / Cứu Giải · 45–55đ',
        name: 'Hắc Đạo Cát Diệu',
        symbols: `⚫ Hắc Đạo (${tianShenName}) + ⭐ Sao ${starName} (Cát Tinh Cứu Giải)`,
        desc: `Nhật thần tuy thuộc Hắc Đạo (${tianShenName}) nhưng lại được Sao ${starName} là Cát Tinh trong Nhị Thập Bát Tú soi chiếu hộ trì (*"Cát tinh đắc thời, hóa giải hung thần"*). Trường khí bình hòa, không gây họa hại.`,
        dos: 'Giao dịch nội bộ, ký kết hợp đồng quy mô nhỏ, tạ lễ, an vị đồ thờ, mua sắm đồ dùng thường nhật.',
        donts: 'Khởi công công trình đại quy mô, phá thổ san nền, khai trương rầm rộ, xuất hành đường trường.'
      };
    } else {
      scenario = {
        num: '4 / 6',
        badgeCls: 'dark',
        cardCls: 'dark-bg',
        scoreCls: 'dark',
        scoreText: 'Đại Hung · 20–35đ',
        name: 'Trùng Hung Đại Bại',
        symbols: `⚫ Hắc Đạo (${tianShenName}) + ★ Sao ${starName} (Hung Tinh 28 Tú)`,
        desc: `Cả Thần Nhật (${tianShenName}) lẫn Nhị Thập Bát Tú (Sao ${starName}) đều là hung sát song hành, không có sao lành cứu giải. Khí trường u ám bất lợi cho mọi sự khởi đầu.`,
        dos: 'Nghỉ ngơi, tĩnh dưỡng, giải quyết công việc thường nhật, dọn dẹp nhà cửa.',
        donts: '<b>TUYỆT ĐỐI TRÁNH KHỞI SỰ ĐẠI SỰ</b>: Động thổ, xây nhà, cưới gả, khai trương, xuất hành lớn.'
      };
    }

    const starAnalysisHtml = `
      <div class="star-analysis-box ${scenario.cardCls}">
        <div class="star-scenario-header">
          <span class="star-scenario-badge ${scenario.badgeCls}">Kịch Bản ${scenario.num}</span>
          <span class="star-scenario-score ${scenario.scoreCls}">${scenario.scoreText}</span>
        </div>
        <h4 class="star-scenario-title">${scenario.name}</h4>
        <div class="star-scenario-symbols">${scenario.symbols}</div>
        <p class="star-scenario-desc">${scenario.desc}</p>
        <div class="star-action-grid">
          <div class="star-col dos">
            <div class="col-lbl">✅ NÊN LÀM:</div>
            <div>${scenario.dos}</div>
          </div>
          <div class="star-col donts">
            <div class="col-lbl">⛔ KIÊNG KỴ:</div>
            <div>${scenario.donts}</div>
          </div>
        </div>
        <button type="button" class="btn btn-sm btn-view-matrix-full btn-open-matrix-dialog">
          📊 Đối chiếu toàn bộ 6 Kịch Bản Giao Thoa
        </button>
      </div>
    `;

    // 12 Giờ hoàng đạo & Lý Thuần Phong
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

        <!-- Phân Tích Phối Hợp: Hoàng/Hắc Đạo & Nhị Thập Bát Tú / Bách Kỵ -->
        <div class="detail-section">
          <h4 class="section-title">PHÂN TÍCH THẦN SÁT &amp; SAO CHIẾU MỆNH</h4>
          ${starAnalysisHtml}
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

    // Modal Ma Trận 6 Kịch Bản
    const matrixDlg = $('#matrix-guide-dialog');
    const openMatrix = (scenarioNum = null) => {
      if (!matrixDlg) return;
      if (!matrixDlg.open) {
        matrixDlg.showModal();
      }
      if (scenarioNum) {
        selectScenario(String(scenarioNum));
      }
    };
    const closeMatrix = () => {
      if (matrixDlg && matrixDlg.open) {
        matrixDlg.close();
      }
    };

    $('#btn-open-matrix-guide')?.addEventListener('click', () => openMatrix());
    $('#matrix-dlg-close')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeMatrix();
    });
    matrixDlg?.addEventListener('click', (e) => {
      if (e.target === matrixDlg) closeMatrix();
    });

    // Delegation bảo đảm nút đóng luôn hoạt động
    document.addEventListener('click', (e) => {
      if (e.target.closest('#matrix-dlg-close') || e.target.closest('.matrix-close-btn')) {
        e.preventDefault();
        e.stopPropagation();
        closeMatrix();
      }
    });

    // Nút mở Ma Trận bên trong thẻ chi tiết ngày
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-open-matrix-dialog');
      if (btn) {
        const targetScen = btn.dataset.scenario || null;
        openMatrix(targetScen);
      }
    });

    // Hàm chọn Kịch bản Master-Detail
    function selectScenario(scenId) {
      const navItems = $$('.matrix-nav-item');
      const cards = $$('#matrix-detail-stage .matrix-card');

      navItems.forEach(item => {
        const isMatch = item.dataset.scenario === scenId;
        item.classList.toggle('active', isMatch);
        if (isMatch) item.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
      });

      cards.forEach(card => {
        const isMatch = card.dataset.scenario === scenId;
        card.style.display = isMatch ? '' : 'none';
        card.classList.toggle('active', isMatch);
      });
    }

    // Click chọn kịch bản ở Sidebar
    $$('.matrix-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const scenId = item.dataset.scenario;
        if (scenId) selectScenario(scenId);
      });
    });

    // Chuyển đổi chế độ xem: Chi tiết vs Bảng đối chiếu
    const btnViewCards = $('#btn-view-cards');
    const btnViewTable = $('#btn-view-table');
    const splitView = $('#matrix-split-view');
    const tableView = $('#matrix-table-view');

    function switchView(mode) {
      if (mode === 'cards') {
        btnViewCards?.classList.add('active');
        btnViewCards?.setAttribute('aria-selected', 'true');
        btnViewTable?.classList.remove('active');
        btnViewTable?.setAttribute('aria-selected', 'false');
        if (splitView) splitView.style.display = '';
        if (tableView) tableView.style.display = 'none';
      } else {
        btnViewTable?.classList.add('active');
        btnViewTable?.setAttribute('aria-selected', 'true');
        btnViewCards?.classList.remove('active');
        btnViewCards?.setAttribute('aria-selected', 'false');
        if (splitView) splitView.style.display = 'none';
        if (tableView) tableView.style.display = '';
      }
    }

    btnViewCards?.addEventListener('click', () => switchView('cards'));
    btnViewTable?.addEventListener('click', () => switchView('table'));

    // Nút "Xem" từ hàng bảng đối chiếu
    $$('.btn-table-view-detail').forEach(btn => {
      btn.addEventListener('click', () => {
        const scenId = btn.dataset.scenario;
        switchView('cards');
        if (scenId) selectScenario(scenId);
      });
    });

    // Bộ lọc kịch bản bên trong Modal
    $$('.matrix-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        $$('.matrix-filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.dataset.filter;

        // 1. Lọc Sidebar items
        let firstVisibleScen = null;
        let activeStillVisible = false;

        $$('.matrix-nav-item').forEach(item => {
          const match = (filter === 'all' || item.dataset.cat === filter);
          item.style.display = match ? '' : 'none';
          if (match) {
            if (!firstVisibleScen) firstVisibleScen = item.dataset.scenario;
            if (item.classList.contains('active')) activeStillVisible = true;
          }
        });

        // Nếu kịch bản đang chọn bị ẩn bởi bộ lọc -> tự động kích hoạt kịch bản khả dụng đầu tiên
        if (!activeStillVisible && firstVisibleScen) {
          selectScenario(firstVisibleScen);
        }

        // 2. Lọc thẻ kịch bản & gán class .hidden chuẩn xác cho E2E
        $$('.matrix-card').forEach(card => {
          const match = (filter === 'all' || card.dataset.cat === filter);
          card.classList.toggle('hidden', !match);
        });

        // 3. Lọc hàng trong bảng đối chiếu
        $$('.matrix-overview-table .tbl-row').forEach(row => {
          const match = (filter === 'all' || row.dataset.cat === filter);
          row.style.display = match ? '' : 'none';
        });
      });
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
