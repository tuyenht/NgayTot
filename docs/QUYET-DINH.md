# Ngày Tốt — Quyết định và lý do

Tệp này ghi các quyết định về sản phẩm và những gì đã bỏ hoặc đổi so với tài liệu nguồn, kèm lý do. Yêu cầu hiện hành nằm ở `PRD-LICH-VIET-CORE-2026.md`; tình trạng thực hiện nằm ở `HIEN-TRANG.md`.

**Quy tắc cập nhật:** chỉ thêm dòng mới. Muốn đổi một quyết định thì thêm quyết định mới ghi rõ thay cho quyết định nào, rồi mới sửa PRD. Số mục 16, 17.1, 17.2, 17.3 giữ nguyên vì PRD dẫn tới chúng. "14.2 dòng N" trong tệp này trỏ tới bảng ở `HIEN-TRANG.md`.

Bốn tài liệu nguồn (v3.0, Đặc tả, PRD-FENGSHUI, V5.1) do chủ dự án giữ, không nằm trong kho mã; các bảng ở mục 17 trích đủ những chỗ cần để hiểu lý do.

## 16. Quyết định của chủ dự án

QĐ-01 đến QĐ-04 được chủ dự án chốt ngày 2026-10-05 theo phương án khuyến nghị. QĐ-05 đến QĐ-08 phát sinh sau đó trong cùng ngày; cột "Quyết định" ghi rõ phần nào do chủ dự án nói trực tiếp, phần nào do bên soạn tài liệu chọn khi được giao. Muốn đổi thì sửa bảng này trước, rồi mới sửa các mục liên quan.

| Mã | Câu hỏi | Quyết định | Hệ quả trong tài liệu |
| --- | --- | --- | --- |
| QĐ-01 | Có giữ chỉ số 0–100 không? | **Giữ (phương án B)**, với 5 điều kiện ở 8.4. Không chọn A (bỏ hẳn như Đặc tả) và C (chỉ tính từ luật `CONSENSUS` như V5.1 gợi ý) | 8.4, 8.5; chế độ "không chỉ số" vẫn phải có ở G3 |
| QĐ-02 | Bát tự có thuộc phạm vi không? | **Có**, giới hạn ở việc dùng lá số để cá nhân hóa chọn ngày; không luận đoán vận mệnh | 1.2, 1.3, 8.1 |
| QĐ-03 | Có đầu tư G1–G2 (Skyfield, bảng đóng băng)? | **Có, làm sau khi G0 đóng.** G0 đã đóng nên G1 là việc tiếp theo | 4.1, 5, 15.1 |
| QĐ-04 | Trước G4, khâm liệm và di quan (`FUNERAL_MAIN`) ở chế độ nào? | **Cố định cho đến G4**: chỉ xem một ngày giờ đã định. Đến G4 mới mở chọn giờ trong khung quàn, kèm ô nhập thời điểm mất, cách bảo quản, tỉnh | 9.2, 10.3, 14.2 dòng 12 và 25 |
| QĐ-05 | Giao diện ghi nguồn dữ liệu nghi/kỵ thế nào? | **Không nêu tên thư viện, nhưng giữ câu "dựa trên truyền thống Hiệp Kỷ Biện Phương Thư; dữ liệu chưa đối chiếu với sách gốc".** Chủ dự án yêu cầu bỏ tên thư viện ở phiên sửa mã khác; câu "chưa đối chiếu" giữ theo PRD 7.7 | PRD 7.1, 7.7; 14.2 dòng 29. Phương án không chọn: nêu tên thư viện trên giao diện; bỏ cả câu "chưa đối chiếu" |
| QĐ-06 | Người dùng khai gì trước? | **Chọn việc trước**, rồi ứng dụng mới hỏi đúng các trường mà việc đó cần (chủ dự án yêu cầu ngày 2026-10-05) | PRD 9.5; 14.2 dòng 31, 34. Phương án không chọn: khai hồ sơ Bát tự trước như hiện tại — bắt người dùng khai cả những thứ việc của họ không cần, kể cả với lịch mổ |
| QĐ-07 | Có lưu hồ sơ không? | **Không lưu gì.** Chủ dự án nói "không cần lưu lại"; khi được hỏi lại đã giao cho bên soạn tài liệu chọn. Chọn bỏ hẳn chức năng lưu vì: việc quyết định trường nào được hỏi nên một "hồ sơ" chung không còn khớp; ứng dụng không còn giữ dữ liệu cá nhân nào trên máy; bớt mã và bớt một lớp kiểm thử. Đánh đổi: gia đình xem nhiều việc cho cùng một người phải nhập lại ngày sinh mỗi lần mở trang | PRD 3.3; 14.2 dòng 32. Phương án không chọn: giữ nút Lưu tùy ý (trạng thái sau G0). Cùng câu trả lời này cũng được hiểu là không đưa bốn tài liệu nguồn vào kho mã |
| QĐ-08 | Xét tuổi của ai? | **Do việc quy định.** Cưới hỏi: hạn năm xét tuổi nữ (cô dâu), cố định — chủ dự án xác nhận. Làm nhà: xét tuổi gia chủ, mặc định là nam; nhà không có nam gia chủ thì xét tuổi nữ gia chủ; có thêm phương án con trai trưởng và người được mượn tuổi — chọn sau khi tra cứu câu hỏi của chủ dự án "người không có chồng thì thế nào" | PRD 9.6; 14.2 dòng 33. Phương án không chọn: luôn bắt mượn tuổi một người nam (các bài đã tra không thống nhất: có bài nói xét luôn tuổi nữ gia chủ, có bài nói lấy tuổi con trai trưởng hoặc người nam trong họ — nên không lấy cách nào làm luật cứng); cho chọn giới tính tự do (trái tập tục mà chủ dự án muốn theo) |


