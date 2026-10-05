/**
 * NgayTot — Giới hạn pháp luật Việt Nam (PRD §3.2, §8.3, §10).
 * Bảng giới hạn pháp luật được cấu trúc dạng dữ liệu (data-driven), có cờ verified: false
 * kèm số hiệu văn bản pháp quy. Đây là căn cứ duy nhất được phép loại hoặc cảnh báo cứng ngày/giờ.
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
      doc: 'Thông tư 02/2009/TT-BYT, Điều 4 & 5',
      verified: false,
      severity: 'block', // Loại ngày nếu vượt
      desc: 'Thi hài người chết phải được mai táng trong vòng 48 giờ; nếu có bảo quản lạnh (≤ 4°C) không quá 7 ngày; người chết do bệnh truyền nhiễm nguy hiểm không quá 24 giờ.',
      maxHoursNormal: 48,
      maxHoursCold: 168, // 7 ngày
      maxHoursInfectious: 24,
      maxHoursHueCustom: 72, // Tham khảo tập tục Huế 72h
    },
    REBURIAL_TOO_EARLY: {
      id: 'LEGAL_REBURIAL_TOO_EARLY',
      name: 'Khoảng cách cải táng tối thiểu',
      doc: 'Thông tư 02/2009/TT-BYT',
      verified: false,
      severity: 'block',
      desc: 'Cải táng (sang cát) thường chỉ thực hiện sau khi chôn cất đủ 36 tháng trở lên.',
      minMonths: 36,
    },
    NOISE_WINDOW: {
      id: 'LEGAL_NOISE_WINDOW',
      name: 'Khung giờ âm thanh, tiếng ồn công cộng',
      doc: 'Nghị định 144/2021/NĐ-CP, Điều 8',
      verified: false,
      severity: 'warning', // Cảnh báo
      desc: 'Cấm gây tiếng động lớn, làm ồn ào từ 22h đêm đến 06h sáng hôm sau tại khu dân cư, nơi công cộng.',
      startHour: 6,
      endHour: 22,
    },
  });

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
   * @param {object} [contextParams] Tham số bổ sung (vd: deathTime, storageType, isInfectious, spouseBirthDate, spouseGender)
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
            message: `Cảnh báo pháp luật: Người xem (${p.gender === 'female' ? 'Nữ' : 'Nam'}) chưa đủ ${minAge} tuổi vào ngày này (hiện ${age} tuổi). Vi phạm điều kiện kết hôn theo Luật Hôn nhân & Gia đình.`,
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
          message: `Lưu ý pháp luật: Giờ ${timeStr} nằm trong khung giờ cấm gây ồn ào (22:00 – 06:00) theo NĐ 144/2021/NĐ-CP. Hãy hạn chế âm thanh, loa đài kèn trống.`,
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
        let limitHours = LEGAL_LIMITS.BURIAL_TIME_EXCEEDED.maxHoursNormal;
        if (contextParams.isInfectious) limitHours = LEGAL_LIMITS.BURIAL_TIME_EXCEEDED.maxHoursInfectious;
        else if (contextParams.storageType === 'cold') limitHours = LEGAL_LIMITS.BURIAL_TIME_EXCEEDED.maxHoursCold;
        else if (contextParams.isHueCustom) limitHours = LEGAL_LIMITS.BURIAL_TIME_EXCEEDED.maxHoursHueCustom;

        if (diffHours > limitHours) {
          flags.push({
            rule: LEGAL_LIMITS.BURIAL_TIME_EXCEEDED,
            message: `Vi phạm pháp luật y tế: Thời gian từ khi mất đến khi khâm liệm/an táng là ${Math.round(diffHours)} giờ, vượt quá giới hạn tối đa ${limitHours} giờ theo Thông tư 02/2009/TT-BYT.`,
            severity: LEGAL_LIMITS.BURIAL_TIME_EXCEEDED.severity,
          });
        }
      }
    }

    return flags;
  }

  NT.legal = Object.freeze({
    LEGAL_LIMITS,
    exactAge,
    checkLegal,
  });
})(globalThis.NT ??= {});
