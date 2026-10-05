# Ngày Tốt — Hiện trạng thực hiện

Tệp này ghi mã nguồn hiện đáp ứng `PRD-LICH-VIET-CORE-2026.md` tới đâu. Yêu cầu nằm ở PRD; tệp này không đặt ra yêu cầu mới.

**Quy tắc cập nhật**

- Cập nhật sau mỗi đợt sửa mã. Người hoặc công cụ sửa mã chỉ được sửa cột "Tình trạng"; cột "Kiểm lại độc lập" do một lượt kiểm khác điền (script không thuộc bộ kiểm thử, mở thử trên trình duyệt, hoặc người thứ hai).
- Mỗi kết luận ghi cách đã xác nhận. Số chưa đo ghi "chưa đo". Không dùng các từ "hoàn thành xuất sắc", "100%", "đạt chuẩn".
- Số mục 14.1, 14.2 và số dòng của bảng 14.2 giữ nguyên, vì PRD và chú thích mã dẫn tới chúng. Dòng mới thêm vào cuối bảng; không đánh số lại.

| | |
| --- | --- |
| Ngày kiểm gần nhất | 2026-10-05 |
| Nhánh, commit mã | `audit-g0`, mã ở `77d965f` |
| Bộ kiểm thử của dự án | 88/88 đạt (`node tests/run-tests.mjs`) |
| PRD đối chiếu | Bản 4.7 |

## Giai đoạn

| Giai đoạn (PRD 15.1) | Tình trạng | Ghi chú |
| --- | --- | --- |
| G0 — Vá lỗi đã kiểm chứng | Đã đóng tại commit `a0979cc` | Dòng 1–9, 11, 13, 15, 17, 18, 20, 23, 24, 26, 28, 29 của 14.2; dòng 10 và 12 ở phần không cần dữ liệu của G4. Phần lịch, việc y tế, tài nguyên bên thứ ba đã kiểm lại độc lập và thử trên trình duyệt |
| G0b — Luồng nhập theo việc | Đã đóng tại commit `77d965f` | Dòng 31–34. Đã mở thử trên trình duyệt cả bốn luồng (cưới hỏi, làm nhà, lịch mổ, việc thường). Phần nhiều người đầy đủ (lá số riêng cho chú rể, tang chủ và người mất) vẫn thuộc G4 |
| G1 — Lõi thiên văn đóng băng | Chưa bắt đầu | Đầu vào đã làm rõ ở PRD mục 5 và 13.1 |
| G2 — Lịch pháp Việt Nam | Chưa bắt đầu | Gồm dòng 14, 19, 27 |
| G3 — Luật có nhãn và ngày cố định | Chưa bắt đầu | Gồm dòng 16 và phần đầu dòng 21 |
| G4 — Chuỗi nghi lễ | Chưa bắt đầu | Gồm phần còn lại của dòng 10, 12, 21 và dòng 25, 30 |
| G5 — Luật từ sách gốc | Chưa bắt đầu | Tùy chọn |

## 14. Hiện trạng mã nguồn so với đặc tả

Kiểm ngày 2026-10-05 trên nhánh `audit-g0`. Bộ kiểm thử của dự án: 88/88 đạt. Cột "Kiểm lại độc lập" ghi kết quả của: lượt chạy riêng bằng script không thuộc bộ kiểm thử; lượt mở thử trên trình duyệt (máy tính và khung 375 px); một lượt phản biện do mô hình khác thực hiện trên commit đóng G0; và một lượt quét cuối chạy cả 20 loại việc cùng hai dạng việc tùy chỉnh với 6 hồ sơ khác nhau (nam, nữ, không rõ giờ sinh, sinh ở Sài Gòn 1970, không rõ vùng 1969, sinh 1920) — 468 lượt tìm ngày, không lượt nào ném lỗi, không dòng nào có giá trị rỗng hay còn chữ Hán chưa dịch.

### 14.1 Đã đáp ứng