## 17. Thay đổi so với các tài liệu nguồn

### 17.1 Bỏ hoặc thay khỏi v3.0 và PRD-FENGSHUI

| Nội dung | Xử lý | Lý do |
| --- | --- | --- |
| API REST, khóa API, giới hạn tần suất, SLA, Redis | Bỏ | Không có máy chủ |
| Skyfield chạy lúc phục vụ yêu cầu | Đổi thành công cụ ngoại tuyến sinh bảng | Giữ độ chính xác mà không cần máy chủ |
| Bảng múi giờ 7 mốc | Thay bằng `calendar_tz` và hai bảng `civil_tz` | Bảng cũ gộp hai khái niệm và sai nhiều mốc (6.3) |
| Công thức điểm 5 lớp có trọng số phần trăm | Bỏ; thay bằng dòng luật + chỉ số có điều kiện | Công thức không tính được (8.4) |
| Hard Gate Kim lâu, Hoang ốc, Tứ hành xung, Sát chủ | Bỏ; thay bằng bảng 8.3 | Luật tranh cãi hoặc không có nguồn; làm mất hết ngày của cả năm |
| Lớp ngũ hành thuần nạp âm | Hạ xuống thành một dòng bổ sung | Thô hơn engine Tứ trụ đang có |
| Xếp loại 3 mức | Thay bằng 6 mức, tên trung tính | Thiếu mức bình thường |
| "Băm dữ liệu trong RAM", Nghị định 13/2023 | Thay bằng nguyên tắc dữ liệu không rời máy; cập nhật căn cứ luật | 3.3 |
| Mã lỗi HTTP | Thay bằng cờ kết quả | Mục 11 |
| Quàn "48 giờ hoặc 72 giờ" | Thay bằng quy định đầy đủ theo cách bảo quản | 3.2 |
| "Gợi ý giờ mang tính thông tin" cho lịch mổ đã ấn định | Bỏ; việc y tế chỉ có thông tin lịch | 3.1, theo Đặc tả |
| "Bỏ qua lớp 2, 3 cho việc thường nhật để tối ưu hiệu năng" | Bỏ | Không có căn cứ |
| Trùng tang bật sẵn, bảng "Trùng/Cát" (PRD-FENGSHUI WF-03) | Ẩn mặc định, nhãn `DISPUTED` | 3.4 |
| HE-01 "Chọn giờ sinh mổ: top 3 khung giờ, Tứ trụ bổ khuyết"; HE-03 "top 2–3 ngày phẫu thuật" | Bỏ hẳn | Trái 3.1 |
| Văn khấn, đồ cúng, màu xe, tuổi mở hàng, hướng ngồi, khai quang, long mạch, "cắt tóc giải xui", "hóa giải" | Bỏ | Không có nguồn kiểm chứng; rủi ro mê tín trục lợi |
| "Phủ kín 100% nhu cầu", "chính thống", "Master Production", "Final" | Bỏ | Tuyên bố không kiểm chứng được |
| PDF, infographic, đồng bộ 1 chạm Google/Apple | Bỏ; giữ `.ics` | Cần tài khoản, trái 3.3 |
| Lỗi đánh máy: "Hỷ Shen", "Tài Shen", mã "IZ-01", "Thọ Tử" | Sửa: Hỷ thần, Tài thần, `BIZ_*`, Thụ tử | — |

