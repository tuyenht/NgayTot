/**
 * NgayTot — Kho Văn Khấn Cổ Truyền Toàn Diện & Đặc Thù Phong Tục Vùng Miền, Dân Tộc.
 * 
 * Tình trạng nguồn (đối chiếu ngày 2026-10-07):
 *  - Các bài khấn là bản RÚT GỌN do ứng dụng soạn theo khuôn mẫu phổ biến; KHÔNG phải trích từ sách nào.
 *  - Danh xưng các vị được khấn, ngày lễ, lễ vật, kiêng kỵ đã đối chiếu với các bản văn khấn đang lưu hành
 *    và báo chí chính thống (mỗi bài ít nhất hai nguồn); CHƯA đối chiếu với sách in gốc.
 *  - Tám lễ của các dân tộc Mường, Tày, Nùng, Thái, Dao, Khmer, Chăm (kind: 'gioi_thieu') do chức sắc của
 *    cộng đồng cử hành bằng tiếng dân tộc: chỉ có bài giới thiệu, không có lời khấn.
 *  - Chi tiết nào chưa tìm được nguồn thì đã bỏ hoặc ghi là tập tục tùy nơi; xem docs/HIEN-TRANG.md dòng 47.
 *
 * Tính năng lõi:
 *  - Phân loại 10 đại danh mục nghi lễ.
 *  - Phân tầng Vùng miền (Toàn quốc, Miền Bắc, Miền Trung, Miền Nam).
 *  - Phân tầng Bản sắc Dân tộc (Kinh, Mường, Tày - Nùng, Thái, Dao, Khmer, Chăm).
 *  - Sắm sửa lễ vật chi tiết, ý nghĩa tâm linh và điều kiêng kỵ dân gian.
 *  - Điền tự động thông tin gia chủ vào mẫu văn khấn (Auto-fill Template Renderer).
 */
