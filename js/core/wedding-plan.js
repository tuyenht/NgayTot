/**
 * NgayTot — Lịch trình giờ trong ngày cưới (PRD §10.5, QĐ-09).
 *
 * Từ một ngày cưới đã chọn và các con số thực tế (thời gian đi, thời lượng lễ), xếp bốn mốc:
 *   D  nhà trai xuất phát          = A − thời gian đi − đệm
 *   A  vào nhà gái làm lễ xin dâu  (mốc neo, được thử lần lượt)
 *   L  rời nhà gái                 = A + thời lượng lễ nhà gái
 *   H  về tới nhà trai, lễ gia tiên = L + thời gian về
 * Mỗi mốc được đối chiếu với giờ hoàng đạo của ngày và lục xung với tuổi cô dâu, chú rể.
 *
 * Nguyên tắc (PRD §9.4, §10.5): không gợi ý giờ ngoài khung sinh hoạt (mặc định 05:00–21:00);
 * không gộp thành điểm số — các phương án sắp theo tiêu chí ghi rõ trong `criteria`.
 */
(function (NT) {
  'use strict';

  const D = NT.data;
  const V = NT.vi;
  const pad = (n) => String(n).padStart(2, '0');
  const hm = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
  const toMin = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m; };

  const DEFAULTS = Object.freeze({
    ceremonyBride: 45, ceremonyGroom: 30, buffer: 15,
    windowFrom: '05:00', windowTo: '21:00',
    step: 5, marginWarn: 15, farMinutes: 180,
    priority: ['A', 'H'],
  });
  const LABEL = Object.freeze({ D: 'Nhà trai xuất phát', A: 'Vào nhà gái, làm lễ xin dâu', L: 'Rời nhà gái', H: 'Về tới nhà trai, làm lễ gia tiên', P: 'Tiệc' });

  /** Canh giờ chứa phút `min` của ngày: [bắt đầu, kết thúc) tính bằng phút; ranh giới ở các giờ lẻ. */
  function canhOf(min) {
    const start = Math.floor((min + 60) / 120) * 120 - 60;
    return [start, start + 120];
  }

  /** Thông tin một mốc giờ đồng hồ trong ngày. */
  function hourInfo(y, m, d, min, zhis) {
    const l = globalThis.Solar.fromYmdHms(y, m, d, Math.floor(min / 60), min % 60, 0).getLunar();
    const z = l.getTimeZhiIndex();
    const [cs, ce] = canhOf(min);
    const clash = zhis.filter((p) => Number.isInteger(p.zhi) && D.isChong(z, p.zhi)).map((p) => p.role);
    const huangDao = l.getTimeTianShenLuck() === '吉';
    return {
      min, time: hm(min), zhi: z, zhiVi: D.ZHI_VI[z],
      huangDao, tianShen: V.tianshen(l.getTimeTianShen()),
      clash, good: huangDao && clash.length === 0,
      margin: Math.min(min - cs, ce - min), // phút tới ranh giới canh gần nhất
      canh: `${hm(Math.max(cs, 0))}–${hm(Math.min(ce, 1440) - 1)}`,
    };
  }

  /**
   * @param {object} o
   * @param {number} o.y @param {number} o.m @param {number} o.d  ngày cưới (dương lịch)
   * @param {number} o.travelTo   phút đi từ nhà trai (hoặc điểm xuất phát) tới nhà gái
   * @param {number} [o.travelBack] phút từ nhà gái về nhà trai (mặc định = travelTo)
   * @param {number|null} [o.brideZhi] chi tuổi cô dâu  @param {number|null} [o.groomZhi] chi tuổi chú rể
   * @param {string|null} [o.partyTime] 'HH:MM' nếu đã định giờ tiệc
   * @param {string[]} [o.priority] hai mốc ưu tiên trong ['D','A','H']
   */
  function plan(o) {
    const c = { ...DEFAULTS, ...Object.fromEntries(Object.entries(o).filter(([, v]) => v != null)) };
    const travelTo = Math.round(Number(o.travelTo));
    const travelBack = Math.round(Number(o.travelBack ?? o.travelTo));
    if (!(travelTo >= 0 && travelTo <= 1200) || !(travelBack >= 0 && travelBack <= 1200)) throw new Error('Thời gian di chuyển không hợp lệ (0–1200 phút).');
    for (const k of ['ceremonyBride', 'ceremonyGroom', 'buffer']) if (!(c[k] >= 0 && c[k] <= 600)) throw new Error('Thời lượng lễ hoặc khoảng đệm không hợp lệ.');
    const priority = (Array.isArray(c.priority) ? c.priority : DEFAULTS.priority).filter((k) => ['D', 'A', 'H'].includes(k));
    const prio = priority.length ? priority : DEFAULTS.priority;
    const other = ['D', 'A', 'H'].filter((k) => !prio.includes(k));
    const zhis = [{ role: 'cô dâu', zhi: o.brideZhi }, { role: 'chú rể', zhi: o.groomZhi }];
    const w0 = toMin(c.windowFrom), w1 = toMin(c.windowTo);
    const info = (min) => hourInfo(o.y, o.m, o.d, min, zhis);

    const cands = [];
    for (let A = w0; A <= w1; A += c.step) {
      const Dm = A - travelTo - c.buffer;
      const L = A + c.ceremonyBride;
      const H = L + travelBack;
      if (Dm < w0 || H + c.ceremonyGroom > w1) continue; // không xuất phát trước khung, không kết thúc sau khung
      const ms = { D: info(Dm), A: info(A), L: info(L), H: info(H) };
      const prioGood = prio.filter((k) => ms[k].good).length;
      const otherGood = other.filter((k) => ms[k].good).length;
      // Mốc "vững": rơi vào giờ tốt VÀ còn cách ranh giới canh giờ đủ xa để trễ chút không sang canh khác.
      const robust = (k) => ms[k].good && ms[k].margin >= c.marginWarn;
      const prioRobust = prio.filter(robust).length;
      const otherRobust = other.filter(robust).length;
      const goodKeys = ['D', 'A', 'H'].filter((k) => ms[k].good);
      const minMargin = goodKeys.length ? Math.min(...goodKeys.map((k) => ms[k].margin)) : 0;
      cands.push({ ms, prioGood, otherGood, prioRobust, otherRobust, minMargin, key: ['D', 'A', 'H'].map((k) => ms[k].zhi).join('-') });
    }

    // Mỗi tổ hợp canh giờ giữ một phương án: phương án cách xa ranh giới canh nhất.
    const byKey = new Map();
    for (const x of cands) {
      const cur = byKey.get(x.key);
      if (!cur || x.prioRobust > cur.prioRobust || (x.prioRobust === cur.prioRobust && x.minMargin > cur.minMargin)) byKey.set(x.key, x);
    }
    const ranked = [...byKey.values()].sort((a, b) =>
      b.prioRobust - a.prioRobust || b.prioGood - a.prioGood || b.otherRobust - a.otherRobust || b.otherGood - a.otherGood
      || b.minMargin - a.minMargin || a.ms.A.min - b.ms.A.min);

    const party = o.partyTime ? info(toMin(o.partyTime)) : null;
    const plans = ranked.slice(0, 3).map((x) => {
      const steps = ['D', 'A', 'L', 'H'].map((k) => ({ key: k, label: LABEL[k], judged: k !== 'L', priority: prio.includes(k), ...x.ms[k] }));
      const notes = [];
      for (const s of steps) {
        if (!s.judged) continue;
        if (s.clash.length) notes.push(`${s.label} lúc ${s.time} rơi vào giờ ${s.zhiVi}, xung tuổi ${s.clash.join(' và ')}.`);
        else if (!s.huangDao) notes.push(`${s.label} lúc ${s.time} không rơi vào giờ hoàng đạo.`);
        else if (s.margin < c.marginWarn) notes.push(`${s.label} lúc ${s.time} chỉ cách ranh giới canh giờ ${s.margin} phút; trễ một chút là sang canh khác.`);
      }
      const endGroom = x.ms.H.min + c.ceremonyGroom;
      if (party) {
        if (party.min < endGroom) notes.push(`Giờ tiệc ${party.time} sớm hơn lúc lễ ở nhà trai xong (${hm(endGroom)}).`);
        if (party.min < 360 || party.min >= 1320) notes.push(`Giờ tiệc ${party.time} nằm ngoài khung 06:00–22:00 cho nhạc đám cưới.`);
      }
      return { steps, party: party ? { key: 'P', label: LABEL.P, judged: false, priority: false, ...party } : null, endGroom: hm(endGroom), prioGood: x.prioGood, prioRobust: x.prioRobust, goodCount: x.prioGood + x.otherGood, notes };
    });

    const advice = [];
    if (!cands.length) {
      advice.push(`Không xếp được lịch trình trong khung ${c.windowFrom}–${c.windowTo}: với quãng đường này, đoàn phải xuất phát trước ${c.windowFrom} hoặc kết thúc sau ${c.windowTo}. Ứng dụng không gợi ý chạy xe đêm.`);
    } else if (plans[0].prioGood < prio.length) {
      advice.push('Trong ngày này không có lịch trình nào để cả hai mốc ưu tiên cùng rơi vào giờ hoàng đạo. Ưu tiên an toàn và đúng hẹn; mốc nào không đẹp đã ghi rõ ở từng phương án.');
    }
    if (travelTo >= c.farMinutes || !cands.length) {
      advice.push('Đường xa, các gia đình thường chọn một trong ba cách: (1) đi sớm trong ngày; (2) nhà trai đến từ hôm trước và xuất phát từ một điểm gần nhà gái — khi đó nhập lại thời gian đi theo điểm xuất phát mới; (3) làm hai ngày: lễ ở nhà gái hôm trước, lễ ở nhà trai hôm sau — khi đó xem riêng từng ngày.');
    }
    return {
      plans, advice, priority: prio,
      criteria: `Sắp theo: số mốc ưu tiên (${prio.map((k) => LABEL[k].toLowerCase()).join('; ')}) rơi vào giờ hoàng đạo, không xung tuổi và cách ranh giới canh giờ ít nhất ${c.marginWarn} phút → số mốc ưu tiên rơi vào giờ hoàng đạo → các mốc còn lại → khoảng cách tới ranh giới canh giờ → giờ sớm hơn. Thứ tự này do ứng dụng đặt, không có trong sách.`,
      params: { travelTo, travelBack, ceremonyBride: c.ceremonyBride, ceremonyGroom: c.ceremonyGroom, buffer: c.buffer, windowFrom: c.windowFrom, windowTo: c.windowTo },
    };
  }

  NT.weddingPlan = Object.freeze({ plan, hourInfo, canhOf, DEFAULTS, LABEL });
})(globalThis.NT ??= {});
