/**
 * NgayTot — Ngũ hành của họ tên (hệ số phụ, độ tin cậy THẤP).
 * Phương pháp: Ngũ âm (五音) theo vị trí cấu âm của phụ âm đầu mỗi chữ:
 *   Nha âm (gốc lưỡi) → Mộc | Thiệt âm (đầu lưỡi) → Hỏa | Hầu âm (họng/nguyên âm) → Thổ
 *   Xỉ âm (răng, xát) → Kim | Thần âm (môi) → Thủy
 * Trọng số: tên 0.5, đệm 0.3 (chia đều), họ 0.2.
 */
(function (NT) {
  'use strict';

  const INITIALS = [
    ['ngh', 0], ['ng', 0], ['gh', 0], ['kh', 0], ['qu', 0], ['gi', 3], ['ch', 3], ['tr', 3], ['th', 1], ['nh', 1], ['ph', 4],
    ['c', 0], ['k', 0], ['q', 0], ['g', 0],
    ['đ', 1], ['d', 1], ['t', 1], ['n', 1], ['l', 1],
    ['h', 2],
    ['s', 3], ['x', 3], ['r', 3], ['z', 3], ['j', 3],
    ['b', 4], ['m', 4], ['p', 4], ['v', 4], ['f', 4], ['w', 4],
  ];

  function initialOf(word) {
    const w = word.toLowerCase().normalize('NFC');
    for (const [ini, el] of INITIALS) if (w.startsWith(ini)) return { ini, el };
    return { ini: w[0] ?? '', el: 2 }; // bắt đầu bằng nguyên âm → Hầu âm (Thổ)
  }

  /** @returns {null|{words:Array, element:number, scores:number[]}} */
  function analyzeName(fullName) {
    const words = String(fullName ?? '').trim().split(/\s+/).filter((x) => /\p{L}/u.test(x));
    if (!words.length) return null;
    const scores = [0, 0, 0, 0, 0];
    const n = words.length;
    const detail = words.map((word, i) => {
      const { ini, el } = initialOf(word);
      let weight;
      if (n === 1) weight = 1;
      else if (i === n - 1) weight = 0.5;
      else if (i === 0) weight = n === 2 ? 0.5 : 0.2;
      else weight = 0.3 / (n - 2);
      scores[el] += weight;
      const role = n === 1 ? 'Tên' : i === n - 1 ? 'Tên' : i === 0 ? 'Họ' : 'Đệm';
      return { word, ini, el, weight, role };
    });
    const element = scores.indexOf(Math.max(...scores));
    return { words: detail, element, scores };
  }

  /** Điểm phụ giữa ngũ hành ngày (Thiên can) và ngũ hành tên. */
  function nameAdjust(dayEl, nameEl) {
    const D = NT.data;
    if (D.generates(dayEl, nameEl)) return { pts: 3, text: 'sinh' };
    if (dayEl === nameEl) return { pts: 1.5, text: 'đồng hành với' };
    if (D.controls(dayEl, nameEl)) return { pts: -3, text: 'khắc' };
    if (D.controls(nameEl, dayEl)) return { pts: -1, text: 'bị khắc bởi' };
    return { pts: -0.5, text: 'được sinh bởi (tiết khí)' };
  }

  NT.nameElement = Object.freeze({ analyzeName, nameAdjust });
})(globalThis.NT ??= {});
