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
for (const f of ['data', 'i18n-vi', 'calendar-vn', 'bazi', 'name-element', 'activities', 'legal', 'scoring', 'wedding-plan']) {
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
  eq('55 mục: 47 bài khấn và 8 bài giới thiệu lễ của các dân tộc; bài giới thiệu không có lời khấn, không có biến điền',
    [allPrayers.length, intro.length, intro.every((p) => p.category === 'dan_toc_thieu_so' && !/Nam mô|Con kính lạy|\{\{/.test(p.content)),
      allPrayers.filter((p) => p.category === 'dan_toc_thieu_so' && p.kind !== 'gioi_thieu').length],
    [55, 8, true, 0]);
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

console.log(`\n${fail ? '❌' : '✅'} ${pass}/${pass + fail} kiểm thử đạt`);
process.exit(fail ? 1 : 0);
