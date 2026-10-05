/**
 * NgayTot — Giới hạn pháp luật Việt Nam (PRD §3.2, §8.3, §10).
 * Bảng giới hạn pháp luật được cấu trúc dạng dữ liệu (data-driven), có cờ verified: false
 * kèm số hiệu văn bản pháp quy. Đây là căn cứ duy nhất được phép loại hoặc cảnh báo cứng ngày/giờ.
 * Số văn bản lấy theo PRD §3.2. Cờ verified chỉ đổi thành true khi đã đối chiếu văn bản gốc
 * còn hiệu lực ngay trước lần phát hành.
 */
(function (NT) {
  'use strict';

  const LEGAL_LIMITS = Object.freeze({
    UNDERAGE_MARRIAGE: {
      id: 'LEGAL_UNDERAGE_MARRIAGE',
      name: 'Độ tuổi kết hôn theo pháp luật',
      doc: 'Luật Hôn nhân và gia đình 2014, Điều 8 khoản 1 điểm a',
      verified: false,
      severity: 'hard_warning', // Cảnh báo cứng
      desc: 'Nam từ đủ 20 tuổi, Nữ từ đủ 18 tuổi mới được kết hôn. Tuổi tính theo ngày tháng năm sinh dương lịch.',
      minAgeMale: 20,
      minAgeFemale: 18,
    },
    BURIAL_TIME_EXCEEDED: {
      id: 'LEGAL_BURIAL_TIME_EXCEEDED',
      name: 'Thời gian lưu giữ thi hài (quàn)',
      doc: 'Thông tư 21/2021/TT-BYT, Điều 4 và Điều 13 khoản 1',
      verified: false,
      severity: 'block', // Loại ngày nếu vượt
      desc: 'Thời gian quàn không quá 48 giờ kể từ khi chết nếu không bảo quản lạnh; không quá 7 ngày nếu bảo quản lạnh từ 4°C trở xuống; lâu hơn chỉ khi bảo quản từ −10°C trở xuống. Người chết do dịch bệnh nguy hiểm: không quá 24 giờ kể từ khi chết hoặc phát hiện thi thể, trừ khi bảo quản từ −10°C trở xuống.',
      maxHoursNormal: 48,
      maxHoursCold: 168, // 7 ngày, bảo quản lạnh ≤ 4°C
      maxHoursInfectious: 24,
      // Bảo quản ≤ −10°C: thông tư không đặt giới hạn thời gian.
    },
    REBURIAL_TOO_EARLY: {
      id: 'LEGAL_REBURIAL_TOO_EARLY',
      name: 'Khoảng cách cải táng tối thiểu',
      doc: 'Thông tư 21/2021/TT-BYT, Điều 9 khoản 1',
      verified: false,
      severity: 'block',
      desc: 'Thời gian từ khi mai táng đến khi cải táng không dưới 36 tháng (người không chết do dịch bệnh nguy hiểm).',
      minMonths: 36,
    },
    NOISE_WINDOW: {
      id: 'LEGAL_NOISE_WINDOW',
      name: 'Khung giờ nhạc trong đám cưới, đám tang',
      doc: 'Thông tư 04/2011/TT-BVHTTDL',
      verified: false,
      severity: 'warning', // Cảnh báo
      desc: 'Nhạc trong đám cưới, đám tang chỉ trong khoảng 06:00–22:00. Ngoài ra, từ 15/12/2025 hành vi gây ồn ào ở khu dân cư có thể bị xử phạt ở mọi khung giờ (Nghị định 282/2025/NĐ-CP).',
      startHour: 6,
      endHour: 22,
    },
  });

  /**
   * Quy định của tỉnh về thời gian từ khi mất đến đưa tang (giờ). Giới hạn hiệu lực là giới hạn
   * CHẶT NHẤT giữa quốc gia và tỉnh (PRD §3.2): quy định tỉnh không bao giờ nới giới hạn quốc gia.
   */
  const PROVINCE_BURIAL_HOURS = Object.freeze({
    hue: { hours: 72, doc: 'Quy định của thành phố Huế về tổ chức lễ tang (theo PRD §3.2)', verified: false },
  });

  /**
   * Giới hạn quàn hiệu lực, tính bằng giờ (Infinity = không giới hạn thời gian).
   * @param {{storageType?: 'none'|'cold'|'frozen', isInfectious?: boolean, province?: string}} p
   */
  function burialLimitHours(p = {}) {
    const B = LEGAL_LIMITS.BURIAL_TIME_EXCEEDED;
    let national;
    if (p.storageType === 'frozen') national = Infinity; // ≤ −10°C
    else if (p.isInfectious) national = B.maxHoursInfectious;
    else if (p.storageType === 'cold') national = B.maxHoursCold; // ≤ 4°C
    else national = B.maxHoursNormal;
    const prov = PROVINCE_BURIAL_HOURS[p.province]?.hours ?? Infinity;
    return Math.min(national, prov);
  }

  /** Tính tuổi tròn dương lịch tại thời điểm targetDate ('YYYY-MM-DD'). */
  function exactAge(birthDateStr, targetDateStr) {
    if (!birthDateStr || !targetDateStr) return null;
    const [by, bm, bd] = birthDateStr.split('-').map(Number);
    const [ty, tm, td] = targetDateStr.split('-').map(Number);
    let age = ty - by;
    if (tm < bm || (tm === bm && td < bd)) age--;
    return age;
  }

  /**
   * Kiểm tra điều kiện pháp luật cho một hoạt động cụ thể.
   * @param {object} act Hoạt động (activities)
   * @param {object} chart Hồ sơ / lá số người xem
   * @param {string} targetDate 'YYYY-MM-DD'
   * @param {string} [timeStr] 'HH:MM'
   * @param {object} [contextParams] Tham số bổ sung: deathTime (thời điểm mất hoặc phát hiện thi thể),
   *   storageType ('none' | 'cold' ≤ 4°C | 'frozen' ≤ −10°C), isInfectious, province ('hue'),
   *   spouseBirthDate, spouseGender. Giao diện hiện chưa có ô nhập các tham số này (PRD §14.2 dòng 25).
   */
  function checkLegal(act, chart, targetDate, timeStr, contextParams = {}) {
    const flags = [];
    if (!act) return flags;

    // 1. Kiểm tra tuổi kết hôn
    if (act.checkUnderageMarriage) {
      const p = chart?.profile;
      if (p?.birthDate) {
        const age = exactAge(p.birthDate, targetDate);
        const minAge = p.gender === 'female' ? LEGAL_LIMITS.UNDERAGE_MARRIAGE.minAgeFemale : LEGAL_LIMITS.UNDERAGE_MARRIAGE.minAgeMale;
        if (age !== null && age < minAge) {
          flags.push({
            rule: LEGAL_LIMITS.UNDERAGE_MARRIAGE,
            message: `Cảnh báo pháp luật: Người xem (${p.gender === 'female' ? 'Nữ' : 'Nam'}) chưa đủ ${minAge} tuổi vào ngày này (hiện ${age} tuổi), chưa đủ điều kiện đăng ký kết hôn theo Luật Hôn nhân và gia đình.`,
            severity: LEGAL_LIMITS.UNDERAGE_MARRIAGE.severity,
          });
        }
      }
      // Nếu có thông tin người phối ngẫu
      if (contextParams.spouseBirthDate) {
        const spouseAge = exactAge(contextParams.spouseBirthDate, targetDate);
        const spouseMin = contextParams.spouseGender === 'female' ? LEGAL_LIMITS.UNDERAGE_MARRIAGE.minAgeFemale : LEGAL_LIMITS.UNDERAGE_MARRIAGE.minAgeMale;
        if (spouseAge !== null && spouseAge < spouseMin) {
          flags.push({
            rule: LEGAL_LIMITS.UNDERAGE_MARRIAGE,
            message: `Cảnh báo pháp luật: Người phối ngẫu (${contextParams.spouseGender === 'female' ? 'Nữ' : 'Nam'}) chưa đủ ${spouseMin} tuổi vào ngày này (hiện ${spouseAge} tuổi).`,
            severity: LEGAL_LIMITS.UNDERAGE_MARRIAGE.severity,
          });
        }
      }
    }

    // 2. Kiểm tra giờ âm thanh, tiếng ồn (06:00 - 22:00)
    if (act.checkNoise && timeStr) {
      const [hh] = timeStr.split(':').map(Number);
      if (Number.isFinite(hh) && (hh < LEGAL_LIMITS.NOISE_WINDOW.startHour || hh >= LEGAL_LIMITS.NOISE_WINDOW.endHour)) {
        flags.push({
          rule: LEGAL_LIMITS.NOISE_WINDOW,
          message: `Lưu ý pháp luật: Giờ ${timeStr} nằm ngoài khung 06:00–22:00 mà Thông tư 04/2011/TT-BVHTTDL quy định cho nhạc đám cưới, đám tang. Hãy hạn chế âm thanh, loa đài, kèn trống.`,
          severity: LEGAL_LIMITS.NOISE_WINDOW.severity,
        });
      }
    }

    // 3. Kiểm tra thời gian quàn / lưu giữ thi hài
    if (act.checkBurialTime && contextParams.deathTime) {
      const deathMs = Date.parse(contextParams.deathTime);
      const [y, m, d] = targetDate.split('-').map(Number);
      const [hh, mi] = (timeStr || '12:00').split(':').map(Number);
      const targetMs = Date.UTC(y, m - 1, d, hh - 7, mi); // UTC ms quy từ UTC+7
      if (!Number.isNaN(deathMs) && targetMs > deathMs) {
        const diffHours = (targetMs - deathMs) / 3600e3;
        const limitHours = burialLimitHours(contextParams);
        const byProvince = limitHours < burialLimitHours({ ...contextParams, province: undefined });

        if (diffHours > limitHours) {
          flags.push({
            rule: LEGAL_LIMITS.BURIAL_TIME_EXCEEDED,
            message: `Lưu ý pháp luật: Thời gian từ khi mất đến thời điểm này là ${Math.round(diffHours)} giờ, vượt giới hạn ${limitHours} giờ ${byProvince ? 'theo quy định của địa phương' : 'theo Thông tư 21/2021/TT-BYT'}.`,
            severity: LEGAL_LIMITS.BURIAL_TIME_EXCEEDED.severity,
          });
        }
      }
    }

    return flags;
  }

  NT.legal = Object.freeze({
    LEGAL_LIMITS,
    PROVINCE_BURIAL_HOURS,
    burialLimitHours,
    exactAge,
    checkLegal,
  });
})(globalThis.NT ??= {});
