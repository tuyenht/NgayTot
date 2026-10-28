/**
 * Dựng âm lịch trực tiếp từ bảng sóc và tiết khí đã đóng băng (data/astro_events.json), độc lập với
 * công thức xấp xỉ trong js/core/calendar-vn.js. Dùng làm chuẩn đối chiếu cho phép đổi ngày âm ↔ dương.
 *
 * Quy tắc (PRD 6.2): ngày mùng Một là ngày chứa điểm sóc theo múi giờ dựng lịch; tháng 11 là tháng chứa
 * Đông chí; giữa hai tháng 11 liên tiếp có 13 tháng thì tháng đầu tiên không chứa trung khí là tháng nhuận.
 * Thời điểm lấy theo UT1 (trước 1972 chưa có UTC; từ 1972 UT1 và UTC lệch nhau dưới 0,9 giây).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DAY_MS = 86400000;
const JD_UNIX_EPOCH = 2440587.5;

export function loadAstroEvents(file = path.join(ROOT, 'data', 'astro_events.json')) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** Số ngày Julius (JDN) của ngày dân sự chứa thời điểm `iso` (UT1) theo múi giờ `tz` (giờ, có thể lẻ). */
export function localDayNumber(iso, tz) {
  const jd = Date.parse(iso + 'Z') / DAY_MS + JD_UNIX_EPOCH;
  return Math.floor(jd + 0.5 + tz / 24);
}

/**
 * Khoảng cách có dấu (giây) từ thời điểm `iso` tới nửa đêm gần nhất theo múi giờ `tz`:
 * dương = sau nửa đêm đầu ngày (lệch chút nữa thì rơi về ngày hôm trước), âm = trước nửa đêm cuối ngày
 * (lệch chút nữa thì rơi sang ngày hôm sau).
 */
export function secondsToMidnight(iso, tz) {
  const sec = (((Date.parse(iso + 'Z') / 1000 + tz * 3600) % 86400) + 86400) % 86400;
  return sec < 43200 ? sec : sec - 86400;
}

/**
 * Bảng tháng âm lịch theo một múi giờ dựng lịch.
 * @returns {{start:number, month:number, leap:boolean, year:number, length:number, socMargin:number}[]}
 *   start: JDN ngày mùng Một; year: năm âm lịch; socMargin: giây có dấu từ điểm sóc tới nửa đêm gần nhất.
 */
export function buildLunarMonths(astro, tz) {
  const soc = [], zhongqi = [], solstice = [];
  for (const [kind, seq, , ut1] of astro.events) {
    if (kind === 'soc') soc.push({ day: localDayNumber(ut1, tz), margin: secondsToMidnight(ut1, tz) });
    else if (seq[1] % 2 === 0) {
      const day = localDayNumber(ut1, tz);
      zhongqi.push(day);
      if (seq[1] === 18) solstice.push({ day, year: seq[0] });
    }
  }
  const zq = new Set(zhongqi);
  const hasZhongqi = (from, to) => { for (let d = from; d < to; d++) if (zq.has(d)) return true; return false; };
  // Chỉ số của sóc mở đầu tháng 11 ứng với từng Đông chí
  const m11 = solstice.map((w) => {
    let i = soc.findIndex((s) => s.day > w.day);
    if (i < 0) i = soc.length;
    return { index: i - 1, year: w.year };
  }).filter((x) => x.index >= 0);

  const months = [];
  for (let s = 0; s + 1 < m11.length; s++) {
    const a = m11[s].index, b = m11[s + 1].index;
    if (b + 1 >= soc.length) break;
    const count = b - a; // 12 hoặc 13 tháng giữa hai tháng 11
    let leapAt = -1;
    if (count === 13) {
      for (let j = a + 1; j < b; j++) if (!hasZhongqi(soc[j].day, soc[j + 1].day)) { leapAt = j; break; }
    }
    // Tháng 11, 12 mở đầu chu kỳ thuộc năm âm lịch trùng năm dương lịch của Đông chí đó
    const suiYear = m11[s].year;
    let number = 11, year = suiYear;
    for (let j = a; j < b; j++) {
      const leap = j === leapAt;
      if (j > a && !leap) { number = number === 12 ? 1 : number + 1; if (number === 1) year = suiYear + 1; }
      months.push({ start: soc[j].day, month: number, leap, year, length: soc[j + 1].day - soc[j].day, socMargin: soc[j].margin });
    }
  }
  return months;
}