- Chạy hoàn toàn trên trình duyệt; dữ liệu hồ sơ không được gửi đi đâu; CSP `default-src 'self'`, `connect-src 'none'`; phông chữ tự lưu trữ.
- Lá số theo thời điểm tiết khí và giờ Mặt Trời thực; chọn được cách chia giờ Tý; múi giờ đồng hồ tự đề xuất theo thời kỳ và vùng.
- Âm lịch 1912–2100 dựng theo `calendar_tz`; không còn "mùng 0"; cờ `OUT_OF_VERIFIED_RANGE`.
- Mỗi cộng trừ điểm đều hiện lý do. Kim lâu, Hoang ốc, Tam tai, Nhị thập bát tú, Dương công, ngũ hành tên không còn góp điểm.
- Việc có ngày cố định (y tế, tang lễ, thi cử) bị chặn quét khoảng ngày; không hiện điểm, xếp loại, lịch nhiệt. Riêng lịch mổ và sinh mổ chỉ còn thông tin lịch thuần.
- Giới hạn pháp luật dẫn đúng văn bản ở 3.2; giới hạn quàn lấy giá trị chặt nhất giữa quốc gia và tỉnh.
- Cảnh báo cứng về tuổi kết hôn có biểu ngữ ở đầu kết quả, có trong tệp `.ics` và bản sao chép.
- Tệp giấy phép MIT của thư viện lịch nằm ở `vendor/LICENSE-lunar-javascript.txt`.
- Ứng dụng không lưu gì vào bộ nhớ trình duyệt; không có nút Lưu hay danh sách hồ sơ.
- Chọn việc trước; người được xét và các trường được hỏi do việc quy định; lịch mổ, sinh mổ không hỏi dữ liệu cá nhân.
- 13 khung giờ, xuất `.ics`, sao chép tóm tắt.
- Dùng lục xung (không phải "tứ hành xung") cho xung tuổi.

### 14.2 Lỗi và khoảng cách

