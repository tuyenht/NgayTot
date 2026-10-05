/**
 * NgayTot — Engine Bát tự (Tứ trụ).
 *
 * Nguyên tắc tính trụ:
 *  - Trụ Năm/Tháng: xác định bởi THỜI ĐIỂM tiết khí tuyệt đối (Lập Xuân, các Tiết).
 *    lunar-javascript tính tiết khí theo giờ Bắc Kinh (UTC+8) → quy đổi giờ sinh về UTC+8.
 *  - Trụ Ngày/Giờ: theo giờ Mặt Trời thực tại nơi sinh (kinh độ + phương trình thời gian),
 *    phái đổi ngày giờ Tý: sect 1 = đổi ngày lúc 23:00 (Tử Bình truyền thống), sect 2 = lúc 00:00.
 *
 * Vượng suy & Dụng thần:
 *  - Phù ức (扶抑, Tử Bình Chân Thuyên / Trích Thiên Tủy): định lượng lực ngũ hành theo vị trí,
 *    tàng can (chính/trung/dư khí) và Vượng–Tướng–Hưu–Tù–Tử theo lệnh tháng.
 *  - Điều hậu (调候, Cùng Thông Bảo Giám): sinh mùa hạ cần Thủy, mùa đông cần Hỏa.
 *  - Cách đặc biệt: Tòng vượng / Tòng nhược khi lực cực lệch và (với tòng nhược) Nhật chủ không gốc.
 */
