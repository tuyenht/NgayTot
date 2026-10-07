/**
 * Sinh js/core/lunar-months.js: bảng tháng âm lịch dựng từ data/astro_events.json (đã đóng băng ở G1),
 * cho ba múi giờ dựng lịch của PRD 6.3. Phần lõi tra bảng này thay cho công thức xấp xỉ.
 *
 *     node tools/astro/build_lunar_months.mjs          ghi tệp
 *     node tools/astro/build_lunar_months.mjs --check  chỉ so tệp hiện có với kết quả sinh lại
 *
 * Mỗi tháng mã hóa thành một ký tự: (số tháng − 1) × 4 + (nhuận ? 2 : 0) + (số ngày − 29).
 * Tháng có điểm sóc cách nửa đêm dưới 10 phút được ghi riêng ở `risk` (PRD 5.3, cờ BOUNDARY_RISK).
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadAstroEvents, buildLunarMonths } from './lunar-from-astro.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(ROOT, 'js', 'core', 'lunar-months.js');
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
export const RISK_SECONDS = 600;
// Năm âm lịch được đưa vào bảng: rộng hơn khoảng 1912–2100 mà phần lõi hỗ trợ một năm mỗi đầu
export const YEAR_FROM = 1910, YEAR_TO = 2101;
// Khóa múi giờ: 'bj' = kinh tuyến Bắc Kinh (lịch Trung Quốc 1912–1928), '8' = UTC+8, '7' = UTC+7
export const ZONES = { bj: 7 + 45 / 60 + 40 / 3600, 8: 8, 7: 7 };

export function generate() {
  const astro = loadAstroEvents();
  const hash = createHash('sha256').update(readFileSync(path.join(ROOT, 'data', 'astro_events.json'))).digest('hex');
  const tables = {};
  for (const [key, tz] of Object.entries(ZONES)) {
    const months = buildLunarMonths(astro, tz).filter((m) => m.year >= YEAR_FROM && m.year <= YEAR_TO);
    const first = months[0];
    if (first.month !== 1 || first.leap) throw new Error(`Bảng ${key} không mở đầu bằng tháng Giêng`);
    for (let i = 1; i < months.length; i++) {
      if (months[i].start !== months[i - 1].start + months[i - 1].length) throw new Error(`Bảng ${key} hở ở tháng thứ ${i}`);
    }
    if (months.some((m) => m.length !== 29 && m.length !== 30)) throw new Error(`Bảng ${key} có tháng không phải 29 hoặc 30 ngày`);
    tables[key] = {
      start: first.start,
      year: first.year,
      codes: months.map((m) => ALPHABET[(m.month - 1) * 4 + (m.leap ? 2 : 0) + (m.length - 29)]).join(''),
      risk: months.map((m, i) => [i, Math.round(m.socMargin)]).filter(([, s]) => Math.abs(s) < RISK_SECONDS),
    };
  }
  const body = JSON.stringify({ source: `astro_events ${hash}`, riskSeconds: RISK_SECONDS, tables }, null, 1);
  return `/**
 * NgayTot — bảng tháng âm lịch đã tính trước (tầng B, PRD 4.4 lunar_months).
 * TỆP SINH TỰ ĐỘNG bởi tools/astro/build_lunar_months.mjs từ data/astro_events.json. Không sửa tay.
 * start: số ngày Julius của mùng Một tháng Giêng năm \`year\`; codes: mỗi ký tự một tháng liên tiếp,
 * giá trị = (số tháng − 1) × 4 + (nhuận ? 2 : 0) + (số ngày − 29); risk: [chỉ số tháng, giây có dấu từ điểm sóc tới nửa đêm].
 */
(function (NT) {
  'use strict';
  NT.lunarMonths = Object.freeze(${body.replace(/\n/g, '\n  ')});
})(globalThis.NT ??= {});
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = generate();
  if (process.argv.includes('--check')) {
    // Bỏ qua kiểu xuống dòng: git trên Windows có thể đổi LF thành CRLF khi lấy tệp về
    const same = readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') === text;
    console.log(same ? 'js/core/lunar-months.js khớp kết quả sinh lại' : 'js/core/lunar-months.js KHÁC kết quả sinh lại');
    process.exit(same ? 0 : 1);
  }
  writeFileSync(OUT, text, 'utf8');
  const sizes = text.length;
  console.log(`Đã ghi js/core/lunar-months.js (${sizes} ký tự)`);
}
