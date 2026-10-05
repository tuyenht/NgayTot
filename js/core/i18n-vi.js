/**
 * NgayTot — Từ điển Hán → Việt cho dữ liệu Hoàng lịch (宜忌, thần sát, Trực, Tú, 12 thần).
 * Nguồn thuật ngữ: Hiệp Kỷ Biện Phương Thư (协纪辨方书) qua lunar-javascript.
 */
(function (NT) {
  'use strict';

  const YIJI = {
    '祭祀': 'Cúng tế', '祈福': 'Cầu phúc', '求嗣': 'Cầu con', '开光': 'Khai quang', '塑绘': 'Đắp tượng, vẽ',
    '齐醮': 'Lập đàn cúng', '斋醮': 'Lập đàn chay', '沐浴': 'Tắm gội', '酬神': 'Tạ thần', '造庙': 'Xây miếu',
    '祀灶': 'Cúng Táo quân', '焚香': 'Thắp hương', '谢土': 'Tạ đất', '出火': 'Dời bếp/bàn thờ', '雕刻': 'Điêu khắc',
    '嫁娶': 'Cưới gả', '订婚': 'Đính hôn', '纳采': 'Lễ dạm hỏi', '问名': 'Vấn danh', '纳婿': 'Nạp rể',
    '归宁': 'Lại mặt', '安床': 'Kê giường', '合帐': 'May màn', '冠笄': 'Lễ trưởng thành', '订盟': 'Kết ước, ký kết',
    '进人口': 'Nhận người, thêm người', '裁衣': 'Cắt may', '挽面': 'Se mặt', '开容': 'Sửa dung nhan', '修坟': 'Sửa mộ',
    '启钻': 'Cải táng', '破土': 'Phá thổ (đào huyệt)', '安葬': 'An táng', '立碑': 'Dựng bia', '成服': 'Thành phục',
    '除服': 'Trừ phục (mãn tang)', '开生坟': 'Xây sinh phần', '合寿木': 'Đóng thọ mộc', '入殓': 'Nhập liệm', '移柩': 'Di quan',
    '普渡': 'Phổ độ', '入宅': 'Nhập trạch', '安香': 'An hương, lập bàn thờ', '安门': 'Lắp cửa', '修造': 'Xây sửa',
    '起基': 'Đổ móng', '动土': 'Động thổ', '上梁': 'Cất nóc', '竖柱': 'Dựng cột', '开井开池': 'Đào giếng, ao',
    '作陂放水': 'Đắp đập, tháo nước', '拆卸': 'Tháo dỡ', '破屋': 'Phá nhà', '坏垣': 'Phá tường', '补垣': 'Sửa tường',
    '伐木做梁': 'Đốn gỗ làm xà', '作灶': 'Làm bếp', '解除': 'Giải trừ, dọn dẹp', '开柱眼': 'Khoét lỗ cột', '穿屏扇架': 'Lắp bình phong',
    '盖屋合脊': 'Lợp mái', '开厕': 'Làm nhà vệ sinh', '造仓': 'Làm kho', '塞穴': 'Lấp hang hốc', '平治道涂': 'Sửa đường',
    '造桥': 'Làm cầu', '作厕': 'Làm nhà vệ sinh', '筑堤': 'Đắp đê', '开池': 'Đào ao', '伐木': 'Đốn cây',
    '开渠': 'Đào mương', '掘井': 'Đào giếng', '扫舍': 'Quét dọn nhà', '放水': 'Tháo nước', '造屋': 'Làm nhà',
    '合脊': 'Lợp nóc', '造畜稠': 'Làm chuồng trại', '修门': 'Sửa cửa', '定磉': 'Đặt chân cột', '作梁': 'Làm xà',
    '修饰垣墙': 'Sửa sang tường', '架马': 'Dựng giàn', '开市': 'Khai trương', '挂匾': 'Treo biển hiệu', '纳财': 'Nạp tài, thu tiền',
    '求财': 'Cầu tài', '开仓': 'Mở kho, xuất tiền', '买车': 'Mua xe', '置产': 'Mua tài sản, nhà đất', '雇佣': 'Thuê người',
    '出货财': 'Xuất hàng', '安机械': 'Lắp máy móc', '造车器': 'Đóng xe cộ', '经络': 'Ươm tơ, dệt', '酝酿': 'Ủ rượu',
    '作染': 'Nhuộm', '鼓铸': 'Đúc kim loại', '造船': 'Đóng thuyền', '割蜜': 'Lấy mật', '栽种': 'Trồng trọt',
    '取渔': 'Đánh cá', '结网': 'Đan lưới', '牧养': 'Chăn nuôi', '安碓磑': 'Đặt cối xay', '习艺': 'Học nghề',
    '入学': 'Nhập học', '理发': 'Cắt tóc', '探病': 'Thăm bệnh', '见贵': 'Gặp quý nhân, cấp trên', '乘船': 'Đi thuyền',
    '渡水': 'Qua sông nước', '针灸': 'Châm cứu', '出行': 'Xuất hành', '移徙': 'Chuyển nhà', '分居': 'Ra ở riêng',
    '剃头': 'Cạo đầu', '整手足甲': 'Cắt móng', '纳畜': 'Mua gia súc', '捕捉': 'Săn bắt', '畋猎': 'Đi săn',
    '教牛马': 'Luyện gia súc', '会亲友': 'Gặp họ hàng, bạn bè', '赴任': 'Nhậm chức', '求医': 'Cầu y', '治病': 'Chữa bệnh',
    '词讼': 'Kiện tụng', '起基动土': 'Đổ móng, động thổ', '破屋坏垣': 'Phá dỡ nhà, tường', '盖屋': 'Lợp nhà', '造仓库': 'Làm kho',
    '立券交易': 'Ký kết giao dịch', '交易': 'Giao dịch', '立券': 'Lập khế ước', '安机': 'Lắp máy', '会友': 'Gặp bạn',
    '求医疗病': 'Chữa bệnh', '诸事不宜': 'Mọi việc không nên', '馀事勿取': 'Việc khác không nên', '行丧': 'Đưa tang', '断蚁': 'Diệt mối',
    '归岫': 'Về ẩn cư', '无': 'Không có',
  };

  const SHENSHA = {
    '天恩': 'Thiên Ân', '鸣吠': 'Minh Phệ', '母仓': 'Mẫu Thương', '不将': 'Bất Tương', '四相': 'Tứ Tướng', '鸣吠对': 'Minh Phệ Đối',
    '五合': 'Ngũ Hợp', '三合': 'Tam Hợp', '除神': 'Trừ Thần', '月德': 'Nguyệt Đức', '月空': 'Nguyệt Không', '月德合': 'Nguyệt Đức Hợp',
    '月恩': 'Nguyệt Ân', '时阴': 'Thời Âm', '五富': 'Ngũ Phú', '生气': 'Sinh Khí', '金匮': 'Kim Quỹ', '相日': 'Tướng Nhật',
    '阴德': 'Âm Đức', '六合': 'Lục Hợp', '益后': 'Ích Hậu', '青龙': 'Thanh Long', '续世': 'Tục Thế', '明堂': 'Minh Đường',
    '王日': 'Vương Nhật', '要安': 'Yếu An', '官日': 'Quan Nhật', '吉期': 'Cát Kỳ', '福德': 'Phúc Đức', '六仪': 'Lục Nghi',
    '金堂': 'Kim Đường', '宝光': 'Bảo Quang', '民日': 'Dân Nhật', '临日': 'Lâm Nhật', '天马': 'Thiên Mã', '敬安': 'Kính An',
    '普护': 'Phổ Hộ', '驿马': 'Dịch Mã', '天后': 'Thiên Hậu', '阳德': 'Dương Đức', '天喜': 'Thiên Hỷ', '天医': 'Thiên Y',
    '司命': 'Tư Mệnh', '圣心': 'Thánh Tâm', '玉宇': 'Ngọc Vũ', '守日': 'Thủ Nhật', '时德': 'Thời Đức', '解神': 'Giải Thần',
    '时阳': 'Thời Dương', '天仓': 'Thiên Thương', '天巫': 'Thiên Vu', '玉堂': 'Ngọc Đường', '福生': 'Phúc Sinh', '天德': 'Thiên Đức',
    '天德合': 'Thiên Đức Hợp', '天愿': 'Thiên Nguyện', '天赦': 'Thiên Xá', '天符': 'Thiên Phù', '阴神': 'Âm Thần', '解除': 'Giải Trừ',
    '五虚': 'Ngũ Hư', '五离': 'Ngũ Ly', '重日': 'Trùng Nhật', '复日': 'Phục Nhật', '血支': 'Huyết Chi', '天贼': 'Thiên Tặc',
    '土符': 'Thổ Phù', '游祸': 'Du Họa', '白虎': 'Bạch Hổ', '小耗': 'Tiểu Hao', '致死': 'Trí Tử', '河魁': 'Hà Khôi',
    '劫煞': 'Kiếp Sát', '月煞': 'Nguyệt Sát', '月建': 'Nguyệt Kiến', '往亡': 'Vãng Vong', '大时': 'Đại Thời', '大败': 'Đại Bại',
    '咸池': 'Hàm Trì', '厌对': 'Yếm Đối', '招摇': 'Chiêu Dao', '九坎': 'Cửu Khảm', '九焦': 'Cửu Tiêu', '天罡': 'Thiên Cương',
    '死神': 'Tử Thần', '月害': 'Nguyệt Hại', '死气': 'Tử Khí', '月破': 'Nguyệt Phá', '大耗': 'Đại Hao', '天牢': 'Thiên Lao',
    '元武': 'Huyền Vũ', '月厌': 'Nguyệt Yếm', '月虚': 'Nguyệt Hư', '归忌': 'Quy Kỵ', '小时': 'Tiểu Thời', '天刑': 'Thiên Hình',
    '朱雀': 'Chu Tước', '九空': 'Cửu Không', '天吏': 'Thiên Lại', '地火': 'Địa Hỏa', '四击': 'Tứ Kích', '大煞': 'Đại Sát',
    '勾陈': 'Câu Trận', '八专': 'Bát Chuyên', '灾煞': 'Tai Sát', '天火': 'Thiên Hỏa', '血忌': 'Huyết Kỵ', '土府': 'Thổ Phủ',
    '月刑': 'Nguyệt Hình', '触水龙': 'Xúc Thủy Long', '地囊': 'Địa Nang', '八风': 'Bát Phong', '四废': 'Tứ Phế', '四忌': 'Tứ Kỵ',
    '四穷': 'Tứ Cùng', '五墓': 'Ngũ Mộ', '阴错': 'Âm Thác', '四耗': 'Tứ Hao', '阳错': 'Dương Thác', '孤辰': 'Cô Thần',
    '小会': 'Tiểu Hội', '大会': 'Đại Hội', '八龙': 'Bát Long', '七鸟': 'Thất Điểu', '九虎': 'Cửu Hổ', '六蛇': 'Lục Xà',
    '天狗': 'Thiên Cẩu', '行狠': 'Hành Ngận', '了戾': 'Liễu Lệ', '岁薄': 'Tuế Bạc', '逐阵': 'Trục Trận', '三丧': 'Tam Tang',
    '三阴': 'Tam Âm', '阴道冲阳': 'Âm Đạo Xung Dương', '阴位': 'Âm Vị', '阴阳交破': 'Âm Dương Giao Phá', '阴阳俱错': 'Âm Dương Câu Thác',
    '阴阳击冲': 'Âm Dương Kích Xung', '鬼哭': 'Quỷ Khốc', '单阴': 'Đơn Âm', '绝阴': 'Tuyệt Âm', '纯阳': 'Thuần Dương',
    '阳错阴冲': 'Dương Thác Âm Xung', '七符': 'Thất Phù', '成日': 'Thành Nhật', '孤阳': 'Cô Dương', '绝阳': 'Tuyệt Dương',
    '纯阴': 'Thuần Âm', '大退': 'Đại Thoái', '四离': 'Tứ Ly', '阳破阴冲': 'Dương Phá Âm Xung', '无': 'Không có',
  };

  const ZHIXING = {
    '建': 'Kiến', '除': 'Trừ', '满': 'Mãn', '平': 'Bình', '定': 'Định', '执': 'Chấp',
    '破': 'Phá', '危': 'Nguy', '成': 'Thành', '收': 'Thu', '开': 'Khai', '闭': 'Bế',
  };

  const TIANSHEN = {
    '青龙': 'Thanh Long', '明堂': 'Minh Đường', '天刑': 'Thiên Hình', '朱雀': 'Chu Tước', '金匮': 'Kim Quỹ', '天德': 'Thiên Đức (Bảo Quang)',
    '白虎': 'Bạch Hổ', '玉堂': 'Ngọc Đường', '天牢': 'Thiên Lao', '玄武': 'Huyền Vũ', '司命': 'Tư Mệnh', '勾陈': 'Câu Trận',
  };

  const XIU = {
    '角': 'Giác', '亢': 'Cang', '氐': 'Đê', '房': 'Phòng', '心': 'Tâm', '尾': 'Vĩ', '箕': 'Cơ', '斗': 'Đẩu', '牛': 'Ngưu', '女': 'Nữ',
    '虚': 'Hư', '危': 'Nguy', '室': 'Thất', '壁': 'Bích', '奎': 'Khuê', '娄': 'Lâu', '胃': 'Vị', '昴': 'Mão', '毕': 'Tất', '觜': 'Chủy',
    '参': 'Sâm', '井': 'Tỉnh', '鬼': 'Quỷ', '柳': 'Liễu', '星': 'Tinh', '张': 'Trương', '翼': 'Dực', '轸': 'Chẩn',
  };

  const JIEQI = {
    '冬至': 'Đông Chí', '小寒': 'Tiểu Hàn', '大寒': 'Đại Hàn', '立春': 'Lập Xuân', '雨水': 'Vũ Thủy', '惊蛰': 'Kinh Trập',
    '春分': 'Xuân Phân', '清明': 'Thanh Minh', '谷雨': 'Cốc Vũ', '立夏': 'Lập Hạ', '小满': 'Tiểu Mãn', '芒种': 'Mang Chủng',
    '夏至': 'Hạ Chí', '小暑': 'Tiểu Thử', '大暑': 'Đại Thử', '立秋': 'Lập Thu', '处暑': 'Xử Thử', '白露': 'Bạch Lộ',
    '秋分': 'Thu Phân', '寒露': 'Hàn Lộ', '霜降': 'Sương Giáng', '立冬': 'Lập Đông', '小雪': 'Tiểu Tuyết', '大雪': 'Đại Tuyết',
    'DONG_ZHI': 'Đông Chí', 'XIAO_HAN': 'Tiểu Hàn', 'DA_HAN': 'Đại Hàn', 'LI_CHUN': 'Lập Xuân', 'YU_SHUI': 'Vũ Thủy', 'JING_ZHE': 'Kinh Trập',
  };

  const NAYIN = {
    '海中金': 'Hải Trung Kim', '炉中火': 'Lư Trung Hỏa', '大林木': 'Đại Lâm Mộc', '路旁土': 'Lộ Bàng Thổ', '剑锋金': 'Kiếm Phong Kim',
    '山头火': 'Sơn Đầu Hỏa', '涧下水': 'Giản Hạ Thủy', '城头土': 'Thành Đầu Thổ', '白蜡金': 'Bạch Lạp Kim', '杨柳木': 'Dương Liễu Mộc',
    '泉中水': 'Tuyền Trung Thủy', '屋上土': 'Ốc Thượng Thổ', '霹雳火': 'Tích Lịch Hỏa', '松柏木': 'Tùng Bách Mộc', '长流水': 'Trường Lưu Thủy',
    '沙中金': 'Sa Trung Kim', '山下火': 'Sơn Hạ Hỏa', '平地木': 'Bình Địa Mộc', '壁上土': 'Bích Thượng Thổ', '金箔金': 'Kim Bạch Kim',
    '覆灯火': 'Phú Đăng Hỏa', '天河水': 'Thiên Hà Thủy', '大驿土': 'Đại Dịch Thổ', '钗钏金': 'Thoa Xuyến Kim', '桑柘木': 'Tang Đố Mộc',
    '大溪水': 'Đại Khê Thủy', '沙中土': 'Sa Trung Thổ', '天上火': 'Thiên Thượng Hỏa', '石榴木': 'Thạch Lựu Mộc', '大海水': 'Đại Hải Thủy',
  };

  const tr = (dict) => (s) => dict[s] ?? s;

  NT.vi = Object.freeze({
    YIJI, SHENSHA, ZHIXING, TIANSHEN, XIU, JIEQI, NAYIN,
    yiji: tr(YIJI), shensha: tr(SHENSHA), zhixing: tr(ZHIXING), tianshen: tr(TIANSHEN),
    xiu: tr(XIU), jieqi: tr(JIEQI), nayin: tr(NAYIN),
  });
})(globalThis.NT ??= {});
