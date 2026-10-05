/**
 * NgayTot — Kiểm thử engine (chạy: node tests/run-tests.mjs)
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
Object.assign(globalThis, require(path.join(root, 'vendor/lunar.js')));
for (const f of ['data', 'i18n-vi', 'calendar-vn', 'bazi', 'name-element', 'activities', 'scoring']) {
  vm.runInThisContext(readFileSync(path.join(root, `js/core/${f}.js`), 'utf8'), { filename: `${f}.js` });
}
const { NT } = globalThis;

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? '✅' : '❌'} ${name}${ok ? '' : `\n     got:  ${JSON.stringify(got)}\n     want: ${JSON.stringify(want)}`}`);
};
const gz = (p) => p ? NT.data.ganZhiHan(p.g, p.z) : null;

// ---------- 1. Âm lịch VN ----------
const L = (d, m, y) => { const r = NT.calendar.solarToLunar(d, m, y); return [r.day, r.month, r.year, r.leap]; };
eq('Tết Bính Ngọ 2026 = 17/02/2026', L(17, 2, 2026), [1, 1, 2026, false]);
eq('Tết Ất Sửu 1985 VN = 21/01/1985 (TQ: 20/02)', L(21, 1, 1985), [1, 1, 1985, false]);
eq('Tết Đinh Hợi 2007 VN = 17/02/2007 (TQ: 18/02)', L(17, 2, 2007), [1, 1, 2007, false]);
eq('Tết Canh Tý 2020 = 25/01/2020', L(25, 1, 2020), [1, 1, 2020, false]);
eq('Nhuận tháng 4 năm 2020: 23/05/2020 = 1/4 nhuận', L(23, 5, 2020), [1, 4, 2020, true]);

let diff = 0, total = 0;
for (let t = Date.UTC(2000, 0, 1); t <= Date.UTC(2035, 11, 31); t += 864e5) {
  const d = new Date(t);
  const vn = NT.calendar.solarToLunar(d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCFullYear());
  const cn = Solar.fromYmd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()).getLunar();
  total++;
  if (vn.day !== cn.getDay() || vn.month !== Math.abs(cn.getMonth())) diff++;
}
console.log(`ℹ️  2000–2035: âm lịch VN khác TQ ${diff}/${total} ngày (${(diff / total * 100).toFixed(2)}%) — kỳ vọng nhỏ, khác 0`);

// ---------- 2. Bát tự ----------
const base = { gender: 'male', tz: 7, lon: 105.85, useTrueSolar: false, ziSect: 1 };
let c = NT.bazi.buildChart({ ...base, birthDate: '1990-05-15', birthTime: '14:30' });
eq('Tứ trụ 15/05/1990 14:30', [gz(c.pillars.year), gz(c.pillars.month), gz(c.pillars.day), gz(c.pillars.hour)], ['庚午', '辛巳', '庚辰', '癸未']);

// Lập Xuân 2024: 04/02/2024 16:27 giờ Bắc Kinh = 15:27 giờ VN
c = NT.bazi.buildChart({ ...base, birthDate: '2024-02-04', birthTime: '15:10' });
eq('Lập Xuân 2024 — 15:10 VN (trước 15:27) vẫn năm Quý Mão', gz(c.pillars.year), '癸卯');
c = NT.bazi.buildChart({ ...base, birthDate: '2024-02-04', birthTime: '16:10' });
eq('Lập Xuân 2024 — 16:10 VN (sau 15:27) sang năm Giáp Thìn, tháng Bính Dần', [gz(c.pillars.year), gz(c.pillars.month)], ['甲辰', '丙寅']);
c = NT.bazi.buildChart({ ...base, birthDate: '2024-02-04', birthTime: '15:10', tz: 8 });
eq('Cùng giờ 15:10 nhưng múi UTC+8 (trước 16:27 BK) vẫn Quý Mão', gz(c.pillars.year), '癸卯');

c = NT.bazi.buildChart({ ...base, birthDate: '1990-05-15', birthTime: '23:30', ziSect: 1 });
const c2 = NT.bazi.buildChart({ ...base, birthDate: '1990-05-15', birthTime: '23:30', ziSect: 2 });
eq('Giờ Tý muộn: sect 1 đổi ngày (Tân Tỵ), sect 2 giữ ngày (Canh Thìn)', [gz(c.pillars.day), gz(c2.pillars.day)], ['辛巳', '庚辰']);

c = NT.bazi.buildChart({ ...base, birthDate: '1990-05-15', birthTime: '13:02', useTrueSolar: true, lon: 103.0 });
eq('Giờ Mặt Trời thực: 13:02 tại kinh độ 103° → lùi ~8 phút → giờ Ngọ', NT.data.ZHI_VI[c.pillars.hour.z], 'Ngọ');

c = NT.bazi.buildChart({ ...base, birthDate: '1990-05-15', birthTime: null });
eq('Không rõ giờ → không có trụ giờ', c.pillars.hour, null);

// ---------- 3. Ngũ hành tên ----------
const n = NT.nameElement.analyzeName('Nguyễn Văn Minh');
eq('Tên "Nguyễn Văn Minh" → Ngũ âm: Mộc/Thủy/Thủy → Thủy', [n.words.map((w) => w.el), n.element], [[0, 4, 4], 4]);

// ---------- 4. Tìm ngày ----------
const profile = { ...base, name: 'Nguyễn Văn Minh', birthDate: '1990-05-15', birthTime: '14:30', useTrueSolar: true };
const chart = NT.bazi.buildChart(profile);
console.log('\nℹ️  Lá số mẫu:', ['year', 'month', 'day', 'hour'].map((k) => gz(chart.pillars[k])).join(' '),
  `| ${chart.levelLabel} (${(chart.ratio * 100).toFixed(0)}%) | pattern=${chart.pattern}`);
chart.reasons.forEach((r) => console.log('   -', r));
console.log('   % ngũ hành:', chart.pct.map((v, i) => `${NT.data.ELEMENTS[i].vi} ${v.toFixed(0)}%`).join(', '));

for (const actId of ['biz_open', 'wed_main', 'build_earth']) {
  const act = NT.activities.byId(actId);
  const res = NT.scoring.findDays({ chart, act, nameInfo: n, from: '2026-10-05', to: '2027-10-04', mode: 'best' });
  const hist = {};
  res.days.forEach((x) => { hist[x.grade.label] = (hist[x.grade.label] ?? 0) + 1; });
  const scores = res.days.map((x) => x.day.score);
  console.log(`\n▶ ${act.label}: ${res.days.length} ngày trong ${res.ms}ms | điểm ngày min ${Math.min(...scores)} max ${Math.max(...scores)} | phân bố`, hist);
  res.ranked.slice(0, 3).forEach((x) => {
    const dsc = NT.scoring.describeDay(x.ctx);
    console.log(`   ${x.key} ${dsc.weekday} ${dsc.ganZhi} (ÂL ${dsc.lunarText}) → ${x.score} ${x.grade.label} | giờ ${x.chosen.label} ${x.chosen.ganZhi}`);
    x.day.items.forEach((it) => console.log(`       ${it.pts > 0 ? '+' : ''}${it.pts}  ${it.text}`));
  });
  if (actId === 'biz_open') eq('Có ít nhất 10 ngày đạt chuẩn trong 1 năm', res.ranked.length >= 10, true);
}

const fixed = NT.scoring.findDays({ chart, act: NT.activities.byId('biz_sign'), nameInfo: null, from: '2026-10-05', to: '2026-12-31', mode: 'fixed', fixedTime: '09:00' });
eq('Chế độ giờ cố định 09:00 → giờ Tỵ', NT.data.ZHI_VI[fixed.days[0].chosen.z], 'Tỵ');

const custom = NT.activities.makeCustom({ name: 'Ra mắt sách', element: 1, baseId: 'biz_open' });
const cr = NT.scoring.findDays({ chart, act: custom, nameInfo: n, from: '2026-10-05', to: '2026-11-05', mode: 'best' });
eq('Việc tùy chỉnh chạy được', cr.days.length, 32);

// ---------- 5. Hard gate, hạn năm, việc đã ấn định ----------
const yw = NT.scoring.yearWarnings(chart, 2026);
eq('Tuổi Canh Ngọ, năm 2026: tuổi mụ 37 phạm Kim Lâu Thân, không Tam tai', [yw.age, !!yw.kimLau, yw.tamTai], [37, true, null]);
eq('Tuổi Ngọ gặp năm Thân (2028) là Tam tai', !!NT.scoring.yearWarnings(chart, 2028).tamTai, true);
const earth = NT.activities.byId('build_earth');
const gated = NT.scoring.findDays({ chart, act: earth, nameInfo: null, from: '2026-10-05', to: '2026-12-31', mode: 'best' });
eq('Động thổ năm phạm Kim lâu → không đề xuất ngày nào', gated.ranked.length, 0);
const borrowed = NT.scoring.findDays({ chart, act: earth, nameInfo: null, from: '2026-10-05', to: '2026-12-31', mode: 'best', options: { ignoreYearlyBad: true } });
eq('Bỏ qua hạn năm (mượn tuổi) → có ngày đề xuất', borrowed.ranked.length > 0, true);
const surgery = NT.activities.byId('med_surgery');
let blocked = false;
try { NT.scoring.findDays({ chart, act: surgery, nameInfo: null, from: '2026-10-05', to: '2026-10-31', mode: 'best' }); } catch { blocked = true; }
eq('Phẫu thuật: không cho quét khoảng ngày để chọn ngày', blocked, true);
const one = NT.scoring.findDays({ chart, act: surgery, nameInfo: null, from: '2026-10-12', to: '2026-10-12', mode: 'fixed', fixedTime: '08:30' });
// Kỳ vọng cũ "có hướng Hỷ thần/Tài thần" trái PRD §8.6 (chưa qua kiểm nguồn) → thay theo đặc tả.
eq('Phẫu thuật: xem được đúng ngày giờ đã ấn định, không trả hướng Hỷ thần/Tài thần', [one.days.length, 'posXi' in one.days[0].chosen, 'posCai' in one.days[0].chosen], [1, false, false]);
let funeralBlocked = false;
try { NT.scoring.findDays({ chart, act: NT.activities.byId('funeral_main'), nameInfo: null, from: '2026-10-05', to: '2026-10-10', mode: 'best' }); } catch { funeralBlocked = true; }
eq('Khâm liệm/di quan: không quét khoảng ngày (QĐ-04)', funeralBlocked, true);
eq('Không còn nhãn xếp loại gây sợ', [NT.scoring.gradeOf(10, false).label, NT.scoring.gradeOf(90, true).label], ['Nên cân nhắc', 'Có điều kỵ nặng']);

// ---------- 8. An toàn & riêng tư (PRD §3.3, §13 lớp 8) ----------
{
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  const csp = /Content-Security-Policy" content="([^"]+)"/.exec(html)?.[1] ?? '';
  const extTags = [...html.matchAll(/<(?:link|script)[^>]+(?:href|src)="(https?:[^"]+)"/g)].map((m) => m[1]);
  eq('index.html không tải tài nguyên bên thứ ba; CSP không cho host ngoài', [extTags, /https?:/.test(csp), /script-src 'self'/.test(csp)], [[], false, true]);
  const css = ['fonts.css', 'styles.css'].map((f) => readFileSync(path.join(root, 'css', f), 'utf8')).join('\n');
  eq('CSS không gọi URL ngoài', /url\(\s*['"]?https?:/.test(css) || /@import/.test(css), false);
  const appCode = ['data', 'i18n-vi', 'calendar-vn', 'bazi', 'name-element', 'activities', 'scoring'].map((f) => readFileSync(path.join(root, `js/core/${f}.js`), 'utf8'))
    .concat(readFileSync(path.join(root, 'js/ui/app.js'), 'utf8')).join('\n');
  eq('Mã ứng dụng không có API gửi dữ liệu ra mạng', /\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource)\s*\(/.test(appCode), false);
}

console.log(`\n${fail ? '❌' : '✅'} ${pass}/${pass + fail} kiểm thử đạt`);
process.exit(fail ? 1 : 0);