Giữ lại từ v3.0 và PRD-FENGSHUI: ba tầng, nhãn tin cậy, phân nhóm việc PK-01 đến PK-05, ba tính chất bước `CHOSEN`/`FIXED`/`COMPUTED`, ràng buộc y tế, ý tưởng lộ trình nhiều bước, lịch nhiệt giờ, xuất `.ics`.

### 17.2 Chỗ bản này lệch khỏi Đặc tả

| Đặc tả | Bản này | Lý do |
| --- | --- | --- |
| Cấm mọi điểm tổng hợp | Giữ chỉ số có 5 điều kiện | QĐ-01 (đã chốt); ứng dụng hiện có xoay quanh việc sắp xếp ngày |
| Ngoài phạm vi: luận giải bát tự | Dùng lá số để cá nhân hóa chọn ngày | QĐ-02 (đã chốt) |
| Ngày dính luật kỵ `CONSENSUS`: chỉ đánh dấu, người dùng bật bộ lọc để ẩn | Mặc định ẩn khỏi danh sách đề xuất (vẫn hiện trên lịch), người dùng tắt được | Giữ hành vi quen thuộc của ứng dụng; vẫn không ẩn ngầm vì luôn hiện lý do |
| API HTTP ba endpoint; ứng dụng di động | Ba hàm nội bộ (4.5); chỉ web | Không có máy chủ |
| Đào giếng, nhập học thuộc việc tùy chỉnh | Thêm `DAILY_WELL`, `DAILY_SCHOOL` | Từ khóa 掘井, 入学 có sẵn trong nguồn; v3.0 cũng yêu cầu đào giếng |
| 8 nhãn tin cậy | Thêm `HEURISTIC`, `UNVERIFIED` | Gọi đúng tên phần ứng dụng tự đặt và phần lấy từ 6tail |
| Use case làm trước: đi thi | G0 vá lỗi trước, đi thi ở G3 | Lỗi lịch làm sai mọi thứ phía trên |
| Ước lượng thời lượng 5 giai đoạn | Chưa ước lượng | Sẽ ước lượng khi lập kế hoạch G1 |

### 17.3 Đối chiếu với bản nháp V5.1

V5.1 tự ghi "Hoàn tất kiểm định toàn diện — Developer Ready", nhưng khi đối chiếu thì nó giữ nguyên các phần lỗi của v3.0 và tự mâu thuẫn ở nhiều chỗ; phần mới của nó chủ yếu là nội dung lấy từ Đặc tả (mục V, VI, VII) cùng khung yêu cầu ở VIII.3. Bản này nhận phần có giá trị và từ chối phần còn lại. Bảng dưới đã được rà lại theo từng mục I–IX của V5.1.

**Đã nhận vào bản này**

| Nội dung của V5.1 | Đưa vào |
| --- | --- |
| Ma trận nguồn → mục đích → tiêu chuẩn chấp nhận → nhãn (VI.2) | 7.6, đã sửa và thêm hai nhóm |
| Nhãn `LEGAL_LIMIT` | 2.1, 8.3 |
| Quy tắc với thuyết mang danh Khổng Minh; cấm dịch vụ mê tín; cấm bộ điểm tự gán (VI.4) | 7.7, 8.3 |
| Gom các ca ranh giới về một mục (V) | 6.6 |
| Mã bước cho chuỗi tang lễ và chuỗi Tết (IV.1) | 10.3, 10.4 |
| Khung đầu vào của yêu cầu đánh giá (VIII.3) | 4.5, đã sửa cho nhiều người và tách hai loại vùng |
| Mã băm SHA-256 cho bảng đóng băng | 5.3 |
| Căn cứ Thông tư 61/2006/TT-BVHTT cho số liệu Ban Lịch Nhà nước (II.2) | 6.1, ghi rõ chưa mở văn bản gốc |
| Bước "gắn nhãn tin cậy và rào chắn pháp lý trước khi phát hành" trong quy trình kiểm duyệt (VI.3, bước 5) | 7.4, bước 6 |
| Các nội dung V5.1 chép từ Đặc tả mà bản này đã có sẵn từ trước: bất biến (VII.1), ca kiểm thử lịch sử (VII.2), nguồn chuẩn (VI.1), use case đi thi (IV.6), tham số đầy tháng theo vùng (IV.4), xét tuổi riêng cô dâu và chú rể, mượn tuổi (IV.1) | 13.2, 13.3, 7.1, 9.4, 9.2, 9.3, 10.4 — không cần nhận thêm |
| Tách "engine xuất dòng luật" khỏi "chỉ số là lớp trình bày" (III.1) | Đã có ở 8.2–8.4; công thức của V5.1 giữ làm phương án C của QĐ-01 |