| # | Mức | Vấn đề | Tình trạng | Kiểm lại độc lập |
| --- | --- | --- | --- | --- |
| 1 | Cao | Âm lịch ra "mùng 0" ở 07/05/2054 và 09/04/2062 | Đã sửa | Đạt: 30/3 và 30/2, trùng 6tail; bất biến 1912–2100 không vi phạm |
| 2 | Cao | Âm lịch dùng cố định UTC+7 cho mọi năm | Đã sửa | Đạt: 1929–1967 lệch 0/14.244 ngày; miền Nam 1968–1975 lệch 0/2.922 |
| 3 | Cao | Hàm múi giờ lịch sử chép bảng sai của v3.0 | Đã sửa | Đạt: `civilTz` khớp bảng 6.3 ở 14 điểm thử |
| 4 | Cao | Giao diện luôn gửi múi giờ 7 hoặc 8; không có `region` | Đã sửa | Đạt, đã mở thử: nơi sinh tự suy ra vùng; Quảng Trị 1970 ra UTC+8; Hà Nội 1950 ra UTC+7 kèm cảnh báo vùng Pháp kiểm soát dùng UTC+8 và tự mở phần chọn tay |
| 5 | Cao | Kim lâu, Hoang ốc loại cả năm; áp cho nam khi xem cưới; trừ điểm | Đã sửa | Đạt: động thổ có 219 ngày đề xuất trong năm phạm Kim lâu; dòng Kim lâu 0 điểm; có ghi chú "chỉ xét tuổi cô dâu" |
| 6 | Cao | Việc y tế hiện điểm, xếp loại và dòng tốt xấu | Đã sửa | Đạt: engine trả điểm `null`, 0 dòng luật cho `med_surgery`, `med_birth`; thẻ ngày và hộp chi tiết chỉ còn thông tin lịch và câu y khoa (đã mở thử) |
| 7 | Cao | 10 từ khóa nghi/kỵ không tồn tại trong `lunar.js` | Đã sửa | Đạt: 0 từ khóa và 0 tên thần sát ngoài từ vựng. `med_birth` không có từ khóa chính — đúng theo 3.1 |
| 8 | Cao | Trang tải phông chữ từ Google | Đã sửa | Đạt, đã đo trên trình duyệt: không yêu cầu mạng nào tới tên miền khác; 15 tệp phông tải từ chính trang |
| 9 | Vừa | Dương công, Thụ tử, Đại hao, Vãng vong loại ngày | Đã sửa | Đạt: Dương công 0 điểm, không còn nhánh loại ngày. Xác nhận thêm: 6tail không có thần sát `受死` nên nhánh Thụ tử cũ là mã chết |
| 10 | Vừa | Cờ pháp luật khai báo nhưng không được đọc | Đã sửa phần tuổi kết hôn và giờ nhạc | Đạt, đã mở thử: người 18 tuổi xem cưới thấy biểu ngữ không tắt được ở đầu kết quả; cảnh báo có trong `.ics` và bản sao chép. Thời gian quàn chỉ chạy ở mức hàm (dòng 25); cải táng chỉ có số liệu, chưa có nhánh kiểm (dòng 30) |
| 11 | Vừa | Hồ sơ tự lưu mỗi lần lập lá số | Đã sửa; sau đó chức năng lưu bị bỏ hẳn ở G0b (dòng 32) | Xem dòng 32 |
| 12 | Vừa | Tang lễ hiện chỉ số và chữ "Hung", "Phạm kỵ" | **Đạt một phần** (QĐ-04: cố định đến G4) | Không còn điểm, xếp loại, màu tốt xấu; "kỵ việc này" đổi thành "sách ghi không hợp việc này". Còn các thuật ngữ "Hắc đạo", "Kỵ thần" trong dòng thông tin; rà toàn bộ câu chữ ở G4 |
| 13 | Vừa | Thiếu thi cử, phỏng vấn, khám tự chọn ngày | Đã sửa | Có `career_fixed`, `med_checkup`. Chưa có `CAREER_POST` (nhậm chức) và khung giờ xuất hành (9.4) |
| 14 | Vừa | Ngày chứa tiết lấy theo giờ Bắc Kinh | Tồn đọng (G2) | Không đổi |
| 15 | Vừa | Hướng Hỷ thần, Tài thần tính mà không dùng | Đã sửa | Đạt: kết quả giờ không còn `posXi`, `posCai` |
| 16 | Vừa | Dòng kết quả chưa có `rule_id`, nhãn, nguồn | Tồn đọng (G3) | Không đổi |
| 17 | Vừa | Góp điểm trái bảng 8.3 | Đã sửa | Đạt: Tam tai, Tú, ngũ hành tên, ngũ hành việc tùy chỉnh đều 0 điểm |
| 18 | Vừa | Nhận năm sinh trước 1912; thiếu cờ ngoài vùng kiểm chứng | Đã sửa | Đạt: ô ngày sinh giới hạn 1912–2100; lá số có cờ |
| 19 | Vừa | Chưa chạy ngoại tuyến; ảnh nền 782 KB; quét 1 năm chậm | Tồn đọng | Chưa có service worker; ảnh nền vẫn 782 KB; quét 1 năm khoảng 1,2 giây |
| 20 | Thấp | README và chú thích mã lệch với mã | Đã sửa | Đã đọc README: bảng điểm khớp bảng 8.3 |
| 21 | Thấp | Chưa có chuỗi nhiều bước, nhiều người, chế độ không chỉ số, `engine_version` | Tồn đọng (G3–G4) | Đổi âm → dương đã có hàm và đã báo đúng ngày không tồn tại; chưa có trên giao diện |
| 22 | Thấp | Script tạm trong `scratch/` có thể ghi đè `activities.js`, `scoring.js` | Đã xử lý | Chủ dự án cho phép; đã xóa `update_activities.mjs` và `update_scoring.mjs` ngày 2026-10-05. Thư mục `scratch/` vẫn nằm ngoài git |
| 23 | Cao | `legal.js` dẫn sai văn bản (Thông tư 02/2009, Nghị định 144/2021) và hiện câu chữ sai đó cho người dùng | Đã sửa | Đạt: quàn và cải táng dẫn Thông tư 21/2021/TT-BYT (Điều 4, 9, 13); khung giờ nhạc dẫn Thông tư 04/2011; thông báo không còn chữ "cấm", "vi phạm". Cờ `verified` vẫn là `false` cho mọi dòng |
| 24 | Cao | Quy định Huế 72 giờ bị dùng như giới hạn nới lỏng; thiếu trường hợp ≤ −10°C | Đã sửa | Đạt: hàm `burialLimitHours` lấy giá trị nhỏ nhất; 50 giờ không bảo quản lạnh ở Huế bị cảnh báo; bảo quản lạnh ở Huế bị chặn ở 72 giờ |
| 25 | Vừa | Kiểm tra thời gian quàn và tuổi của người phối ngẫu không kích hoạt được từ giao diện: chưa có ô nhập thời điểm mất, cách bảo quản, tỉnh, ngày sinh người kia. Mức "Loại" của giới hạn quàn (3.2) vì thế chưa có hiệu lực trên giao diện | Tồn đọng (G4) | Không đổi; thuộc phần nhiều người và chuỗi tang lễ |
| 26 | Vừa | `lunarToSolar` nhận ngày âm không tồn tại; khi không truyền múi giờ thì trả `null` oan cho tháng 7 nhuận 1938 | Đã sửa | Đạt: đổi ngược 1912–2100 không truyền múi giờ đúng 69.032/69.032 ngày ở cả hai vùng |
| 27 | Thấp | 1912–1928: xếp sai tháng nhuận năm 1917 và 1922 so với 6tail (58 ngày lệch ngày/tháng) | Tồn đọng (G2) | Đã tìm ra nguyên nhân: trung khí rơi khoảng 3 phút sau nửa đêm theo kinh tuyến Bắc Kinh; xem 13.3. Ngoài vùng cam kết |
| 28 | Thấp | Danh sách nơi sinh gộp "Quảng Bình / Quảng Trị" thành một mục gán miền Bắc | Đã sửa | Đạt: tách hai mục. Hồ sơ đã lưu từ trước với mục gộp nay hiển thị là Quảng Bình; người sinh ở Quảng Trị trước 13/06/1975 cần chọn lại nơi sinh |
| 29 | Vừa | Giao diện bỏ cả tên thư viện lẫn câu "chưa đối chiếu với sách gốc" | Đã sửa theo QĐ-05 | Đạt: không nêu tên thư viện (theo yêu cầu chủ dự án ở phiên sửa mã khác); trang chính và hộp chi tiết đều có câu "dữ liệu chưa đối chiếu với sách gốc"; có kiểm thử giữ cả hai điều. Giấy phép MIT nằm ở `vendor/` |
| 30 | Thấp | Giới hạn cải táng 36 tháng có số liệu trong `legal.js` nhưng không có nhánh kiểm và chưa có việc "cải táng" | Tồn đọng (G4) | Tìm `minMonths` trong mã: không nơi nào dùng |
| 31 | Cao | Giao diện bắt khai hồ sơ trước khi chọn việc; mọi việc hỏi cùng một bộ trường, kể cả họ tên | Đã sửa (G0b) | Đạt, đã mở thử: thứ tự thẻ là 1 Công việc → 2 Người được xét → 3 Thời gian; tiêu đề và trường của thẻ 2 đổi theo việc; ô họ tên chỉ hiện khi bật "ngũ hành tên" |
| 32 | Cao | Ứng dụng còn chức năng lưu hồ sơ | Đã sửa (G0b) | Đạt, đã mở thử: không còn nút Lưu, danh sách hồ sơ; sau khi dùng cả bốn luồng, `localStorage`, `sessionStorage` và cookie đều rỗng; khóa `ngaytot.*` đặt sẵn từ trước bị xóa khi tải lại trang |
| 33 | Cao | Chủ thể xét tuổi chưa theo việc | Đã sửa (G0b) | Đạt, đã mở thử: cưới hỏi khóa giới nữ, tiêu đề "Cô dâu", kết quả ghi "xét tuổi cô dâu (Mậu Dần)"; khai chú rể 18 tuổi thì có biểu ngữ tuổi kết hôn, ngày xung tuổi chú rể thành kỵ nặng. Làm nhà có ô "Ai là gia chủ?" bốn phương án; chọn nữ gia chủ thì kết quả ghi "xét tuổi nữ gia chủ"; chỉ phương án mượn tuổi mới hiện ô giới tính. Giới hạn: chú rể mới dùng cho xung tuổi và tuổi kết hôn, chưa có lá số riêng (G4) |
| 34 | Vừa | Lịch mổ, sinh mổ vẫn đòi lập lá số | Đã sửa (G0b) | Đạt, đã mở thử: chọn phẫu thuật thì thẻ "Người được xét" ẩn hẳn; để trống ngày sinh vẫn xem được thông tin lịch |

