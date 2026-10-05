/**
 * NgayTot — UI controller.
 * Toàn bộ dữ liệu xử lý cục bộ; ứng dụng không lưu gì vào bộ nhớ trình duyệt (PRD §3.3, QĐ-07). Mọi chuỗi do người dùng nhập đều đi qua esc().
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
  const KEY_PREFIX = 'ngaytot.'; // khóa do phiên bản cũ để lại — chỉ để xóa khi khởi động
  const TOP_N = 12;
  const CAT_LABEL = { cal: 'Hoàng lịch', folk: 'Ngày kỵ dân gian', bazi: 'Bát tự của bạn', name: 'Ngũ hành tên (hệ số phụ)', year: 'Hạn năm' };
  const REGIONS = ['bac', 'nam', 'unknown'];
  const REGION_LABEL = { bac: 'Miền Bắc', nam: 'Miền Nam', unknown: 'Không rõ vùng' };
  const TZ_MANUAL = [7, 8, 9]; // lựa chọn tay của #f-tz; còn lại = tự động
  const TZ_HINT_DEFAULT = 'Giờ đồng hồ ở Việt Nam đã đổi nhiều lần (1943–1975). Chọn "Tự động" để ứng dụng đề xuất theo ngày sinh và vùng.';
  /** Câu miễn trừ bắt buộc trên mọi màn hình kết quả (PRD §3.4). */
  const DISCLAIMER = 'Trạch nhật là tri thức văn hóa truyền thống, chưa có kiểm chứng khoa học. Kết quả chỉ để tham khảo.';

  const state = { chart: null, nameInfo: null, results: null, act: null, mode: 'best', subject: null, legalCtx: {} };
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

  const newId = () => (crypto.randomUUID?.() ?? `p${Date.now()}${Math.random().toString(16).slice(2)}`);

  /* ------------------------------ Chủ thể xét tuổi theo việc (PRD §9.5, §9.6) ------------------------------ */
  const OWNER_OPTS = {
    male: { gender: 'male', role: 'nam gia chủ' },
    female: { gender: 'female', role: 'nữ gia chủ' },
    son: { gender: 'male', role: 'con trai trưởng' },
    borrowed: { gender: null, role: 'người được mượn tuổi' }, // giới tính do người dùng chọn
  };
  const currentActRaw = () => NT.activities.byId($('input[name="activity"]:checked')?.value) ?? null;
  /** { kind, gender (null = chọn tay), role } cho việc đang chọn. */
  function currentSubject() {
    const act = currentActRaw();
    const kind = NT.activities.subjectOf(act);
    if (kind === 'none') return { kind, gender: null, role: '' };
    if (kind === 'bride') return { kind, gender: 'female', role: 'cô dâu' };
    if (kind === 'owner') return { kind, ...(OWNER_OPTS[$('#f-owner').value] ?? OWNER_OPTS.male) };
    return { kind, gender: null, role: act?.id?.startsWith('funeral_') ? 'tang chủ' : 'người thực hiện' };
  }
  /** Chỉ hiện các trường mà việc đang chọn cần. */
  function syncSubject() {
    const sub = currentSubject();
    $('#card-profile').classList.toggle('hidden', sub.kind === 'none');
    $('#wrap-owner').classList.toggle('hidden', sub.kind !== 'owner');
    $('#wrap-gender').classList.toggle('hidden', sub.gender !== null);
    $('#wrap-groom').classList.toggle('hidden', sub.kind !== 'bride');
    $('#wrap-name').classList.toggle('hidden', !$('#t-use-name').checked);
    const title = { bride: 'Cô dâu', owner: 'Gia chủ', person: sub.role === 'tang chủ' ? 'Tang chủ' : 'Người thực hiện' }[sub.kind] ?? 'Người được xét';
    $('#h-profile-text').textContent = title;
    $('#subject-note').textContent = {
      bride: 'Cưới hỏi xét tuổi cô dâu (tập tục "lấy vợ xem tuổi đàn bà"). Người xem là nam vẫn khai ngày sinh cô dâu ở đây.',
      owner: `Đang xét tuổi: ${sub.role}.${$('#f-owner').value === 'son' ? ' Đây là dị bản ở một số nơi khi cha đã mất.' : ''}`,
    }[sub.kind] ?? '';
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
    const sub = currentSubject();
    return {
      role: sub.role,
      name: $('#t-use-name').checked ? $('#f-name').value.trim().slice(0, 80) : '',
      gender: sub.gender ?? ($('input[name="gender"]:checked').value === 'female' ? 'female' : 'male'),
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
      syncSubject();
      clearResults();
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
      state.nameInfo = p.name ? NT.nameElement.analyzeName(p.name) : null;
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
    $('#chart-meta').textContent = `${p.role ? p.role[0].toUpperCase() + p.role.slice(1) + ' · ' : ''}${p.gender === 'female' ? 'Nữ' : 'Nam'} · ${p.birthDate.split('-').reverse().join('/')}${p.birthTime ? ' ' + p.birthTime : ''} · ${place?.lon != null ? place.name : 'Kinh độ ' + p.lon} · ${REGION_LABEL[c.region] ?? REGION_LABEL.bac}`;

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

  /**
   * Bỏ kết quả đang hiện. Gọi khi việc, người được xét hoặc lá số thay đổi, hoặc khi tìm ngày thất bại,
   * để thẻ ngày cũ không bao giờ bị đọc bằng việc hay tuổi của lượt nhập mới.
   */
  function clearResults() {
    state.results = null;
    $('#card-results').classList.add('hidden');
    const dlg = $('#day-dialog');
    if (dlg.open) dlg.close();
  }
  /** Câu ghi rõ đang xét tuổi ai (PRD §9.6) — dùng ở tiêu đề, hộp chi tiết, bản sao chép và .ics. */
  const whoText = () => (state.chart && state.subject?.role
    ? `Xét tuổi ${state.subject.role} (${D.ganZhiVi(state.chart.tuoi.gan, state.chart.tuoi.zhi)})${$('#f-owner')?.value === 'son' && state.subject.kind === 'owner' ? ' — phương án con trai trưởng là dị bản ở một số nơi' : ''}` : '');

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

  /** Chú rể (tùy chọn): chỉ cần ngày sinh, dùng cho xung tuổi và tuổi kết hôn. */
  function readGroom() {
    const iso = $('#g-date').value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
    const y = Number(iso.slice(0, 4)), R = NT.calendar.SUPPORTED_RANGE;
    if (y < R.from || y > R.to) return null;
    const c = NT.bazi.buildChart({ gender: 'male', birthDate: iso, birthTime: null, lon: 105.85, region: 'bac', tz: null, ziSect: 1, useTrueSolar: false });
    return { birthDate: iso, zhi: c.tuoi.zhi };
  }

  function runFind() {
    clearResults();
    const act = getActivity();
    const sub = currentSubject();
    state.subject = sub;
    state.legalCtx = {};
    let chart = null, others = [];
    if (sub.kind === 'none') {
      state.chart = null; // lịch mổ, sinh mổ: không cần dữ liệu cá nhân (PRD §3.1, §9.5)
    } else {
      chart = buildChartFromForm();
      if (!chart) return;
      if (sub.kind === 'bride') {
        const groom = readGroom();
        if (groom) {
          others = [{ role: 'chú rể', zhi: groom.zhi }];
          state.legalCtx = { spouseBirthDate: groom.birthDate, spouseGender: 'male' };
        }
      }
    }
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
          chart, act, nameInfo: chart ? state.nameInfo : null, from, to, mode, fixedTime,
          skipWeekend: !fixedOnly && $('#t-skip-weekend').checked,
          options: {
            yearlyAsSevere: $('#t-yearly-severe')?.checked,
            hideSevere: $('#t-hide-severe')?.checked,
            useNameElement: $('#t-use-name')?.checked,
            others,
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
    // "Giờ tốt" là giờ để làm gì thì do việc quy định (PRD §8.6). Lễ cưới có nhiều mốc nên chỉ liệt kê
    // các canh hoàng đạo trong khung sinh hoạt theo thứ tự trong ngày, chưa gắn với mốc nào.
    const meaning = NT.activities.hourMeaningOf(state.act);
    const multiStep = meaning === null && state.results.mode !== 'fixed';
    const dayHours = multiStep ? r.hours.filter((h) => h.practical && h.huangDao && !h.severe) : [];
    const hours = (multiStep ? dayHours : (r.bestHours.length ? r.bestHours : [r.chosen]))
      .map((h) => (multiStep
        ? `<button type="button" class="hour-chip" data-plan-hour="${esc(h.label)}" title="${esc(h.ganZhi)} · ${esc(h.tianShen)} — bấm để xếp lịch trình với canh giờ này">${esc(h.label)}</button>`
        : `<span class="hour-chip" title="${esc(h.ganZhi)} · ${esc(h.tianShen)}">${esc(h.label)}</span>`)).join('');
    const head = fixed
      ? '<div class="info-badge" aria-hidden="true">📅</div>'
      : `<div class="ring ${gradeClass(r.grade)}" style="--p:${r.score}"><b>${r.score}</b></div>`;
    const why = fixed
      ? r.day.items.slice(0, 5).map((i) => `<li>${esc(neutral(i.text))}</li>`)
      : [...pos, ...neg].map((i) => `<li><b class="pts ${i.pts > 0 ? 'pos' : 'neg'}">${i.pts > 0 ? '+' : ''}${i.pts}</b> ${esc(i.text)}</li>`);
    const legalFlags = NT.legal?.checkLegal ? NT.legal.checkLegal(state.act, state.chart, r.ctx.key, r.chosen.label.slice(0, 5), state.legalCtx) : [];
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
      <div class="hours-row">${state.results.mode === 'fixed' ? 'Giờ cố định:' : multiStep ? 'Giờ hoàng đạo trong ngày:' : `Giờ tốt để ${esc(meaning ?? 'làm lễ')}:`} ${hours || '<span class="hint">không có trong khung 07:00–20:59</span>'}</div>
      ${multiStep ? '<div class="hint">Bấm vào một canh giờ để ứng dụng đề xuất giờ cụ thể cho từng mốc (xuất phát, vào nhà gái, về tới nhà trai) theo quãng đường.</div>' : ''}
      <ul class="why">${why.join('')}</ul>
    </article>`;
  }

  function renderResults() {
    const res = state.results;
    const fixedOnly = noIndex();
    $('#card-results').classList.remove('hidden');
    const who = whoText() ? ` — ${whoText()[0].toLowerCase()}${whoText().slice(1)}` : '';
    $('#h-results').textContent = (fixedOnly ? `Thông tin ngày giờ đã định: ${state.act.label}` : `Ngày tốt cho: ${state.act.label}`) + who;
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
  const legalFlagsOf = (r) => (NT.legal?.checkLegal ? NT.legal.checkLegal(state.act, state.chart, r.ctx.key, r.chosen.label.slice(0, 5), state.legalCtx) : []);
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
    $('#dlg-sub').textContent = `Âm lịch ${dsc.lunarText} · Ngày ${dsc.ganZhi} · Tháng ${dsc.monthGanZhi}${whoText() ? ' · ' + whoText() : ''}`;

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
    const legalFlags = NT.legal?.checkLegal ? NT.legal.checkLegal(state.act, state.chart, r.ctx.key, r.chosen.label.slice(0, 5), state.legalCtx) : [];
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
          <div class="cat-title">Giờ ${esc(r.chosen.label)} (${esc(r.chosen.ganZhi)})${fixed ? '' : NT.activities.hourMeaningOf(state.act) === null ? ' — một canh hoàng đạo trong ngày' : ` — giờ để ${esc(NT.activities.hourMeaningOf(state.act))}`}</div>
          ${itemsHTML(r.chosen.items, fixed)}
        </div>
        <div>
          <h3 style="margin-top:0">Giờ trong ngày</h3>
          ${fixed ? '' : `<p class="hint">${NT.activities.hourMeaningOf(state.act) === null
    ? 'Lễ cưới có nhiều mốc giờ (nhà trai xuất phát, vào nhà gái, về tới nhà trai), nên bảng này chỉ cho biết canh nào là giờ hoàng đạo. Dùng nút "xếp lịch trình" bên dưới để gắn giờ với từng mốc theo quãng đường.'
    : `Giờ tốt là giờ khởi sự: lúc ${esc(NT.activities.hourMeaningOf(state.act))}. Không cần làm xong trong canh giờ đó.${suggestStart(r.chosen.label)}`}</p>`}
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
        ${state.act.id === 'wed_main' ? '<button type="button" class="btn btn-secondary" id="dlg-plan">🗓️ Chọn làm ngày cưới và xếp lịch trình</button>' : ''}
      </div>`;
    $('#dlg-ics').addEventListener('click', () => downloadICS(r));
    $('#dlg-copy').addEventListener('click', () => copySummary(r, dsc));
    $('#dlg-plan')?.addEventListener('click', () => openWeddingPlan(r));
    const dlg = $('#day-dialog');
    if (!dlg.open) dlg.showModal();
    $('#dlg-body').scrollTop = 0;
  }

  /** Với việc một mốc: đề xuất giờ bắt đầu cụ thể trong canh đã chọn, cách ranh giới canh 15 phút (PRD §8.6). */
  function suggestStart(label) {
    const m = /^(\d{2}):(\d{2})–(\d{2}):(\d{2})$/.exec(label ?? '');
    if (!m) return '';
    const a = +m[1] * 60 + +m[2], b = +m[3] * 60 + +m[4] + 1;
    if (b - a < 90) return '';
    const f = (x) => `${pad(Math.floor(x / 60))}:${pad(x % 60)}`;
    return ` Đề xuất bắt đầu lúc ${f(a + 15)} (nên trong khoảng ${f(a + 15)}–${f(b - 15)}, để trễ một chút vẫn còn trong canh).`;
  }

  /* ------------------------------ Lịch trình ngày cưới (PRD §10.5) ------------------------------ */
  const planState = { r: null, result: null };

  function openWeddingPlan(r, presetHour = null) {
    planState.r = r;
    planState.result = null;
    const dsc = S.describeDay(r.ctx);
    $('#dlg-body').innerHTML = `
      <p class="hint" style="margin-top:0"><button type="button" class="link-btn" id="plan-back">← Quay lại chi tiết ngày</button></p>
      <h3 style="margin-top:0">Lịch trình ngày cưới: ${esc(dsc.weekday)}, ${fmtDate(r.ctx)}</h3>
      <p class="hint">Khai thời gian thực tế; ứng dụng xếp giờ xuất phát, giờ vào nhà gái và giờ về tới nhà trai theo giờ hoàng đạo của ngày này, tránh giờ xung tuổi ${esc(state.subject?.role ?? 'cô dâu')}${state.legalCtx?.spouseBirthDate ? ' và chú rể' : ''}.</p>
      <div class="grid-2">
        <div class="field"><label for="wp-to">Đi từ nhà trai tới nhà gái (phút)</label>
          <input class="input" type="number" id="wp-to" min="0" max="1200" step="5" value="30"></div>
        <div class="field"><label for="wp-back">Từ nhà gái về nhà trai (phút)</label>
          <input class="input" type="number" id="wp-back" min="0" max="1200" step="5" placeholder="Bằng lượt đi"></div>
        <div class="field"><label for="wp-cb">Lễ ở nhà gái (phút)</label>
          <input class="input" type="number" id="wp-cb" min="0" max="600" step="5" value="${NT.weddingPlan.DEFAULTS.ceremonyBride}"></div>
        <div class="field"><label for="wp-cg">Lễ ở nhà trai (phút)</label>
          <input class="input" type="number" id="wp-cg" min="0" max="600" step="5" value="${NT.weddingPlan.DEFAULTS.ceremonyGroom}"></div>
        <div class="field"><label for="wp-party">Giờ tiệc (nếu đã định)</label>
          <input class="input" type="time" id="wp-party"></div>
        <div class="field"><label for="wp-prio">Hai mốc ưu tiên</label>
          <select class="input" id="wp-prio">
            <option value="A,H">Vào nhà gái + về tới nhà trai</option>
            <option value="D,A">Xuất phát + vào nhà gái</option>
            <option value="D,H">Xuất phát + về tới nhà trai</option>
          </select></div>
        <div class="field"><label for="wp-akey">Gắn mốc này…</label>
          <select class="input" id="wp-akey">
            <option value="">Không gắn — ứng dụng tự chọn</option>
            <option value="A">Vào nhà gái</option>
            <option value="H">Về tới nhà trai</option>
            <option value="D">Nhà trai xuất phát</option>
          </select></div>
        <div class="field"><label for="wp-acanh">…vào canh giờ</label>
          <select class="input" id="wp-acanh">${[5, 7, 9, 11, 13, 15, 17, 19].map((h) => {
    const i = NT.weddingPlan.hourInfo(r.ctx.y, r.ctx.m, r.ctx.d, h * 60 + 60, []);
    return `<option value="${h}">${pad(h)}:00–${pad(h + 1)}:59 · giờ ${esc(i.zhiVi)} · ${i.huangDao ? 'Hoàng đạo' : 'Hắc đạo'}</option>`;
  }).join('')}</select></div>
      </div>
      <div style="margin:14px 0"><button type="button" class="btn btn-primary" id="wp-run"><span>Xếp lịch trình</span></button></div>
      <div id="wp-out" aria-live="polite"></div>
      <p class="disclaimer">${esc(DISCLAIMER)}</p>`;
    $('#plan-back').addEventListener('click', () => openDay(r.key));
    $('#wp-run').addEventListener('click', runWeddingPlan);
    $('#dlg-body').scrollTop = 0;
    const ph = /^(\d{2}):00/.exec(presetHour ?? '');
    if (ph && $(`#wp-acanh option[value="${Number(ph[1])}"]`)) {
      // Người dùng bấm một canh giờ trên thẻ ngày: gắn mốc "vào nhà gái" vào canh đó và đề xuất luôn với số liệu mặc định.
      $('#wp-akey').value = 'A';
      $('#wp-acanh').value = String(Number(ph[1]));
      runWeddingPlan();
    }
  }

  function runWeddingPlan() {
    const r = planState.r;
    const num = (id) => ($(id).value === '' ? null : Number($(id).value));
    const groom = readGroom();
    try {
      planState.result = NT.weddingPlan.plan({
        y: r.ctx.y, m: r.ctx.m, d: r.ctx.d,
        travelTo: num('#wp-to'), travelBack: num('#wp-back'),
        ceremonyBride: num('#wp-cb'), ceremonyGroom: num('#wp-cg'),
        partyTime: $('#wp-party').value || null,
        priority: $('#wp-prio').value.split(','),
        anchor: $('#wp-akey').value ? { key: $('#wp-akey').value, from: Number($('#wp-acanh').value) * 60, to: Number($('#wp-acanh').value) * 60 + 120 } : null,
        brideZhi: state.chart?.tuoi.zhi ?? null, groomZhi: groom?.zhi ?? null,
      });
    } catch (ex) {
      $('#wp-out').innerHTML = `<p class="disclaimer">${esc(ex.message)}</p>`;
      return;
    }
    const res = planState.result;
    const stepHTML = (s) => `<li class="${s.judged && !s.good ? 'severe' : ''}"><b>${esc(s.time)}</b> — ${esc(s.label)}${s.priority ? ' <span class="tag">ưu tiên</span>' : ''}
      <span class="hint">giờ ${esc(s.zhiVi)} (${esc(s.canh)}) · ${s.huangDao ? 'Hoàng đạo' : 'Hắc đạo'} · ${esc(s.tianShen)}${s.nextDay ? ' (tính theo ngày hôm sau)' : ''}${s.clash.length ? ` · xung tuổi ${esc(s.clash.join(', '))}` : ''}</span></li>`;
    const anchored = (p) => (res.anchor ? p.steps.find((s) => s.key === res.anchor.key) : null);
    const plans = res.plans.map((p, i) => `
      <div class="cat-title">${i === 0 && res.anchor ? 'Giờ đề xuất' : `Phương án ${i + 1}`} — ${p.goodCount}/3 mốc rơi vào giờ hoàng đạo, không xung tuổi</div>
      ${anchored(p) ? `<p style="margin:6px 0"><b>${esc(anchored(p).label)} lúc ${esc(anchored(p).time)}</b> <span class="hint">(trong canh ${esc(anchored(p).canh)} bạn đã chọn; các mốc khác tính theo thời gian đã khai)</span></p>` : ''}
      <ul class="score-items no-index">${p.steps.map(stepHTML).join('')}<li class="note"><b>${esc(p.endGroom)}</b> — Xong lễ ở nhà trai</li>${p.party ? stepHTML(p.party) : ''}</ul>
      ${p.notes.length ? `<ul class="why">${p.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
      <div class="sheet-actions">
        <button type="button" class="btn" data-plan-ics="${i}">📅 Thêm lịch trình vào lịch (.ics)</button>
        <button type="button" class="btn" data-plan-copy="${i}">📋 Sao chép</button>
      </div>`).join('');
    $('#wp-out').innerHTML = `
      ${res.advice.map((a) => `<p class="disclaimer">${esc(a)}</p>`).join('')}
      ${plans}
      ${res.plans.length ? `<p class="hint">${esc(res.criteria)}</p>` : ''}`;
    $$('#wp-out [data-plan-ics]').forEach((b) => b.addEventListener('click', () => downloadPlanICS(res.plans[+b.dataset.planIcs])));
    $$('#wp-out [data-plan-copy]').forEach((b) => b.addEventListener('click', () => copyPlan(res.plans[+b.dataset.planCopy])));
  }

  const planLines = (p) => [...p.steps, ...(p.party ? [p.party] : [])].map((s) =>
    `${s.time} — ${s.label} (giờ ${s.zhiVi}, ${s.huangDao ? 'Hoàng đạo' : 'Hắc đạo'}${s.clash.length ? `, xung tuổi ${s.clash.join(', ')}` : ''})`);

  function downloadPlanICS(p) {
    const r = planState.r;
    const ymd = `${r.ctx.y}${pad(r.ctx.m)}${pad(r.ctx.d)}`;
    const now = new Date();
    const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}00Z`;
    const steps = [...p.steps, ...(p.party ? [p.party] : [])];
    const events = steps.map((s, i) => {
      // Mốc về nhà trai kết thúc khi xong lễ; mốc cuối (tiệc) hoặc mốc trùng giờ với mốc sau dài 30 phút.
      const hmOf = (x) => `${pad(Math.floor(Math.min(x, 1439) / 60))}:${pad(Math.min(x, 1439) % 60)}`;
      const end = s.key === 'H' ? p.endGroom : (steps[i + 1] && steps[i + 1].min > s.min ? steps[i + 1].time : hmOf(s.min + 30));
      return ['BEGIN:VEVENT', `UID:${newId()}@ngaytot`, `DTSTAMP:${stamp}`,
        `DTSTART:${ymd}T${s.time.replace(':', '')}00`, `DTEND:${ymd}T${end.replace(':', '')}00`,
        `SUMMARY:${icsEsc(`Ngày cưới: ${s.label}`)}`,
        `DESCRIPTION:${icsEsc(`Giờ ${s.zhiVi}, ${s.huangDao ? 'Hoàng đạo' : 'Hắc đạo'} (${s.tianShen}). ${DISCLAIMER} Lập bởi Ngày Tốt.`)}`,
        'END:VEVENT'].join('\r\n');
    });
    const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NgayTot//VI', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n') + '\r\n';
    const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `ngay-cuoi-${r.key}.ics` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('Đã tạo file lịch trình .ics');
  }

  async function copyPlan(p) {
    const r = planState.r, dsc = S.describeDay(r.ctx);
    const text = [`Lịch trình ngày cưới: ${dsc.weekday}, ${fmtDate(r.ctx)} (ÂL ${dsc.lunarText})`, ...planLines(p), ...p.notes.map((n) => `Lưu ý: ${n}`), '', DISCLAIMER].join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: text });
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('Đã sao chép lịch trình');
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
    // Lễ cưới chưa xếp lịch trình: sự kiện cả ngày, không gắn với một canh giờ cụ thể (PRD §8.6).
    const allDay = !fixed && NT.activities.hourMeaningOf(state.act) === null;
    const hdList = r.hours.filter((h) => h.practical && h.huangDao && !h.severe).map((h) => h.label).join(', ');
    const desc = [
      calendarOnly()
        ? `Ngày ${dsc.ganZhi}, âm lịch ${dsc.lunarText}. Giờ ${r.chosen.label} (${r.chosen.ganZhi}).`
        : allDay
          ? `Ngày ${dsc.ganZhi}, âm lịch ${dsc.lunarText}. Giờ hoàng đạo trong ngày: ${hdList || 'không có trong khung 07:00–20:59'}. Chưa xếp lịch trình các mốc.`
          : `Ngày ${dsc.ganZhi}, âm lịch ${dsc.lunarText}. Giờ ${r.chosen.label} (${r.chosen.ganZhi}, ${r.chosen.tianShen}).`,
      fixed ? (state.act.isMedical ? MEDICAL_NOTE : FIXED_NOTE) : '',
      whoText() ? whoText() + '.' : '',
      ...hardWarningTexts(r),
      DISCLAIMER, 'Lập bởi Ngày Tốt.',
    ].filter(Boolean).join(' ');
    const body = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//NgayTot//VI', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${newId()}@ngaytot`, `DTSTAMP:${stamp}`,
      ...(allDay ? [`DTSTART;VALUE=DATE:${ymd}`] : [`DTSTART:${ymd}T${pad(sh)}${pad(sm)}00`, `DTEND:${ymd}T${pad(eh)}${pad(em)}00`]),
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
        NT.activities.hourMeaningOf(state.act) === null
          ? `Ngày ${dsc.ganZhi} · ${r.grade.label} ${r.score}/100 (chỉ số tham khảo) · Giờ hoàng đạo trong ngày: ${r.hours.filter((h) => h.practical && h.huangDao && !h.severe).map((h) => h.label).join(', ') || 'không có trong khung 07:00–20:59'}`
          : `Ngày ${dsc.ganZhi} · ${r.grade.label} ${r.score}/100 (chỉ số tham khảo) · Giờ ${r.chosen.label} (${r.chosen.ganZhi}) — giờ để ${NT.activities.hourMeaningOf(state.act)}`,
        ...r.day.items.map((i) => `${i.pts > 0 ? '+' : ''}${i.pts}  ${i.text}`),
      ];
    lines.push(...(whoText() ? [whoText() + '.'] : []), ...hardWarningTexts(r), '', DISCLAIMER);
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

  /* ------------------------------ Wiring ------------------------------ */
  function init() {
    if (!globalThis.Solar) { toast('Không tải được thư viện lịch (vendor/lunar.js).', true); return; }
    initPlaces();
    initActivities();
    initRange();
    syncSubject();
    $('#f-owner').addEventListener('change', () => { syncSubject(); clearResults(); });
    for (const id of ['#f-date', '#g-date', '#f-time', '#f-unknown-time', '#f-place', '#f-region', '#f-tz', '#f-zi', '#f-tst']) $(id).addEventListener('change', clearResults);
    $$('input[name="gender"]').forEach((el) => el.addEventListener('change', clearResults));
    $('#t-use-name').addEventListener('change', syncSubject);
    $('#btn-build-chart').addEventListener('click', () => {
      clearResults();
      if (buildChartFromForm()) $('#card-chart').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('#btn-find').addEventListener('click', runFind);
    document.addEventListener('click', (e) => {
      const ph = e.target.closest('#top-list [data-plan-hour]');
      if (ph && state.act?.id === 'wed_main') {
        const r = state.results?.days.find((x) => x.key === ph.closest('[data-key]')?.dataset.key);
        if (r) { openDay(r.key); openWeddingPlan(r, ph.dataset.planHour); return; }
      }
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

    // Ứng dụng không lưu gì (PRD §3.3, QĐ-07): dọn các khóa mà phiên bản cũ có thể đã để lại.
    try {
      Object.keys(localStorage).filter((k) => k.startsWith(KEY_PREFIX)).forEach((k) => localStorage.removeItem(k));
    } catch { /* bộ nhớ trình duyệt bị chặn: không có gì để dọn */ }
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})(globalThis.NT ??= {});
