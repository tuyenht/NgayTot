/**
 * NgayTot — Âm lịch Việt Nam, múi giờ dựng lịch theo thời kỳ (PRD §6.3).
 * Ngày mùng Một và tháng nhuận tra từ bảng tháng đã tính trước (js/core/lunar-months.js, sinh từ bảng sóc và
 * tiết khí đóng băng ở G1). Ngoài phạm vi của bảng, hoặc khi bảng chưa nạp, dùng thuật toán của Hồ Ngọc Đức
 * (dựa trên "Astronomical Algorithms" — Jean Meeus): công thức xấp xỉ, có thể lệch một ngày khi điểm sóc sát nửa đêm.
 * Âm lịch VN có thể lệch lịch Trung Quốc (UTC+8) ở một số tháng, vd Tết 1985: VN 21/01, TQ 20/02.
 * Kèm hàm giờ Mặt Trời thực (chân thái dương thời) cho lá số Bát tự.
 *
 * Hai loại múi giờ — KHÔNG được gộp (PRD §6.3):
 *  - calendarTz: múi giờ dùng để DỰNG âm lịch (ngày nào là mùng Một, tháng nào nhuận).
 *  - civilTz:    giờ ĐỒNG HỒ tại nơi và thời điểm sinh, dùng để đổi giờ sinh ra UTC.
 * region: 'bac' | 'nam' | 'unknown'.
 */