## Số đo phi chức năng

Yêu cầu tương ứng ở PRD mục 12.

| Hạng mục | Hiện trạng đo được |
| --- | --- |
| Hiệu năng | Node.js trên máy phát triển: 0,4–1,2 giây cho mỗi năm chưa có trong bộ nhớ đệm, tùy việc và tải máy (ba lượt đo của hai bên trong cùng buổi). Sát ngưỡng; chưa đo trên điện thoại |
| Kích thước tải đầu | Đo trên trình duyệt: khoảng 1,5 MB cho lần tải đầu (ảnh nền `assets/hero.jpg` 782 KB, `vendor/lunar.js` 436 KB, 15 tệp phông, mã và CSS). Cần nén ảnh nền xuống ≤ 150 KB |
| Ngoại tuyến | Chưa có service worker. Phông chữ đã tự lưu trữ |
| Tái lập | Chưa có |
| Tiếp cận | Chưa kiểm |
| Bảo mật | Đạt phần CSP: `default-src 'self'`, `font-src 'self'`, `connect-src 'none'`; còn `style-src 'unsafe-inline'` |
| Tương thích | Chưa kiểm |

## Ca kiểm thử bắt buộc

Kỳ vọng tương ứng ở PRD mục 13.3.

| Ca | Hiện trạng (kiểm lại độc lập) |
| --- | --- |
| Tết 1985 | Đạt |
| Tết 2007 | Đạt |
| Tháng nhuận 1984–1985 | Mã cho: Việt Nam không nhuận năm 1984, nhuận tháng 2 năm 1985. Chưa có đáp án tham chiếu độc lập |
| Năm 2033–2034 | Mã cho nhuận tháng 11 năm 2033 ở cả hai múi. Chưa có đáp án tham chiếu độc lập **[CK]** |
| Tháng chứa hai trung khí; năm có hơn một tháng không chứa trung khí | Chưa có ca riêng (đã có kiểm thử "Đông chí ở tháng 11, tháng nhuận không có trung khí") |
| Bất biến 13.2 trên 1912–2100, cả hai `region` | Đạt: 69.032 ngày mỗi vùng, 0 ngày ngoài 1–30, 0 bước nhảy sai, đổi ngược đúng 100% |
| 07/05/2054 và 09/04/2062 | Đạt: ra 30/3 và 30/2, trùng 6tail |
| Âm lịch 1929–1967 | Đạt: 0 trên 14.244 ngày lệch so với 6tail; Tết 1935 = 04/02, Tết 1965 = 02/02 |
| 1968–1975 với cả hai `region` | Đạt; phương án Nam khớp 6tail 2.922/2.922 ngày, phương án Bắc lệch 120 ngày như kỳ vọng |
| 1912–1928 (ngoài vùng cam kết) | Lệch 58 trên 6.210 ngày so với 6tail (118 ngày nếu tính cả cờ nhuận), gồm hai đợt: từ 23/03/1917 và từ 25/06/1922. Nguyên nhân: mã xếp nhuận tháng 3 năm 1917 và nhuận tháng 6 năm 1922, 6tail xếp nhuận tháng 2 và nhuận tháng 5. Trung khí Cốc vũ 1917 rơi 00:17 giờ UTC+8, tức chỉ khoảng 3 phút sau nửa đêm theo kinh tuyến Bắc Kinh — đúng loại ca `BOUNDARY_RISK` mà thuật toán xấp xỉ không phân giải được. Chạy ở UTC+8 cũng không khớp (lệch 120 ngày, từ 17/11/1914). Cần `official_overrides` ở G2 **[CK — chưa có nguồn thứ ba xác nhận 6tail đúng]** |
| Ngày âm không tồn tại | Đạt: 30/2/2026, ngày 0, ngày 31, tháng nhuận không có đều trả `null`. Đổi ngược 69.032 ngày của 1912–2100 đúng hết ở cả hai vùng, kể cả khi không truyền múi giờ (lượt phản biện đã bắt lỗi 15/7 nhuận 1938 trả `null` oan; đã sửa) |
| Đại hàn 1979 | Chưa có ca |
| Toàn bộ ngày trong cửa sổ `BOUNDARY_RISK` | Chưa có |
| Tiết rơi 00:00–01:00 giờ Bắc Kinh | Chưa có ca; mã đang theo giờ Bắc Kinh |
| Lá số theo `civil_tz` | Đạt; hàm `civilTz` khớp bảng 6.3 ở 14 điểm thử |
| Từ khóa hồ sơ việc | Đạt: 0 từ khóa nghi/kỵ và 0 tên thần sát nằm ngoài từ vựng 6tail |
| Việc y tế | Đạt: `med_surgery`, `med_birth` trả điểm `null`, xếp loại `null`, 0 dòng luật, không có trường hoàng đạo/hắc đạo; giao diện chỉ hiện ngày âm, can chi, tiết khí, giờ đã định và câu y khoa (đã mở thử trên trình duyệt) |
| Giới hạn quàn | Đạt ở mức hàm: 48 / 168 / 24 giờ, ≤ −10°C không giới hạn; Huế không nới 48 giờ, có siết 7 ngày xuống 72 giờ. Chưa nối giao diện (mục 14.2 dòng 25) |
