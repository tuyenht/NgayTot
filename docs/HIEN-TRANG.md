# Ngày Tốt — Hiện trạng thực hiện

Tệp này ghi mã nguồn hiện đáp ứng `PRD-LICH-VIET-CORE-2026.md` tới đâu. Yêu cầu nằm ở PRD; tệp này không đặt ra yêu cầu mới.

**Quy tắc cập nhật**

- Cập nhật sau mỗi đợt sửa mã. Người hoặc công cụ sửa mã chỉ được sửa cột "Tình trạng"; cột "Kiểm lại độc lập" ghi kết quả của một lượt kiểm khác với lượt viết mã, và phải nói rõ ai kiểm: "tác giả mở thử" (người viết mã tự thử trên trình duyệt hoặc bằng script ngoài bộ kiểm thử) hay "phản biện độc lập" (mô hình hoặc người khác đọc mã và chạy lại).
- Mỗi kết luận ghi cách đã xác nhận. Số chưa đo ghi "chưa đo". Không dùng các từ "hoàn thành xuất sắc", "100%", "đạt chuẩn".
- Số mục 14.1, 14.2 và số dòng của bảng 14.2 giữ nguyên, vì PRD và chú thích mã dẫn tới chúng. Dòng mới thêm vào cuối bảng; không đánh số lại.

| | |
| --- | --- |
| Ngày kiểm gần nhất | 2026-10-06 (dòng 40–47; phần còn lại kiểm 2026-10-05) |
| Nhánh, commit mã | `audit-g0`, mã ở `ad8dbed` |
| Bộ kiểm thử của dự án | 139/139 đạt tại `ad8dbed` (`node tests/run-tests.mjs`); 118/118 tại `132a0a9` |
| PRD đối chiếu | Bản 4.11 |

## Giai đoạn

| Giai đoạn (PRD 15.1) | Tình trạng | Ghi chú |
| --- | --- | --- |
| G0 — Vá lỗi đã kiểm chứng | Đã đóng tại commit `a0979cc` | Dòng 1–9, 11, 13, 15, 17, 18, 20, 23, 24, 26, 28, 29 của 14.2; dòng 10 và 12 ở phần không cần dữ liệu của G4. Phần lịch, việc y tế, tài nguyên bên thứ ba đã kiểm lại độc lập và thử trên trình duyệt |
| G0b — Luồng nhập theo việc | Đã đóng tại commit `77d965f` | Dòng 31–34. Đã mở thử trên trình duyệt cả bốn luồng (cưới hỏi, làm nhà, lịch mổ, việc thường). Phần nhiều người đầy đủ (lá số riêng cho chú rể, tang chủ và người mất) vẫn thuộc G4 |
| Lịch trình giờ trong ngày cưới (PRD 10.5), ý nghĩa giờ tốt và khung giờ đề xuất (PRD 8.6) | Đã làm; bản hiện tại ở `132a0a9` | Dòng 35–37, 39. Làm sớm hơn chuỗi cưới hỏi của G4 theo yêu cầu của chủ dự án |
| G1 — Lõi thiên văn đóng băng | Chưa bắt đầu | Đầu vào đã làm rõ ở PRD mục 5 và 13.1 |
| G2 — Lịch pháp Việt Nam | Chưa bắt đầu | Gồm dòng 14, 19, 27 |
| G3 — Luật có nhãn và ngày cố định | Chưa bắt đầu | Gồm dòng 16, phần đầu dòng 21 và dòng 38 |
| G4 — Chuỗi nghi lễ | Chưa bắt đầu | Gồm phần còn lại của dòng 10, 12, 21 và dòng 25, 30 |
| G5 — Luật từ sách gốc | Chưa bắt đầu | Tùy chọn |

## 14. Hiện trạng mã nguồn so với đặc tả