(function (NT) {
  'use strict';

  const { PI, sin, floor } = Math;

  const TZ_VN = 7; // múi giờ chính thức hiện nay (QĐ 121-CP/1967, QĐ 134/2002/QĐ-TTg)
  /** Phạm vi năm (PRD §1.4). */
  const VERIFIED_RANGE = Object.freeze({ from: 1929, to: 2100 });
  const SUPPORTED_RANGE = Object.freeze({ from: 1912, to: 2100 });
  const BEIJING_LMT = 7 + 45 / 60 + 40 / 3600; // kinh tuyến Bắc Kinh, lịch TQ 1912–1928

  /**
   * Múi giờ dựng âm lịch (PRD §6.3, bảng calendar_tz). Mốc 1968, 1976 theo Hồ Ngọc Đức;
   * mốc 1912, 1929 theo Yuk Tung Liu. 'unknown' dùng phương án Bắc, nơi gọi tự so với 'nam'.
   */
  function calendarTz(y, m, d, region = 'bac') {
    if (y >= 1976) return 7;
    if (y >= 1968) return region === 'nam' ? 8 : 7; // 1968–1975: Bắc lịch Việt, Nam theo lịch cũ
    if (y >= 1929) return 8;
    return BEIJING_LMT; // 1912–1928 (ngoài vùng cam kết); trước 1912 không cam kết
  }

  /**
   * Giờ đồng hồ (PRD §6.3, bảng civil_tz). Miền Nam: IANA Asia/Ho_Chi_Minh, mốc theo giờ địa phương.
   * Miền Bắc: UTC+7 từ 02/09/1945; vùng Pháp kiểm soát dùng UTC+8 từ 01/04/1947 đến 10/1954 [CK] —
   * không tự áp, người dùng chọn tay.
   */
  const CIVIL_SOUTH = [ // [trước ngày yyyymmdd, độ lệch giờ]
    [19110501, 7 + 6 / 60 + 30 / 3600],
    [19430101, 7],
    [19450315, 8],
    [19450902, 9],
    [19470401, 7],
    [19550701, 8],
    [19600101, 7],
    [19750613, 8],
  ];
  function civilTz(y, m, d, region = 'bac') {
    const ymd = y * 10000 + m * 100 + d;
    if (region !== 'nam' && ymd >= 19450902) return 7;
    for (const [before, off] of CIVIL_SOUTH) if (ymd < before) return off;
    return 7;
  }
  /** Ghi chú nguồn cho độ lệch đề xuất (hiển thị trên giao diện). */
  function civilTzNote(y, m, d, region = 'bac') {
    const ymd = y * 10000 + m * 100 + d;
    const notes = [];
    if (region !== 'nam' && ymd >= 19470401 && ymd < 19541101) notes.push('Vùng do Pháp kiểm soát ở miền Bắc dùng UTC+8 (01/04/1947 – 10/1954, chưa đối chiếu) — chọn tay nếu sinh ở vùng đó.');
    if (region === 'unknown' && civilTz(y, m, d, 'bac') !== civilTz(y, m, d, 'nam')) notes.push(`Miền Bắc UTC+${fmtTz(civilTz(y, m, d, 'bac'))}, miền Nam UTC+${fmtTz(civilTz(y, m, d, 'nam'))} — ứng dụng sẽ hiện cả hai nếu lá số khác nhau.`);
    return notes;
  }
  function fmtTz(h) {
    const hh = floor(h), rest = Math.round((h - hh) * 3600);
    if (!rest) return String(hh);
    const mm = floor(rest / 60), ss = rest % 60;
    return `${hh}:${String(mm).padStart(2, '0')}${ss ? ':' + String(ss).padStart(2, '0') : ''}`;
  }
  const inVerifiedRange = (y) => y >= VERIFIED_RANGE.from && y <= VERIFIED_RANGE.to;

  function jdFromDate(dd, mm, yy) {
    const a = floor((14 - mm) / 12);
    const y = yy + 4800 - a;
    const m = mm + 12 * a - 3;
    let jd = dd + floor((153 * m + 2) / 5) + 365 * y + floor(y / 4) - floor(y / 100) + floor(y / 400) - 32045;
    if (jd < 2299161) jd = dd + floor((153 * m + 2) / 5) + 365 * y + floor(y / 4) - 32083;
    return jd;
  }

  function jdToDate(jd) {
    let a, b, c;
    if (jd > 2299160) {
      a = jd + 32044;
      b = floor((4 * a + 3) / 146097);
      c = a - floor((b * 146097) / 4);
    } else {
      b = 0;
      c = jd + 32082;
    }
    const d = floor((4 * c + 3) / 1461);
    const e = c - floor((1461 * d) / 4);
    const m = floor((5 * e + 2) / 153);
    return [e - floor((153 * m + 2) / 5) + 1, m + 3 - 12 * floor(m / 10), b * 100 + d - 4800 + floor(m / 10)];
  }

  function newMoonDay(k, tz) {
    const T = k / 1236.85, T2 = T * T, T3 = T2 * T, dr = PI / 180;
    let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    Jd1 += 0.00033 * sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let C1 = (0.1734 - 0.000393 * T) * sin(M * dr) + 0.0021 * sin(2 * dr * M);
    C1 -= 0.4068 * sin(Mpr * dr) - 0.0161 * sin(dr * 2 * Mpr);
    C1 -= 0.0004 * sin(dr * 3 * Mpr);
    C1 += 0.0104 * sin(dr * 2 * F) - 0.0051 * sin(dr * (M + Mpr));
    C1 -= 0.0074 * sin(dr * (M - Mpr)) - 0.0004 * sin(dr * (2 * F + M));
    C1 -= 0.0004 * sin(dr * (2 * F - M)) - 0.0006 * sin(dr * (2 * F + Mpr));
    C1 += 0.0010 * sin(dr * (2 * F - Mpr)) + 0.0005 * sin(dr * (2 * Mpr + M));
    const deltat = T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return floor(Jd1 + C1 - deltat + 0.5 + tz / 24);
  }

  function sunLongitudeSector(jdn, tz) {
    const T = (jdn - 2451545.5 - tz / 24) / 36525, T2 = T * T, dr = PI / 180;
    const M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * sin(dr * M);
    DL += (0.019993 - 0.000101 * T) * sin(dr * 2 * M) + 0.00029 * sin(dr * 3 * M);
    let L = (L0 + DL) * dr;
    L -= PI * 2 * floor(L / (PI * 2));
    return floor((L / PI) * 6);
  }

  function lunarMonth11(yy, tz) {
    const off = jdFromDate(31, 12, yy) - 2415021;
    const k = floor(off / 29.530588853);
    let nm = newMoonDay(k, tz);
    if (sunLongitudeSector(nm, tz) >= 9) nm = newMoonDay(k - 1, tz);
    return nm;
  }

  function leapMonthOffset(a11, tz) {
    const k = floor((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last, i = 1;
    let arc = sunLongitudeSector(newMoonDay(k + i, tz), tz);
    do {
      last = arc;
      i++;
      arc = sunLongitudeSector(newMoonDay(k + i, tz), tz);
    } while (arc !== last && i < 14);
    return i - 1;
  }

  const cache = new Map();

  // ── Bảng tháng đã tính trước ────────────────────────────────────────────────────────────────────
  const CODE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const zoneKey = (tz) => (tz === 7 ? '7' : tz === 8 ? '8' : tz === BEIJING_LMT ? 'bj' : null);
  const decoded = new Map();
  /** Bảng tháng của một múi giờ dựng lịch, hoặc null nếu không có (múi giờ lạ, tệp bảng chưa nạp). */
  function monthTable(tz) {
    const key = zoneKey(tz);
    const src = key && NT.lunarMonths && NT.lunarMonths.tables[key];
    if (!src) return null;
    let t = decoded.get(key);
    if (t) return t;
    const n = src.codes.length;
    t = { starts: new Array(n), months: new Array(n), leaps: new Array(n), lengths: new Array(n), years: new Array(n), index: new Map(), risk: new Map(src.risk),
      zqRisk: new Map((src.zqRisk || []).map(([i, seconds, term, month, leap, year]) => [i, Object.freeze({ seconds, term, month, leap: leap === 1, year })])) };
    let start = src.start, year = src.year;
    for (let i = 0; i < n; i++) {
      const v = CODE.indexOf(src.codes[i]);
      const month = (v >> 2) + 1, leap = (v & 2) !== 0, length = 29 + (v & 1);
      if (i > 0 && month === 1 && !leap) year++;
      t.starts[i] = start; t.months[i] = month; t.leaps[i] = leap; t.lengths[i] = length; t.years[i] = year;
      t.index.set(`${year}:${month}:${leap ? 1 : 0}`, i);
      start += length;
    }
    t.end = start; // ngày đầu tiên nằm ngoài bảng
    t.yearFrom = src.year; t.yearTo = year;
    decoded.set(key, t);
    return t;
  }
  /** Chỉ số tháng chứa ngày `jdn` trong bảng, hoặc -1 nếu ngày nằm ngoài bảng. */
  function findMonth(t, jdn) {
    if (jdn < t.starts[0] || jdn >= t.end) return -1;
    let lo = 0, hi = t.starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (t.starts[mid] <= jdn) lo = mid; else hi = mid - 1;
    }
    return lo;
  }
  // ── Tiết khí đã tính trước (js/core/solar-terms.js) ─────────────────────────────────────────────
  // Tên chữ Hán theo chỉ số (0 = Xuân phân) để dùng chung từ điển NT.vi.jieqi với thư viện lịch
  const TERM_KEYS = Object.freeze(['春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰']);
  const termCache = new Map();
  /** Số giây UT1 (tính từ 00:00 ngày 1/1) của 24 tiết khí năm `yy`, hoặc null nếu năm nằm ngoài bảng hay bảng chưa nạp. */
  function termSeconds(yy) {
    const T = NT.solarTerms;
    if (!T || yy < T.yearFrom || yy > T.yearTo) return null;
    let row = termCache.get(yy);
    if (!row) {
      const at = (yy - T.yearFrom) * 120;
      row = [];
      for (let i = 0; i < 24; i++) row.push(parseInt(T.codes.substr(at + i * 5, 5), 36));
      termCache.set(yy, row);
    }
    return row;
  }
  /**
   * Tiết khí rơi vào ngày dương đã cho theo múi giờ dựng lịch (mặc định theo calendarTz, tức giờ Việt Nam từ 1968/1976).
   * @returns {{index:number, key:string, boundarySeconds:number}|null|undefined}
   *   null: ngày không chứa tiết khí; undefined: không có bảng cho năm này (nơi gọi tự dùng nguồn khác).
   *   boundarySeconds: khoảng cách có dấu từ thời điểm tiết khí tới nửa đêm gần nhất (dương: ngay sau nửa đêm đầu ngày).
   */
  function solarTermOn(dd, mm, yy, tz = calendarTz(yy, mm, dd)) {
    const row = termSeconds(yy);
    if (!row) return undefined;
    const dayIndex = jdFromDate(dd, mm, yy) - jdFromDate(1, 1, yy);
    for (let i = 0; i < 24; i++) {
      const local = row[i] + Math.round(tz * 3600);
      if (floor(local / 86400) === dayIndex) {
        const sec = ((local % 86400) + 86400) % 86400;
        return Object.freeze({ index: i, key: TERM_KEYS[i], boundarySeconds: sec < 43200 ? sec : sec - 86400 });
      }
    }
    return null;
  }

  /**
   * Tháng theo tiết khí (nguyệt kiến, PRD §6.4) của một ngày dương: tháng đổi ở ngày chứa một trong 12 tiết
   * (chỉ số lẻ), Lập xuân (chỉ số 21) mở tháng Dần và đổi năm can chi. "Ngày chứa tiết" theo múi giờ dựng lịch,
   * không theo giờ Bắc Kinh (14.2 dòng 14). Can tháng theo phép Ngũ hổ độn từ can của năm tính theo Lập xuân.
   * @returns {{ganIndex:number, zhiIndex:number, yearGanIndex:number, yearZhiIndex:number, termIndex:number}|undefined}
   *   chỉ số can 0 = Giáp, chi 0 = Tý; termIndex: tiết mở đầu tháng; undefined nếu ngày nằm ngoài bảng tiết khí.
   */
  function monthPillar(dd, mm, yy, tz = calendarTz(yy, mm, dd)) {
    const jdn = jdFromDate(dd, mm, yy);
    let best = null;
    for (const Y of [yy - 1, yy]) {
      const row = termSeconds(Y);
      if (!row) return undefined;
      const jan1 = jdFromDate(1, 1, Y);
      for (let i = 1; i < 24; i += 2) {
        const day = jan1 + floor((row[i] + Math.round(tz * 3600)) / 86400);
        if (day <= jdn && (!best || day > best.day)) best = { day, i, Y };
      }
    }
    const n = ((best.i - 21 + 24) % 24) / 2; // 0 = tháng Dần
    const solarYear = best.i === 19 ? best.Y - 1 : best.Y; // tháng Sửu (Tiểu hàn, tháng 1 dương lịch) thuộc năm trước Lập xuân
    const yearGanIndex = (((solarYear - 4) % 10) + 10) % 10;
    return Object.freeze({
      ganIndex: (yearGanIndex * 2 + 2 + n) % 10,
      zhiIndex: (2 + n) % 12,
      yearGanIndex,
      yearZhiIndex: (((solarYear - 4) % 12) + 12) % 12,
      termIndex: best.i,
    });
  }

  /**
   * Các mục của thư viện lịch (vendor/lunar.js) phụ thuộc tháng tiết khí — can chi tháng, năm theo Lập xuân,
   * thần trực nhật (Trực), thần nhật hoàng/hắc đạo, nghi/kỵ, thần sát — tính lại với tháng của monthPillar.
   * Thư viện đổi tháng theo ngày tiết của giờ UTC+8; ở tiết rơi trong giờ cuối của ngày theo giờ Việt Nam
   * nó đổi chậm một ngày. Ngày nằm ngoài bảng tiết khí thì giữ nguyên kết quả của thư viện.
   * opts: `region` ('bac' | 'nam'), `tz` (múi giờ dựng lịch, mặc định theo calendarTz).
   * @returns {object} `lunar`: đối tượng Lunar của thư viện (dùng cho các mục không phụ thuộc tháng: can chi ngày, Tú…);
   *   `adjusted`: tháng tiết khí khác với thư viện.
   */
  const almanacCache = new Map();
  function dayAlmanac(dd, mm, yy, { region = 'bac', tz = calendarTz(yy, mm, dd, region) } = {}) {
    const key = `${yy}-${mm}-${dd}-${tz}`;
    const hit = almanacCache.get(key);
    if (hit) return hit;
    const lunar = globalThis.Solar.fromYmd(yy, mm, dd).getLunar();
    const U = globalThis.LunarUtil;
    const mp = monthPillar(dd, mm, yy, tz);
    const lib = {
      ganIndex: lunar.getMonthGanIndex(), zhiIndex: lunar.getMonthZhiIndex(),
      yearGanIndex: lunar.getYearGanIndexByLiChun(), yearZhiIndex: lunar.getYearZhiIndexByLiChun(),
    };
    const p = mp || lib;
    const dayGZ = lunar.getDayInGanZhi();
    const dayZ = lunar.getDayZhiIndex();
    // Cùng công thức với getZhiXing, getDayTianShen, getDayYi… của thư viện, với tháng tiết khí của monthPillar
    const monthZhi = U.ZHI[p.zhiIndex + 1];
    const monthGZ = U.GAN[p.ganIndex + 1] + monthZhi;
    const tianShen = U.TIAN_SHEN[(dayZ + U.ZHI_TIAN_SHEN_OFFSET[monthZhi]) % 12 + 1];
    const tianShenType = U.TIAN_SHEN_TYPE[tianShen];
    const out = Object.freeze({
      lunar,
      adjusted: p.ganIndex !== lib.ganIndex || p.zhiIndex !== lib.zhiIndex || p.yearGanIndex !== lib.yearGanIndex || p.yearZhiIndex !== lib.yearZhiIndex,
      monthGanIndex: p.ganIndex, monthZhiIndex: p.zhiIndex,
      yearGanIndex: p.yearGanIndex, yearZhiIndex: p.yearZhiIndex,
      yearGanZhi: U.GAN[p.yearGanIndex + 1] + U.ZHI[p.yearZhiIndex + 1],
      yi: U.getDayYi(monthGZ, dayGZ), ji: U.getDayJi(monthGZ, dayGZ),
      jiShen: U.getDayJiShen(p.zhiIndex, dayGZ), xiongSha: U.getDayXiongSha(p.zhiIndex, dayGZ),
      zhiXing: U.ZHI_XING[((dayZ - p.zhiIndex + 12) % 12) + 1],
      tianShen, tianShenType, tianShenLuck: U.TIAN_SHEN_TYPE_LUCK[tianShenType],
    });
    if (almanacCache.size > 3000) almanacCache.clear();
    almanacCache.set(key, out);
    return out;
  }

  /**
   * Thông tin tháng âm chứa một ngày dương: ngày mùng Một (JDN), số ngày, và nếu điểm sóc mở đầu tháng cách nửa đêm
   * dưới ngưỡng của bảng thì `boundarySeconds` là khoảng cách có dấu (dương: sóc ngay sau nửa đêm, lệch chút nữa thì
   * mùng Một lùi về hôm trước; âm: sóc ngay trước nửa đêm, lệch chút nữa thì mùng Một sang hôm sau) — cờ BOUNDARY_RISK (PRD §5.3).
   * Tháng kế tiếp có điểm sóc sát nửa đêm thì trả ở `nextBoundarySeconds` (ngày cuối tháng này có thể thuộc tháng sau).
   * Tháng sẽ đổi tên (số tháng, nhuận) nếu một trung khí sát nửa đêm rơi sang ngày bên kia thì `zhongqiRisk` cho biết
   * trung khí đó (`term`, 0 = Xuân phân), khoảng cách `seconds` và tên tháng khi ấy (`month`, `leap`, `year`).
   * @returns {{start:number, length:number, boundarySeconds:number|null, nextBoundarySeconds:number|null, zhongqiRisk:object|null, fromTable:boolean}|null}
   */
  function lunarMonthInfo(dd, mm, yy, tz = calendarTz(yy, mm, dd)) {
    const t = monthTable(tz);
    const jdn = jdFromDate(dd, mm, yy);
    const i = t ? findMonth(t, jdn) : -1;
    if (i < 0) return null;
    return Object.freeze({
      start: t.starts[i], length: t.lengths[i], fromTable: true,
      boundarySeconds: t.risk.has(i) ? t.risk.get(i) : null,
      nextBoundarySeconds: t.risk.has(i + 1) ? t.risk.get(i + 1) : null,
      zhongqiRisk: t.zqRisk.get(i) || null,
    });
  }

  /**
   * Sai số chuẩn σ của ΔT (giây) cho một năm — cùng công thức với sigmaDeltaT của tools/astro/lunar-from-astro.mjs:
   * mô hình Huber (2000) theo Espenak và Meeus, mốc 2005; trước 2005 ΔT đã đo, lấy cận trên 1 giây.
   */
  function deltaTSigma(year) {
    const N = year - 2005;
    if (N <= 0) return 1;
    return Math.max(1, (365.25 * N * Math.sqrt(((N * 0.058) / 3) * (1 + N / 2500))) / 1000);
  }

  /**
   * Dương lịch → Âm lịch VN. Mặc định dựng lịch theo calendarTz (phương án Bắc).
   * @returns {{day:number, month:number, year:number, leap:boolean}}
   */
  function solarToLunar(dd, mm, yy, tz = calendarTz(yy, mm, dd)) {
    const key = `${yy}-${mm}-${dd}-${tz}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const dayNumber = jdFromDate(dd, mm, yy);
    const table = monthTable(tz);
    const ti = table ? findMonth(table, dayNumber) : -1;
    if (ti >= 0) {
      const res = Object.freeze({ day: dayNumber - table.starts[ti] + 1, month: table.months[ti], year: table.years[ti], leap: table.leaps[ti] });
      if (cache.size > 5000) cache.clear();
      cache.set(key, res);
      return res;
    }
    // Ngoài bảng: công thức xấp xỉ. Ước lượng chỉ số kỳ sóc theo kỳ trung bình có thể lệch 1 so với sóc thật (gây "mùng 0" ở
    // 07/05/2054, 09/04/2062) → dò lại đến khi sóc(k) ≤ ngày < sóc(k+1).
    let k = floor((dayNumber - 2415021.076998695) / 29.530588853);
    while (newMoonDay(k + 1, tz) <= dayNumber) k++;
    while (newMoonDay(k, tz) > dayNumber) k--;
    const monthStart = newMoonDay(k, tz);
    let a11 = lunarMonth11(yy, tz);
    let b11 = a11;
    let lunarYear;
    if (a11 >= monthStart) {
      lunarYear = yy;
      a11 = lunarMonth11(yy - 1, tz);
    } else {
      lunarYear = yy + 1;
      b11 = lunarMonth11(yy + 1, tz);
    }
    const lunarDay = dayNumber - monthStart + 1;
    const diff = floor((monthStart - a11) / 29);
    let leap = false;
    let lunarMonth = diff + 11;
    if (b11 - a11 > 365) {
      const leapDiff = leapMonthOffset(a11, tz);
      if (diff >= leapDiff) {
        lunarMonth = diff + 10;
        if (diff === leapDiff) leap = true;
      }
    }
    if (lunarMonth > 12) lunarMonth -= 12;
    if (lunarMonth >= 11 && diff < 4) lunarYear -= 1;
    const res = Object.freeze({ day: lunarDay, month: lunarMonth, year: lunarYear, leap });
    if (cache.size > 5000) cache.clear();
    cache.set(key, res);
    return res;
  }

  /** Âm lịch VN theo vùng (PRD §6.3): dùng calendarTz của vùng đó. */
  const solarToLunarVN = (dd, mm, yy, region = 'bac') => solarToLunar(dd, mm, yy, calendarTz(yy, mm, dd, region));

  /**
   * Âm lịch → Dương lịch (Hồ Ngọc Đức). tz mặc định theo calendarTz của ngày kết quả (phương án Bắc).
   * @returns {[number, number, number]|null} [dd, mm, yy]; null nếu tháng nhuận không tồn tại.
   */
  function lunarToSolar(lDay, lMonth, lYear, lLeap = false, tz, region = 'bac') {
    const run = (z) => {
      const table = monthTable(z);
      if (table && lYear >= table.yearFrom && lYear <= table.yearTo) {
        const i = table.index.get(`${lYear}:${lMonth}:${lLeap ? 1 : 0}`);
        return i === undefined ? null : jdToDate(table.starts[i] + lDay - 1);
      }
      let a11, b11;
      if (lMonth < 11) { a11 = lunarMonth11(lYear - 1, z); b11 = lunarMonth11(lYear, z); }
      else { a11 = lunarMonth11(lYear, z); b11 = lunarMonth11(lYear + 1, z); }
      const k = floor(0.5 + (a11 - 2415021.076998695) / 29.530588853);
      let off = lMonth - 11;
      if (off < 0) off += 12;
      if (b11 - a11 > 365) {
        const leapOff = leapMonthOffset(a11, z);
        let leapMonth = leapOff - 2;
        if (leapMonth < 0) leapMonth += 12;
        if (lLeap && lMonth !== leapMonth) return null;
        if (lLeap || off >= leapOff) off += 1;
      } else if (lLeap) return null;
      return jdToDate(newMoonDay(k + off, z) + lDay - 1);
    };
    // Ngày âm không tồn tại (ngày 30 của tháng thiếu, ngày 0, ngày 31…) → null (PRD §4.5): đổi ngược phải ra đúng ngày đã hỏi.
    const check = (res, z) => {
      if (!res || !Number.isInteger(lDay) || lDay < 1 || lDay > 30) return null;
      const back = solarToLunar(res[0], res[1], res[2], z);
      return back.day === lDay && back.month === lMonth && back.year === lYear && back.leap === !!lLeap ? res : null;
    };
    if (tz != null) return check(run(tz), tz);
    // Không truyền tz: thử từng múi dựng lịch, nhận kết quả mà múi đó đúng là múi của thời kỳ (và vùng) chứa ngày tìm được.
    for (const z of [TZ_VN, 8, BEIJING_LMT]) {
      const res = check(run(z), z);
      if (res && calendarTz(res[2], res[1], res[0], region) === z) return res;
    }
    return null;
  }

  /** Chi của năm âm lịch (tuổi theo Tết — cách tính tuổi dân gian VN). */
  const lunarYearZhi = (lunarYear) => (((lunarYear - 4) % 12) + 12) % 12;
  const lunarYearGan = (lunarYear) => (((lunarYear - 4) % 10) + 10) % 10;

  /**
   * Phương trình thời gian (phút), sai số ~±0.5 phút — đủ cho phân định canh giờ.
   * @param {number} dayOfYear 1..366
   */
  function equationOfTime(dayOfYear) {
    const B = (2 * PI * (dayOfYear - 81)) / 364;
    return 9.87 * sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * sin(B);
  }

  /**
   * Quy đổi giờ đồng hồ tại nơi sinh → giờ Mặt Trời thực địa phương.
   * @returns {{utcMs:number, tst:Date, offsetMin:number}} tst biểu diễn bằng các trường UTC.
   */
  function trueSolarTime({ y, m, d, hh, mi }, tzHours, lon) {
    const utcMs = Date.UTC(y, m - 1, d, hh, mi) - tzHours * 3600e3;
    const doy = floor((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 0)) / 864e5);
    const offsetMin = lon * 4 + equationOfTime(doy);
    return { utcMs, tst: new Date(utcMs + offsetMin * 60e3), offsetMin: offsetMin - tzHours * 60 };
  }

  /**
   * Tính Can Chi cho Ngày, Tháng, Năm từ Dương Lịch.
   */
  function solarToGanZhi(d, m, y) {
    if (typeof globalThis.Solar !== 'undefined' && globalThis.Solar.fromYmd) {
      const al = dayAlmanac(d, m, y);
      const lunar = al.lunar;
      const dg = lunar.getDayGanIndex();
      const dz = lunar.getDayZhiIndex();
      const mg = al.monthGanIndex; // tháng tiết khí theo giờ Việt Nam
      const mz = al.monthZhiIndex;
      // Năm can chi theo năm âm lịch Việt Nam (đổi ở Tết của lịch Việt), không theo năm âm của thư viện (lịch Trung Quốc)
      const vnYear = solarToLunar(d, m, y).year;
      const yg = lunarYearGan(vnYear);
      const yz = lunarYearZhi(vnYear);
      const D = NT.data;

      return {
        dCan: D ? D.GAN_VI[dg] : '',
        dChi: D ? D.ZHI_VI[dz] : '',
        mCan: D ? D.GAN_VI[mg] : '',
        mChi: D ? D.ZHI_VI[mz] : '',
        yCan: D ? D.GAN_VI[yg] : '',
        yChi: D ? D.ZHI_VI[yz] : '',
        dCanIndex: dg,
        dChiIndex: dz
      };
    }
    // Fallback nếu Solar chưa khởi tạo
    const jd = jdFromDate(d, m, y);
    const dg = (jd + 9) % 10;
    const dz = (jd + 1) % 12;
    const D = NT.data;
    return {
      dCan: D ? D.GAN_VI[dg] : '',
      dChi: D ? D.ZHI_VI[dz] : '',
      mCan: '',
      mChi: '',
      yCan: '',
      yChi: '',
      dCanIndex: dg,
      dChiIndex: dz
    };
  }

  NT.calendar = Object.freeze({
    TZ_VN, TERM_KEYS, VERIFIED_RANGE, SUPPORTED_RANGE, jdFromDate, jdToDate, solarToLunar, solarToLunarVN, lunarToSolar,
    lunarMonthInfo, deltaTSigma, solarTermOn, monthPillar, dayAlmanac, lunarYearZhi, lunarYearGan, equationOfTime, trueSolarTime, calendarTz, civilTz, civilTzNote, fmtTz, inVerifiedRange,
    solarToGanZhi,
  });
})(globalThis.NT ??= {});
