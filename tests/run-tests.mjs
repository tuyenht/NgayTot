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
for (const f of ['data', 'i18n-vi', 'calendar-vn', 'bazi', 'name-element', 'activities', 'legal', 'scoring']) {
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
  eq('Golden UTC+8 so với 6tail 1929–2100: 0 ngày lệch', [mism, firstMism], [0, null]);

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
  // Giấy phép MIT của thư viện lịch vẫn phải đi kèm bản phân phối, dù giao diện không dẫn tên thư viện
  const lic = readFileSync(path.join(root, 'vendor/LICENSE-lunar-javascript.txt'), 'utf8');
  eq('Có tệp giấy phép MIT của lunar-javascript trong vendor/', [lic.includes('MIT License'), lic.includes('Copyright (c) 2018 6tail')], [true, true]);
  // Cảnh báo cứng pháp luật phải đi vào .ics và bản sao chép (PRD §3.2)
  eq('app.js đưa cảnh báo cứng vào biểu ngữ, .ics và bản sao chép', (app.match(/hardWarningTexts\(r\)/g) ?? []).length >= 2 && /legalBannerHTML\(res\.days\)/.test(app), true);
}

console.log(`\n${fail ? '❌' : '✅'} ${pass}/${pass + fail} kiểm thử đạt`);
process.exit(fail ? 1 : 0);
