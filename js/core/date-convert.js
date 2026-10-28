/**
 * NgayTot — Đổi ngày hai chiều Dương lịch ↔ Âm lịch Việt Nam (PRD §1.2, §4.5; QĐ-19).
 *
 * Lớp này chỉ gói phần lõi NT.calendar thành một giao diện dùng chung cho bản web và bản mobile:
 * kiểm tra đầu vào, nêu lý do bằng tiếng Việt khi ngày không tồn tại, và gắn cờ cho kết quả cần dè dặt.
 * Không tự tính lịch: mọi con số lấy từ NT.calendar (QĐ-12).
 *
 * Cờ:
 *  - OUT_OF_VERIFIED_RANGE: năm ngoài 1929–2100 (PRD §1.4).
 *  - BOUNDARY_RISK: điểm sóc mở đầu tháng (hoặc tháng kế) cách nửa đêm dưới cửa sổ rủi ro (10 phút, hoặc 3 lần
 *    sai số ΔT của năm nếu lớn hơn) theo giờ dựng lịch, nên lịch in theo cách tính khác có thể lệch một ngày; hoặc
 *    một trung khí sát nửa đêm mà rơi sang ngày bên kia thì tháng đổi tên, thường là đổi tháng nhuận (PRD §5.3).
 *  - REGION_DIFFERS: 1968–1975 hai miền dùng hai lịch; kết quả hai miền khác nhau (PRD §6.3).
 */
