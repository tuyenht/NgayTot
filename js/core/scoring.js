/**
 * NgayTot — Engine chấm điểm ngày/giờ và tìm ngày tốt.
 *
 * Điểm thô (raw) = Hoàng lịch (宜忌, Hoàng/Hắc đạo, Trực, Tú, thần sát)
 *                + Ngày kỵ dân gian VN (Tam nương, Nguyệt kỵ, Dương công)
 *                + Bát tự cá nhân (xung/hình/hại/hợp với tứ trụ, Dụng–Kỵ thần, Thập thần, Quý nhân/Lộc/Mã/Văn xương/Đào hoa)
 *                + Hạn năm (Kim lâu, Hoang ốc, Tam tai) + Ngũ hành tên (hệ số phụ).
 * Điểm ngày 0–100 = 50 + raw × DAY_SCALE; điểm giờ = 50 + raw × HOUR_SCALE; tổng = 75% ngày + 25% giờ.
 */
(function (NT) {
  'use strict';

  const D = NT.data;
  const V = NT.vi;
  const A = NT.activities;
  const DAY_SCALE = 0.85;
  const HOUR_SCALE = 2.2;
  const W_DAY = 0.75;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const pad = (n) => String(n).padStart(2, '0');
  const ymdKey = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
  const elName = (e) => D.ELEMENTS[e].vi;
  const ROLE_LABEL = { dung: 'Dụng thần', hy: 'Hỷ thần', nhan: 'Nhàn thần', cuu: 'Cừu thần', ky: 'Kỵ thần' };
  const roleOf = (chart, e) => Object.keys(chart.roles).find((k) => chart.roles[k] === e);

  /* ------------------------------------------------------------------ */
  /* Ngữ cảnh ngày (không phụ thuộc người) — có cache                   */
  /* ------------------------------------------------------------------ */
  const ctxCache = new Map();

  function dayContext(y, m, d) {
    const key = ymdKey(y, m, d);
    const hit = ctxCache.get(key);
    if (hit) return hit;
    const lunar = globalThis.Solar.fromYmd(y, m, d).getLunar();
    const ctx = Object.freeze({
      key, y, m, d,
      weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay(),
      vn: NT.calendar.solarToLunar(d, m, y),
      dayG: lunar.getDayGanIndex(), dayZ: lunar.getDayZhiIndex(),
      monthG: lunar.getMonthGanIndex(), monthZ: lunar.getMonthZhiIndex(),
      yearGZ: lunar.getYearInGanZhiByLiChun(),
      yi: lunar.getDayYi(), ji: lunar.getDayJi(),
      jiShen: lunar.getDayJiShen(), xiongSha: lunar.getDayXiongSha(),
      zhixing: lunar.getZhiXing(), xiu: lunar.getXiu(), xiuLuck: lunar.getXiuLuck(),
      tianShen: lunar.getDayTianShen(), tianShenLuck: lunar.getDayTianShenLuck(),
      jieqi: lunar.getJieQi(), nayin: lunar.getDayNaYin(),
      chongZhi: (lunar.getDayZhiIndex() + 6) % 12,
      sha: lunar.getDaySha(),
    });
    if (ctxCache.size > 3000) ctxCache.clear();
    ctxCache.set(key, ctx);
    return ctx;
  }

  /* ------------------------------------------------------------------ */
  /* Hạn năm theo tuổi mụ (cache theo năm âm lịch)                       */
  /* ------------------------------------------------------------------ */
  function yearWarnings(chart, lunarYear) {
    const age = lunarYear - chart.tuoi.lunarYear + 1;
    const out = { age, kimLau: null, hoangOc: null, tamTai: null };
    const r = age % 9;
    if (D.KIM_LAU[r]) out.kimLau = D.KIM_LAU[r];
    if (age >= 10) {
      const idx = (Math.floor(age / 10) - 1 + (age % 10)) % 6;
      out.hoangOcName = D.HOANG_OC[idx];
      if (D.HOANG_OC_BAD.includes(idx)) out.hoangOc = D.HOANG_OC[idx];
    }
    const yz = NT.calendar.lunarYearZhi(lunarYear);
    if (D.TAM_TAI[chart.tuoi.zhi % 4].includes(yz)) out.tamTai = `Năm ${D.ZHI_VI[yz]} là năm Tam tai của tuổi ${D.ZHI_VI[chart.tuoi.zhi]}`;
    return out;
  }

  /* ------------------------------------------------------------------ */
  /* Chấm điểm NGÀY (Bảng quy chiếu 8.3)                                 */
  /* ------------------------------------------------------------------ */
  function scoreDay(ctx, chart, act, nameInfo, options = {}) {
    const items = [];
    const add = (pts, text, cat, severe = false) => {
      if (pts !== 0 || severe || cat) {
        items.push({ pts: Math.round(pts * 10) / 10, text, cat, severe });
      }
    };
    const gender = chart.profile.gender;

    // --- HẠN NĂM (Bảng 8.3: nhãn DISPUTED, thông tin; chỉ thành Kỵ nặng khi người dùng chủ động chọn kiêng) ---
    const yw = yearWarnings(chart, ctx.vn.year);
    const yearlySevere = !!options.yearlyAsSevere;
    if (act.yearChecks.length) {
      if (act.yearChecks.includes('kimLau')) {
        if (gender === 'female' || act.id !== 'wed_main') {
          if (yw.kimLau) {
            add(0, `Năm âm lịch ${ctx.vn.year} phạm ${yw.kimLau} (tuổi mụ ${yw.age}) — tập tục`, 'year', yearlySevere);
          }
        } else if (act.id === 'wed_main' && gender === 'male') {
          // Cưới hỏi: Kim lâu chỉ xét tuổi cô dâu (PRD §8.3, §10)
          add(0, 'Kim lâu: theo tập tục cưới hỏi chỉ xét tuổi cô dâu (không áp dụng cho nam)', 'year', false);
        }
      }
      if (act.yearChecks.includes('hoangOc') && yw.hoangOc) {
        add(0, `Năm âm lịch ${ctx.vn.year} phạm ${yw.hoangOc} (tuổi mụ ${yw.age}) — tập tục`, 'year', yearlySevere);
      }
      if (act.yearChecks.includes('tamTai') && yw.tamTai) {
        add(0, `${yw.tamTai} — tập tục`, 'year', false);
      }
    }

    // 1) Hoàng lịch 宜/忌 (UNVERIFIED)
    const keysPrimary = act.yiPrimary;
    const keysAll = [...act.yiPrimary, ...act.yi];
    if (ctx.yi.includes('诸事不宜')) { add(-25, 'Hoàng lịch: Mọi việc không nên', 'cal', true); }
    const yiP = keysPrimary.filter((k) => ctx.yi.includes(k));
    const yiO = act.yi.filter((k) => ctx.yi.includes(k));
    const jiP = keysPrimary.filter((k) => ctx.ji.includes(k));
    const jiO = act.yi.filter((k) => ctx.ji.includes(k));
    if (yiP.length) add(14, `Hoàng lịch ghi NÊN: ${yiP.map(V.yiji).join(', ')}`, 'cal');
    else if (yiO.length) add(8, `Hoàng lịch ghi nên việc liên quan: ${yiO.slice(0, 3).map(V.yiji).join(', ')}`, 'cal');
    else if (keysAll.length && ctx.yi.includes('馀事勿取')) add(-6, 'Hoàng lịch: việc khác không nên làm', 'cal');
    if (jiP.length) { add(-22, `Hoàng lịch ghi KỴ việc chính: ${jiP.map(V.yiji).join(', ')}`, 'cal', true); }
    else if (jiO.length) add(-10, `Hoàng lịch ghi kỵ việc liên quan: ${jiO.slice(0, 3).map(V.yiji).join(', ')}`, 'cal');

    // 2) Hoàng đạo / Hắc đạo (CONSENSUS)
    if (ctx.tianShenLuck === '吉') add(6, `Ngày Hoàng đạo (${V.tianshen(ctx.tianShen)})`, 'cal');
    else add(-6, `Ngày Hắc đạo (${V.tianshen(ctx.tianShen)})`, 'cal');

    // 3) Thập nhị Trực (SCHOOL_SPLIT)
    const zx = ctx.zhixing;
    if (act.zhixingGood.includes(zx)) add(6, `Trực ${V.zhixing(zx)} — hợp việc này`, 'cal');
    else if (act.zhixingBad.includes(zx)) add(-8, `Trực ${V.zhixing(zx)} — kỵ việc này`, 'cal');

    // 4) Nhị thập bát tú (UNVERIFIED — Bảng 8.3: thông tin, không góp vào chỉ số cho đến khi có điểm neo)
    if (ctx.xiuLuck === '吉') add(0, `Sao ${V.xiu(ctx.xiu)} (Nhị thập bát tú) — cát`, 'cal');
    else add(0, `Sao ${V.xiu(ctx.xiu)} (Nhị thập bát tú) — hung`, 'cal');

    // 5) Cát thần (Lớp 4)
    const actGood = ctx.jiShen.filter((s) => act.shenGood.includes(s));
    const comGood = ctx.jiShen.filter((s) => A.COMMON_GOOD.includes(s) && !act.shenGood.includes(s));
    if (comGood.length) add(Math.min(9, comGood.length * 3), `Cát thần: ${comGood.map(V.shensha).join(', ')}`, 'cal');
    if (actGood.length) add(Math.min(8, actGood.length * 4), `Cát thần hợp việc: ${actGood.map(V.shensha).join(', ')}`, 'cal');

    // 6) Hung sát (UNVERIFIED; riêng Nguyệt phá là CONSENSUS kỵ nặng)
    let badSum = 0;
    const badNames = [];
    const isNguyetPha = ctx.xiongSha.includes('月破') || (ctx.dayZ === (ctx.monthZ + 6) % 12);
    for (const s of ctx.xiongSha) {
      const wv = act.shenBad[s] ?? A.COMMON_BAD[s];
      if (wv) { badSum += wv; badNames.push(V.shensha(s)); }
    }
    if (badSum) add(-Math.min(24, badSum), `Hung sát: ${badNames.join(', ')}`, 'cal', isNguyetPha);

    // 7) Ngày kỵ dân gian VN (VN_FOLK)
    const ld = ctx.vn.day, lm = ctx.vn.month;
    if (D.TAM_NUONG.includes(ld)) add(-8, `Ngày Tam nương (mùng ${ld} âm lịch)`, 'folk');
    if (D.NGUYET_KY.includes(ld)) add(-6, `Ngày Nguyệt kỵ (mùng ${ld} âm lịch)`, 'folk');
    if (D.DUONG_CONG[lm]?.includes(ld)) {
      // Dương công kỵ nhật: Bảng 8.3 ghi nhãn UNVERIFIED, Thông tin, không góp chỉ số, không kỵ nặng
      add(0, `Dương công kỵ nhật (${ld}/${lm} âm lịch) — dân gian truyền tụng`, 'folk', false);
    }

    // 8) Bát tự: xung/hình/hại/hợp
    const P = chart.pillars;
    const tz = chart.tuoi.zhi, tg = chart.tuoi.gan;
    const dz = ctx.dayZ, dg = ctx.dayG;
    const dayName = D.ganZhiVi(dg, dz);
    if (D.isChong(dz, tz)) {
      add(-16, `Ngày ${dayName} xung tuổi ${D.ZHI_VI[tz]}`, 'bazi', true); // Chi ngày lục xung chi tuổi -> Kỵ nặng (CONSENSUS)
      if (D.isGanChong(dg, tg)) add(-6, `Thiên khắc địa xung với năm sinh ${D.ganZhiVi(tg, tz)}`, 'bazi');
    }
    // Người khác cùng tham gia việc (vd chú rể): ngày lục xung chi tuổi của họ cũng là kỵ nặng (PRD §8.3, §9.6).
    for (const o of options.others ?? []) {
      if (Number.isInteger(o?.zhi) && D.isChong(dz, o.zhi)) add(-16, `Ngày ${dayName} xung tuổi ${o.role} (${D.ZHI_VI[o.zhi]})`, 'bazi', true);
    }
    if (P.year.z !== tz && D.isChong(dz, P.year.z)) add(-8, `Xung trụ năm (Lập Xuân) ${D.ganZhiVi(P.year.g, P.year.z)}`, 'bazi');
    if (D.isChong(dz, P.day.z)) {
      add(-10, `Xung Nhật chi ${D.ZHI_VI[P.day.z]} (cung phu thê/bản thân)`, 'bazi');
      if (D.isGanChong(dg, P.day.g)) add(-8, `Thiên khắc địa xung Nhật trụ ${D.ganZhiVi(P.day.g, P.day.z)}`, 'bazi');
    }
    if (D.isChong(dz, P.month.z)) add(-4, `Xung Nguyệt chi ${D.ZHI_VI[P.month.z]}`, 'bazi');
    if (P.hour && D.isChong(dz, P.hour.z)) add(-3, `Xung Thời chi ${D.ZHI_VI[P.hour.z]}`, 'bazi');

    const hinhWith = [tz, P.day.z].find((z) => D.isHinh(dz, z));
    if (hinhWith !== undefined) add(-5, `Tương hình với ${D.ZHI_VI[hinhWith]}`, 'bazi');
    const haiWith = [tz, P.day.z].find((z) => D.isHai(dz, z));
    if (haiWith !== undefined) add(-4, `Lục hại với ${D.ZHI_VI[haiWith]}`, 'bazi');
    const heWith = [tz, P.day.z].find((z) => D.isLiuHe(dz, z));
    if (heWith !== undefined) add(6, `Lục hợp với ${D.ZHI_VI[heWith]}`, 'bazi');
    const sanWith = [tz, P.day.z].find((z) => D.isSanHe(dz, z));
    if (sanWith !== undefined) add(5, `Tam hợp với ${D.ZHI_VI[sanWith]}`, 'bazi');
    if (D.isGanHe(dg, chart.dm)) add(4, `Thiên can ${D.GAN_VI[dg]} hợp Nhật chủ ${D.GAN_VI[chart.dm]}`, 'bazi');

    // 9) NGŨ HÀNH (Dụng Thần + Nạp Âm)
    const gEl = D.ganElement(dg), zEl = D.zhiElement(dz);
    const fG = chart.elFav[gEl], fZ = chart.elFav[zEl];
    // A. Bát tự chuyên sâu
    if (Math.abs(fG) >= 0.2) add(fG * 4, `Can ngày ${D.GAN_VI[dg]} (${elName(gEl)}) là ${ROLE_LABEL[roleOf(chart, gEl)]}`, 'bazi');
    if (Math.abs(fZ) >= 0.2) add(fZ * 3, `Chi ngày ${D.ZHI_VI[dz]} (${elName(zEl)}) là ${ROLE_LABEL[roleOf(chart, zEl)]}`, 'bazi');
    
    // B. Nạp Âm
    const dayNayinStr = ctx.nayin;
    const yearNayinStr = chart.nayin.year;
    if (dayNayinStr && yearNayinStr) {
      const nayinMap = { '木': 0, '火': 1, '土': 2, '金': 3, '水': 4 };
      const dayEl = nayinMap[dayNayinStr.slice(-1)];
      const yearEl = nayinMap[yearNayinStr.slice(-1)];
      if (dayEl !== undefined && yearEl !== undefined) {
        if (D.generates(dayEl, yearEl)) add(5, `Nạp âm ngày (${elName(dayEl)}) tương sinh Mệnh năm (${elName(yearEl)})`, 'nayin');
        else if (D.generates(yearEl, dayEl)) add(4, `Mệnh năm (${elName(yearEl)}) tương sinh Nạp âm ngày (${elName(dayEl)})`, 'nayin');
        else if (yearEl === dayEl) add(3, `Nạp âm ngày tương hòa Mệnh năm (${elName(yearEl)})`, 'nayin');
        else if (D.controls(dayEl, yearEl)) add(-2, `Nạp âm ngày (${elName(dayEl)}) khắc Mệnh năm (${elName(yearEl)})`, 'nayin');
      }
    }

    // 10) Thập thần hợp việc
    if (!act.isDaily) {
      const grp = D.relGroup(chart.dmEl, gEl);
      if (act.tenGods(gender).includes(grp)) {
        add(fG >= -0.5 ? 3 : 1, `Can ngày là ${D.tenGodOfGan(chart.dm, dg)} — sao hợp với việc này`, 'bazi');
      }
    }

    // 11) Thần sát cá nhân
    const b = act.boost;
    if (D.TIAN_YI[chart.dm].includes(dz) || D.TIAN_YI[P.year.g].includes(dz)) add(6 * b.quyNhan, 'Ngày có Thiên Ất Quý Nhân của bạn', 'bazi');
    if (D.LU[chart.dm] === dz) add(4 * b.lu, 'Ngày gặp Lộc thần của Nhật chủ', 'bazi');
    if (D.WEN_CHANG[chart.dm] === dz) add(3 * b.vanXuong, 'Ngày gặp Văn Xương', 'bazi');
    if (D.yiMaOf(tz) === dz || D.yiMaOf(P.day.z) === dz) add(2 * b.yiMa, 'Ngày gặp Dịch Mã', 'bazi');
    if (D.taoHuaOf(tz) === dz || D.taoHuaOf(P.day.z) === dz) add(2 * b.taoHua, 'Ngày gặp Đào Hoa', 'bazi');

    // 12) Việc tùy chỉnh: ngũ hành của việc (Bảng 8.3: USER_DEFINED, thông tin, không góp chỉ số)
    if (act.customElement != null) {
      const ce = act.customElement;
      let relText = '';
      if (D.generates(gEl, ce)) relText = `Can ngày (${elName(gEl)}) sinh hành của việc (${elName(ce)})`;
      else if (gEl === ce) relText = `Can ngày cùng hành với việc (${elName(ce)})`;
      else if (D.controls(gEl, ce)) relText = `Can ngày (${elName(gEl)}) khắc hành của việc (${elName(ce)})`;
      else if (D.controls(ce, gEl)) relText = `Hành của việc (${elName(ce)}) khắc can ngày`;
      if (relText) add(0, `${relText} (thông tin việc tùy chỉnh)`, 'bazi');
    }

    // 13) Ngũ hành tên (Bảng 8.3: HEURISTIC, thông tin, mặc định tắt không góp điểm)
    if (nameInfo) {
      const adj = NT.nameElement.nameAdjust(gEl, nameInfo.element);
      const useName = !!options.useNameElement;
      add(useName ? adj.pts : 0, `Ngũ hành ngày (${elName(gEl)}) ${adj.text} ngũ hành tên (${elName(nameInfo.element)})${useName ? '' : ' (hệ số phụ tham khảo)'}`, 'name');
    }

    const raw = items.reduce((s, i) => s + i.pts, 0);
    return {
      raw,
      score: clamp(Math.round(50 + raw * DAY_SCALE), 0, 100),
      items,
      severe: items.filter((i) => i.severe),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Chấm điểm GIỜ                                                      */
  /* ------------------------------------------------------------------ */
  function scoreHour(ctx, chart, act, hh, mi) {
    const l = globalThis.Solar.fromYmdHms(ctx.y, ctx.m, ctx.d, hh, mi, 0).getLunar();
    const tg = l.getTimeGanIndex(), tzh = l.getTimeZhiIndex();
    const items = [];
    const add = (pts, text, severe = false) => {
      if (pts !== 0 || severe) items.push({ pts: Math.round(pts * 10) / 10, text, severe });
    };
    const tianShen = l.getTimeTianShen();
    const luck = l.getTimeTianShenLuck();
    // Hướng Hỷ thần, Tài thần: chưa qua kiểm nguồn (PRD §7.1, §8.6) → không tính, không trả về.
    if (luck === '吉') add(6, `Giờ Hoàng đạo (${V.tianshen(tianShen)})`);
    else add(-6, `Giờ Hắc đạo (${V.tianshen(tianShen)})`);

    const keys = [...act.yiPrimary, ...act.yi];
    const tYi = l.getTimeYi(), tJi = l.getTimeJi();
    const yiHit = keys.filter((k) => tYi.includes(k));
    const jiHit = keys.filter((k) => tJi.includes(k));
    if (yiHit.length) add(4, `Giờ nên: ${yiHit.slice(0, 2).map(V.yiji).join(', ')}`);
    if (jiHit.length) add(-6, `Giờ kỵ: ${jiHit.slice(0, 2).map(V.yiji).join(', ')}`);

    const P = chart.pillars, tz = chart.tuoi.zhi;
    if (D.isChong(tzh, tz)) add(-10, `Giờ ${D.ZHI_VI[tzh]} xung tuổi ${D.ZHI_VI[tz]}`, true);
    if (D.isChong(tzh, P.day.z)) add(-6, `Giờ xung Nhật chi ${D.ZHI_VI[P.day.z]}`);
    const dayZExact = D.zhiIndex(l.getDayZhiExact());
    if (D.isChong(tzh, dayZExact)) add(-4, 'Giờ xung chi của ngày (Nhật phá)');
    if ([tz, P.day.z].some((z) => D.isLiuHe(tzh, z) || D.isSanHe(tzh, z))) add(3, 'Giờ hợp tuổi / Nhật chi');

    const gEl = D.ganElement(tg), zEl = D.zhiElement(tzh);
    if (Math.abs(chart.elFav[gEl]) >= 0.2) add(chart.elFav[gEl] * 2, `Can giờ ${D.GAN_VI[tg]} (${elName(gEl)}) — ${ROLE_LABEL[roleOf(chart, gEl)]}`);
    if (Math.abs(chart.elFav[zEl]) >= 0.2) add(chart.elFav[zEl] * 2, `Chi giờ ${D.ZHI_VI[tzh]} (${elName(zEl)}) — ${ROLE_LABEL[roleOf(chart, zEl)]}`);
    if (D.TIAN_YI[chart.dm].includes(tzh)) add(4, 'Giờ Quý Nhân');
    if (act.customElement != null) {
      const ce = act.customElement;
      let relH = '';
      if (D.generates(gEl, ce) || gEl === ce) relH = `Can giờ hỗ trợ hành của việc (${elName(ce)})`;
      else if (D.controls(gEl, ce)) relH = `Can giờ khắc hành của việc (${elName(ce)})`;
      if (relH) add(0, `${relH} (thông tin việc tùy chỉnh)`);
    }
    const raw = items.reduce((s, it) => s + it.pts, 0);
    return {
      g: tg, z: tzh, ganZhi: D.ganZhiVi(tg, tzh), tianShen: V.tianshen(tianShen), huangDao: luck === '吉',
      raw, score: clamp(Math.round(50 + raw * HOUR_SCALE), 0, 100), items, severe: items.some((i) => i.severe),
    };
  }

  /** Xếp loại theo chỉ số tham khảo (HEURISTIC). Tên mức trung tính theo PRD §3.4, §8.5. */
  function gradeOf(score, severe) {
    if (severe) return { key: 'bad', label: 'Có điều kỵ nặng' };
    if (score >= 80) return { key: 'g5', label: 'Đại cát' };
    if (score >= 68) return { key: 'g4', label: 'Cát' };
    if (score >= 55) return { key: 'g3', label: 'Khá' };
    if (score >= 40) return { key: 'g2', label: 'Bình thường' };
    return { key: 'g1', label: 'Nên cân nhắc' };
  }

  /* ------------------------------------------------------------------ */
  /* Tìm ngày                                                           */
  /* ------------------------------------------------------------------ */
  /**
   * @param {object} o
   * @param {object} o.chart  kết quả NT.bazi.buildChart
   * @param {object} o.act    hoạt động (NT.activities)
   * @param {object|null} o.nameInfo
   * @param {string} o.from 'YYYY-MM-DD'
   * @param {string} o.to   'YYYY-MM-DD'
   * @param {'best'|'fixed'} o.mode
   * @param {string} [o.fixedTime] 'HH:MM'
   * @param {boolean} [o.skipWeekend]
   * @param {{yearlyAsSevere?:boolean, hideSevere?:boolean, useNameElement?:boolean, others?:{role:string, zhi:number}[]}} [o.options]
   * Với việc y tế cố định (isCalendarOnly) không cần o.chart.
   */
  const isCalendarOnly = (act) => !!(act?.isMedical && act?.fixedOnly);

  function findDays(o) {
    const t0 = performance.now();
    const [fy, fm, fd] = o.from.split('-').map(Number);
    const [ty, tm, td] = o.to.split('-').map(Number);
    let cur = Date.UTC(fy, fm - 1, fd);
    const end = Date.UTC(ty, tm - 1, td);
    if (!(end >= cur)) throw new Error('Khoảng ngày không hợp lệ');
    if ((end - cur) / 864e5 > 731) throw new Error('Khoảng tìm tối đa 2 năm');
    const R = NT.calendar.SUPPORTED_RANGE;
    if (fy < R.from || ty > R.to) throw new Error(`Chỉ hỗ trợ ngày trong khoảng ${R.from}–${R.to}.`);
    // Việc y tế / lịch đã ấn định: chỉ xem thông tin đúng ngày giờ đó, không xếp hạng để gợi ý đổi ngày.
    if (o.act.fixedOnly && (o.mode !== 'fixed' || end !== cur)) throw new Error('Việc này chỉ xem thông tin cho ngày giờ đã được ấn định.');
    const [fh, fmin] = (o.fixedTime ?? '08:00').split(':').map(Number);
    // Lịch mổ, sinh mổ do bác sĩ ấn định: chỉ thông tin lịch thuần, không dòng luật, không điểm (PRD §3.1).
    const calendarOnly = isCalendarOnly(o.act);

    const days = [];
    for (; cur <= end; cur += 864e5) {
      const dt = new Date(cur);
      const ctx = dayContext(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
      const isWeekend = ctx.weekday === 0 || ctx.weekday === 6;
      if (calendarOnly) {
        const l = globalThis.Solar.fromYmdHms(ctx.y, ctx.m, ctx.d, fh, fmin, 0).getLunar();
        const chosen = { g: l.getTimeGanIndex(), z: l.getTimeZhiIndex(), label: `${pad(fh)}:${pad(fmin)}`, items: [], severe: false, score: null };
        chosen.ganZhi = D.ganZhiVi(chosen.g, chosen.z);
        days.push({
          ctx, key: ctx.key, isWeekend, calendarOnly: true,
          day: { raw: 0, score: null, items: [], severe: [] },
          hours: [chosen], chosen, bestHours: [chosen], severe: false, excluded: false,
          flags: ['MEDICAL_FIXED_ONLY', ...(NT.calendar.inVerifiedRange(ctx.y) ? [] : ['OUT_OF_VERIFIED_RANGE'])],
          score: null, grade: null,
        });
        continue;
      }
      const day = scoreDay(ctx, o.chart, o.act, o.nameInfo, o.options);
      let hours, chosen;
      if (o.mode === 'fixed') {
        chosen = { ...scoreHour(ctx, o.chart, o.act, fh, fmin), label: `${pad(fh)}:${pad(fmin)}` };
        hours = [chosen];
      } else {
        hours = D.HOUR_SLOTS.map((s) => ({ ...scoreHour(ctx, o.chart, o.act, s.rep[0], s.rep[1]), label: s.label, tag: s.tag }));
        // Việc có tiệc, nhạc (cưới, khánh thành…): chỉ đề xuất giờ trong khung sinh hoạt 07:00–20:59 (PRD §8.6);
        // bảng giờ trong hộp chi tiết vẫn hiện đủ 13 khung.
        hours.forEach((h, i) => { h.practical = !o.act.checkNoise || (D.HOUR_SLOTS[i].rep[0] >= 7 && D.HOUR_SLOTS[i].rep[0] < 21); });
        const ranked = hours.filter((h) => !h.severe && h.practical).sort((a, b) => b.score - a.score);
        chosen = ranked[0] ?? hours.find((h) => h.practical) ?? hours[0];
      }
      const bestHours = o.mode === 'fixed' ? [chosen] : hours.filter((h) => !h.severe && h.huangDao && h.practical).sort((a, b) => b.score - a.score).slice(0, 3);
      const severe = day.severe.length > 0 || (o.mode === 'fixed' && chosen.severe);
      const score = Math.round(day.score * W_DAY + chosen.score * (1 - W_DAY));
      days.push({
        ctx, key: ctx.key, isWeekend, day, hours, chosen, bestHours, severe,
        excluded: o.skipWeekend && isWeekend,
        flags: NT.calendar.inVerifiedRange(ctx.y) ? [] : ['OUT_OF_VERIFIED_RANGE'],
        score, grade: gradeOf(score, severe),
      });
    }
    const filterSevere = o.options?.hideSevere !== false;
    const ranked = days.filter((x) => !x.excluded && (!filterSevere || !x.severe)).sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
    return { days, ranked, ms: Math.round(performance.now() - t0) };
  }

  /** Thông tin hiển thị một ngày (dịch sang tiếng Việt). */
  function describeDay(ctx) {
    return {
      ganZhi: D.ganZhiVi(ctx.dayG, ctx.dayZ),
      monthGanZhi: D.ganZhiVi(ctx.monthG, ctx.monthZ),
      lunarText: `${ctx.vn.day}/${ctx.vn.month}${ctx.vn.leap ? ' (nhuận)' : ''} năm ${D.ganZhiVi(NT.calendar.lunarYearGan(ctx.vn.year), NT.calendar.lunarYearZhi(ctx.vn.year))}`,
      weekday: D.WEEKDAY_VI[ctx.weekday],
      zhixing: V.zhixing(ctx.zhixing), xiu: V.xiu(ctx.xiu), xiuGood: ctx.xiuLuck === '吉',
      tianShen: V.tianshen(ctx.tianShen), huangDao: ctx.tianShenLuck === '吉',
      yi: ctx.yi.map(V.yiji), ji: ctx.ji.map(V.yiji),
      jiShen: ctx.jiShen.map(V.shensha), xiongSha: ctx.xiongSha.map(V.shensha),
      jieqi: ctx.jieqi ? V.jieqi(ctx.jieqi) : '',
      chong: `Xung tuổi ${D.ZHI_VI[ctx.chongZhi]} (${D.ZHI_ANIMAL[ctx.chongZhi]})`,
    };
  }

  NT.scoring = Object.freeze({ dayContext, scoreDay, scoreHour, findDays, describeDay, gradeOf, yearWarnings, ymdKey, isCalendarOnly });
})(globalThis.NT ??= {});