(function (NT) {
  'use strict';

  const D = NT.data;
  const lunarLib = () => globalThis; // lunar.js (UMD) gắn Solar/Lunar/EightChar lên global

  /** Trọng số vị trí (không tính Thiên can ngày = Nhật chủ). */
  const POS_WEIGHT = {
    yearGan: 0.8, monthGan: 1.0, hourGan: 0.9,
    yearZhi: 0.9, monthZhi: 2.6, dayZhi: 1.4, hourZhi: 1.0,
  };
  /** Hệ số Vượng/Tướng/Hưu/Tù/Tử theo lệnh tháng. */
  const SEASON_MULT = { vuong: 1.3, tuong: 1.15, huu: 0.95, tu: 0.85, tuDie: 0.75 };

  function seasonState(e, s) {
    if (e === s) return ['vuong', 'Vượng'];
    if (D.generates(s, e)) return ['tuong', 'Tướng'];
    if (D.generates(e, s)) return ['huu', 'Hưu'];
    if (D.controls(e, s)) return ['tu', 'Tù'];
    return ['tuDie', 'Tử'];
  }

  const pad = (n) => String(n).padStart(2, '0');
  const parseGZ = (gz) => ({ g: D.ganIndex(gz[0]), z: D.zhiIndex(gz[1]) });

  function fieldsOfUTC(date) {
    return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate(), hh: date.getUTCHours(), mi: date.getUTCMinutes() };
  }

  /**
   * @param {object} p profile
   * @param {string} p.birthDate 'YYYY-MM-DD'
   * @param {string|null} p.birthTime 'HH:MM' hoặc null nếu không rõ giờ
   * @param {'male'|'female'} p.gender
   * @param {'bac'|'nam'|'unknown'} [p.region] vùng nơi sinh (PRD §6.3)
   * @param {number|null} [p.tz] giờ đồng hồ khi sinh (UTC+x); null = tự động theo bảng civil_tz
   * @param {number} p.lon kinh độ nơi sinh
   * @param {boolean} p.useTrueSolar
   * @param {1|2} p.ziSect
   */
  function buildChart(p, now = new Date()) {
    const { Solar } = lunarLib();
    if (!Solar) throw new Error('Thiếu thư viện lunar-javascript');
    const [y, m, d] = p.birthDate.split('-').map(Number);
    if (!y || !m || !d) throw new Error('Ngày sinh không hợp lệ');
    const hasTime = typeof p.birthTime === 'string' && /^\d{1,2}:\d{2}$/.test(p.birthTime);
    const [hh, mi] = hasTime ? p.birthTime.split(':').map(Number) : [12, 0];
    const region = ['bac', 'nam', 'unknown'].includes(p.region) ? p.region : 'bac';
    const tzAuto = !Number.isFinite(p.tz);
    const tz = tzAuto ? NT.calendar.civilTz(y, m, d, region) : p.tz;
    const lon = Number.isFinite(p.lon) ? p.lon : 105.85;
    const flags = [];
    if (!NT.calendar.inVerifiedRange(y)) flags.push('OUT_OF_VERIFIED_RANGE');

    // --- Trụ Năm/Tháng theo thời điểm tuyệt đối (quy về UTC+8 cho lunar-javascript) ---
    const utcMs = Date.UTC(y, m - 1, d, hh, mi) - tz * 3600e3;
    const f8 = fieldsOfUTC(new Date(utcMs + 8 * 3600e3));
    const lunar8 = Solar.fromYmdHms(f8.y, f8.m, f8.d, f8.hh, f8.mi, 0).getLunar();
    const ec8 = lunar8.getEightChar();
    const yearP = parseGZ(ec8.getYear());
    const monthP = parseGZ(ec8.getMonth());

    // --- Trụ Ngày/Giờ theo giờ Mặt Trời thực (hoặc giờ đồng hồ) ---
    let local = { y, m, d, hh, mi };
    let tstInfo = { applied: false, offsetMin: 0, text: '' };
    if (hasTime && p.useTrueSolar) {
      const t = NT.calendar.trueSolarTime({ y, m, d, hh, mi }, tz, lon);
      local = fieldsOfUTC(t.tst);
      const sign = t.offsetMin >= 0 ? '+' : '−';
      tstInfo = {
        applied: true,
        offsetMin: t.offsetMin,
        text: `${pad(local.hh)}:${pad(local.mi)} ngày ${pad(local.d)}/${pad(local.m)}/${local.y} (${sign}${Math.abs(t.offsetMin).toFixed(1)} phút)`,
      };
    }
    const lunarL = Solar.fromYmdHms(local.y, local.m, local.d, local.hh, local.mi, 0).getLunar();
    const ecL = lunarL.getEightChar();
    ecL.setSect(p.ziSect === 2 ? 2 : 1);
    const dayP = parseGZ(ecL.getDay());
    const hourP = hasTime ? parseGZ(ecL.getTime()) : null;

    const pillars = { year: yearP, month: monthP, day: dayP, hour: hourP };
    const dm = dayP.g;
    const dmEl = D.ganElement(dm);

    // --- Chi tiết từng trụ ---
    const nayin = {
      year: ec8.getYearNaYin(), month: ec8.getMonthNaYin(), day: ecL.getDayNaYin(), hour: hasTime ? ecL.getTimeNaYin() : '',
    };
    const pillarInfo = {};
    for (const key of ['year', 'month', 'day', 'hour']) {
      const pp = pillars[key];
      if (!pp) { pillarInfo[key] = null; continue; }
      pillarInfo[key] = {
        ...pp,
        ganVi: D.GAN_VI[pp.g], zhiVi: D.ZHI_VI[pp.z], ganHan: D.GAN_HAN[pp.g], zhiHan: D.ZHI_HAN[pp.z],
        ganEl: D.ganElement(pp.g), zhiEl: D.zhiElement(pp.z),
        tenGod: key === 'day' ? 'Nhật Chủ' : D.tenGodOfGan(dm, pp.g),
        hidden: D.ZHI_HIDDEN[pp.z].map((g) => ({ g, vi: D.GAN_VI[g], han: D.GAN_HAN[g], el: D.ganElement(g), tenGod: D.tenGodOfGan(dm, g) })),
        nayin: NT.vi.nayin(nayin[key]),
      };
    }

    // --- Lực ngũ hành ---
    const season = D.SEASON_ELEMENT[monthP.z];
    const w = [0, 0, 0, 0, 0];
    const addEl = (e, amount) => { w[e] += amount * SEASON_MULT[seasonState(e, season)[0]]; };
    const addGan = (g, pw) => addEl(D.ganElement(g), pw);
    const addZhi = (z, pw) => {
      const hid = D.ZHI_HIDDEN[z];
      D.HIDDEN_RATIO[hid.length].forEach((r, i) => addEl(D.ganElement(hid[i]), pw * r));
    };
    addGan(yearP.g, POS_WEIGHT.yearGan);
    addGan(monthP.g, POS_WEIGHT.monthGan);
    addZhi(yearP.z, POS_WEIGHT.yearZhi);
    addZhi(monthP.z, POS_WEIGHT.monthZhi);
    addZhi(dayP.z, POS_WEIGHT.dayZhi);
    if (hourP) { addGan(hourP.g, POS_WEIGHT.hourGan); addZhi(hourP.z, POS_WEIGHT.hourZhi); }

    const groupEl = (k) => (dmEl + k) % 5; // 0 Tỷ,1 Thực,2 Tài,3 Quan,4 Ấn
    const gw = [0, 1, 2, 3, 4].map((k) => w[groupEl(k)]);
    const support = gw[0] + gw[4];
    const oppose = gw[1] + gw[2] + gw[3];
    const ratio = support / (support + oppose);
    const display = [...w];
    display[dmEl] += 1.0 * SEASON_MULT[seasonState(dmEl, season)[0]];
    const totalDisplay = display.reduce((a, b) => a + b, 0);
    const pct = display.map((v) => (v / totalDisplay) * 100);

    const branches = [yearP.z, monthP.z, dayP.z, hourP?.z].filter((z) => z !== undefined);
    const hasRoot = branches.some((z) => D.ZHI_HIDDEN[z].some((g) => D.ganElement(g) === dmEl));
    const quanShare = gw[3] / (support + oppose);

    let pattern = 'normal';
    if (ratio >= 0.78 && quanShare < 0.08) pattern = 'tong_vuong';
    else if (ratio <= 0.22 && !hasRoot) pattern = 'tong_nhuoc';

    let level, levelLabel;
    if (ratio >= 0.62) [level, levelLabel] = ['vuong', 'Thân vượng'];
    else if (ratio >= 0.53) [level, levelLabel] = ['hoi_vuong', 'Hơi vượng'];
    else if (ratio > 0.45) [level, levelLabel] = ['trung_hoa', 'Trung hòa'];
    else if (ratio > 0.36) [level, levelLabel] = ['hoi_nhuoc', 'Hơi nhược'];
    else [level, levelLabel] = ['nhuoc', 'Thân nhược'];

    // --- Hỷ/Kỵ theo nhóm Thập thần ---
    const reasons = [];
    const [seasonKey, seasonLabel] = seasonState(dmEl, season);
    reasons.push(`Nhật chủ ${D.GAN_VI[dm]} (${D.ELEMENTS[dmEl].vi}) sinh tháng ${D.ZHI_VI[monthP.z]} — ở trạng thái ${seasonLabel} theo lệnh tháng.`);
    reasons.push(`Lực phe ta (Tỷ Kiếp + Ấn) chiếm ${(ratio * 100).toFixed(0)}% → ${levelLabel}${hasRoot ? ', có gốc ở Địa chi' : ', không có gốc ở Địa chi'}.`);

    let fav = [0, 0, 0, 0, 0];
    const strongestOpp = [1, 2, 3].reduce((a, b) => (gw[b] > gw[a] ? b : a), 1);
    const G = D.TEN_GOD_GROUPS;
    if (pattern === 'tong_vuong') {
      fav = [2, 0.5, -1.5, -2, 1.5];
      reasons.push('Cách Tòng Vượng: khí phe ta cực mạnh, Quan Sát gần như không có → thuận theo thế vượng, dùng Tỷ Kiếp/Ấn, kỵ Quan Sát và Tài.');
    } else if (pattern === 'tong_nhuoc') {
      fav = [-1.5, 0, 0, 0, -2];
      fav[strongestOpp] = 2;
      const mother = (strongestOpp + 4) % 5;
      if (mother !== 0) fav[mother] = Math.max(fav[mother], 1);
      reasons.push(`Cách Tòng (nhược): Nhật chủ không gốc, ${G[strongestOpp].vi} áp đảo → thuận theo ${G[strongestOpp].vi}, kỵ Ấn và Tỷ Kiếp.`);
    } else if (ratio < 0.5) {
      const tbl = {
        3: [1.5, -0.5, -1.5, -2, 2],
        2: [2, -1.5, -2, -1, 1],
        1: [1, -2, -1.5, -1, 2],
      }[strongestOpp];
      const scale = Math.min(1, 0.4 + Math.abs(ratio - 0.5) * 6);
      fav = tbl.map((v) => v * scale);
      const lead = level === 'trung_hoa' ? 'Gần trung hòa, hơi thiên nhược' : 'Thân yếu';
      reasons.push(`${lead}, lực khắc tiết mạnh nhất là ${G[strongestOpp].vi} → cần ${strongestOpp === 2 ? 'Tỷ Kiếp chống Tài, Ấn phụ trợ' : 'Ấn sinh thân' + (strongestOpp === 3 ? ' (Ấn hóa Sát)' : ' (Ấn chế Thực Thương)') + ', Tỷ Kiếp trợ lực'}.`);
    } else {
      const inDominant = gw[4] > gw[0];
      const tbl = inDominant ? [-1.5, 1, 2, -0.5, -2] : [-1.5, 1.5, 1, 2, -2];
      const scale = Math.min(1, 0.4 + Math.abs(ratio - 0.5) * 6);
      fav = tbl.map((v) => v * scale);
      const lead = level === 'trung_hoa' ? 'Gần trung hòa, hơi thiên vượng' : 'Thân mạnh';
      reasons.push(inDominant
        ? `${lead} do Ấn nhiều → dùng Tài phá Ấn, Thực Thương tiết tú; kỵ Ấn, Tỷ Kiếp.`
        : `${lead} do Tỷ Kiếp nhiều → dùng Quan Sát chế thân, Thực Thương tiết khí, Tài hao lực; kỵ Ấn, Tỷ Kiếp.`);
    }

    // group → element
    const elFav = [0, 0, 0, 0, 0];
    for (let k = 0; k < 5; k++) elFav[groupEl(k)] = fav[k];

    // --- Điều hậu ---
    const SUMMER = [5, 6, 7], WINTER = [11, 0, 1];
    if (SUMMER.includes(monthP.z) && pct[1] >= 22) {
      elFav[4] = Math.min(2, elFav[4] + 0.8);
      reasons.push('Điều hậu: sinh mùa hạ, Hỏa vượng → cần Thủy làm mát (Cùng Thông Bảo Giám).');
    } else if (WINTER.includes(monthP.z) && pct[4] >= 22) {
      elFav[1] = Math.min(2, elFav[1] + 0.8);
      reasons.push('Điều hậu: sinh mùa đông, Thủy hàn → cần Hỏa sưởi ấm (Cùng Thông Bảo Giám).');
    }

    const order = [0, 1, 2, 3, 4].sort((a, b) => elFav[b] - elFav[a] || w[a] - w[b]);
    const roles = { dung: order[0], hy: order[1], nhan: order[2], cuu: order[3], ky: order[4] };
    reasons.push(`→ Dụng thần ${D.ELEMENTS[roles.dung].vi}, Hỷ thần ${D.ELEMENTS[roles.hy].vi}; Kỵ thần ${D.ELEMENTS[roles.ky].vi}, Cừu thần ${D.ELEMENTS[roles.cuu].vi}.`);

    // --- Tuổi âm lịch VN (theo Tết), dựng lịch theo calendar_tz của vùng (PRD §6.3) ---
    const calRegion = region === 'nam' ? 'nam' : 'bac';
    const calTz = NT.calendar.calendarTz(y, m, d, calRegion);
    const lunarVN = NT.calendar.solarToLunar(d, m, y, calTz);
    const tuoi = { lunarYear: lunarVN.year, zhi: NT.calendar.lunarYearZhi(lunarVN.year), gan: NT.calendar.lunarYearGan(lunarVN.year) };

    // --- Đại vận ---
    let daYun = [], currentDaYun = null;
    try {
      const yun = ec8.getYun(p.gender === 'female' ? 0 : 1);
      daYun = yun.getDaYun().slice(1, 10).map((dy) => {
        const gz = parseGZ(dy.getGanZhi());
        return { ...gz, startYear: dy.getStartYear(), endYear: dy.getEndYear(), startAge: dy.getStartAge() };
      });
      const cy = now.getFullYear();
      currentDaYun = daYun.find((x) => x.startYear <= cy && cy <= x.endYear) ?? null;
    } catch { /* Đại vận chỉ để tham khảo */ }

    // --- Vùng "Không rõ": nếu phương án miền Nam cho lá số hoặc ngày âm khác → trả cả hai (PRD §6.3) ---
    let alternative = null;
    if (region === 'unknown') {
      const alt = buildChart({ ...p, region: 'nam' }, now);
      const sig = (c) => ['year', 'month', 'day', 'hour'].map((k) => (c.pillars[k] ? `${c.pillars[k].g}-${c.pillars[k].z}` : '-')).join('|')
        + `|${c.lunarVN.day}/${c.lunarVN.month}/${c.lunarVN.year}/${c.lunarVN.leap}`;
      if (sig(alt) !== sig({ pillars, lunarVN })) {
        alternative = { region: 'nam', tz: alt.tz, calTz: alt.calTz, pillars: alt.pillars, lunarVN: alt.lunarVN, tuoi: alt.tuoi };
      }
    }

    return Object.freeze({
      profile: { ...p },
      hasTime, pillars, pillarInfo, nayin, dm, dmEl, tstInfo,
      region, tz, tzAuto, calTz, flags, alternative,
      weights: w, pct, groupWeights: gw, ratio, level, levelLabel, pattern, hasRoot,
      seasonKey, elFav, roles, reasons, tuoi, lunarVN, daYun, currentDaYun,
    });
  }

  NT.bazi = Object.freeze({ buildChart, POS_WEIGHT, SEASON_MULT });
})(globalThis.NT ??= {});
