/**
 * NgayTot — Định nghĩa loại việc & quy tắc chọn ngày riêng cho từng việc.
 * Từ khóa 宜/忌 khớp đúng chuỗi lunar-javascript trả về (Hiệp Kỷ Biện Phương Thư).
 * tenGods: nhóm Thập thần "hợp việc" (0 Tỷ,1 Thực,2 Tài,3 Quan,4 Ấn) của Thiên can ngày so với Nhật chủ.
 */
(function (NT) {
  'use strict';

  const COMMON_GOOD = ['天德', '月德', '天德合', '月德合', '天恩', '天赦', '天愿', '母仓'];
  const COMMON_BAD = { '月破': 10, '四废': 8, '天罡': 5, '河魁': 5, '五墓': 3, '四离': 4, '四忌': 3, '四穷': 3 };

  const ACTIVITIES = [
    // --- PK-01: Chuỗi Đại Sự Đời Người (Multi-stage Workflows) ---
    // Hôn nhân
    {
      id: 'wed_engage', label: 'Dạm ngõ / Ăn hỏi', icon: '💍',
      desc: 'Nghi thức dạm ngõ, ăn hỏi trước đám cưới',
      yiPrimary: ['纳采', '问名', '订盟'], yi: ['嫁娶', '会亲友'],
      zhixingGood: ['成', '定', '开', '满'], zhixingBad: ['破', '危', '闭', '建'],
      shenGood: ['天喜', '六合', '三合', '五合', '益后'],
      shenBad: { '孤辰': 5, '阴错': 6, '阳错': 6, '五离': 6 },
      tenGods: (gender) => (gender === 'female' ? [3] : [2]), boost: { lu: 0.5, quyNhan: 1, vanXuong: 0, yiMa: 0, taoHua: 1 },
      yearChecks: ['kimLau'], pk: 'PK-01'
    },
    {
      id: 'wed_main', label: 'Cưới hỏi / Đón dâu', icon: '🎎',
      desc: 'Lễ cưới chính, rước dâu',
      yiPrimary: ['嫁娶'], yi: ['纳采', '安床'],
      zhixingGood: ['成', '定', '开', '满'], zhixingBad: ['破', '危', '闭', '建'],
      shenGood: ['天喜', '六合', '三合', '五合', '阴德', '福德', '天后', '益后'],
      shenBad: { '八专': 7, '孤辰': 5, '阴错': 6, '阳错': 6, '天狗': 4, '咸池': 3, '五离': 6, '月厌': 5, '厌对': 5, '阴阳俱错': 6 },
      tenGods: (gender) => (gender === 'female' ? [3] : [2]), boost: { lu: 0.5, quyNhan: 1, vanXuong: 0.2, yiMa: 0.2, taoHua: 2 },
      yearChecks: ['kimLau', 'tamTai'], pk: 'PK-01', checkUnderageMarriage: true, checkNoise: true
    },
    {
      id: 'wed_bed', label: 'An sàng (Kê giường)', icon: '🛏️',
      desc: 'Trải giường tân hôn',
      yiPrimary: ['安床'], yi: ['嫁娶', '祈福'],
      zhixingGood: ['定', '成', '满'], zhixingBad: ['破', '危', '闭'],
      shenGood: ['福德', '天喜', '六合'],
      shenBad: { '孤辰': 5, '阴错': 6, '阳错': 6 },
      tenGods: () => [2, 3, 4], boost: { lu: 0.5, quyNhan: 1, vanXuong: 0, yiMa: 0, taoHua: 1 },
      yearChecks: ['kimLau'], pk: 'PK-01'
    },
    // Xây nhà
    {
      id: 'build_earth', label: 'Động thổ', icon: '🏗️',
      desc: 'Khởi công, đào móng xây nhà',
      yiPrimary: ['动土', '修造'], yi: ['起基', '定磉'],
      zhixingGood: ['成', '定', '开', '满'], zhixingBad: ['破', '危', '闭', '建', '收'],
      shenGood: ['天仓', '母仓', '月空', '福德', '生气', '要安'],
      shenBad: { '土符': 8, '土府': 8, '地囊': 6, '天火': 5, '地火': 6, '月建': 5, '大煞': 4, '月厌': 4, '大耗': 3 },
      tenGods: () => [4, 0], boost: { lu: 1, quyNhan: 1, vanXuong: 0.2, yiMa: 0.2, taoHua: 0 },
      yearChecks: ['kimLau', 'hoangOc', 'tamTai'], pk: 'PK-01'
    },
    {
      id: 'build_roof', label: 'Cất nóc', icon: '🏠',
      desc: 'Cất nóc, đổ trần nhà',
      yiPrimary: ['上梁', '盖屋'], yi: ['竖柱', '修造'],
      zhixingGood: ['成', '定', '开', '满'], zhixingBad: ['破', '危', '闭', '建', '收'],
      shenGood: ['天仓', '母仓', '福德', '生气'],
      shenBad: { '天火': 6, '地火': 6, '月建': 5 },
      tenGods: () => [4, 0], boost: { lu: 1, quyNhan: 1, vanXuong: 0.2, yiMa: 0.2, taoHua: 0 },
      yearChecks: ['kimLau', 'hoangOc', 'tamTai'], pk: 'PK-01'
    },
    {
      id: 'build_in', label: 'Nhập trạch', icon: '🏡',
      desc: 'Về nhà mới, chuyển văn phòng',
      yiPrimary: ['入宅', '移徙'], yi: ['安香', '安床', '祭祀', '出火'],
      zhixingGood: ['成', '开', '满', '定'], zhixingBad: ['破', '危', '闭', '收'],
      shenGood: ['生气', '福德', '天仓', '母仓', '要安', '益后'],
      shenBad: { '归忌': 7, '天火': 6, '往亡': 6, '五离': 5, '大耗': 4, '月厌': 4 },
      tenGods: () => [4, 2], boost: { lu: 1.2, quyNhan: 1, vanXuong: 0.2, yiMa: 0.3, taoHua: 0 },
      yearChecks: ['hoangOc', 'tamTai'], pk: 'PK-01'
    },
    {
      id: 'build_open', label: 'Khánh thành', icon: '🎊',
      desc: 'Khánh thành nhà, công trình',
      yiPrimary: ['祭祀', '祈福'], yi: ['入宅', '会亲友'],
      zhixingGood: ['成', '开', '满'], zhixingBad: ['破', '危', '闭', '收'],
      shenGood: ['生气', '福德'],
      shenBad: { '天火': 6, '往亡': 6 },
      tenGods: () => [4, 2], boost: { lu: 1.2, quyNhan: 1, vanXuong: 0.2, yiMa: 0.3, taoHua: 0 },
      yearChecks: [], pk: 'PK-01', checkNoise: true
    },
    // Hiếu sự
    {
      id: 'funeral_main', label: 'Khâm liệm / Di quan (Cố định)', icon: '🕊️',
      desc: 'Xem thông tin giờ đã định cho tang lễ, đưa tang',
      yiPrimary: ['入殓', '移柩', '行丧'], yi: ['成服', '除服'],
      zhixingGood: ['收', '除', '破'], zhixingBad: ['建', '满', '平', '定', '开'],
      shenGood: ['鸣吠', '鸣吠对'],
      shenBad: { '重日': 8, '复日': 8, '三丧': 8, '劫煞': 5, '天火': 5 },
      tenGods: () => [4], boost: { lu: 0, quyNhan: 1, vanXuong: 0, yiMa: 1, taoHua: 0 },
      // QĐ-04: chưa có bộ giới hạn quàn đầy đủ (G4) → chỉ xem ngày giờ đã định, không quét khoảng ngày.
      yearChecks: [], pk: 'PK-01', fixedOnly: true, checkBurialTime: true, checkNoise: true
    },
    {
      id: 'funeral_cremate', label: 'Lịch an táng (Cố định)', icon: '🪦',
      desc: 'Xem chi tiết giờ an táng (nhập giờ đã định)',
      yiPrimary: ['安葬', '破土'], yi: ['修坟', '立碑'],
      zhixingGood: ['收', '除', '破'], zhixingBad: ['建', '满', '平', '定', '开'],
      shenGood: ['鸣吠', '鸣吠对'],
      shenBad: { '重日': 8, '复日': 8, '三丧': 8 },
      tenGods: () => [4], boost: { lu: 0, quyNhan: 1, vanXuong: 0, yiMa: 0, taoHua: 0 },
      yearChecks: [], pk: 'PK-01', fixedOnly: true
    },

    // --- PK-02: Kinh doanh & Tài chính ---
    {
      id: 'biz_open', label: 'Khai trương, mở hàng', icon: '🏮',
      desc: 'Mở cửa hàng, ra mắt sản phẩm, lập công ty',
      yiPrimary: ['开市'], yi: ['纳财', '挂匾', '开仓', '交易'],
      zhixingGood: ['开', '满', '成'], zhixingBad: ['破', '闭', '危', '收'],
      shenGood: ['五富', '金匮', '益后', '续世', '天仓', '福德', '五合', '三合', '六合'],
      shenBad: { '大耗': 7, '小耗': 5, '四耗': 5, '五虚': 5, '九空': 6, '天贼': 6, '劫煞': 4, '月虚': 3 },
      tenGods: () => [2, 1], boost: { lu: 1.5, quyNhan: 1, vanXuong: 0.3, yiMa: 0.5, taoHua: 0.3 },
      yearChecks: ['tamTai'], pk: 'PK-02'
    },
    {
      id: 'biz_sign', label: 'Ký hợp đồng, giao dịch', icon: '🤝',
      desc: 'Ký kết, đàm phán, mua bán, giao dịch lớn',
      yiPrimary: ['交易', '立券'], yi: ['纳财', '订盟', '会亲友'],
      zhixingGood: ['定', '成', '满', '执'], zhixingBad: ['破', '危', '闭'],
      shenGood: ['六合', '五合', '三合', '金匮', '福德', '天后'],
      shenBad: { '天贼': 6, '五离': 6, '劫煞': 4, '大耗': 4, '朱雀': 3, '阴错': 3, '阳错': 3 },
      tenGods: () => [2, 3], boost: { lu: 1.3, quyNhan: 1.3, vanXuong: 0.5, yiMa: 0.3, taoHua: 0.2 },
      yearChecks: [], pk: 'PK-02'
    },
    {
      id: 'buy_asset', label: 'Mua tài sản lớn, mua xe', icon: '🚗',
      desc: 'Mua xe, nhà đất, máy móc, tài sản giá trị',
      yiPrimary: ['置产', '交易'], yi: ['纳财', '安机械', '立券'],
      zhixingGood: ['成', '开', '满', '定', '收'], zhixingBad: ['破', '危', '闭'],
      shenGood: ['金匮', '五富', '天仓', '母仓', '福德'],
      shenBad: { '大耗': 6, '小耗': 4, '天贼': 6, '劫煞': 4, '五虚': 4, '九空': 4 },
      tenGods: () => [2], boost: { lu: 1.5, quyNhan: 1, vanXuong: 0.2, yiMa: 0.5, taoHua: 0 },
      yearChecks: [], pk: 'PK-02'
    },
    {
      id: 'career_fixed', label: 'Nhậm chức / Bắt đầu công việc (Cố định)', icon: '📜',
      desc: 'Xem thông tin ngày giờ đã ấn định khi nhận chức, bắt đầu công việc',
      yiPrimary: ['赴任'], yi: ['会亲友', '祭祀'],
      zhixingGood: ['成', '定', '开', '建'], zhixingBad: ['破', '危', '闭'],
      shenGood: ['天德', '月德', '福德', '驿马', '天马'],
      shenBad: { '大耗': 6, '往亡': 6, '归忌': 5, '天吏': 4 },
      tenGods: () => [3, 4], boost: { lu: 1.5, quyNhan: 1.5, vanXuong: 1, yiMa: 0.5, taoHua: 0 },
      yearChecks: [], pk: 'PK-02', fixedOnly: true
    },
    {
      id: 'travel_biz', label: 'Xuất hành, đi công tác', icon: '🧭',
      desc: 'Đi công tác, đi xa làm ăn',
      yiPrimary: ['出行'], yi: ['移徙', '乘船', '会亲友'],
      zhixingGood: ['建', '成', '开', '满', '定'], zhixingBad: ['破', '危', '闭', '收'],
      shenGood: ['驿马', '天马', '要安', '福德'],
      shenBad: { '往亡': 8, '归忌': 6, '天贼': 5, '九坎': 3, '触水龙': 3 },
      tenGods: () => [1, 2], boost: { lu: 0.5, quyNhan: 1, vanXuong: 0.2, yiMa: 3, taoHua: 0 },
      yearChecks: [], pk: 'PK-02'
    },

    // --- PK-03: Tâm linh & Thờ cúng ---
    {
      id: 'altar_set', label: 'Lập bàn thờ, bốc bát hương', icon: '🕯️',
      desc: 'Lập bàn thờ gia tiên, thần tài',
      yiPrimary: ['安香', '祭祀'], yi: ['祈福'],
      zhixingGood: ['成', '定', '满', '开'], zhixingBad: ['破', '危', '闭'],
      shenGood: ['天德', '月德', '福德', '生气'],
      shenBad: { '大耗': 5, '天火': 5 },
      tenGods: () => [4], boost: { lu: 1, quyNhan: 1, vanXuong: 0.2, yiMa: 0, taoHua: 0 },
      yearChecks: [], pk: 'PK-03'
    },

    // --- PK-04: Y tế & Sức khỏe (Guardrails) ---
    {
      id: 'med_birth', label: 'Sinh mổ (Chỉ định Y khoa)', icon: '👶',
      desc: 'Xem chi tiết giờ sinh mổ (Yêu cầu nhập giờ bác sĩ đã ấn định)',
      yiPrimary: [], yi: ['祈福'],
      zhixingGood: ['成', '开', '定', '满', '建', '平', '收'], zhixingBad: ['破', '危', '闭'],
      shenGood: ['天医', '天喜', '福德', '生气', '解神'],
      shenBad: { '血支': 8, '血忌': 8, '死神': 5, '死气': 5 },
      tenGods: () => [4, 1], boost: { lu: 0.5, quyNhan: 1.5, vanXuong: 0.2, yiMa: 0, taoHua: 0 },
      yearChecks: [], pk: 'PK-04', fixedOnly: true, isMedical: true
    },
    {
      id: 'med_checkup', label: 'Khám sức khỏe, chữa bệnh', icon: '🩺',
      desc: 'Khám sức khỏe định kỳ, đi khám chữa bệnh (tham khảo tập tục)',
      yiPrimary: ['求医', '治病'], yi: ['解除'],
      zhixingGood: ['除', '成', '开'], zhixingBad: ['满', '建', '闭'],
      shenGood: ['天医', '解神', '除神', '生气'],
      shenBad: { '死神': 5, '死气': 5, '月害': 3 },
      tenGods: () => [4, 1], boost: { lu: 0.5, quyNhan: 1.5, vanXuong: 0.2, yiMa: 0, taoHua: 0 },
      yearChecks: [], pk: 'PK-04', fixedOnly: false, isMedical: true
    },
    {
      id: 'med_surgery', label: 'Phẫu thuật (Chỉ định Y khoa)', icon: '🏥',
      desc: 'Xem chi tiết giờ phẫu thuật (Nhập giờ bác sĩ ấn định)',
      yiPrimary: ['求医', '治病'], yi: ['针灸', '解除'],
      zhixingGood: ['除', '破', '成', '开'], zhixingBad: ['满', '建', '闭'],
      shenGood: ['天医', '解神', '除神', '生气', '天巫'],
      shenBad: { '血支': 8, '血忌': 8, '死神': 5, '死气': 5, '天狗': 3, '月害': 3 },
      tenGods: () => [4, 1], boost: { lu: 0.5, quyNhan: 1.5, vanXuong: 0.2, yiMa: 0, taoHua: 0 },
      yearChecks: [], pk: 'PK-04', fixedOnly: true, isMedical: true
    },

    // --- PK-05: Sinh hoạt Thường nhật ---
    {
      id: 'daily_hair', label: 'Cắt tóc', icon: '✂️',
      desc: 'Cắt tóc, sửa sang dung nhan',
      yiPrimary: ['理发'], yi: ['整手足甲', '沐浴'],
      zhixingGood: ['除', '成', '开'], zhixingBad: ['建', '破', '闭'],
      shenGood: ['解神', '除神'],
      shenBad: { '大耗': 4, '血支': 4 },
      tenGods: () => [1, 4], boost: { lu: 0, quyNhan: 0.5, vanXuong: 0, yiMa: 0, taoHua: 1 },
      yearChecks: [], pk: 'PK-05', isDaily: true
    },
    {
      id: 'daily_crop', label: 'Gieo hạt, trồng cây', icon: '🌱',
      desc: 'Trồng trọt, chăn nuôi',
      yiPrimary: ['栽种', '牧养'], yi: ['纳畜'],
      zhixingGood: ['成', '满', '收', '开'], zhixingBad: ['破', '闭', '危'],
      shenGood: ['天仓', '母仓'],
      shenBad: { '土符': 5, '地囊': 5 },
      tenGods: () => [2, 1], boost: { lu: 0, quyNhan: 0.5, vanXuong: 0, yiMa: 0, taoHua: 0 },
      yearChecks: [], pk: 'PK-05', isDaily: true
    }
  ];

  /** Tạo việc tùy chỉnh: tên + ngũ hành chủ đạo + (tùy chọn) mượn quy tắc 宜/忌 của một việc mẫu. */
  function makeCustom({ name, element, baseId }) {
    const base = ACTIVITIES.find((a) => a.id === baseId);
    return {
      id: 'custom', label: name?.trim() || 'Việc tùy chỉnh', icon: '✨', desc: 'Việc tùy chỉnh',
      customElement: Number.isInteger(element) ? element : null,
      yiPrimary: base?.yiPrimary ?? [], yi: base?.yi ?? [],
      zhixingGood: base?.zhixingGood ?? ['成', '开', '定', '满'], zhixingBad: base?.zhixingBad ?? ['破', '危', '闭'],
      shenGood: base?.shenGood ?? ['福德'], shenBad: base?.shenBad ?? {},
      tenGods: base?.tenGods ?? (() => []), boost: base?.boost ?? { lu: 1, quyNhan: 1, vanXuong: 0.5, yiMa: 0.5, taoHua: 0.2 },
      yearChecks: base?.yearChecks ?? [], pk: 'PK-Custom'
    };
  }

  /**
   * Chủ thể xét tuổi do việc quy định (PRD §9.5, §9.6):
   *  'none'   — lịch mổ, sinh mổ: không hỏi dữ liệu cá nhân;
   *  'bride'  — cưới hỏi: xét tuổi cô dâu (nữ, cố định), chú rể tùy chọn;
   *  'owner'  — làm nhà: xét tuổi gia chủ theo phương án người dùng chọn;
   *  'person' — các việc khác: một người, giới tính chọn bình thường.
   */
  function subjectOf(act) {
    if (!act) return 'person';
    if (act.isMedical && act.fixedOnly) return 'none';
    if (typeof act.id === 'string' && act.id.startsWith('wed_')) return 'bride';
    if (typeof act.id === 'string' && act.id.startsWith('build_')) return 'owner';
    return 'person';
  }

  NT.activities = Object.freeze({ ACTIVITIES, COMMON_GOOD, COMMON_BAD, makeCustom, subjectOf, byId: (id) => ACTIVITIES.find((a) => a.id === id) });
})(globalThis.NT ??= {});