Kiểm ngày 2026-10-05 trên nhánh `audit-g0`. Bộ kiểm thử của dự án: 118/118 đạt. Các lượt kiểm ngoài bộ kiểm thử đã chạy trên bản này: script quét 468 lượt tìm ngày (6 hồ sơ × 22 việc, gồm 2 dạng việc tùy chỉnh × 2 bộ tùy chọn × 1 hoặc 2 chế độ giờ tùy việc) không lượt nào lỗi; mở từng việc trong 21 lựa chọn trên giao diện, việc nào cũng ra kết quả và mở được hộp chi tiết; bất biến lịch 1912–2100 không vi phạm ở cả hai vùng; mở thử trên trình duyệt ở khung máy tính và khung 375 px; bốn lượt phản biện do mô hình khác thực hiện (tài liệu; đợt đóng G0; G0b cùng lịch trình ngày cưới; đợt sửa sau đó).

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
- Việc cưới: chọn một ngày làm ngày chính rồi xếp lịch trình giờ theo quãng đường; giờ đề xuất nằm trong khung sinh hoạt.
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
| 31 | Cao | Giao diện bắt khai hồ sơ trước khi chọn việc; mọi việc hỏi cùng một bộ trường, kể cả họ tên | Đã sửa (G0b) | Tác giả mở thử: thứ tự thẻ 1 Công việc → 2 Người được xét → 3 Thời gian; trường của thẻ 2 đổi theo việc; ô họ tên chỉ hiện khi bật "ngũ hành tên". Phản biện độc lập: không còn tham chiếu phần tử hay hàm đã xóa; nêu ba chỗ PRD 9.5 viết mạnh hơn mã (nơi sinh luôn hỏi, bộ lọc nằm ở bước 3, việc tùy chỉnh chưa chọn từ khóa) — PRD 4.9 đã sửa cho khớp |
| 32 | Cao | Ứng dụng còn chức năng lưu hồ sơ | Đã sửa (G0b) | Tác giả mở thử: sau khi dùng cả bốn luồng, `localStorage`, `sessionStorage` và cookie đều rỗng; khóa `ngaytot.*` đặt sẵn bị xóa khi tải lại. Phản biện độc lập: kiểm thử "không ghi gì" chỉ so chuỗi trên mã nguồn, chưa phải bằng chứng hành vi — bằng chứng hành vi là lượt mở thử |
| 33 | Cao | Chủ thể xét tuổi chưa theo việc | Đã sửa (G0b) | Tác giả mở thử: cưới hỏi khóa giới nữ, kết quả ghi "xét tuổi cô dâu"; chú rể 18 tuổi thì có biểu ngữ tuổi kết hôn; làm nhà có bốn phương án gia chủ. Phản biện độc lập tìm ra hai thiếu sót, đã sửa ở dòng 36: "đang xét tuổi ai" chỉ có ở tiêu đề, và phương án con trai trưởng thiếu ghi chú dị bản. Giới hạn: chú rể chỉ dùng cho xung tuổi và tuổi kết hôn, chưa có lá số riêng (G4) |
| 34 | Vừa | Lịch mổ, sinh mổ vẫn đòi lập lá số | Đã sửa (G0b) | Tác giả mở thử: thẻ "Người được xét" ẩn hẳn; để trống ngày sinh vẫn xem được thông tin lịch. Phản biện độc lập: không đường nào đọc lá số khi lá số rỗng |
| 35 | Vừa | Việc cưới: giờ "tốt nhất" hay rơi vào nửa đêm, rạng sáng; không có cách xếp giờ đón dâu theo quãng đường | Đã sửa (QĐ-09) | Tác giả mở thử: thẻ ngày cưới chỉ đề xuất giờ 07:00–20:59; bảng lịch trình ra tối đa ba phương án kèm lưu ý; nhà xa có lời khuyên; quá xa thì báo không xếp được; khung 375 px không tràn. Phản biện độc lập (1.920 ca): việc khử trùng phương án không làm mất phương án tốt hơn; ranh giới canh giờ tính đúng ở cả 1.440 phút; ở thời điểm đó chỉ hai việc có tiệc, nhạc đổi giờ đề xuất (từ dòng 39, mọi việc đều theo khung sinh hoạt). Các lỗi lượt đó tìm ra nằm ở dòng 36. Giới hạn: lịch trình hai ngày chưa có (G4); ba mốc dựa trên bài phổ thông |
| 36 | Cao | Lỗi do phản biện độc lập tìm ra trong G0b và lịch trình: (a) tìm ngày thất bại hoặc đổi việc thì kết quả cũ vẫn hiện nhưng bị đọc bằng việc, tuổi mới — có thể mất cảnh báo tuổi kết hôn hoặc lỗi khi bấm thẻ cũ; (b) `plan()` nhận chuỗi và số lẻ: ô để trống ra 0 phương án, 12,5 phút ra giờ `08:52.5` làm hỏng `.ics`, thiếu thời gian đi bị hiểu là 0; (c) mốc cuối trong `.ics` dài 0 phút; (d) lễ ở nhà gái có thể bị xếp lúc 05:40, trước khung giờ nhạc; (e) giờ tiệc 23:30 mang nhãn hoàng đạo của ngày hôm sau mà không ghi chú; (f) "đang xét tuổi ai" thiếu ở hộp chi tiết, bản sao chép, `.ics` | Đã sửa tại `a9bbef8` | Tác giả mở thử và thêm kiểm thử: đổi việc hoặc tìm lỗi thì thẻ kết quả ẩn; chuỗi, số lẻ, ô trống đều ra giờ nguyên phút; thiếu thời gian đi thì báo lỗi; 112 lượt xếp không có lễ nào trước 06:00; tiệc 23:30 có ghi chú; mốc về nhà trai kết thúc lúc xong lễ. Phản biện độc lập (lượt thứ tư, 6.048 ca): mốc gắn luôn nằm trong canh đã chọn, phương án đầu không kém phương án nào; không còn đường mất kết quả im lặng. Các lỗi lượt đó tìm ra nằm ở dòng 39. Kiểm thử tự động chỉ phủ phần engine; phần giao diện (xóa kết quả cũ, `.ics`, câu "đang xét tuổi ai") chỉ có lượt mở thử |
| 37 | Vừa | Thẻ ngày ghi "Giờ tốt" mà không nói giờ đó để làm gì; với lễ cưới người dùng không biết đó là giờ đón dâu, giờ làm lễ hay giờ tiệc; chọn một canh rồi vẫn phải tự tính giờ cụ thể | Đã sửa tại `a9bbef8` (QĐ-10) | Tác giả mở thử: khai trương ghi "Giờ tốt để mở cửa, khai trương" và đề xuất "bắt đầu lúc 13:15"; thẻ ngày cưới ghi "Giờ hoàng đạo trong ngày" theo thứ tự trong ngày, bấm canh 09:00–10:59 ra ngay "Vào nhà gái lúc 09:20" cùng ba mốc còn lại; đổi sang gắn mốc về nhà trai vào canh 13 giờ thì xếp lại; `.ics` của ngày cưới chưa xếp lịch là sự kiện cả ngày. Phản biện độc lập (lượt thứ tư): bảng PRD 8.6 khớp từng dòng với mã; tìm ra lỗi lễ cưới ở chế độ giờ cố định, đã sửa ở dòng 39. Giờ bắt đầu đề xuất chỉ có trong hộp chi tiết và không có cho canh Tý (1 tiếng) |
| 38 | Thấp | Việc tùy chỉnh chưa chọn trực tiếp từ khóa nghi/kỵ (chỉ mượn quy tắc của một việc có sẵn); chưa có công tắc tắt cả nhóm tập tục dân gian | Tồn đọng (G3) | Phản biện độc lập nêu khi đối chiếu PRD 9.5 |
| 39 | Vừa | Phát hiện ở lượt rà toàn bộ và lượt phản biện độc lập thứ tư: (a) việc thường vẫn được đề xuất giờ 01:00–02:59; (b) lễ cưới ở chế độ giờ cố định bị coi là "chưa xếp lịch": `.ics` thành sự kiện cả ngày, mất giờ người dùng đặt, và ghi "một canh hoàng đạo" cho cả giờ hắc đạo; (c) Enter trên nút canh giờ mở hộp chi tiết thay vì lịch trình; (d) đề xuất tự chạy bằng số mặc định nhưng ghi "theo thời gian đã khai"; (e) `plan()` nhận `true`, mảng, `'1e3'`, giờ tiệc `12:60`, khung giờ ngược, mốc gắn sai mà không báo; (f) bấm "Lập lá số" xóa kết quả không cần thiết, trong khi đổi bộ lọc lại không xóa; (g) ô chọn canh ghi "Hoàng đạo" cho cả canh xung tuổi; (h) `.ics` của một ngày thiếu xuống dòng cuối tệp | Đã sửa tại `132a0a9` (QĐ-11 cho mục a) | Tác giả mở thử: ký hợp đồng không còn giờ trước 05:00 trên thẻ nào; lễ cưới giờ cố định 10:30 ra `.ics` 10:30–11:30 và ghi "giờ để làm lễ"; Enter trên nút canh không mở hộp chi tiết; đề xuất mặc định có câu nói rõ; đổi bộ lọc thì kết quả ẩn, bấm "Lập lá số" thì giữ. Kiểm thử mới: 10 kiểu tham số sai đều bị từ chối bằng thông báo tiếng Việt; vét cạn 84 ca gắn mốc. Chưa có phản biện độc lập cho các bản sửa này |
| 40 | Cao | Các phân hệ thêm ngày 2026-10-05/06 (lịch tháng, sổ giỗ, la bàn và canh giờ, kho văn khấn, lưu IndexedDB, chạy ngoại tuyến) trái với quyết định và PRD hiện hành: QĐ-07 "không lưu gì", mục 17.1 "bỏ văn khấn", PRD 8.3 "phương vị chưa kiểm nguồn thì ẩn"; lịch tháng có bảng "6 kịch bản" tự chấm 0–100 điểm và chữ "tuyệt đối tránh", trái nguyên tắc không loại cứng. README và trang chính vẫn ghi "không lưu gì" | **Đã có quyết định ngày 2026-10-07** (QĐ-12 đến QĐ-18): giữ sổ giỗ, lịch tháng, canh giờ, kho văn khấn; QĐ-15 thay QĐ-07. **Chưa thực hiện trong mã:** đổi thứ tự Lý Thuần Phong và gỡ khỏi thanh đầu trang, nhãn cho Tài thần (QĐ-16); ghi chú ngày hoàng đạo hai cách tính khác nhau (QĐ-16); gỡ bảng "6 kịch bản" (QĐ-17); tách bản web không lưu và bản mobile có lưu (QĐ-15); viết lại thân PRD các mục 1, 4.1, 7, 8.3, 12 | Rà ngày 2026-10-06 (mô hình chính đọc tài liệu và mở thử; một lượt phản biện độc lập đọc mã) |
| 41 | Cao | Lịch tháng tự tính ngày hoàng đạo bằng bảng riêng, sai ở 10 trên 12 tháng: lệch với phần chọn ngày 166/365 ngày năm 2026; tên thần và tên sao hiện chữ Hán vì gọi nhầm `NT.i18n` | Đã sửa (chưa commit): lấy từ cùng nguồn với `scoring.js`, gọi `NT.vi` | Tác giả mở thử: 427 ô của 12 tháng năm 2026 lệch 0; thẻ ngày ghi "Câu Trận", "Sao Chủy" |
| 42 | Cao | Màn hình hẹp hơn 1080 px không có thanh chuyển tab nên chỉ vào được tab Trạch cát; lịch tháng và sổ giỗ tràn ngang ở 375 px | Đã sửa (chưa commit) | Tác giả mở thử ở 375 px: đủ 6 tab, 6 tab đều không tràn ngang |
| 43 | Cao | Sổ giỗ: ngày giỗ tháng 11, 12 âm rơi hai lần trong một năm dương thì luôn lấy lần sau (giỗ 1/12 âm, hôm nay 20/01/2026 báo còn 707 ngày thay vì 353); tệp sao lưu có ngày 31 hoặc tháng 13 làm mất cả danh sách; `.ics` không escape nên ghi chú chèn được sự kiện giả, chỉ nhắc cứng trước 2 ngày; hồ sơ tự điền năm sinh 1990 và không lưu vùng miền; hộp thoại báo "undefined ngày giỗ"; chấm giỗ trên lịch tháng bỏ qua tháng nhuận, ngày 30 gặp tháng thiếu và không cập nhật khi thêm giỗ | Đã sửa (chưa commit) | 11 kiểm thử mới trong `tests/run-tests.mjs`; tác giả mở thử: giỗ 30/8 âm hiện đúng ô 09/10/2026, tên có thẻ HTML không chạy. Phản biện độc lập (Opus, 2026-10-06): 9.648 tổ hợp không lỗ hổng, `.ics` đúng RFC 5545 ở các ca thử; tìm ra giỗ 30 tháng nhuận nhảy về tháng thường, sửa giỗ làm mất ngày tạo, nhập sao lưu nhận kiểu dữ liệu lạ — đã sửa. Còn: nhắc của sự kiện cả ngày nổ lúc 00:00, giờ nhắc 07:00 chưa dùng |
| 44 | Cao | Canh giờ: Hạc thần tra theo chi ngày (phải theo vòng 60 can chi); Lý Thuần Phong lệch một cung (mùng 1 tháng giêng giờ Tý phải là Đại An); 23:00–23:59 dùng can chi của ngày cũ, trái với phần chọn ngày; bảng 12 canh chỉ dựng một lần; câu chữ lẫn ký tự Thái | Đã sửa (chưa commit) | 3 kiểm thử mới; tác giả mở thử. Phản biện độc lập (Opus, 2026-10-06): Hạc thần khớp 60/60 can chi với bảng của Lịch Như Ý và 33.480/36.525 ngày với bảng của VMB (toàn bộ phần lệch nằm ở 5 can chi Mậu Tý–Nhâm Thìn của VMB); Đại An ở mùng 1 tháng giêng giờ Tý xác nhận bằng mã của hai ứng dụng và bảng của một ứng dụng. **Còn mở, chưa sửa:** thứ tự sáu cung của ta (Đại An–Lưu Niên–Tốc Hỷ) ngược với cả ba ứng dụng đọc được (Đại An–Tốc Hỷ–Lưu Niên) nên 1.440/4.320 tổ hợp ngày giờ ghi tốt xấu ngược nhau; Tài thần ngày Mậu, Nhâm, Quý mỗi nguồn một khác; giao diện chưa gắn nhãn tranh cãi |
| 45 | Vừa | Văn khấn: tên, địa chỉ có ký tự `$` làm hỏng bài; chạy ngoại tuyến: lấy bộ nhớ đệm trước và không đổi phiên bản nên người dùng kẹt bản cũ, thiếu phông và ảnh nền | Đã sửa (chưa commit): hàm thay thế; `sw.js` lấy mạng trước, đệm đủ 41 tệp | 1 kiểm thử mới; tác giả mở thử: bộ đệm `ngaytot-pwa-v2` có 41 tệp |
| 46 | Vừa | La bàn đọc cảm biến sai chiều và không phải hướng bắc từ trên Android; đóng bài khấn bằng Esc không dừng cuộn và khóa sáng màn hình; chế độ riêng tư báo "đã lưu" nhưng mất khi tải lại; nhắc trong `.ics` nổ lúc 00:00; chờ mạng không giới hạn khi mạng chập chờn; ảnh nền 782 KB | Đã sửa (chưa commit): la bàn dùng sự kiện hướng tuyệt đối, tự tắt và báo khi máy không có la bàn; mọi cách đóng bài khấn đều dọn dẹp; lưu tạm thì báo rõ; nhắc theo giờ nhắc (mặc định 07:00); chờ mạng tối đa 4 giây rồi dùng bản đệm; ảnh nền còn 123 KB. **Còn lại:** nút in và chip tốc độ không có trong trang; bài khấn mở từ kho không điền ngày âm; ngày lễ tháng nhuận tính sai mức ưu tiên; ẩn tab rồi quay lại thì khóa sáng màn hình không được xin lại | Phản biện độc lập (Opus, 2026-10-06) trên bản so sánh thay đổi: không có lỗi mức cao; hai lỗi mức vừa ở `sw.js` (chuyển hướng của yêu cầu điều hướng, lỗi 5xx che bản đệm) đã sửa. Tác giả mở thử: tắt máy chủ rồi tải lại, trang, lịch tháng và 16 phông vẫn chạy; lần tải đầu 1,37 MB. **Chưa thử trên điện thoại thật**: la bàn, cài lên màn hình chính, Safari riêng tư |
| 47 | Cao | Nguồn nội dung 55 bài văn khấn và câu "chuẩn xác theo khảo chứng… (NXB Văn Hóa Thông Tin)" chưa có ai đối chiếu; `docs/AI_REMIXING_MASTER_PROMPTS.md` mô tả việc viết lại dữ liệu lấy từ ứng dụng khác để né kiểm tra đạo văn | **Đã đối chiếu và sửa (chưa commit), ngày 2026-10-07:** 32 bài sửa danh xưng, ngày lễ, lễ vật hoặc kiêng kỵ (thiếu Thái Tuế, Thành hoàng–Thổ địa–Táo quân ở 9 bài; danh xưng không có nguồn như "Thiên cơ đại tiên chúa", "Đức Chúa ngục", "Tả Phủ Bắc Đẩu, Hữu Bật Nam Tào", "Tam vị Đức Ông", "Nguyệt Cung Thái Âm" trong bài Trung thu; kiêng kỵ không nguồn); 8 lễ của các dân tộc Mường, Tày, Nùng, Thái, Dao, Khmer, Chăm chuyển thành bài giới thiệu, bỏ lời khấn (`kind: 'gioi_thieu'`); câu khẳng định nguồn trên trang và trong mã thay bằng mô tả đúng thực tế. Bản trước khi sửa lưu ở `scratch/prayers-data.truoc-doi-chieu.js`. Theo QĐ-18, quy trình trong `AI_REMIXING_MASTER_PROMPTS.md` không được dùng và tệp đó không đưa vào kho mã | Ba lượt đối chiếu độc lập (Sonnet), yêu cầu mỗi bài ít nhất hai nguồn (không phải bài nào cũng đạt: cúng ghe thuyền, cơm mới Mường và một số chi tiết chỉ có một nguồn hoặc chỉ có bản tóm tắt): báo chính thống, trang cơ quan văn hóa và kho văn khấn của hai ứng dụng khác (chỉ để so). Mô hình chính kiểm lại 11 kết luận trên kho có sẵn: 9 khớp, 1 khớp một phần (bài động thổ: một kho ghi "Quan Đương niên", kho kia ghi Thái Tuế), 1 không kiểm được tại chỗ (bài Đức Ông). 3 kiểm thử mới. Lượt đọc duyệt độc lập thứ hai (Opus, 2026-10-07) trên bản đã sửa: tìm ra một vị bị khấn hai lần do chính đợt sửa (bài cất nóc), lời hứa hẹn tài lộc quá đà ở bài Thần Tài, khai trương, ghe thuyền, câu kiêng kỵ tuyệt đối hóa không căn cứ ở 10 bài, "tuổi 1985 (tuổi 42)" do sai chữ trước biến năm sinh, lỗi chữ ở 12 bài — đã sửa; các điểm chỉ dựa trên hiểu biết của người đọc duyệt, chưa có nguồn (danh xưng thân quyến Đức Thánh Trần, danh hiệu ba Mẫu) để nguyên. **Giới hạn:** chưa đối chiếu sách in gốc; nhiều trang web chỉ đọc được bản tóm tắt; hai kho ứng dụng cùng một gốc sách nên chỉ tính một nguồn; các chi tiết chưa tìm được nguồn (ví dụ Chuẩn Đề, Tiêu Diện trong bài cúng chúng sinh; nến tơ hồng; khay bốc đồ thôi nôi) còn nguyên |

## Số đo phi chức năng

Yêu cầu tương ứng ở PRD mục 12.

| Hạng mục | Hiện trạng đo được |
| --- | --- |
| Hiệu năng | Node.js trên máy phát triển: 0,4–1,2 giây cho mỗi năm chưa có trong bộ nhớ đệm, tùy việc và tải máy (ba lượt đo của hai bên trong cùng buổi). Sát ngưỡng; chưa đo trên điện thoại |
| Kích thước tải đầu | Đo trên trình duyệt ngày 2026-10-06 (bản làm việc): 1,37 MB cho lần tải đầu (`vendor/lunar.js` 436 KB, ảnh nền 123 KB sau khi nén, dữ liệu văn khấn 111 KB, 16 tệp phông, mã và CSS) |
| Ngoại tuyến | Có `sw.js` (bản làm việc, chưa commit): mạng trước, chờ tối đa 4 giây, đệm 41 tệp; đã thử tắt máy chủ rồi tải lại trên máy tính. Chưa thử trên điện thoại |
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
