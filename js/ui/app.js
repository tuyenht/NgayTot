/**
 * NgayTot — UI controller.
 * Toàn bộ dữ liệu xử lý cục bộ; hồ sơ chỉ lưu localStorage khi người dùng bấm Lưu (PRD §3.3). Mọi chuỗi do người dùng nhập đều đi qua esc().
 */
(function (NT) {
  'use strict';

  const D = NT.data;
  const S = NT.scoring;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC_MAP[c]);
  const pad = (n) => String(n).padStart(2, '0');
  const EL_KEY = ['moc', 'hoa', 'tho', 'kim', 'thuy'];
  const STORE_KEY = 'ngaytot.profiles.v1';
  const LAST_ID_KEY = 'ngaytot.lastProfileId.v1'; // chỉ id của hồ sơ đã chủ động Lưu
  const LEGACY_AUTOSAVE_KEY = 'ngaytot.last.v1';   // bản cũ tự lưu hồ sơ vừa nhập — xóa khi khởi động
  const KEY_PREFIX = 'ngaytot.';
  const TOP_N = 12;
  const CAT_LABEL = { cal: 'Hoàng lịch', folk: 'Ngày kỵ dân gian', bazi: 'Bát tự của bạn', name: 'Ngũ hành tên (hệ số phụ)', year: 'Hạn năm' };
  const REGIONS = ['bac', 'nam', 'unknown'];
  const REGION_LABEL = { bac: 'Miền Bắc', nam: 'Miền Nam', unknown: 'Không rõ vùng' };
  const TZ_MANUAL = [7, 8, 9]; // lựa chọn tay của #f-tz; còn lại = tự động
  const TZ_HINT_DEFAULT = 'Giờ đồng hồ ở Việt Nam đã đổi nhiều lần (1943–1975). Chọn "Tự động" để ứng dụng đề xuất theo ngày sinh và vùng.';
  /** Câu miễn trừ bắt buộc trên mọi màn hình kết quả (PRD §3.4). */
  const DISCLAIMER = 'Trạch nhật là tri thức văn hóa truyền thống, chưa có kiểm chứng khoa học. Kết quả chỉ để tham khảo.';

  const state = { chart: null, nameInfo: null, results: null, act: null, mode: 'best' };
  /** Việc có ngày đã ấn định: không hiện chỉ số, xếp loại (PRD §3.1, §8.4 điều 4). */
  const noIndex = () => !!state.act?.fixedOnly;
  /** Lịch mổ, sinh mổ đã ấn định: chỉ thông tin lịch thuần, không dòng luật tốt xấu (PRD §3.1). */
  const calendarOnly = () => S.isCalendarOnly(state.act);
  /** Chế độ ngày cố định: diễn đạt trung tính, không dùng từ gây sợ (PRD §3.4). */
  const neutral = (t) => (noIndex()
    ? String(t).replace(/Hung sát/g, 'Sao cần lưu ý').replace(/ — hung$/, ' — không thuận').replace(/phạm /gi, 'gặp ')
      .replace(/ — kỵ việc này/, ' — sách ghi không hợp việc này')
    : String(t));

  /* ------------------------------ Tiện ích ------------------------------ */
  let toastTimer;
  function toast(msg, isError = false) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('error', isError);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
  }
  const todayISO = () => { const n = new Date(); return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`; };
  const addDaysISO = (iso, days) => {
    const [y, m, d] = iso.split('-').map(Number);
    const t = new Date(Date.UTC(y, m - 1, d) + days * 864e5);
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
  };
  const fmtDate = (ctx) => `${pad(ctx.d)}/${pad(ctx.m)}/${ctx.y}`;
  const gradeClass = (g) => `c-${g.key}`;
  const elSpan = (e, text) => `<span class="el-${EL_KEY[e]}">${esc(text)}</span>`;

  /* ------------------------------ Lưu trữ ------------------------------ */
  function loadProfiles() {
    try {
      const arr = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]');
      return Array.isArray(arr) ? arr.filter((p) => p && typeof p.id === 'string' && typeof p.birthDate === 'string') : [];
    } catch { return []; }
  }
  const saveProfiles = (list) => localStorage.setItem(STORE_KEY, JSON.stringify(list));
  const newId = () => (crypto.randomUUID?.() ?? `p${Date.now()}${Math.random().toString(16).slice(2)}`);

  function refreshProfileSelect(selectedId = '') {
    const sel = $('#profile-select');
    const list = loadProfiles();
    sel.innerHTML = '<option value="">— Hồ sơ mới —</option>' + list.map((p) =>
      `<option value="${esc(p.id)}">${esc(p.name || 'Chưa đặt tên')} · ${esc(p.birthDate.split('-').reverse().join('/'))}</option>`).join('');
    sel.value = list.some((p) => p.id === selectedId) ? selectedId : '';
  }

  /* ------------------------------ Form hồ sơ ------------------------------ */
  function readProfileForm() {
    const unknown = $('#f-unknown-time').checked;
    const placeId = $('#f-place').value;
    const pl = D.PLACES.find((x) => x.id === placeId);
    let region = REGIONS.includes($('#f-region').value) ? $('#f-region').value : 'bac';
    if (pl?.region && pl.region !== 'unknown' && $('#wrap-region')?.classList.contains('hidden')) {
      region = pl.region;
    }
    return {
      id: $('#profile-select').value || null,
      name: $('#f-name').value.trim().slice(0, 80),
      gender: $('input[name="gender"]:checked').value === 'female' ? 'female' : 'male',
      birthDate: $('#f-date').value,
      birthTime: unknown ? null : ($('#f-time').value || null),
      placeId,
      lon: Number.parseFloat($('#f-lon').value),
      region,
      tz: TZ_MANUAL.includes(Number($('#f-tz').value)) ? Number($('#f-tz').value) : null, // null = tự động (PRD §6.3)
      ziSect: Number($('#f-zi').value) === 2 ? 2 : 1,
      useTrueSolar: $('#f-tst').checked,
    };
  }

  function writeProfileForm(p) {
    $('#f-name').value = p.name ?? '';
    $(`input[name="gender"][value="${p.gender === 'female' ? 'female' : 'male'}"]`).checked = true;
    $('#f-date').value = p.birthDate ?? '';
    $('#f-unknown-time').checked = !p.birthTime;
    $('#f-time').value = p.birthTime ?? '08:00';
    $('#f-time').disabled = !p.birthTime;
    $('#f-place').value = D.PLACES.some((x) => x.id === p.placeId) ? p.placeId : 'custom';
    $('#f-lon').value = Number.isFinite(p.lon) ? p.lon : 105.85;
    // Hồ sơ cũ (chưa có region) luôn lưu tz=7 mặc định → chuyển sang tự động; tz=8 là chủ động chọn → giữ.
    const legacy = !REGIONS.includes(p.region);
    $('#f-region').value = legacy ? 'bac' : p.region;
    const tz = legacy && p.tz === 7 ? null : p.tz;
    $('#f-tz').value = TZ_MANUAL.includes(tz) ? String(tz) : 'auto';
    $('#f-zi').value = String(p.ziSect === 2 ? 2 : 1);
    $('#f-tst').checked = p.useTrueSolar !== false;
    syncBirthAndPlace();
  }

  /**
   * Tự động hóa ngầm nơi sinh, kinh độ và múi giờ lịch sử theo năm sinh:
   * - Sau 13/06/1975: toàn quốc dùng UTC+7 → ẩn vùng, ẩn chọn múi giờ, xử lý ngầm.
   * - Trước 13/06/1975:
   *   + Nếu nơi sinh đã biết (Hà Nội, TP.HCM...): tự động gán vùng và tính civilTz, hiện badge thông báo tinh tế.
   *   + Nếu nơi sinh là "Khác" (hoặc chưa xác định được vùng): tự động hiện chọn Vùng để người dùng nhập.
   * - Kinh độ: ẩn mặc định, chỉ hiện khi chọn nơi sinh "Khác".
   */
  function syncBirthAndPlace() {
    const iso = $('#f-date').value;
    const placeId = $('#f-place').value;
    const pl = D.PLACES.find((x) => x.id === placeId);
    const isCustom = placeId === 'custom';

    // 1. Kinh độ: tự động điền theo nơi sinh, chỉ hiện khi chọn "Khác"
    if (pl?.lon != null) $('#f-lon').value = pl.lon;
    const wrapLon = $('#wrap-lon');
    if (wrapLon) wrapLon.classList.toggle('hidden', !isCustom);

    // 2. Múi giờ lịch sử theo năm/ngày sinh
    let isHistorical = false;
    let y = 0, m = 0, d = 0;
    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      [y, m, d] = iso.split('-').map(Number);
      if (y * 10000 + m * 100 + d < 19750613) isHistorical = true;
    }

    const wrapRegion = $('#wrap-region');
    const noticeEl = $('#tz-auto-notice');

    if (!isHistorical) {
      // Sau 13/06/1975: thống nhất UTC+7 toàn quốc
      if (pl?.region && pl.region !== 'unknown') $('#f-region').value = pl.region;
      if (wrapRegion) wrapRegion.classList.add('hidden');
      if (noticeEl) {
        noticeEl.classList.add('hidden');
        noticeEl.textContent = '';
      }
    } else {
      // Trước 13/06/1975:
      if (pl?.region && pl.region !== 'unknown') {
        // Tự động nhận diện được vùng từ tỉnh thành đã chọn
        $('#f-region').value = pl.region;
        if (wrapRegion) wrapRegion.classList.add('hidden');
        if (noticeEl) {
          const C = NT.calendar;
          const autoTz = C.civilTz(y, m, d, pl.region);
          const regName = pl.region === 'nam' ? 'Miền Nam' : 'Miền Bắc';
          noticeEl.classList.remove('hidden');
          const notes = C.civilTzNote(y, m, d, pl.region);
          noticeEl.innerHTML = `📍 <b>Tự động nhận diện múi giờ lịch sử:</b> UTC+${C.fmtTz(autoTz)} (${regName} thời kỳ ${y}).`
            + (notes.length ? ` ⚠️ ${esc(notes.join(' '))} Đổi ở "Tùy chọn nâng cao" bên dưới.` : '');
          if (notes.length) $('#advanced-opts')?.setAttribute('open', '');
        }
      } else {
        // Nơi sinh "Khác" hoặc chưa rõ vùng -> cần người dùng input
        if (wrapRegion) wrapRegion.classList.remove('hidden');
        if (noticeEl) {
          noticeEl.classList.remove('hidden');
          noticeEl.innerHTML = '⚠️ <i>Sinh trước 13/06/1975 tại nơi sinh tùy chỉnh: Vui lòng chọn Vùng nơi sinh bên dưới để ứng dụng tính đúng múi giờ lịch sử.</i>';
        }
      }
    }

    updateTzHint();
  }

  /** Gợi ý giờ đồng hồ theo ngày sinh + vùng (PRD §6.3). */
  function updateTzHint() {
    const hint = $('#tz-hint');
    const iso = $('#f-date').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) { hint.textContent = TZ_HINT_DEFAULT; return; }
    const [y, m, d] = iso.split('-').map(Number);
    const region = $('#f-region').value;
    const C = NT.calendar;
    const auto = C.civilTz(y, m, d, region === 'nam' ? 'nam' : 'bac');
    const manual = Number($('#f-tz').value);
    const parts = [TZ_MANUAL.includes(manual)
      ? `Đang dùng UTC+${manual} (chọn tay). Đề xuất theo thời kỳ: UTC+${C.fmtTz(auto)}.`
      : `Tự động: UTC+${C.fmtTz(auto)} cho ngày ${pad(d)}/${pad(m)}/${y}.`];
    parts.push(...C.civilTzNote(y, m, d, region));
    if (!C.inVerifiedRange(y)) parts.push(`Năm ${y} ngoài vùng kiểm chứng ${C.VERIFIED_RANGE.from}–${C.VERIFIED_RANGE.to}: âm lịch chỉ để tham khảo.`);
    hint.textContent = parts.join(' ');
  }

  function validateProfile(p) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.birthDate)) return 'Vui lòng nhập ngày sinh.';
    const y = Number(p.birthDate.slice(0, 4));
    const R = NT.calendar.SUPPORTED_RANGE;
    if (y < R.from || y > R.to) return `Năm sinh cần trong khoảng ${R.from}–${R.to}.`;
    if (!Number.isFinite(p.lon) || p.lon < -180 || p.lon > 180) return 'Kinh độ không hợp lệ.';
    return null;
  }

  /* ------------------------------ Khởi tạo ------------------------------ */
  function initPlaces() {
    const sel = $('#f-place');
    sel.innerHTML = D.PLACES.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('');
    sel.value = 'hn';
    sel.addEventListener('change', () => {
      syncBirthAndPlace();
      if (sel.value === 'custom') $('#f-lon').focus();
    });
    $('#f-lon').addEventListener('input', () => {
      const pl = D.PLACES.find((x) => x.id === sel.value);
      if (pl?.lon != null && Number.parseFloat($('#f-lon').value) !== pl.lon) {
        sel.value = 'custom';
        syncBirthAndPlace();
      }
    });
    $('#f-unknown-time').addEventListener('change', (e) => { $('#f-time').disabled = e.target.checked; });
    $('#f-date').addEventListener('change', syncBirthAndPlace);
    $('#f-date').addEventListener('input', syncBirthAndPlace);
    for (const id of ['#f-region', '#f-tz']) $(id).addEventListener('change', updateTzHint);
    syncBirthAndPlace();
  }

  function initActivities() {
    const grid = $('#act-grid');
    const items = [...NT.activities.ACTIVITIES, { id: 'custom', label: 'Việc tùy chỉnh', icon: '✨', desc: 'Tự đặt tên, chọn ngũ hành của việc' }];
    grid.innerHTML = items.map((a, i) => `
      <label class="act-card" for="act-${a.id}">
        <input type="radio" name="activity" id="act-${a.id}" value="${a.id}" ${i === 0 ? 'checked' : ''}>
        <span class="act-body"><span class="act-icon" aria-hidden="true">${a.icon}</span>
          <span><span class="act-title">${esc(a.label)}</span><span class="act-desc">${esc(a.desc)}</span></span></span>
      </label>`).join('');
    grid.addEventListener('change', () => {
      $('#custom-panel').classList.toggle('hidden', $('input[name="activity"]:checked').value !== 'custom');
      syncFixedOnly();
    });
    $('#c-base').innerHTML += NT.activities.ACTIVITIES.map((a) => `<option value="${a.id}">${esc(a.label)}</option>`).join('');
  }

  const MEDICAL_NOTE = 'Chỉ định y khoa của bác sĩ chuyên khoa là quyết định duy nhất và tối cao. Hãy nhập đúng ngày giờ bác sĩ đã ấn định; ứng dụng chỉ hiển thị thông tin tham khảo, không gợi ý đổi ngày.';
  const FIXED_NOTE = 'Việc này chỉ xem thông tin cho ngày giờ đã được ấn định. Hãy nhập đúng ngày giờ đó.';

  /** Việc có lịch đã ấn định (y tế, an táng): chỉ nhập một ngày + giờ cố định. */
  function syncFixedOnly() {
    const act = NT.activities.byId($('input[name="activity"]:checked')?.value);
    const on = !!act?.fixedOnly;
    for (const id of ['#to-wrap', '#quick-ranges', '#mode-title', '#mode-wrap', '#skip-weekend-wrap']) $(id).classList.toggle('hidden', on);
    $('#fixed-wrap').classList.toggle('hidden', !on && state.mode !== 'fixed');
    $('#t-from-label').textContent = on ? 'Ngày đã ấn định' : 'Từ ngày';
    const note = $('#fixed-only-note');
    note.classList.toggle('hidden', !on);
    note.textContent = on ? (act.isMedical ? MEDICAL_NOTE : FIXED_NOTE) : '';
  }

  function initRange() {
    const from = todayISO();
    $('#t-from').value = from;
    $('#t-to').value = addDaysISO(from, 90);
    $('#quick-ranges').addEventListener('click', (e) => {
      const b = e.target.closest('[data-days]');
      if (!b) return;
      $$('#quick-ranges .chip-btn').forEach((x) => x.classList.toggle('active', x === b));
      const f = $('#t-from').value || todayISO();
      $('#t-from').value = f;
      $('#t-to').value = addDaysISO(f, Number(b.dataset.days));
    });
    $$('input[name="mode"]').forEach((r) => r.addEventListener('change', () => {
      state.mode = $('input[name="mode"]:checked').value;
      $('#fixed-wrap').classList.toggle('hidden', state.mode !== 'fixed');
    }));
  }

  /* ------------------------------ Lá số ------------------------------ */
  function buildChartFromForm({ silent = false } = {}) {
    const p = readProfileForm();
    const err = validateProfile(p);
    if (err) { if (!silent) toast(err, true); return null; }
    try {
      state.chart = NT.bazi.buildChart(p);
      state.nameInfo = NT.nameElement.analyzeName(p.name);
      renderChart();
      return state.chart;
    } catch (ex) {
      console.error(ex);
      if (!silent) toast(`Không lập được lá số: ${ex.message}`, true);
      return null;
    }
  }

  function pillarHTML(label, info, isDm) {
    if (!info) {
      return `<div class="pillar unknown"><div class="pillar-label">${label}</div><div class="pillar-god">&nbsp;</div>
        <div class="pillar-char">?<br>?</div><div class="pillar-vi">Không rõ giờ</div></div>`;
    }
    return `<div class="pillar ${isDm ? 'is-dm' : ''}">
      <div class="pillar-label">${label}</div>
      <div class="pillar-god">${esc(info.tenGod)}</div>
      <div class="pillar-char"><span class="el-${EL_KEY[info.ganEl]}">${info.ganHan}</span><br><span class="el-${EL_KEY[info.zhiEl]}">${info.zhiHan}</span></div>
      <div class="pillar-vi">${esc(info.ganVi)} ${esc(info.zhiVi)}</div>
      <div class="pillar-hidden">${info.hidden.map((h) => `<span title="${esc(h.tenGod)}"><b class="han el-${EL_KEY[h.el]}">${h.han}</b> ${esc(h.tenGod)}</span>`).join('')}</div>
      <div class="pillar-nayin">${esc(info.nayin)}</div>
    </div>`;
  }

  function renderChart() {
    const c = state.chart, n = state.nameInfo, p = c.profile;
    const PI = c.pillarInfo;
    const roleName = { dung: 'Dụng', hy: 'Hỷ', nhan: 'Nhàn', cuu: 'Cừu', ky: 'Kỵ' };
    const roleOfEl = (e) => Object.keys(c.roles).find((k) => c.roles[k] === e);
    const place = D.PLACES.find((x) => x.id === p.placeId);
    $('#chart-meta').textContent = `${p.gender === 'female' ? 'Nữ' : 'Nam'} · ${p.birthDate.split('-').reverse().join('/')}${p.birthTime ? ' ' + p.birthTime : ''} · ${place?.lon != null ? place.name : 'Kinh độ ' + p.lon} · ${REGION_LABEL[c.region] ?? REGION_LABEL.bac}`;

    const bars = c.pct.map((v, e) => {
      const r = roleOfEl(e);
      return `<div class="el-row"><span class="el-${EL_KEY[e]}"><b>${D.ELEMENTS[e].vi}</b> <span class="han">${D.ELEMENTS[e].han}</span></span>
        <div class="el-track"><div class="el-fill bg-${EL_KEY[e]}" data-w="${v.toFixed(1)}"></div></div>
        <span class="el-role ${r}">${v.toFixed(0)}% · ${roleName[r]}</span></div>`;
    }).join('');

    const gaugePos = Math.max(2, Math.min(98, ((c.ratio - 0.2) / 0.6) * 100));
    const roleChips = ['dung', 'hy', 'nhan', 'cuu', 'ky'].map((k) => {
      const e = c.roles[k];
      const cls = k === 'dung' || k === 'hy' ? 'good' : k === 'nhan' ? '' : 'bad';
      return `<span class="role-chip ${cls} bg-${EL_KEY[e]}"><span class="dot"></span>${roleName[k]} thần: <b class="el-${EL_KEY[e]}">${D.ELEMENTS[e].vi}</b></span>`;
    }).join('');

    const pills = [];
    pills.push(`<span class="info-pill">Tuổi âm lịch: <b>${D.ganZhiVi(c.tuoi.gan, c.tuoi.zhi)}</b> (${D.ZHI_ANIMAL[c.tuoi.zhi]})</span>`);
    pills.push(`<span class="info-pill">Ngày sinh âm lịch: <b>${c.lunarVN.day}/${c.lunarVN.month}${c.lunarVN.leap ? ' nhuận' : ''}/${c.lunarVN.year}</b></span>`);
    const fmtTz = NT.calendar.fmtTz;
    pills.push(`<span class="info-pill">Giờ đồng hồ: <b>UTC+${fmtTz(c.tz)}</b> (${c.tzAuto ? 'tự động' : 'chọn tay'}) · dựng âm lịch theo UTC+${fmtTz(c.calTz)}</span>`);
    if (c.flags?.includes('OUT_OF_VERIFIED_RANGE')) {
      const R = NT.calendar.VERIFIED_RANGE;
      pills.push(`<span class="info-pill warn">Ngoài vùng kiểm chứng ${R.from}–${R.to}: <b>âm lịch, can chi chỉ để tham khảo</b></span>`);
    }
    if (c.alternative) {
      const a = c.alternative, ap = a.pillars;
      const gz = (x) => (x ? D.ganZhiVi(x.g, x.z) : '?');
      pills.push(`<span class="info-pill warn">Không rõ vùng — nếu sinh ở miền Nam (UTC+${fmtTz(a.tz)}): <b>${esc([gz(ap.year), gz(ap.month), gz(ap.day), gz(ap.hour)].join(' · '))}</b>, âm lịch <b>${a.lunarVN.day}/${a.lunarVN.month}${a.lunarVN.leap ? ' nhuận' : ''}/${a.lunarVN.year}</b></span>`);
    }
    if (c.tstInfo.applied) pills.push(`<span class="info-pill">Giờ Mặt Trời thực: <b>${esc(c.tstInfo.text)}</b></span>`);
    if (c.pattern !== 'normal') pills.push(`<span class="info-pill warn">Cách đặc biệt: <b>${c.pattern === 'tong_vuong' ? 'Tòng vượng' : 'Tòng nhược'}</b></span>`);
    if (n) {
      pills.push(`<span class="info-pill">Ngũ hành tên: ${elSpan(n.element, D.ELEMENTS[n.element].vi)} <span class="hint">(${n.words.map((w) => `${esc(w.word)}→${D.ELEMENTS[w.el].vi}`).join(', ')})</span></span>`);
    }
    const curYear = NT.calendar.solarToLunar(new Date().getDate(), new Date().getMonth() + 1, new Date().getFullYear()).year;
    for (const yy of [curYear, curYear + 1]) {
      const yw = S.yearWarnings(c, yy);
      const bad = [yw.kimLau, yw.hoangOc, yw.tamTai].filter(Boolean);
      pills.push(`<span class="info-pill ${bad.length ? 'warn' : 'ok'}">Năm ${yy} (tuổi mụ ${yw.age}): <b>${bad.length ? esc(bad.join(' · ')) : 'không phạm Kim lâu, Hoang ốc, Tam tai'}</b></span>`);
    }

    const dayun = c.daYun.length ? `<h3>Đại vận</h3><div class="dayun">${c.daYun.map((d) => `
      <div class="dayun-item ${c.currentDaYun === d ? 'current' : ''}"><span class="han"><span class="el-${EL_KEY[D.ganElement(d.g)]}">${D.GAN_HAN[d.g]}</span><span class="el-${EL_KEY[D.zhiElement(d.z)]}">${D.ZHI_HAN[d.z]}</span></span>
      <small>${D.GAN_VI[d.g]} ${D.ZHI_VI[d.z]}</small><small>${d.startYear}–${d.endYear}</small></div>`).join('')}</div>` : '';

    $('#chart-body').innerHTML = `
      <div class="pillars">
        ${pillarHTML('Năm', PI.year)}${pillarHTML('Tháng', PI.month)}${pillarHTML('Ngày', PI.day, true)}${pillarHTML('Giờ', PI.hour)}
      </div>
      <div class="chart-grid">
        <div><h3>Lực ngũ hành</h3><div class="el-bars">${bars}</div></div>
        <div>
          <h3>Vượng suy Nhật chủ</h3>
          <div class="strength-title"><b>${elSpan(c.dmEl, `${D.GAN_VI[c.dm]} ${D.ELEMENTS[c.dmEl].vi}`)} · ${esc(c.levelLabel)}</b><span class="hint">phe ta ${(c.ratio * 100).toFixed(0)}%</span></div>
          <div class="gauge"><div class="gauge-track"><div class="gauge-thumb" style="left:50%" data-left="${gaugePos.toFixed(1)}"></div></div>
            <div class="gauge-labels"><span>Nhược</span><span>Trung hòa</span><span>Vượng</span></div></div>
          <div class="roles">${roleChips}</div>
        </div>
      </div>
      <div class="info-row">${pills.join('')}</div>
      <h3>Luận giải Dụng thần</h3>
      <ul class="reasons">${c.reasons.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
      ${dayun}`;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$('#chart-body .el-fill').forEach((el) => { el.style.width = `${el.dataset.w}%`; });
      const th = $('#chart-body .gauge-thumb');
      if (th) th.style.left = `${th.dataset.left}%`;
    }));
  }

  /* ------------------------------ Tìm ngày ------------------------------ */
  function getActivity() {
    const id = $('input[name="activity"]:checked')?.value ?? 'biz_open';
    if (id !== 'custom') return NT.activities.byId(id);
    const elv = $('#c-element').value;
    return NT.activities.makeCustom({
      name: $('#c-name').value.slice(0, 60),
      element: elv === '' ? null : Number(elv),
      baseId: $('#c-base').value || null,
    });
  }

  function runFind() {
    const chart = buildChartFromForm();
    if (!chart) return;
    const act = getActivity();
    const fixedOnly = !!act.fixedOnly;
    const from = $('#t-from').value, to = fixedOnly ? from : $('#t-to').value;
    if (!from || !to) return toast('Chọn khoảng ngày cần tìm.', true);
    if (to < from) return toast('"Đến ngày" phải sau "Từ ngày".', true);
    const fixedTime = $('#t-fixed').value || '09:00';
    const mode = fixedOnly ? 'fixed' : state.mode;
    state.act = act;
    const btn = $('#btn-find');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>Đang tính toán…</span>';
    setTimeout(() => {
      try {
        state.results = S.findDays({
          chart, act, nameInfo: state.nameInfo, from, to, mode, fixedTime,
          skipWeekend: !fixedOnly && $('#t-skip-weekend').checked,
          options: {
            yearlyAsSevere: $('#t-yearly-severe')?.checked,
            hideSevere: $('#t-hide-severe')?.checked,
            useNameElement: $('#t-use-name')?.checked,
          },
        });
        state.results.fixedTime = fixedTime;
        state.results.mode = mode;
        renderResults();
        $('#card-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (ex) {
        console.error(ex);
        toast(ex.message || 'Lỗi khi tính toán', true);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Tìm ngày tốt</span>';
      }
    }, 30);
  }

  function dayCardHTML(r, idx) {
    const fixed = noIndex();
    const dsc = S.describeDay(r.ctx);
    if (calendarOnly()) {
      return `<article class="day-card" role="button" tabindex="0" aria-label="Xem thông tin lịch ngày ${fmtDate(r.ctx)}" data-key="${r.key}" id="day-card-${r.key}">
      <div class="day-top">
        <div class="info-badge" aria-hidden="true">📅</div>
        <div><div class="day-date">${dsc.weekday}, ${fmtDate(r.ctx)}</div>
          <div class="day-sub">Âm lịch ${esc(dsc.lunarText)}</div>
          <div class="day-sub">Ngày ${esc(dsc.ganZhi)} · Tháng ${esc(dsc.monthGanZhi)}</div></div>
      </div>
      <div class="tags">${dsc.jieqi ? `<span class="tag">${esc(dsc.jieqi)}</span>` : ''}</div>
      <div class="hours-row">Giờ đã định: <span class="hour-chip">${esc(r.chosen.label)}</span> (giờ ${esc(r.chosen.ganZhi)})</div>
    </article>`;
    }
    const pos = r.day.items.filter((i) => i.pts > 0).sort((a, b) => b.pts - a.pts).slice(0, 3);
    const neg = r.day.items.filter((i) => i.pts < 0).sort((a, b) => a.pts - b.pts).slice(0, 1);
    const hours = (r.bestHours.length ? r.bestHours : [r.chosen])
      .map((h) => `<span class="hour-chip" title="${esc(h.ganZhi)} · ${esc(h.tianShen)}">${esc(h.label)}</span>`).join('');
    const head = fixed
      ? '<div class="info-badge" aria-hidden="true">📅</div>'
      : `<div class="ring ${gradeClass(r.grade)}" style="--p:${r.score}"><b>${r.score}</b></div>`;
    const why = fixed
      ? r.day.items.slice(0, 5).map((i) => `<li>${esc(neutral(i.text))}</li>`)
      : [...pos, ...neg].map((i) => `<li><b class="pts ${i.pts > 0 ? 'pos' : 'neg'}">${i.pts > 0 ? '+' : ''}${i.pts}</b> ${esc(i.text)}</li>`);
    const legalFlags = NT.legal?.checkLegal ? NT.legal.checkLegal(state.act, state.chart, r.ctx.key, r.chosen.label.slice(0, 5)) : [];
    const legalTag = legalFlags.length ? `<span class="flag-legal" title="${esc(legalFlags[0].message)}">⚖️ Lưu ý pháp luật</span>` : '';
    return `<article class="day-card" role="button" tabindex="0" aria-label="Xem chi tiết ngày ${fmtDate(r.ctx)}" data-key="${r.key}" id="day-card-${r.key}" style="animation-delay:${idx * 0.04}s">
      ${fixed ? '' : `<span class="rank">#${idx + 1}</span>`}
      <div class="day-top">
        ${head}
        <div><div class="day-date">${dsc.weekday}, ${fmtDate(r.ctx)} ${legalTag}</div>
          <div class="day-sub">Âm lịch ${esc(dsc.lunarText)}</div>
          <div class="day-sub">Ngày ${esc(dsc.ganZhi)}</div>
          ${fixed ? '' : `<span class="grade ${gradeClass(r.grade)}">${esc(r.grade.label)}</span>`}</div>
      </div>
      <div class="tags">
        <span class="tag ${fixed ? '' : (dsc.huangDao ? 'good' : 'bad')}">${dsc.huangDao ? 'Hoàng đạo' : 'Hắc đạo'} · ${esc(dsc.tianShen)}</span>
        <span class="tag">Trực ${esc(dsc.zhixing)}</span>
        <span class="tag ${fixed ? '' : (dsc.xiuGood ? 'good' : 'bad')}">Sao ${esc(dsc.xiu)}</span>
        ${dsc.jieqi ? `<span class="tag">${esc(dsc.jieqi)}</span>` : ''}
      </div>
      <div class="hours-row">${state.results.mode === 'fixed' ? 'Giờ cố định:' : 'Giờ tốt:'} ${hours}</div>
      <ul class="why">${why.join('')}</ul>
    </article>`;
  }

  function renderResults() {
    const res = state.results;
    const fixedOnly = noIndex();
    $('#card-results').classList.remove('hidden');
    $('#h-results').textContent = fixedOnly ? `Thông tin ngày giờ đã định: ${state.act.label}` : `Ngày tốt cho: ${state.act.label}`;
    for (const id of ['#heatmap-title', '#legend', '#heatmap']) $(id).classList.toggle('hidden', fixedOnly);

    if (fixedOnly) {
      // Không chỉ số, không xếp loại, không thống kê tốt/xấu, không lịch nhiệt (PRD §3.1, §8.4 điều 4).
      $('#summary-stats').innerHTML = `<div class="stat"><b>${res.days.length}</b>ngày đã định · giờ ${esc(res.fixedTime)}</div>`;
      $('#top-list').innerHTML = `<p class="disclaimer">${esc(state.act.isMedical ? MEDICAL_NOTE : FIXED_NOTE)}</p>` + legalBannerHTML(res.days) + res.days.map(dayCardHTML).join('');
      $('#heatmap').innerHTML = '';
      $('#legend').innerHTML = '';
      return;
    }

    const severeCount = res.days.filter((d) => d.severe).length;
    const goodCount = res.ranked.filter((d) => d.score >= 68).length;
    $('#summary-stats').innerHTML = `
      <div class="stat"><b>${res.days.length}</b>ngày đã quét (${res.ms} ms)</div>
      <div class="stat"><b>${goodCount}</b>ngày Cát trở lên</div>
      <div class="stat"><b>${severeCount}</b>ngày có điều kỵ nặng</div>`;

    const top = res.ranked.slice(0, TOP_N);
    $('#top-list').innerHTML = legalBannerHTML(res.days) + (top.length
      ? top.map(dayCardHTML).join('')
      : '<div class="empty-state"><div class="big-han">擇</div><p>Không có ngày phù hợp trong danh sách đề xuất. Hãy mở rộng khoảng thời gian, đổi giờ cố định, hoặc tắt bộ lọc "Ẩn ngày có điều kỵ nặng" để xem tất cả các ngày.</p></div>');

    const topKeys = new Set(top.map((x) => x.key));
    const months = new Map();
    for (const r of res.days) {
      const mk = `${r.ctx.y}-${pad(r.ctx.m)}`;
      if (!months.has(mk)) months.set(mk, []);
      months.get(mk).push(r);
    }
    const dows = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => `<span class="dow">${d}</span>`).join('');
    $('#heatmap').innerHTML = [...months.entries()].map(([mk, arr]) => {
      const [yy, mm] = mk.split('-');
      const firstDow = (new Date(Date.UTC(+yy, +mm - 1, 1)).getUTCDay() + 6) % 7;
      const lead = (arr[0].ctx.d - 1 + firstDow) % 7;
      const cells = Array.from({ length: lead }, () => '<span class="cell empty"></span>').join('') + arr.map((r) => {
        const cls = ['cell', gradeClass(r.grade), r.severe ? 'bad' : '', r.excluded ? 'dim' : '', topKeys.has(r.key) ? 'top' : ''].join(' ');
        const alpha = r.severe ? 1 : (0.25 + (r.score / 100) * 0.75).toFixed(2);
        return `<button type="button" class="${cls}" style="--a:${alpha}" data-key="${r.key}" title="${fmtDate(r.ctx)} · ${r.score} điểm · ${esc(r.grade.label)}">${r.ctx.d}</button>`;
      }).join('');
      return `<div class="month"><h4>Tháng ${+mm}/${yy}</h4><div class="month-grid">${dows}${cells}</div></div>`;
    }).join('');

    $('#legend').innerHTML = [['g5', 'Đại cát ≥80'], ['g4', 'Cát 68–79'], ['g3', 'Khá 55–67'], ['g2', 'Bình thường 40–54'], ['g1', 'Nên cân nhắc <40'], ['bad', 'Có điều kỵ nặng']]
      .map(([k, t]) => `<span class="c-${k}"><i></i>${t}</span>`).join('') + '<span><i style="--c:transparent;box-shadow:0 0 0 2px var(--gold)"></i>Top đề xuất</span>';
  }

  /** Giới hạn pháp luật của một ngày kết quả (PRD §3.2). */
  const legalFlagsOf = (r) => (NT.legal?.checkLegal ? NT.legal.checkLegal(state.act, state.chart, r.ctx.key, r.chosen.label.slice(0, 5)) : []);
  /** Câu chữ của các cảnh báo cứng — phải có cả trong bản sao chép và tệp .ics. */
  const hardWarningTexts = (r) => legalFlagsOf(r).filter((f) => f.severity === 'hard_warning').map((f) => `${f.message} (Căn cứ: ${f.rule.doc}; chưa đối chiếu văn bản gốc.)`);
  /** Biểu ngữ cảnh báo cứng ở đầu kết quả, không tắt được. */
  function legalBannerHTML(days) {
    const hit = days.filter((r) => legalFlagsOf(r).some((f) => f.severity === 'hard_warning'));
    if (!hit.length) return '';
    const f = legalFlagsOf(hit[0]).find((x) => x.severity === 'hard_warning');
    const scope = hit.length === days.length ? 'mọi ngày trong kết quả' : `${hit.length}/${days.length} ngày trong kết quả`;
    return `<div class="legal-alert" role="alert" style="margin-bottom:14px;padding:10px 14px;border-radius:8px;background:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.4);color:#fca5a5">
      <b>⚖️ ${esc(f.rule.name)}</b> — áp dụng cho ${scope}. ${esc(f.message)}
      <small style="display:block;opacity:0.8;margin-top:2px">Căn cứ: ${esc(f.rule.doc)} (chưa đối chiếu văn bản gốc)</small></div>`;
  }

  /* ------------------------------ Chi tiết ngày ------------------------------ */
  function itemsHTML(items, fixed = false) {
    if (fixed) return `<ul class="score-items no-index">${items.map((i) => `<li class="note">${esc(neutral(i.text))}</li>`).join('')}</ul>`;
    return `<ul class="score-items">${items.map((i) => `<li class="${i.severe ? 'severe' : ''}"><span class="pts ${i.pts > 0 ? 'pos' : 'neg'}">${i.pts > 0 ? '+' : ''}${i.pts}</span><span>${esc(i.text)}${i.severe ? ' <b class="pts neg">(kỵ nặng)</b>' : ''}</span></li>`).join('')}</ul>`;
  }

  function openDay(key) {
    const r = state.results?.days.find((x) => x.key === key);
    if (!r) return;
    const dsc = S.describeDay(r.ctx);
    const fixed = noIndex();
    const ring = $('#dlg-ring');
    const g = $('#dlg-grade');
    if (fixed) {
      ring.className = 'info-badge lg';
      ring.style.removeProperty('--p');
      $('#dlg-score').textContent = '📅';
      g.className = 'grade hidden';
      g.textContent = '';
    } else {
      ring.className = `ring lg ${gradeClass(r.grade)}`;
      ring.style.setProperty('--p', r.score);
      $('#dlg-score').textContent = r.score;
      g.className = `grade ${gradeClass(r.grade)}`;
      g.textContent = `${r.grade.label} · ngày ${r.day.score} / giờ ${r.chosen.score}`;
    }
    $('#dlg-title').textContent = `${dsc.weekday}, ${fmtDate(r.ctx)}`;
    $('#dlg-sub').textContent = `Âm lịch ${dsc.lunarText} · Ngày ${dsc.ganZhi} · Tháng ${dsc.monthGanZhi}`;

    if (calendarOnly()) {
      $('#dlg-body').innerHTML = `
      <p class="disclaimer" style="margin-top:0">${esc(MEDICAL_NOTE)}</p>
      <h3 style="margin-top:0">Thông tin lịch</h3>
      <dl class="kv">
        <dt>Dương lịch</dt><dd>${esc(dsc.weekday)}, ${fmtDate(r.ctx)}</dd>
        <dt>Âm lịch</dt><dd>${esc(dsc.lunarText)}</dd>
        <dt>Can chi</dt><dd>Ngày ${esc(dsc.ganZhi)} · Tháng ${esc(dsc.monthGanZhi)}</dd>
        <dt>Giờ đã định</dt><dd>${esc(r.chosen.label)} (giờ ${esc(r.chosen.ganZhi)})</dd>
        ${dsc.jieqi ? `<dt>Tiết khí</dt><dd>${esc(dsc.jieqi)}</dd>` : ''}
      </dl>
      <p class="hint">Với lịch mổ, sinh mổ và điều trị do bác sĩ chỉ định, ứng dụng không xem ngày tốt xấu.</p>
      <h3>Thao tác</h3>
      <div class="sheet-actions">
        <button type="button" class="btn" id="dlg-ics">📅 Thêm vào lịch (.ics)</button>
        <button type="button" class="btn" id="dlg-copy">📋 Sao chép tóm tắt</button>
      </div>`;
      $('#dlg-ics').addEventListener('click', () => downloadICS(r));
      $('#dlg-copy').addEventListener('click', () => copySummary(r, dsc));
      const dlgEl = $('#day-dialog');
      if (!dlgEl.open) dlgEl.showModal();
      $('#dlg-body').scrollTop = 0;
      return;
    }

    const groups = Object.keys(CAT_LABEL).map((cat) => {
      const its = r.day.items.filter((i) => i.cat === cat);
      return its.length ? `<div class="cat-title">${CAT_LABEL[cat]}</div>${itemsHTML(its, fixed)}` : '';
    }).join('');

    const bestKey = r.chosen.label;
    const hourRows = r.hours.map((h) => `
      <tr class="${h.label === bestKey ? 'best' : ''}">
        <td><b>${esc(h.label)}</b>${h.tag ? `<br><span class="hint">${esc(h.tag)}</span>` : ''}</td>
        <td>${esc(h.ganZhi)}</td>
        <td><span class="tag ${fixed ? '' : (h.huangDao ? 'good' : 'bad')}">${esc(h.tianShen)}</span></td>
        ${fixed ? '' : `<td class="${gradeClass(S.gradeOf(h.score, h.severe))}"><div class="mini-bar"><i style="width:${h.score}%"></i></div> ${h.score}</td>`}
        <td class="hint">${h.items.filter((i) => !/^Giờ (Hoàng|Hắc) đạo/.test(i.text) && (i.severe || Math.abs(i.pts) >= 3)).slice(0, 2).map((i) => esc(neutral(i.text))).join('; ')}</td>
      </tr>`).join('');

    const list = (arr) => arr.length ? arr.map((x) => `<span class="tag">${esc(x)}</span>`).join(' ') : '<span class="hint">—</span>';
    const note = fixed ? `<p class="disclaimer" style="margin-top:0">${esc(state.act.isMedical ? MEDICAL_NOTE : FIXED_NOTE)}</p>` : '';
    const legalFlags = NT.legal?.checkLegal ? NT.legal.checkLegal(state.act, state.chart, r.ctx.key, r.chosen.label.slice(0, 5)) : [];
    const legalAlert = legalFlags.length
      ? `<div class="legal-alert" style="margin-bottom:14px;padding:10px 14px;border-radius:8px;background:rgba(220,38,38,0.15);border:1px solid rgba(220,38,38,0.4);color:#fca5a5">
          ${legalFlags.map((f) => `<div style="margin-bottom:6px"><b>⚖️ ${esc(f.rule.name)}</b>: ${esc(f.message)}<small style="display:block;opacity:0.8;margin-top:2px">Căn cứ: ${esc(f.rule.doc)} (chưa đối chiếu văn bản gốc)</small></div>`).join('')}
        </div>`
      : '';
    $('#dlg-body').innerHTML = `
      ${note}
      ${legalAlert}
      <div class="sheet-cols">
        <div>
          <h3 style="margin-top:0">${fixed ? 'Thông tin tham khảo' : 'Vì sao có điểm này'}</h3>
          ${groups}
          <div class="cat-title">Giờ ${esc(r.chosen.label)} (${esc(r.chosen.ganZhi)})</div>
          ${itemsHTML(r.chosen.items, fixed)}
        </div>
        <div>
          <h3 style="margin-top:0">Giờ trong ngày</h3>
          <table class="hours-table"><thead><tr><th>Giờ</th><th>Can chi</th><th>Thần</th>${fixed ? '' : '<th>Điểm</th>'}<th>Ghi chú</th></tr></thead><tbody>${hourRows}</tbody></table>
          <h3>Hoàng lịch</h3>
          <dl class="kv">
            <dt>Trực</dt><dd>${esc(dsc.zhixing)}</dd>
            <dt>Sao (28 tú)</dt><dd>${esc(dsc.xiu)} · ${dsc.xiuGood ? 'Cát' : (fixed ? 'Không thuận' : 'Hung')}</dd>
            <dt>Thần ngày</dt><dd>${esc(dsc.tianShen)} · ${dsc.huangDao ? 'Hoàng đạo' : 'Hắc đạo'}</dd>
            <dt>Xung</dt><dd>${esc(dsc.chong)}</dd>
            ${dsc.jieqi ? `<dt>Tiết khí</dt><dd>${esc(dsc.jieqi)}</dd>` : ''}
            <dt>Nên</dt><dd>${list(dsc.yi)}</dd>
            <dt>Kỵ</dt><dd>${list(dsc.ji)}</dd>
            <dt>Cát thần</dt><dd>${list(dsc.jiShen)}</dd>
            <dt>${fixed ? 'Sao cần lưu ý' : 'Hung sát'}</dt><dd>${list(dsc.xiongSha)}</dd>
          </dl>
          <p class="hint">Nghi/Kỵ, thần sát dựa trên truyền thống Hiệp Kỷ Biện Phương Thư (协纪辨方书); dữ liệu chưa đối chiếu với sách gốc.</p>
        </div>
      </div>
      <p class="disclaimer">${esc(DISCLAIMER)}</p>
      <h3>Thao tác</h3>
      <div class="sheet-actions">
        <button type="button" class="btn" id="dlg-ics">📅 Thêm vào lịch (.ics)</button>
        <button type="button" class="btn" id="dlg-copy">📋 Sao chép tóm tắt</button>
      </div>`;
    $('#dlg-ics').addEventListener('click', () => downloadICS(r));
    $('#dlg-copy').addEventListener('click', () => copySummary(r, dsc));
    const dlg = $('#day-dialog');
    if (!dlg.open) dlg.showModal();
    $('#dlg-body').scrollTop = 0;
  }

  /* ------------------------------ Xuất lịch / sao chép ------------------------------ */
  function hourRange(r) {
    const m = /^(\d{2}):(\d{2})(?:–(\d{2}):(\d{2}))?/.exec(r.chosen.label);
    const sh = +m[1], sm = +m[2];
    let eh = m[3] != null ? +m[3] : sh + 1, em = m[4] != null ? +m[4] : sm;
    if (m[3] != null) { em += 1; if (em === 60) { em = 0; eh += 1; } }
    if (eh >= 24) { eh = 23; em = 59; }
    return [sh, sm, eh, em];
  }
  const icsEsc = (s) => String(s).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n');

  function downloadICS(r) {
    const [sh, sm, eh, em] = hourRange(r);
    const ymd = `${r.ctx.y}${pad(r.ctx.m)}${pad(r.ctx.d)}`;
    const now = new Date();
    const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
    const dsc = S.describeDay(r.ctx);
    const fixed = noIndex();
    const summary = fixed ? state.act.label : `${state.act.label} (${r.grade.label} ${r.score}/100)`;
    const desc = [
      calendarOnly()
        ? `Ngày ${dsc.ganZhi}, âm lịch ${dsc.lunarText}. Giờ ${r.chosen.label} (${r.chosen.ganZhi}).`
        : `Ngày ${dsc.ganZhi}, âm lịch ${dsc.lunarText}. Giờ ${r.chosen.label} (${r.chosen.ganZhi}, ${r.chosen.tianShen}).`,
      fixed ? (state.act.isMedical ? MEDICAL_NOTE : FIXED_NOTE) : '',
      ...hardWarningTexts(r),
      DISCLAIMER, 'Lập bởi Ngày Tốt.',
    ].filter(Boolean).join(' ');
    const body = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NgayTot//VI', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${newId()}@ngaytot`, `DTSTAMP:${stamp}`,
      `DTSTART:${ymd}T${pad(sh)}${pad(sm)}00`, `DTEND:${ymd}T${pad(eh)}${pad(em)}00`,
      `SUMMARY:${icsEsc(summary)}`,
      `DESCRIPTION:${icsEsc(desc)}`,
      'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `ngay-tot-${r.key}.ics` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Đã tạo file lịch .ics');
  }

  async function copySummary(r, dsc) {
    const fixed = noIndex();
    const lines = fixed
      ? [
        `${state.act.label}: ${dsc.weekday}, ${fmtDate(r.ctx)} (ÂL ${dsc.lunarText})`,
        `Ngày ${dsc.ganZhi} · Giờ ${r.chosen.label} (${r.chosen.ganZhi})`,
        state.act.isMedical ? MEDICAL_NOTE : FIXED_NOTE,
        ...r.day.items.map((i) => `- ${neutral(i.text)}`),
      ]
      : [
        `${state.act.label}: ${dsc.weekday}, ${fmtDate(r.ctx)} (ÂL ${dsc.lunarText})`,
        `Ngày ${dsc.ganZhi} · ${r.grade.label} ${r.score}/100 (chỉ số tham khảo) · Giờ ${r.chosen.label} (${r.chosen.ganZhi})`,
        ...r.day.items.map((i) => `${i.pts > 0 ? '+' : ''}${i.pts}  ${i.text}`),
      ];
    lines.push(...hardWarningTexts(r), '', DISCLAIMER);
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('Đã sao chép tóm tắt');
  }

  /* ------------------------------ Hồ sơ: lưu/xóa ------------------------------ */
  function saveCurrentProfile() {
    const p = readProfileForm();
    const err = validateProfile(p);
    if (err) return toast(err, true);
    const list = loadProfiles();
    const id = p.id ?? newId();
    const rec = { ...p, id };
    const idx = list.findIndex((x) => x.id === id);
    if (idx >= 0) list[idx] = rec; else list.push(rec);
    saveProfiles(list);
    localStorage.setItem(LAST_ID_KEY, id);
    refreshProfileSelect(id);
    toast(`Đã lưu hồ sơ ${p.name || ''}`.trim());
  }

  function deleteCurrentProfile() {
    const id = $('#profile-select').value;
    if (!id) return toast('Chưa chọn hồ sơ để xóa.', true);
    saveProfiles(loadProfiles().filter((x) => x.id !== id));
    if (localStorage.getItem(LAST_ID_KEY) === id) localStorage.removeItem(LAST_ID_KEY);
    refreshProfileSelect('');
    toast('Đã xóa hồ sơ');
  }

  /** Xóa mọi khóa của ứng dụng trong localStorage (PRD §3.3). */
  function clearAllData() {
    if (!confirm('Xóa toàn bộ hồ sơ và dữ liệu của Ngày Tốt trên trình duyệt này?')) return;
    Object.keys(localStorage).filter((k) => k.startsWith(KEY_PREFIX)).forEach((k) => localStorage.removeItem(k));
    location.reload();
  }

  /* ------------------------------ Wiring ------------------------------ */
  function init() {
    if (!globalThis.Solar) { toast('Không tải được thư viện lịch (vendor/lunar.js).', true); return; }
    initPlaces();
    initActivities();
    initRange();
    refreshProfileSelect();

    $('#profile-select').addEventListener('change', (e) => {
      const p = loadProfiles().find((x) => x.id === e.target.value);
      if (p) { localStorage.setItem(LAST_ID_KEY, p.id); writeProfileForm(p); buildChartFromForm(); }
      else localStorage.removeItem(LAST_ID_KEY);
    });
    $('#btn-save-profile').addEventListener('click', saveCurrentProfile);
    $('#btn-delete-profile').addEventListener('click', deleteCurrentProfile);
    $('#btn-clear-all').addEventListener('click', clearAllData);
    $('#btn-build-chart').addEventListener('click', () => {
      if (buildChartFromForm()) $('#card-chart').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('#btn-find').addEventListener('click', runFind);
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-key]');
      if (t && (t.closest('#top-list') || t.closest('#heatmap'))) openDay(t.dataset.key);
    });
    $('#top-list').addEventListener('keydown', (e) => {
      const t = e.target.closest('.day-card');
      if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDay(t.dataset.key); }
    });
    const dlg = $('#day-dialog');
    $('#dlg-close').addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

    // Bản cũ tự lưu hồ sơ vừa nhập mà người dùng không bấm Lưu → xóa (PRD §3.3).
    localStorage.removeItem(LEGACY_AUTOSAVE_KEY);
    const lastId = localStorage.getItem(LAST_ID_KEY);
    const last = lastId ? loadProfiles().find((x) => x.id === lastId) : null;
    if (last) {
      writeProfileForm(last);
      refreshProfileSelect(last.id);
      buildChartFromForm({ silent: true });
    }
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})(globalThis.NT ??= {});
