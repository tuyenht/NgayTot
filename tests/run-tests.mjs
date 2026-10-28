/**
 * NgayTot — Kiểm thử engine (chạy: node tests/run-tests.mjs)
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
Object.assign(globalThis, require(path.join(root, 'vendor/lunar.js')));
for (const f of ['data', 'i18n-vi', 'lunar-months', 'solar-terms', 'calendar-vn', 'date-convert', 'bazi', 'name-element', 'activities', 'legal', 'scoring', 'wedding-plan']) {
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
eq('Việc tùy chỉnh: chạy được, can ngày so với hành của việc có pts = 0 (Bảng 8.3 USER_DEFINED)', [cr.days.length, cr.days[0].day.items.find((i) => i.text.includes('việc tùy chỉnh'))?.pts], [32, 0]);

// ---------- 5. Hạn năm, việc đã ấn định, Bảng 8.3 ----------
const yw = NT.scoring.yearWarnings(chart, 2026);
eq('Tuổi Canh Ngọ, năm 2026: tuổi mụ 37 phạm Kim Lâu Thân, không Tam tai', [yw.age, !!yw.kimLau, yw.tamTai], [37, true, null]);
eq('Tuổi Ngọ gặp năm Thân (2028) là Tam tai', !!NT.scoring.yearWarnings(chart, 2028).tamTai, true);

// Bảng 8.3: Kim lâu không triệt tiêu cả năm; chỉ Kỵ nặng khi người dùng chủ động chọn kiêng (yearlyAsSevere)
const earth = NT.activities.byId('build_earth');
const defaultEarth = NT.scoring.findDays({ chart, act: earth, nameInfo: null, from: '2026-10-05', to: '2026-12-31', mode: 'best' });
eq('Mặc định: Kim lâu là thông tin, không triệt tiêu cả năm (Bảng 8.3)', defaultEarth.ranked.length > 0, true);
const severeEarth = NT.scoring.findDays({ chart, act: earth, nameInfo: null, from: '2026-10-05', to: '2026-12-31', mode: 'best', options: { yearlyAsSevere: true } });
eq('Bật kiêng hạn năm (yearlyAsSevere) → ngày phạm Kim lâu bị ẩn khỏi đề xuất', severeEarth.ranked.length, 0);

// Cưới hỏi: Nam xem cưới hỏi không bị phạt Kim lâu
const wedAct = NT.activities.byId('wed_main');
const wedDay = NT.scoring.scoreDay(NT.scoring.dayContext(2026, 10, 10), chart, wedAct, null);
eq('Nam xem cưới hỏi: Kim lâu ghi chú chỉ xét tuổi cô dâu, không phạt nam', wedDay.items.some((i) => i.text.includes('chỉ xét tuổi cô dâu')), true);

// Ngũ hành tên: mặc định không cộng/trừ điểm (HEURISTIC)
const dayNoName = NT.scoring.scoreDay(NT.scoring.dayContext(2026, 10, 10), chart, NT.activities.byId('biz_open'), n, { useNameElement: false });
const dayWithName = NT.scoring.scoreDay(NT.scoring.dayContext(2026, 10, 10), chart, NT.activities.byId('biz_open'), n, { useNameElement: true });
eq('Ngũ hành tên: mặc định không góp điểm (pts = 0), bật thì có điểm', [dayNoName.items.find((i) => i.cat === 'name')?.pts, Math.abs(dayWithName.items.find((i) => i.cat === 'name')?.pts) > 0], [0, true]);

// Việc y tế và ngày ấn định
const surgery = NT.activities.byId('med_surgery');
let blocked = false;
try { NT.scoring.findDays({ chart, act: surgery, nameInfo: null, from: '2026-10-05', to: '2026-10-31', mode: 'best' }); } catch { blocked = true; }
eq('Phẫu thuật: không cho quét khoảng ngày để chọn ngày', blocked, true);
const one = NT.scoring.findDays({ chart, act: surgery, nameInfo: null, from: '2026-10-12', to: '2026-10-12', mode: 'fixed', fixedTime: '08:30' });
eq('Phẫu thuật: xem được đúng ngày giờ đã ấn định, không trả hướng Hỷ thần/Tài thần', [one.days.length, 'posXi' in one.days[0].chosen, 'posCai' in one.days[0].chosen], [1, false, false]);
let funeralBlocked = false;
try { NT.scoring.findDays({ chart, act: NT.activities.byId('funeral_main'), nameInfo: null, from: '2026-10-05', to: '2026-10-10', mode: 'best' }); } catch { funeralBlocked = true; }
eq('Khâm liệm/di quan: không quét khoảng ngày (QĐ-04)', funeralBlocked, true);
eq('Không còn nhãn xếp loại gây sợ', [NT.scoring.gradeOf(10, false).label, NT.scoring.gradeOf(90, true).label], ['Nên cân nhắc', 'Có điều kỵ nặng']);
eq('Hoạt động mới career_fixed và med_checkup tồn tại', [!!NT.activities.byId('career_fixed'), !!NT.activities.byId('med_checkup')], [true, true]);

// ---------- 5b. Giới hạn pháp luật (PRD §3.2, §8.3) & Từ vựng 6tail ----------
{
  const L = NT.legal;
  eq('Mọi luật trong LEGAL_LIMITS đều mang cờ verified: false', Object.values(L.LEGAL_LIMITS).every((x) => x.verified === false), true);
  const youngMan = NT.bazi.buildChart({ ...base, birthDate: '2008-01-01', gender: 'male' }); // < 20 tuổi vào 2026
  const flags = L.checkLegal(wedAct, youngMan, '2026-10-05', '09:00');
  eq('Nam chưa đủ 20 tuổi xem cưới hỏi → có cảnh báo LEGAL_UNDERAGE_MARRIAGE', flags.some((f) => f.rule.id === 'LEGAL_UNDERAGE_MARRIAGE'), true);

  const noiseFlags = L.checkLegal(wedAct, youngMan, '2026-10-05', '23:00');
  eq('Tổ chức lúc 23:00 → có cảnh báo LEGAL_NOISE_WINDOW', noiseFlags.some((f) => f.rule.id === 'LEGAL_NOISE_WINDOW'), true);

  const funeral = NT.activities.byId('funeral_main');
  const burialFlags = L.checkLegal(funeral, chart, '2026-10-08', '09:00', { deathTime: '2026-10-05T08:00:00+07:00' });
  eq('Khâm liệm cách lúc mất > 48h (bình thường) → cảnh báo LEGAL_BURIAL_TIME_EXCEEDED', burialFlags.some((f) => f.rule.id === 'LEGAL_BURIAL_TIME_EXCEEDED'), true);

  // Kiểm tra không có từ khóa chết trong activities
  const vocab6tail = new Set();
  for (let m = 1; m <= 12; m++) {
    for (let d = 1; d <= 28; d++) {
      const l = Solar.fromYmd(2025, m, d).getLunar();
      l.getDayYi().forEach((k) => vocab6tail.add(k));
      l.getDayJi().forEach((k) => vocab6tail.add(k));
    }
  }
  const dead = [];
  for (const act of NT.activities.ACTIVITIES) {
    for (const k of [...act.yiPrimary, ...act.yi]) {
      if (!vocab6tail.has(k)) dead.push(`${act.id}:${k}`);
    }
  }
  eq('Mọi từ khóa việc (yiPrimary, yi) đều có trong từ điển 6tail', dead, []);
}

// ---------- 6. Lịch VN theo thời kỳ (PRD §6.3, §1.4) ----------
{
  const C = NT.calendar;
  const iso = (d, m, y) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const LV = (d, m, y, region) => { const r = C.solarToLunarVN(d, m, y, region); return [r.day, r.month, r.year, r.leap]; };

  // 6a. Bất biến: ngày 1–30, tăng liên tục, tháng dài 29/30, thứ tự tháng, đổi xuôi–ngược khớp
  const invariants = (from, to, region) => {
    const bad = []; let prev = null, run = 0, start = null;
    for (let t = Date.UTC(from, 0, 1); t <= Date.UTC(to, 11, 31); t += 864e5) {
      const dt = new Date(t); const [d, m, y] = [dt.getUTCDate(), dt.getUTCMonth() + 1, dt.getUTCFullYear()];
      const tz = C.calendarTz(y, m, d, region);
      const l = C.solarToLunar(d, m, y, tz);
      if (l.day < 1 || l.day > 30) bad.push(`day ${iso(d, m, y)}`);
      if (prev && !(l.day === prev.day + 1 || l.day === 1)) bad.push(`step ${iso(d, m, y)}`);
      if (l.day === 1) { if (start && (run < 29 || run > 30)) bad.push(`len ${start}`); run = 0; start = iso(d, m, y); }
      if (prev && l.day === 1 && !(l.month === prev.month || l.leap || l.month === (prev.month % 12) + 1)) bad.push(`month ${iso(d, m, y)}`);
      run++;
      const back = C.lunarToSolar(l.day, l.month, l.year, l.leap, tz);
      if (!back || back[0] !== d || back[1] !== m || back[2] !== y) bad.push(`rt ${iso(d, m, y)}`);
      prev = l;
    }
    return bad.slice(0, 5);
  };
  eq('Bất biến âm lịch + đổi ngược 1912–2100 (Bắc)', invariants(1912, 2100, 'bac'), []);
  eq('Bất biến âm lịch + đổi ngược 1960–1980 (Nam)', invariants(1960, 1980, 'nam'), []);

  // 6b. Đông chí thuộc tháng 11, tháng nhuận không chứa trung khí (bỏ qua mốc cách nửa đêm < 10 phút ngoài vùng kiểm chứng)
  const ZHONG = ['冬至', '大寒', '雨水', '春分', '谷雨', '小满', '夏至', '大暑', '处暑', '秋分', '霜降', '小雪'];
  const NAME = { DONG_ZHI: '冬至', DA_HAN: '大寒', YU_SHUI: '雨水' };
  const seen = new Set(), fails = [], edge = [];
  for (let yy = 1911; yy <= 2101; yy++) {
    for (const [k, s] of Object.entries(Lunar.fromYmd(yy, 6, 1).getJieQiTable())) {
      const name = NAME[k] ?? k;
      if (!ZHONG.includes(name)) continue;
      const ms = Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond()) - 8 * 3600e3;
      if (seen.has(ms)) continue; seen.add(ms);
      const u = new Date(ms), y = u.getUTCFullYear();
      if (y < 1912 || y > 2100) continue;
      const tz = C.calendarTz(y, u.getUTCMonth() + 1, u.getUTCDate(), 'bac');
      const loc = new Date(ms + tz * 3600e3);
      const l = C.solarToLunar(loc.getUTCDate(), loc.getUTCMonth() + 1, loc.getUTCFullYear(), tz);
      if ((name === '冬至' && (l.month !== 11 || l.leap)) || l.leap) {
        const mod = loc.getUTCHours() * 60 + loc.getUTCMinutes();
        ((mod < 10 || mod > 1430) && !C.inVerifiedRange(y) ? edge : fails).push(`${name} ${loc.toISOString().slice(0, 16)}`);
      }
    }
  }
  eq('Đông chí ở tháng 11, tháng nhuận không có trung khí (1912–2100)', fails, []);
  console.log(`ℹ️  Ca biên ngoài vùng kiểm chứng (< 10 phút từ nửa đêm): ${edge.length} ${JSON.stringify(edge)}`);

  // 6c. Golden: thuật toán ở UTC+8 phải trùng 6tail (lịch TQ) 1929–2100 — cổng 0 ngày lệch
  let mism = 0, firstMism = null;
  for (let t = Date.UTC(1929, 0, 1); t <= Date.UTC(2100, 11, 31); t += 864e5) {
    const dt = new Date(t); const [d, m, y] = [dt.getUTCDate(), dt.getUTCMonth() + 1, dt.getUTCFullYear()];
    const l = C.solarToLunar(d, m, y, 8);
    const cn = Solar.fromYmd(y, m, d).getLunar();
    if (l.day !== cn.getDay() || l.month !== Math.abs(cn.getMonth()) || l.leap !== cn.getMonth() < 0) { mism++; firstMism ??= iso(d, m, y); }
  }
  // Kỳ vọng đổi có chủ ý ngày 2026-10-07 (QĐ-34, ngoại lệ thứ ba ở PRD 13.4): từ khi lõi tra bảng tháng dựng từ bảng thiên văn đóng băng,
  // UTC+8 lệch 6tail đúng một tháng — tháng 7 âm năm 2097, điểm sóc rơi 84 giây sau nửa đêm UTC+8 và hai bên ngoại suy ΔT
  // lệch nhau khoảng 90 giây. Tháng đó mang cờ ranh giới trong bảng. Âm lịch Việt Nam không dùng UTC+8 sau 1975.
  const risk8 = NT.lunarMonths.tables['8'].risk.map(([, s]) => s);
  eq('Golden UTC+8 so với 6tail 1929–2100: chỉ lệch một tháng mang cờ ranh giới (30 ngày từ 07/08/2097, sóc cách nửa đêm 84 giây)',
    [mism, firstMism, risk8.includes(84)], [30, '2097-08-07', true]);
  let mism75 = 0;
  for (let t = Date.UTC(1929, 0, 1); t <= Date.UTC(1975, 11, 31); t += 864e5) {
    const dt = new Date(t); const [d, m, y] = [dt.getUTCDate(), dt.getUTCMonth() + 1, dt.getUTCFullYear()];
    const l = C.solarToLunar(d, m, y, 8); const cn = Solar.fromYmd(y, m, d).getLunar();
    if (l.day !== cn.getDay() || l.month !== Math.abs(cn.getMonth()) || l.leap !== cn.getMonth() < 0) mism75++;
  }
  eq('UTC+8 so với 6tail trong khoảng âm lịch Việt Nam thực dùng múi này (1929–1975): 0 ngày lệch', mism75, 0);

  // 6d. Tết bắt buộc & ca "mùng 0"
  eq('Tết Ất Hợi 1935 = 04/02', LV(4, 2, 1935, 'bac'), [1, 1, 1935, false]);
  eq('Tết Ất Tỵ 1965 = 02/02', LV(2, 2, 1965, 'bac'), [1, 1, 1965, false]);
  eq('Tết Mậu Thân 1968: Bắc 29/01, Nam 30/01', [LV(29, 1, 1968, 'bac'), LV(30, 1, 1968, 'nam'), LV(29, 1, 1968, 'nam')[0]], [[1, 1, 1968, false], [1, 1, 1968, false], 30]);
  eq('Tết Kỷ Dậu 1969: Nam 17/02', [LV(17, 2, 1969, 'nam'), LV(16, 2, 1969, 'nam')[0]], [[1, 1, 1969, false], 30]);
  eq('Không còn "mùng 0": 07/05/2054 = 30/3, 09/04/2062 = 30/2', [LV(7, 5, 2054, 'bac').slice(0, 2), LV(9, 4, 2062, 'bac').slice(0, 2)], [[30, 3], [30, 2]]);

  // 6e. Tháng nhuận
  const leapOf = (Y, tz) => {
    const found = new Set();
    for (let t = Date.UTC(Y, 0, 1); t <= Date.UTC(Y + 1, 2, 1); t += 864e5) {
      const dt = new Date(t);
      const l = C.solarToLunar(dt.getUTCDate(), dt.getUTCMonth() + 1, dt.getUTCFullYear(), tz ?? C.calendarTz(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate()));
      if (l.leap && l.year === Y) found.add(l.month);
    }
    return [...found];
  };
  eq('Nhuận: 1984 VN không nhuận, 1985 VN nhuận tháng 2', [leapOf(1984), leapOf(1985)], [[], [2]]);
  eq('Nhuận 2033 = tháng 11 ở cả UTC+7 và UTC+8', [leapOf(2033, 7), leapOf(2033, 8)], [[11], [11]]);

  // 6f. Giờ đồng hồ theo thời kỳ (civil_tz)
  eq('civil_tz: SG 1950=8, SG 1970=8, HN 1970=7, 1935=7, 1943=8, 04/1945=9, SG 20/05/1975=8, SG 13/06/1975=7', [
    C.civilTz(1950, 6, 1, 'nam'), C.civilTz(1970, 6, 1, 'nam'), C.civilTz(1970, 6, 1, 'bac'), C.civilTz(1935, 6, 1, 'bac'),
    C.civilTz(1943, 6, 1, 'bac'), C.civilTz(1945, 4, 15, 'bac'), C.civilTz(1975, 5, 20, 'nam'), C.civilTz(1975, 6, 13, 'nam'),
  ], [8, 8, 7, 7, 8, 9, 8, 7]);
  const auto = { gender: 'male', tz: null, lon: 106.7, useTrueSolar: false, ziSect: 1, birthTime: '10:00' };
  const tzOf = (date, region) => { const ch = NT.bazi.buildChart({ ...auto, birthDate: date, region }); return [ch.tz, ch.tzAuto]; };
  eq('Lá số tự động múi giờ: SG 1950 → 8, SG 1970 → 8, HN 1970 → 7', [tzOf('1950-06-01', 'nam'), tzOf('1970-06-01', 'nam'), tzOf('1970-06-01', 'bac')], [[8, true], [8, true], [7, true]]);

  // 6g. Không rõ vùng: lá số/ngày âm khác nhau giữa hai phương án → trả cả hai
  const unk = NT.bazi.buildChart({ ...auto, birthDate: '1969-02-16', birthTime: '13:30', region: 'unknown' });
  eq('Không rõ vùng 16/02/1969: hiện phương án miền Nam (30 tháng Chạp)', [unk.lunarVN.day, unk.alternative?.region, unk.alternative?.lunarVN.day], [1, 'nam', 30]);
  const same = NT.bazi.buildChart({ ...auto, birthDate: '1990-05-15', region: 'unknown' });
  eq('Không rõ vùng 1990: hai phương án trùng → không có alternative', same.alternative, null);

  // 6h. Phạm vi năm
  eq('Sinh 1920 → cờ OUT_OF_VERIFIED_RANGE; 1990 → không cờ', [NT.bazi.buildChart({ ...auto, birthDate: '1920-06-01' }).flags, NT.bazi.buildChart({ ...auto, birthDate: '1990-06-01' }).flags], [['OUT_OF_VERIFIED_RANGE'], []]);
  let outRange = false;
  try { NT.scoring.findDays({ chart, act: NT.activities.byId('biz_open'), nameInfo: null, from: '1911-12-25', to: '1912-01-05', mode: 'best' }); } catch { outRange = true; }
  const old = NT.scoring.findDays({ chart, act: NT.activities.byId('biz_open'), nameInfo: null, from: '1920-03-01', to: '1920-03-01', mode: 'best' });
  eq('Tìm ngày: chặn trước 1912; ngày 1920 gắn cờ ngoài vùng kiểm chứng', [outRange, old.days[0].flags], [true, ['OUT_OF_VERIFIED_RANGE']]);
}

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

// ---------- Đóng G0: PRD §14.2 dòng 6, 23, 24, 26, 28 ----------
{
  const S = NT.scoring, L = NT.legal, C = NT.calendar;
  // Dòng 6 — việc y tế chỉ có thông tin lịch (PRD §3.1)
  for (const id of ['med_surgery', 'med_birth']) {
    const d = S.findDays({ chart, act: NT.activities.byId(id), nameInfo: n, from: '2026-10-12', to: '2026-10-12', mode: 'fixed', fixedTime: '08:30' }).days[0];
    eq(`${id}: không điểm, không xếp loại, không dòng luật, không hoàng đạo/hắc đạo`,
      [d.score, d.grade, d.day.score, d.day.items.length, d.chosen.items.length, d.severe, 'huangDao' in d.chosen, 'tianShen' in d.chosen, d.chosen.ganZhi],
      [null, null, null, 0, 0, false, false, false, 'Mậu Thìn']);
  }
  const checkup = S.findDays({ chart, act: NT.activities.byId('med_checkup'), nameInfo: null, from: '2026-10-12', to: '2026-10-20', mode: 'best' });
  eq('Khám định kỳ tự chọn ngày vẫn được đánh giá như việc thường', [checkup.days.length, checkup.days[0].day.items.length > 0], [9, true]);

  // Dòng 23 — dẫn đúng văn bản pháp luật (PRD §3.2)
  const legalSrc = readFileSync(path.join(root, 'js/core/legal.js'), 'utf8');
  eq('legal.js không còn dẫn Thông tư 02/2009 hay Nghị định 144/2021', [/02\/2009/.test(legalSrc), /144\/2021/.test(legalSrc)], [false, false]);
  const LL = L.LEGAL_LIMITS;
  eq('Quàn, cải táng dẫn Thông tư 21/2021; khung giờ nhạc dẫn Thông tư 04/2011',
    [/21\/2021\/TT-BYT, Điều 4/.test(LL.BURIAL_TIME_EXCEEDED.doc), /21\/2021\/TT-BYT, Điều 9/.test(LL.REBURIAL_TOO_EARLY.doc), /04\/2011\/TT-BVHTTDL/.test(LL.NOISE_WINDOW.doc)],
    [true, true, true]);
  const noiseMsg = L.checkLegal(NT.activities.byId('wed_main'), chart, '2026-11-01', '23:00').map((f) => f.message).join(' ');
  eq('Thông báo khung giờ nhạc không viết "cấm" và dẫn Thông tư 04/2011', [/cấm/i.test(noiseMsg), /04\/2011/.test(noiseMsg)], [false, true]);

  // Dòng 24 — giới hạn quàn là giới hạn chặt nhất
  eq('Giới hạn quàn: thường 48, lạnh 168, dịch bệnh 24, ≤ −10°C không giới hạn',
    [L.burialLimitHours({}), L.burialLimitHours({ storageType: 'cold' }), L.burialLimitHours({ isInfectious: true }), L.burialLimitHours({ storageType: 'cold', isInfectious: true }), L.burialLimitHours({ storageType: 'frozen', isInfectious: true })],
    [48, 168, 24, 24, Infinity]);
  eq('Huế 72 giờ không nới 48 giờ khi không bảo quản lạnh; có siết khi bảo quản lạnh',
    [L.burialLimitHours({ province: 'hue' }), L.burialLimitHours({ province: 'hue', storageType: 'cold' }), L.burialLimitHours({ province: 'hue', storageType: 'frozen' })],
    [48, 72, 72]);
  const fAct = NT.activities.byId('funeral_main');
  const at50h = L.checkLegal(fAct, chart, '2026-10-07', '10:00', { deathTime: '2026-10-05T08:00:00+07:00', province: 'hue' });
  eq('Huế, không bảo quản lạnh, 50 giờ sau khi mất → vẫn bị cảnh báo', at50h.some((f) => f.rule.id === 'LEGAL_BURIAL_TIME_EXCEEDED'), true);
  const at50hCold = L.checkLegal(fAct, chart, '2026-10-07', '10:00', { deathTime: '2026-10-05T08:00:00+07:00', province: 'hue', storageType: 'cold' });
  eq('Huế, bảo quản lạnh, 50 giờ → không cảnh báo', at50hCold.some((f) => f.rule.id === 'LEGAL_BURIAL_TIME_EXCEEDED'), false);

  // Dòng 26 — ngày âm không tồn tại
  eq('lunarToSolar: 30/2/2026 (tháng thiếu), ngày 0, ngày 31 → null',
    [C.lunarToSolar(30, 2, 2026, false), C.lunarToSolar(0, 1, 2026, false), C.lunarToSolar(31, 1, 2026, false)], [null, null, null]);
  eq('lunarToSolar: ngày hợp lệ vẫn đổi đúng (29/2/2026, 30/1/2026, 15/6 nhuận 2025)',
    [C.lunarToSolar(29, 2, 2026, false), C.lunarToSolar(30, 1, 2026, false), C.lunarToSolar(15, 6, 2025, true)], [[16, 4, 2026], [18, 3, 2026], [8, 8, 2025]]);

  // Dòng 28 — nơi sinh hai bên vĩ tuyến 17
  const reg = (id) => NT.data.PLACES.find((x) => x.id === id)?.region;
  eq('Quảng Bình thuộc vùng bắc, Quảng Trị thuộc vùng nam; mọi nơi sinh đều có vùng', [reg('qb'), reg('qt'), NT.data.PLACES.every((x) => ['bac', 'nam', 'unknown'].includes(x.region))], ['bac', 'nam', true]);

  // Nguồn dữ liệu theo Hiệp Kỷ Biện Phương Thư (người dùng yêu cầu không dẫn nguồn thư viện mã nguồn mở)
  const page = readFileSync(path.join(root, 'index.html'), 'utf8') + readFileSync(path.join(root, 'js/ui/app.js'), 'utf8');
  eq('Giao diện ghi nguồn Hiệp Kỷ Biện Phương Thư và không dẫn nguồn thư viện', [/Hiệp Kỷ Biện Phương Thư/.test(page), /lunar-javascript/.test(page)], [true, false]);
}

// ---------- Sau phản biện độc lập đợt đóng G0 ----------
{
  const S = NT.scoring, L = NT.legal, C = NT.calendar;
  // lunarToSolar không truyền tz: đổi ngược mọi ngày 1912–2100 (cả tháng 7 nhuận 1938 thuộc thời kỳ UTC+8)
  eq('lunarToSolar không truyền tz: 15/7 nhuận 1938 = 08/09/1938', C.lunarToSolar(15, 7, 1938, true), [8, 9, 1938]);
  for (const region of ['bac', 'nam']) {
    let bad = 0, n = 0;
    for (let t = Date.UTC(1912, 0, 1); t <= Date.UTC(2100, 11, 31); t += 864e5) {
      const d = new Date(t), dd = d.getUTCDate(), mm = d.getUTCMonth() + 1, yy = d.getUTCFullYear();
      const l = C.solarToLunar(dd, mm, yy, C.calendarTz(yy, mm, dd, region));
      const b = C.lunarToSolar(l.day, l.month, l.year, l.leap, undefined, region);
      n++;
      if (!b || b[0] !== dd || b[1] !== mm || b[2] !== yy) bad++;
    }
    eq(`Đổi âm → dương không truyền tz, vùng ${region}: 0 ngày sai trên 1912–2100`, [n, bad], [69032, 0]);
  }
  eq('lunarToSolar: tháng nhuận không có trong năm → null (nhuận 5/2025, nhuận 3/2026)', [C.lunarToSolar(15, 5, 2025, true), C.lunarToSolar(1, 3, 2026, true)], [null, null]);

  // Quy định tỉnh phải thực sự đổi kết quả: Huế, bảo quản lạnh, 98 giờ
  const fAct = NT.activities.byId('funeral_main');
  const death = '2026-10-05T08:00:00+07:00';
  const noProv = L.checkLegal(fAct, chart, '2026-10-09', '10:00', { deathTime: death, storageType: 'cold' });
  const hue = L.checkLegal(fAct, chart, '2026-10-09', '10:00', { deathTime: death, storageType: 'cold', province: 'hue' });
  eq('Bảo quản lạnh, 98 giờ: không có cờ nếu không có quy định tỉnh; ở Huế có cờ và ghi "địa phương"',
    [noProv.length, hue.length, /địa phương/.test(hue[0]?.message ?? ''), /72 giờ/.test(hue[0]?.message ?? '')], [0, 1, true, true]);
  // Thời điểm mất không ghi múi giờ = giờ Việt Nam, không phụ thuộc múi giờ của máy
  const withTz = L.checkLegal(fAct, chart, '2026-10-07', '09:00', { deathTime: '2026-10-05T08:30:00+07:00' }).length;
  const noTz = L.checkLegal(fAct, chart, '2026-10-07', '09:00', { deathTime: '2026-10-05T08:30:00' }).length;
  const within = L.checkLegal(fAct, chart, '2026-10-07', '08:00', { deathTime: '2026-10-05T08:30:00' }).length;
  eq('Thời điểm mất không ghi múi giờ hiểu là UTC+7: 48,5 giờ có cờ, 47,5 giờ không', [withTz, noTz, within], [1, 1, 0]);
  eq('burialLimitHours(null) không ném lỗi', L.burialLimitHours(null), 48);

  // Việc y tế cố định mang cờ MEDICAL_FIXED_ONLY (PRD §11)
  const med = S.findDays({ chart, act: NT.activities.byId('med_surgery'), nameInfo: null, from: '2026-10-12', to: '2026-10-12', mode: 'fixed', fixedTime: '08:30' }).days[0];
  eq('med_surgery mang cờ MEDICAL_FIXED_ONLY', med.flags.includes('MEDICAL_FIXED_ONLY'), true);

  // Không dẫn nguồn thư viện mã nguồn mở theo yêu cầu người dùng
  const idx = readFileSync(path.join(root, 'index.html'), 'utf8'), app = readFileSync(path.join(root, 'js/ui/app.js'), 'utf8');
  const validSource = (t) => !/lunar-javascript/.test(t) && /Hiệp Kỷ Biện Phương Thư/.test(t);
  eq('Không còn ghi nguồn thư viện lunar-javascript ở index.html và ở app.js', [validSource(idx), validSource(app)], [true, true]);
  // PRD §7.1, §7.7 (QĐ-05): không nêu tên thư viện nhưng phải nói rõ dữ liệu chưa đối chiếu với sách gốc
  eq('Trang chính và hộp chi tiết đều ghi "chưa đối chiếu với sách gốc"', [idx.includes('chưa đối chiếu với sách gốc'), app.includes('chưa đối chiếu với sách gốc')], [true, true]);
  // Giấy phép MIT của thư viện lịch vẫn phải đi kèm bản phân phối, dù giao diện không dẫn tên thư viện
  const lic = readFileSync(path.join(root, 'vendor/LICENSE-lunar-javascript.txt'), 'utf8');
  eq('Có tệp giấy phép MIT của lunar-javascript trong vendor/', [lic.includes('MIT License'), lic.includes('Copyright (c) 2018 6tail')], [true, true]);
  // Cảnh báo cứng pháp luật phải đi vào .ics và bản sao chép (PRD §3.2)
  eq('app.js đưa cảnh báo cứng vào biểu ngữ, .ics và bản sao chép', (app.match(/hardWarningTexts\(r\)/g) ?? []).length >= 2 && /legalBannerHTML\(res\.days\)/.test(app), true);
}

// ---------- G0b: chọn việc trước, chủ thể theo việc, không lưu hồ sơ (PRD §3.3, §9.5, §9.6) ----------
{
  const S = NT.scoring, A = NT.activities;
  const kinds = {}; for (const a of A.ACTIVITIES) (kinds[A.subjectOf(a)] ??= []).push(a.id);
  eq('Chủ thể theo việc: lịch mổ/sinh mổ không hỏi ai; cưới hỏi xét cô dâu; làm nhà xét gia chủ',
    [kinds.none.sort(), kinds.bride.sort(), kinds.owner.sort()],
    [['med_birth', 'med_surgery'], ['wed_bed', 'wed_engage', 'wed_main'], ['build_earth', 'build_in', 'build_open', 'build_roof']]);
  eq('Việc khác (kể cả khám định kỳ, tùy chỉnh) là một người, giới tính chọn bình thường',
    [A.subjectOf(A.byId('med_checkup')), A.subjectOf(A.byId('biz_open')), A.subjectOf(A.makeCustom({ name: 'x', element: null, baseId: null })), A.subjectOf(null)],
    ['person', 'person', 'person', 'person']);

  // Việc y tế cố định chạy được khi không có lá số nào
  const noChart = S.findDays({ chart: null, act: A.byId('med_surgery'), nameInfo: null, from: '2026-10-12', to: '2026-10-12', mode: 'fixed', fixedTime: '08:30' });
  eq('Lịch mổ: không cần dữ liệu cá nhân (chart = null) vẫn trả thông tin lịch', [noChart.days.length, noChart.days[0].day.items.length, noChart.days[0].chosen.ganZhi], [1, 0, 'Mậu Thìn']);

  // Cưới hỏi: cô dâu là chủ thể, chú rể tùy chọn — ngày xung tuổi chú rể là kỵ nặng
  const bride = NT.bazi.buildChart({ ...base, gender: 'female', birthDate: '1998-03-12', birthTime: '06:15' }); // tuổi Dần
  const wed = A.byId('wed_main');
  const range = { chart: bride, act: wed, nameInfo: null, from: '2026-11-01', to: '2027-01-31', mode: 'best' };
  const alone = S.findDays(range);
  const groomZhi = 4; // chú rể tuổi Thìn → ngày Tuất xung
  const withGroom = S.findDays({ ...range, options: { others: [{ role: 'chú rể', zhi: groomZhi }] } });
  const clash = withGroom.days.filter((d) => d.ctx.dayZ === 10);
  eq('Ngày Tuất: có dòng "xung tuổi chú rể (Thìn)" mức kỵ nặng và bị loại khỏi đề xuất',
    [clash.length > 0, clash.every((d) => d.day.items.some((i) => i.severe && /xung tuổi chú rể \(Thìn\)/.test(i.text))), clash.every((d) => !withGroom.ranked.includes(d))],
    [true, true, true]);
  const other = withGroom.days.filter((d) => d.ctx.dayZ !== 10);
  eq('Ngày khác không bị ảnh hưởng bởi tuổi chú rể', other.every((d, i) => d.score === alone.days.filter((x) => x.ctx.dayZ !== 10)[i].score), true);
  eq('Cô dâu là chủ thể: dòng Kim lâu (nếu có) nói về tuổi của chính cô dâu, không còn ghi chú "không áp dụng cho nam"',
    alone.days.some((d) => d.day.items.some((i) => /không áp dụng/.test(i.text))), false);

  // Giao diện: việc trước, không lưu
  const html2 = readFileSync(path.join(root, 'index.html'), 'utf8'), app2 = readFileSync(path.join(root, 'js/ui/app.js'), 'utf8');
  eq('index.html: thẻ chọn việc đứng trước thẻ người được xét; không còn nút Lưu, danh sách hồ sơ',
    [html2.indexOf('id="card-task"') > 0 && html2.indexOf('id="card-task"') < html2.indexOf('id="card-profile"'), /profile-select|btn-save-profile|btn-delete-profile|btn-clear-all/.test(html2)],
    [true, false]);
  eq('index.html: "Ai là gia chủ?" có đủ 4 phương án cố định', [...html2.matchAll(/<select class="input" id="f-owner">([\s\S]*?)<\/select>/g)].flatMap((m) => [...m[1].matchAll(/value="(\w+)"/g)].map((x) => x[1])), ['male', 'female', 'son', 'borrowed']);
  eq('app.js không ghi gì vào bộ nhớ trình duyệt', /localStorage\.setItem|sessionStorage|indexedDB|document\.cookie/.test(app2), false);
  eq('Ô họ tên và ô chú rể ẩn mặc định', [/class="field full hidden" id="wrap-name"/.test(html2), /class="field full hidden" id="wrap-groom"/.test(html2)], [true, true]);
}

// ---------- Lịch trình giờ trong ngày cưới (PRD §10.5) ----------
{
  const W = NT.weddingPlan, S = NT.scoring, A = NT.activities;
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  eq('Canh giờ: 07:00 thuộc 07:00–09:00; 00:30 thuộc canh Tý 23:00–01:00', [W.canhOf(420), W.canhOf(30)], [[420, 540], [-60, 60]]);

  // Giờ hoàng đạo của từng mốc khớp bảng truyền thống theo chi ngày
  const HD = { 0: [0, 1, 3, 6, 8, 9], 1: [2, 3, 5, 8, 10, 11], 2: [0, 1, 4, 5, 7, 10], 3: [0, 2, 3, 6, 7, 9], 4: [2, 4, 5, 8, 9, 11], 5: [1, 4, 6, 7, 10, 11] };
  let hdBad = 0, hdN = 0;
  for (let day = 1; day <= 28; day++) {
    const ctx = S.dayContext(2026, 11, day);
    for (let min = 300; min <= 1260; min += 35) { const h = W.hourInfo(2026, 11, day, min, []); hdN++; if (HD[ctx.dayZ % 6].includes(h.zhi) !== h.huangDao) hdBad++; }
  }
  eq('Giờ hoàng đạo của mốc giờ khớp bảng theo chi ngày (28 ngày × 28 mốc)', [hdN, hdBad], [784, 0]);

  const near = W.plan({ y: 2026, m: 11, d: 15, travelTo: 20, brideZhi: 2, groomZhi: 4 });
  const p0 = near.plans[0], t = Object.fromEntries(p0.steps.map((s) => [s.key, toMin(s.time)]));
  eq('Nhà gần 20 phút: có phương án; các mốc cách nhau đúng theo thời gian đi, lễ và đệm',
    [near.plans.length >= 1, t.A - t.D, t.L - t.A, t.H - t.L, toMin(p0.endGroom) - t.H], [true, 35, 45, 20, 30]);
  eq('Mọi phương án nằm trong khung 05:00–21:00', near.plans.every((p) => toMin(p.steps[0].time) >= 300 && toMin(p.endGroom) <= 1260), true);
  // Phương án đầu đạt số mốc ưu tiên cao nhất có thể (đối chiếu bằng vét cạn)
  let best = 0;
  for (let a = 300; a <= 1260; a += 5) {
    const dm = a - 35, h = a + 65;
    if (dm < 300 || h + 30 > 1260) continue;
    const zs = [{ role: 'cô dâu', zhi: 2 }, { role: 'chú rể', zhi: 4 }];
    best = Math.max(best, [a, h].filter((x) => { const i = W.hourInfo(2026, 11, 15, x, zs); return i.good && i.margin >= 15; }).length);
  }
  eq('Phương án đầu có số mốc ưu tiên "vững" (giờ tốt, cách ranh giới canh ≥ 15 phút) bằng mức tối đa (vét cạn)', p0.prioRobust, best);
  eq('Phương án đầu không kém phương án sau về số mốc ưu tiên vững', near.plans.every((p) => p.prioRobust <= p0.prioRobust), true);
  eq('Mốc xung tuổi không được tính là mốc tốt', near.plans.every((p) => p.steps.every((s) => !(s.clash.length && s.good))), true);
  const clashAll = W.hourInfo(2026, 11, 15, 8 * 60, [{ role: 'cô dâu', zhi: 10 }]); // 08:00 giờ Thìn xung tuổi Tuất
  eq('08:00 là giờ Thìn, xung tuổi Tuất', [clashAll.zhiVi, clashAll.clash, clashAll.good], ['Thìn', ['cô dâu'], false]);

  const far = W.plan({ y: 2026, m: 11, d: 15, travelTo: 240 });
  eq('Nhà xa 4 giờ: vẫn xếp được, xuất phát không trước 05:00, có gợi ý ba cách làm khi đường xa',
    [far.plans.length >= 1, far.plans.every((p) => toMin(p.steps[0].time) >= 300), far.advice.some((x) => /Đường xa/.test(x))], [true, true, true]);
  const tooFar = W.plan({ y: 2026, m: 11, d: 15, travelTo: 540 });
  eq('Nhà xa 9 giờ mỗi lượt: không gợi ý chạy xe đêm — không có phương án, có lời giải thích', [tooFar.plans.length, tooFar.advice.length >= 2], [0, true]);
  const withParty = W.plan({ y: 2026, m: 11, d: 15, travelTo: 20, partyTime: '06:10' });
  eq('Giờ tiệc trước khi xong lễ nhà trai → có lưu ý', withParty.plans[0].notes.some((x) => /Giờ tiệc 06:10 sớm hơn/.test(x)), true);
  let threw = false; try { W.plan({ y: 2026, m: 11, d: 15, travelTo: -5 }); } catch { threw = true; }
  eq('Thời gian đi âm → báo lỗi', threw, true);
  const prioD = W.plan({ y: 2026, m: 11, d: 15, travelTo: 90, priority: ['D', 'A'] });
  eq('Đổi mốc ưu tiên sang xuất phát + vào nhà gái', [prioD.priority, prioD.plans[0].steps.filter((s) => s.priority).map((s) => s.key)], [['D', 'A'], ['D', 'A']]);

  // Giờ đề xuất cho việc cưới nằm trong khung sinh hoạt; việc khác không đổi
  const bride2 = NT.bazi.buildChart({ ...base, gender: 'female', birthDate: '1998-03-12', birthTime: '06:15' });
  const wedDays = S.findDays({ chart: bride2, act: A.byId('wed_main'), nameInfo: null, from: '2026-11-01', to: '2027-01-31', mode: 'best' }).days;
  const start = (h) => Number(h.label.slice(0, 2));
  eq('Cưới hỏi: giờ đề xuất luôn trong 07:00–20:59; hộp chi tiết vẫn đủ 13 khung',
    [wedDays.every((d) => start(d.chosen) >= 7 && start(d.chosen) < 21 && d.bestHours.every((h) => start(h) >= 7 && start(h) < 21)), wedDays[0].hours.length], [true, 13]);
  const bizDays = S.findDays({ chart, act: A.byId('biz_open'), nameInfo: null, from: '2026-11-01', to: '2027-01-31', mode: 'best' }).days;
  eq('Việc không có tiệc, nhạc: giờ đề xuất trong 05:00–20:59 (không đề xuất nửa đêm, rạng sáng); hộp chi tiết vẫn đủ 13 khung',
    [bizDays.every((d) => start(d.chosen) >= 5 && start(d.chosen) < 21 && d.bestHours.every((h) => start(h) >= 5 && start(h) < 21)), bizDays[0].hours.length], [true, 13]);
}

// ---------- Sau phản biện độc lập G0b + lịch trình; ý nghĩa giờ tốt; gắn mốc vào canh giờ ----------
{
  const W = NT.weddingPlan, A = NT.activities;
  const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const D0 = { y: 2026, m: 11, d: 15 };
  const key = (r) => r.plans.map((p) => p.steps.map((s) => s.time).join('>')).join('|');

  // Tham số: chuỗi, số lẻ, rỗng
  eq('Tham số dạng chuỗi cho cùng kết quả như dạng số', key(W.plan({ ...D0, travelTo: '20', ceremonyBride: '45', ceremonyGroom: '30' })), key(W.plan({ ...D0, travelTo: 20, ceremonyBride: 45, ceremonyGroom: 30 })));
  const dec = W.plan({ ...D0, travelTo: 20.4, ceremonyBride: 12.5, ceremonyGroom: 7.3, buffer: 2.5 });
  eq('Số lẻ được làm tròn: mọi mốc là HH:MM nguyên phút', dec.plans.every((p) => [...p.steps.map((s) => s.time), p.endGroom].every((t) => /^\d{2}:\d{2}$/.test(t))), true);
  eq('Ô để trống dùng mặc định: lễ 45 và 30 phút, lượt về bằng lượt đi', (() => { const p = W.plan({ ...D0, travelTo: 20, travelBack: '', ceremonyBride: '', ceremonyGroom: null }).plans[0]; const t = Object.fromEntries(p.steps.map((s) => [s.key, toMin(s.time)])); return [t.L - t.A, t.H - t.L, toMin(p.endGroom) - t.H]; })(), [45, 20, 30]);
  const threw = (o) => { try { W.plan(o); return false; } catch { return true; } };
  eq('Thiếu thời gian đi, giờ tiệc sai định dạng → báo lỗi thay vì hiểu là 0', [threw({ ...D0 }), threw({ ...D0, travelTo: '' }), threw({ ...D0, travelTo: 'abc' }), threw({ ...D0, travelTo: 20, partyTime: '25h' })], [true, true, true, true]);
  const bad = (o) => { try { W.plan({ ...D0, travelTo: 20, ...o }); return false; } catch (e) { return /[àáảãạăâđêôơư]/i.test(e.message); } };
  eq('Tham số sai kiểu hoặc sai khoảng bị từ chối bằng thông báo tiếng Việt',
    [bad({ travelTo: true }), bad({ travelTo: [5] }), bad({ travelTo: '1e3' }), bad({ travelTo: '   ' }), bad({ partyTime: '24:00' }), bad({ partyTime: '12:60' }), bad({ windowFrom: '21:00', windowTo: '05:00' }), bad({ anchor: { key: 'X', from: 0, to: 60 } }), bad({ anchor: { key: 'A', from: '540', to: '660' } }), bad({ anchor: { key: 'A', from: 660, to: 540 } })],
    Array(10).fill(true));
  eq('step = 0 không treo; ưu tiên trùng lặp được khử', [W.plan({ ...D0, travelTo: 20, step: 0 }).plans.length >= 1, W.plan({ ...D0, travelTo: 20, priority: ['D', 'D'] }).priority], [true, ['D']]);

  // Lượt về khác lượt đi
  const asym = W.plan({ ...D0, travelTo: 30, travelBack: 75 }).plans[0], ta = Object.fromEntries(asym.steps.map((s) => [s.key, toMin(s.time)]));
  eq('Lượt đi 30, lượt về 75 phút: A − D = 45, H − L = 75', [ta.A - ta.D, ta.H - ta.L], [45, 75]);

  // Lễ ở nhà gái không trước 06:00; xuất phát được từ 05:00
  let earlyA = 0, earlyD = 0, n = 0;
  for (let d = 1; d <= 28; d++) for (const tr of [10, 20, 45, 90]) for (const p of W.plan({ y: 2026, m: 11, d, travelTo: tr }).plans) { n++; if (toMin(p.steps[1].time) < 360) earlyA++; if (toMin(p.steps[0].time) < 300) earlyD++; }
  eq('112 lần gọi (28 ngày × 4 quãng đường): không phương án nào có lễ ở nhà gái trước 06:00 hay xuất phát trước 05:00', [n > 100, earlyA, earlyD], [true, 0, 0]);

  // Gắn mốc vào canh giờ đã chọn → đề xuất giờ cụ thể
  const anc = W.plan({ ...D0, travelTo: 40, anchor: { key: 'A', from: 9 * 60, to: 11 * 60 } });
  eq('Gắn "vào nhà gái" vào canh 09:00–10:59: mọi phương án có mốc đó trong canh; các mốc khác tính theo thời gian đi',
    [anc.plans.length >= 1, anc.plans.every((p) => toMin(p.steps[1].time) >= 540 && toMin(p.steps[1].time) < 660), anc.plans.every((p) => toMin(p.steps[1].time) - toMin(p.steps[0].time) === 55)], [true, true, true]);
  const ancH = W.plan({ ...D0, travelTo: 40, anchor: { key: 'H', from: 13 * 60, to: 15 * 60 } });
  eq('Gắn "về tới nhà trai" vào canh 13:00–14:59', ancH.plans.every((p) => toMin(p.steps[3].time) >= 780 && toMin(p.steps[3].time) < 900) && ancH.plans.length >= 1, true);
  // Vét cạn: trong canh đã gắn, phương án đầu đạt số mốc ưu tiên vững cao nhất có thể (28 ngày × 3 canh)
  let ancBad = 0, ancN = 0;
  for (let d = 1; d <= 28; d++) for (const hh of [7, 9, 13]) {
    const r = W.plan({ y: 2026, m: 11, d, travelTo: 40, anchor: { key: 'A', from: hh * 60, to: hh * 60 + 120 } });
    let max = -1;
    for (let a = hh * 60; a < hh * 60 + 120; a += 5) {
      const dm = a - 55, h = a + 85;
      if (a < 360 || dm < 300 || h + 30 > 1260) continue;
      max = Math.max(max, [a, h].filter((x) => { const i = W.hourInfo(2026, 11, d, x, []); return i.good && i.margin >= 15; }).length);
    }
    ancN++;
    if ((r.plans[0]?.prioRobust ?? -1) !== max) ancBad++;
  }
  eq('Gắn mốc vào canh: phương án đầu đạt số mốc ưu tiên vững tối đa trong canh đó (vét cạn 84 ca)', [ancN, ancBad], [84, 0]);
  const impossible = W.plan({ ...D0, travelTo: 300, anchor: { key: 'A', from: 7 * 60, to: 9 * 60 } });
  eq('Gắn mốc không khả thi (đi 5 giờ mà vào nhà gái lúc 07–09 giờ) → không có phương án, có lời giải thích riêng', [impossible.plans.length, /khi gắn/.test(impossible.advice[0] ?? '')], [0, true]);

  // Tiệc từ 23:00: ghi rõ thuộc ngày hôm sau
  const late = W.plan({ ...D0, travelTo: 20, partyTime: '23:30' }).plans[0];
  eq('Giờ tiệc 23:30: gắn cờ thuộc canh Tý ngày hôm sau và có lưu ý', [late.party.nextDay, late.notes.some((x) => /ngày hôm sau/.test(x))], [true, true]);

  // "Giờ tốt" là giờ để làm gì
  const flex = A.ACTIVITIES.filter((a) => !a.fixedOnly);
  eq('Mọi việc tự chọn ngày đều có mô tả "giờ tốt là giờ để…"; riêng lễ cưới là nhiều mốc (null)',
    [flex.filter((a) => a.id !== 'wed_main').every((a) => typeof A.hourMeaningOf(a) === 'string' && A.hourMeaningOf(a).length > 3), A.hourMeaningOf(A.byId('wed_main')), flex.filter((a) => !(a.id in A.HOUR_MEANING)).map((a) => a.id)],
    [true, null, []]);
  eq('Việc tùy chỉnh dùng mô tả chung', A.hourMeaningOf(A.makeCustom({ name: 'x', element: null, baseId: null })), 'bắt đầu việc');
}

// ---------- Sổ giỗ, canh giờ, văn khấn ----------
for (const f of ['core/canh-clock', 'core/anniversary-calc', 'core/prayers-data', 'storage/idb-manager']) {
  vm.runInThisContext(readFileSync(path.join(root, `js/${f}.js`), 'utf8'), { filename: `${f}.js` });
}
{
  const AN = NT.anniversary;
  const next = (d, m, from, leap = false) => AN.calculateAnniversaryReminders({ lunarDay: d, lunarMonth: m, isLeap: leap }, from);
  eq('Giỗ 15/8 âm, hôm nay 06/10/2026 → lần tới 15/09/2027',
    next(15, 8, new Date(2026, 9, 6)).nextSolarDate.solarDateStr, '2027-09-15');
  const r = next(1, 12, new Date(2026, 0, 20));
  eq('Giỗ 1/12 âm, hôm nay 20/01/2026 → 08/01/2027 (không nhảy sang cuối năm 2027)', [r.nextSolarDate.solarDateStr, r.daysLeft], ['2027-01-08', 353]);
  eq('Đúng ngày giỗ thì còn 0 ngày', next(15, 8, new Date(2026, 8, 25, 22, 0)).daysLeft, 0);
  eq('Năm 2027 có hai lần giỗ 1/12 âm (08/01 và 28/12)', AN.getAnniversaryOccurrences(1, 12, 2027).map((o) => o.solarDateStr), ['2027-01-08', '2027-12-28']);
  // Lần giỗ tới không sớm hơn hôm nay và không bỏ sót lần nào ở giữa
  let bad = 0;
  for (let t = new Date(2025, 0, 1); t < new Date(2028, 0, 1); t.setDate(t.getDate() + 17)) {
    for (let m = 1; m <= 12; m++) for (const d of [1, 15, 29, 30]) {
      const occ = AN.nextAnniversaryOccurrence(d, m, t);
      const from = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
      const all = [t.getFullYear(), t.getFullYear() + 1].flatMap((y) => AN.getAnniversaryOccurrences(d, m, y)).map((o) => o.solarDateStr).filter((x) => x >= from).sort();
      if (!occ || occ.solarDateStr !== all[0]) bad++;
    }
  }
  eq('Lần giỗ tới luôn là lần sớm nhất kể từ hôm nay (vét 48 ngày âm × 65 ngày bắt đầu)', bad, 0);
  eq('Ngày, tháng âm ngoài miền → null thay vì ném lỗi', [AN.getAnniversarySolarDate(31, 13, 2026), AN.getAnniversarySolarDate(0, 1, 2026)], [null, null]);

  const ics = await NT.storage.generateIcsCalendar([{ id: 'a1', name: 'Ông A; B, C', relationship: 'Cụ', lunarDay: 1, lunarMonth: 12, remindDays: [7, 0],
    note: 'dòng1\nEND:VEVENT\nBEGIN:VEVENT\nSUMMARY:giả' }], [2027]);
  eq('.ics: ghi chú có xuống dòng không chèn được sự kiện giả; đủ hai lần giỗ của năm; hai mốc nhắc mỗi lần',
    [(ics.match(/^BEGIN:VEVENT/gm) || []).length, (ics.match(/^BEGIN:VALARM/gm) || []).length, ics.includes('Ông A\\; B\\, C'), ics.endsWith('\r\n')],
    [2, 4, true, true]);
  eq('.ics: nhắc trước 7 ngày lúc 07:00 và đúng ngày lúc 07:00 (không nổ lúc nửa đêm)',
    [ics.includes('TRIGGER:-PT9660M'), ics.includes('TRIGGER:PT420M')], [true, true]);
  const icsCustom = await NT.storage.generateIcsCalendar([{ id: 'a2', name: 'B', lunarDay: 10, lunarMonth: 3, remindDays: [1], notifyTime: '20:30' },
    { id: 'a3', name: 'C', lunarDay: 10, lunarMonth: 3, remindDays: [0], notifyTime: { gio: 8 } }], [2027]);
  eq('.ics: giờ nhắc tùy chỉnh 20:30 trước 1 ngày = lùi 210 phút; giờ nhắc sai kiểu dùng 07:00, không ném lỗi',
    [icsCustom.includes('TRIGGER:-PT210M'), icsCustom.includes('TRIGGER:PT420M')], [true, true]);
  eq('.ics: không dòng nào dài quá 75 octet', ics.split('\r\n').every((l) => Buffer.byteLength(l, 'utf8') <= 75), true);
  const imp = await NT.storage.importDataJSON(JSON.stringify({ anniversaries: [{ name: 'X', lunarDay: 31, lunarMonth: 13 }, { id: 'ok1', name: 'Y', lunarDay: 10, lunarMonth: 3 }] }));
  const again = await NT.storage.importDataJSON(JSON.stringify({ anniversaries: [{ id: 'ok1', name: 'Y', lunarDay: 10, lunarMonth: 3 }] }));
  eq('Nhập sao lưu: bỏ dòng sai miền, nhập lại cùng id không nhân đôi', [imp.count, imp.skipped, again.success, (await NT.storage.getAllAnniversaries()).length], [1, 1, true, 1]);
  const prof = await NT.storage.saveUserProfile({ fullName: 'A', birthYear: '', culturalRegion: 'nam' });
  eq('Hồ sơ: không tự điền năm sinh 1990; giữ vùng miền', [prof.birthYear, prof.culturalRegion], [null, 'nam']);

  const C = NT.canhClock;
  const hac = (g, z) => C.getDirections(NT.data.GAN_VI[g], NT.data.ZHI_VI[z]).hacThan;
  eq('Hạc thần theo vòng 60 can chi: Kỷ Dậu, Giáp Dần → Đông Bắc; Ất Mão → Đông; Nhâm Thìn → Bắc; Quý Tỵ, Mậu Thân → trên trời',
    [hac(5, 9), hac(0, 2), hac(1, 3), hac(8, 4), /trên trời/.test(hac(9, 5)), /trên trời/.test(hac(4, 8))],
    ['Đông Bắc', 'Đông Bắc', 'Chính Đông', 'Chính Bắc', true, true]);
  // Đáp án độc lập với bảng của mã (QĐ-16): k = số thứ tự giờ (Tý = 1); số dư của (ngày + tháng + k − 2) chia 6
  // là 1 Đại An, 2 Tốc Hỷ, 3 Lưu Niên, 4 Xích Khẩu, 5 Tiểu Cát, 0 Không Vong.
  const LTP_BY_REMAINDER = ['Không Vong', 'Đại An', 'Tốc Hỷ', 'Lưu Niên', 'Xích Khẩu', 'Tiểu Cát'];
  const ltpBad = [];
  for (let mo = 1; mo <= 12; mo++) for (let dy = 1; dy <= 30; dy++) for (let k = 1; k <= 12; k++) {
    if (C.getLyThuanPhong(mo, dy, k - 1).name !== LTP_BY_REMAINDER[(dy + mo + k - 2) % 6]) ltpBad.push([mo, dy, k]);
  }
  eq('Lý Thuần Phong: 12 tháng × 30 ngày × 12 giờ khớp công thức đếm cung Đại An → Tốc Hỷ → Lưu Niên → Xích Khẩu → Tiểu Cát → Không Vong; mùng 1 tháng giêng giờ Tý là Đại An',
    [ltpBad.length, ltpBad.slice(0, 3), C.getLyThuanPhong(1, 1, 0).name, C.getDayHoursDetails('Tý', 1, 1).map((h) => h.lyThuanPhong.name).slice(0, 6)],
    [0, [], 'Đại An', ['Đại An', 'Tốc Hỷ', 'Lưu Niên', 'Xích Khẩu', 'Tiểu Cát', 'Không Vong']]);
  eq('Lý Thuần Phong: Đại An, Tốc Hỷ, Tiểu Cát là cung tốt; Lưu Niên, Xích Khẩu, Không Vong là cung xấu',
    C.LY_THUAN_PHONG.map((x) => `${x.name}:${x.quality}`), ['Đại An:good', 'Tốc Hỷ:good', 'Lưu Niên:bad', 'Xích Khẩu:bad', 'Tiểu Cát:good', 'Không Vong:bad']);

  eq('Lý Thuần Phong: mỗi cung có cụm nghĩa ngắn hiện mặc định, không chứa lời khuyên về hướng; lời truyền khẩu đầy đủ vẫn còn để hiện khi người dùng mở',
    [C.LY_THUAN_PHONG.map((x) => x.short), C.LY_THUAN_PHONG.some((x) => /hướng|đại lợi/i.test(x.short)), C.LY_THUAN_PHONG.every((x) => x.meaning.length > 40)],
    [['yên ổn', 'tin vui đến nhanh', 'việc chậm, dây dưa', 'dễ cãi vã', 'may mắn nhỏ', 'việc khó thành'], false, true]);

  // Hoàng đạo: hai cách tra (QĐ-16). Bảng theo tháng âm viết tay ở đây, độc lập với hàm của mã.
  const HD_BY_MONTH = { 1: 'Tý Sửu Thìn Tỵ Mùi Tuất', 2: 'Dần Mão Ngọ Mùi Dậu Tý', 3: 'Thìn Tỵ Thân Dậu Hợi Dần', 4: 'Ngọ Mùi Tuất Hợi Sửu Thìn', 5: 'Thân Dậu Tý Sửu Mão Ngọ', 6: 'Tuất Hợi Dần Mão Tỵ Thân' };
  let tableBad = 0;
  for (let mo = 1; mo <= 12; mo++) for (let z = 0; z < 12; z++) {
    if (C.isHoangDaoByLunarMonth(mo, z) !== HD_BY_MONTH[((mo - 1) % 6) + 1].split(' ').includes(NT.data.ZHI_VI[z])) tableBad++;
  }
  eq('Hoàng đạo tra theo tháng âm: 12 tháng × 12 chi khớp bảng viết tay (tháng 1, 7: Tý Sửu Thìn Tỵ Mùi Tuất…)', tableBad, 0);
  const hdDiff = (y) => {
    let diffDays = 0, coreMismatch = 0;
    for (let t = Date.UTC(y, 0, 1); t <= Date.UTC(y, 11, 31); t += 864e5) {
      const dt = new Date(t);
      const r = C.compareDayHoangDao(dt.getUTCDate(), dt.getUTCMonth() + 1, y);
      if (r.differs) diffDays++;
      if (r.bySolarTerm !== (NT.scoring.dayContext(y, dt.getUTCMonth() + 1, dt.getUTCDate()).tianShenLuck === '吉')) coreMismatch++;
    }
    return [diffDays, coreMismatch];
  };
  eq('Hoàng đạo: số ngày cách theo tiết khí (phần lõi) khác cách theo tháng âm là 77 (2025), 65 (2026), 36 (2027); vế tiết khí trùng thần nhật của phần chọn ngày',
    [hdDiff(2025), hdDiff(2026), hdDiff(2027)], [[77, 0], [65, 0], [36, 0]]);
  // 08/08/2025 = 15/6 nhuận (đáp án ở phép thử sổ giỗ bên dưới): tháng nhuận tra theo bảng của tháng 6
  const leapDay = Solar.fromYmd(2025, 8, 8).getLunar();
  eq('Hoàng đạo theo tháng âm: ngày trong tháng 6 nhuận 2025 tra theo bảng tháng 6 (Tuất Hợi Dần Mão Tỵ Thân)',
    [NT.calendar.solarToLunar(8, 8, 2025).leap, C.compareDayHoangDao(8, 8, 2025).byLunarMonth],
    [true, 'Tuất Hợi Dần Mão Tỵ Thân'.split(' ').includes(NT.data.ZHI_VI[leapDay.getDayZhiIndex()])]);
  // Đáp án độc lập: 15/6 nhuận 2025 = 08/08/2025 nên 29/6 nhuận = 22/08/2025
  eq('Giỗ 30/6 nhuận, năm 2025 tháng 6 nhuận chỉ 29 ngày → 29/6 nhuận (22/08/2025), không nhảy về tháng 6 thường',
    [AN.getAnniversaryOccurrences(15, 6, 2025, true)[0].solarDateStr, AN.getAnniversaryOccurrences(30, 6, 2025, true)[0].solarDateStr], ['2025-08-08', '2025-08-22']);
  let hourBad = 0;
  for (let i = 0; i < 400; i++) {
    const l = Solar.fromYmd(2026, 1, 1).next(i).getLunar();
    const hd = C.getDayHoursDetails(NT.data.ZHI_VI[l.getDayZhiIndex()], Math.abs(l.getMonth()), l.getDay());
    for (let h = 0; h < 12; h++) if ((LunarTime.fromYmdHms(l.getYear(), l.getMonth(), l.getDay(), h * 2, 30, 0).getTianShenType() === '黄道') !== hd[h].isHuangDao) hourBad++;
  }
  eq('Giờ hoàng đạo của đồng hồ canh khớp nguồn của phần chọn ngày (400 ngày × 12 canh, canh Tý lấy lúc 00:30)', hourBad, 0);

  // Kho văn khấn sau lượt đối chiếu nguồn 2026-10-07
  const allPrayers = NT.prayers.PRAYERS;
  const intro = allPrayers.filter((p) => p.kind === 'gioi_thieu');
  eq('53 mục: 45 bài khấn và 8 bài giới thiệu lễ của các dân tộc; bài giới thiệu không có lời khấn, không có biến điền',
    [allPrayers.length, intro.length, intro.every((p) => p.category === 'dan_toc_thieu_so' && !/Nam mô|Con kính lạy|\{\{/.test(p.content)),
      allPrayers.filter((p) => p.category === 'dan_toc_thieu_so' && p.kind !== 'gioi_thieu').length],
    [53, 8, true, 0]);
  eq('Kho văn khấn không có nhóm hay bài dâng sao giải hạn (PRD 1.3, QĐ-24)',
    [NT.prayers.CATEGORIES.some((c) => /sao/i.test(c.id)), allPrayers.filter((p) => /dâng sao|giải sao|giải hạn|Tinh Quân/i.test(p.title + ' ' + p.content)).map((p) => p.id)],
    [false, []]);
  const twice = allPrayers.filter((p) => p.kind !== 'gioi_thieu').filter((p) => {
    const inv = p.content.split('\n').filter((l) => l.startsWith('Con kính lạy')).join(' ');
    return [/Thổ [đĐ]ịa|Thổ Công/g, /Thành [hH]oàng/g, /Thái Tuế/g].some((re) => (inv.match(re) || []).length > 1);
  }).map((p) => p.id);
  eq('Không bài nào khấn trùng một vị (Thổ địa, Thành hoàng, Thái Tuế) hai lần', twice, []);
  const blob = allPrayers.map((p) => [p.title, p.meaning, p.offerings, p.taboos, p.content].join(' | ')).join(' | ');
  eq('Các danh xưng và khẳng định không có nguồn đã được gỡ',
    ['Thiên cơ đại tiên chúa', 'Đức Chúa ngục', 'Tả Phủ Bắc Đẩu', 'Tam vị Đức Ông', 'Nguyệt Cung Thái Âm', 'duy nhất trong chùa', 'Then Mường', 'người có vận khí tốt'].filter((x) => blob.includes(x)), []);
  eq('Văn khấn điền tên năm âm theo can chi, không phải số năm dương', /năm (Giáp|Ất|Bính|Đinh|Mậu|Kỷ|Canh|Tân|Nhâm|Quý) /.test(NT.prayers.renderPrayer('vk_tat_nien', {}, {}).renderedText), true);
  const withAddr = NT.prayers.filterPrayers({}).map((p) => NT.prayers.getPrayerById(p.id)).find((p) => p.content.includes('{{GIA_CHU_ADDRESS}}'));
  const out = NT.prayers.renderPrayer(withAddr.id, { fullName: 'A $& B', address: "Số 5 $& $` $' phố" }, {});
  eq('Văn khấn: ký tự $ trong tên, địa chỉ được giữ nguyên văn', [out.renderedText.includes("Số 5 $& $` $' phố"), out.renderedText.includes('{{')], [true, false]);
}

// G1 — bảng sóc và tiết khí đã đóng băng (PRD mục 5, 13.1 lớp 1). Bảng do tools/astro/build_astro_events.py sinh;
// phép so với TDBtimes của Yuk Tung Liu chạy bằng tools/astro/compare_tdbtimes.py, không chạy ở đây.
{
  const raw = readFileSync(path.join(root, 'data/astro_events.json'));
  const frozen = readFileSync(path.join(root, 'data/astro_events.sha256'), 'utf8').split(/\s+/)[0];
  // Mã băm ghi cứng ở đây để một lượt sinh lại bảng không thể lặng lẽ đổi cả bảng lẫn tệp .sha256
  eq('Bảng astro_events khớp mã băm SHA-256 đã đóng băng ngày 2026-10-07',
    [createHash('sha256').update(raw).digest('hex'), frozen],
    ['9818f55bd948489358386251fd43e64fbbe5537f44ce577048b1e846c41b7ad1', '9818f55bd948489358386251fd43e64fbbe5537f44ce577048b1e846c41b7ad1']);
  const astro = JSON.parse(raw.toString('utf8'));
  const [y0, y1] = astro.meta.khoang_nam;
  const ms = (iso) => Date.parse(iso + 'Z');
  const terms = astro.events.filter((e) => e[0] === 'tiet_khi');
  const soc = astro.events.filter((e) => e[0] === 'soc');
  const perYear = new Map();
  for (const [, [y, i]] of terms) perYear.set(y, (perYear.get(y) || []).concat(i));
  let badYears = 0;
  for (let y = y0; y <= y1; y++) {
    const got = (perYear.get(y) || []).slice().sort((a, b) => a - b);
    if (got.length !== 24 || got.some((v, i) => v !== i)) badYears++;
  }
  eq('astro_events: 1799–2200, mỗi năm đủ 24 tiết khí', [y0, y1, terms.length, badYears], [1799, 2200, 9648, 0]);
  let gapMin = Infinity, gapMax = 0, kBad = 0;
  for (let i = 1; i < soc.length; i++) {
    const g = (ms(soc[i][2]) - ms(soc[i - 1][2])) / 864e5;
    gapMin = Math.min(gapMin, g); gapMax = Math.max(gapMax, g);
    if (soc[i][1] - soc[i - 1][1] !== 1) kBad++;
  }
  eq('astro_events: hai sóc liên tiếp cách nhau 29,2–29,9 ngày, số thứ tự tuần trăng tăng đều',
    [soc.length, gapMin > 29.2, gapMax < 29.9, kBad], [4972, true, true, 0]);
  eq('astro_events: thứ tự thời gian tăng dần; ΔT = TT − UT1 khớp cột delta_t trong 1 giây',
    [astro.events.every((e, i) => i === 0 || ms(e[2]) > ms(astro.events[i - 1][2])),
      astro.events.every((e) => Math.abs((ms(e[2]) - ms(e[3])) / 1000 - e[4]) <= 1)], [true, true]);
  // Ca ranh giới của PRD 5.3: Đại hàn 1979 rơi vài giây trước nửa đêm UTC+8
  const daiHan1979 = terms.find((e) => e[1][0] === 1979 && e[1][1] === 20);
  eq('astro_events: Đại hàn 1979 rơi 5 giây trước nửa đêm tính theo UT1 + 8 giờ (ca ranh giới ở PRD 5.3)',
    new Date(ms(daiHan1979[3]) + 8 * 3600e3).toISOString().slice(0, 19), '1979-01-20T23:59:55');
  // Bộ máy đối chiếu thứ hai (PRD 5.2): thư viện lịch đang dùng, giờ UTC+8. Sau 2030 hai bên lệch dần vì ngoại suy ΔT khác nhau.
  const NAMES = ['春分', '清明', '谷雨', '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰'];
  const ours = new Map(terms.map((e) => [`${e[1][0]}:${e[1][1]}`, ms(e[3]) + 8 * 3600e3]));
  let n = 0, worst = 0;
  for (let y = 1929; y <= 2030; y++) {
    for (const [k, s] of Object.entries(Lunar.fromYmd(y, 6, 1).getJieQiTable())) {
      const idx = NAMES.indexOf(k);
      const o = ours.get(`${y}:${idx}`);
      if (idx < 0 || s.getYear() !== y || o === undefined) continue;
      const theirs = Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour(), s.getMinute(), s.getSecond());
      n++; worst = Math.max(worst, Math.abs(theirs - o) / 1000);
    }
  }
  eq('astro_events: tiết khí 1929–2030 lệch thư viện lịch đang dùng không quá 5 giây (theo UTC+8)', [n > 2300, worst <= 5], [true, true]);
}

// Bảng tháng âm lịch (js/core/lunar-months.js) và bộ đổi ngày hai chiều (js/core/date-convert.js)
{
  const { generate } = await import(pathToFileURL(path.join(root, 'tools/astro/build_lunar_months.mjs')).href);
  const { loadAstroEvents, buildLunarMonths, lookupLunar } = await import(pathToFileURL(path.join(root, 'tools/astro/lunar-from-astro.mjs')).href);
  eq('lunar-months.js đúng là kết quả sinh lại từ bảng astro_events đã đóng băng',
    readFileSync(path.join(root, 'js/core/lunar-months.js'), 'utf8').replace(/\r\n/g, '\n') === generate(), true);

  const C = NT.calendar, D = NT.dateConvert;
  const astro = loadAstroEvents();
  const ref = new Map();
  const refFor = (tz) => { if (!ref.has(tz)) ref.set(tz, buildLunarMonths(astro, tz)); return ref.get(tz); };
  const from = C.jdFromDate(1, 1, 1912), to = C.jdFromDate(31, 12, 2100);
  const GZ = (i, j) => `${NT.data.GAN_VI[i]} ${NT.data.ZHI_VI[j]}`;
  let n = 0, coreBad = 0, tripBad = 0, ganzhiBad = 0, weekdayBad = 0, flagged = 0;
  const WD = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  for (const region of ['bac', 'nam']) {
    for (let jd = from; jd <= to; jd++) {
      const [d, m, y] = C.jdToDate(jd);
      const tz = C.calendarTz(y, m, d, region);
      const want = lookupLunar(refFor(tz), jd);
      const r = D.solarToLunar({ day: d, month: m, year: y }, { region });
      n++;
      if (!r.ok || !want || r.lunar.day !== want.day || r.lunar.month !== want.month || r.lunar.year !== want.year || r.lunar.leap !== want.leap || r.lunar.monthLength !== want.length) coreBad++;
      const back = r.ok && D.lunarToSolar({ day: r.lunar.day, month: r.lunar.month, year: r.lunar.year, leap: r.lunar.leap }, { region });
      // Ngày âm của tháng Chạp năm 2100 rơi sang 2101 là ngoài khoảng: không tính vào vòng đổi ngược
      if (!back || !back.ok || back.solar.day !== d || back.solar.month !== m || back.solar.year !== y) tripBad++;
      if (region === 'bac') {
        const cn = Solar.fromYmd(y, m, d).getLunar();
        if (r.canChi.day !== GZ(cn.getDayGanIndex(), cn.getDayZhiIndex())) ganzhiBad++;
        if (r.solar.weekday !== WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]) weekdayBad++;
        if (r.flags.includes('BOUNDARY_RISK')) flagged++;
      }
    }
  }
  // Phép này chỉ chứng minh mã hóa, giải mã và tra bảng đúng (bảng và chuẩn so cùng sinh từ một hàm); bằng chứng độc lập ở hai phép kế tiếp
  eq('Đổi dương → âm trùng lịch dựng thẳng từ bảng thiên văn, từng ngày 1912–2100, hai miền', [n, coreBad], [138064, 0]);

  // Bằng chứng độc lập 1: thư viện lịch (6tail) cho 1912–1928 theo lịch Trung Quốc thời đó
  let bjBad = 0, bjN = 0;
  for (let jd = from; jd <= C.jdFromDate(31, 12, 1928); jd++) {
    const [d, m, y] = C.jdToDate(jd);
    const l = C.solarToLunar(d, m, y), cn = Solar.fromYmd(y, m, d).getLunar();
    bjN++;
    if (l.day !== cn.getDay() || l.month !== Math.abs(cn.getMonth()) || l.leap !== cn.getMonth() < 0) bjBad++;
  }
  eq('Âm lịch 1912–1928 trùng thư viện lịch ở mọi ngày (trước khi tra bảng: lệch 58 ngày ở 1917 và 1922)', [bjN, bjBad], [6210, 0]);

  // Bằng chứng độc lập 2: công thức Hồ Ngọc Đức (nạp riêng, không có bảng) cho UTC+7, 1976–2100 —
  // chỉ được khác bảng ở tháng có điểm sóc cách nửa đêm dưới 10 phút, nơi công thức xấp xỉ không phân giải được
  const sandbox = vm.createContext({ Math, Object, Map, Number, Array, String, Date });
  sandbox.globalThis = sandbox;
  vm.runInContext(readFileSync(path.join(root, 'js/core/calendar-vn.js'), 'utf8'), sandbox);
  const F = sandbox.NT.calendar;
  let fN = 0, fDiff = 0, fDiffUnflagged = 0;
  const fMonths = new Set();
  for (let jd = C.jdFromDate(1, 1, 1976); jd <= to; jd++) {
    const [d, m, y] = C.jdToDate(jd);
    const a = C.solarToLunar(d, m, y, 7), b = F.solarToLunar(d, m, y, 7);
    fN++;
    if (a.day !== b.day || a.month !== b.month || a.year !== b.year || a.leap !== b.leap) {
      fDiff++;
      const info = C.lunarMonthInfo(d, m, y, 7);
      fMonths.add(`${a.month}${a.leap ? 'N' : ''}/${a.year}`);
      if (info.boundarySeconds === null && info.nextBoundarySeconds === null) fDiffUnflagged++;
    }
  }
  eq('UTC+7, 1976–2100: bảng chỉ khác công thức Hồ Ngọc Đức ở tháng mang cờ ranh giới (tháng Ba nhuận 2031 và tháng Chín, Mười 2077)',
    [fN, fDiff, fDiffUnflagged, [...fMonths].sort()], [45656, 60, 0, ['10/2077', '3N/2031', '9/2077'].sort()]);
  eq('Đổi dương → âm → dương ra đúng ngày ban đầu, từng ngày 1912–2100, hai miền', tripBad, 0);
  eq('Can chi ngày trùng thư viện lịch và thứ trong tuần đúng, từng ngày 1912–2100', [ganzhiBad, weekdayBad], [0, 0]);

  const s2l = (d, m, y, region) => { const r = D.solarToLunar({ day: d, month: m, year: y }, { region }); return r.ok ? [r.lunar.day, r.lunar.month, r.lunar.year, r.lunar.leap, r.flags.join()] : r.error.code; };
  const l2s = (d, m, y, leap, region) => { const r = D.lunarToSolar({ day: d, month: m, year: y, leap }, { region }); return r.ok ? `${r.solar.text} ${r.flags.join()}`.trim() : r.error.code; };
  eq('Đổi âm → dương: Tết 1985 = 21/01, Tết 2007 = 17/02, Tết 2026 = 17/02, rằm tháng Bảy 2026 = 27/08',
    [l2s(1, 1, 1985), l2s(1, 1, 2007), l2s(1, 1, 2026), l2s(15, 7, 2026)], ['21/01/1985', '17/02/2007', '17/02/2026', '27/08/2026']);
  eq('Tết Mậu Thân 1968: miền Bắc 29/01, miền Nam 30/01; không rõ miền thì báo hai miền khác nhau',
    [l2s(1, 1, 1968, false, 'bac'), l2s(1, 1, 1968, false, 'nam'), l2s(1, 1, 1968, false, 'unknown')],
    ['29/01/1968', '30/01/1968', '29/01/1968 REGION_DIFFERS']);
  // Hai tháng mà công thức xấp xỉ cũ đặt mùng Một lệch một ngày so với điểm sóc thật
  eq('21/04/2031 là mùng 1 tháng Ba nhuận (sóc 23:57:06 giờ UTC+7), 16/11/2077 là mùng 1 tháng Mười (sóc 00:01:02); cả hai mang cờ ranh giới',
    [s2l(21, 4, 2031), s2l(16, 11, 2077), s2l(15, 11, 2077)],
    [[1, 3, 2031, true, 'BOUNDARY_RISK'], [1, 10, 2077, false, 'BOUNDARY_RISK'], [30, 9, 2077, false, 'BOUNDARY_RISK']]);
  eq('Tháng nhuận 1917 và 1922 theo bảng: nhuận tháng Hai và nhuận tháng Năm (trước đây công thức cho tháng Ba và tháng Sáu)',
    [D.lunarYearInfo(1917).leapMonth, D.lunarYearInfo(1922).leapMonth], [2, 5]);
  eq('Năm âm lịch: 2025 nhuận tháng Sáu, 2026 không nhuận, 2033 nhuận tháng Mười một và có 384 ngày, 13 tháng',
    [D.lunarYearInfo(2025).leapMonth, D.lunarYearInfo(2026).leapMonth, D.lunarYearInfo(2033).leapMonth, D.lunarYearInfo(2033).days, D.lunarYearInfo(2033).months.length],
    [6, null, 11, 384, 13]);
  const err = (r) => (r.ok ? 'ok' : `${r.error.code}: ${r.error.message}`);
  eq('Ngày không tồn tại được nêu lý do bằng tiếng Việt', [
    err(D.lunarToSolar({ day: 30, month: 2, year: 2026 })),
    err(D.lunarToSolar({ day: 1, month: 5, year: 2025, leap: true })),
    err(D.lunarToSolar({ day: 1, month: 3, year: 2026, leap: true })),
    err(D.solarToLunar({ day: 29, month: 2, year: 2023 })),
    err(D.solarToLunar({ day: 1, month: 1, year: 1911 })),
    err(D.lunarToSolar({ day: 0, month: 1, year: 2026 })),
    err(D.lunarToSolar({ day: 1, month: 13, year: 2026 })),
    err(D.solarToLunar({ day: '7', month: 10, year: 2026 })),
    err(D.lunarToSolar({ day: 15, month: 12, year: 2100 })),
  ], [
    'NO_SUCH_LUNAR_DAY: Tháng Hai năm âm lịch 2026 chỉ có 29 ngày.',
    'NO_SUCH_LEAP_MONTH: Năm âm lịch 2025 không nhuận tháng Năm; năm đó nhuận tháng Sáu.',
    'NO_SUCH_LEAP_MONTH: Năm âm lịch 2026 không có tháng nhuận.',
    'NO_SUCH_SOLAR_DATE: Dương lịch không có ngày 29/2/2023.',
    'OUT_OF_RANGE: Chỉ đổi được ngày dương lịch từ năm 1912 đến năm 2100.',
    'INVALID_INPUT: Ngày âm lịch phải từ 1 đến 30.',
    'INVALID_INPUT: Tháng âm lịch phải từ 1 đến 12.',
    'INVALID_INPUT: Hãy nhập ngày, tháng, năm dương lịch bằng số.',
    'OUT_OF_RANGE: Ngày này rơi vào năm dương lịch 2101, ngoài khoảng 1912–2100.',
  ]);
  eq('Đầu vào lạ không làm hỏng hàm: opts là null, tháng nhuận ghi bằng chuỗi, miền không rõ khi tra năm 1968',
    [D.solarToLunar({ day: 7, month: 10, year: 2026 }, null).ok, D.lunarToSolar({ day: 1, month: 1, year: 2026 }, null).ok,
      err(D.lunarToSolar({ day: 1, month: 6, year: 2025, leap: 'false' })), D.lunarYearInfo(1968, { region: 'unknown' }).flags, D.lunarYearInfo(2026, { region: 'unknown' }).flags],
    [true, true, 'INVALID_INPUT: Mục "tháng nhuận" phải là đúng hoặc sai.', ['REGION_DIFFERS'], []]);
  eq('Mùng Một có điểm sóc ngay trước nửa đêm: câu báo nói "ngày cuối của tháng trước", không nói ngày âm nhỏ hơn',
    [/ngày cuối của tháng trước/.test(D.solarToLunar({ day: 21, month: 4, year: 2031 }).notes.join(' ')), /nhỏ hơn một ngày/.test(D.solarToLunar({ day: 22, month: 4, year: 2031 }).notes.join(' '))], [true, true]);
  eq('Năm ngoài 1929–2100 mang cờ ngoài vùng đối chiếu; ngày trong vùng không mang cờ',
    [D.solarToLunar({ day: 1, month: 6, year: 1920 }).flags.includes('OUT_OF_VERIFIED_RANGE'), D.solarToLunar({ day: 7, month: 10, year: 2026 }).flags.length], [true, 0]);
  console.log(`ℹ️  Số ngày 1912–2100 (miền Bắc) mang cờ ranh giới: ${flagged}`);
}

// Bảng tiết khí (js/core/solar-terms.js): ngày chứa tiết khí theo giờ Việt Nam (14.2 dòng 14); cảnh báo trăng non sát nửa đêm
{
  const { generate } = await import(pathToFileURL(path.join(root, 'tools/astro/build_solar_terms.mjs')).href);
  eq('solar-terms.js đúng là kết quả sinh lại từ bảng astro_events đã đóng băng',
    readFileSync(path.join(root, 'js/core/solar-terms.js'), 'utf8').replace(/\r\n/g, '\n') === generate(), true);
  const C = NT.calendar;
  const iso = (d, m, y) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const scan = (tz, yFrom, yTo) => {
    let terms = 0; const diff = []; const perYear = new Map();
    for (let jd = C.jdFromDate(1, 1, yFrom); jd <= C.jdFromDate(31, 12, yTo); jd++) {
      const [d, m, y] = C.jdToDate(jd);
      const st = C.solarTermOn(d, m, y, tz);
      const lib = Solar.fromYmd(y, m, d).getLunar().getJieQi();
      if (st) { terms++; perYear.set(y, (perYear.get(y) || 0) + 1); }
      if ((st ? st.key : '') !== lib) diff.push({ date: iso(d, m, y), st });
    }
    return { terms, diff, years: [...perYear.values()].every((v) => v === 24) };
  };
  // Đối chiếu độc lập: ở UTC+8 thư viện lịch phải cho cùng ngày, trừ Xuân phân 2084 (31 giây sau nửa đêm, hai bên ngoại suy ΔT khác nhau)
  const at8 = scan(8, 1912, 2100);
  eq('Ngày chứa tiết khí theo UTC+8 trùng thư viện lịch 1912–2100, trừ Xuân phân 2084 rơi 31 giây sau nửa đêm',
    [at8.terms, at8.years, at8.diff.map((x) => x.date)], [4536, true, ['2084-03-19', '2084-03-20']]);
  // Theo giờ Việt Nam: chỉ khác thư viện (giờ UTC+8) ở tiết khí rơi vào giờ cuối cùng của ngày
  const at7 = scan(7, 1976, 2100);
  const moved = at7.diff.filter((x) => x.st);
  eq('Ngày chứa tiết khí theo giờ Việt Nam 1976–2100: đủ 24 tiết mỗi năm; 129 tiết khác ngày với thư viện, đều rơi trong giờ cuối của ngày',
    [at7.terms, at7.years, at7.diff.length, moved.length, moved.every((x) => x.st.boundarySeconds < 0 && x.st.boundarySeconds >= -3600 - 95)],
    [3000, true, 258, 129, true]);
  eq('Lập hạ 2031 rơi 23:35 ngày 05/05 theo giờ Việt Nam: phần chọn ngày và bộ đổi ngày ghi tiết khí ở ngày 05/05, không ở 06/05',
    [NT.scoring.describeDay(NT.scoring.dayContext(2031, 5, 5)).jieqi, NT.scoring.describeDay(NT.scoring.dayContext(2031, 5, 6)).jieqi,
      NT.dateConvert.solarToLunar({ day: 5, month: 5, year: 2031 }).solarTerm.name, NT.dateConvert.solarToLunar({ day: 6, month: 5, year: 2031 }).solarTerm],
    ['Lập Hạ', '', 'Lập Hạ', null]);
  eq('Năm ngoài bảng tiết khí: hàm trả undefined để nơi gọi dùng nguồn khác', [C.solarTermOn(1, 1, 1900), C.solarTermOn(15, 6, 2026)], [undefined, null]);
  // Sổ giỗ: lần giỗ tới rơi vào tháng có trăng non sát nửa đêm thì kèm ghi chú; tháng thường thì không
  const AN = NT.anniversary;
  const risky = AN.calculateAnniversaryReminders({ lunarDay: 10, lunarMonth: 10, deceasedName: 'A' }, new Date(2077, 10, 1));
  const normal = AN.calculateAnniversaryReminders({ lunarDay: 10, lunarMonth: 10, deceasedName: 'A' }, new Date(2026, 9, 7));
  eq('Sổ giỗ: giỗ 10 tháng Mười năm 2077 (trăng non 62 giây sau nửa đêm) có ghi chú; năm 2026 không có',
    [`${risky.nextSolarDate.solarDay}/${risky.nextSolarDate.solarMonth}/${risky.nextSolarDate.solarYear}`, /^Trăng non mở đầu tháng âm này rơi sau nửa đêm chỉ 62 giây/.test(risky.boundaryNote), normal.boundaryNote],
    ['25/11/2077', true, '']);
}

// Đối chiếu với sách in: Đại Quốc Siêu, "Nguyên lý chọn ngày theo Bát tự", NXB Văn hóa – Thông tin, nộp lưu chiểu 2009
// (giấy phép 1098-2008/CXB/48/02-179/VHTT). Nguồn thứ cấp, không phải sách gốc; dùng làm dữ liệu đối chiếu cho phép đổi ngày và lá số.
{
  const D = NT.dateConvert;
  // Ngày dương của mùng Một từng tháng âm trong bảng lịch của sách (tr. 86–175); [năm âm, tháng, nhuận, ngày dương, can chi ngày nếu sách ghi]
  const BOOK = [
    [2009, 1, false, '26/01/2009', 'Tân Mùi'], [2009, 5, true, '23/06/2009'], [2009, 8, false, '19/09/2009'],
    [2010, 1, false, '14/02/2010', 'Ất Mùi'], [2010, 2, false, '16/03/2010'], [2010, 3, false, '14/04/2010'], [2010, 4, false, '14/05/2010'], [2010, 5, false, '12/06/2010'], [2010, 6, false, '12/07/2010'],
    [2011, 1, false, '03/02/2011', 'Kỷ Sửu'], [2011, 2, false, '05/03/2011'], [2011, 3, false, '03/04/2011'], [2011, 4, false, '03/05/2011'], [2011, 5, false, '02/06/2011'], [2011, 6, false, '01/07/2011'],
    [2011, 7, false, '31/07/2011'], [2011, 8, false, '29/08/2011'], [2011, 9, false, '27/09/2011'], [2011, 10, false, '27/10/2011'], [2011, 11, false, '25/11/2011'], [2011, 12, false, '25/12/2011'],
    [2012, 1, false, '23/01/2012', 'Quý Mùi'], [2012, 2, false, '22/02/2012'], [2012, 3, false, '22/03/2012'], [2012, 4, false, '21/04/2012'], [2012, 4, true, '21/05/2012'], [2012, 5, false, '19/06/2012'],
    [2012, 6, false, '19/07/2012'], [2012, 7, false, '17/08/2012'], [2012, 8, false, '16/09/2012'], [2012, 9, false, '15/10/2012'], [2012, 10, false, '14/11/2012'], [2012, 11, false, '13/12/2012'], [2012, 12, false, '12/01/2013'],
  ];
  const bad = BOOK.filter(([y, m, leap, solar, cc]) => {
    const r = D.lunarToSolar({ day: 1, month: m, year: y, leap });
    return !r.ok || r.solar.text !== solar || (cc && r.canChi.day !== cc);
  }).map((x) => x.slice(0, 3).join('/'));
  eq('Sách in 2009 (Đại Quốc Siêu): 34 mốc mùng Một tháng âm 2009–2012, gồm nhuận tháng 5 năm 2009 và nhuận tháng 4 năm 2012, khớp bộ đổi ngày', [BOOK.length, bad], [34, []]);
  const r1931 = D.solarToLunar({ day: 8, month: 3, year: 1931 });
  const chart = NT.bazi.buildChart({ birthDate: '2009-01-26', birthTime: '06:00', gender: 'male', lon: 105.85, useTrueSolar: false });
  const gz = (k) => NT.data.ganZhiVi(chart.pillars[k].g, chart.pillars[k].z);
  // Sách tr. 85 ghi năm Kỷ Sửu, tháng Bính Dần cho ví dụ này (đổi theo Tết và mùng Một), trái với quy tắc chính sách nêu ở tr. 14–15
  // (năm đổi ở Lập xuân, tháng đổi ở tiết khí); ứng dụng theo quy tắc đó nên ra Mậu Tý, Ất Sửu.
  eq('Ví dụ trong sách: 08/03/1931 = 20 tháng Giêng Tân Mùi, ngày Nhâm Tuất; 06:00 ngày 26/01/2009 có trụ ngày Tân Mùi, trụ giờ Tân Mão, trụ năm và tháng theo Lập xuân là Mậu Tý, Ất Sửu',
    [r1931.lunar.day, r1931.lunar.month, r1931.lunar.yearName, r1931.canChi.day, gz('day'), gz('hour'), gz('year'), gz('month')],
    [20, 1, 'Tân Mùi', 'Nhâm Tuất', 'Tân Mùi', 'Tân Mão', 'Mậu Tý', 'Ất Sửu']);
}

// ---------- Tháng tiết khí theo giờ Việt Nam (14.2 dòng 14) ----------
{
  const C = NT.calendar;
  const adjusted = [], mism = [], late = [];
  for (let t = Date.UTC(2020, 0, 1); t <= Date.UTC(2032, 11, 31); t += 864e5) {
    const dt = new Date(t), y = dt.getUTCFullYear(), m = dt.getUTCMonth() + 1, d = dt.getUTCDate();
    const a = C.dayAlmanac(d, m, y), L = a.lunar;
    if (a.adjusted) {
      adjusted.push(`${d}/${m}/${y}`);
      // Thư viện đổi tháng ở ngày hôm sau (ngày tiết theo UTC+8)
      const n = new Date(t + 864e5), L2 = Solar.fromYmd(n.getUTCFullYear(), n.getUTCMonth() + 1, n.getUTCDate()).getLunar();
      if (!C.solarTermOn(d, m, y) || L2.getMonthZhiIndex() !== a.monthZhiIndex) late.push(`${d}/${m}/${y}`);
      continue;
    }
    const lib = [L.getMonthGanIndex(), L.getMonthZhiIndex(), L.getYearInGanZhiByLiChun(), L.getDayYi(), L.getDayJi(), L.getDayJiShen(), L.getDayXiongSha(), L.getZhiXing(), L.getDayTianShen(), L.getDayTianShenLuck()];
    const ours = [a.monthGanIndex, a.monthZhiIndex, a.yearGanZhi, a.yi, a.ji, a.jiShen, a.xiongSha, a.zhiXing, a.tianShen, a.tianShenLuck];
    if (JSON.stringify(lib) !== JSON.stringify(ours)) mism.push(`${d}/${m}/${y}`);
  }
  eq('2020–2032: ngày không có tiết rơi sát nửa đêm thì can chi tháng, trực, thần nhật, nghi/kỵ, thần sát trùng thư viện; chỉ 5 ngày tiết rơi trong giờ cuối theo giờ Việt Nam được đổi tháng sớm một ngày',
    [mism, adjusted, late], [[], ['6/12/2020', '5/6/2022', '7/11/2023', '5/5/2031', '7/8/2031'], []]);
  const a = C.dayAlmanac(5, 5, 2031), g = C.solarToGanZhi(5, 5, 2031), ctx = NT.scoring.dayContext(2031, 5, 5);
  eq('Lập hạ 2031 (23:35 ngày 05/05 giờ Việt Nam): ngày 05/05 đã sang tháng Quý Tỵ, trực Kiến, thần Câu Trận (thư viện theo UTC+8 còn tháng Nhâm Thìn)',
    [a.lunar.getMonthInGanZhi(), g.mCan + ' ' + g.mChi, a.zhiXing, a.tianShen, a.tianShenType, ctx && [ctx.zhixing, ctx.tianShen, ctx.jieqi]], ['壬辰', 'Quý Tỵ', '建', '勾陈', '黑道', ['建', '勾陈', '立夏']]);
  const y85 = C.solarToGanZhi(1, 2, 1985), y07 = C.solarToGanZhi(10, 2, 2007);
  eq('Năm can chi của ngày theo Tết Việt Nam: 01/02/1985 thuộc năm Ất Sửu (Tết Việt 21/01, Tết Trung Quốc 20/02); 10/02/2007 còn năm Bính Tuất (Tết Việt 17/02)',
    [y85.yCan + ' ' + y85.yChi, y07.yCan + ' ' + y07.yChi], ['Ất Sửu', 'Bính Tuất']);
}

// Tháng tiết khí: phép so trên cả khoảng năm (bổ sung cho khối 2020–2032 ở trên)
{
  const C = NT.calendar;
  // Đối chiếu độc lập: ở UTC+8 thư viện lịch đổi tháng theo ngày tiết của chính nó, nên phải trùng ở mọi ngày
  let days = 0, at8 = 0;
  const vnDiff = [], vnExpected = [];
  for (let jd = C.jdFromDate(1, 1, 1912); jd <= C.jdFromDate(31, 12, 2100); jd++) {
    const [d, m, y] = C.jdToDate(jd);
    const L = Solar.fromYmd(y, m, d).getLunar();
    const lib = [L.getMonthGanIndex(), L.getMonthZhiIndex(), L.getYearGanIndexByLiChun(), L.getYearZhiIndexByLiChun()];
    const same = (p) => p.ganIndex === lib[0] && p.zhiIndex === lib[1] && p.yearGanIndex === lib[2] && p.yearZhiIndex === lib[3];
    days++;
    if (!same(C.monthPillar(d, m, y, 8))) at8++;
    if (y >= 1976) {
      if (!same(C.monthPillar(d, m, y))) vnDiff.push(jd);
      const st = C.solarTermOn(d, m, y);
      if (st && st.index % 2 === 1 && st.boundarySeconds < 0 && st.boundarySeconds >= -3600) vnExpected.push(jd);
    }
  }
  eq('Can chi tháng tiết khí và năm theo Lập xuân ở UTC+8 trùng thư viện lịch ở mọi ngày 1912–2100', [days, at8], [69032, 0]);
  console.log(`ℹ️  1976–2100: ${vnDiff.length} ngày có tháng tiết khí theo giờ Việt Nam khác thư viện lịch`);
  eq('Giờ Việt Nam 1976–2100: tháng tiết khí khác thư viện đúng ở các ngày chứa một trong 12 tiết rơi trong giờ cuối của ngày, không thừa không thiếu',
    [vnDiff.length > 0, JSON.stringify(vnDiff) === JSON.stringify(vnExpected)], [true, true]);
  // PRD 13.3: năm tiết rơi 00:00–01:00 giờ Bắc Kinh trong 2024–2040 — theo giờ Việt Nam tháng mới bắt đầu từ hôm trước
  const cases = [[5, 5, 2031, 5], [7, 8, 2031, 8], [7, 10, 2036, 10], [4, 4, 2038, 4], [7, 10, 2040, 10]];
  eq('Năm ca tiết rơi 00:00–01:00 giờ Bắc Kinh (2024–2040, PRD 13.3): ngày hôm trước theo giờ Việt Nam đã sang tháng mới, thư viện lịch thì chưa',
    cases.map(([d, m, y, z]) => [C.dayAlmanac(d, m, y).monthZhiIndex === z, Solar.fromYmd(y, m, d).getLunar().getMonthZhiIndex() === (z + 11) % 12, C.dayAlmanac(d + 1, m, y).monthZhiIndex === z]),
    cases.map(() => [true, true, true]));
}

// Sai số ΔT theo năm và cờ ranh giới cho trung khí (PRD 5.3)
{
  const C = NT.calendar, D = NT.dateConvert;
  const { sigmaDeltaT, riskWindow } = await import(pathToFileURL(path.join(root, 'tools/astro/lunar-from-astro.mjs')).href);
  let same = true, window600 = true;
  for (let y = 1799; y <= 2200; y++) { if (sigmaDeltaT(y) !== C.deltaTSigma(y)) same = false; if (riskWindow(y) !== 600) window600 = false; }
  eq('σ_ΔT: bản của lõi trùng bản của công cụ sinh bảng 1799–2200; năm 2100 khoảng 48 giây; năm 3000 khoảng 1.885 giây như bảng của Espenak và Meeus',
    [same, Math.round(C.deltaTSigma(2100)), Math.round(sigmaDeltaT(3000))], [true, 48, 1885]);
  eq('Cửa sổ rủi ro max(10 phút, 3σ_ΔT) bằng 10 phút ở mọi năm 1799–2200 (3σ_ΔT năm 2200 khoảng 431 giây)', [window600, Math.round(3 * C.deltaTSigma(2200))], [true, 431]);
  const zq = (k) => [...new Set(NT.lunarMonths.tables[k].zqRisk.map((r) => `${r[5]}:${r[1]}`))];
  eq('Trung khí sát nửa đêm làm đổi tên tháng: giờ Bắc Kinh 1917, 1922, 1984–1985, 1987; UTC+8 1987; UTC+7 1938',
    [zq('bj'), zq('8'), zq('7')], [['1917:181', '1922:317', '1984:509', '1985:509', '1987:-270'], ['1987:590'], ['1938:-33']]);
  const n1917 = D.solarToLunar({ day: 20, month: 4, year: 1917 }), n1922 = D.solarToLunar({ day: 15, month: 8, year: 1922 });
  eq('Bộ đổi ngày: 20/04/1917 và 15/08/1922 (lịch theo giờ Bắc Kinh) có cờ và ghi chú trung khí kèm tên tháng nếu lệch',
    [n1917.lunar.text, n1917.flags.includes('BOUNDARY_RISK'), n1917.notes.some((n) => n.startsWith('Trung khí Cốc Vũ rơi sau nửa đêm chỉ 181 giây') && n.includes('tháng này là tháng Ba;')),
      n1922.lunar.text, n1922.notes.some((n) => n.startsWith('Trung khí Đại Thử') && n.includes('tháng Sáu nhuận'))],
    ['ngày 29 tháng Hai nhuận năm Đinh Tỵ (1917)', true, true, 'ngày 23 tháng Sáu năm Nhâm Tuất (1922)', true]);
  eq('Thu phân 2033 rơi 499 giây trước nửa đêm giờ Việt Nam nhưng không đổi tên tháng nào: không gắn cờ',
    D.solarToLunar({ day: 15, month: 10, year: 2033 }).flags, []);
  const has = (d, m, y) => D.solarToLunar({ day: d, month: m, year: y }).notes.some((n) => n.includes('chưa thể khẳng định'));
  eq('Ghi chú "chưa thể khẳng định" khi khoảng cách nhỏ hơn 3σ_ΔT: có ở 09/12/2072 (14 giây, 3σ ≈ 85) và 16/11/2077 (62 giây, 3σ ≈ 94); không có ở 21/04/2031 (174 giây, 3σ ≈ 20)',
    [has(9, 12, 2072), has(16, 11, 2077), has(21, 4, 2031)], [true, true, false]);
}

// ---------- Việc Nhậm chức CAREER_POST (PRD PK-02: 赴任, Người đi, cố định hoặc linh hoạt) ----------
{
  const S = NT.scoring, A = NT.activities;
  const post = A.byId('career_post');
  eq('Nhậm chức: có trong danh sách (một lần), nhóm PK-02, từ khóa chính 赴任, không phải việc chỉ-cố-định',
    [!!post, post?.pk, post?.yiPrimary, !!post?.fixedOnly, A.ACTIVITIES.filter((a) => a.id === 'career_post').length], [true, 'PK-02', ['赴任'], false, 1]);
  eq('Nhậm chức: chủ thể là một người (Người đi) như xuất hành/thi cử; giờ tốt = giờ nhận chức',
    [A.subjectOf(post), A.subjectOf(A.byId('travel_biz')), A.subjectOf(A.byId('career_fixed')), A.hourMeaningOf(post)], ['person', 'person', 'person', 'nhận chức, bắt đầu làm việc']);
  const vocab = new Set();
  for (let m = 1; m <= 12; m++) for (let d = 1; d <= 28; d++) { const l = Solar.fromYmd(2025, m, d).getLunar(); l.getDayYi().forEach((k) => vocab.add(k)); l.getDayJi().forEach((k) => vocab.add(k)); }
  eq('Từ khóa 赴任 có trong từ vựng nghi/kỵ của lunar.js; mọi từ khóa của việc đều trong từ vựng',
    [vocab.has('赴任'), [...post.yiPrimary, ...post.yi].filter((k) => !vocab.has(k))], [true, []]);
  const flex = S.findDays({ chart, act: post, nameInfo: null, from: '2026-11-01', to: '2026-11-30', mode: 'best' });
  eq('Nhậm chức, chế độ linh hoạt, tháng 11/2026: đủ 30 ngày được chấm, có ngày đề xuất, ngày đề xuất đều có giờ hoàng đạo',
    [flex.days.length, flex.ranked.length > 0, flex.ranked.every((d) => d.bestHours.length > 0)], [30, true, true]);
  const fx = S.findDays({ chart, act: post, nameInfo: null, from: '2026-11-10', to: '2026-11-10', mode: 'fixed', fixedTime: '09:00' });
  eq('Nhậm chức, chế độ cố định một ngày: ra đúng 1 ngày với giờ đã chọn 09:00', [fx.days.length, fx.days[0]?.chosen?.label], [1, '09:00']);
  let blocked = '';
  try { S.findDays({ chart, act: A.byId('career_fixed'), nameInfo: null, from: '2026-11-01', to: '2026-11-30', mode: 'fixed', fixedTime: '09:00' }); } catch (e) { blocked = e.message; }
  eq('Việc chỉ-cố-định (career_fixed) chặn quét khoảng ngày', /chỉ xem thông tin/.test(blocked), true);
  console.log('   (số ngày đề xuất nhậm chức 11/2026, linh hoạt: ' + flex.ranked.length + '/' + flex.days.length + ' ngày)');
}

// Văn khấn: ngày âm khi mở từ kho, ngày lễ ở tháng nhuận (docs 14.2 dòng 46)
{
  const P = NT.prayers;
  const badge = (o, id) => P.filterPrayers(o).find((p) => p.id === id)?.priorityBadge ?? null;

  // 08/08/2025 = 15 tháng 6 nhuận; tháng luôn dương, nhuận có cờ riêng
  eq('lunarContextForDate: 08/08/2025 = 15 tháng 6 nhuận, tháng dương (không âm như thư viện gốc)',
    ((c) => [c.day, c.month, c.leap, c.monthText])(P.lunarContextForDate(new Date(2025, 7, 8))), [15, 6, true, '6 nhuận']);
  eq('renderPrayer điền ngày âm tháng nhuận: "15 tháng 6 nhuận"',
    P.renderPrayer(P.PRAYERS.find((p) => p.content.includes('{{NGAY_AM}}')).id, {}, { lunarDay: 15, lunarMonth: '6 nhuận' }).renderedText.includes('15 tháng 6 nhuận'), true);

  // Lễ âm lịch cố định tính ở tháng thường, không lặp ở tháng nhuận; mùng Một và rằm hằng tháng thì tháng nhuận vẫn có
  eq('Trung Thu (rằm tháng 8): 10/8 thường còn 5 ngày có gợi ý; 10/8 nhuận thì KHÔNG (lễ đã qua ở tháng thường)',
    [badge({ currentLunarDay: 10, currentLunarMonth: 8 }, 'vk_trung_thu'), badge({ currentLunarDay: 10, currentLunarMonth: 8, currentLunarLeap: true }, 'vk_trung_thu')],
    ['🔥 Sắp đến dịp (còn 5 ngày)', null]);
  eq('Cuối tháng 4 nhuận (29/4 nhuận) vẫn gợi ý lễ Đoan Ngọ (5/5) sắp tới',
    badge({ currentLunarDay: 29, currentLunarMonth: 4, currentLunarLeap: true }, 'vk_doan_ngo'), '🔥 Sắp đến dịp (còn 6 ngày)');
  const socVong = (o) => P.filterPrayers(o).filter((p) => p.category === 'tuan_tiet').map((p) => p.priorityBadge);
  eq('Tháng nhuận vẫn có tuần Sóc Vọng (rằm 15/7 nhuận, mùng Một 1/7 nhuận); ngày thường trong tháng nhuận thì không',
    [socVong({ currentLunarDay: 15, currentLunarMonth: 7, currentLunarLeap: true }).every((b) => /Tuần Vọng/.test(b)),
      socVong({ currentLunarDay: 1, currentLunarMonth: 7, currentLunarLeap: true }).every((b) => /Tuần Sóc/.test(b)),
      socVong({ currentLunarDay: 10, currentLunarMonth: 7, currentLunarLeap: true }).every((b) => b == null)],
    [true, true, true]);
  const gioX = { lunarDay: 12, lunarMonth: 7, deceasedName: 'X' };
  eq('Giỗ ghi ở tháng thường 7: sắp đến khi 10/7 thường, không báo khi 10/7 nhuận; giỗ ghi ở tháng 7 nhuận thì báo ở 10/7 nhuận',
    [badge({ currentLunarDay: 10, currentLunarMonth: 7, upcomingAnniversaries: [gioX] }, 'vk_gio_thuong') !== null,
      badge({ currentLunarDay: 10, currentLunarMonth: 7, currentLunarLeap: true, upcomingAnniversaries: [gioX] }, 'vk_gio_thuong'),
      badge({ currentLunarDay: 10, currentLunarMonth: 7, currentLunarLeap: true, upcomingAnniversaries: [{ ...gioX, isLeapMonth: true }] }, 'vk_gio_thuong') !== null],
    [true, null, true]);
}

// Màn hình văn khấn chạy với DOM giả: mở từ kho điền ngày âm; ẩn tab rồi quay lại xin lại khóa sáng màn hình; mọi cách đóng đều dọn
{
  const docL = new Set();
  const els = new Map();
  const mk = (sel) => {
    const l = {};
    const el = {
      sel, value: '', textContent: '', innerHTML: '', style: {}, dataset: {}, open: false, checked: true, scrollTop: 0, clientHeight: 0, scrollHeight: 0,
      classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
      addEventListener(t, f) { (l[t] ??= new Set()).add(f); },
      removeEventListener(t, f) { l[t]?.delete(f); },
      fire(t) { for (const f of [...(l[t] ?? [])]) f({ target: el }); },
      setAttribute() {}, querySelector: () => null, querySelectorAll: () => [],
      showModal() { el.open = true; },
      close() { if (el.open) { el.open = false; el.fire('close'); } },
    };
    return el;
  };
  let wakeReq = 0, wakeRel = 0;
  const sentinels = [];
  const fakeDoc = {
    visibilityState: 'visible',
    // Trang thật không có nút in và chip tốc độ: giả lập thiếu phần tử để chắc mã không nổ
    querySelector: (s) => (s === '#btn-print-prayer' || s === '.speed-chip' ? null : (els.get(s) ?? (els.set(s, mk(s)), els.get(s)))),
    querySelectorAll: () => [],
    addEventListener(t, f) { if (t === 'visibilitychange') docL.add(f); },
    removeEventListener(t, f) { if (t === 'visibilitychange') docL.delete(f); },
    hide() { fakeDoc.visibilityState = 'hidden'; for (const f of [...docL]) f(); },
    show() { fakeDoc.visibilityState = 'visible'; for (const f of [...docL]) f(); },
  };
  const fakeNav = { wakeLock: { request: async () => {
    wakeReq++;
    const s = { released: false, release() { s.released = true; wakeRel++; return Promise.resolve(); }, addEventListener(t, f) { s.onRelease = f; } };
    sentinels.push(s);
    return s;
  } } };
  const oldNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  Object.defineProperty(globalThis, 'document', { value: fakeDoc, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'navigator', { value: fakeNav, configurable: true, writable: true });
  const tick = () => new Promise((r) => setTimeout(r, 0));
  try {
    vm.runInThisContext(readFileSync(path.join(root, 'js/ui/prayers-ui.js'), 'utf8'), { filename: 'prayers-ui.js' });
    const UI = NT.prayersUI;
    await UI.init();
    const dlg = fakeDoc.querySelector('#prayer-dialog');
    const view = fakeDoc.querySelector('#prayer-text-view');
    const withDate = NT.prayers.PRAYERS.find((p) => p.content.includes('{{NGAY_AM}}')).id;

    // 1. Mở từ kho (không kèm ngày) → ngày âm hôm nay; mở từ Sổ giỗ (có ngày) → giữ ngày được truyền
    const t = NT.prayers.lunarContextForDate(new Date());
    await UI.openPrayerModal(withDate, 'text');
    await tick();
    eq('Mở bài từ kho: điền ngày âm hôm nay, không còn "[Ngày âm]"/"[Tháng âm]"',
      [view.innerHTML.includes(`ngày ${t.day} tháng ${t.monthText} âm lịch`), /\[Ngày âm\]|\[Tháng âm\]/.test(view.innerHTML)], [true, false]);
    dlg.close();
    await UI.openPrayerModal(withDate, 'text', { lunarDay: 7, lunarMonth: 3 });
    eq('Mở bài từ Sổ giỗ/lịch tháng kèm ngày: giữ đúng ngày được truyền', view.innerHTML.includes('ngày 7 tháng 3 âm lịch'), true);
    dlg.close();
    await tick();

    // 2. Khóa sáng màn hình
    const w0 = wakeReq, r0 = wakeRel, s0 = sentinels.length;
    await UI.openPrayerModal(withDate, 'text');
    await tick();
    eq('Mở bài: xin khóa 1 lần, có 1 trình nghe visibilitychange', [wakeReq - w0, docL.size], [1, 1]);
    fakeDoc.hide();
    await tick();
    eq('Ẩn tab: chưa xin thêm', wakeReq - w0, 1);
    sentinels[s0].released = true; sentinels[s0].onRelease?.(); // trình duyệt tự nhả khóa khi tab bị ẩn
    fakeDoc.show();
    await tick();
    eq('Quay lại tab khi bài còn mở: xin lại khóa (lần 2), khóa mới đang giữ', [wakeReq - w0, sentinels[s0 + 1].released], [2, false]);
    fakeDoc.show();
    await tick();
    eq('Quay lại tab khi đang giữ khóa: không xin chồng', wakeReq - w0, 2);
    dlg.close(); // cùng đường với phím Esc và bấm ra ngoài
    await tick();
    eq('Đóng bài: trả khóa, gỡ trình nghe visibilitychange', [sentinels[s0 + 1].released, wakeRel - r0 >= 1, docL.size], [true, true, 0]);
    fakeDoc.hide(); fakeDoc.show();
    await tick();
    eq('Sau khi đóng bài, ẩn/hiện tab không xin khóa nữa', wakeReq - w0, 2);

    // 3. Mở lại liên tiếp không nhân đôi trình nghe
    await UI.openPrayerModal(withDate, 'text');
    await UI.openPrayerModal(withDate, 'text');
    eq('Mở bài lại: vẫn chỉ 1 trình nghe visibilitychange', docL.size, 1);
    dlg.close();
    await tick();
  } finally {
    delete globalThis.document;
    if (oldNav) Object.defineProperty(globalThis, 'navigator', oldNav); else delete globalThis.navigator;
  }
}

// ---------- 14.2 dòng 19: hiệu năng quét 1 năm ----------
{
  const S = NT.scoring, V = NT.vi, act = NT.activities.byId('wed_main');
  // Mục giờ tính thẳng theo can chi ngày + giờ:phút (có cache), không dựng Lunar từng giờ: phải trùng thư viện ở mọi mốc,
  // kể cả Tý muộn 23:00–23:59 (can chi ngày "exact" sang hôm sau) và giờ lẻ ở biên khung giờ
  const keys = [...act.yiPrimary, ...act.yi];
  const yiJiText = (l) => {
    const yi = keys.filter((k) => l.getTimeYi().includes(k)), ji = keys.filter((k) => l.getTimeJi().includes(k));
    return [...(yi.length ? [`Giờ nên: ${yi.slice(0, 2).map(V.yiji).join(', ')}`] : []), ...(ji.length ? [`Giờ kỵ: ${ji.slice(0, 2).map(V.yiji).join(', ')}`] : [])];
  };
  const times = [...NT.data.HOUR_SLOTS.map((s) => s.rep), [9, 0], [23, 0], [23, 59], [0, 0], [10, 59], [11, 0]];
  const mism = [];
  for (let t = Date.UTC(2031, 0, 1), k = 0; k < 60; k++, t += 864e5) {
    const dt = new Date(t), ctx = S.dayContext(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    for (const [hh, mi] of times) {
      const h = S.scoreHour(ctx, chart, act, hh, mi);
      const l = Solar.fromYmdHms(ctx.y, ctx.m, ctx.d, hh, mi, 0).getLunar();
      const ok = h.g === l.getTimeGanIndex() && h.z === l.getTimeZhiIndex() && h.tianShen === V.tianshen(l.getTimeTianShen())
        && h.huangDao === (l.getTimeTianShenLuck() === '吉') && JSON.stringify(h.items.filter((i) => /^Giờ (nên|kỵ):/.test(i.text)).map((i) => i.text)) === JSON.stringify(yiJiText(l));
      if (!ok) mism.push(`${ctx.key} ${hh}:${mi}`);
    }
  }
  eq('Giờ tính thẳng không dựng Lunar từng giờ: can chi giờ, thần, hoàng/hắc đạo, nghi/kỵ của giờ trùng thư viện ở 60 can chi ngày × 19 mốc giờ', mism, []);
  const t0 = performance.now();
  const yr = S.findDays({ chart, act, nameInfo: n, from: '2033-01-01', to: '2033-12-31', mode: 'best' });
  console.log(`ℹ️  Quét 1 năm (cưới hỏi, 2033, chọn giờ tốt nhất): ${yr.days.length} ngày trong ${Math.round(performance.now() - t0)} ms (thông tin, không chấm đạt/không đạt)`);
}

// Văn khấn: bảng ngày lễ trỏ đúng mã bài; việc thi cử theo PRD (CAREER_FIXED); tên năm âm của bài khấn
{
  const P = NT.prayers, A = NT.activities;
  const badge = (o, id) => P.filterPrayers(o).find((p) => p.id === id)?.priorityBadge ?? null;
  eq('Ngày 10/7 âm: Vu Lan và Cúng chúng sinh (rằm tháng 7) có gợi ý; ngày 01/3 âm: Hàn Thực (mùng 3 tháng 3) có gợi ý',
    [badge({ currentLunarDay: 10, currentLunarMonth: 7 }, 'vk_vu_lan_bao_hieu'), badge({ currentLunarDay: 10, currentLunarMonth: 7 }, 'vk_xa_toi_vong_nhan'), badge({ currentLunarDay: 1, currentLunarMonth: 3 }, 'vk_han_thuc')],
    ['🔥 Sắp đến dịp (còn 5 ngày)', '🔥 Sắp đến dịp (còn 5 ngày)', '🔥 Sắp đến dịp (còn 2 ngày)']);
  const cf = A.byId('career_fixed');
  eq('career_fixed là thi cử, phỏng vấn (PRD PK-02 CAREER_FIXED): không có từ khóa nghi/kỵ, chỉ xem ngày đã định; chỉ còn một việc mang nhãn "Nhậm chức"',
    [cf.label, cf.yiPrimary.length + cf.yi.length, cf.fixedOnly, A.ACTIVITIES.filter((a) => /Nhậm chức/.test(a.label)).map((a) => a.id)],
    ['Thi cử, phỏng vấn (ngày đã định)', 0, true, ['career_post']]);
  const g = NT.calendar.solarToGanZhi(10, 1, 2026);
  eq('Tên năm âm cho bài khấn lấy theo Tết Việt Nam: 10/01/2026 còn năm Ất Tỵ', `${g.yCan} ${g.yChi}`, 'Ất Tỵ');
}

// Văn khấn: khoảng cách tới lễ và giỗ khi năm âm có tháng nhuận (lỗi do phản biện độc lập tìm ra, 14.2 dòng 55)
{
  const P = NT.prayers;
  const badge = (o, id) => P.filterPrayers(o).find((p) => p.id === id)?.priorityBadge ?? null;
  const c23 = P.lunarContextForDate(new Date(2023, 3, 15)), c25 = P.lunarContextForDate(new Date(2025, 6, 4));
  eq('Tháng nhuận của năm âm: 2023 nhuận tháng 2, 2025 nhuận tháng 6', [c23.yearLeapMonth, c25.yearLeapMonth], [2, 6]);
  eq('25/2 thường năm 2023 (sau đó còn tháng 2 nhuận): Giỗ Tổ 10/3 và Hàn Thực 3/3 còn hơn 15 ngày nên chưa gợi ý',
    [badge({ currentLunarDay: 25, currentLunarMonth: 2, currentLunarYearLeapMonth: 2 }, 'vk_gio_to_hung_vuong'), badge({ currentLunarDay: 25, currentLunarMonth: 2, currentLunarYearLeapMonth: 2 }, 'vk_han_thuc')],
    [null, null]);
  eq('25/2 nhuận năm 2023: Giỗ Tổ 10/3 còn 15 ngày', badge({ currentLunarDay: 25, currentLunarMonth: 2, currentLunarLeap: true, currentLunarYearLeapMonth: 2 }, 'vk_gio_to_hung_vuong'), '🔥 Sắp đến dịp (còn 15 ngày)');
  const anniv = [{ deceasedName: 'Ông A', lunarDay: 10, lunarMonth: 6, isLeap: true }];
  const gio = (o) => badge({ ...o, upcomingAnniversaries: anniv }, 'vk_gio_thuong');
  eq('Giỗ 10/6 nhuận năm 2025 (nhuận tháng 6): ngày 10/6 thường không báo "Hôm nay"; ngày 10/6 nhuận thì báo; năm không nhuận tháng 6 thì giỗ ở 10/6 thường',
    [/Hôm nay/.test(gio({ currentLunarDay: 10, currentLunarMonth: 6, currentLunarYearLeapMonth: 6 }) || ''),
      /Hôm nay/.test(gio({ currentLunarDay: 10, currentLunarMonth: 6, currentLunarLeap: true, currentLunarYearLeapMonth: 6 }) || ''),
      /Hôm nay/.test(gio({ currentLunarDay: 10, currentLunarMonth: 6, currentLunarYearLeapMonth: 0 }) || '')],
    [false, true, true]);
}

// Can chi tháng âm (PRD 6.4: lịch in Việt Nam ghi can chi theo tháng âm, giữ riêng với tháng tiết khí);
// tháng nhuận không gán can chi riêng (mặc định lunar_month_canchi_leap, PRD 6.5)
{
  const D = NT.dateConvert;
  const lm = (d, m, y) => D.solarToLunar({ day: d, month: m, year: y }).canChi.lunarMonth;
  eq('Can chi tháng âm: tháng Giêng Bính Ngọ (17/02/2026) Canh Dần; tháng Tám Bính Ngọ (07/10/2026) Đinh Dậu; tháng Ba Tân Hợi (20/04/2031) Nhâm Thìn; tháng Ba nhuận (21/04/2031) không có can chi riêng',
    [lm(17, 2, 2026), lm(7, 10, 2026), lm(20, 4, 2031), lm(21, 4, 2031)], ['Canh Dần', 'Đinh Dậu', 'Nhâm Thìn', null]);
  const g = NT.calendar.solarToGanZhi(5, 5, 2031);
  eq('05/05/2031: tháng âm là tháng Ba nhuận (không có can chi riêng), tháng tiết khí là Quý Tỵ — hai loại giữ riêng',
    [D.solarToLunar({ day: 5, month: 5, year: 2031 }).lunar.leap, lm(5, 5, 2031), `${g.mCan} ${g.mChi}`], [true, null, 'Quý Tỵ']);
}

// Văn khấn: Thanh minh theo tiết khí, không theo ngày âm cố định (14.2 dòng 55)
{
  const P = NT.prayers;
  const badge = (o, id) => P.filterPrayers(o).find((p) => p.id === id)?.priorityBadge ?? null;
  const c = P.lunarContextForDate(new Date(2026, 3, 1)), c2 = P.lunarContextForDate(new Date(2026, 4, 1));
  eq('01/04/2026: Thanh minh (05/04/2026 theo giờ Việt Nam) còn 4 ngày, có gợi ý dù ngày âm là 14 tháng 2; 01/05/2026 không gợi ý',
    [c.daysToTerm['清明'], badge({ currentLunarDay: c.day, currentLunarMonth: c.month, daysToTerm: c.daysToTerm }, 'vk_thanh_minh'),
      badge({ currentLunarDay: c2.day, currentLunarMonth: c2.month, daysToTerm: c2.daysToTerm }, 'vk_thanh_minh')],
    [4, '🔥 Sắp đến dịp (còn 4 ngày)', null]);
  eq('Ngày 5/3 âm (22/04/2026) không còn báo Thanh minh', badge({ currentLunarDay: 5, currentLunarMonth: 3, daysToTerm: P.lunarContextForDate(new Date(2026, 3, 22)).daysToTerm }, 'vk_thanh_minh'), null);
}

// Cờ BOUNDARY_RISK cho tiết đổi tháng sát nửa đêm (PRD 5.3: cửa sổ max(10 phút, 3σ_ΔT)): monthPillar, dayAlmanac.
// Phép đếm độc lập: quét từng ngày bằng solarTermOn, không dùng vòng tìm tiết của monthPillar.
{
  const C = NT.calendar;
  const terms = [];
  for (let t = Date.UTC(1976, 0, 1); t <= Date.UTC(2100, 11, 31); t += 864e5) {
    const x = new Date(t), d = x.getUTCDate(), m = x.getUTCMonth() + 1, y = x.getUTCFullYear();
    const st = C.solarTermOn(d, m, y, 7);
    if (st && st.index % 2 === 1 && Math.abs(st.boundarySeconds) < Math.max(600, 3 * C.deltaTSigma(y))) terms.push({ jd: C.jdFromDate(d, m, y), st });
  }
  // Ngày mang cờ: ngày chứa tiết nếu tiết ngay trước nửa đêm cuối ngày, ngày trước đó nếu tiết ngay sau nửa đêm đầu ngày
  const want = terms.map(({ jd, st }) => [st.boundarySeconds < 0 ? jd : jd - 1, st.boundarySeconds, st.index]);
  const got = [];
  for (let jd = C.jdFromDate(1, 1, 1976); jd <= C.jdFromDate(31, 12, 2100); jd++) {
    const [d, m, y] = C.jdToDate(jd), p = C.monthPillar(d, m, y);
    if (p.boundarySeconds !== null) got.push([jd, p.boundarySeconds, p.boundaryTermIndex]);
  }
  eq(`1976–2100 giờ Việt Nam: ${terms.length} tiết đổi tháng sát nửa đêm, mỗi tiết đúng một ngày mang cờ, đúng ngày và khoảng cách`, got, want);
  eq('Số tiết như vậy 1976–2100 (ảnh chụp kết quả quét, đổi khi bảng tiết khí đổi)', terms.length, 19);
  // Tháng thay thế của ngày mang cờ là tháng của ngày bên kia tiết
  const altOk = got.every(([jd, s]) => {
    const [d, m, y] = C.jdToDate(jd), [d2, m2, y2] = C.jdToDate(s < 0 ? jd - 1 : jd + 1);
    const a = C.monthPillar(d, m, y).alternative, b = C.monthPillar(d2, m2, y2);
    return a.ganIndex === b.ganIndex && a.zhiIndex === b.zhiIndex && a.yearGanIndex === b.yearGanIndex && a.yearZhiIndex === b.yearZhiIndex && a.termIndex === b.termIndex;
  });
  eq('Tháng thay thế (alternative) của mọi ngày mang cờ trùng tháng của ngày bên kia tiết', altOk, true);
  // Lập xuân 04/02/1947 lúc 23:50:20 theo giờ dựng lịch UTC+8: đổi cả năm can chi (Đinh Hợi, lệch thì còn Bính Tuất)
  const lx47 = C.monthPillar(4, 2, 1947), al47 = C.dayAlmanac(4, 2, 1947);
  eq('04/02/1947 (UTC+8): Lập xuân cách nửa đêm -580 giây; tháng Nhâm Dần năm Đinh Hợi, thay thế tháng Tân Sửu năm Bính Tuất; 03/02/1947 không mang cờ',
    [lx47.boundarySeconds, lx47.boundaryTermIndex, gz({ g: lx47.ganIndex, z: lx47.zhiIndex }), gz({ g: lx47.alternative.ganIndex, z: lx47.alternative.zhiIndex }),
      al47.yearGanZhi, al47.alternative.yearGanZhi, C.monthPillar(3, 2, 1947).boundarySeconds],
    [-580, 21, '壬寅', '辛丑', '丁亥', '丙戌', null]);

  // Tiểu hàn 05/01/2011 lúc 23:54:38 giờ Việt Nam: ngày 05/01 đã sang tháng Sửu (Kỷ Sửu), lệch thì còn tháng Tý (Mậu Tý)
  const p = C.monthPillar(5, 1, 2011), a = C.dayAlmanac(5, 1, 2011);
  const st = C.solarTermOn(5, 1, 2011);
  eq('05/01/2011: Tiểu hàn cách nửa đêm -322 giây; tháng Kỷ Sửu, thay thế Mậu Tý; dayAlmanac mang cờ, Trực và thần nhật khác nhau ở hai khả năng',
    [st.key, st.boundarySeconds, p.boundarySeconds, p.boundaryTermIndex, gz({ g: p.ganIndex, z: p.zhiIndex }), gz({ g: p.alternative.ganIndex, z: p.alternative.zhiIndex }),
      a.flags, a.boundarySeconds, a.monthZhiIndex, a.alternative.monthZhiIndex, a.zhiXing !== a.alternative.zhiXing, a.tianShen !== a.alternative.tianShen],
    ['小寒', -322, -322, 19, '己丑', '戊子', ['BOUNDARY_RISK'], -322, 1, 0, true, true]);
  // Bạch lộ 08/09/2014 lúc 00:01:26: ngày 07/09 mang cờ (còn tháng Thân, lệch thì sang tháng Dậu); ngày 08/09 không
  const q = C.monthPillar(7, 9, 2014), b = C.dayAlmanac(7, 9, 2014);
  eq('07/09/2014: Bạch lộ rơi 86 giây sau nửa đêm cuối ngày; ngày 07/09 mang cờ (tháng Thân, thay thế tháng Dậu), ngày 08/09 và 06/09 không',
    [q.boundarySeconds, q.zhiIndex, q.alternative.zhiIndex, b.flags, b.alternative.monthZhiIndex, b.alternative.zhiXing !== b.zhiXing,
      C.monthPillar(8, 9, 2014).boundarySeconds, C.dayAlmanac(8, 9, 2014).flags, C.monthPillar(6, 9, 2014).boundarySeconds],
    [86, 8, 9, ['BOUNDARY_RISK'], 9, true, null, [], null]);
  // Ngày bình thường và ngày chứa tiết xa nửa đêm: không cờ
  const n = C.dayAlmanac(28, 10, 2026), lx = C.dayAlmanac(4, 2, 2024);
  eq('28/10/2026 và Lập xuân 04/02/2024 (15:27 giờ Việt Nam): không mang cờ', [n.flags, n.boundarySeconds, n.alternative, lx.flags, C.monthPillar(3, 2, 2024).boundarySeconds],
    [[], null, null, [], null]);
  // Câu "chưa thể khẳng định" khi khoảng cách không vượt 3σ_ΔT: Lập thu 06/08/2060 (-27 giây, 3σ ≈ 63 giây) có, Hàn lộ 09/10/2003 lúc 00:00:32 (ngày mang cờ 08/10/2003) không
  const dn = NT.dateConvert.deltaTNote;
  eq('Câu sai số ΔT: 06/08/2060 có "chưa thể khẳng định", 08/10/2003 không',
    [/chưa thể khẳng định/.test(dn(C.dayAlmanac(6, 8, 2060).boundarySeconds, C.jdFromDate(6, 8, 2060))), /chưa thể khẳng định/.test(dn(C.dayAlmanac(8, 10, 2003).boundarySeconds, C.jdFromDate(8, 10, 2003)))],
    [true, false]);
}

// Ghi chú cờ BOUNDARY_RISK của tháng tiết khí dùng chung cho lịch tháng và hộp chi tiết ngày của Trạch cát (PRD 5.3: hiện cả hai khả năng)
{
  const tn = NT.dateConvert.termBoundaryNote;
  const a = tn(5, 1, 2011), b = tn(7, 9, 2014), c = tn(4, 2, 1947);
  eq('Ghi chú 05/01/2011: giờ rơi của tiết, khoảng cách, tháng của ứng dụng và tháng nếu lệch kèm Trực',
    [/lúc 23:54:38 cuối ngày này \(giờ Việt Nam\), chỉ 322 giây \(khoảng 5 phút\) trước nửa đêm/.test(a), /đã sang tháng mới: tháng Kỷ Sửu, .*trực Nguy/.test(a), /còn ở tháng cũ: tháng Mậu Tý, .*trực Thành/.test(a), /chưa thể khẳng định/.test(a)],
    [true, true, true, false]);
  eq('Ghi chú 07/09/2014 (tiết rơi sau nửa đêm), 04/02/1947 (Lập xuân, giờ dựng lịch UTC+8, nêu năm theo Lập xuân), 06/08/2060 (chưa thể khẳng định); ngày thường không có ghi chú',
    [/lúc 00:01:26 rạng sáng ngày hôm sau/.test(b), /còn ở tháng cũ: tháng Nhâm Thân/.test(b), /UTC\+8/.test(c), /năm can chi tính theo Lập xuân: Bính Tuất/.test(c), /chưa thể khẳng định/.test(tn(6, 8, 2060)), tn(28, 10, 2026)],
    [true, true, true, true, true, null]);
  const res = NT.scoring.findDays({ chart, act: NT.activities.byId('biz_open'), nameInfo: null, from: '2011-01-04', to: '2011-01-06', mode: 'best' });
  const day = (k) => res.days.find((x) => x.key === k);
  eq('Chọn ngày: 05/01/2011 mang cờ BOUNDARY_RISK và describeDay có ghi chú; 04/01, 06/01 không',
    [day('2011-01-05').flags, day('2011-01-04').flags, day('2011-01-06').flags, NT.scoring.describeDay(day('2011-01-05').ctx).boundaryNote === a,
      NT.scoring.describeDay(day('2011-01-04').ctx).boundaryNote],
    [['BOUNDARY_RISK'], [], [], true, null]);
}

console.log(`\n${fail ? '❌' : '✅'} ${pass}/${pass + fail} kiểm thử đạt`);
process.exit(fail ? 1 : 0);
