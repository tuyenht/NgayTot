/**
 * Sinh js/core/solar-terms.js: thời điểm 24 tiết khí của từng năm, lấy từ data/astro_events.json (đã đóng băng ở G1).
 * Phần lõi dùng bảng này để biết một ngày theo giờ Việt Nam có chứa tiết khí nào (PRD 6.3; HIEN-TRANG 14.2 dòng 14).
 *
 *     node tools/astro/build_solar_terms.mjs          ghi tệp
 *     node tools/astro/build_solar_terms.mjs --check  chỉ so tệp hiện có với kết quả sinh lại
 *
 * Mỗi tiết khí mã hóa thành 5 ký tự cơ số 36: số giây UT1 tính từ 00:00:00 ngày 1/1 của năm đó.
 * Mỗi năm 24 tiết khí theo chỉ số 0–23 (0 = Xuân phân), các năm nối liền nhau.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAstroEvents } from './lunar-from-astro.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'js', 'core', 'solar-terms.js');
export const YEAR_FROM = 1911, YEAR_TO = 2101;

export function generate() {
  const astro = loadAstroEvents();
  const hash = createHash('sha256').update(readFileSync(path.join(ROOT, 'data', 'astro_events.json'))).digest('hex');
  const byYear = new Map();
  for (const [kind, seq, , ut1] of astro.events) {
    if (kind !== 'tiet_khi') continue;
    const year = Number(ut1.slice(0, 4));
    if (year !== seq[0]) throw new Error(`Tiết khí ${seq} có năm UT1 khác năm TT`);
    if (year < YEAR_FROM || year > YEAR_TO) continue;
    const seconds = (Date.parse(ut1 + 'Z') - Date.UTC(year, 0, 1)) / 1000;
    if (!byYear.has(year)) byYear.set(year, new Array(24).fill(null));
    byYear.get(year)[seq[1]] = seconds;
  }
  let codes = '';
  for (let y = YEAR_FROM; y <= YEAR_TO; y++) {
    const row = byYear.get(y);
    if (!row || row.some((v) => v === null || v < 0 || v >= 36 ** 5)) throw new Error(`Năm ${y} thiếu tiết khí`);
    codes += row.map((v) => v.toString(36).padStart(5, '0')).join('');
  }
  return `/**
 * NgayTot — thời điểm 24 tiết khí đã tính trước (tầng A, từ data/astro_events.json).
 * TỆP SINH TỰ ĐỘNG bởi tools/astro/build_solar_terms.mjs. Không sửa tay.
 * codes: mỗi tiết khí 5 ký tự cơ số 36 = số giây UT1 từ 00:00:00 ngày 1/1 của năm; mỗi năm 24 tiết khí,
 * chỉ số 0 = Xuân phân, mỗi bước 15° kinh độ Mặt Trời; các năm từ yearFrom nối liền nhau.
 */
(function (NT) {
  'use strict';
  NT.solarTerms = Object.freeze({
    source: 'astro_events ${hash}',
    yearFrom: ${YEAR_FROM},
    yearTo: ${YEAR_TO},
    codes: '${codes}',
  });
})(globalThis.NT ??= {});
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = generate();
  if (process.argv.includes('--check')) {
    // Bỏ qua kiểu xuống dòng: git trên Windows có thể đổi LF thành CRLF khi lấy tệp về
    const same = readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') === text;
    console.log(same ? 'js/core/solar-terms.js khớp kết quả sinh lại' : 'js/core/solar-terms.js KHÁC kết quả sinh lại');
    process.exit(same ? 0 : 1);
  }
  writeFileSync(OUT, text, 'utf8');
  console.log(`Đã ghi js/core/solar-terms.js (${text.length} ký tự)`);
}