(function (NT) {
  'use strict';

  const C = NT.calendar;
  const RANGE = C.SUPPORTED_RANGE;
  const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const MONTH_NAMES = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Mười một', 'Chạp'];
  const REGIONS = ['bac', 'nam', 'unknown'];

  const isInt = (v) => Number.isInteger(v);
  const fail = (code, message, extra) => Object.freeze({ ok: false, error: Object.freeze({ code, message }), ...extra });
  const gan = (i) => (NT.data ? NT.data.GAN_VI[i] : String(i));
  const zhi = (i) => (NT.data ? NT.data.ZHI_VI[i] : String(i));
  const fmtSolar = (s) => `${String(s.day).padStart(2, '0')}/${String(s.month).padStart(2, '0')}/${s.year}`;
  const monthName = (m, leap) => `tháng ${MONTH_NAMES[m - 1]}${leap ? ' nhuận' : ''}`;
  const fmtLunar = (l) => `ngày ${l.day} ${monthName(l.month, l.leap)} năm ${l.yearName} (${l.year})`;
  const termName = (i) => (NT.vi && NT.vi.jieqi ? NT.vi.jieqi(C.TERM_KEYS[i]) : C.TERM_KEYS[i]);
  /**
   * Câu nói thêm khi khoảng cách tới nửa đêm nhỏ hơn 3 lần sai số ΔT của năm: khi ấy chưa thể khẳng định phía nào.
   * Sai số theo năm dương lịch của ngày `jdn` (ngày mùng Một hoặc ngày chứa sự kiện).
   */
  function deltaTNote(seconds, jdn) {
    const year = C.jdToDate(jdn)[2];
    const limit = Math.round(3 * C.deltaTSigma(year));
    return Math.abs(seconds) <= limit
      ? ` Với năm ${year}, thời điểm này chỉ dự báo được với sai số có thể tới khoảng ${limit} giây (tốc độ quay của Trái Đất thay đổi khó đoán trước), lớn hơn khoảng cách trên, nên chưa thể khẳng định.`
      : '';
  }

  /**
   * Ghi chú cờ BOUNDARY_RISK của tháng tiết khí (PRD §5.3): một trong 12 tiết rơi sát nửa đêm nên tháng tiết khí của ngày
   * (và Trực, thần nhật…) có thể khác. Nêu cả hai khả năng. Dùng chung cho lịch tháng và hộp chi tiết ngày của Trạch cát.
   * @returns {string|null} null nếu ngày không mang cờ (hoặc thư viện lịch chưa nạp).
   */
  function termBoundaryNote(day, month, year) {
    if (!globalThis.Solar) return null;
    const al = C.dayAlmanac(day, month, year);
    if (!al.flags.includes('BOUNDARY_RISK')) return null;
    const V = NT.vi || {};
    const s = al.boundarySeconds, alt = al.alternative, tz = C.calendarTz(year, month, day);
    const sec = s < 0 ? 86400 + s : s; // giờ trong ngày của tiết
    const clock = [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60].map((n) => String(n).padStart(2, '0')).join(':');
    const gap = `${Math.abs(s)} giây${Math.abs(s) >= 90 ? `, khoảng ${Math.round(Math.abs(s) / 60)} phút` : ''}`;
    const sum = (a, other) => `tháng ${gan(a.monthGanIndex)} ${zhi(a.monthZhiIndex)}`
      + (a.yearGanZhi !== other.yearGanZhi ? ` (năm can chi tính theo Lập xuân: ${gan(a.yearGanIndex)} ${zhi(a.yearZhiIndex)})` : '')
      + `, thần nhật ${V.tianshen ? V.tianshen(a.tianShen) : a.tianShen} (${a.tianShenType === '黄道' ? 'hoàng đạo' : 'hắc đạo'}), trực ${V.zhixing ? V.zhixing(a.zhiXing) : a.zhiXing}`;
    return `Tiết ${termName(al.boundaryTermIndex)} rơi lúc ${clock} ${s < 0 ? 'cuối ngày này' : 'rạng sáng ngày hôm sau'} (${tz === 7 ? 'giờ Việt Nam' : `giờ dựng lịch UTC+${C.fmtTz(tz)}`}), `
      + `chỉ ${s < 0 ? 'trước' : 'sau'} nửa đêm ${gap}. `
      + `Ứng dụng tính ngày này ${s < 0 ? 'đã sang tháng mới' : 'còn ở tháng cũ'}: ${sum(al, alt)}. `
      + `Lịch tính theo cách khác có thể ghi tiết này ${s < 0 ? 'sang ngày hôm sau' : 'vào ngày này'}; khi đó ngày này ${s < 0 ? 'còn ở tháng cũ' : 'đã sang tháng mới'}: ${sum(alt, al)}.`
      + deltaTNote(s, C.jdFromDate(day, month, year));
  }

  function solarExists(day, month, year) {
    if (![day, month, year].every(isInt) || month < 1 || month > 12 || day < 1) return false;
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return day <= last;
  }

  /** Mô tả đầy đủ một ngày (theo JDN) cho một miền cụ thể ('bac' hoặc 'nam'). */
  function describe(jdn, region) {
    const [d, m, y] = C.jdToDate(jdn);
    const tz = C.calendarTz(y, m, d, region);
    const l = C.solarToLunar(d, m, y, tz);
    const info = C.lunarMonthInfo(d, m, y, tz);
    const yearName = `${gan(C.lunarYearGan(l.year))} ${zhi(C.lunarYearZhi(l.year))}`;
    const flags = [], notes = [];
    if (!C.inVerifiedRange(y)) {
      flags.push('OUT_OF_VERIFIED_RANGE');
      notes.push(`Năm ${y} nằm ngoài khoảng 1929–2100 đã đối chiếu; kết quả chỉ để tham khảo.`);
    }
    const own = info ? info.boundarySeconds : null;
    const next = info ? info.nextBoundarySeconds : null;
    let alternativeShift = 0;
    if (own !== null) {
      flags.push('BOUNDARY_RISK');
      alternativeShift = own > 0 ? 1 : -1;
      const where = `Trăng non mở đầu tháng âm này rơi ${own > 0 ? 'sau' : 'trước'} nửa đêm chỉ ${Math.abs(own)} giây (${tz === 7 ? 'giờ Việt Nam' : `giờ dựng lịch UTC+${C.fmtTz(tz)}`}). `;
      notes.push(where + (own < 0 && l.day === 1
        ? 'Lịch in theo cách tính khác có thể coi ngày này là ngày cuối của tháng trước.'
        : `Lịch in theo cách tính khác có thể ghi ngày âm ${own > 0 ? 'lớn hơn' : 'nhỏ hơn'} một ngày trong cả tháng này.`) + deltaTNote(own, info.start));
    } else if (next !== null && next > 0 && info && l.day === info.length) {
      flags.push('BOUNDARY_RISK');
      notes.push(`Trăng non của tháng kế tiếp rơi sau nửa đêm chỉ ${next} giây; lịch in theo cách tính khác có thể coi ngày này là mùng Một tháng sau.` + deltaTNote(next, info.start + info.length));
    }
    const zq = info ? info.zhongqiRisk : null;
    if (zq) {
      if (!flags.includes('BOUNDARY_RISK')) flags.push('BOUNDARY_RISK');
      const tzText = tz === 7 ? 'giờ Việt Nam' : `giờ dựng lịch UTC+${C.fmtTz(tz)}`;
      notes.push(`Trung khí ${termName(zq.term)} rơi ${zq.seconds > 0 ? 'sau' : 'trước'} nửa đêm chỉ ${Math.abs(zq.seconds)} giây (${tzText}). `
        + `Nếu tính lệch sang ngày bên kia thì tháng này là ${monthName(zq.month, zq.leap)}${zq.year !== l.year ? ` năm ${zq.year}` : ''}; ngày âm trong tháng không đổi.`
        + deltaTNote(zq.seconds, info.start));
    }
    if (!info) notes.push('Ngày này nằm ngoài bảng tháng đã tính trước; kết quả tính bằng công thức xấp xỉ.');
    return {
      solar: Object.freeze({ day: d, month: m, year: y, weekday: WEEKDAYS[(jdn + 1) % 7], text: fmtSolar({ day: d, month: m, year: y }) }),
      lunar: Object.freeze({
        day: l.day, month: l.month, year: l.year, leap: l.leap, yearName,
        monthLength: info ? info.length : null,
        text: fmtLunar({ ...l, yearName }),
      }),
      canChi: Object.freeze({
        day: `${gan((jdn + 9) % 10)} ${zhi((jdn + 1) % 12)}`,
        // Can chi của tháng âm, khác can chi tháng theo tiết khí dùng cho lá số và chọn ngày (PRD §6.4).
        // Tháng nhuận: null — theo mặc định lunar_month_canchi_leap của PRD §6.5, tháng nhuận không gán can chi riêng
        lunarMonth: l.leap ? null : `${gan((l.year * 12 + l.month + 3) % 10)} ${zhi((l.month + 1) % 12)}`,
        year: yearName,
      }),
      solarTerm: (() => { const st = C.solarTermOn(d, m, y, tz); return st ? Object.freeze({ index: st.index, name: NT.vi && NT.vi.jieqi ? NT.vi.jieqi(st.key) : st.key, boundarySeconds: st.boundarySeconds }) : null; })(),
      calendarTz: tz,
      fromTable: !!info,
      alternativeShift,
      flags, notes,
    };
  }

  /** Gộp kết quả theo miền: 'unknown' thì tính cả hai, khác nhau thì gắn cờ và trả cả hai. */
  function byRegion(region, fn) {
    if (region !== 'unknown') return fn(region);
    const bac = fn('bac'), nam = fn('nam');
    if (!bac.ok || !nam.ok) {
      if (bac.ok === nam.ok) return bac;
      const good = bac.ok ? bac : nam;
      return Object.freeze({ ...good, flags: Object.freeze([...good.flags, 'REGION_DIFFERS']),
        notes: Object.freeze([...good.notes, `Ngày này chỉ tồn tại trong lịch dùng ở miền ${bac.ok ? 'Bắc' : 'Nam'} thời 1968–1975.`]), byRegion: Object.freeze({ bac, nam }) });
    }
    const same = bac.solar.text === nam.solar.text && bac.lunar.text === nam.lunar.text;
    if (same) {
      // Cùng ngày nhưng mỗi miền có thể mang cờ riêng (múi giờ dựng lịch khác nhau): gộp cờ và ghi chú của cả hai
      const flags = [...new Set([...bac.flags, ...nam.flags])], notes = [...new Set([...bac.notes, ...nam.notes])];
      return flags.length === bac.flags.length ? bac : Object.freeze({ ...bac, flags: Object.freeze(flags), notes: Object.freeze(notes) });
    }
    return Object.freeze({ ...bac, flags: Object.freeze([...bac.flags, 'REGION_DIFFERS']),
      notes: Object.freeze([...bac.notes, 'Từ 1968 đến 1975 miền Bắc và miền Nam dùng hai lịch khác nhau; kết quả hai miền khác nhau, hãy chọn miền.']),
      byRegion: Object.freeze({ bac, nam }) });
  }

  const freezeResult = (r) => Object.freeze({ ok: true, ...r, flags: Object.freeze(r.flags), notes: Object.freeze(r.notes) });

  /**
   * Dương lịch → Âm lịch.
   * @param {{day:number, month:number, year:number}} input
   * @param {{region?:'bac'|'nam'|'unknown'}} [opts] miền, chỉ ảnh hưởng 1968–1975; mặc định 'bac'
   */
  function solarToLunar(input, opts) {
    const { day, month, year } = input || {};
    const region = (opts && opts.region) || 'bac';
    if (!REGIONS.includes(region)) return fail('INVALID_REGION', 'Miền phải là "bac", "nam" hoặc "unknown".');
    if (![day, month, year].every(isInt)) return fail('INVALID_INPUT', 'Hãy nhập ngày, tháng, năm dương lịch bằng số.');
    if (year < RANGE.from || year > RANGE.to) return fail('OUT_OF_RANGE', `Chỉ đổi được ngày dương lịch từ năm ${RANGE.from} đến năm ${RANGE.to}.`);
    if (!solarExists(day, month, year)) return fail('NO_SUCH_SOLAR_DATE', `Dương lịch không có ngày ${day}/${month}/${year}.`);
    const jdn = C.jdFromDate(day, month, year);
    return byRegion(region, (r) => freezeResult(describe(jdn, r)));
  }

  /** Các tháng của một năm âm lịch theo miền: [{month, leap, length, start:{day,month,year}}]. */
  function monthsOfLunarYear(year, region) {
    const out = [];
    for (let m = 1; m <= 12; m++) {
      for (const leap of [false, true]) {
        const first = C.lunarToSolar(1, m, year, leap, undefined, region);
        if (!first) continue;
        const has30 = !!C.lunarToSolar(30, m, year, leap, undefined, region);
        out.push(Object.freeze({ month: m, leap, length: has30 ? 30 : 29, start: Object.freeze({ day: first[0], month: first[1], year: first[2] }) }));
      }
    }
    return out;
  }

  /**
   * Âm lịch → Dương lịch.
   * @param {{day:number, month:number, year:number, leap?:boolean}} input year là năm âm lịch (năm chứa phần lớn năm đó, vd Tết 2026 thuộc năm 2026)
   * @param {{region?:'bac'|'nam'|'unknown'}} [opts]
   */
  function lunarToSolar(input, opts) {
    const { day, month, year } = input || {};
    const region = (opts && opts.region) || 'bac';
    if (input && input.leap != null && typeof input.leap !== 'boolean') return fail('INVALID_INPUT', 'Mục "tháng nhuận" phải là đúng hoặc sai.');
    const leap = !!(input && input.leap);
    if (!REGIONS.includes(region)) return fail('INVALID_REGION', 'Miền phải là "bac", "nam" hoặc "unknown".');
    if (![day, month, year].every(isInt)) return fail('INVALID_INPUT', 'Hãy nhập ngày, tháng, năm âm lịch bằng số.');
    if (month < 1 || month > 12) return fail('INVALID_INPUT', 'Tháng âm lịch phải từ 1 đến 12.');
    if (day < 1 || day > 30) return fail('INVALID_INPUT', 'Ngày âm lịch phải từ 1 đến 30.');
    // Cuối năm âm lịch 1911 rơi vào đầu năm dương lịch 1912 nên vẫn nhận; kết quả ngoài khoảng dương lịch thì báo ở dưới
    if (year < RANGE.from - 1 || year > RANGE.to) return fail('OUT_OF_RANGE', `Chỉ đổi được năm âm lịch từ ${RANGE.from} đến ${RANGE.to}.`);

    return byRegion(region, (r) => {
      const res = C.lunarToSolar(day, month, year, leap, undefined, r);
      if (res) {
        if (res[2] < RANGE.from || res[2] > RANGE.to) return fail('OUT_OF_RANGE', `Ngày này rơi vào năm dương lịch ${res[2]}, ngoài khoảng ${RANGE.from}–${RANGE.to}.`);
        return freezeResult(describe(C.jdFromDate(res[0], res[1], res[2]), r));
      }
      // Không có ngày này: nói rõ vì sao
      const months = monthsOfLunarYear(year, r);
      const leapMonth = months.find((m) => m.leap);
      const target = months.find((m) => m.month === month && m.leap === leap);
      if (!target && leap) {
        return fail('NO_SUCH_LEAP_MONTH', leapMonth
          ? `Năm âm lịch ${year} không nhuận ${monthName(month, false)}; năm đó nhuận ${monthName(leapMonth.month, false)}.`
          : `Năm âm lịch ${year} không có tháng nhuận.`, { leapMonth: leapMonth ? leapMonth.month : null });
      }
      if (target && day > target.length) {
        return fail('NO_SUCH_LUNAR_DAY', `${monthName(month, leap)[0].toUpperCase()}${monthName(month, leap).slice(1)} năm âm lịch ${year} chỉ có ${target.length} ngày.`, { monthLength: target.length });
      }
      return fail('NO_SUCH_LUNAR_DAY', `Âm lịch không có ngày ${day} ${monthName(month, leap)} năm ${year}.`);
    });
  }

  /**
   * Thông tin một năm âm lịch: tháng nhuận (nếu có), danh sách tháng kèm số ngày và ngày dương của mùng Một.
   * @param {number} year @param {{region?:'bac'|'nam'}} [opts]
   */
  function lunarYearInfo(year, opts) {
    const asked = (opts && opts.region) || 'bac';
    if (!REGIONS.includes(asked)) return fail('INVALID_REGION', 'Miền phải là "bac", "nam" hoặc "unknown".');
    if (!isInt(year) || year < RANGE.from || year > RANGE.to) return fail('OUT_OF_RANGE', `Chỉ tra được năm âm lịch từ ${RANGE.from} đến ${RANGE.to}.`);
    const build = (region) => {
      const months = monthsOfLunarYear(year, region);
      const leap = months.find((m) => m.leap);
      return { months, leapMonth: leap ? leap.month : null, days: months.reduce((n, m) => n + m.length, 0) };
    };
    const main = build(asked === 'nam' ? 'nam' : 'bac');
    if (!main.months.length) return fail('OUT_OF_RANGE', `Không dựng được năm âm lịch ${year}.`);
    // Không rõ miền: trả theo miền Bắc, báo nếu miền Nam khác (1968–1975)
    const differs = asked === 'unknown' && JSON.stringify(build('nam').months) !== JSON.stringify(main.months);
    return Object.freeze({
      ok: true, year, yearName: `${gan(C.lunarYearGan(year))} ${zhi(C.lunarYearZhi(year))}`,
      leapMonth: main.leapMonth, days: main.days, months: Object.freeze(main.months),
      flags: Object.freeze(differs ? ['REGION_DIFFERS'] : []),
    });
  }

  NT.dateConvert = Object.freeze({ RANGE, solarToLunar, lunarToSolar, lunarYearInfo, deltaTNote, termBoundaryNote });
})(globalThis.NT ??= {});