export function jdnToDate(jd) {
  const a = jd + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor((b * 146097) / 4);
  const d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor((1461 * d) / 4), m = Math.floor((5 * e + 2) / 153);
  return [e - Math.floor((153 * m + 2) / 5) + 1, m + 3 - 12 * Math.floor(m / 10), b * 100 + d - 4800 + Math.floor(m / 10)];
}

/** Tra ngày âm của một JDN trong bảng tháng (tìm nhị phân). */
export function lookupLunar(months, jdn) {
  let lo = 0, hi = months.length - 1;
  if (!months.length || jdn < months[0].start || jdn >= months[hi].start + months[hi].length) return null;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (months[mid].start <= jdn) lo = mid; else hi = mid - 1;
  }
  const m = months[lo];
  return { day: jdn - m.start + 1, month: m.month, year: m.year, leap: m.leap, length: m.length, socMargin: m.socMargin };
}

/**
 * Sai số chuẩn σ của ΔT (giây) cho một năm, theo mô hình Huber (2000) như Espenak và Meeus dùng trong
 * "Five Millennium Canon of Solar Eclipses" (eclipsewise.com/help/uncertainty.html):
 * σ = 365,25 × N × √[(N × Q / 3) × (1 + N / M)] / 1000, N = năm − 2005, Q = 0,058 ms²/năm, M = 2500 năm.
 * Trước 2005 ΔT đã đo; bảng 2 của Stephenson và Houlden (1986) ghi σ ≈ 1 giây năm 1800, 0,1 giây năm 1900,
 * nên lấy cận trên 1 giây. Bản cùng công thức trong js/core/calendar-vn.js (deltaTSigma); kiểm thử so hai bản.
 */
export function sigmaDeltaT(year) {
  const N = year - 2005;
  if (N <= 0) return 1;
  return Math.max(1, (365.25 * N * Math.sqrt(((N * 0.058) / 3) * (1 + N / 2500))) / 1000);
}

/** Cửa sổ cờ ranh giới (giây) của PRD 5.3: max(10 phút, 3 × σ_ΔT của năm). */
export const riskWindow = (year) => Math.max(600, 3 * sigmaDeltaT(year));

/**
 * Trung khí sát nửa đêm làm đổi tên tháng: với mỗi trung khí cách nửa đêm (giờ dựng lịch `tz`) dưới cửa sổ rủi ro,
 * dời nó sang ngày bên kia nửa đêm, dựng lại lịch và so tên tháng (số tháng, nhuận, năm) theo ngày mùng Một.
 * Ngày mùng Một không đổi vì chỉ sóc quyết định ngày đầu tháng.
 * @returns {{start:number, margin:number, term:number, month:number, leap:boolean, year:number}[]} mỗi tháng đổi tên một dòng,
 *   kèm tên tháng nếu trung khí rơi sang ngày bên kia; `margin`: giây có dấu từ trung khí tới nửa đêm gần nhất.
 */
export function zhongqiRisks(astro, tz, yearFrom, yearTo) {
  const label = (ms) => new Map(ms.map((m) => [m.start, m]));
  const base = label(buildLunarMonths(astro, tz));
  const out = [];
  astro.events.forEach(([kind, seq, , ut1], e) => {
    if (kind === 'soc' || seq[1] % 2 !== 0 || seq[0] < yearFrom - 1 || seq[0] > yearTo + 1) return;
    const margin = secondsToMidnight(ut1, tz);
    if (Math.abs(margin) >= riskWindow(seq[0])) return;
    const shifted = new Date(Date.parse(ut1 + 'Z') + (margin >= 0 ? -(margin + 1) : 1 - margin) * 1000).toISOString().slice(0, 19);
    const events = astro.events.slice();
    events[e] = [kind, seq, astro.events[e][2], shifted, ...astro.events[e].slice(4)];
    for (const m of buildLunarMonths({ ...astro, events }, tz)) {
      const b = base.get(m.start);
      if (b && (b.month !== m.month || b.leap !== m.leap || b.year !== m.year)) {
        out.push({ start: m.start, margin: Math.round(margin), term: seq[1], month: m.month, leap: m.leap, year: m.year });
      }
    }
  });
  return out;
}