(function (NT) {
  'use strict';

  const CATEGORIES = Object.freeze([
    { id: 'tet_nguyen_dan', name: 'Lễ Tết Nguyên Đán', icon: '🧧', desc: 'Từ 23 tháng Chạp đến lễ Hóa vàng, Khai hạ' },
    { id: 'tiet_trong_nam', name: 'Các Tiết Lễ Trong Năm', icon: '🏮', desc: 'Thượng Nguyên, Hàn Thực, Thanh Minh, Đoan Ngọ, Vu Lan, Trung Thu, Hạ Nguyên' },
    { id: 'tuan_tiet', name: 'Mùng Một & Ngày Rằm', icon: '🌕', desc: 'Nghi lễ Sóc Vọng hàng tháng tại gia đường' },
    { id: 'gio_chap_tang_le', name: 'Tang Lễ & Giỗ Chạp', icon: '🕯️', desc: 'Tang lễ, 49 ngày, 100 ngày, Giỗ đầu, Giỗ hết, Tiên thường, Cát kỵ, Tảo mộ' },
    { id: 'vong_doi', name: 'Nghi Lễ Vòng Đời', icon: '👶', desc: 'Cúng Mụ đầy tháng, thôi nôi, dạm ngõ, ăn hỏi, thành hôn, mừng thọ' },
    { id: 'nha_dat_kinh_doanh', name: 'Nhà Đất & Khởi Sự Kinh Doanh', icon: '🏗️', desc: 'Động thổ, cất nóc, nhập trạch, khai trương, bồi hoàn địa mạch' },
    { id: 'chua_den_mieu_phu', name: 'Chùa, Đình, Đền, Miếu, Phủ', icon: '🏛️', desc: 'Lễ Phật, Đức Ông, Thánh Mẫu Tam Tứ Phủ, Đức Thánh Trần, Thành Hoàng' },
    { id: 'dang_sao_giai_han', name: 'Dâng Sao Giải Hạn', icon: '⭐', desc: 'Bài khấn chung và 9 sao Cửu Diệu: La Hầu, Kế Đô, Thái Bạch...' },
    { id: 'vung_mien_dac_thu', name: 'Đặc Thù Vùng Miền (Bắc - Trung - Nam)', icon: '🗺️', desc: 'Cúng Đất Đai Bác Tánh, Cúng Âm Hồn Huế, Bà Chúa Xứ, Vía Thần Tài, Kỳ Yên' },
    { id: 'dan_toc_thieu_so', name: 'Bản Sắc Dân Tộc Truyền Thống', icon: '🌾', desc: 'Mường, Tày, Nùng, Thái, Dao, Khmer Nam Bộ, Chăm' }
  ]);

  const REGIONS = Object.freeze([
    { id: 'toan_quoc', name: 'Toàn quốc (Phổ biến)' },
    { id: 'mien_bac', name: 'Đặc thù Miền Bắc' },
    { id: 'mien_trung', name: 'Đặc thù Miền Trung (Huế, Quảng Nam, Bình Định...)' },
    { id: 'mien_nam', name: 'Đặc thù Miền Nam (Tây & Đông Nam Bộ)' }
  ]);

  const ETHNICITIES = Object.freeze([
    { id: 'kinh', name: 'Người Kinh' },
    { id: 'muong', name: 'Dân tộc Mường' },
    { id: 'tay_nung', name: 'Dân tộc Tày - Nùng' },
    { id: 'thai', name: 'Dân tộc Thái' },
    { id: 'dao', name: 'Dân tộc Dao' },
    { id: 'khmer', name: 'Dân tộc Khmer Nam Bộ' },
    { id: 'cham', name: 'Dân tộc Chăm' }
  ]);

  const PRAYERS = [
    // =========================================================================
    // 1. TẾT NGUYÊN ĐÁN
    // =========================================================================
    {
      id: 'vk_ong_tao',
      title: 'Văn khấn Táo Quân chầu trời (23 tháng Chạp)',
      category: 'tet_nguyen_dan',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Ngày 23 tháng Chạp âm lịch (nhiều nơi cúng trước 12h trưa)',
      meaning: 'Tiễn ba vị Định phúc Táo quân lên Thiên đình tấu trình công tội, đức hạnh của gia quyến trong năm cũ.',
      offerings: 'Hương, hoa tươi, trái cây, trầu cau, 3 bộ mũ áo Táo quân (2 mũ nam có cánh chuồn, 1 mũ nữ không cánh chuồn) kèm hia vàng, cá chép sống để thả phóng sinh (phổ biến ở miền Bắc); miền Nam thường có kẹo thèo lèo.',
      taboos: 'Nhiều nơi cúng xong trước giờ Ngọ (12h trưa) ngày 23; cũng có nơi cúng buổi chiều hoặc tối, miễn xong trong ngày 23. Mâm lễ có nhà đặt ở bàn thờ Táo quân hoặc bàn thờ gia tiên, có nhà đặt trong bếp.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy ngài Đông trù Tư mệnh Táo phủ Thần quân.

Tín chủ (chúng) con là: {{GIA_CHU_NAME}}, sinh năm {{GIA_CHU_AGE}}.
Ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay là ngày 23 tháng Chạp năm {{NAM_AM}}.
Tín chủ con thành tâm sửa biện hương hoa, phẩm vật, xiêm hài áo mũ, kính dâng tôn thần. Thắp nén tâm hương kính cẩn thưa trình:

Nay nhân tiết hết năm cùng, giáp tuần khép lại, kính tiễn Ngài Đông trù Tư mệnh Táo phủ Thần quân cưỡi cá chép hồng lên chầu Thiên đình, tấu bày việc trần gian. Kính xin Tôn thần soi xét lòng thành, tấu trình Thượng đế ban phước trừ tai, gia ân tha thứ những lỗi lầm gia quyến lỡ phạm phải trong năm qua.

Kính xin Ngài phù hộ độ trì cho toàn gia an khang, bốn mùa bình an, tám tiết hưởng vinh hoa phú quý, gia đạo thuận hòa, sở cầu như ý.

Chúng con lễ bạc tâm thành, trước án kính lễ, cúi xin Tôn thần chứng giám.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_tat_nien',
      title: 'Văn khấn Lễ Tất Niên (Chiều 30 Tết)',
      category: 'tet_nguyen_dan',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Chiều hoặc tối ngày 30 tháng Chạp (hoặc 29 nếu tháng thiếu)',
      meaning: 'Tổng kết một năm đã qua, tạ ơn Thần linh Thổ địa và rước gia tiên tiền tổ về ăn Tết cùng con cháu.',
      offerings: 'Mâm cỗ mặn hoặc chay truyền thống, mâm ngũ quả, hoa tươi (hoa đào, hoa mai, cúc), trầu cau, hương nến, trà rượu, vàng mã gia tiên.',
      taboos: 'Bàn thờ và nhà cửa phải được bao sái, lau dọn phong quang sạch sẽ trước khi thắp hương Tất niên. Không cãi vã, to tiếng trong buổi chiều 30.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy ngài Kim niên Đương cai Thái Tuế Chí đức Tôn thần.
Con kính lạy ngài Bản cảnh Thành Hoàng chư vị Đại Vương.
Con kính lạy ngài Bản gia Thổ Công, Đông trù Tư mệnh Táo phủ Thần quân, Long mạch, Tài thần.
Con kính lạy Tổ Tiên nội ngoại chư vị Hương linh.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay là ngày Tất niên, tháng Chạp năm {{NAM_AM}}.
Thời khắc cuối năm đã tới, âm dương chuyển hóa, toàn gia chúng con thành tâm sắm sanh lễ vật, hương hoa cơm canh, lòng thành dâng lên trước án. Kính cẩn tâu trình: Năm cũ sắp qua, năm mới gần kề, nhờ ơn trời đất thần linh và tổ tiên che chở, gia đạo được bình an no ấm.

Chúng con kính thỉnh chư vị Tôn thần, cùng Tổ tiên nội ngoại, chư vị hương linh đồng lai hâm hưởng lễ vật. Chứng giám lòng thành, thụ hưởng phúc lộc, phù hộ cho gia đạo năm mới sức khỏe dồi dào, an khang thịnh vượng, vạn sự hanh thông.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_giao_thua_ngoai_troi',
      title: 'Văn khấn Giao thừa ngoài trời (Trừ Tịch)',
      category: 'tet_nguyen_dan',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Thời khắc chuyển giao năm cũ sang năm mới (23h00 đêm 30 Tết đến 01h00 mùng 1 Tết)',
      meaning: 'Nghi thức bàn giao việc cai quản hạ giới giữa Quan Hành khiển năm cũ và Quan Hành khiển năm mới.',
      offerings: 'Gà trống luộc ngậm hoa hồng (hoặc thịt heo luộc/chân giò), bánh chưng/bánh tét, đĩa xôi gấc đỏ, trầu cau, trà rượu, đèn nến, tiền vàng sắm riêng cho lễ Giao thừa.',
      taboos: 'Mâm lễ đặt ngoài trời (trước sân, ban công hoặc trước cửa chính). Tên quan Hành khiển và Phán quan đổi theo từng năm và có dị bản giữa các sách; bài này khấn chung, không nêu tên riêng.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy Đức Đương lai hạ sinh Di Lặc Tôn Phật.
Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy ngài Cựu niên Đương cai Hành khiển, Cựu niên Phán quan.
Con kính lạy ngài Tân niên Đương cai Hành khiển, Tân niên Phán quan cai quản năm {{NAM_AM}}.
Con kính lạy các ngài Ngũ phương, Ngũ thổ, Long Mạch, Táo quân, chư vị Tôn thần.

Tín chủ (chúng) con là: {{GIA_CHU_NAME}}, sinh năm {{GIA_CHU_AGE}}.
Ngụ tại: {{GIA_CHU_ADDRESS}}.

Phút thiêng liêng giao thừa vừa tới, năm cũ qua đi, đón mừng năm mới, tam dương khai thái, vạn tượng canh tân. Nay Ngài Thái tuế tôn thần trên vâng lệnh Thượng đế giám sát vạn dân, dưới bảo hộ sinh linh. Quan cũ về triều mệnh, quan mới giáng lâm chứng giám.

Tín chủ con thành tâm sắm sửa hương hoa phẩm vật, kim ngân trà quả, bày biện trước án ngoài trời, kính dâng lên chư vị Tôn thần. Cúi xin giáng lâm trước án thụ hưởng lễ vật, phù hộ độ trì cho toàn gia năm mới: Già trẻ bình an, gia đạo hưng long, công danh tiến tới, lộc tài vượng phát.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_giao_thua_trong_nha',
      title: 'Văn khấn Giao thừa trong nhà (Lễ Gia Tiên)',
      category: 'tet_nguyen_dan',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Ngay sau khi tiến hành lễ Giao thừa ngoài trời xong',
      meaning: 'Cúng tạ Thần linh bản thổ và thỉnh cầu Tổ Tiên nội ngoại ngự linh bàn thờ ngày đầu năm mới.',
      offerings: 'Mâm cỗ mặn hoặc chay, bánh chưng bánh tét, mứt Tết, ngũ quả, hoa cúc/đào/mai, trầu cau, trà nước, tiền vàng gia tiên.',
      taboos: 'Trong lúc khấn gia tiên phải kính cẩn trang nghiêm, kiêng kỵ làm đổ vỡ bát đĩa hay chén nước.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy ngài Bản cảnh Thành Hoàng, ngài Bản gia Thổ Công, Đông trù Tư mệnh Táo phủ Thần quân.
Con kính lạy Tổ Tiên nội ngoại dòng họ, chư vị Hương linh tiền bối.

Tín chủ (chúng) con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Nay giờ trừ tịch vừa qua, xuân tiết vừa tới, giao thời chuyển đổi. Toàn gia con cháu tề tựu trước bàn thờ gia tiên, sắm sửa mâm cỗ thanh bông hoa quả, thắp nén tâm hương dâng lên bàn thờ.

Kính mời Tổ tiên, phụ mẫu, chư vị hương linh nội ngoại đồng lai hâm hưởng. Phù hộ độ trì cho con cháu bước sang năm mới gặp nhiều may mắn, mạnh khỏe bình an, vạn sự hanh thông, gia đạo êm ấm cát tường.

Chúng con lễ bạc lòng thành, cúi xin chứng giám.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_mung_1_tet',
      title: 'Văn khấn Sáng mùng Một Tết (Nguyên Đán - Rước Lộc Đầu Năm)',
      category: 'tet_nguyen_dan',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Sáng sớm ngày mùng 1 tháng Giêng âm lịch',
      meaning: 'Nghi thức dâng hương ngày đầu năm mới, kính mừng nguyên đán, cầu bình an, thọ khang, phúc lộc cho cả năm.',
      offerings: 'Mâm cỗ mặn hoặc cỗ chay thanh tịnh, bánh chưng, giò lụa, xôi gấc, mâm ngũ quả, hoa tươi, trầu cau, bánh mứt, trà mới mở niêm phong.',
      taboos: 'Theo tục, nhiều nhà chọn người xông đất đầu năm và kiêng quét nhà trong sáng mùng Một.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy Đức Đương lai hạ sinh Di Lặc Tôn Phật.
Con kính lạy các cụ Tổ Khảo, Tổ Tỷ, bá thúc huynh đệ, cô di tỷ muội, hương linh nội ngoại hai họ.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay là sớm mùng Một tháng Giêng năm {{NAM_AM}}, nhằm tiết đầu xuân Nguyên Đán. Khí trời tươi sáng, đất trời đổi mới, xuân mới sang rạng rỡ muôn nơi.

Con cháu thành tâm dâng hương thơm, hoa quả, phẩm vật mâm cơm đầu năm, kính cẩn dâng lên trước linh sàng gia tiên. Kính mời chư vị hương linh nội ngoại giáng lâm trước án hâm hưởng lễ vật.

Cúi xin tổ tiên phù hộ độ trì cho cháu con năm mới: Khang ninh phúc thọ, học hành tấn tới, công tác hanh thông, vạn sự hanh thông như ý.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_hoa_vang',
      title: 'Văn khấn Lễ Hóa Vàng tạ năm mới (thường mùng 3, có nơi mùng 4 hoặc mùng 7)',
      category: 'tet_nguyen_dan',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Ngày mùng 3, mùng 4 hoặc mùng 7 (lễ Khai hạ) tháng Giêng',
      meaning: 'Lễ tạ gia tiên và thần linh sau những ngày Tết đón xuân, hóa vàng tiễn đưa tổ tiên về âm cảnh.',
      offerings: 'Mâm cỗ mặn đầy đủ, con gà trống luộc nguyên con, bánh chưng/bánh tét, hoa tươi, quả ngọt, trầu cau, tiền vàng mã Tết, hai cây mía nguyên ngọn (để tổ tiên chống gậy gánh vàng).',
      taboos: 'Hóa vàng sau khi tuần hương đã tàn; đốt gọn ở nơi an toàn, tránh gây cháy.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy chín phương Trời, mười phương Chư Phật.
Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy ngài Bản cảnh Thành hoàng, ngài Bản xứ Thổ địa, ngài Bản gia Táo quân cùng chư vị Tôn thần.
Con kính lạy Tổ Tiên nội ngoại chư vị Hương linh.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay ngày lành tháng tốt, nhằm ngày tạ năm mới Tết Nguyên Đán năm {{NAM_AM}}. Tiết xuân vui vầy, tuần tết viên mãn, gia đình chúng con sắm sanh mâm cơm canh, lễ vật hương hoa trà quả, kính dâng tạ lễ trước án.

Kính thỉnh chư vị Thần linh và Tổ tiên thụ hưởng lễ bạc lòng thành. Kính tiễn chư vị hương linh hồi quy âm cảnh, xin lưu ân lưu phúc cho cháu con trần gian: Quanh năm thuận hòa, bốn mùa hanh thông, công việc kinh doanh buôn bán đầu xuân khởi sắc, vạn sự bình an.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_ram_thang_gieng',
      title: 'Văn khấn Tết Thượng Nguyên (Rằm tháng Giêng)',
      category: 'tet_nguyen_dan',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Ngày 14 hoặc chính Rằm 15 tháng Giêng âm lịch',
      meaning: 'Dân gian có câu "Lễ Phật quanh năm không bằng ngày Rằm tháng Giêng" (cũng truyền là "Cúng quanh năm..."). Theo quan niệm Đạo giáo, đây là tiết Thượng Nguyên, Thiên Quan tứ phúc.',
      offerings: 'Bàn thờ Phật cúng chay (chè trôi nước, hoa quả, xôi chè). Bàn thờ gia tiên cúng mặn (gà luộc, canh măng, giò chả, xôi gấc, bánh chưng, trầu cau, hương hoa).',
      taboos: 'Nên làm lễ vào giờ Ngọ (11h-13h) hoặc buổi sáng ngày Rằm.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy ngài Bản cảnh Thành hoàng, ngài Bản xứ Thổ địa, ngài Bản gia Táo quân cùng chư vị Tôn thần.
Con kính lạy Tổ Tiên nội ngoại hai họ.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay nhân dịp Rằm tháng Giêng năm {{NAM_AM}}, nhằm tiết Thượng Nguyên Thiên quan tứ phước. Tín chủ con cảm niệm ân đức trời biển của trời đất thần linh và tổ tiên tiền bối, thành tâm sắm sửa hương hoa trà quả, kim ngân phẩm vật kính dâng trước án.

Cúi xin chư vị giáng lâm trước án chứng giám lòng thành, phù hộ độ trì cho gia đình chúng con: Già trẻ bình an, lộc tài sung túc, tâm tính an nhiên, giải trừ tai ách, bốn mùa hưng vượng.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },

    // =========================================================================
    // 2. CÁC TIẾT LỄ TRONG NĂM
    // =========================================================================
    {
      id: 'vk_han_thuc',
      title: 'Văn khấn Tết Hàn Thực (Mùng 3 tháng 3 âm lịch)',
      category: 'tiet_trong_nam',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Ngày mùng 3 tháng 3 âm lịch',
      meaning: 'Tưởng nhớ người đã khuất với phong tục làm bánh trôi bánh chay thanh khiết dâng lên tổ tiên.',
      offerings: 'Hương hoa, trầu cau, ngũ quả, đặc biệt không thể thiếu các đĩa bánh trôi (tròn trịa ngọt ngào) và bát bánh chay (thanh tịnh thơm ngát hoa bưởi).',
      taboos: 'Lễ thanh đạm, bánh trôi và bánh chay là chính (thường bày 3 hoặc 5 bát, đĩa).',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy chín phương Trời, mười phương Chư Phật.
Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy ngài Bản cảnh Thành hoàng, ngài Bản xứ Thổ địa, ngài Bản gia Táo quân cùng chư vị Tôn thần.
Con kính lạy Tổ Tiên nội ngoại chư vị Hương linh.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay là ngày mùng 3 tháng 3 âm lịch, nhân tiết Hàn Thực truyền thống. Tín chủ con thành tâm sắm sửa hương hoa quả phẩm, bánh trôi bánh chay tinh khiết dâng lên án tiền.

Cúi xin Thần linh và Tiên tổ chứng giám tấc lòng thơm thảo, phù hộ độ trì cho con cháu trong nhà ấm no hạnh phúc, tâm hồn thanh tịnh, bốn mùa an lành.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_thanh_minh',
      title: 'Văn khấn Tiết Thanh Minh & Tảo Mộ',
      category: 'tiet_trong_nam',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Tiết Thanh Minh (khoảng ngày 4-5 tháng 4 dương lịch, rơi vào nửa cuối tháng 2 hoặc nửa đầu tháng 3 âm lịch)',
      meaning: 'Đạo lý "Uống nước nhớ nguồn", con cháu đến phần mộ tổ tiên quét dọn, đắp đất, thắp hương tri ân cội nguồn.',
      offerings: 'Tại mộ: Hương, hoa tươi, trầu cau, tiền vàng mã, mâm xôi gà luộc hoặc giò nạc, quả ngọt, chai nước sạch, chén rượu. Cúng tại gia đình: Cơm canh gia tiên.',
      taboos: 'Khi đi tảo mộ không dẫm đạp lên mộ phần của người khác xung quanh. Không nói lời khiếm nhã, cười đùa lớn tiếng nơi nghĩa trang.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy ngài Kim Niên Đương Cai Thái Tuế Chí Đức Tôn Thần.
Con kính lạy ngài Bản cảnh Thành Hoàng, Chư vị Đại Vương, ngài Thần linh Thổ Địa cai quản nơi nghĩa trang bản xứ.
Con kính lạy Cố hương linh: {{NGUOI_QUA_CO}} cùng chư vị hương linh dòng họ ngự tại nơi đây.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay nhân tiết Thanh Minh, con cháu hướng về cội nguồn, sửa sang phần mộ, đắp thêm lớp đất mới, nhổ sạch cỏ dại, dâng nén tâm hương chén nước hoa tươi trước mộ phần.

Cúi xin Thần linh Thổ địa cho phép hương linh tổ tiên được ngự yên thanh thản nơi lòng đất mẹ. Kính xin tiên tổ phù hộ cho toàn gia dòng tộc: Con cháu thảo hiền, nối dõi tông đường, mạnh khỏe bình an, hiển vinh phúc ấm.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_doan_ngo',
      title: 'Văn khấn Tết Đoan Ngọ (Mùng 5 tháng 5 âm lịch - Giết sâu bọ)',
      category: 'tiet_trong_nam',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Giờ Ngọ (11h-13h) ngày mùng 5 tháng 5 âm lịch',
      meaning: 'Tiết khí dương khí cực thịnh, cúng tạ đất trời, diệt trừ sâu bọ mùa màng, trừ tà khí, phòng dịch bệnh cho con người.',
      offerings: 'Hương hoa, trầu cau, rượu nếp (cơm rượu nếp cẩm/nếp cái), hoa quả đầu mùa vị chua ngọt (vải, mận, đào, xoài, chôm chôm), bánh tro (bánh ú tro chấm mật mía).',
      taboos: 'Nên cúng vào chính Ngọ (12h trưa). Sau khi cúng, gia đình cùng ăn rượu nếp và hoa quả đầu mùa theo tục "giết sâu bọ".',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy ngài Bản gia Thổ Công, Đông trù Tư mệnh Táo phủ Thần quân.
Con kính lạy Tổ Tiên nội ngoại họ tộc.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay là ngày mùng 5 tháng 5 âm lịch, chính tiết Đoan Ngọ giữa năm. Khí trời dương thịnh, gia đình chúng con sắm sanh hương hoa, quả ngọt, rượu nếp dâng lên trước án.

Kính xin chư vị Tôn thần và Tổ tiên thụ hưởng lễ vật, trừ diệt sâu bọ tà khí, phù hộ cho thân thể con cháu khỏe mạnh dẻo dai, không ốm đau bệnh tật, mùa màng tươi tốt, gia đạo ấm no.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_vu_lan_bao_hieu',
      title: 'Văn khấn Lễ Vu Lan Báo Hiếu (Rằm tháng 7 - Cúng Gia Tiên)',
      category: 'tiet_trong_nam',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Ngày 14 hoặc 15 tháng 7 âm lịch (làm vào ban ngày)',
      meaning: 'Mùa Vu Lan thắng hội theo tích Đại Hiếu Mục Kiền Liên cứu mẹ, tưởng niệm công đức sinh thành dưỡng dục của cha mẹ tổ tiên.',
      offerings: 'Mâm cỗ mặn hoặc chay tinh tịnh, hoa tươi (hoa sen, huệ, hồng), quả ngọt, trà nước, quần áo tiền vàng mã dâng gia tiên ghi rõ họ tên vong linh người nhận.',
      taboos: 'Lễ cúng gia tiên Vu Lan phải làm trước khi cúng thí thực chúng sinh ngoài trời. Không cúng chung đồ mã của gia tiên với đồ cúng cô hồn.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Đức Phật Thích Ca Mâu Ni, Đức Bồ Tát Đại Hiếu Mục Kiền Liên.
Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy Tổ Tiên nội ngoại, phụ mẫu, chư vị Hương linh qua nhiều đời nhiều kiếp.

Tín chủ con là: {{GIA_CHU_NAME}}, sinh năm {{GIA_CHU_AGE}}.
Ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay là ngày Rằm tháng 7 năm {{NAM_AM}}, nhân tiết Vu Lan Báo Hiếu. Chúng con nhớ đức cù lao chín chữ, công sinh thành dưỡng dục cao sâu, thành tâm sắm sửa hương hoa trà quả, mâm cơm thanh tịnh, y phục vàng mã kính dâng lên bàn thờ gia tiên.

Kính thỉnh phụ mẫu, ông bà, cùng liệt vị hương linh nội ngoại quang lâm thụ hưởng. Nguyện nhờ oai lực Tam Bảo chở che, cầu cho cửu huyền thất tổ đều được vãng sinh tịnh độ, con cháu hiện tiền mạnh khỏe, hiếu thảo thuận hòa.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_xa_toi_vong_nhan',
      title: 'Văn khấn Cúng Chúng Sinh / Xá Tội Vong Nhân (Rằm tháng 7 ngoài trời)',
      category: 'tiet_trong_nam',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Chiều muộn hoặc tối ngày 14 hoặc 15 tháng 7 âm lịch',
      meaning: 'Mở rộng lòng từ bi phổ độ, cúng thí thực cho các cô hồn uổng tử, không nơi nương tựa, không ai thờ cúng.',
      offerings: 'Mâm cúng đặt ngoài sân/cửa: Cháo hoa nấu loãng (12 bát nhỏ), bỏng ngô, khoai lang ngô luộc, bánh đa, kẹo bánh, hoa quả, muối gạo (1 đĩa), nước mía/nước lọc, tiền vàng chúng sinh, quần áo giấy ngũ sắc.',
      taboos: 'Theo tục, cúng ngoài sân hoặc trước cửa ngõ, không cúng trong nhà. Cúng xong rải muối gạo ra 4 phương 8 hướng và đốt vàng mã ngay tại chỗ.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Đức Chuẩn Đề Bồ Tát, Đức Bồ Tát Địa Tạng Vương, Đức Tiêu Diện Đại Sĩ Bồ Tát.

Tín chủ con là: {{GIA_CHU_NAME}}, cư ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay là ngày Rằm tháng 7 âm lịch, tiết Trung Nguyên Xá Tội Vong Nhân. Tín chủ con vâng theo lời Phật dạy, mở lòng từ bi bác ái, thiết lập đàn tràng ngoài trời cúng thí thực cho các vong hồn:
Kẻ chết đường chết chợ, chết sông thác biển, binh sĩ tử trận, thai nhi lạc loài, mọi âm hồn cô quạnh phiêu bạt không nơi tựa nương.

Kính thỉnh chư vị tề tựu thụ hưởng: Bát cháo loãng ấm lòng, manh áo giấy che thân, hoa quả khoai ngô thanh đạm. Nhờ ơn Tam Bảo tiếp dẫn, sớm xả bỏ oán thù luyến ái trần gian, vãng sinh lạc quốc.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_trung_thu',
      title: 'Văn khấn Tết Trung Thu (Rằm tháng 8 âm lịch)',
      category: 'tiet_trong_nam',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Ngày Rằm 15 tháng 8 âm lịch (nhiều nhà cúng buổi tối khi trăng lên)',
      meaning: 'Tết đoàn viên, ngắm trăng thưởng nguyệt, dâng bánh nướng bánh dẻo tạ ơn tổ tiên và chúc phúc cho con trẻ.',
      offerings: 'Bánh nướng, bánh dẻo truyền thống, mâm ngũ quả tạo hình (bưởi, hồng, na, chuối, lựu), đèn ông sao, hương hoa trà sen, nước ngọt.',
      taboos: 'Gia đình cùng quây quần phá cỗ trông trăng sau khi cúng lễ, giữ không khí vui tươi đầm ấm.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy ngài Bản cảnh Thành hoàng, ngài Bản xứ Thổ địa, ngài Bản gia Táo quân cùng chư vị Tôn thần.
Con kính lạy Tổ Tiên nội ngoại chư vị Hương linh.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay là ngày Rằm tháng 8 âm lịch, nhằm tiết Trung Thu đoàn viên. Ánh trăng vằng vặc chiếu sáng nhân gian, con cháu sum vầy sửa soạn hương hoa quả ngọt, bánh nướng bánh dẻo kính cẩn dâng lên trước án.

Kính xin Thần linh và Tiên tổ chứng giám, phù hộ cho toàn gia quyến hòa thuận yêu thương, con trẻ thông minh học giỏi, tài lộc dồi dào, vạn sự viên mãn như vầng trăng rằm.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_ha_nguyen',
      title: 'Văn khấn Tết Hạ Nguyên / Cơm Mới (Rằm tháng 10 âm lịch)',
      category: 'tiet_trong_nam',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Ngày Rằm 15 tháng 10 âm lịch (có nơi làm vào mùng 1 hoặc mùng 10 tháng 10)',
      meaning: 'Mừng vụ mùa mười gặt hái bội thu, dâng gạo mới cơm mới tạ ơn Thần Nông, Thần Đất và Tổ tiên.',
      offerings: 'Nồi cơm gạo mới thơm dẻo, đĩa xôi nếp mới, bánh dày/bánh giò, mâm cỗ mặn, hương hoa, trầu cau, trà rượu.',
      taboos: 'Cơm mới dâng cúng tổ tiên trước khi người trong nhà ăn bữa cơm vụ mới.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy Đức Thần Nông.
Con kính lạy ngài Bản cảnh Thành hoàng, ngài Bản xứ Thổ địa, ngài Bản gia Táo quân cùng chư vị Tôn thần.
Con kính lạy Tổ Tiên nội ngoại họ tộc.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay là ngày Rằm tháng 10 âm lịch năm {{NAM_AM}}, chính tiết Hạ Nguyên Cơm Mới. Lúa mùa đã gặt, bồ thóc đã đầy, con cháu thành tâm nấu nồi cơm gạo mới thơm ngát, sắm sửa mâm cỗ thanh tân dâng lên trước án.

Kính tạ trời đất thần nông ban cho mưa thuận gió hòa, kính dâng tổ tiên hâm hưởng hạt ngọc mùa mới. Cúi xin phù hộ cho gia môn đời đời no đủ, mùa sau lại tươi tốt hơn mùa trước.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },

    // =========================================================================
    // 3. TUẦN TIẾT HÀNG THÁNG (MÙNG MỘT & NGÀY RẰM)
    // =========================================================================
    {
      id: 'vk_mung_mot_ram_than_linh',
      title: 'Văn khấn Thổ Công & Thần Linh mùng Một và ngày Rằm',
      category: 'tuan_tiet',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Ngày mùng 1 (Sóc) và ngày 15 (Vọng) âm lịch hàng tháng',
      meaning: 'Cầu bình an, may mắn, che chở từ Thần linh cai quản khu đất thổ cư của gia đình.',
      offerings: 'Hương thơm, hoa tươi (cúc/hồng), quả ngọt tươi, chén nước sạch, trầu cau, vàng mã Thần linh.',
      taboos: 'Thắp số nén hương lẻ (1 hoặc 3 nén). Đèn nến thắp sáng, không để hoa quả héo úng trên bàn thờ.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy ngài Kim niên Đương cai Thái Tuế Chí đức Tôn thần.
Con kính lạy ngài Bản cảnh Thành Hoàng chư vị Đại Vương.
Con kính lạy ngài Đông trù Tư mệnh Táo phủ Thần quân.
Con kính lạy ngài Bản gia Thổ địa Long Mạch Tôn thần.
Con kính lạy các ngài Ngũ phương, Ngũ thổ, Phúc đức chính thần.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay là ngày {{NGAY_AM}} âm lịch, tiết tuần sóc/vọng.
Tín chủ con thành tâm sắm lễ, hương hoa trà quả, đốt nén hương thơm kính dâng trước án. Thành tâm kính mời: Các vị Tôn thần cai quản trong khu vực này giáng lâm trước án chứng giám lòng thành.

Cúi xin chư vị Tôn thần phù hộ độ trì cho gia đình con: Người người bình an, sở cầu tất ứng, sở nguyện tòng tâm, gia đạo hưng thịnh, bốn mùa không tai ách, tám tiết hưởng thái bình.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_mung_mot_ram_gia_tien',
      title: 'Văn khấn Gia Tiên mùng Một và ngày Rằm',
      category: 'tuan_tiet',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Ngày mùng 1 và 15 âm lịch hàng tháng (khấn sau khi khấn Thần linh)',
      meaning: 'Báo hiếu, tưởng nhớ ông bà tổ tiên và duy trì mạch nguồn phúc đức gia đình.',
      offerings: 'Trầu cau, hoa quả tươi, mâm cơm chay hoặc mặn, tiền vàng gia tiên, nước trong.',
      taboos: 'Không dùng đồ ôi thiu cúng tổ tiên. Đứng khấn trang nghiêm, áo quần chỉnh tề.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Tổ Tiên nội ngoại chư vị Hương linh.

Tín chủ con là: {{GIA_CHU_NAME}}, sinh năm {{GIA_CHU_AGE}}.
Ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay là ngày {{NGAY_AM}} âm lịch.
Nhân tuần sóc/vọng, con cháu tưởng niệm ân đức trời biển của tổ tiên, ông bà, cha mẹ. Con xin thành tâm kính dâng lễ vật, thắp nén hương thơm, kính mời chư vị Hương linh nội ngoại giáng phó linh sàng thụ hưởng lễ vật.

Cúi xin tổ tiên phù hộ độ trì cho toàn thể con cháu mạnh khỏe, đoàn kết yêu thương, làm ăn tấn tới, vạn sự bình yên.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },

    // =========================================================================
    // 4. TANG LỄ, GIỖ CHẠP & TƯỞNG NIỆM GIA TIÊN
    // =========================================================================
    {
      id: 'vk_chung_that_49_ngay',
      title: 'Văn khấn Lễ Chung Thất (Cúng 49 ngày)',
      category: 'gio_chap_tang_le',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Tròn 49 ngày kể từ ngày người thân qua đời',
      meaning: 'Thời điểm kết thúc giai đoạn trung hữu (thân trung ấm), định hình cảnh giới tái sinh theo nghiệp lực.',
      offerings: 'Mâm cơm chay hoặc mặn thanh đạm, hoa tươi (hoa huệ trắng/cúc vàng), quả ngọt, hương đèn, quần áo giấy tiền vàng cho vong linh.',
      taboos: 'Khuyên làm cỗ chay phóng sinh để hồi hướng công đức cho vong linh siêu thoát nhẹ nhàng, tránh sát sinh linh đình.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Đức Phật A Di Đà, Đức Bồ Tát Quán Thế Âm, Đức Bồ Tát Địa Tạng Vương tiếp dẫn hương linh.
Con kính lạy Thập Điện Minh Vương chứng minh soi xét.

Tín chủ con là: {{GIA_CHU_NAME}}, cùng toàn thể gia quyến.
Ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay là ngày làm Lễ Chung Thất (49 ngày) cho Cố hương linh: {{NGUOI_QUA_CO}}.
Than ôi! Âm dương cách biệt, bóng hạc xa xôi, nỗi đau đớn xót xa chưa nguôi trong lòng con cháu. Nay tuần tứ cửu đã tròn, chúng con sắm sanh hương hoa, trà quả, cơm chay dâng trước linh sàng.

Cúi xin Tam Bảo từ bi tiếp dẫn, nguyện xin Cố hương linh nương bóng Phật đài xả bỏ trần duyên, tiêu trừ nghiệp chướng, siêu sinh về miền Cực Lạc an vui.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_tot_khoc_100_ngay',
      title: 'Văn khấn Lễ Tốt Khốc (Cúng 100 ngày)',
      category: 'gio_chap_tang_le',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Tròn 100 ngày tính từ ngày người thân mất',
      meaning: 'Lễ "Thôi khóc", con cháu nén đau thương để trở lại nhịp sống thường nhật, an ủi vong linh yên nghỉ.',
      offerings: 'Mâm cỗ cúng thanh tịnh, bát cơm quả trứng, hoa tươi, quả ngọt, tiền vàng giấy áo.',
      taboos: 'Sau lễ này gia đình ngừng việc than khóc thảm thiết trước bàn thờ để hương linh không vướng bận.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Chư Phật mười phương, chư vị Tôn thần bản thổ.
Kính lạy Cố hương linh: {{NGUOI_QUA_CO}}.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay là ngày Lễ Tốt Khốc (100 ngày) của cố nhân. Ngày tháng thoi đưa, trăm ngày vừa khép, con cháu kính dâng mâm cơm thanh bông hoa quả tưởng niệm người xưa.

Nguyện cầu vong linh được yên nghỉ thanh thản nơi chín suối, che chở phù hộ cho gia đạo cháu con được bình an vô sự, thuận hòa tiếp bước tiền nhân.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_tieu_tuong_gio_dau',
      title: 'Văn khấn Giỗ Đầu (Tiểu Tường - Tròn 1 năm)',
      category: 'gio_chap_tang_le',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Đúng ngày mất âm lịch tròn 1 năm (vẫn trong tang kỳ)',
      meaning: 'Lễ giỗ đầu mang tính chất bi ai (tang phục vẫn mặc nguyên), bày tỏ nỗi tiếc thương khôn nguôi.',
      offerings: 'Mâm cỗ giỗ truyền thống, hoa tươi, quả ngọt, trầu cau, hương đèn, vàng mã cho người đã khuất.',
      taboos: 'Không mở nhạc vui, hát xướng ồn ào, nghi thức giữ vẻ tôn nghiêm trầm mặc.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy Tổ Tiên nội ngoại chư vị Hương linh.
Con kính lạy Cố hương linh: {{NGUOI_QUA_CO}}.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay là ngày {{NGAY_AM}} âm lịch, nhằm ngày lễ Tiểu Tường tròn một năm người khuất xa trần thế. Một năm trôi qua nỗi xót xa khôn xiết, con cháu kính dâng mâm cơm giỗ đầu, thắp nén hương thơm kính viếng linh hồn.

Cúi xin cố nhân giáng lâm chứng giám tấc dạ hiếu kính, phù hộ cho gia quyến vượt qua mất mát, giữ gìn nền nếp gia phong hưng thịnh.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_dai_tuong_gio_het',
      title: 'Văn khấn Giỗ Hết (Đại Tường - Tròn 2 năm, Đoạn Tang)',
      category: 'gio_chap_tang_le',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Tròn 2 năm tính theo ngày mất âm lịch',
      meaning: 'Lễ hết tang (Đoạn tang), kết thúc thời kỳ mang tang phục, chuẩn bị rước linh vị vào bàn thờ tổ tiên chung.',
      offerings: 'Mâm cỗ mặn thịnh soạn, đồ lễ tạ thần linh, vàng mã đoạn tang (đốt toàn bộ tang phục và đồ dùng tang chế).',
      taboos: 'Sau Giỗ Hết, gia đình thôi tang phục và trở lại sinh hoạt bình thường. Có sách tính mãn tang sau 27 tháng (lễ Đàm tế).',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Hoàng thiên Hậu Thổ, chư vị Tôn thần bản gia.
Con kính lạy Tổ Tiên nội ngoại hai họ.
Kính lạy Cố hương linh: {{NGUOI_QUA_CO}}.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay là ngày Đại Tường (giỗ hết tang), ngày {{NGAY_AM}} âm lịch. Hai năm tang chế đã tròn, đạo hiếu vuông tròn bổn phận, con cháu sắm lễ cúng tạ tổ tiên và cáo hết tang kỳ.

Cúi xin cố nhân yên lòng nơi cõi tịnh, hộ trì cho con cháu từ nay bước vào cảnh vận hanh thông mới, bình an thịnh vượng.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_tien_thuong',
      title: 'Văn khấn Cúng Tiên Thường (Chiều trước ngày Giỗ)',
      category: 'gio_chap_tang_le',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Chiều tối ngày hôm trước ngày chính giỗ',
      meaning: 'Lễ cáo giỗ, thỉnh rước hương linh người quá cố và tổ tiên về trước để chuẩn bị ngày chính kỵ.',
      offerings: 'Mâm cơm thanh đạm, trầu cau, chén rượu chén nước, hoa tươi, quả ngọt, thắp hương bàn thờ Thần linh và Gia tiên.',
      taboos: 'Phải cúng Thần linh Thổ địa trước để xin phép cho hương linh gia tiên được vào nhà thụ hưởng lễ vật.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy ngài Bản cảnh Thành hoàng, ngài Bản xứ Thổ địa cùng chư vị Tôn thần.
Con kính lạy Tổ Tiên nội ngoại chư vị Hương linh.
Con kính lạy Cố hương linh: {{QUAN_HE}}{{NGUOI_QUA_CO}}{{MO_PHAN_BLOCK}}.

Tín chủ con là: {{GIA_CHU_NAME}}, sinh năm {{GIA_CHU_AGE}}.
Ngụ tại: {{GIA_CHU_ADDRESS}}.

Ngày mai là ngày chính giỗ húy nhật của {{QUAN_HE}}{{NGUOI_QUA_CO}}. Chiều nay ngày Tiên Thường, con cháu chuẩn bị mâm lễ thanh bông trà quả thắp nén hương thơm kính thỉnh: Chư vị Thần linh cho phép Cố hương linh cùng tổ tiên về hâm hưởng; kính rước Cố hương linh cùng tổ tiên nội ngoại sớm về ngự trước án để ngày mai cùng thụ hưởng ngày giỗ kỵ.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_gio_thuong',
      title: 'Văn khấn cúng Giỗ Thường (Cát Kỵ - Từ năm thứ 3 trở đi)',
      category: 'gio_chap_tang_le',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Ngày giỗ từ năm thứ 3 sau ngày mất trở đi',
      meaning: 'Lễ giỗ lành (Cát Kỵ) tưởng nhớ công đức sinh thành dưỡng dục của người thân đã khuất theo thường niên.',
      offerings: 'Mâm cỗ mặn hoặc chay truyền thống, hương hoa trà quả, trầu cau, chén rượu, vàng mã biếu gia tiên.',
      taboos: 'Không dùng các món mà khi sống người quá cố kiêng kỵ hoặc dị ứng để dâng cúng.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần, Thần linh Thổ địa cai quản bản xứ.
Con kính lạy Tổ Tiên nội ngoại họ tộc.
Con kính lạy Cố hương linh: {{QUAN_HE}}{{NGUOI_QUA_CO}}{{MO_PHAN_BLOCK}}.

Tín chủ con là: {{GIA_CHU_NAME}}, sinh năm {{GIA_CHU_AGE}}.
Ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay là ngày {{NGAY_AM}} âm lịch.
Chính là ngày Cát Kỵ của {{QUAN_HE}}{{NGUOI_QUA_CO}}.
Thiết nghĩ: Ơn dưỡng dục cao dày như non thái, đức sinh thành tựa biển đông. Nay gặp ngày húy nhật, con cháu tề tựu trước bàn thờ kính cẩn dâng lên mâm cỗ thanh trai quả phẩm, thắp nén hương thơm thành tâm kính bái.

Cúi xin Cố hương linh giáng lâm trước án hâm hưởng lễ vật, phù hộ độ trì cho toàn gia quyến già trẻ an khang, gia đạo hưng long, muôn sự tốt lành.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_ta_mo_cuoi_nam',
      title: 'Văn khấn Tạ Mộ / Sửa Sang Mộ Phần Tiết Chạp',
      category: 'gio_chap_tang_le',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Từ 23 đến 30 tháng Chạp âm lịch hàng năm',
      meaning: 'Lễ "chạp mả", dọn dẹp phần mộ tổ tiên đón Tết, rước linh hồn ông bà về ăn Tết cùng cháu con.',
      offerings: 'Hương thơm, hoa cúc tươi, trầu cau, rượu trắng, gà luộc hoặc thịt heo quay, đĩa xôi nếp gấc, tiền vàng tạ thổ thần và tiền vàng tổ tiên.',
      taboos: 'Phải khấn xin phép Thần linh Thổ địa cai quản nghĩa trang trước khi tiến hành dọn dẹp hay thắp hương mộ tổ tiên.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy ngài Kim Niên Thái Tuế Chí Đức Tôn Thần.
Con kính lạy ngài Bản cảnh Thành Hoàng, ngài Hậu Thổ Long Mạch cai quản bản xứ nghĩa địa.
Con kính lạy Tổ Tiên nội ngoại họ tộc đang an nghỉ nơi này.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Tiết cuối năm cùng, con cháu ra chốn nghĩa trang sửa sang phần mộ, đắp điếm cỏ cây, thắp nén hương thơm dâng lời tạ mộ.
Kính xin Hậu Thổ Tôn thần phù hộ cho mộ phần được an yên vững chãi. Kính rước các cụ tổ tiên, cô dì chú bác cùng về mái nhà xưa sum vầy ăn Tết cùng con cháu.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },

    // =========================================================================
    // 5. NGHI LỄ VÒNG ĐỜI & GIA ĐÌNH
    // =========================================================================
    {
      id: 'vk_day_thang_mu',
      title: 'Văn khấn Cúng Mụ Đầy Tháng (Tạ 12 Bà Mụ)',
      category: 'vong_doi',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Khi bé tròn 1 tháng tuổi theo âm lịch (nhiều nơi làm sớm theo lệ "gái lùi 2, trai lùi 1" ngày; có nơi tính khác)',
      meaning: 'Tạ ơn 12 Bà Mụ đã nặn ra hình hài và chăm nom đứa trẻ, cầu cho mẹ tròn con vuông.',
      offerings: '12 chén chè nhỏ + 1 tô chè lớn (chè đậu trắng cho trai, chè trôi nước cho gái), 12 đĩa xôi nhỏ + 1 đĩa xôi lớn, gà luộc bắt chéo cánh, trầu têm cánh phượng (12 miếng nhỏ + 1 miếng lớn), hoa tươi, quả ngọt, giấy cúng bà Mụ.',
      taboos: 'Nghi thức "bắt miếng" (khai hoa) chúc phúc cho bé ăn nói có duyên phải do người phúc đức, nhanh nhẹn thực hiện.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Đệ nhất Thiên tỷ đại tiên chúa, Đệ nhị Thiên đế đại tiên chúa, Đệ tam Tiên Mụ đại tiên chúa.
Con kính lạy Thập nhị Bộ Tiên Nương (12 Bà Mụ) coi sóc thai sản và dạy dỗ trẻ thơ.

Hôm nay là ngày lành tháng tốt, ngày {{NGAY_AM}} âm lịch.
Vợ chồng tín chủ con là: {{GIA_CHU_NAME}}.
Cư ngụ tại: {{GIA_CHU_ADDRESS}}.
Vừa sinh hạ được cháu bé: {{NGUOI_QUA_CO}}.

Nay cháu tròn một tháng tuổi, con cháu thành tâm sắm sanh hương hoa trà quả, xôi chè phẩm vật dâng lên trước án các Tiên Nương.

Cúi xin các Bà Mụ giáng lâm chứng giám, phù hộ cho cháu bé: Ăn ngoan ngủ kỹ, mau lớn khỏe mạnh, thông minh sáng dạ, thân thể lành lặn, trọn đời bình an vô tai ách.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_thoi_noi',
      title: 'Văn khấn Cúng Mụ Thôi Nôi (Mừng bé tròn 1 tuổi)',
      category: 'vong_doi',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Bé tròn 1 tuổi (tính theo ngày âm lịch)',
      meaning: 'Lễ thôi nằm nôi, chuyển sang nằm giường, tạ ơn Bà Mụ và làm lễ bốc đồ chọn nghề tương lai cho bé.',
      offerings: 'Mâm cúng Bà Mụ tương tự lễ đầy tháng (xôi, chè, gà luộc, trầu cau, hoa quả), kèm khay đồ chơi chọn nghề (sách vở, bút, gương lược, tiền, kéo, ống nghe bác sĩ...).',
      taboos: 'Khay bốc đồ cho bé nên sắp xếp tự nhiên để bé tùy ý chạm tay vào món đồ yêu thích đầu tiên.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Thập nhị Bộ Tiên Nương.
Con kính lạy Bản gia Thổ Công, Tổ Tiên nội ngoại dòng họ.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.
Hôm nay ngày vui tròn một tuổi của cháu: {{NGUOI_QUA_CO}}.

Gia đình sửa soạn mâm lễ thôi nôi thanh khiết kính dâng trước án. Kính tạ công ơn nuôi nấng uốn nắn của 12 Bà Mụ trong một năm đầu đời non nớt.
Xin tiếp tục che chở cho cháu thông tuệ, dũng cảm, học hành giỏi giang, hiếu thuận với mẹ cha, tiền đồ rạng rỡ.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_dam_ngo',
      title: 'Văn khấn Lễ Dạm Ngõ (Báo Cáo Gia Tiên Cưới Hỏi)',
      category: 'vong_doi',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Buổi gặp gỡ chính thức đầu tiên giữa hai họ nhà trai và nhà gái',
      meaning: 'Báo cáo tổ tiên về việc tìm hiểu hôn nhân của đôi trẻ, xin phép đi lại chính thức.',
      offerings: 'Trầu cau (buồng cau tươi, trầu têm), trà ngon, rượu thơm, thuốc lá, bánh phu thê (bánh su sê), hoa quả tươi.',
      taboos: 'Lễ vật mang sang nhà gái phải là số chẵn (theo phong tục miền Bắc) hoặc số lượng theo quy ước từng vùng.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy ngài Bản cảnh Thành hoàng, ngài Bản xứ Thổ địa cùng chư vị Tôn thần.
Con kính lạy Tổ Tiên nội ngoại chư vị Hương linh.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay ngày lành tháng tốt, ngày {{NGAY_AM}} âm lịch.
Gia đình chúng con có con cái đến tuổi trưởng thành kết tóc xe duyên. Nhà trai đã sang làm lễ dạm ngõ, hai bên gia đình thuận tình ước hẹn.
Con xin thắp nén hương thơm kính cáo tổ tiên, cúi xin chư vị chứng giám mối lương duyên, phù hộ cho hai cháu trọn đời hòa thuận, hôn nhân thuận buồm xuôi gió.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_an_hoi',
      title: 'Văn khấn Lễ Ăn Hỏi (Đính Hôn)',
      category: 'vong_doi',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Ngày làm lễ đính hôn ăn hỏi tại nhà gái',
      meaning: 'Nhà trai mang tráp lễ sang nhà gái chính thức xin hỏi cưới, dâng lễ vật báo cáo tổ tiên họ nhà gái.',
      offerings: 'Tráp trầu cau, tráp chè thái nguyên, tráp rượu thuốc lá, tráp bánh cốm/bánh phu thê, tráp hoa quả rồng phượng, heo quay hoặc xôi gấc.',
      taboos: 'Đội bê tráp nam thanh nữ tú phải là người chưa lập gia đình. Khi mở nắp tráp trên bàn thờ gia tiên nhà gái phải nhẹ nhàng trang trọng.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy chín phương Trời, mười phương Chư Phật.
Con kính lạy các cụ Tổ Tiên nội ngoại bên nhà gái.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay ngày cát nhật, nhà trai đem tráp lễ vật sang thưa chuyện đính ước hôn nhân cho đôi trẻ. Con cháu sửa biện mâm tráp hương đăng trà quả, kính cẩn dâng lên trước bàn thờ tổ tiên.

Cúi xin liệt vị tiên tổ chứng giám lòng thành chấp thuận lễ đính hôn, ban phước cho đôi lứa trăm năm sắt son gắn bó, gia quyến hai bên sum vầy gắn kết.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_thanh_hon',
      title: 'Văn khấn Lễ Thành Hôn (Đón dâu trước Bàn Thờ Gia Tiên)',
      category: 'vong_doi',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Thời khắc đón dâu về đến nhà chồng, làm lễ gia tiên',
      meaning: 'Cô dâu chú rể bái tạ tổ tiên họ nhà trai, chính thức nhập tịch gia đình và thề ước thủy chung trọn đời.',
      offerings: 'Mâm cỗ cưới gia tiên, trầu cau, rượu, đèn nến, hoa tươi quả ngọt.',
      taboos: 'Lễ gia tiên làm trang nghiêm, đầm ấm; nghi thức cụ thể theo lệ từng nhà, từng vùng.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy chín phương Trời, mười phương Chư Phật.
Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy Tổ Tiên nội ngoại dòng tộc.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.
Hôm nay ngày cát tường, hai cháu tác thành gia thất, đón dâu hiền về phụng thờ tổ đường.

Đôi tân lang tân nương thành kính quỳ trước án tiền, dâng nén tâm hương chén rượu thơm thề nguyền gắn bó.
Cúi xin tổ tiên thụ hưởng chứng minh, phù hộ cho đôi trẻ: Loan phụng hòa minh, bách niên giai lão, sinh con thảo cháu hiền, gia môn rạng rỡ.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_mung_tho',
      title: 'Văn khấn Lễ Mừng Thọ (Thượng Thọ 70, 80, 90 tuổi)',
      category: 'vong_doi',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Dịp đầu xuân hoặc ngày sinh của người cao tuổi',
      meaning: 'Tạ ơn Trời Phật gia tiên ban phúc thọ cho cha mẹ ông bà, con cháu bày tỏ lòng hiếu kính tri ân.',
      offerings: 'Bánh kem mừng thọ hoặc đào tiên, mâm xôi gà gấc đỏ, hoa tươi, quả ngọt, trà ngon rượu quý, bức trướng chúc thọ.',
      taboos: 'Không khí buổi lễ vui vẻ, đầm ấm; người được mừng thọ mặc trang phục truyền thống.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy chư vị Thần linh bản xứ.
Con kính lạy Tổ Tiên nội ngoại chư vị Hương linh.

Tín chủ chúng con là: {{GIA_CHU_NAME}}, cùng con cháu nội ngoại.
Ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay ngày lành tháng tốt, con cháu kính cẩn tổ chức Lễ Mừng Thọ cho: {{NGUOI_QUA_CO}} nhân dịp thượng thọ.

Chúng con sửa mâm hoa quả lễ vật dâng lên tạ ơn trời đất tổ tiên đã gìn giữ cho cây cao bóng cả trong nhà được khỏe mạnh trường thọ. Cúi xin ban thêm tuổi thọ vô cương, thân tâm an lạc, cùng con cháu hưởng trọn phúc lành.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },

    // =========================================================================
    // 6. NHÀ ĐẤT, XÂY DỰNG & KINH DOANH
    // =========================================================================
    {
      id: 'vk_dong_tho',
      title: 'Văn khấn Lễ Động Thổ (Khởi công xây nhà, đào móng)',
      category: 'nha_dat_kinh_doanh',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Giờ tốt ngày động thổ khởi công đào móng xây dựng',
      meaning: 'Cáo lễ Thần Hoàng, Thổ công, Thổ địa, Long Mạch xin phép khởi công xây dựng công trình vững chắc bình an.',
      offerings: 'Gà luộc nguyên con, đĩa xôi nếp gấc, trầu cau, hương hoa quả, rượu trắng, 1 bát gạo, 1 bát muối, đinh vàng hoa, giấy tiền, xẻng xúc đất mới.',
      taboos: 'Theo tục, gia chủ xúc nhát xẻng đầu tiên; nếu mượn tuổi thì người được mượn tuổi đứng làm lễ và xúc đất.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy ngài Kim niên Đương cai Thái Tuế Chí đức Tôn thần.
Con kính lạy ngài Bản cảnh Thành Hoàng chư vị Đại Vương.
Con kính lạy ngài Bản xứ Thổ địa, ngài Định phúc Táo quân, ngài Long Mạch Tôn thần cai quản khu vực.

Tín chủ con là: {{GIA_CHU_NAME}}, sinh năm {{GIA_CHU_AGE}}.
Ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay ngày lành tháng tốt, ngày {{NGAY_AM}} âm lịch.
Tín chủ con khởi tâm xây dựng ngôi gia cư (công trình) cho gia đình con cháu cư ngụ. Nay chọn được giờ hoàng đạo, con xin thành tâm sắm sửa lễ vật kính dâng lên chư vị Tôn thần.

Cúi xin chư vị Tôn thần soi xét lòng thành, cho phép tín chủ con được động thổ khởi công. Phù hộ độ trì cho thợ thuyền bình an, công trình hoàn thành thuận lợi, bền vững trăm năm, gia đạo cát xương hưng vượng.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_cat_noc',
      title: 'Văn khấn Lễ Cất Nóc (Thượng Lương - Đặt Đòn Dông)',
      category: 'nha_dat_kinh_doanh',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Giờ hoàng đạo ngày gác thanh đòn dông chính của mái nhà',
      meaning: 'Cáo yết thần linh long mạch khi bộ khung sườn mái nhà được định vị vững chãi, che mưa chắn gió cho ngôi nhà.',
      offerings: 'gà trống luộc, xôi gấc, trầu cau, trà rượu, hoa tươi, quả ngọt.',
      taboos: 'Theo tục, lúc đặt đòn dông mọi người giữ hòa khí và làm việc cẩn thận.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy ngài Kim niên Đương cai Thái Tuế Chí đức Tôn thần.
Con kính lạy ngài Bản cảnh Thành hoàng, ngài Bản xứ Thổ địa, ngài Bản gia Táo quân cùng chư vị Tôn thần.
Con kính lạy ngài Lỗ Ban Tiên Sư chứng giám.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay nhằm giờ lành cát nhật ngày {{NGAY_AM}} âm lịch.
Ngôi nhà đang xây đã đến ngày cất nóc thượng lương. Con xin kính cẩn dâng lễ vật hương hoa trà rượu, tâu trình chư vị Thần linh.
Cúi xin chứng giám cho cây đòn dông an vị vững vàng, rui mè che chở, nhà cửa bền bỉ trăm năm trước nắng mưa giông bão, gia quyến an khang thịnh vượng.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_nhap_trach',
      title: 'Văn khấn Lễ Nhập Trạch (Về Nhà Mới)',
      category: 'nha_dat_kinh_doanh',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Giờ tốt ngày dọn vào sinh sống tại ngôi nhà mới',
      meaning: 'Cáo yết Thần linh cai quản bản gia xin cư ngụ và rước chân nhang gia tiên về phụng thờ chốn mới.',
      offerings: 'Mâm ngũ quả, hoa tươi, hương nến, mâm cỗ mặn, gạo muối nước, trầu cau, tiền vàng, bếp than/bếp lửa ấm, chổi mới.',
      taboos: 'Theo tập tục, vật mang vào nhà trước tiên là chiếu hoặc đệm, bếp lửa, chổi, gạo, nước; kiêng đi tay không vào nhà mới.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy chín phương Trời, mười phương Chư Phật.
Con kính lạy chư vị Tôn thần cai quản trong khu vực nhà mới.
Con kính lạy ngài Bản gia Thổ Công, Đông trù Tư mệnh Táo phủ Thần quân.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại căn nhà mới: {{GIA_CHU_ADDRESS}}.

Nay công trình nhà cửa đã hoàn tất khang trang, con xin chọn ngày lành tháng cát dọn về an cư lạc nghiệp. Kính cẩn dâng lên hoa tươi quả ngọt, cỗ bàn thanh tịnh.

Kính xin chư vị Tôn thần chứng giám lòng thành, khai ân cho phép toàn gia con được nhập trạch an cư. Phù hộ cho nhà cửa ấm êm, nhân đinh hưng vượng, tài lộc dồi dào, sở cầu như ý.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_khai_truong',
      title: 'Văn khấn Lễ Khai Trương (Cửa hàng, Công ty, Nhà xưởng)',
      category: 'nha_dat_kinh_doanh',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Giờ hoàng đạo ngày mở cửa kinh doanh đầu năm hoặc thành lập công ty',
      meaning: 'Cầu Thần Tài, Thổ Địa phù hộ cho công việc buôn bán thuận buồm xuôi gió, khách đến đông đúc, tài lộc dồi dào.',
      offerings: 'Gà luộc hoặc heo quay, đĩa xôi gấc, mâm ngũ quả lớn (mãng cầu, dừa, đu đủ, xoài, sung), hoa đồng tiền tươi, trầu cau, trà rượu, vàng mã khai trương.',
      taboos: 'Theo tục, nhiều chủ tiệm nhờ một người vui vẻ, hòa nhã mở hàng đầu tiên.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy Quan Đương niên Hành khiển.
Con kính lạy ngài Bản gia Thổ Địa, ngài Thần Tài vị tiền.
Con kính lạy các vị Tiền chủ Hậu chủ ngụ tại đất này.

Tín chủ con là: {{GIA_CHU_NAME}}, sinh năm {{GIA_CHU_AGE}}.
Cửa hàng (công ty) tại địa chỉ: {{GIA_CHU_ADDRESS}}.

Hôm nay là ngày hoàng đạo khai trương khởi sự: Ngày {{NGAY_AM}} âm lịch.
Tín chủ con thành tâm sắm sửa hương hoa phẩm vật, cỗ mặn trà rượu kính dâng trước án.
Cúi xin Thần Tài Thổ Địa giáng lâm chứng giám lòng thành, phù hộ cho việc kinh doanh thuận lợi, khách hàng tin cậy, làm ăn ngay thẳng.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_ta_dat_cuoi_nam',
      title: 'Văn khấn Lễ Tạ Đất cuối năm',
      category: 'nha_dat_kinh_doanh',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Những ngày giáp Tết cuối năm (thường từ rằm đến 28 tháng Chạp)',
      meaning: 'Tạ ơn các vị Tôn thần cai quản đất đai trong năm qua.',
      offerings: 'gà trống hoặc đĩa thịt heo luộc, đĩa xôi gấc, hoa hồng/cúc vàng, quả ngọt, chén rượu trắng, trầu cau, 5 đinh tiền vàng mã, bát gạo muối.',
      taboos: 'Lễ đặt tại bàn thờ Thổ công hoặc giữa sân nhà hướng nhìn vào cửa chính.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Quan Đương xứ Thổ Địa Chính Thần.
Con kính lạy ngài Đông trù Tư mệnh Táo phủ Thần quân, Long Mạch Thần linh.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Năm hết tết đến, cảm niệm ơn sâu chở che giữ gìn mảnh đất gia cư trong một năm qua, chúng con thành tâm sắm sửa lễ vật tạ ơn Thần linh Thổ Địa.
Kính xin chư vị Tôn thần chứng giám, giữ cho địa mạch an định, phù hộ cho đất đai luôn vững chãi thanh lành, gia đạo năm mới đón tài đón lộc.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },

    // =========================================================================
    // 7. CHÙA, ĐÌNH, ĐỀN, MIẾU, PHỦ
    // =========================================================================
    {
      id: 'vk_le_phat_chua',
      title: 'Văn khấn Lễ Phật tại Chùa (Cầu An, Sám Hối)',
      category: 'chua_den_mieu_phu',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Đi lễ chùa ngày rằm, mùng một, lễ hội hoặc bất cứ ngày nào trong năm',
      meaning: 'Quy y Tam Bảo, cầu Phật từ bi gia hộ bình an, sám hối tội lỗi và trưởng dưỡng lòng thiện.',
      offerings: 'Hương thơm, hoa tươi thanh tịnh (hoa sen, huệ, cúc), quả chín tươi ngon, nước lọc, xôi chè chay. Ban thờ Phật chỉ dâng lễ chay, không dâng đồ mặn hay vàng mã.',
      taboos: 'Vào chùa qua cửa Giả quan (bên phải) và ra qua cửa Không quan (bên trái), không đi qua cửa Trung quan (cửa chính giữa). Trang phục kín đáo trang nghiêm.',
      content: `Nam mô Bản Sư Thích Ca Mâu Ni Phật! (3 lần)
Nam mô A Di Đà Phật! (3 lần)

Đệ tử con là: {{GIA_CHU_NAME}}, sinh năm {{GIA_CHU_AGE}}.
Ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay ngày lành đệ tử thành tâm tới chốn Già lam thanh tịnh, quỳ trước Phật đài, dâng nén tâm hương hoa thơm quả ngọt.
Con xin chí tâm sám hối mọi lỗi lầm thân khẩu ý đã lỡ tạo tác trong nhiều đời nhiều kiếp.

Cúi xin mười phương Chư Phật, Chư Đại Bồ Tát rủ lòng từ bi gia hộ: Thân tâm an lạc, tật bệnh tiêu trừ, nghiệp chướng tiêu tan, trí tuệ sáng suốt, gia đình hòa thuận, hướng tâm làm lành lánh dữ.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_le_duc_ong',
      title: 'Văn khấn Ban Đức Ông',
      category: 'chua_den_mieu_phu',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Khi vào chùa bái lễ Đức Ông (thường vào bái trước khi vào lễ Phật)',
      meaning: 'Tri ân Đức Cấp Cô Độc (Tu Đạt Đa) - vị đại thí chủ hộ trì Phật pháp và cai quản cảnh chùa.',
      offerings: 'Được dâng lễ mặn (thịt luộc, xôi giò, rượu) hoặc lễ chay, trầu cau, hương hoa tiền vàng.',
      taboos: 'Ban Đức Ông có thể dâng lễ chay hoặc lễ mặn; chính điện thờ Phật chỉ dâng lễ chay.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Đức Tu Đạt Đa Trưởng giả, Thập bát Long Thần, Già Lam Chân Tể, chư vị Hộ Pháp Thiện Thần.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay con tới chốn thiền môn, kính dâng lễ vật trước án tiền Đức Ông. Kính xin Ngài soi xét lòng thành, chở che hộ trì cho công việc hanh thông, công danh thăng tiến, tai qua nạn khỏi, sở nguyện tòng tâm.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_thanh_mau_tam_tu_phu',
      title: 'Văn khấn Ban Tam Tòa Thánh Mẫu & Tứ Phủ Vạn Linh',
      category: 'chua_den_mieu_phu',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Đi Đền, Phủ (Phủ Tây Hồ, Phủ Dầy, Đền Bắc Lệ, Đền Mẫu...)',
      meaning: 'Tôn vinh Đạo Mẫu Việt Nam - Mẫu Đệ Nhất Thượng Thiên, Mẫu Đệ Nhị Thượng Ngàn, Mẫu Đệ Tam Thoải Phủ, cầu tài lộc sức khỏe chở che.',
      offerings: 'Hoa tươi (hoa hồng, huệ đỏ), mâm ngũ quả, xôi chè, thịt luộc/gà giò, trầu cau cánh phượng, nón hài hia mã ngũ sắc dâng các cô các cậu.',
      taboos: 'Trang phục rực rỡ chỉnh tề, ăn nói khiêm nhường, không chen lấn xô đẩy trước điện Mẫu.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Tam Tòa Thánh Mẫu:
- Đệ Nhất Thượng Thiên Liễu Hạnh Công Chúa.
- Đệ Nhị Thượng Ngàn Lê Mại Đại Vương.
- Đệ Tam Thoải Phủ Thủy Tinh Xích Lân Công Chúa.
Con kính lạy Tứ Phủ Chầu Bà, Tứ Phủ Quan Hoàng, Thập nhị Tiên cô, Thập vị Thánh cậu, Tứ Phủ Vạn Linh.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay con thành tâm đội đức đội ân, về chốn linh từ dâng mâm lễ vật kính cẩn khấu đầu.
Cúi xin Thánh Mẫu khai ân ban phước: Cho con được thân thể khang kiện, bách bệnh tiêu tan, lộc tài hanh thông, buôn may bán đắt, đi tươi về tốt, sở cầu tất ứng sở nguyện tòng tâm.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_duc_thanh_tran',
      title: 'Văn khấn Đức Thánh Trần (Hưng Đạo Đại Vương)',
      category: 'chua_den_mieu_phu',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Ngày lễ hội Đền Trần (20/8 âm lịch "Tháng Tám giỗ Cha") hoặc đi đền Kiếp Bạc, Bảo Lộc...',
      meaning: 'Tưởng nhớ vị Anh hùng dân tộc Quốc Công Tiết Chế Trần Hưng Đạo, trừ tà diệt ác, cầu dũng khí và bình an.',
      offerings: 'Lễ mặn (gà luộc, thịt luộc), trầu cau, rượu ngon, hoa quả, cờ kiếm mã dành riêng cho Đức Thánh Trần.',
      taboos: 'Trước ban Đức Thánh Trần giữ tâm khí ngay thẳng trung kiên, không cầu tà đạo hay hãm hại người khác.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Đức Thánh Trần Triều hiển thánh Thái Sư Thượng Phụ Quốc Công Tiết Chế Nhân Vũ Hưng Đạo Đại Vương vị tiền.
Con kính lạy Vương Phụ, Vương Mẫu, Vương Phi, Tứ Vị Hoàng Tử cùng Nhị Vị Vương Nữ.
Con kính lạy Tướng quân Yết Kiêu, Dã Tượng, các quan tướng Trần Triều.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay con thành kính dâng hương đăng hoa quả trước đền linh từ. Kính xin Đức Thánh Trần anh linh giáng trần khu trừ tà khí ám muội, trừ tai giải ách, hộ trì cho gia môn kiên cường vững chí, công danh hiển đạt, gia đạo thái hòa.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },

    // =========================================================================
    // 8. DÂNG SAO GIẢI HẠN (CỬU DIỆU NIÊN HẠN)
    // =========================================================================
    {
      id: 'vk_dang_sao_chung',
      title: 'Văn khấn Dâng sao giải hạn Bản Mệnh (Đầu năm)',
      category: 'dang_sao_giai_han',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Tháng Giêng âm lịch (từ mùng 8 đến rằm tháng Giêng)',
      meaning: 'Cầu xin Tinh Đẩu chư vị Tinh Quân che chở, hóa giải hung họa, nghênh đón cát lành cho các tuổi gặp sao xấu. Lưu ý: Giáo hội Phật giáo Việt Nam cho biết dâng sao giải hạn không phải nghi lễ Phật giáo; đây là tập tục dân gian.',
      offerings: 'Đèn nến thắp theo số lượng sao quy định, bài vị màu sắc tương ứng với ngũ hành sao, mũ áo thần linh, hoa quả tươi, nước sạch, trầu cau, gạo muối.',
      taboos: 'Hướng quay bàn lễ và số ngọn nến phải theo đúng quy cách của từng vị Tinh Quân.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy chín phương Trời, mười phương Chư Phật, Chư Phật mười phương.
Con kính lạy ngài Tả Nam Tào Lục Ty Duyên Thọ Tinh Quân, ngài Hữu Bắc Đẩu Cửu Hàm Giải Ách Tinh Quân.
Con kính lạy chư vị Tinh Quân cai quản bản mệnh niên hạn năm {{NAM_AM}}.

Tín chủ con là: {{GIA_CHU_NAME}}, sinh năm {{GIA_CHU_AGE}}.
Ngụ tại: {{GIA_CHU_ADDRESS}}.

Đầu xuân năm mới, xét thấy trần gian bản mệnh con năm nay gặp niên vận Tinh Quân chiếu mệnh. Con xin thành tâm thiết lập hương án hoa đăng kính dâng chư vị Thần linh.
Cúi xin Tinh Quân giáng lâm án tiền chấp kỳ lễ vật: Hóa giải sao xấu hung tinh, tăng thêm cát lành phước đức, giúp con một năm bình an mạnh khỏe, tai qua nạn khỏi, vạn sự hanh thông.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_sao_thai_bach',
      title: 'Văn khấn Cúng giải sao Thái Bạch (Tây Phương Kim Tinh)',
      category: 'dang_sao_giai_han',
      region: 'toan_quoc',
      ethnicity: 'kinh',
      occasion: 'Tối ngày 15 âm lịch hàng tháng (đặc biệt rằm tháng Giêng), thắp 8 ngọn nến hướng Tây',
      meaning: '"Thái Bạch quét sạch cửa nhà", cúng giải trừ hao tài tán của, kiện tụng thị phi cho người gặp sao Thái Bạch. Lưu ý: đây là tập tục dân gian, không phải nghi lễ Phật giáo.',
      offerings: '8 ngọn nến, bài vị giấy trắng ghi dòng chữ: "Tây Phương Canh Tân Kim Đức Thái Bạch Tinh Quân", hoa quả màu trắng, bánh kẹo trắng, nước trong, trầu cau.',
      taboos: 'Đây là tập tục dân gian; không có căn cứ để coi năm gặp sao này là năm xấu.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy ngài Tả Nam Tào Lục Ty Duyên Thọ Tinh Quân, ngài Hữu Bắc Đẩu Cửu Hàm Giải Ách Tinh Quân.
Con kính lạy Tây Phương Canh Tân Kim Đức Thái Bạch Tinh Quân vị tiền.

Tín chủ con là: {{GIA_CHU_NAME}}, sinh năm {{GIA_CHU_AGE}}.
Ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay ngày 15 âm lịch, con thiết lập đàn lễ hướng về chính Tây, thắp 8 ngọn đèn nến tinh tươm, dâng phẩm vật kính bái Tinh Quân.
Cúi xin Thái Bạch Tinh Quân phù hộ: Tiêu trừ vận hạn hao tài, giải tán thị phi oan trái, ban cho gia đạo bình yên, tiền tài tích tụ, sở cầu như ý.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },

    // =========================================================================
    // 9. ĐẶC THÙ VÙNG MIỀN (BẮC - TRUNG - NAM)
    // =========================================================================
    {
      id: 'vk_gio_to_hung_vuong',
      title: 'Văn khấn Giỗ Tổ Hùng Vương (10 tháng 3 âm lịch)',
      category: 'vung_mien_dac_thu',
      region: 'mien_bac',
      ethnicity: 'kinh',
      occasion: 'Ngày mùng 10 tháng 3 âm lịch tại Đền Hùng (Phú Thọ) hoặc tại gia đình',
      meaning: '"Dù ai đi ngược về xuôi - Nhớ ngày Giỗ Tổ mùng mười tháng ba", tri ân công đức dựng nước của 18 đời Vua Hùng.',
      offerings: 'Bánh chưng, bánh giầy (một hoặc vài cặp), ngũ quả, hương hoa, trầu cau, nước sạch.',
      taboos: 'Lễ chính tại Đền Hùng do Ban tổ chức cử hành; gia đình làm mâm lễ nhỏ tại nhà để tưởng nhớ.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy Thủy Tổ Kinh Dương Vương, Lạc Long Quân, Âu Cơ Quốc Mẫu.
Con kính lạy Mười Tám Đời Vua Hùng dựng cội xây nền nước Việt.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay ngày mùng 10 tháng 3 âm lịch, chính ngày Giỗ Tổ Hùng Vương thiêng liêng toàn dân tộc.
Con cháu đồng lòng dâng nén tâm hương, mâm bánh chưng bánh giầy sản vật đất trời kính bái trước linh đài Tiên Tổ.
Nguyện xin Vua Hùng hiển linh chứng giám: Phù hộ cho non sông gấm vóc vững bền, bách gia trăm họ đoàn kết hùng cường, gia đình chúng con bình an no ấm, rạng danh nòi giống Rồng Tiên.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_cung_dat_mien_trung',
      title: 'Văn khấn Cúng Đất (Tạ thổ kỳ yên - Đặc thù Miền Trung)',
      category: 'vung_mien_dac_thu',
      region: 'mien_trung',
      ethnicity: 'kinh',
      occasion: 'Một ngày tốt trong tháng 2 hoặc tháng 8 âm lịch (xứ Quảng thường làm trong tiết xuân) tại Huế, Quảng Nam, Đà Nẵng, Bình Định',
      meaning: 'Phong tục cúng tạ Thổ thần, tiền hiền khai khẩn và các âm linh từng cư ngụ trên mảnh đất, cầu cho đất đai yên ổn.',
      offerings: 'Gà luộc, xôi, chè, cháo thánh, gạo muối, trầu cau, trà rượu, áo mũ giấy cúng Thổ thần.',
      taboos: 'Bàn cúng đặt ngoài sân hoặc trước hiên nhà, thường chia 2 bàn: bàn trên cúng Thổ thần, Thành hoàng bổn xứ; bàn dưới cúng cô hồn, âm linh.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Thần Hoàng Bổn Cảnh, chư vị Hậu Thổ Thần linh.
Con kính lạy chư vị Khai khẩn Tiền Hiền, Khai cơ Hậu Hiền khai sáng bản thôn xứ sở.
Con kính mời chư vị Hương linh tiền nhân, cô hồn không nơi nương tựa quanh khu đất này.

Tín chủ con là: {{GIA_CHU_NAME}}, cư ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay ngày lành tháng tốt, tín chủ con sửa soạn mâm cúng Đất Đai Tạ Thần, dâng nén hương thơm cùng chén rượu trắng hoa thơm quả ngọt.
Cúi xin Tiền hiền Hậu hiền, chư vị Tôn thần và Âm linh chứng giám tấc lòng thành. Phù hộ cho đất đai yên ổn, gia môn ấm êm, làm ăn phát đạt, thuận hòa tấn tới.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_cung_am_hon_hue',
      title: 'Văn khấn Cúng Âm Hồn ngày 23 tháng 5 (Đặc thù Xứ Huế)',
      category: 'vung_mien_dac_thu',
      region: 'mien_trung',
      ethnicity: 'kinh',
      occasion: 'Chiều ngày 23 tháng 5 âm lịch hàng năm tại khắp mọi nhà xứ Huế',
      meaning: 'Nghi thức thiêng liêng tưởng niệm các quan binh nghĩa sĩ và đồng bào tử nạn trong biến cố Kinh thành Huế thất thủ (năm Ất Dậu 1885).',
      offerings: 'Bàn cúng ngoài trời trước nhà: cháo thánh, bắp luộc, cơm vắt, chè, trái cây, hoa tươi, hương đèn, giấy tiền vàng mã, muối gạo.',
      taboos: 'Mâm cúng bày ngoài trời, trước nhà.',
      content: `Nam mô Tiêu Diện Đại Sĩ Bồ Tát chứng minh!

Hôm nay là chiều ngày 23 tháng 5 âm lịch năm {{NAM_AM}}.
Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Nhớ thuở Kinh thành thất thủ năm xưa, súng gầm đạn xé, muôn vàn binh sĩ và bách tính vô tội ngã xuống vì quê hương xứ sở.
Nhân ngày tưởng niệm Kinh đô thất thủ, toàn gia chúng con thành tâm sắm sửa hương đèn, hoa quả, bát cháo bát cơm, áo binh tiền giấy, thiết lập bàn hương án ngoài trời kính cáo.

Kính thỉnh: Các bậc tiền nhân nghĩa sĩ, binh lính tử trận, chư vị âm linh thác oan không mồ chôn cất, xin đồng lai tề tựu trước án hâm hưởng lễ vật. Nguyện cầu chư hương linh nương nhờ Phật lực sớm siêu sinh cõi tịnh độ.
Cúi xin phù hộ cho xứ sở thái bình, nhân dân an cư lạc nghiệp, nhà nhà no ấm.

Nam mô A Di Đà Phật! (3 lần)`
    },
    {
      id: 'vk_cau_ngu_ca_ong',
      title: 'Văn khấn Lễ Cầu Ngư / Cúng Cá Ông (lễ của làng chài ven biển miền Trung và Nam Bộ)',
      category: 'vung_mien_dac_thu',
      region: 'mien_trung',
      ethnicity: 'kinh',
      occasion: 'Dịp Lễ Cầu Ngư đầu năm hoặc khi cá Ông lụy (dạt vào bờ)',
      meaning: 'Thờ cúng Nam Hải Đại Tướng Quân (Cá Voi / Cá Ông) - thần hộ mệnh cứu giúp ngư dân vượt qua sóng gió bão táp trên biển cả.',
      offerings: 'Hương hoa, trầu cau, rượu, xôi, đèn nến; lễ vật cụ thể theo lệ của từng vạn chài.',
      taboos: 'Không dùng từ "chết" mà gọi là "Ông lụy". Đây là lễ làng do các bô lão, chủ tế của vạn chài cử hành tại lăng Ông; bài dưới đây chỉ là lời khấn nguyện tham khảo.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy ngài Nam Hải Đại Tướng Quân (Nam Hải Cự Tộc Ngọc Lân Tôn Thần).
Con kính lạy chư vị Thủy thần cai quản vùng biển.
Con kính lạy Tiền hiền khai khẩn làng chài, các bậc tiền bối nghề biển.

Con là ngư dân: {{GIA_CHU_NAME}}, ngụ tại vạn chài: {{GIA_CHU_ADDRESS}}.

Nay gặp tiết Cầu Ngư mở biển, toàn thể bà con vạn chài kính dâng hương hoa, xôi rượu trước lăng Nam Hải.
Cúi xin Đức Ông Nam Hải linh thiêng chứng giám: Che chở cho đoàn tàu ghe ra khơi thuận buồm xuôi gió, biển lặng sóng êm, đánh bắt trúng luồng tôm cá đầy khoang, ngư dân an toàn trở về cập bến bình an.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_ba_chua_xu_chau_doc',
      title: 'Văn khấn Miếu Bà Chúa Xứ Núi Sam (Đặc thù Miền Nam)',
      category: 'vung_mien_dac_thu',
      region: 'mien_nam',
      ethnicity: 'kinh',
      occasion: 'Dịp Lễ hội Vía Bà (23-27 tháng 4 âm lịch) hoặc khi hành hương Châu Đốc An Giang',
      meaning: 'Cầu tài lộc, công việc buôn bán thuận lợi, bình an tại linh từ Bà Chúa Xứ Núi Sam nổi tiếng linh thiêng cõi Nam Bộ.',
      offerings: 'Heo quay, mâm ngũ quả, hoa tươi, trầu cau, muối gạo, hương đèn.',
      taboos: 'Vái lạy thành kính; lễ vật tùy tâm, không cần vay mượn để sắm lễ lớn.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Đức Chúa Xứ Thánh Mẫu hiển hách linh từ tại Núi Sam Châu Đốc.
Con kính lạy chư vị Tôn thần phối thờ tại linh từ.

Tín chủ con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay con thành tâm lặn lội đường xa, về chốn linh từ dâng nén tâm hương thơm ngát, mâm lễ quả tươi cùng lễ vật tinh khiết kính dâng lên Thánh Mẫu.

Cúi xin Đức Chúa Xứ Thánh Mẫu rủ lòng từ bi thương xót, che chở cho con cùng gia quyến: Tống khứ tai ương, nghênh tiếp phúc lộc, buôn may bán đắt, công việc vẹn toàn, tiền tài hanh thông, vạn sự cát tường như ý.
Con xin nguyện giữ tâm lương thiện, làm lành lánh dữ, đền đáp hồng ân của Bà.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_via_than_tai_mien_nam',
      title: 'Văn khấn Cúng Vía Thần Tài mùng 10 (Đặc thù Nam Bộ)',
      category: 'vung_mien_dac_thu',
      region: 'mien_nam',
      ethnicity: 'kinh',
      occasion: 'Ngày mùng 10 tháng Giêng âm lịch',
      meaning: 'Cúng Thần Tài, Thổ Địa đầu năm cầu buôn bán thuận lợi. Theo một số nhà nghiên cứu, mùng 10 tháng Giêng vốn là ngày vía Đất (Thổ thần); tục cúng Thần Tài gắn vào ngày này về sau.',
      offerings: 'Cá lóc nướng trui nguyên con không cạo vảy (đặc sản Nam Bộ), bộ Tam sên (1 miếng thịt heo luộc, 1 quả trứng luộc, tôm/cua luộc), đòn bánh tét, đĩa vàng mã tiền Thần Tài, hoa tươi.',
      taboos: 'Bàn thờ Thần Tài - Thổ Địa đặt dưới đất, hướng ra cửa. Lau dọn bàn thờ sạch sẽ trước khi làm lễ.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Hoàng thiên Hậu Thổ chư vị Tôn thần.
Con kính lạy ngài Đông trù Tư mệnh Táo phủ Thần quân.
Con kính lạy ngài Thần Tài vị tiền.
Con kính lạy ngài Bản gia Thổ Địa Phúc Đức Chính Thần.

Tín chủ con là: {{GIA_CHU_NAME}}, kinh doanh tại: {{GIA_CHU_ADDRESS}}.

Hôm nay ngày mùng 10 tháng Giêng năm {{NAM_AM}}, nhân tiết Vía Thần Tài chiêu tài tấn bảo. Tín chủ con thành tâm sắm sửa lễ vật, cá nướng bánh tét tam sên, hương hoa trà quả thắp trước bàn thờ Thần Tài.

Cúi xin ngài Thần Tài, Thổ Địa chứng giám lòng thành, phù hộ cho việc buôn bán thuận lợi, làm ăn ngay thẳng, gia đạo bình an.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },
    {
      id: 'vk_cung_ghe_thuyen',
      title: 'Văn khấn Cúng Ghe Thuyền Hạ Thủy / Xuất Hành (Sông Nước Tây Nam Bộ)',
      category: 'vung_mien_dac_thu',
      region: 'mien_nam',
      ethnicity: 'kinh',
      occasion: 'Khi đóng mới ghe xuồng hạ thủy, hoặc trước chuyến buôn bán đường sông dài ngày',
      meaning: 'Cúng Bà Thủy, Bà Cậu và các vị Thủy thần cầu cho ghe thuyền đi lại an toàn, buôn bán thuận lợi.',
      offerings: 'Đĩa thịt luộc, con vịt luộc chéo cánh, xôi, hoa vạn thọ cắm mũi ghe, trầu cau, chai rượu đế, vẽ mắt ghe trang trọng.',
      taboos: 'Tập tục khác nhau theo từng vùng sông nước. Bài này chỉ là lời khấn nguyện tham khảo, chưa đối chiếu được với văn bản cổ.',
      content: `Nam mô A Di Đà Phật! (3 lần, 3 lạy)

Con kính lạy Bà Thủy, Bà Cậu cai quản sông nước rạch ngòi.
Con kính lạy chư vị Thủy thần hiển linh hộ độ.

Chủ ghe con là: {{GIA_CHU_NAME}}, ngụ tại: {{GIA_CHU_ADDRESS}}.

Hôm nay ngày lành nước nổi, ghe thuyền chuẩn bị hạ thủy rẽ sóng. Con sắm mâm lễ vịt xôi rượu trà dâng trước mũi ghe.
Xin Bà Thủy, Bà Cậu và chư vị Thủy thần độ cho: Nước nổi đưa ghe, xuôi dòng mát mái, tránh cồn tránh bãi, buôn bán thuận lợi, cập bến an toàn trọn vẹn.

Nam mô A Di Đà Phật! (3 lần, 3 lạy)`
    },

    // =========================================================================
    // 10. BẢN SẮC DÂN TỘC TRUYỀN THỐNG
    // =========================================================================
    {
      id: 'vk_le_mat_nha_muong',
      kind: 'gioi_thieu', // lễ do chức sắc của cộng đồng cử hành: chỉ giới thiệu, không có lời khấn
      title: 'Giới thiệu Lễ Mát Nhà của người Mường',
      category: 'dan_toc_thieu_so',
      region: 'mien_bac',
      ethnicity: 'muong',
      occasion: 'Đầu năm, sau vụ gặt, hoặc khi gia đình gặp chuyện chẳng lành',
      meaning: 'Lễ cầu cho nhà cửa yên lành, mát mẻ, mọi người trong nhà khỏe mạnh.',
      offerings: 'Gà, vịt, cá suối cùng lễ vật theo lệ từng mường.',
      taboos: 'Lễ do thầy mo cử hành bằng tiếng Mường.',
      content: `Lễ Mát Nhà là nghi lễ của người Mường, do thầy mo cử hành bằng tiếng Mường. Thầy mo mời các vị thần của bản mường về chứng giám, cầu cho gia đình yên lành.

Đây không phải nghi lễ gia chủ tự đọc văn khấn tiếng Việt, nên ứng dụng chỉ giới thiệu, không soạn lời khấn thay. Gia đình muốn làm lễ nên nhờ người có chuyên môn nghi lễ của cộng đồng mình.

Nguồn tham khảo: báo Đại Đoàn Kết, báo Nhân Dân.`
    },
    {
      id: 'vk_com_moi_muong',
      kind: 'gioi_thieu', // lễ do chức sắc của cộng đồng cử hành: chỉ giới thiệu, không có lời khấn
      title: 'Giới thiệu Lễ Cơm Mới của người Mường',
      category: 'dan_toc_thieu_so',
      region: 'mien_bac',
      ethnicity: 'muong',
      occasion: 'Khoảng tháng 10 âm lịch, sau vụ gặt',
      meaning: 'Dâng cơm gạo mới tạ ơn tổ tiên và mừng mùa màng.',
      offerings: 'Cơm gạo mới và lễ vật theo lệ từng mường.',
      taboos: 'Lễ do thầy mo cúng.',
      content: `Lễ Cơm Mới của người Mường làm sau vụ gặt, khoảng tháng 10 âm lịch: gia đình mời thầy mo cúng, dâng cơm gạo mới lên tổ tiên trước khi cả nhà dùng bữa.

Phần giới thiệu này mới đối chiếu được ít nguồn, nên chỉ nêu những điểm chung nhất.

Đây không phải nghi lễ gia chủ tự đọc văn khấn tiếng Việt, nên ứng dụng chỉ giới thiệu, không soạn lời khấn thay. Gia đình muốn làm lễ nên nhờ người có chuyên môn nghi lễ của cộng đồng mình.`
    },
    {
      id: 'vk_long_tong_tay_nung',
      kind: 'gioi_thieu', // lễ do chức sắc của cộng đồng cử hành: chỉ giới thiệu, không có lời khấn
      title: 'Giới thiệu Lễ hội Lồng Tồng (Xuống đồng) của người Tày, Nùng',
      category: 'dan_toc_thieu_so',
      region: 'mien_bac',
      ethnicity: 'tay_nung',
      occasion: 'Sau Tết Nguyên đán, khoảng từ mùng 4 đến 25 tháng Giêng tùy từng nơi',
      meaning: 'Hội xuống đồng đầu xuân, cầu mưa thuận gió hòa, mùa màng tươi tốt.',
      offerings: 'Gà, thịt lợn, xôi ngũ sắc, bánh khảo, bánh chưng theo mâm của từng gia đình trong bản.',
      taboos: 'Phần lễ do thầy Tào hoặc thầy Mo chủ trì.',
      content: `Lồng Tồng là hội xuống đồng đầu xuân của người Tày, Nùng. Phần lễ do thầy Tào hoặc thầy Mo chủ trì, cúng Thần Nông, thần đất, thần trời để cầu mùa; sau đó là phần hội của cả bản.

Đây không phải nghi lễ gia chủ tự đọc văn khấn tiếng Việt, nên ứng dụng chỉ giới thiệu, không soạn lời khấn thay. Gia đình muốn làm lễ nên nhờ người có chuyên môn nghi lễ của cộng đồng mình.

Nguồn tham khảo: báo Lào Cai.`
    },
    {
      id: 'vk_xen_ban_xen_muong_thai',
      kind: 'gioi_thieu', // lễ do chức sắc của cộng đồng cử hành: chỉ giới thiệu, không có lời khấn
      title: 'Giới thiệu Lễ Xên Bản Xên Mường của người Thái',
      category: 'dan_toc_thieu_so',
      region: 'mien_bac',
      ethnicity: 'thai',
      occasion: 'Mùa xuân, khi hoa ban nở (có nơi vào cuối tháng Giêng)',
      meaning: 'Lễ cúng bản, cúng mường cầu cho bản mường yên ổn, mùa màng tốt tươi.',
      offerings: 'Lễ vật do dân bản cùng góp theo lệ từng bản.',
      taboos: 'Lễ do thầy mo cử hành; kiêng kỵ cụ thể theo lệ từng bản.',
      content: `Xên Bản Xên Mường là lễ cúng bản, cúng mường của người Thái vùng Tây Bắc, do thầy mo cử hành. Lễ cúng trời, thần đất, thần bản, thần mường và tổ tiên; lễ vật do dân bản cùng đóng góp, sau lễ là phần hội chung của cả bản.

Đây không phải nghi lễ gia chủ tự đọc văn khấn tiếng Việt, nên ứng dụng chỉ giới thiệu, không soạn lời khấn thay. Gia đình muốn làm lễ nên nhờ người có chuyên môn nghi lễ của cộng đồng mình.

Nguồn tham khảo: VietnamPlus, báo Văn Hóa, chuyên trang Dân tộc và Phát triển.`
    },
    {
      id: 'vk_cap_sac_dao',
      kind: 'gioi_thieu', // lễ do chức sắc của cộng đồng cử hành: chỉ giới thiệu, không có lời khấn
      title: 'Giới thiệu Lễ Cấp Sắc của người Dao',
      category: 'dan_toc_thieu_so',
      region: 'mien_bac',
      ethnicity: 'dao',
      occasion: 'Khi người đàn ông Dao đến tuổi trưởng thành, vào ngày do thầy cúng chọn',
      meaning: 'Nghi lễ công nhận người đàn ông Dao đã trưởng thành trước cộng đồng và tổ tiên.',
      offerings: 'Lợn, gà và lễ vật theo lệ của từng ngành Dao.',
      taboos: 'Người thụ lễ kiêng cữ theo lệ trước và sau lễ. Lễ do các thầy cúng cử hành theo sách cúng của người Dao.',
      content: `Cấp Sắc là nghi lễ quan trọng, theo tục dành cho người đàn ông Dao trưởng thành, đã được ghi danh di sản văn hóa phi vật thể quốc gia. Lễ do thầy cúng lớn cùng các thầy phụ chủ trì theo sách cúng của người Dao, thờ Tam Thanh và Bàn Vương.

Đây không phải nghi lễ gia chủ tự đọc văn khấn tiếng Việt, nên ứng dụng chỉ giới thiệu, không soạn lời khấn thay. Gia đình muốn làm lễ nên nhờ người có chuyên môn nghi lễ của cộng đồng mình.

Nguồn tham khảo: báo Văn Hóa.`
    },
    {
      id: 'vk_sen_dolta_khmer',
      kind: 'gioi_thieu', // lễ do chức sắc của cộng đồng cử hành: chỉ giới thiệu, không có lời khấn
      title: 'Giới thiệu Lễ Sen Dolta của đồng bào Khmer Nam Bộ',
      category: 'dan_toc_thieu_so',
      region: 'mien_nam',
      ethnicity: 'khmer',
      occasion: 'Từ ngày 29 tháng 8 đến mùng 1 tháng 9 âm lịch',
      meaning: 'Lễ báo hiếu, tưởng nhớ ông bà tổ tiên của đồng bào Khmer.',
      offerings: 'Cơm, bánh trái dâng lên chùa và bày cúng ông bà tại nhà theo lệ từng phum sóc.',
      taboos: 'Nghi thức chính tại chùa do sư sãi tụng kinh cầu siêu.',
      content: `Sen Dolta là lễ báo hiếu ông bà tổ tiên của đồng bào Khmer Nam Bộ, diễn ra từ 29 tháng 8 đến mùng 1 tháng 9 âm lịch, tổ chức cả ở nhà và ở chùa. Nghi thức chính ở chùa: dâng cơm, cúng Phật và sư sãi tụng kinh cầu siêu.

Đây không phải nghi lễ gia chủ tự đọc văn khấn tiếng Việt, nên ứng dụng chỉ giới thiệu, không soạn lời khấn thay. Gia đình muốn làm lễ nên nhờ người có chuyên môn nghi lễ của cộng đồng mình.

Nguồn tham khảo: báo Pháp Luật TP.HCM, báo Tuổi Trẻ.`
    },
    {
      id: 'vk_chol_chnam_thmay_khmer',
      kind: 'gioi_thieu', // lễ do chức sắc của cộng đồng cử hành: chỉ giới thiệu, không có lời khấn
      title: 'Giới thiệu Tết Chôl Chnăm Thmây của đồng bào Khmer Nam Bộ',
      category: 'dan_toc_thieu_so',
      region: 'mien_nam',
      ethnicity: 'khmer',
      occasion: 'Giữa tháng 4 dương lịch (thường 14-16/4), kéo dài ba ngày',
      meaning: 'Tết cổ truyền mừng năm mới của đồng bào Khmer.',
      offerings: 'Lễ vật dâng lên chùa theo lệ từng phum sóc.',
      taboos: 'Các nghi thức chính diễn ra tại chùa với sư sãi.',
      content: `Chôl Chnăm Thmây là Tết cổ truyền của đồng bào Khmer, kéo dài ba ngày vào giữa tháng 4 dương lịch. Các nghi thức chính gồm rước Maha Sangkran, dâng cơm chư tăng, đắp núi cát, tắm tượng Phật và tắm cho sư sãi.

Đây không phải nghi lễ gia chủ tự đọc văn khấn tiếng Việt, nên ứng dụng chỉ giới thiệu, không soạn lời khấn thay. Gia đình muốn làm lễ nên nhờ người có chuyên môn nghi lễ của cộng đồng mình.

Nguồn tham khảo: VietNamNet.`
    },
    {
      id: 'vk_le_hoi_kate_cham',
      kind: 'gioi_thieu', // lễ do chức sắc của cộng đồng cử hành: chỉ giới thiệu, không có lời khấn
      title: 'Giới thiệu Lễ hội Katê của người Chăm',
      category: 'dan_toc_thieu_so',
      region: 'mien_trung',
      ethnicity: 'cham',
      occasion: 'Ngày mùng 1 tháng 7 theo lịch Chăm (khoảng tháng 9-10 dương lịch)',
      meaning: 'Lễ hội lớn nhất của người Chăm theo đạo Bàlamôn, tưởng nhớ các vị thần và tổ tiên.',
      offerings: 'Lễ vật do cộng đồng và các chức sắc chuẩn bị theo nghi thức tại đền tháp.',
      taboos: 'Lễ do các chức sắc Bàlamôn cử hành tại đền tháp.',
      content: `Katê là lễ hội của người Chăm theo đạo Bàlamôn, đã được ghi danh di sản văn hóa phi vật thể quốc gia. Lễ do các chức sắc Bàlamôn cử hành tại đền tháp: rước y trang, mở cửa tháp, tắm và mặc y phục cho tượng thần; cộng đồng tưởng nhớ nữ thần Po Inư Nưgar, vua Po Klong Garai và vua Po Rome.

Đây không phải nghi lễ gia chủ tự đọc văn khấn tiếng Việt, nên ứng dụng chỉ giới thiệu, không soạn lời khấn thay. Gia đình muốn làm lễ nên nhờ người có chuyên môn nghi lễ của cộng đồng mình.

Nguồn tham khảo: báo Văn Hóa.`
    }
  ];

  /**
   * Bản đồ ngày tháng âm lịch cố định của các dịp lễ trọng trong năm.
   */
  const FESTIVAL_DATES = Object.freeze({
    vk_ong_tao: { m: 12, d: 23, label: 'Lễ Ông Táo 23 tháng Chạp' },
    vk_tat_nien: { m: 12, d: 30, label: 'Lễ Tất Niên chiều 30 Tết' },
    vk_giao_thua_ngoai_troi: { m: 12, d: 30, label: 'Đêm Giao Thừa ngoài trời' },
    vk_giao_thua_trong_nha: { m: 12, d: 30, label: 'Giao Thừa lễ gia tiên' },
    vk_mung_1_tet: { m: 1, d: 1, label: 'Sáng mùng 1 Tết Nguyên Đán' },
    vk_hoa_vang: { m: 1, d: 3, label: 'Lễ Hóa Vàng tạ Tết' },
    vk_ram_thang_gieng: { m: 1, d: 15, label: 'Tết Thượng Nguyên (Rằm tháng Giêng)' },
    vk_tet_han_thuc: { m: 3, d: 3, label: 'Tết Hàn Thực (Mùng 3 tháng 3)' },
    vk_thanh_minh: { m: 3, d: 5, label: 'Tiết Thanh Minh & Tảo Mộ' },
    vk_gio_to_hung_vuong: { m: 3, d: 10, label: 'Giỗ Tổ Hùng Vương 10 tháng 3' },
    vk_doan_ngo: { m: 5, d: 5, label: 'Tết Đoan Ngọ (Mùng 5 tháng 5)' },
    vk_cung_am_hon_hue: { m: 5, d: 23, label: 'Lễ Cúng Âm Hồn Huế (23 tháng 5)' },
    vk_vu_lan: { m: 7, d: 15, label: 'Lễ Vu Lan Báo Hiếu (Rằm tháng 7)' },
    vk_cung_chung_sinh_thang_7: { m: 7, d: 15, label: 'Cúng Chúng Sinh tháng 7' },
    vk_thap_cham_kate: { m: 7, d: 1, label: 'Lễ Hội Katê Chăm (Đầu tháng 7)' },
    vk_trung_thu: { m: 8, d: 15, label: 'Tết Trung Thu (Rằm tháng 8)' },
    vk_sen_dolta_khmer: { m: 8, d: 29, label: 'Lễ Sen Dolta Khmer Báo Hiếu' },
    vk_ha_nguyen: { m: 10, d: 15, label: 'Tết Hạ Nguyên / Cơm Mới (Rằm tháng 10)' },
    vk_via_than_tai_mien_nam: { m: 1, d: 10, label: 'Vía Thần Tài mùng 10 tháng Giêng' },
    vk_chol_chnam_thmay: { m: 3, d: 15, label: 'Tết Chôl Chnăm Thmây Khmer' }
  });

  /**
   * Tính toán điểm ưu tiên gợi ý bài khấn:
   * 1. Khớp thuộc tính Vùng miền người dùng khai báo (+65 điểm).
   * 2. Khớp thuộc tính Dân tộc người dùng khai báo (+85 điểm).
   * 3. Sắp đến dịp lễ âm lịch / Tuần Sóc Vọng (+50 đến +110 điểm).
   * 4. Sắp đến ngày Giỗ trong Sổ Giỗ người dùng (+130 điểm).
   */
  function calculatePrayerPriority(p, opts = {}) {
    let score = 0;
    let badgeText = '';

    // 1. Ưu tiên theo Vùng Miền
    if (opts.userRegion && opts.userRegion !== 'toan_quoc') {
      if (p.region === opts.userRegion) {
        score += 65;
        badgeText = '🗺️ Đề xuất theo Vùng miền';
      }
    }

    // 2. Ưu tiên theo Dân Tộc
    if (opts.userEthnicity && opts.userEthnicity !== 'kinh') {
      if (p.ethnicity === opts.userEthnicity) {
        score += 85;
        badgeText = '🌾 Bản sắc Dân tộc';
      }
    }

    // 3. Ưu tiên khi đến dịp (gần ngày thì ưu tiên lên trên)
    const curD = Number(opts.currentLunarDay);
    const curM = Number(opts.currentLunarMonth);

    if (curD && curM) {
      // a. Tuần tiết Sóc Vọng (Mùng 1 và Rằm)
      if (p.category === 'tuan_tiet') {
        const isNearSoc = curD === 1 || curD === 29 || curD === 30 || curD === 2;
        const isNearVong = curD === 14 || curD === 15 || curD === 16;
        if (isNearSoc || isNearVong) {
          score += 95;
          badgeText = isNearSoc ? '🌕 Tuần Sóc (Mùng 1)' : '🌕 Tuần Vọng (Rằm)';
        }
      }

      // b. Ngày lễ mùa vụ trong năm
      const fest = FESTIVAL_DATES[p.id];
      if (fest) {
        const targetDays = fest.m * 30 + fest.d;
        const currentDays = curM * 30 + curD;
        let diff = targetDays - currentDays;
        if (diff < 0) diff += 360;

        if (diff >= 0 && diff <= 15) {
          const proximityScore = Math.max(10, 110 - diff * 6);
          score += proximityScore;
          badgeText = diff === 0 ? `🔥 Hôm nay: ${fest.label}` : (diff === 1 ? `🔥 Ngày mai: ${fest.label}` : `🔥 Sắp đến dịp (còn ${diff} ngày)`);
        }
      }

      // c. Giỗ Gia Tiên từ Sổ Giỗ người dùng
      if (Array.isArray(opts.upcomingAnniversaries) && opts.upcomingAnniversaries.length > 0) {
        let nearestAnnivDiff = 999;
        let matchedAnniv = null;
        for (const a of opts.upcomingAnniversaries) {
          let diffA = (a.lunarMonth * 30 + a.lunarDay) - (curM * 30 + curD);
          if (diffA < 0) diffA += 360;
          if (diffA < nearestAnnivDiff) {
            nearestAnnivDiff = diffA;
            matchedAnniv = a;
          }
        }
        if (nearestAnnivDiff >= 0 && nearestAnnivDiff <= 3) {
          if (p.id === 'vk_gio_thuong' || p.id === 'vk_tien_thuong') {
            score += 130;
            badgeText = nearestAnnivDiff === 0 
              ? `🕯️ Hôm nay: Giỗ ${matchedAnniv.relationship ? matchedAnniv.relationship + ' ' : ''}${matchedAnniv.deceasedName}`
              : `🕯️ Sắp đến Giỗ ${matchedAnniv.relationship ? matchedAnniv.relationship + ' ' : ''}${matchedAnniv.deceasedName} (${nearestAnnivDiff} ngày)`;
          }
        }
      }
    }

    return { score, badgeText };
  }

  /**
   * Bộ lọc văn khấn đa tiêu chí: Từ khóa, Danh mục, Vùng miền, Dân tộc.
   * Hỗ trợ tự động sắp xếp ưu tiên theo vùng miền, dân tộc và tính cấp thiết thời gian (gần ngày lên trên).
   */
  function filterPrayers({
    keyword = '',
    category = '',
    region = '',
    ethnicity = '',
    exactRegion = false,
    userRegion = '',
    userEthnicity = '',
    currentLunarDay = null,
    currentLunarMonth = null,
    upcomingAnniversaries = []
  } = {}) {
    const kw = keyword.trim().toLowerCase();

    const filtered = PRAYERS.filter((p) => {
      if (category && p.category !== category) return false;

      if (region) {
        if (exactRegion) {
          if (p.region !== region) return false;
        } else {
          if (region !== 'toan_quoc' && p.region !== region && p.region !== 'toan_quoc') return false;
        }
      }

      if (ethnicity) {
        if (p.ethnicity !== ethnicity) return false;
      }

      if (kw) {
        const fullSearch = `${p.title} ${p.occasion} ${p.meaning} ${p.offerings} ${p.content}`.toLowerCase();
        return fullSearch.includes(kw);
      }
      return true;
    });

    // Tính điểm ưu tiên và sắp xếp
    const scoredList = filtered.map(p => {
      const { score, badgeText } = calculatePrayerPriority(p, {
        userRegion,
        userEthnicity,
        currentLunarDay,
        currentLunarMonth,
        upcomingAnniversaries
      });
      return { prayer: p, score, badgeText };
    });

    // Sắp xếp giảm dần theo điểm ưu tiên
    scoredList.sort((a, b) => b.score - a.score);

    return scoredList.map(item => {
      const clone = { ...item.prayer };
      if (item.badgeText && item.score > 0) {
        clone.priorityBadge = item.badgeText;
      }
      return clone;
    });
  }

  /**
   * Lấy chi tiết bài văn khấn theo ID.
   */
  function getPrayerById(id) {
    return PRAYERS.find((p) => p.id === id) || null;
  }

  function currentLunarYearName(now = new Date()) {
    try {
      const ly = NT.calendar.solarToLunar(now.getDate(), now.getMonth() + 1, now.getFullYear()).year;
      return NT.data.ganZhiVi(NT.calendar.lunarYearGan(ly), NT.calendar.lunarYearZhi(ly));
    } catch {
      return String(now.getFullYear());
    }
  }

  /**
   * Điền tự động thông tin hồ sơ gia chủ và danh sách hương linh gia tiên hợp tự (Template Auto-Fill).
   * Hỗ trợ 6 biến chuẩn xác:
   *  1. [Họ tên gia chủ] ({{GIA_CHU_NAME}})
   *  2. [Năm sinh gia chủ] ({{GIA_CHU_AGE}})
   *  3. [Địa chỉ ngụ tại] ({{GIA_CHU_ADDRESS}})
   *  4. [Quan hệ: Cụ/Ông/Bà...] ({{QUAN_HE}})
   *  5. [Tên người quá cố] ({{NGUOI_QUA_CO}})
   *  6. [Mộ phần táng tại] ({{MO_PHAN}} / {{MO_PHAN_BLOCK}})
   */
  function renderPrayer(prayerId, profile = {}, context = {}) {
    const prayer = getPrayerById(prayerId);
    if (!prayer) return null;

    // Tùy chọn bật/tắt cá nhân hóa (mặc định là BẬT theo yêu cầu người dùng)
    const enablePersonalization = context.enablePersonalization !== false;

    let hostName = '[Họ và tên gia chủ]';
    let hostAge = '[Năm sinh gia chủ]';
    let address = '[Địa chỉ ngụ tại]';
    let relationship = '[Quan hệ: Cụ/Ông/Bà...]';
    let deceased = context.deceasedName || '[Tên người quá cố]';
    let burialPlace = context.burialPlace || '[Mộ phần táng tại]';
    let burialBlock = ', mộ phần táng tại [Mộ phần táng tại]';
    let lunarDay = context.lunarDay || '[Ngày âm]';
    let lunarMonth = context.lunarMonth || '[Tháng âm]';
    // Tên năm ÂM LỊCH theo can chi (ví dụ "Bính Ngọ"). Không dùng số năm dương: tháng Chạp rơi vào tháng 1-2
    // dương lịch nên số năm dương sẽ lệch một năm đúng dịp Tết.
    let lunarYearName = context.lunarYearName || currentLunarYearName();

    if (enablePersonalization) {
      if (profile.fullName) hostName = profile.fullName.trim();
      if (profile.birthYear) hostAge = `${profile.birthYear} (tuổi ${new Date().getFullYear() - profile.birthYear + 1})`;
      if (profile.address) address = profile.address.trim();

      if (context.relationship && context.relationship.trim()) {
        relationship = context.relationship.trim();
      } else if (context.deceasedName) {
        relationship = '';
      }

      if (context.deceasedName && context.deceasedName.trim()) {
        deceased = context.deceasedName.trim();
      }

      if (context.burialPlace && context.burialPlace.trim()) {
        burialPlace = context.burialPlace.trim();
        burialBlock = `, mộ phần táng tại ${burialPlace}`;
      } else {
        burialBlock = '';
      }
    }

    let rendered = prayer.content
      .replace(/{{GIA_CHU_NAME}}/g, () => hostName)
      .replace(/{{GIA_CHU_AGE}}/g, () => hostAge)
      .replace(/{{GIA_CHU_ADDRESS}}/g, () => address)
      .replace(/{{QUAN_HE}}\s*/g, () => (relationship ? `${relationship} ` : ''))
      .replace(/{{NGUOI_QUA_CO}}/g, () => deceased)
      .replace(/{{MO_PHAN}}/g, () => burialPlace)
      .replace(/{{MO_PHAN_BLOCK}}/g, () => burialBlock)
      .replace(/{{NGAY_AM}}/g, () => `${lunarDay} tháng ${lunarMonth}`)
      .replace(/{{NAM_AM}}/g, () => lunarYearName);

    // Tính năng Độc Bản: Tự động thỉnh mời chư vị hương linh thân tộc gia phả hợp tự
    if (enablePersonalization && context.invitedAncestors && context.invitedAncestors.length > 0) {
      const invitedListText = context.invitedAncestors
        .map(a => `${a.relationship ? a.relationship + ' ' : ''}${a.deceasedName}`)
        .join(', ');
      const hopTuBlock = `\n\nĐồng kính cẩn thỉnh mời: Chư vị Cố hương linh tiền bối gia tộc, cùng ${invitedListText} đồng lai tề tựu trước linh sàng, thụ hưởng lễ vật, phù trì cho gia quyến khang ninh thịnh vượng.`;

      if (rendered.includes('Nam mô A Di Đà Phật! (3 lần')) {
        rendered = rendered.replace('Nam mô A Di Đà Phật! (3 lần', () => `${hopTuBlock}\n\nNam mô A Di Đà Phật! (3 lần`);
      } else {
        rendered += hopTuBlock;
      }
    }

    return {
      id: prayer.id,
      title: prayer.title,
      category: prayer.category,
      region: prayer.region,
      ethnicity: prayer.ethnicity,
      occasion: prayer.occasion,
      meaning: prayer.meaning,
      offerings: prayer.offerings,
      taboos: prayer.taboos || '',
      renderedText: rendered
    };
  }

  NT.prayers = Object.freeze({
    CATEGORIES,
    REGIONS,
    ETHNICITIES,
    PRAYERS,
    filterPrayers,
    getPrayerById,
    renderPrayer
  });
})(globalThis.NT ??= {});
