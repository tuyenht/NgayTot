/**
 * NgayTot — Âm lịch Việt Nam theo thuật toán của Hồ Ngọc Đức
 * (dựa trên "Astronomical Algorithms" — Jean Meeus), múi giờ dựng lịch theo thời kỳ (PRD §6.3).
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

  /**
   * Dương lịch → Âm lịch VN. Mặc định dựng lịch theo calendarTz (phương án Bắc).
   * @returns {{day:number, month:number, year:number, leap:boolean}}
   */
  function solarToLunar(dd, mm, yy, tz = calendarTz(yy, mm, dd)) {
    const key = `${yy}-${mm}-${dd}-${tz}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const dayNumber = jdFromDate(dd, mm, yy);
    // Ước lượng chỉ số kỳ sóc theo kỳ trung bình có thể lệch 1 so với sóc thật (gây "mùng 0" ở
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
      const lunar = globalThis.Solar.fromYmd(y, m, d).getLunar();
      const dg = lunar.getDayGanIndex();
      const dz = lunar.getDayZhiIndex();
      const mg = lunar.getMonthGanIndex();
      const mz = lunar.getMonthZhiIndex();
      const yg = lunar.getYearGanIndex();
      const yz = lunar.getYearZhiIndex();
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
    TZ_VN, VERIFIED_RANGE, SUPPORTED_RANGE, jdFromDate, jdToDate, solarToLunar, solarToLunarVN, lunarToSolar,
    lunarYearZhi, lunarYearGan, equationOfTime, trueSolarTime, calendarTz, civilTz, civilTzNote, fmtTz, inVerifiedRange,
    solarToGanZhi,
  });
})(globalThis.NT ??= {});