**Không nhận**

| Nội dung của V5.1 | Lý do |
| --- | --- |
| Bảng múi giờ lịch sử (II.2) | Vẫn là bảng sai của v3.0 (6.3); ngoài ra tự mâu thuẫn trong một dòng: ghi miền Nam dùng UTC+8 đến 30/04/1975 rồi lại ghi Sài Gòn đổi ngày 13/06/1975 |
| Công thức 5 lớp có trọng số (III.2) | Không tính được (8.4). Tự mâu thuẫn: III.1 cấm "cộng gộp điểm", VI.4 cấm "gán điểm sao không có thư tịch", nhưng III.2 gán +10 đến +20 và −15 đến −30 điểm mỗi sao |
| Hard Gate gồm Kim lâu, Hoang ốc, Tứ hành xung, Sát chủ, "Thọ Tử" (III.2) | Trái bảng 8.3. Tự mâu thuẫn: VI.2 xếp Kim lâu, Hoang ốc là `DISPUTED` "hiển thị trung tính" |
| API REST, khóa API, SLA 99,9%, Redis, giới hạn tần suất (VIII, IX) | Không có máy chủ (4.1) |
| "Chuỗi băm ẩn danh trong RAM", Nghị định 13/2023 (I.3) | 3.3; Nghị định 13 đã bị thay từ 01/01/2026 |
| Mã lỗi HTTP; `ERR_UNDERAGE_MARRIAGE` là "lỗi chặn" | Mục 11; tuổi kết hôn là cảnh báo cứng vì ngày xem có thể không phải ngày đăng ký |
| Dẫn cả Thông tư 04/2011 và Nghị định 282/2025 làm căn cứ cho khung giờ nhạc 06:00–22:00 (I.2) | Chỉ Thông tư 04/2011 quy định khung này; Nghị định 282 ngược lại bỏ khung giờ và phạt tiếng ồn ở mọi thời điểm (3.2) |
| Quàn "không quá 48 giờ; tối đa 7 ngày nếu ≤ 4°C" (I.2) | Thiếu trường hợp ≤ −10°C và điều kiện "không bảo quản lạnh" (3.2) |
| Y tế "ưu tiên sao Thiên Y"; "thông tin đối chiếu tập tục" cho lịch mổ (I.1, IV.4) | Trái 3.1: việc y tế không có dòng đánh giá nào |
| Xếp loại 3 mức `DAI_CAT`/`CAT`/`HUNG`; lịch nhiệt kèm hướng Hỷ thần, Tài thần (VIII.1) | 8.5; luật phương vị chưa kiểm nguồn (8.3) |
| "Bỏ qua lớp 2, 3 cho việc thường nhật để tăng tốc"; độ trễ < 50 ms | Không có căn cứ hiệu năng |
| `VOTIVE_CEREMONY` = khai quang vật phẩm; `ALTAR_SET` "tránh Không vong" | Ngoài phạm vi (1.3); không dẫn nguồn |
| "Tuyệt đối không gộp Động thổ và Cất nóc"; "tuyệt đối không nhóm" các mốc tang | Không dẫn nguồn; thứ tự và khoảng cách là tham số của chuỗi (10.1) |
| Trường `region` ba giá trị dùng chung | Gộp hai khái niệm (4.5) |
| Ngưỡng thiên văn "lệch ≤ 60 giây so với DE441" (VI.2) | Nguồn đối chiếu thực tế (tệp `TDBtimes.txt` của Yuk Tung Liu) tính bằng DE431 (13.1) |
| Các nấc trùng tang "Nhị Bộc, Tam Bộc, Nhị Nhật, Tam Nhật" (III.3) | Không dẫn nguồn; trùng tang là `DISPUTED`, ẩn mặc định, bảng tra chỉ đưa vào khi có sách (8.3) |
| Lược đồ phản hồi `summary` / `audit_layers` / `trust_metadata` (VIII.4) | Giống hệt v3.0: gắn điểm theo từng "lớp" và xếp loại 3 mức; đã thay bằng dòng kết quả luật ở 8.2 |
| "Core Rationale 3 câu tóm tắt" trên thẻ kết quả (VIII.1) | Thẻ ngày hiện các dòng luật nổi bật kèm nhãn (mục 11); không sinh câu tóm tắt tự do |
| Không có: engine lá số Tứ trụ (chỉ nhắc Bát tự một lần ở V.2), hiện trạng mã, lộ trình, quyết định mở, ký hiệu độ chắc chắn | V5.1 mô tả một hệ thống khác với ứng dụng đang có |
