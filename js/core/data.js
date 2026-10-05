/**
 * NgayTot — Core data tables (Can Chi, Ngũ hành, quan hệ, thần sát cá nhân).
 * Mọi chỉ số Can (0–9) / Chi (0–11) đều 0-based, khớp với lunar-javascript.
 */
(function (NT) {
  'use strict';

  const GAN_HAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const GAN_VI = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const ZHI_HAN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  const ZHI_VI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const ZHI_ANIMAL = ['Chuột', 'Trâu', 'Hổ', 'Mèo', 'Rồng', 'Rắn', 'Ngựa', 'Dê', 'Khỉ', 'Gà', 'Chó', 'Lợn'];

  /** Ngũ hành: 0 Mộc, 1 Hỏa, 2 Thổ, 3 Kim, 4 Thủy. e sinh (e+1)%5; e khắc (e+2)%5 */
  const ELEMENTS = [
    { id: 0, vi: 'Mộc', han: '木', key: 'moc' },
    { id: 1, vi: 'Hỏa', han: '火', key: 'hoa' },
    { id: 2, vi: 'Thổ', han: '土', key: 'tho' },
    { id: 3, vi: 'Kim', han: '金', key: 'kim' },
    { id: 4, vi: 'Thủy', han: '水', key: 'thuy' },
  ];
  const ZHI_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];

  /** Tàng can (chính khí, trung khí, dư khí) — chuẩn Tử Bình. */
  const ZHI_HIDDEN = [
    [9], [5, 9, 7], [0, 2, 4], [1], [4, 1, 9], [2, 6, 4],
    [3, 5], [5, 3, 1], [6, 8, 4], [7], [4, 7, 3], [8, 0],
  ];
  const HIDDEN_RATIO = { 1: [1], 2: [0.7, 0.3], 3: [0.6, 0.3, 0.1] };

  const ganElement = (g) => Math.floor(g / 2);
  const ganYang = (g) => g % 2 === 0;
  const zhiElement = (z) => ZHI_ELEMENT[z];
  const generates = (a, b) => (a + 1) % 5 === b;
  const controls = (a, b) => (a + 2) % 5 === b;

  /** Nhóm Thập thần theo quan hệ ngũ hành so với Nhật chủ. */
  const TEN_GOD_GROUPS = [
    { id: 0, vi: 'Tỷ Kiếp', short: 'Tỷ' },
    { id: 1, vi: 'Thực Thương', short: 'Thực' },
    { id: 2, vi: 'Tài Tinh', short: 'Tài' },
    { id: 3, vi: 'Quan Sát', short: 'Quan' },
    { id: 4, vi: 'Ấn Tinh', short: 'Ấn' },
  ];
  const TEN_GOD_SAME = ['Tỷ Kiên', 'Thực Thần', 'Thiên Tài', 'Thất Sát', 'Thiên Ấn'];
  const TEN_GOD_DIFF = ['Kiếp Tài', 'Thương Quan', 'Chính Tài', 'Chính Quan', 'Chính Ấn'];

  /** Nhóm quan hệ của ngũ hành e so với Nhật chủ (hành dm). */
  const relGroup = (dm, e) => {
    if (e === dm) return 0;
    if (generates(dm, e)) return 1;
    if (controls(dm, e)) return 2;
    if (controls(e, dm)) return 3;
    return 4;
  };
  const tenGodOfGan = (dayGan, g) => {
    const grp = relGroup(ganElement(dayGan), ganElement(g));
    return (ganYang(dayGan) === ganYang(g) ? TEN_GOD_SAME : TEN_GOD_DIFF)[grp];
  };

  /* ---------- Quan hệ Địa chi / Thiên can ---------- */
  const isChong = (a, b) => Math.abs(a - b) === 6;
  const isLiuHe = (a, b) => (a + b) % 12 === 1;
  const isHai = (a, b) => (a + b) % 12 === 7;
  const isSanHe = (a, b) => a !== b && a % 4 === b % 4;
  const HINH_GROUPS = [[2, 5, 8], [1, 10, 7]];
  const SELF_HINH = [4, 6, 9, 11];
  const isHinh = (a, b) => {
    if (a === b) return SELF_HINH.includes(a);
    if ((a === 0 && b === 3) || (a === 3 && b === 0)) return true;
    return HINH_GROUPS.some((g) => g.includes(a) && g.includes(b));
  };
  const isGanHe = (a, b) => Math.abs(a - b) === 5;
  const isGanChong = (a, b) => Math.abs(a - b) === 6;

  /* ---------- Thần sát cá nhân ---------- */
  const TIAN_YI = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [2, 6], [3, 5], [3, 5]];
  const LU = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
  const WEN_CHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
  const YI_MA = { 0: 2, 1: 11, 2: 8, 3: 5 };
  const TAO_HUA = { 0: 9, 1: 6, 2: 3, 3: 0 };
  const yiMaOf = (z) => YI_MA[z % 4];
  const taoHuaOf = (z) => TAO_HUA[z % 4];

  /* ---------- Ngày kỵ dân gian Việt Nam (theo âm lịch VN) ---------- */
  const TAM_NUONG = [3, 7, 13, 18, 22, 27];
  const NGUYET_KY = [5, 14, 23];
  const DUONG_CONG = { 1: [13], 2: [11], 3: [9], 4: [7], 5: [5], 6: [3], 7: [8, 29], 8: [27], 9: [25], 10: [23], 11: [21], 12: [19] };

  /* ---------- Hạn năm (Tam tai, Kim lâu, Hoang ốc) ---------- */
  const TAM_TAI = { 0: [2, 3, 4], 2: [8, 9, 10], 1: [11, 0, 1], 3: [5, 6, 7] };
  const HOANG_OC = ['Nhất Cát', 'Nhì Nghi', 'Tam Địa Sát', 'Tứ Tấn Tài', 'Ngũ Thọ Tử', 'Lục Hoang Ốc'];
  const HOANG_OC_BAD = [2, 4, 5];
  const KIM_LAU = { 1: 'Kim Lâu Thân (hại bản thân)', 3: 'Kim Lâu Thê (hại vợ/chồng)', 6: 'Kim Lâu Tử (hại con)', 8: 'Kim Lâu Lục Súc (hại tài sản)' };

  /** Mùa theo tháng lệnh (chi tháng) — dùng cho Vượng/Tướng/Hưu/Tù/Tử và Điều hậu. */
  const SEASON_ELEMENT = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];

  /** Danh sách kinh độ nơi sinh (dùng tính giờ Mặt Trời thực). */
  const PLACES = [
    { id: 'hn', name: 'Hà Nội', lon: 105.85, region: 'bac' },
    { id: 'hcm', name: 'TP. Hồ Chí Minh', lon: 106.70, region: 'nam' },
    { id: 'hp', name: 'Hải Phòng', lon: 106.68, region: 'bac' },
    { id: 'dn', name: 'Đà Nẵng', lon: 108.22, region: 'nam' },
    { id: 'ct', name: 'Cần Thơ', lon: 105.78, region: 'nam' },
    { id: 'hue', name: 'Huế', lon: 107.59, region: 'nam' },
    { id: 'qn', name: 'Quảng Ninh (Hạ Long)', lon: 107.08, region: 'bac' },
    { id: 'lc', name: 'Lào Cai', lon: 103.97, region: 'bac' },
    { id: 'db', name: 'Điện Biên', lon: 103.02, region: 'bac' },
    { id: 'tn', name: 'Thái Nguyên', lon: 105.84, region: 'bac' },
    { id: 'nd', name: 'Nam Định / Ninh Bình', lon: 106.17, region: 'bac' },
    { id: 'th', name: 'Thanh Hóa', lon: 105.78, region: 'bac' },
    { id: 'na', name: 'Nghệ An (Vinh)', lon: 105.68, region: 'bac' },
    { id: 'ht', name: 'Hà Tĩnh', lon: 105.90, region: 'bac' },
    { id: 'qb', name: 'Quảng Bình / Quảng Trị', lon: 106.60, region: 'bac' },
    { id: 'qng', name: 'Quảng Ngãi', lon: 108.80, region: 'nam' },
    { id: 'bd', name: 'Bình Định (Quy Nhơn)', lon: 109.22, region: 'nam' },
    { id: 'kh', name: 'Khánh Hòa (Nha Trang)', lon: 109.19, region: 'nam' },
    { id: 'gl', name: 'Gia Lai (Pleiku)', lon: 108.00, region: 'nam' },
    { id: 'dl', name: 'Đắk Lắk (Buôn Ma Thuột)', lon: 108.04, region: 'nam' },
    { id: 'ld', name: 'Lâm Đồng (Đà Lạt)', lon: 108.44, region: 'nam' },
    { id: 'bdg', name: 'Bình Dương / Đồng Nai', lon: 106.82, region: 'nam' },
    { id: 'vt', name: 'Bà Rịa – Vũng Tàu', lon: 107.08, region: 'nam' },
    { id: 'la', name: 'Long An / Tiền Giang', lon: 106.40, region: 'nam' },
    { id: 'ag', name: 'An Giang / Kiên Giang', lon: 105.13, region: 'nam' },
    { id: 'cm', name: 'Cà Mau / Bạc Liêu', lon: 105.15, region: 'nam' },
    { id: 'custom', name: 'Khác (tự nhập kinh độ)', lon: null, region: 'unknown' },
  ];

  /** Khung giờ 12 canh giờ (có tách Tý sớm / Tý muộn). rep = giờ đại diện để tính. */
  const HOUR_SLOTS = [
    { zhi: 0, label: '00:00–00:59', rep: [0, 30], tag: 'Tý (sớm)' },
    { zhi: 1, label: '01:00–02:59', rep: [2, 0] },
    { zhi: 2, label: '03:00–04:59', rep: [4, 0] },
    { zhi: 3, label: '05:00–06:59', rep: [6, 0] },
    { zhi: 4, label: '07:00–08:59', rep: [8, 0] },
    { zhi: 5, label: '09:00–10:59', rep: [10, 0] },
    { zhi: 6, label: '11:00–12:59', rep: [12, 0] },
    { zhi: 7, label: '13:00–14:59', rep: [14, 0] },
    { zhi: 8, label: '15:00–16:59', rep: [16, 0] },
    { zhi: 9, label: '17:00–18:59', rep: [18, 0] },
    { zhi: 10, label: '19:00–20:59', rep: [20, 0] },
    { zhi: 11, label: '21:00–22:59', rep: [22, 0] },
    { zhi: 0, label: '23:00–23:59', rep: [23, 30], tag: 'Tý (muộn)' },
  ];

  const WEEKDAY_VI = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

  const ganZhiVi = (g, z) => `${GAN_VI[g]} ${ZHI_VI[z]}`;
  const ganZhiHan = (g, z) => `${GAN_HAN[g]}${ZHI_HAN[z]}`;

  NT.data = Object.freeze({
    GAN_HAN, GAN_VI, ZHI_HAN, ZHI_VI, ZHI_ANIMAL, ELEMENTS, ZHI_ELEMENT, ZHI_HIDDEN, HIDDEN_RATIO,
    TEN_GOD_GROUPS, TEN_GOD_SAME, TEN_GOD_DIFF, TIAN_YI, LU, WEN_CHANG, TAM_NUONG, NGUYET_KY,
    DUONG_CONG, TAM_TAI, HOANG_OC, HOANG_OC_BAD, KIM_LAU, SEASON_ELEMENT, PLACES, HOUR_SLOTS, WEEKDAY_VI,
    ganElement, ganYang, zhiElement, generates, controls, relGroup, tenGodOfGan,
    isChong, isLiuHe, isHai, isSanHe, isHinh, isGanHe, isGanChong, yiMaOf, taoHuaOf, ganZhiVi, ganZhiHan,
    ganIndex: (h) => GAN_HAN.indexOf(h),
    zhiIndex: (h) => ZHI_HAN.indexOf(h),
  });
})(globalThis.NT ??= {});
