/**
 * NgayTot — Module tính toán Ngày Giỗ Gia Tiên & Hệ thống nhắc nhở đa tầng hàng năm.
 * Hỗ trợ chuyển đổi Âm -> Dương, xử lý tháng thiếu (ngày 30 -> 29), tháng nhuận,
 * đếm ngược ngày, các mốc nhắc nhở tùy chỉnh (2 tuần, 1 tuần, 2 ngày, ngày chính kỵ),
 * danh mục checklist việc cần làm và sinh văn khấn cúng giỗ tự động điền sẵn thông tin.
 */
(function (NT) {
  'use strict';

  const DEFAULT_MILESTONES = Object.freeze([
    {
      daysBefore: 14,
      label: '2 tuần trước',
      shortLabel: 'Trước 2 tuần',
      stage: 'planning',
      title: 'Họp bàn & Lên kế hoạch lễ Giỗ',
      checklist: [
        'Họp bàn gia đình, chốt số lượng mâm cỗ (cỗ mặn / cỗ chay)',
        'Lên danh sách khách mời, anh em họ hàng nội ngoại',
        'Phân công phụ trách mua sắm lễ vật và nấu nướng',
        'Báo tin trước cho người thân ở xa để kịp sắp xếp thời gian về dự'
      ]
    },
    {
      daysBefore: 7,
      label: '1 tuần trước',
      shortLabel: 'Trước 1 tuần',
      stage: 'preparation',
      title: 'Dọn dẹp ban thờ & Đặt lễ',
      checklist: [
        'Bao sái, lau dọn ban thờ gia tiên, đánh bóng lư hương, đồ đồng',
        'Đặt trước thực phẩm tươi ngon, bánh trái, hoa tươi',
        'Kiểm tra lại trầu cau, tiền vàng mã, hương trầm',
        'Nhắc lại anh em họ hàng ngày giờ cụ thể'
      ]
    },
    {
      daysBefore: 2,
      label: '2 ngày trước (Tiên Thường)',
      shortLabel: 'Trước 2 ngày',
      stage: 'eve',
      title: 'Chuẩn bị Lễ Cúng Tiên Thường (Cáo Giỗ)',
      checklist: [
        'Sắm sửa mâm cỗ cúng chiều hôm trước (Lễ Tiên Thường - chiều hôm trước ngày chính kỵ)',
        'Hoàn tất mua sắm vàng mã, hoa quả, đồ cúng',
        'Dọn dẹp khuôn viên nhà cửa, bàn ghế tiếp đón họ hàng',
        'Rà soát bài văn khấn cúng giỗ và phân công chủ tế'
      ]
    },
    {
      daysBefore: 0,
      label: 'Chính Kỵ (Ngày Giỗ chính)',
      shortLabel: 'Hôm nay',
      stage: 'ceremony',
      title: 'Ngày Giỗ Chính Kỵ',
      checklist: [
        'Bao sái nhẹ lại bàn thờ, thay nước chén thờ, châm trà, cắm hoa tươi',
        'Bày biện mâm cỗ cúng gia tiên tươm tất trước giờ Ngọ (11h-12h trưa)',
        'Thắp hương, chủ tế đọc bài văn khấn cúng giỗ trang trọng',
        'Hóa vàng mã sau khi tàn hương và thụ lộc cùng gia đình'
      ]
    }
  ]);

  /**
   * Tính ngày Dương lịch của ngày Giỗ cho một năm Dương lịch cụ thể.
   * Xử lý trường hợp tháng thiếu (ngày 30 -> 29) và tháng nhuận.
   *
   * @param {number} lunarDay Ngày âm lịch (1..30)
   * @param {number} lunarMonth Tháng âm lịch (1..12)
   * @param {number} targetSolarYear Năm dương lịch cần tính (1929..2100)
   * @param {boolean} isLeapMonth Ngày mất ban đầu có rơi vào tháng nhuận hay không
   * @returns {{
   *   solarDay: number,
   *   solarMonth: number,
   *   solarYear: number,
   *   solarDateStr: string,
   *   adjustedDay: boolean,
   *   originalDay: number,
   *   fallbackFromLeap: boolean,
   *   actualLunarMonth: number,
   *   isLeap: boolean
   * }|null}
   */
  function getAnniversarySolarDate(lunarDay, lunarMonth, targetSolarYear, isLeapMonth = false) {
    if (!NT.calendar || typeof NT.calendar.lunarToSolar !== 'function') {
      throw new Error('Module calendar-vn.js chưa được nạp!');
    }

    // Một ngày âm của tháng 11, 12 có thể rơi hai lần vào cùng một năm dương (đầu tháng 1 và cuối tháng 12):
    // trả lần sớm nhất; cần đủ các lần thì dùng getAnniversaryOccurrences.
    return getAnniversaryOccurrences(lunarDay, lunarMonth, targetSolarYear, isLeapMonth)[0] ?? null;
  }

  /** Ngày giỗ của MỘT năm âm lịch (mỗi năm âm đúng một lần giỗ), hoặc null nếu dữ liệu sai. */
  function occurrenceInLunarYear(lunarDay, lunarMonth, lYear, isLeapMonth = false) {
    if (!NT.calendar || typeof NT.calendar.lunarToSolar !== 'function') {
      throw new Error('Module calendar-vn.js chưa được nạp!');
    }
    if (!Number.isInteger(lunarDay) || !Number.isInteger(lunarMonth) || lunarDay < 1 || lunarDay > 30 || lunarMonth < 1 || lunarMonth > 12) return null;

    // Thứ tự thử: đúng ngày, đúng tháng (nhuận nếu ngày mất ở tháng nhuận) -> ngày 30 gặp tháng thiếu thì
    // lùi về 29 của CHÍNH tháng đó -> năm không nhuận tháng ấy thì giỗ theo tháng thường (30 rồi 29).
    const tries = [[lunarDay, isLeapMonth]];
    if (lunarDay === 30) tries.push([29, isLeapMonth]);
    if (isLeapMonth) {
      tries.push([lunarDay, false]);
      if (lunarDay === 30) tries.push([29, false]);
    }
    let sol = null;
    let adjustedDay = false;
    let fallbackFromLeap = false;
    let actualLeap = isLeapMonth;
    for (const [day, leap] of tries) {
      sol = NT.calendar.lunarToSolar(day, lunarMonth, lYear, leap);
      if (sol) {
        adjustedDay = day !== lunarDay;
        fallbackFromLeap = isLeapMonth && !leap;
        actualLeap = leap;
        break;
      }
    }
    if (!sol) return null;

    const [d, m, y] = sol;
    return {
      solarDay: d,
      solarMonth: m,
      solarYear: y,
      solarDateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      lunarYear: lYear,
      adjustedDay,
      originalDay: lunarDay,
      fallbackFromLeap,
      actualLunarMonth: lunarMonth,
      isLeap: actualLeap
    };
  }

  /** Mọi lần giỗ rơi vào một năm dương lịch (0, 1 hoặc 2 lần), xếp từ sớm đến muộn. */
  function getAnniversaryOccurrences(lunarDay, lunarMonth, targetSolarYear, isLeapMonth = false) {
    const out = [];
    // Ngày âm của năm âm Y rơi vào năm dương Y hoặc Y + 1
    for (const lYear of [targetSolarYear - 1, targetSolarYear]) {
      const occ = occurrenceInLunarYear(lunarDay, lunarMonth, lYear, isLeapMonth);
      if (occ && occ.solarYear === targetSolarYear) out.push(occ);
    }
    return out.sort((a, b) => a.solarDateStr.localeCompare(b.solarDateStr));
  }

  /** Lần giỗ gần nhất tính từ một ngày (kể cả chính ngày đó). */
  function nextAnniversaryOccurrence(lunarDay, lunarMonth, fromDate, isLeapMonth = false) {
    const y = fromDate.getFullYear();
    const fromStr = `${y}-${String(fromDate.getMonth() + 1).padStart(2, '0')}-${String(fromDate.getDate()).padStart(2, '0')}`;
    for (const lYear of [y - 1, y, y + 1]) {
      const occ = occurrenceInLunarYear(lunarDay, lunarMonth, lYear, isLeapMonth);
      if (occ && occ.solarDateStr >= fromStr) return occ;
    }
    return null;
  }

  /**
   * Tính toán đếm ngược và trạng thái các mốc nhắc nhở của một sự kiện Giỗ.
   *
   * @param {Object} anniversary Sự kiện ngày giỗ ({ lunarDay, lunarMonth, isLeap, ... })
   * @param {Date} [currentDate=new Date()] Ngày hiện tại để so sánh
   * @param {Array<number>} [customDaysBefore] Danh sách mốc số ngày nhắc trước tùy chỉnh
   * @returns {{
   *   nextSolarDate: Object,
   *   daysLeft: number,
   *   isToday: boolean,
   *   isUpcoming: boolean,
   *   milestones: Array<Object>,
   *   activeMilestone: Object|null
   * }}
   */
  function calculateAnniversaryReminders(anniversary, currentDate = new Date(), customDaysBefore = null) {
    if (typeof currentDate === 'number') {
      currentDate = new Date(currentDate, 0, 1);
    } else if (!(currentDate instanceof Date) || isNaN(currentDate.getTime())) {
      currentDate = new Date();
    }
    const curY = currentDate.getFullYear();
    const curM = currentDate.getMonth() + 1;
    const curD = currentDate.getDate();

    // Lần giỗ gần nhất từ hôm nay (hỗ trợ cả isLeap và isLeapMonth)
    const isLeap = !!(anniversary.isLeapMonth ?? anniversary.isLeap);
    const sol = nextAnniversaryOccurrence(Number(anniversary.lunarDay), Number(anniversary.lunarMonth), currentDate, isLeap);

    if (!sol) {
      const displayName = anniversary.name || anniversary.deceasedName || 'Gia Tiên';
      throw new Error(`Không thể tính ngày giỗ cho ${displayName} (Âm lịch: ${anniversary.lunarDay}/${anniversary.lunarMonth})`);
    }

    // Gắn thêm aliases cho sol để tương thích mọi giao diện
    sol.day = sol.solarDay;
    sol.month = sol.solarMonth;
    sol.year = sol.solarYear;

    // Thứ trong tuần cho ngày giỗ
    const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const targetDateObj = new Date(sol.solarYear, sol.solarMonth - 1, sol.solarDay);
    const weekday = WEEKDAYS[targetDateObj.getDay()];

    // Tính số ngày còn lại (daysLeft)
    const targetMidnight = targetDateObj.getTime();
    const currentMidnight = new Date(curY, curM - 1, curD).getTime();
    const daysLeft = Math.round((targetMidnight - currentMidnight) / 864e5);

    // Xây dựng danh sách mốc nhắc nhở
    const daysConfig = Array.isArray(customDaysBefore) && customDaysBefore.length > 0
      ? [...new Set(customDaysBefore)].sort((a, b) => b - a)
      : [14, 7, 2, 0];

    const milestones = daysConfig.map((db) => {
      const defaultInfo = DEFAULT_MILESTONES.find((m) => m.daysBefore === db);
      const mDateMs = targetMidnight - db * 864e5;
      const mDate = new Date(mDateMs);
      const isTriggered = daysLeft <= db;
      const isCurrent = daysLeft === db;

      return {
        daysBefore: db,
        label: defaultInfo ? defaultInfo.label : `Trước ${db} ngày`,
        shortLabel: defaultInfo ? defaultInfo.shortLabel : `${db} ngày`,
        title: defaultInfo ? defaultInfo.title : `Nhắc nhở trước ${db} ngày`,
        checklist: defaultInfo ? defaultInfo.checklist : [`Chuẩn bị lễ nghi trước ${db} ngày`],
        notifyDate: {
          day: mDate.getDate(),
          month: mDate.getMonth() + 1,
          year: mDate.getFullYear(),
          dateStr: `${mDate.getFullYear()}-${String(mDate.getMonth() + 1).padStart(2, '0')}-${String(mDate.getDate()).padStart(2, '0')}`
        },
        solarDate: {
          day: mDate.getDate(),
          month: mDate.getMonth() + 1,
          year: mDate.getFullYear()
        },
        passed: isTriggered,
        isToday: isCurrent,
        isTriggered,
        isCurrent
      };
    });

    // Tìm mốc gần nhất đang áp dụng
    let activeMilestone = null;
    for (const m of milestones) {
      if (daysLeft >= m.daysBefore) {
        activeMilestone = m;
        break;
      }
    }
    if (!activeMilestone && daysLeft >= 0) {
      activeMilestone = milestones[milestones.length - 1]; // Chính kỵ
    }

    const allChecklist = milestones.flatMap(m => m.checklist);

    return {
      nextSolarDate: sol,
      daysLeft,
      isToday: daysLeft === 0,
      isUpcoming: daysLeft > 0 && daysLeft <= 14,
      milestones,
      reminders: milestones,
      activeMilestone,
      checklist: allChecklist,
      weekday,
      lunarDateObj: { weekday }
    };
  }

  /**
   * Tạo nội dung bài Văn Khấn Cúng Giỗ Gia Tiên chuẩn cổ truyền,
   * tự động điền sẵn thông tin gia chủ và người được thờ cúng.
   *
   * @param {Object} anniversary Thông tin người quá cố ({ name, relationship, burialPlace, lunarDay, lunarMonth, note })
   * @param {Object} [profile={}] Thông tin gia chủ ({ fullName, birthYear, address, role })
   * @param {'chinh_ky'|'tien_thuong'} [ritualType='chinh_ky'] Loại lễ (Chính kỵ hoặc Tiên thường)
   * @returns {{ title: string, content: string }}
   */
  function generateAnniversaryPrayer(anniversary, profile = {}, ritualType = 'chinh_ky') {
    const isChinhKy = ritualType === 'chinh_ky';
    const title = isChinhKy
      ? `Văn Khấn Ngày Chính Giỗ (${anniversary.relationship || 'Gia Tiên'})`
      : `Văn Khấn Lễ Cáo Giỗ / Tiên Thường (${anniversary.relationship || 'Gia Tiên'})`;

    const hostName = profile.fullName ? profile.fullName.trim() : '[Họ và tên gia chủ]';
    const hostYear = profile.birthYear ? `sinh năm ${profile.birthYear}` : '[Năm sinh gia chủ]';
    const address = profile.address ? profile.address.trim() : '[Địa chỉ nơi ngụ tại: Thôn/Xã/Phường, Quận/Huyện, Tỉnh/Thành phố]';
    const deceasedName = anniversary.name ? anniversary.name.trim() : '[Tên người quá cố]';
    const relation = anniversary.relationship ? anniversary.relationship.trim() : '[Quan hệ: Cụ/Ông/Bà/Bố/Mẹ]';
    const burial = anniversary.burialPlace ? `Mộ phần táng tại: ${anniversary.burialPlace}.` : '';

    const content = `NAM MÔ A DI ĐÀ PHẬT! (3 lần, 3 lạy)

- Con lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
- Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
- Con kính lạy ngài Bản cảnh Thành Hoàng, ngài Bản xứ Thổ địa, ngài Bản gia Táo quân cùng chư vị Tôn thần.
- Con kính lạy Tổ Tiên, Hiển khảo, Hiển tỷ, chư vị Hương linh nội ngoại họ tộc.

Tín chủ (chúng) con là: ${hostName}, ${hostYear}.
Ngụ tại: ${address}.

Hôm nay là ngày ${anniversary.lunarDay} tháng ${anniversary.lunarMonth} âm lịch, thiết tưởng ngày cát nhật lương thần.
Nhân gặp ngày ${isChinhKy ? 'Chính Kỵ' : 'Tiên Thường (Cáo Giỗ)'} của Cố hương linh: ${relation} ${deceasedName}.
${burial}

Thiết nghĩ: Ơn dưỡng dục cao dày như non thái, đức sinh thành tựa biển đông. Nay gặp ngày húy nhật, chúng con cùng toàn thể con cháu trong gia quyến tề tựu trước linh sàng, kính cẩn dâng lên mâm hương hoa phù tửu, thanh trai quả phẩm, kim ngân minh bảo, đốt nén hương thơm thành tâm kính cáo.

Chúng con xin cúi đầu kính mời: Cố hương linh ${relation} ${deceasedName},
Cùng các vị Tiên linh phụng thờ nội ngoại đồng lai hâm hưởng.
Cúi xin Thần linh Thổ địa, Táo quân chứng giám lòng thành, phù hộ độ trì cho toàn gia an khang thịnh vượng, già trẻ bình an, đỗ đạt công danh, sở cầu như ý, tứ thời bát tiết được chữ bình an.

Chúng con lễ bạc tâm thành, trước án kính lễ, cúi xin lượng cả từ bi giáng lâm chứng giám.

NAM MÔ A DI ĐÀ PHẬT! (3 lần, 3 lạy)`;

    return { title, content };
  }

  NT.anniversary = Object.freeze({
    DEFAULT_MILESTONES,
    getAnniversarySolarDate,
    getAnniversaryOccurrences,
    nextAnniversaryOccurrence,
    calculateAnniversaryReminders,
    generateAnniversaryPrayer
  });
})(globalThis.NT ??= {});
