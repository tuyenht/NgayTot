/**
 * NgayTot — Âm lịch Việt Nam (múi giờ UTC+7) theo thuật toán của Hồ Ngọc Đức
 * (dựa trên "Astronomical Algorithms" — Jean Meeus). Âm lịch VN có thể lệch
 * lịch Trung Quốc (UTC+8) ở một số tháng, vd Tết 1985: VN 21/01, TQ 20/02.
 * Kèm hàm giờ Mặt Trời thực (chân thái dương thời) cho lá số Bát tự.
 */
(function (NT) {
  'use strict';

  const { PI, sin, floor } = Math;
  
  /** 
   * Lấy múi giờ lịch sử Việt Nam theo PRD v3.0. 
   * Trả về offset tính bằng giờ (UTC+x).
   */
  function getHistoricalTimezone(y, m, d, region = 'north') {
    const ymd = y * 10000 + m * 100 + d;
    if (ymd < 19110501) return 7 + 6/60 + 40/3600; // Trước 1/5/1911: UTC+7:06:40
    if (ymd <= 19281231) return 7; // 1911 - 1928: UTC+7
    if (ymd <= 19421231) return 8; // 1929 - 1942: UTC+8
    if (ymd <= 19450808) return 9; // 1943 - 8/1945: UTC+9
    if (ymd <= 19591231) return 7; // 9/1945 - 1959: UTC+7
    if (ymd <= 19750430) return region === 'south' ? 8 : 7; // 1960 - 4/1975: Nam +8, Bắc +7
    return 7; // Từ 13/6/1975 đến nay (cho gọn, áp dụng từ 5/1975): UTC+7
  }

  const TZ_VN = 7; // Default modern timezone for calendar generation (Hồ Ngọc Đức algorithm usually assumes a fixed modern timezone for UI purposes, but Bazi uses true history).

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

  /** Dương lịch → Âm lịch VN. @returns {{day:number, month:number, year:number, leap:boolean}} */
  function solarToLunar(dd, mm, yy, tz = TZ_VN) {
    const key = `${yy}-${mm}-${dd}-${tz}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const dayNumber = jdFromDate(dd, mm, yy);
    const k = floor((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = newMoonDay(k + 1, tz);
    if (monthStart > dayNumber) monthStart = newMoonDay(k, tz);
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

  NT.calendar = Object.freeze({
    TZ_VN, jdFromDate, jdToDate, solarToLunar, lunarYearZhi, lunarYearGan, equationOfTime, trueSolarTime, getHistoricalTimezone,
  });
})(globalThis.NT ??= {});
