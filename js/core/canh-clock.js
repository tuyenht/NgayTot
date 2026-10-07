/**
 * NgayTot — Động cơ Tính Toán Canh Giờ Hoàng Đạo Thời Gian Thực & Xuất Hành Lý Thuần Phong.
 * 
 * Nguồn thuật toán:
 *  - 12 Giờ Hoàng Đạo / Hắc Đạo theo Địa Chi ngày (Hiệp Kỷ Biện Phương Thư).
 *  - Phép xuất hành Lục Diệu của Lý Thuần Phong (Đại An, Tốc Hỷ, Lưu Niên, Xích Khẩu, Tiểu Cát, Không Vong:
 *    thứ tự phổ biến ở Việt Nam theo QĐ-16; tập tục dân gian, các nguồn không thống nhất).
 *  - Hướng xuất hành Hỷ Thần, Tài Thần (theo Can ngày) và Hạc Thần (theo vòng 60 can chi của ngày).
 */
(function (NT) {
  'use strict';

  // 12 Chi theo thứ tự
  const CHI_NAMES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const CHI_HOURS = [
    { chi: 'Tý', start: 23, end: 1, label: '23:00 – 00:59' },
    { chi: 'Sửu', start: 1, end: 3, label: '01:00 – 02:59' },
    { chi: 'Dần', start: 3, end: 5, label: '03:00 – 04:59' },
    { chi: 'Mão', start: 5, end: 7, label: '05:00 – 06:59' },
    { chi: 'Thìn', start: 7, end: 9, label: '07:00 – 08:59' },
    { chi: 'Tỵ', start: 9, end: 11, label: '09:00 – 10:59' },
    { chi: 'Ngọ', start: 11, end: 13, label: '11:00 – 12:59' },
    { chi: 'Mùi', start: 13, end: 15, label: '13:00 – 14:59' },
    { chi: 'Thân', start: 15, end: 17, label: '15:00 – 16:59' },
    { chi: 'Dậu', start: 17, end: 19, label: '17:00 – 18:59' },
    { chi: 'Tuất', start: 19, end: 21, label: '19:00 – 20:59' },
    { chi: 'Hợi', start: 21, end: 23, label: '21:00 – 22:59' }
  ];

  // 6 Cung Lục Diệu Lý Thuần Phong, theo thứ tự đếm cung (QĐ-16): Đại An → Tốc Hỷ → Lưu Niên →
  // Xích Khẩu → Tiểu Cát → Không Vong. Thứ tự của mảng chính là thứ tự đếm, không được xếp lại.
  // `short` là nghĩa đen của tên cung, hiện mặc định. `meaning` là lời truyền khẩu, chưa đối chiếu sách:
  // chỉ hiện khi người dùng tự mở, kèm nhãn (không đưa lời khuyên về hướng đi ra mặc định).
  const LY_THUAN_PHONG = [
    {
      id: 'dai_an',
      name: 'Đại An',
      short: 'yên ổn',
      quality: 'good',
      meaning: 'Vạn sự bình an, cầu tài đi hướng Tây Nam, gia đạo yên ổn, người xuất hành bình an vô sự.'
    },
    {
      id: 'toc_hy',
      name: 'Tốc Hỷ',
      short: 'tin vui đến nhanh',
      quality: 'good',
      meaning: 'Tin vui đến nhanh chóng, xuất hành cầu tài sáng sớm hướng Nam đại lợi, việc tiến hành mau lẹ.'
    },
    {
      id: 'luu_nien',
      name: 'Lưu Niên',
      short: 'việc chậm, dây dưa',
      quality: 'bad',
      meaning: 'Mọi sự dây dưa trễ nải, mưu sự khó thành ngay, cần kiên nhẫn, phòng ngừa khẩu thiệt thị phi.'
    },
    {
      id: 'xich_khau',
      name: 'Xích Khẩu',
      short: 'dễ cãi vã',
      quality: 'bad',
      meaning: 'Dễ nảy sinh cãi vã, khẩu thiệt thị phi, bất đồng quan điểm, nên nhường nhịn, thận trọng lời ăn tiếng nói.'
    },
    {
      id: 'tieu_cat',
      name: 'Tiểu Cát',
      short: 'may mắn nhỏ',
      quality: 'good',
      meaning: 'Gặp may mắn nhỏ, giao dịch buôn bán có lợi, người đi sắp về, sức khỏe dồi dào, gia sự êm ấm.'
    },
    {
      id: 'khong_vong',
      name: 'Không Vong',
      short: 'việc khó thành',
      quality: 'bad',
      meaning: 'Cầu tài mịt mờ, xuất hành dễ hao tài tốn của, việc quan trắc trở, nên an phận giữ mình chờ thời.'
    }
  ];

  // Hướng Hỷ Thần & Tài Thần theo Can ngày (0: Giáp, 1: Ất, 2: Bính, ...)
  const DIRECTIONS_BY_CAN = [
    { can: 'Giáp', hyThan: 'Đông Bắc', taiThan: 'Đông Nam' },
    { can: 'Ất', hyThan: 'Tây Bắc', taiThan: 'Đông Nam' },
    { can: 'Bính', hyThan: 'Tây Nam', taiThan: 'Chính Đông' },
    { can: 'Đinh', hyThan: 'Chính Nam', taiThan: 'Chính Đông' },
    { can: 'Mậu', hyThan: 'Đông Nam', taiThan: 'Chính Bắc' },
    { can: 'Kỷ', hyThan: 'Đông Bắc', taiThan: 'Chính Nam' },
    { can: 'Canh', hyThan: 'Tây Bắc', taiThan: 'Tây Nam' },
    { can: 'Tân', hyThan: 'Tây Nam', taiThan: 'Tây Nam' },
    { can: 'Nhâm', hyThan: 'Chính Nam', taiThan: 'Tây Bắc' },
    { can: 'Quý', hyThan: 'Đông Nam', taiThan: 'Chính Tây' }
  ];

  // Hạc Thần đi theo vòng 60 can chi của ngày (không phải theo chi ngày): từ Kỷ Dậu lần lượt
  // ở Đông Bắc 6 ngày, Đông 5, Đông Nam 6, Nam 5, Tây Nam 6, Tây 5, Tây Bắc 6, Bắc 5; 16 ngày còn lại
  // (Quý Tỵ đến Mậu Thân) ở trên trời, không phương nào phải tránh.
  const HAC_THAN_SPANS = [
    [6, 'Đông Bắc'], [5, 'Chính Đông'], [6, 'Đông Nam'], [5, 'Chính Nam'],
    [6, 'Tây Nam'], [5, 'Chính Tây'], [6, 'Tây Bắc'], [5, 'Chính Bắc']
  ];
  const HAC_THAN_ON_HEAVEN = 'Ở trên trời (không phương nào phải tránh)';
  function hacThanDirection(canIdx, chiIdx) {
    if (canIdx < 0 || chiIdx < 0) return '';
    const cycle = (((6 * canIdx - 5 * chiIdx) % 60) + 60) % 60; // Giáp Tý = 0
    let k = (cycle - 45 + 60) % 60;                             // Kỷ Dậu = 45
    for (const [len, dir] of HAC_THAN_SPANS) {
      if (k < len) return dir;
      k -= len;
    }
    return HAC_THAN_ON_HEAVEN;
  }

  /**
   * Xác định chi giờ tương ứng với một mốc thời gian cụ thể (giờ, phút).
   */
  function getChiHourIndex(hours, minutes = 0) {
    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes >= 23 * 60 || totalMinutes < 1 * 60) return 0; // Tý
    return Math.floor((totalMinutes - 60) / 120) + 1;
  }

  /**
   * Tính toán thời gian còn lại của canh giờ hiện tại.
   */
  function getCurrentCanhStatus(now = new Date()) {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    const chiIdx = getChiHourIndex(hours, minutes);
    const chiInfo = CHI_HOURS[chiIdx];

    // Tính số phút đã trôi qua và số phút còn lại trong canh (mỗi canh 120 phút)
    let startMinutes;
    if (chiIdx === 0) {
      startMinutes = hours === 23 ? 23 * 60 : -60; // Tý bắt đầu từ 23:00 hôm trước
    } else {
      startMinutes = chiInfo.start * 60;
    }
    const currentTotalMin = hours * 60 + minutes;
    const elapsedMinutes = (currentTotalMin - startMinutes + 1440) % 1440;
    const remainingMinutes = 120 - elapsedMinutes;
    const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMinutes / 120) * 100)));

    const nextChiIdx = (chiIdx + 1) % 12;
    const nextChi = CHI_NAMES[nextChiIdx];

    return {
      chiIndex: chiIdx,
      chiName: chiInfo.chi,
      timeSpan: chiInfo.label,
      elapsedMinutes,
      remainingMinutes,
      progressPercent,
      nextChi,
      currentTimeStr: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    };
  }

  /**
   * Tính quẻ Lục Diệu Lý Thuần Phong cho một giờ xuất hành cụ thể trong ngày âm lịch.
   * @param {number} lunarMonth Tháng âm lịch (1-12)
   * @param {number} lunarDay Ngày âm lịch (1-30)
   * @param {number} chiHourIdx Chi của giờ (0: Tý, 1: Sửu ... 11: Hợi)
   */
  function getLyThuanPhong(lunarMonth, lunarDay, chiHourIdx) {
    // Chi giờ trong công thức cổ: Tý=1, Sửu=2 ... Hợi=12
    const hourNum = chiHourIdx + 1;
    // Tháng giêng khởi Đại An, mùng 1 ở ngay cung của tháng, giờ Tý ở ngay cung của ngày:
    // mùng 1 tháng giêng giờ Tý là Đại An (chỉ số 0), nên trừ 3.
    const rem = ((lunarMonth + lunarDay + hourNum - 3) % 6 + 6) % 6;
    return LY_THUAN_PHONG[rem];
  }

  /**
   * Lấy hướng xuất hành Hỷ Thần, Tài Thần, Hạc Thần theo can chi ngày.
   */
  function getDirections(canName, chiName) {
    const dirObj = DIRECTIONS_BY_CAN.find(d => d.can === canName) || { hyThan: 'Chính Nam', taiThan: 'Chính Đông' };
    const hacThan = hacThanDirection(DIRECTIONS_BY_CAN.findIndex(d => d.can === canName), CHI_NAMES.indexOf(chiName));

    return {
      hyThan: dirObj.hyThan,
      taiThan: dirObj.taiThan,
      hacThan: hacThan
    };
  }

  /**
   * Tính danh sách 12 giờ hoàng đạo / hắc đạo cho một ngày cụ thể dựa vào Chi ngày.
   */
  function getDayHoursDetails(dayChiName, lunarMonth, lunarDay) {
    // Bảng 12 sao Hoàng/Hắc đạo:
    // Thanh Long (HĐ), Minh Đường (HĐ), Thiên Hình (Hắc), Chu Tước (Hắc),
    // Kim Quỹ (HĐ), Bảo Quang (HĐ), Bạch Hổ (Hắc), Ngọc Đường (HĐ),
    // Thiên Lao (Hắc), Huyền Vũ (Hắc), Tư Mệnh (HĐ), Câu Trận (Hắc).
    const STAR_NAMES = [
      { name: 'Thanh Long', isHuangDao: true },
      { name: 'Minh Đường', isHuangDao: true },
      { name: 'Thiên Hình', isHuangDao: false },
      { name: 'Chu Tước', isHuangDao: false },
      { name: 'Kim Quỹ', isHuangDao: true },
      { name: 'Bảo Quang', isHuangDao: true },
      { name: 'Bạch Hổ', isHuangDao: false },
      { name: 'Ngọc Đường', isHuangDao: true },
      { name: 'Thiên Lao', isHuangDao: false },
      { name: 'Huyền Vũ', isHuangDao: false },
      { name: 'Tư Mệnh', isHuangDao: true },
      { name: 'Câu Trận', isHuangDao: false }
    ];

    // Điểm bắt đầu Thanh Long theo Chi ngày
    // Tý/Ngọ: Thân | Sửu/Mùi: Tuất | Dần/Thân: Tý | Mão/Dậu: Dần | Thìn/Tuất: Thìn | Tỵ/Hợi: Ngọ
    const START_OFFSET = {
      'Tý': 8, 'Ngọ': 8,      // Thân = idx 8
      'Sửu': 10, 'Mùi': 10,   // Tuất = idx 10
      'Dần': 0, 'Thân': 0,    // Tý = idx 0
      'Mão': 2, 'Dậu': 2,     // Dần = idx 2
      'Thìn': 4, 'Tuất': 4,   // Thìn = idx 4
      'Tỵ': 6, 'Hợi': 6       // Ngọ = idx 6
    };

    const startChi = START_OFFSET[dayChiName] ?? 0;

    return CHI_HOURS.map((ch, idx) => {
      // Khoảng cách từ startChi tới giờ idx
      const starIdx = (idx - startChi + 12) % 12;
      const star = STAR_NAMES[starIdx];
      const ltp = getLyThuanPhong(lunarMonth, lunarDay, idx);

      return {
        chiIndex: idx,
        chi: ch.chi,
        label: ch.label,
        startHour: ch.start,
        endHour: ch.end,
        starName: star.name,
        isHuangDao: star.isHuangDao,
        lyThuanPhong: ltp
      };
    });
  }

  // Ngày hoàng đạo tra theo THÁNG ÂM (cách thứ hai nêu ở QĐ-16; chưa có sách xác nhận): Thanh Long khởi tại
  // Tý (tháng 1, 7), Dần (2, 8), Thìn (3, 9), Ngọ (4, 10), Thân (5, 11), Tuất (6, 12); ngày hoàng đạo
  // là các chi cách điểm khởi 0, 1, 4, 5, 7, 10 (Thanh Long, Minh Đường, Kim Quỹ, Bảo Quang, Ngọc Đường, Tư Mệnh).
  const HOANG_DAO_OFFSETS = [0, 1, 4, 5, 7, 10];
  function isHoangDaoByLunarMonth(lunarMonth, dayChiIdx) {
    const start = ((lunarMonth - 1) % 6) * 2;
    return HOANG_DAO_OFFSETS.includes(((dayChiIdx - start) % 12 + 12) % 12);
  }

  /**
   * So hai cách xác định ngày hoàng đạo cho một ngày dương (QĐ-16). Phần lõi (chọn ngày, lịch tháng)
   * dùng cách theo tiết khí; cách theo tháng âm chỉ để ghi chú, không dùng để tính điểm.
   * Tháng nhuận tra theo bảng của tháng mang cùng số (tháng 6 nhuận tra như tháng 6).
   * @returns {{bySolarTerm: boolean, byLunarMonth: boolean, differs: boolean}|null} null nếu không tính được
   */
  function compareDayHoangDao(d, m, y) {
    try {
      const lunarLib = globalThis.Solar.fromYmd(y, m, d).getLunar();
      const bySolarTerm = lunarLib.getDayTianShenType() === '黄道';
      const byLunarMonth = isHoangDaoByLunarMonth(NT.calendar.solarToLunar(d, m, y).month, lunarLib.getDayZhiIndex());
      return { bySolarTerm, byLunarMonth, differs: bySolarTerm !== byLunarMonth };
    } catch {
      return null;
    }
  }
  NT.canhClock = Object.freeze({
    CHI_NAMES,
    CHI_HOURS,
    LY_THUAN_PHONG,
    getChiHourIndex,
    getCurrentCanhStatus,
    getLyThuanPhong,
    getDirections,
    getDayHoursDetails,
    isHoangDaoByLunarMonth,
    compareDayHoangDao
  });

})(globalThis.NT ??= {});
