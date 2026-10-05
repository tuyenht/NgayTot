# Ngày Tốt — Tài liệu yêu cầu sản phẩm và đặc tả kỹ thuật

| | |
| --- | --- |
| Mã dự án | LICH-VIET-CORE-2026 |
| Phiên bản | 4.0 — thay thế toàn bộ bản 3.0 |
| Ngày cập nhật | 2026-10-05 |
| Chủ sở hữu | Hoàng Thanh Tuyền |
| Trạng thái | Bản hợp nhất, đã qua một lượt phản biện độc lập; chờ chốt 3 quyết định ở mục 16 |

Bản này hợp nhất ba tài liệu nguồn và đối chiếu với mã nguồn hiện có:

1. *PRD v3.0 "Master Production Edition"* (bản trước của chính tệp này), gọi tắt **v3.0**.
2. *Đặc tả hệ thống Lịch Việt chuẩn xác* (05/10/2026), gọi tắt **Đặc tả**.
3. *PRD Hệ thống xem ngày giờ đẹp & lộ trình phong thủy thông minh* (PRD-FENGSHUI-2026-FINAL), gọi tắt **PRD-FENGSHUI**.

Khi ba tài liệu mâu thuẫn, bản này chọn theo thứ tự: an toàn và pháp luật → kiểm chứng được → giữ được ưu thế của ứng dụng hiện có (chạy hoàn toàn trên trình duyệt, dữ liệu không rời máy). Mục 17 ghi rõ đã bỏ gì, lệch khỏi tài liệu nguồn ở đâu và vì sao.

**Ký hiệu độ chắc chắn:** **[KC]** đã kiểm chứng (qua nguồn hoặc bằng chạy mã; chỗ nào tự kiểm lại trong lần hợp nhất này thì ghi rõ), **[SL]** suy luận thiết kế, **[CK]** chưa kiểm — không được coi là đúng cho đến khi kiểm.

---

## 1. Mục tiêu và phạm vi

### 1.1 Sản phẩm

Ứng dụng web tĩnh giúp người Việt xem thông tin âm lịch và chọn ngày giờ cho một việc, cá nhân hóa theo lá số Tứ trụ (Bát tự) của người làm việc đó. Mọi kết luận hiển thị được lý do, nguồn và mức tin cậy; người dùng tự quyết.

### 1.2 Trong phạm vi

- Âm lịch Việt Nam (đổi dương ↔ âm cả hai chiều), can chi, tiết khí, giờ hoàng đạo.
- Lá số Tứ trụ: bốn trụ, Thập thần, vượng suy, Dụng thần — chỉ dùng để cá nhân hóa việc chọn ngày.
- Chọn ngày cho việc đơn lẻ (mục 9) và chuỗi nghi lễ nhiều bước: cưới hỏi, làm nhà, tang lễ và giỗ, Tết (mục 10).
- Xem thông tin cho ngày đã bị ấn định (thi cử, phỏng vấn, lịch hỏa táng).
- Xuất tệp `.ics`, sao chép tóm tắt.

### 1.3 Ngoài phạm vi

- Luận đoán vận mệnh, tử vi, bói toán; "hóa giải" hạn; dâng sao giải hạn.
- Chọn giờ sinh mổ; xem ngày tốt xấu cho lịch mổ, lịch điều trị; gợi ý dời ngày điều trị.
- Văn khấn, danh mục đồ cúng, màu xe hợp mệnh, tuổi mở hàng, khai quang vật phẩm, long mạch: không có nguồn kiểm chứng được.
- Máy chủ ứng dụng, tài khoản người dùng, API công khai (xem 4.1).
- Mô hình ngôn ngữ (AI) không tham gia bất kỳ phép tính nào và không được sinh hay sửa bảng tra.

### 1.4 Phạm vi năm

| Khoảng năm | Âm lịch | Lá số Tứ trụ |
| --- | --- | --- |
| 1929–2100 | Vùng cam kết chính xác, có dữ liệu chính thức để đối chiếu | Lập được |
| 1912–1928, 2101–2199 | Tính được, gắn cờ `OUT_OF_VERIFIED_RANGE` | Lập được, kèm cờ |
| Trước 1912 | Không tính; chỉ hiển thị nếu có bảng lịch cổ nhập vào | Lập được theo tiết khí, kèm cờ; tuổi âm lịch lấy theo Lập xuân và ghi rõ **[SL]** |

---

## 2. Nguyên tắc chất lượng

1. **Tách 3 tầng:** thiên văn (A) → lịch pháp quy ước (B) → luận tốt xấu (C). Tầng trên chỉ đọc kết quả tầng dưới, không tự tính lại.
2. **Mỗi giá trị đầu ra mang theo:** quy ước đã dùng, nguồn, nhãn tin cậy.
3. **Khi các nguồn bất đồng, hiển thị các phương án.** Không chọn ngầm.
4. **Mỗi luật một dòng kết quả.** Chỉ số tổng hợp (nếu có) là thứ cấp, phải tuân mục 8.4.
5. **Tầng A và B có đáp án đúng, kiểm chứng được.** Tầng C không có đáp án duy nhất; chất lượng của nó là truy được nguồn.
6. **Mọi thay đổi mã hoặc dữ liệu phải qua bộ kiểm thử chuẩn (golden test).** Không sửa kỳ vọng để kiểm thử đạt. Ngoại lệ duy nhất: kỳ vọng mã hóa một hành vi mà chính tài liệu này bãi bỏ; các ngoại lệ đó được liệt kê đích danh ở mục 13.4.
7. **Không gây hại:** ngôn ngữ trung tính, không dùng từ gây sợ; kết quả là tập tục tham khảo, không phải dự báo.

### 2.1 Nhãn tin cậy

| Nhãn | Ý nghĩa | Ví dụ |
| --- | --- | --- |
| `ASTRO` | Tính từ lịch thiên văn, sai số cỡ giây | Thời điểm sóc (trăng non), tiết khí |
| `CONVENTION` | Đúng theo một quy ước được nêu tên | Ngày âm theo UTC+7; cách chia giờ Tý |
| `CONSENSUS` | Các sách đồng thuận, công thức tự đếm lại được | Lục xung, lục hợp, tam hợp, giờ hoàng đạo |
| `SCHOOL_SPLIT` | Hai trường phái có công thức khác nhau | 12 thần trực nhật theo tháng tiết khí hay tháng âm; sinh khắc nạp âm |
| `VN_FOLK` | Tục dân gian Việt, công thức rõ nhưng không từ sách chọn ngày | Tam nương, Nguyệt kỵ, kiêng cưới tháng 7 |
| `DISPUTED` | Mỗi sách chép một khác | Kim lâu, Hoang ốc, Tam tai, trùng tang |
| `HEURISTIC` | Hệ số, ngưỡng do sản phẩm tự đặt, không có trong sách | Trọng số chỉ số tham khảo; định lượng lực ngũ hành; ngũ hành tên |
| `USER_DEFINED` | Luật người dùng tự đặt | Ngũ hành của việc tùy chỉnh |
| `UNVERIFIED` | Lấy từ thư viện đối chiếu, chưa kiểm với sách gốc | Nghi/kỵ, thần sát, Trực, Tú lấy từ 6tail |
| `BOUNDARY_RISK` | Sự kiện thiên văn sát nửa đêm, kết quả có thể lệch 1 ngày | Mục 5.3 |

`HEURISTIC` và `UNVERIFIED` là hai nhãn mới so với Đặc tả, thêm vào để gọi đúng tên những thứ ứng dụng đang làm.

---

## 3. Ràng buộc an toàn, pháp luật và riêng tư

Các ràng buộc ở mục này thắng mọi yêu cầu khác trong tài liệu.

### 3.1 Y tế

- **Lịch mổ, sinh mổ, thủ thuật, điều trị do bác sĩ chỉ định: không xem ngày.** Người dùng nhập ngày giờ đã ấn định; ứng dụng chỉ hiện thông tin lịch thuần (ngày âm, can chi, tiết khí) và câu cố định bên dưới. Không hiện dòng luật tốt xấu, không điểm, không xếp loại, không gợi ý giờ hay hướng, không quét khoảng ngày.
- Câu cố định: *"Chỉ định y khoa của bác sĩ chuyên khoa là quyết định duy nhất và tối cao."*
- Cấp cứu: không xem ngày.
- Khám định kỳ tự chọn được ngày: xử lý như việc thường, kèm dòng nhắc đây là tập tục.

Mục này theo Đặc tả, chặt hơn v3.0 (v3.0 cho "gợi ý giờ mang tính thông tin" sau khi nhập lịch mổ).

### 3.2 Giới hạn pháp luật

Giới hạn pháp luật là loại ràng buộc duy nhất được phép **loại** ngày giờ. Mỗi giới hạn lưu thành dữ liệu (`legal_limits`: tỉnh, giá trị, điều kiện, số văn bản, ngày hiệu lực), không viết cứng trong mã.

| Việc | Giới hạn | Căn cứ | Cách áp |
| --- | --- | --- | --- |
| Đăng ký kết hôn | Nam đủ 20 tuổi, nữ đủ 18 tuổi vào ngày đăng ký | Điều 8 Luật Hôn nhân và gia đình 2014 **[KC theo Đặc tả]** | Cảnh báo cứng; cần ngày sinh dương đầy đủ của cả hai |
| Quàn thi hài | Không quá 48 giờ từ khi mất nếu không bảo quản lạnh; không quá 7 ngày nếu bảo quản lạnh ≤ 4°C; dài hơn chỉ khi ≤ −10°C. Mất do dịch bệnh nguy hiểm: không quá 24 giờ kể từ khi mất hoặc phát hiện thi thể, trừ khi ≤ −10°C | Thông tư 21/2021/TT-BYT, Điều 4 và Điều 13 khoản 1 **[KC — đã đọc lại điều khoản]** | Hỏi cách bảo quản và nguyên nhân mất trước khi gợi ý giờ; loại giờ vượt hạn |
| Quy định tỉnh về tang lễ | Giới hạn hiệu lực = giới hạn chặt nhất giữa quốc gia và tỉnh. Ví dụ Huế: tối đa 72 giờ từ khi mất đến đưa tang; nếu không bảo quản lạnh thì vẫn bị chặn ở 48 giờ | Huế **[KC theo Đặc tả]**; Hà Nội (Quyết định 50/2026 và 93/2026) **[CK]** | Tra theo tỉnh |
| Cải táng | Không dưới 36 tháng sau mai táng (người không mất do dịch bệnh nguy hiểm) | Thông tư 21/2021/TT-BYT, Điều 9 khoản 1 **[KC — đã đọc lại điều khoản]** | Loại |
| Nhạc đám cưới, đám tang | Chỉ trong 06:00–22:00 | Thông tư 04/2011/TT-BVHTTDL, hợp nhất tại VBHN 5/2026 **[KC theo Đặc tả]** | Cảnh báo |
| Tiếng ồn | Từ 15/12/2025 hành vi gây ồn ào ở khu dân cư bị xử phạt ở mọi khung giờ (bỏ khung 22:00–06:00 của Nghị định 144/2021) | Nghị định 282/2025/NĐ-CP **[KC — đã đối chiếu qua trang công an tỉnh và báo pháp luật]** | Dòng nhắc chung |

"KC theo Đặc tả" nghĩa là lần hợp nhất này chưa mở lại văn bản. Trước khi phát hành tính năng tang lễ và cưới hỏi phải đối chiếu lại văn bản gốc còn hiệu lực.

**Ba mức áp dụng, dùng thống nhất trong toàn tài liệu:**

| Mức | Hành vi trên giao diện |
| --- | --- |
| **Loại** | Ngày hoặc giờ không chọn được, hiện mờ kèm lý do và số văn bản; không tắt được |
| **Cảnh báo cứng** | Không ẩn ngày; hiện biểu ngữ ở đầu kết quả và trên từng thẻ ngày, không tắt được, có trong bản sao chép và tệp `.ics` |
| **Cảnh báo** | Một dòng nhắc trên thẻ giờ hoặc ngày liên quan |

### 3.3 Riêng tư

- Mọi phép tính chạy trên thiết bị người dùng. Ứng dụng không gửi họ tên, ngày giờ sinh hay bất kỳ dữ liệu hồ sơ nào ra mạng.
- Không tải tài nguyên từ máy chủ bên thứ ba (phông chữ, script, phân tích truy cập): mỗi yêu cầu như vậy để lộ địa chỉ IP và thời điểm dùng. Phông chữ phải tự lưu trữ cùng trang. Chính sách CSP chỉ cho phép nguồn `'self'`.
- Chỉ lưu hồ sơ vào bộ nhớ trình duyệt (`localStorage`) khi người dùng chủ động bấm **Lưu**. Không tự lưu hồ sơ vừa nhập. Có nút **Xóa toàn bộ dữ liệu trên máy này**.
- Căn cứ pháp lý: Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 và Nghị định 356/2025/NĐ-CP, cùng có hiệu lực 01/01/2026; Nghị định 356 thay Nghị định 13/2023/NĐ-CP mà v3.0 dẫn **[KC — đã tra lại]**.

Bỏ khỏi v3.0: yêu cầu "xử lý dạng chuỗi băm trong RAM cache". Không thể tính lá số từ một chuỗi băm, và băm ngày sinh không phải là ẩn danh hóa (không gian giá trị quá nhỏ). Cách bảo vệ đúng là không để dữ liệu rời máy.

### 3.4 Ngôn ngữ và nội dung nhạy cảm

- Phân hệ tang lễ dùng từ trung tính, không dùng "xấu", "hung", "phạm"; không hiện chỉ số và xếp loại.
- Trùng tang, trùng phục, hướng huyệt: nhãn `DISPUTED`, **tắt mặc định và không hiển thị**, chỉ hiện khi gia đình chủ động bật, kèm ghi chú về dị bản. Lý do: gây sợ hãi khi gia đình đang đau buồn và dễ bị lợi dụng trục lợi.
- Ngày xung tuổi trong chế độ ngày cố định chỉ hiện như thông tin.
- Mọi màn hình kết quả có dòng: *"Trạch nhật là tri thức văn hóa truyền thống, chưa có kiểm chứng khoa học. Kết quả chỉ để tham khảo."*

---

## 4. Kiến trúc

### 4.1 Hình thái triển khai

Web tĩnh: không máy chủ ứng dụng, không bước build bắt buộc, chạy được ngoại tuyến sau lần tải đầu (cần service worker — hiện chưa có).

```
Công cụ ngoại tuyến (máy của người phát triển)        Trình duyệt người dùng
┌──────────────────────────────────────────────┐      ┌───────────────────────────────┐
│ Tầng A: Skyfield + JPL DE440                 │      │ Đọc bảng day_facts theo năm   │
│   → astro_events (sóc, tiết khí; UTC)        │      │ Tầng C: tra luật + Bát tự     │
│ Tầng B: quy tắc lịch + calendar_tz           │ ───► │ Giao diện, .ics               │
│   → day_facts/<năm>.json (đóng băng, có hash)│      │ Không gọi mạng với dữ liệu    │
│ Golden test, đối chiếu Hồng Kông / 6tail     │      │ cá nhân                       │
└──────────────────────────────────────────────┘      └───────────────────────────────┘
```

Đây là điểm v3.0 và phản hồi của Antigravity đều hiểu lệch: dùng Skyfield **không** đòi hỏi máy chủ. Đặc tả yêu cầu tầng A và B được *tính trước rồi đóng băng*; trình duyệt chỉ đọc bảng. Độ chính xác thiên văn và kiến trúc tĩnh không loại trừ nhau.

Bỏ khỏi v3.0: endpoint `POST /api/v3/fengshui/evaluate`, `x-api-key`, giới hạn 50 yêu cầu/phút/IP, cam kết 99,9% thời gian hoạt động, Redis, nạp DE440 vào RAM. Không có máy chủ thì các yêu cầu này không có đối tượng áp dụng.

### 4.2 Trạng thái chuyển tiếp

Cho đến khi có bảng đóng băng (giai đoạn G1–G2, mục 15), tầng A và B tiếp tục dùng thuật toán đang có trong `js/core/calendar-vn.js` (Hồ Ngọc Đức, công thức xấp xỉ Meeus) và `vendor/lunar.js` (6tail, tính theo UTC+8), với các lỗi đã biết ở mục 14 phải vá trước.

### 4.3 Thành phần mã hiện có

| Tệp | Vai trò |
| --- | --- |
| `vendor/lunar.js` | lunar-javascript v1.7.7 (MIT): nghi/kỵ, thần sát, Trực, Tú, tiết khí theo UTC+8 |
| `js/core/calendar-vn.js` | Âm lịch Việt Nam, giờ Mặt Trời thực |
| `js/core/bazi.js` | Lá số, vượng suy, Dụng thần |
| `js/core/activities.js` | Hồ sơ việc |
| `js/core/scoring.js` | Chấm ngày giờ, tìm ngày |
| `js/core/data.js`, `i18n-vi.js`, `name-element.js` | Bảng tra, từ điển Hán–Việt, ngũ hành tên |
| `js/ui/app.js`, `index.html`, `css/styles.css` | Giao diện |
| `tests/run-tests.mjs` | Kiểm thử engine |

### 4.4 Mô hình dữ liệu đích

| Bảng | Khóa | Trường chính | Sinh từ |
| --- | --- | --- | --- |
| `astro_events` | `kind`, `seq`, `model_version` | `kind` = sóc hoặc tiết khí; `seq` = số thứ tự tuần trăng hoặc (năm, chỉ số tiết khí 0–23); `tt`; `utc`; `model_version` gồm lịch thiên văn, phiên bản Skyfield, mô hình ΔT | Tầng A |
| `lunar_months` | `calendar_tz`, `start_jdn` | `year`, `month`, `is_leap`, `length` 29 hoặc 30, can chi tháng âm | Tầng B |
| `day_facts` | `calendar_tz`, `jdn` | Ngày, tháng, năm âm, nhuận; can chi ngày, năm, tháng tiết khí và tháng âm; tiết khí trong ngày; `boundary_risk` | Tầng B |
| `official_overrides` | `calendar_tz`, `jdn` | Giá trị chính thức, nguồn, lý do lệch với phép tính | Nguồn chính thức |
| `rules` | `id` | Theo lược đồ 7.3 + bảng CSV | Tầng C |
| `activity_profiles` | `activity_id` | Luật áp dụng, mục nghi/kỵ, vai trò người, chế độ ngày | Tầng C |
| `event_chains`, `chain_steps` | `chain_id`, `step_id` | Mô hình bước ở 10.1 | Tầng C |
| `legal_limits` | `province`, `rule_id`, `valid_from` | Giá trị, điều kiện, số văn bản, `valid_to` | Văn bản pháp luật |
| `golden` | `case_id` | Đầu vào, kết quả kỳ vọng, nguồn kỳ vọng | Mục 13 |

`day_facts` xuất thành một tệp JSON mỗi năm cho 1912–2100. Giao diện chỉ đọc bảng, không tự tính lịch.

### 4.5 Giao diện lập trình nội bộ

Thay cho ba endpoint HTTP của Đặc tả, engine cung cấp ba hàm thuần (cùng đầu vào, cùng phiên bản dữ liệu thì cùng đầu ra):

| Hàm | Đầu vào | Đầu ra |
| --- | --- | --- |
| `dayFacts(date, opts)` | Ngày dương; `tz_profile`, `region`, các tham số quy ước ở 6.5 | Bản ghi `day_facts` + giờ hoàng đạo + cờ |
| `lunarToSolar(y, m, d, isLeap, opts)` | Ngày âm | Ngày dương, hoặc lỗi "ngày không tồn tại" (ví dụ ngày 30 của tháng thiếu, tháng nhuận không có trong năm đó) |
| `evaluate(request)` | Một ngày hoặc khoảng ngày hoặc chuỗi; việc; từng người gồm vai trò, ngày sinh, `region`, giới tính; tỉnh | Danh sách dòng kết quả luật (8.2), kèm `engine_version` và `data_hash` |

---

## 5. Tầng A — Lõi thiên văn

### 5.1 Định nghĩa

- **Sóc:** thời điểm kinh độ hoàng đạo biểu kiến của Mặt Trăng bằng của Mặt Trời.
- **Tiết khí:** thời điểm kinh độ biểu kiến Mặt Trời là bội số của 15°. Tính từ Xuân phân là 0: chỉ số chẵn là trung khí, lẻ là tiết **[KC]**.
- Tầng A không biết gì về múi giờ hay âm lịch; chỉ trả thời điểm UTC và TT, độ phân giải 1 giây, kèm phiên bản lịch thiên văn, phiên bản Skyfield và mô hình ΔT. Đổi mô hình ΔT thì tính lại và so khác biệt.

### 5.2 Lựa chọn công cụ

| Phương án | Đánh giá | Vai trò |
| --- | --- | --- |
| Skyfield + DE440 | Lệch so với DE431 tối đa khoảng 0,81 giây ở 24 tiết khí **[KC]** | Lõi chính, chạy ngoại tuyến để sinh bảng |
| Thuật toán Hồ Ngọc Đức (Meeus) | Ra "mùng 0" ở 07/05/2054 và 09/04/2062 — **đã tái hiện bằng mã của dự án** **[KC]** | Tạm dùng lúc chạy; về sau chỉ để đối chiếu |
| 6tail/lunar | Hiệu chỉnh theo lịch Thọ Tinh, mặc định UTC+8 **[KC]** | Đối chiếu độc lập thứ hai |

### 5.3 Quy trình và cờ `BOUNDARY_RISK`

1. Tính trước toàn bộ sóc và tiết khí 1799–2200 vào bảng `astro_events`.
2. Đóng băng bảng bằng hash. Tầng trên chỉ đọc bảng này.
3. Chạy bộ máy đối chiếu thứ hai độc lập. Lệch quá 60 giây ở bất kỳ sự kiện nào thì dừng và điều tra **[SL]**.
4. **Cửa sổ rủi ro.** Một sự kiện mang cờ `BOUNDARY_RISK` khi khoảng cách từ nó đến 00:00 giờ lịch nhỏ hơn `max(10 phút, 3 × σ_ΔT(năm))`, với σ_ΔT là sai số ΔT đã công bố cho năm đó **[SL]**. Ngưỡng 10 phút và hệ số 3 là giá trị khởi đầu, hiệu chỉnh sau khi đo độ lệch thực ở G1. Giao diện hiển thị cả hai khả năng cho ngày mang cờ.
5. Bảng `official_overrides` ghi kết quả của nguồn chính thức kèm lý do, ưu tiên hơn kết quả tính. Ví dụ bắt buộc: Đại hàn 1979 rơi khoảng 6 giây trước nửa đêm UTC+8 trong khi Đài Hồng Kông và Đài Tử Kim Sơn ghi ngày hôm sau **[KC]**.
6. Độ tin cậy thấp cho 2150–2200 vì ΔT tương lai là ngoại suy **[SL]**.

---

## 6. Tầng B — Lịch pháp Việt Nam

### 6.1 Căn cứ

- Giờ chính thức là múi giờ thứ 7 (Quyết định 121-CP năm 1967, sửa bởi Quyết định 134/2002/QĐ-TTg) **[KC]**.
- Số liệu lịch chính thức do Ban Lịch Nhà nước cung cấp, chưa công bố dạng máy đọc được **[KC]**. Việc ưu tiên: xin hoặc mua bản số liệu này làm chuẩn cho UTC+7 **[SL]**.

### 6.2 Quy tắc dựng tháng **[KC]**

1. Ngày chứa thời điểm sóc (theo giờ của múi tính lịch) là mùng Một.
2. Tháng chứa Đông chí là tháng Mười Một.
3. Năm có 13 tháng giữa hai Đông chí: tháng nhuận là tháng đầu tiên sau tháng Mười Một không chứa trung khí.
4. Tháng nhuận mang số của tháng liền trước.

### 6.3 Hai loại múi giờ — không được gộp

v3.0 chỉ có một bảng và dùng nó cho cả hai mục đích; đó là lỗi khái niệm. Phải mô hình hóa hai trường riêng:

- `calendar_tz`: múi giờ dùng để **dựng âm lịch** (ngày nào là mùng Một, tháng nào nhuận).
- `civil_tz`: **giờ đồng hồ** tại nơi và thời điểm sinh, dùng để đổi giờ sinh ra UTC khi lập lá số.

**Bảng `calendar_tz`.** Mốc 1968 và 1976 theo Hồ Ngọc Đức — đã đọc lại trang nguồn: miền Bắc đổi giờ chính thức sang múi 7 từ 08/08/1967 và âm lịch tính theo múi 7 từ năm 1968; mốc 1912 và 1929 theo Yuk Tung Liu **[KC]**.

| Giai đoạn | Lịch đang dùng | `calendar_tz` |
| --- | --- | --- |
| Từ 1976 | Lịch Việt, cả nước | UTC+7 |
| 1968–1975 | Miền Bắc lịch Việt; miền Nam vẫn tính theo múi 8 | Bắc UTC+7, Nam UTC+8 — cần tham số `region` |
| 1929–1967 | Theo lịch Trung Quốc | UTC+8 |
| 1912–1928 | Theo lịch Trung Quốc | Kinh tuyến Bắc Kinh, UTC+7:45:40 (ngoài vùng cam kết) |
| Trước 1912 | Lịch nhà Thanh, lịch triều Nguyễn | Không tính **[CK]** |

**Bảng `civil_tz` — Sài Gòn** (cơ sở dữ liệu múi giờ IANA, vùng `Asia/Ho_Chi_Minh`; **đã đối chiếu từng mốc bằng dữ liệu ICU trong Node.js** **[KC]**):

| Từ (giờ địa phương) | Độ lệch |
| --- | --- |
| Trước 01/05/1911 | UTC+7:06:30 |
| 01/05/1911 | UTC+7 |
| 01/01/1943 | UTC+8 |
| 15/03/1945 | UTC+9 |
| 02/09/1945 | UTC+7 |
| 01/04/1947 | UTC+8 |
| 01/07/1955 | UTC+7 |
| 01/01/1960 | UTC+8 |
| 13/06/1975 | UTC+7 |

**Bảng `civil_tz` — Hà Nội** (IANA `Asia/Hanoi`; đã đọc tệp nguồn `backzone` của IANA **[KC]** — vùng này không có trong ICU nên không đối chiếu được bằng máy):

| Từ (giờ địa phương) | Độ lệch |
| --- | --- |
| Trước 01/07/1906 | UTC+7:03:24 (giờ địa phương) |
| 01/07/1906 | UTC+7:06:30 |
| 01/05/1911 | UTC+7 |
| 01/01/1943 | UTC+8 |
| 15/03/1945 | UTC+9 |
| 02/09/1945 | UTC+7 |
| 01/04/1947 | UTC+8 |
| Tháng 10/1954 (nguồn không ghi ngày) | UTC+7 |

Dữ liệu IANA mô tả giờ tại thành phố do bên kiểm soát thành phố áp dụng. Vùng kháng chiến 1947–1954 có thể dùng giờ khác **[CK]**; các tỉnh khác chưa có dữ liệu riêng. Vì vậy với người sinh 1943–1975, ứng dụng luôn hiện múi giờ đề xuất và cho sửa.

Bảng 7 mốc của v3.0 sai ở các điểm sau, không được dùng: 1929–1942 ghi UTC+8 (đúng là UTC+7 đến hết 1942); 1943–8/1945 ghi UTC+9 (đúng là UTC+8, chỉ UTC+9 từ 15/03/1945); bỏ sót giai đoạn UTC+8 từ 1947; miền Nam kết thúc UTC+8 ngày 30/04/1975 (đúng là 13/06/1975); trước 1911 ghi 7:06:40 (IANA ghi 7:06:30).

**Yêu cầu giao diện:** từ ngày sinh và `region` (`bac` | `nam` | `unknown`), ứng dụng đề xuất `civil_tz` và cho người dùng sửa. Nếu `unknown` và hai phương án cho lá số hoặc ngày âm khác nhau thì hiện cả hai.

### 6.4 Can chi

- **Ngày dương lịch và can chi của nó:** tính từ số ngày Julius; ngày lịch đổi lúc 00:00 giờ địa phương. Can chi của một ngày dương lịch không phụ thuộc múi giờ **[SL]**.
- **Trụ ngày của một thời điểm trong canh Tý (23:00–00:59):** phụ thuộc quy ước `ty_hour_split` ở 6.5 — đây là chuyện gán canh Tý cho ngày nào, không phải đổi ngày lịch.
- **Tháng theo tiết khí (nguyệt kiến):** đổi tại thời điểm của 12 tiết, Lập xuân mở tháng Dần **[KC]**. Dùng cho luật chọn ngày và trụ tháng. Với luật theo ngày, "ngày chứa tiết" xác định theo `calendar_tz`, không theo giờ Bắc Kinh **[SL]**.
- **Tháng theo tháng âm:** lịch in Việt Nam ghi can chi theo tháng âm, tháng Giêng là Dần **[SL]**. Lưu cả hai loại, không gộp.
- **Giờ:** 12 canh, mỗi canh 2 tiếng, canh Tý bắt đầu 23:00 **[KC]**.

### 6.5 Tham số quy ước

Mỗi quy ước là tham số có tên, không phải hằng số ẩn trong mã.

| Tham số | Mặc định | Phương án khác | Khi hai phương án khác nhau |
| --- | --- | --- | --- |
| `month_basis_12_gods` | Tháng tiết khí (Hiệp Kỷ Biện Phương Thư) **[KC]** | Tháng âm lịch (sách phong tục Tân Việt) **[KC]** | Hiển thị cả hai |
| `ty_hour_split` | Không chia: trọn canh Tý 23:00–00:59 thuộc ngày dương lịch mới (giờ 23:00–23:59 tính sang trụ ngày hôm sau) **[CK]** | Chia đôi: 23:00–23:59 thuộc ngày cũ, 00:00–00:59 thuộc ngày mới **[KC]** | Hiển thị cả hai; ảnh hưởng trụ ngày, can chi giờ, giờ hoàng đạo trong khung 23:00–24:00 |
| `lunar_month_canchi_leap` | Tháng nhuận không gán can chi riêng | Theo tháng trước, hoặc theo tiết khí | Ghi rõ quy ước **[CK]** |
| `age_year_boundary` | Tết Âm lịch (tuổi dân gian) | Lập xuân (trụ năm của lá số) | Hỏi người dùng khi sinh giữa hai mốc |
| `tz_profile` | Theo bảng lịch sử + `region` | Cố định UTC+7 hoặc UTC+8 | UTC+8 dùng cho kiểm thử |
| `true_solar_time` | Bật: trụ ngày, trụ giờ theo giờ Mặt Trời thực tại kinh độ nơi sinh | Tắt: theo giờ đồng hồ | Ghi độ lệch phút trên lá số |

Mặc định của `ty_hour_split` cần xác nhận với sách gốc trước khi chốt **[CK]**.

---

## 7. Tầng C — Cơ sở luật tốt xấu

Luật được lưu như dữ liệu có nguồn. Engine là bộ tra bảng thuần: cùng đầu vào luôn ra cùng kết quả, kèm mã luật. Bảng 8.3 là nơi duy nhất quy định mỗi luật mang nhãn gì và được xử lý ở mức nào.

### 7.1 Thứ tự ưu tiên nguồn

1. *Hiệp Kỷ Biện Phương Thư*, bản Tứ khố toàn thư **[KC]**.
2. *Ngọc Hạp Thông Thư*, *Đổng Công Tuyển Trạch Nhật Yếu Dụng* **[KC]**.
3. Phan Kế Bính, *Việt Nam phong tục*: cho biết thực hành của người Việt, không phải nguồn công thức.
4. 6tail, cnlunar, lichvang.com: chỉ để đối chiếu.

**Hiện trạng:** toàn bộ nghi/kỵ, thần sát, Trực, Tú của ứng dụng đang lấy thẳng từ 6tail (mức 4). Cho đến khi từng luật được kiểm với sách gốc, mọi dòng lấy từ 6tail mang nhãn `UNVERIFIED` và ghi nguồn "lunar-javascript (dựa trên Hiệp Kỷ Biện Phương Thư), chưa đối chiếu sách gốc".

### 7.2 Hai sửa đổi thuật ngữ so với v3.0 và PRD-FENGSHUI

- "Tứ hành xung" không phải tiêu chí loại ngày. Luật đúng là **lục xung** (hai chi đối nhau: Tý–Ngọ, Sửu–Mùi…). Trong một nhóm tứ hành xung có những cặp không xung nhau (Tý–Mão là hình). Mã hiện tại đã dùng lục xung, giữ nguyên.
- "Sát chủ" chưa tìm được nguồn đáng tin **[CK]** nên không là luật. Chú thích trong `scoring.js` đang gọi nhóm Nguyệt phá, Thụ tử, Đại hao, Vãng vong là "Sát chủ, Nguyệt phá" — nhầm tên, cần sửa.

### 7.3 Lược đồ một luật

```yaml
id: HD-12THAN-HK
ten: 12 thần trực nhật
nhan: SCHOOL_SPLIT
truong_phai: hiep_ky            # cặp với HD-12THAN-TV (theo tháng âm)
inputs: [chi_thang_tiet_khi, chi_ngay]
bang: "rules/hd_12than_hk.csv"
nguon:
  sach: Hiệp Kỷ Biện Phương Thư
  vi_tri: quyển 7, tr. 16–17
  ban_chup: https://archive.org/details/06056502.cn
  nguyen_van: "…"
  ban_dich: "…"
kiem_duyet: [nguoi_dich, nguoi_kiem]
vi_du_trong_sach:               # thành kiểm thử bắt buộc
  - {chi_thang: Dan, chi_ngay: Ty,  ket_qua: Thanh Long}
  - {chi_thang: Dan, chi_ngay: Suu, ket_qua: Minh Duong}
```

### 7.4 Quy trình thêm luật

1. Chép nguyên văn chữ Hán kèm ảnh chụp trang.
2. Người đọc được Hán văn dịch và lập bảng. AI chỉ hỗ trợ nháp.
3. Người thứ hai kiểm độc lập bảng so với nguyên văn.
4. Mọi ví dụ trong sách thành kiểm thử bắt buộc.
5. Đối chiếu với 6tail và lichvang; mỗi chỗ lệch phải giải thích được bằng trường phái hoặc quy ước.

### 7.5 Cơ chế nghi/kỵ

Sách gốc không ghi thẳng "ngày này tốt cho cưới". Mỗi ngày có các thần sát; mỗi thần sát quy định nghi hoặc kỵ một số việc; khi xung đột thì theo bảng thứ bậc **[CK]**. Tầng C cần hai bảng: thần sát theo ngày, và thần sát → việc nghi/kỵ.

### 7.6 Những điều cấm

- Luật mang nhãn `CONSENSUS` hoặc `SCHOOL_SPLIT` mà không có trường `nguon` hoặc thiếu người kiểm duyệt.
- AI sinh ra hoặc sửa bảng tra.
- Chỉ số tổng hợp không tuân năm điều kiện ở 8.4.
- Trình bày luật `UNVERIFIED`, `HEURISTIC`, `USER_DEFINED` như thể có nguồn sách.

---

## 8. Đánh giá ngày giờ

### 8.1 Cá nhân hóa theo Tứ trụ

Giữ nguyên engine hiện có: trụ năm và tháng theo thời điểm tiết khí; trụ ngày và giờ theo giờ Mặt Trời thực; vượng suy định lượng; Dụng thần theo Phù ức, có Điều hậu và cách Tòng. Phương pháp được quy cho các sách Tử Bình (Tử Bình Chân Thuyên, Trích Thiên Tủy, Cùng Thông Bảo Giám) theo mô tả trong ứng dụng **[CK — chưa đối chiếu sách]**; mọi con số định lượng là của sản phẩm.

- Sinh khắc **nạp âm** là dòng bổ sung, không thay thế phần Tứ trụ. v3.0 đề xuất lấy nạp âm làm lớp ngũ hành chính với thang "tương sinh +100, ngày khắc mệnh 0"; bỏ đề xuất này vì thô hơn engine đang có.
- Nhãn của từng loại dòng Bát tự nằm ở bảng 8.3.

### 8.2 Một dòng kết quả luật

```json
{
  "rule_id": "HD-12THAN-HK",
  "label": "SCHOOL_SPLIT",
  "level": "info",
  "value": "Thanh Long",
  "is_auspicious": true,
  "text": "Ngày Hoàng đạo (Thanh Long)",
  "person_role": null,
  "conventions": {"month_basis_12_gods": "solar_term"},
  "alternatives": [{"rule_id": "HD-12THAN-TV", "value": "…", "is_auspicious": false}],
  "source": {"book": "Hiệp Kỷ Biện Phương Thư", "at": "q.7 tr.16–17"},
  "flags": [],
  "weight": 6
}
```

- `level`: `exclude` | `hard_warning` | `warning` | `major_taboo` | `info` (xem 3.2 và 8.3).
- `alternatives` chỉ có khi phương án khác cho kết quả khác. `flags` rỗng là bình thường.
- `weight` chỉ có khi chỉ số tham khảo đang bật, và luôn là `HEURISTIC`.
- Phong bì kết quả của `evaluate` mang `engine_version` và `data_hash` một lần cho toàn bộ danh sách dòng.

### 8.3 Bảng luật: nhãn, mức, mặc định

Đây là bảng quy chiếu duy nhất. "Kỵ nặng" nghĩa là: mặc định không vào danh sách đề xuất nhưng vẫn hiện trên lịch kèm lý do; người dùng tắt được bộ lọc để đưa các ngày đó trở lại. "Thông tin" nghĩa là: hiện một dòng, không ẩn ngày.

| Luật | Nhãn | Mức mặc định | Góp vào chỉ số | Người dùng đổi được |
| --- | --- | --- | --- | --- |
| Giới hạn pháp luật (3.2) | — | Loại / Cảnh báo cứng / Cảnh báo | Không | Không |
| Thứ tự và khoảng cách giữa các bước trong chuỗi (mục 10) | — | Loại | Không | Qua tham số chuỗi |
| Chi ngày lục xung chi tuổi (từng người, theo vai trò) | `CONSENSUS` | Kỵ nặng | Có | Tắt bộ lọc |
| Chi ngày lục xung chi tháng tiết khí (Nguyệt phá) — tự đếm lại được từ lục xung **[SL]** | `CONSENSUS` | Kỵ nặng | Có | Tắt bộ lọc |
| Sách ghi kỵ đích danh việc đang xem; "mọi việc không nên" | `UNVERIFIED` cho đến khi kiểm sách | Kỵ nặng | Có | Tắt bộ lọc |
| Lục hợp, tam hợp, tương hình, lục hại giữa chi ngày và chi tuổi, chi ngày sinh | `CONSENSUS` | Thông tin | Có | — |
| Giờ hoàng đạo, hắc đạo theo chi ngày | `CONSENSUS` | Thông tin | Có | — |
| 12 thần trực nhật (ngày hoàng đạo, hắc đạo) | `SCHOOL_SPLIT` **[KC]** | Thông tin; hiện hai dòng khi hai phái khác nhau | Có (theo phái mặc định) | Đổi phái |
| Thập nhị trực | `SCHOOL_SPLIT` **[CK]** | Thông tin | Có | — |
| Sinh khắc nạp âm ngày với nạp âm năm sinh | `SCHOOL_SPLIT` **[CK]** | Thông tin | Có | — |
| Nghi/kỵ việc liên quan; cát thần, hung sát theo ngày (gồm Thụ tử, Đại hao, Vãng vong) | `UNVERIFIED` | Thông tin | Có | — |
| Nhị thập bát tú | `UNVERIFIED` — chờ điểm neo đã kiểm chứng **[KC]** | Thông tin | Không, cho đến khi có điểm neo | — |
| Thiên Ất quý nhân, Lộc, Văn xương, Dịch mã, Đào hoa theo lá số | `SCHOOL_SPLIT` **[CK — có dị bản bảng tra]** | Thông tin | Có | — |
| Can chi ngày là Dụng, Hỷ, Cừu, Kỵ thần; Thập thần hợp việc | `HEURISTIC` | Thông tin | Có | — |
| Tam nương, Nguyệt kỵ, kiêng cưới tháng 7 | `VN_FOLK` | Thông tin | Có | Tắt cả nhóm |
| Dương công kỵ nhật (13 ngày mỗi năm): tục dân gian gốc Trung Hoa, không thấy trong Hiệp Kỷ **[CK]**; bảng ngày trong `data.js` chưa ghi nguồn | `UNVERIFIED` | Thông tin | Không, cho đến khi có nguồn | Tắt |
| Kim lâu, Hoang ốc, Tam tai, cung phi bát trạch | `DISPUTED` | Thông tin: một thẻ theo năm, kèm dị bản | Không | Bật "Tôi muốn kiêng": khi đó thành Kỵ nặng do người dùng tự chọn |
| Trùng tang, trùng phục, hướng huyệt | `DISPUTED` | **Ẩn** | Không | Bật để hiện như Thông tin |
| Phương vị Hỷ thần, Tài thần; giờ xuất hành Lý Thuần Phong | Chưa xếp loại **[CK]** | **Ẩn** cho đến khi đối chiếu ít nhất hai sách | Không | — |
| Bất tương; sao tốt xấu theo tháng chưa có trang sách | Chờ nguồn | **Ẩn** | Không | — |
| Sát chủ; năm không có Lập xuân; năm chẵn lẻ; Kim xà thiết tỏa | Không đưa vào | — | — | — |
| Ngũ hành tên (Ngũ âm) | `HEURISTIC` | Thông tin, mặc định tắt | Không | Bật để hiện |
| Ngũ hành của việc tùy chỉnh | `USER_DEFINED` | Thông tin, tách riêng | Không | — |

Hệ quả: Kim lâu, Hoang ốc, Tam tai **không bao giờ tự làm mất hết ngày của cả một năm**. Thẻ thông tin theo năm nêu dị bản ("có ý kiến cho rằng Kim lâu chỉ áp cho làm nhà"; "với cưới hỏi chỉ xét tuổi cô dâu"; "Hoang ốc không áp cho cưới"). Với "mượn tuổi", mọi bước chuyển sang xét tuổi người được mượn và ghi rõ đang xét tuổi ai.

Bảng này thay cho câu của v3.0: *"Lớp 1 Hard Gate: Kim lâu, Hoang ốc, Tứ hành xung, Sát chủ → 0 điểm, loại ngay"*.

### 8.4 Chỉ số tham khảo 0–100

Đặc tả cấm điểm tổng hợp; v3.0 và ứng dụng hiện có xoay quanh nó. Bản này giữ chỉ số với năm điều kiện bắt buộc (quyết định QĐ-01, mục 16):

1. Gọi là **"chỉ số tham khảo"**, gắn nhãn `HEURISTIC`, có chú thích cố định: "Trọng số do ứng dụng đặt, không có trong sách".
2. Chỉ dùng để **sắp xếp** các ngày; mọi dòng luật góp vào chỉ số đều hiện kèm trọng số của nó.
3. Chỉ các luật có "Có" ở cột "Góp vào chỉ số" của bảng 8.3 mới góp.
4. Không hiện chỉ số và xếp loại cho việc ở chế độ ngày cố định và cho toàn bộ phân hệ tang lễ.
5. Người dùng chuyển được sang chế độ "không chỉ số": các ngày sắp theo (a) số dòng mức Kỵ nặng tăng dần, rồi (b) số dòng `is_auspicious = false` mang nhãn `CONSENSUS` hoặc `SCHOOL_SPLIT` tăng dần, rồi (c) ngày dương tăng dần. Tiêu chí này ghi rõ trên màn hình.

Bảng trọng số hiện hành nằm ở `README.md` và `js/core/scoring.js`; đó là nguồn duy nhất, PRD không chép lại. Công thức: điểm ngày = 50 + thô × 0,85; điểm giờ = 50 + thô × 2,2; tổng = 75% ngày + 25% giờ.

Bỏ khỏi v3.0: công thức "Tổng điểm = HardGate + Ngũ hành 30% + Trực 25% + Thần sát 25% + Giờ 20%". Công thức đó không tính được: Hard Gate không có thang điểm, bốn trọng số đã đủ 100%, và thang giờ có giá trị −50 trong khi tổng bị chặn ở 0–100.

### 8.5 Xếp loại

Sáu mức: Đại cát (≥ 80), Cát (≥ 68), Khá (≥ 55), Bình thường (≥ 40), Nên cân nhắc (< 40), và "Có điều kỵ nặng". v3.0 chỉ có `DAI_CAT | CAT | HUNG`, thiếu mức trung tính. Đã cập nhật ở G0 thay thế các nhãn cũ "Hung" và "Phạm kỵ" bằng ngôn ngữ trung tính theo 3.4.

### 8.6 Giờ

13 khung: 12 canh, riêng canh Tý tách Tý sớm (00:00–00:59) và Tý muộn (23:00–23:59). Mỗi khung có: can chi giờ, thần trực giờ, hoàng đạo hay hắc đạo, quan hệ với lá số.

---

## 9. Danh mục việc

Mỗi việc là một hồ sơ: ánh xạ sang mục nghi/kỵ nào, xét tuổi những ai, ngày có chọn được không. Phần ánh xạ là quyết định của sản phẩm, phải ghi rõ, không giả làm của sách.

### 9.1 Bốn chế độ ngày

| Chế độ | Khi nào | Ứng dụng làm gì |
| --- | --- | --- |
| Linh hoạt (`CHOSEN`) | Người dùng tự chọn được ngày | Tìm trong khoảng ngày theo bảng 8.3 |
| Cố định (`FIXED`) | Ngày do người khác định: thi, phỏng vấn, lịch lò hỏa táng | Hiện các dòng luật của ngày đó như thông tin; gợi ý giờ ra khỏi nhà trong khung an toàn (9.4); không chỉ số, không xếp loại |
| Cố định y tế (`FIXED_MEDICAL`) | Lịch mổ, sinh mổ, điều trị | Theo 3.1: chỉ thông tin lịch thuần và câu y khoa |
| Tính ra (`COMPUTED`) | Bước trong chuỗi, ngày suy từ một mốc | Tính và hiện, không đánh giá |

### 9.2 Bảng hồ sơ việc

"Từ khóa" là chuỗi nghi/kỵ **có thật trong từ vựng của `vendor/lunar.js`** (đã quét toàn bộ nghi/kỵ các ngày 2000–2040: 114 từ khóa **[KC]**). Chỉ được dùng các từ khóa trong từ vựng đó. Việc ánh xạ từ khóa sang mục dụng sự trong Hiệp Kỷ Biện Phương Thư còn phải đối chiếu **[CK]**. "Mã hiện có" trống nghĩa là chưa có trong `activities.js`.

**PK-01 — Đại sự (thuộc các chuỗi ở mục 10)**

| Mã | Việc | Từ khóa chính | Xét tuổi | Chế độ | Mã hiện có |
| --- | --- | --- | --- | --- | --- |
| `WED_ENGAGE` | Dạm ngõ, chạm ngõ | 纳采, 问名 | Cô dâu, chú rể | Linh hoạt | `wed_engage` (đang gộp với ăn hỏi) |
| `WED_BETROTHAL` | Ăn hỏi | 纳采, 订盟 | Cô dâu, chú rể | Linh hoạt | |
| `WED_MAIN` | Lễ cưới, đón dâu | 嫁娶 | Cô dâu, chú rể | Linh hoạt | `wed_main` |
| `WED_BED` | An sàng | 安床, 合帐 | Cô dâu, chú rể | Linh hoạt | `wed_bed` |
| `WED_RETURN` | Lại mặt | — (từ vựng có 归宁) | — | Tính ra | |
| `BUILD_EARTH` | Động thổ | 动土 | Chủ nhà hoặc người được mượn tuổi | Linh hoạt | `build_earth` |
| `BUILD_FOUND` | Khởi công, đổ móng | 起基, 定磉 | Như trên | Linh hoạt | |
| `BUILD_ROOF` | Đổ mái, cất nóc | 上梁, 盖屋, 合脊 | Như trên | Linh hoạt | `build_roof` |
| `BUILD_IN` | Nhập trạch (chuyển nhà là bí danh) | 入宅, 移徙 | Chủ nhà | Linh hoạt | `build_in` |
| `BUILD_OPEN` | Khánh thành | 祭祀, 祈福 — ánh xạ hiện đại | Chủ nhà | Linh hoạt | `build_open` |
| `BUILD_REPAIR` | Sửa nhà | 修造, 拆卸 | Chủ nhà | Linh hoạt | |
| `FUNERAL_MAIN` | Khâm liệm, nhập quan, thành phục, di quan | 入殓, 成服, 移柩 | Người mất, tang chủ | Linh hoạt trong giới hạn quàn | `funeral_main` |
| `FUNERAL_BURY` | An táng, hỏa táng | 安葬, 破土 | Như trên | Linh hoạt hoặc cố định theo lịch lò | `funeral_cremate` |
| `FUNERAL_REBURY` | Cải táng, xây sửa mộ | 启钻, 修坟, 立碑 | Tang chủ | Linh hoạt, ≥ 36 tháng | |

**PK-02 — Kinh doanh, sự nghiệp**

| Mã | Việc | Từ khóa chính | Xét tuổi | Chế độ | Mã hiện có |
| --- | --- | --- | --- | --- | --- |
| `BIZ_OPEN` | Khai trương, mở hàng | 开市 (phụ: 挂匾, 开仓, 纳财) | Người đứng tên | Linh hoạt | `biz_open` |
| `BIZ_SIGN` | Ký hợp đồng, giao dịch | 立券, 交易 (phụ: 订盟) | Người ký | Linh hoạt | `biz_sign` |
| `BUY_VEHICLE` | Mua xe | 交易, 纳财 — ánh xạ hiện đại, sách cổ không có mục riêng | Người đứng tên | Linh hoạt | `buy_asset` (đang gộp) |
| `BUY_PROPERTY` | Mua nhà, mua đất, đặt cọc | 置产, 立券, 交易 | Người đứng tên | Linh hoạt | `buy_asset` (đang gộp) |
| `TRAVEL` | Xuất hành, đi xa | 出行 | Người đi | Linh hoạt | `travel_biz` |
| `CAREER_FIXED` | Thi cử, phỏng vấn | Chưa có mục khớp; chỉ dùng luật theo tuổi | Người đi | Cố định | Chưa có |
| `CAREER_POST` | Nhậm chức | 赴任 | Người đi | Cố định hoặc linh hoạt | Chưa có |

**PK-03 — Thờ cúng**

| Mã | Việc | Từ khóa chính | Chế độ | Mã hiện có |
| --- | --- | --- | --- | --- |
| `ALTAR_SET` | Lập, chuyển bàn thờ; bốc bát hương | 安香 | Linh hoạt | `altar_set` |
| `ALTAR_PERIODIC` | Cúng Rằm, mùng Một, tất niên | 祭祀 | Ngày đã định theo lịch; chỉ gợi ý giờ | |
| `GRAVE_THANKS` | Lễ tạ đất, tạ mộ | 谢土, 祭祀 | Linh hoạt | |

**PK-04 — Y tế, con cái**

| Mã | Việc | Chế độ | Mã hiện có |
| --- | --- | --- | --- |
| `MED_SURGERY` | Phẫu thuật, thủ thuật, thẩm mỹ theo lịch bác sĩ | Cố định y tế (3.1) | `med_surgery` |
| `MED_BIRTH` | Sinh mổ theo lịch bác sĩ | Cố định y tế (3.1) | `med_birth` |
| `MED_CHECKUP` | Khám định kỳ tự chọn ngày (từ khóa 求医, 治病) | Linh hoạt | Chưa có |
| `BABY_FULLMONTH` | Đầy tháng, thôi nôi | Tính ra từ ngày sinh | |

Đầy tháng, thôi nôi: các nguồn mâu thuẫn **[KC]** — có nguồn tính theo âm lịch, có nguồn theo dương lịch; miền Bắc "trai lùi 1, gái lùi 2", miền Nam "nam trồi, nữ sụt", có nơi miền Trung giữ đúng ngày. Cần bộ tham số: loại lịch × độ lệch theo vùng và giới × cách xử lý tháng nhuận; hiện mọi phương án.

**PK-05 — Thường nhật**

| Mã | Việc | Từ khóa chính | Mã hiện có |
| --- | --- | --- | --- |
| `DAILY_HAIR` | Cắt tóc | 理发 | `daily_hair` |
| `DAILY_CROP` | Gieo hạt, trồng cây | 栽种, 牧养, 纳畜 | `daily_crop` |
| `DAILY_WELL` | Đào giếng | 掘井 | |
| `DAILY_SCHOOL` | Nhập học | 入学 | |

v3.0 ghi nhóm này "bỏ qua lớp 2 và 3 để tối ưu hiệu năng". Không có lý do hiệu năng; bỏ yêu cầu đó. Việc thường nhật vẫn xét đủ luật, chỉ không xét Thập thần.

**Việc tùy chỉnh.** Người dùng đặt tên việc rồi chọn một hoặc nhiều từ khóa nghi/kỵ gần nhất. Tùy chọn "ngũ hành của việc" không thấy trong các nguồn đã kiểm **[CK]**; nếu giữ thì là luật `USER_DEFINED` theo bảng 8.3, và phải nói rõ đang so với hành của can ngày.

### 9.3 Nhiều người trong một việc

Hồ sơ việc khai báo vai trò (cô dâu, chú rể, chủ nhà, tang chủ). Mỗi người được xét riêng và hiển thị theo tên vai trò (`person_role` trong 8.2). Không tự gộp: ngày xung tuổi một người được hiện rõ, người dùng tự quyết. Luật cần giới tính chỉ chạy khi có trường này.

### 9.4 Use case ngày cố định: đi thi

| Đầu vào | Bắt buộc | Ghi chú |
| --- | --- | --- |
| Ngày thi (một hoặc nhiều) | Có | Ngày dương lịch |
| Giờ phải có mặt | Có | Theo giấy báo |
| Thời gian di chuyển | Có | Phút |
| Đệm an toàn | Không | Mặc định 30 phút, sửa được **[SL]** |
| Năm sinh âm lịch hoặc ngày sinh dương | Có | Sinh 1968–1975 thì hỏi thêm `region` |

1. Chuẩn hóa tuổi: đổi ngày sinh ra năm âm lịch theo Tết; người sinh trước Tết thuộc năm âm lịch trước đó **[KC]**.
2. Dòng đầu luôn là: *"Ngày thi không đổi được. Kết quả dưới đây là tập tục tham khảo."*
3. Với mỗi ngày thi, hiện các dòng `CONSENSUS` giữa chi tuổi và chi ngày; 12 thần trực nhật theo cả hai trường phái (chỉ hiện hai dòng khi khác nhau).
4. Khung xuất hành = [giờ có mặt − di chuyển − đệm − 60 phút, giờ có mặt − di chuyển − đệm]. Gợi ý các canh giờ hoàng đạo giao với khung này **[SL]**.
5. Không có canh hoàng đạo nào rơi vào khung thì nói rõ: ưu tiên đến đúng giờ. Không bao giờ gợi ý giờ khiến người thi đến muộn.
6. Khung xuất hành cắt qua canh Tý thì hiển thị theo cả hai cách chia giờ Tý.
7. Hướng xuất hành chỉ hiện khi luật phương vị đã qua kiểm nguồn (bảng 8.3).
8. Mỗi dòng có nút xem nguồn và cách tự đếm lại.

---

## 10. Chuỗi nghi lễ nhiều bước

### 10.1 Mô hình một bước

| Trường | Ý nghĩa |
| --- | --- |
| `kind` | `CHOSEN` · `COMPUTED` · `FIXED` |
| `anchor` | Mốc tính: thời điểm mất, ngày an táng, ngày cưới |
| `offset` | Ví dụ +48 ngày, +12 tháng âm; luôn kèm quy ước đếm và loại lịch |
| `order` | Trước hay sau bước nào, cùng ngày hay khác ngày, khoảng cách tối thiểu và tối đa |
| `hour_required` | Có cần chọn giờ hay không |
| `persons` | Vai trò cần xét tuổi |
| `rule_sets` | Các bộ luật tập tục, mỗi bộ bật tắt được và mang nhãn |
| `legal_limits` | Giới hạn pháp luật theo tỉnh |

Bộ giải không tối ưu điểm. Nó lọc ngày giờ ứng viên theo ràng buộc cứng (pháp luật, thứ tự), rồi hiện luật tập tục từng dòng cho từng bước **[SL]**. Đổi một bước thì các bước tính từ nó tự tính lại. Bước của chuỗi dùng hồ sơ việc ở 9.2; bước nào chưa có hồ sơ thì ghi "chỉ có trong chuỗi" bên dưới.

### 10.2 Chuỗi cưới hỏi

Lục lễ cổ gồm sáu bước; người Việt đã rút còn ba lễ chính: chạm ngõ, ăn hỏi, cưới **[KC]**.

| Bước | Hồ sơ | Loại | Cần giờ | Ràng buộc |
| --- | --- | --- | --- | --- |
| Dạm ngõ | `WED_ENGAGE` | `CHOSEN` | Tùy chọn | Bước đầu |
| Ăn hỏi | `WED_BETROTHAL` | `CHOSEN` | Có, thường buổi sáng | Trước lễ cưới; có thể cùng ngày **[KC]** |
| Lễ cưới: xin dâu → rước dâu → lễ gia tiên → tiệc | `WED_MAIN` | `CHOSEN` | Có: giờ nhà trai xuất phát, giờ rước dâu | Cùng ngày, thứ tự cố định |
| An sàng | `WED_BED` | `CHOSEN` | Tùy chọn | Trước hoặc trong ngày cưới — tham số |
| Lại mặt | `WED_RETURN` | `COMPUTED` | Sáng | +2 hoặc +4 ngày, tham số theo vùng **[KC]** |

Khoảng cách ăn hỏi – cưới là tham số người dùng nhập. Luật tập tục theo bảng 8.3, với các điểm riêng: Kim lâu chỉ xét **cô dâu** (cách hóa giải dân gian "cưới sau Đông chí hoặc sau sinh nhật cô dâu" là tham số); gia đình có tang là tham số (49 ngày, 100 ngày hay đến 3 năm tùy nhà) **[KC]**. Pháp luật: tuổi kết hôn, khung giờ nhạc (3.2).

PRD-FENGSHUI ghi "không nhóm đón dâu và an sàng" và "cô dâu không phạm Kim lâu" như luật cứng; chưa có nguồn, chuyển thành tham số và thông tin.

### 10.3 Chuỗi tang lễ và giỗ

Hai pha: pha đầu chọn giờ trong vài ngày, bị pháp luật giới hạn thời gian quàn; pha sau gồm các ngày tính ra từ thời điểm mất, theo âm lịch **[KC]**. Trước khi gợi ý giờ phải hỏi: thời điểm mất, cách bảo quản, nguyên nhân mất có thuộc dịch bệnh nguy hiểm không, tỉnh.

| Bước | Loại | Mốc và công thức |
| --- | --- | --- |
| Khâm liệm, nhập quan | `CHOSEN` giờ | Trong giới hạn quàn **[KC]** |
| Thành phục, phát tang | `CHOSEN` | Sau nhập quan **[CK]** |
| Di quan, đưa tang | `CHOSEN` giờ | Trong giới hạn chặt nhất giữa quốc gia và tỉnh |
| An táng hoặc hỏa táng | `CHOSEN` giờ, hoặc `FIXED` theo lịch lò | Trong giới hạn quàn |
| Cúng 3 ngày (mở cửa mả) | `COMPUTED` | Từ ngày an táng **[CK]** |
| Các tuần 7 ngày, 49 ngày | `COMPUTED` | Phổ biến: ngày mất là ngày 1, nên 49 ngày = ngày mất + 48; có nơi tính từ ngày an táng **[KC]** — tham số `count_from` |
| 100 ngày | `COMPUTED` | Cách đếm chưa xác nhận **[CK]**; mặc định như 49 ngày |
| Giỗ đầu (tiểu tường) | `COMPUTED` | +12 tháng âm, tính cả tháng nhuận; có nơi lùi 1 ngày **[KC]** — hai quy ước |
| Giỗ hết (đại tường) | `COMPUTED` | +24 tháng âm **[KC]** |
| Đàm tế, trừ phục | `CHOSEN` | Khoảng 2–3 tháng sau giỗ hết, quanh tháng thứ 27 **[KC]** |
| Cải táng | `CHOSEN` | Không dưới 36 tháng sau mai táng |
| Giỗ hằng năm và tiên thường (hôm trước) | `COMPUTED` | Ngày mất theo âm lịch mỗi năm **[KC]** |

**Quy tắc tính ngày giỗ:**

- Mất trong tháng nhuận: giỗ thường niên vào tháng thường cùng số; giỗ đầu và giỗ hết vẫn đếm đủ 12 và 24 tháng thực **[KC]**.
- Năm có tháng nhuận xen giữa khiến giỗ đầu, giỗ hết đến sớm một tháng theo số tháng; các giỗ sau trở lại ngày gốc **[KC]**.
- Mất ngày 30 mà năm sau tháng đó chỉ có 29 ngày: mặc định ngày 29, là tham số **[CK]**.
- Mất trong khung 23:00–24:00: hỏi gia đình ngày đã ghi nhận.

Khuyến nghị (không phải ràng buộc): cúng 3 ngày, 7 ngày, 49 ngày, 100 ngày và giỗ nên làm trong ngày, trong phạm vi gia đình (Thông tư 04/2011) **[KC theo Đặc tả]**.

### 10.4 Chuỗi làm nhà và chuỗi Tết

| Chuỗi | Các bước theo thứ tự | Xét tuổi |
| --- | --- | --- |
| Làm nhà | Thẻ thông tin tuổi làm nhà và mượn tuổi (chỉ có trong chuỗi) → `BUILD_EARTH` → `BUILD_FOUND` → `BUILD_ROOF` → `BUILD_IN` (kèm `ALTAR_SET`, đặt bếp) → `BUILD_OPEN` | Chủ nhà, hoặc người được mượn tuổi |
| Tết | Giờ giao thừa (`COMPUTED`) → tuổi và giờ xông đất → giờ và hướng xuất hành đầu năm → `BIZ_OPEN` hoặc khai bút | Gia chủ và người xông đất |

Các bước Tết (xông đất, xuất hành đầu năm, khai bút) chỉ có trong chuỗi, chưa có luật có nguồn **[CK]**; hướng xuất hành phụ thuộc luật phương vị đang ẩn (bảng 8.3).

---

## 11. Đầu ra và giao diện

1. **Thẻ ngày:** ngày dương, ngày âm, can chi; các dòng luật nổi bật kèm nhãn; chỉ số tham khảo nếu được phép hiện.
2. **Lịch nhiệt theo khoảng ngày** và **bảng 13 khung giờ** của từng ngày.
3. **Chi tiết ngày:** toàn bộ dòng luật; mỗi dòng có nhãn tin cậy, nguồn và cách tự đếm lại.
4. **Lá số Tứ trụ:** bốn trụ, tàng can, Thập thần, nạp âm, Đại vận, lý do chọn Dụng thần, múi giờ và độ lệch giờ Mặt Trời thực đã dùng.
5. **Đổi lịch âm ↔ dương.**
6. **Xuất `.ics`** và **sao chép tóm tắt**. Không làm PDF, infographic, đồng bộ trực tiếp vào tài khoản Google hay Apple (cần đăng nhập, trái 3.3).
7. **Cờ kết quả** thay cho bảng mã lỗi HTTP của v3.0:

| Cờ | Ý nghĩa | Mức (3.2) |
| --- | --- | --- |
| `LEGAL_UNDERAGE_MARRIAGE` | Một trong hai người chưa đủ tuổi kết hôn vào ngày đang xem | Cảnh báo cứng |
| `LEGAL_BURIAL_TIME_EXCEEDED` | Giờ vượt giới hạn quàn | Loại |
| `LEGAL_REBURIAL_TOO_EARLY` | Chưa đủ 36 tháng | Loại |
| `LEGAL_NOISE_WINDOW` | Giờ tổ chức ngoài 06:00–22:00 | Cảnh báo |
| `MEDICAL_FIXED_ONLY` | Việc y tế: chỉ thông tin lịch | Chặn mọi đánh giá |
| `BOUNDARY_RISK` | Kết quả lịch có thể lệch 1 ngày | Hiện cả hai khả năng |
| `OUT_OF_VERIFIED_RANGE` | Năm ngoài 1929–2100 | Thông tin |

---

## 12. Yêu cầu phi chức năng

| Hạng mục | Yêu cầu | Hiện trạng đo được |
| --- | --- | --- |
| Hiệu năng | Quét 1 năm cho một việc: ≤ 1 giây trên máy tính, ≤ 3 giây trên điện thoại tầm trung | Node.js trên máy phát triển (Windows 11): 0,85–1,45 giây / 365 ngày (cache lạnh), < 50ms (cache nóng). Chưa đo trên điện thoại |
| Kích thước tải đầu | ≤ 800 KB | Khoảng 1,37 MB chưa kể phông chữ: `assets/hero.jpg` 782 KB, `vendor/lunar.js` 436 KB, phần còn lại khoảng 150 KB. Cần nén ảnh nền xuống ≤ 150 KB |
| Ngoại tuyến | Sau lần tải đầu, mọi tính năng chạy không cần mạng | Chưa có service worker; phông chữ tải từ Google |
| Tái lập | Mỗi kết quả mang `engine_version` và `data_hash` | Chưa có |
| Tiếp cận | Điều hướng được bằng bàn phím; màu không là kênh thông tin duy nhất của lịch nhiệt | Chưa kiểm |
| Bảo mật | CSP chỉ cho nguồn `'self'`; mọi chuỗi người dùng nhập đều được thoát ký tự trước khi chèn vào trang | `script-src 'self'` đã có; `style-src` và `font-src` còn cho Google |
| Tương thích | Hai phiên bản mới nhất của Chrome, Edge, Safari, Firefox | Chưa kiểm |

---

## 13. Kiểm thử và nghiệm thu

### 13.1 Tám lớp kiểm thử

| # | Lớp | So với | Ngưỡng đạt |
| --- | --- | --- | --- |
| 1 | Thiên văn | Thời điểm sóc, tiết khí của Yuk Tung Liu (DE441) **[KC]** | Lệch ≤ 60 giây ở mọi sự kiện **[SL]** |
| 2 | Quy tắc âm lịch | Bảng Đài Thiên văn Hồng Kông 1929–2100, chạy lõi ở UTC+8 **[KC]**. 1912–1928 chạy ở kinh tuyến Bắc Kinh, chấp nhận danh sách ngoại lệ | Khớp toàn bộ, hoặc chỗ lệch có trong `official_overrides` kèm lý do |
| 3 | Múi giờ Việt | Số liệu Ban Lịch Nhà nước khi có; trước đó: ngày Tết các năm, "Lịch Thế kỷ XX" (1968–2000), "556 năm đối chiếu", bảng Hồ Ngọc Đức | Khớp 100% số liệu Ban Lịch; với nguồn khác, mọi chỗ lệch có giải thích |
| 4 | Bất biến | Tự kiểm trên toàn bộ 1912–2100 | 0 vi phạm |
| 5 | Khác biệt độc lập | 6tail ở UTC+8; lichvang và Hồ Ngọc Đức ở UTC+7 | Mỗi chỗ lệch có nhãn nguyên nhân |
| 6 | Luật | Các ví dụ in trong sách gốc của từng luật | 100% |
| 7 | Hồ sơ việc | Mục 9 | Mọi từ khóa của mọi hồ sơ có trong từ vựng nguồn; mỗi việc có ít nhất một luật có nguồn; không việc nào chỉ dựa vào luật `HEURISTIC` hoặc `USER_DEFINED` |
| 8 | An toàn | Mục 3 | Việc y tế không trả dòng đánh giá nào; không yêu cầu mạng nào tới tên miền khác; hồ sơ không xuất hiện trong `localStorage` khi chưa bấm Lưu |

### 13.2 Bất biến bắt buộc

- Đổi dương → âm → dương ra đúng ngày cũ **[KC]**.
- Tháng Mười Một luôn chứa Đông chí.
- Tháng nhuận không chứa trung khí và là tháng đầu tiên như vậy sau tháng Mười Một.
- Mọi tháng dài 29 hoặc 30 ngày; không có "mùng 0".
- Can chi ngày tăng đúng 1 mỗi ngày, vòng 60.

### 13.3 Ca kiểm thử bắt buộc

| Ca | Kỳ vọng | Hiện trạng (đã chạy mã) |
| --- | --- | --- |
| Tết 1985 | Việt Nam 21/01, Trung Quốc 20/02 **[KC]** | Đạt |
| Tết 2007 | Hai lịch khác nhau **[KC]** | Đạt |
| Tháng nhuận 1984–1985 | Việt Nam và Trung Quốc khác nhau (theo Hồ Ngọc Đức **[CK]**) | Mã cho: Việt Nam không nhuận năm 1984, nhuận tháng 2 năm 1985. Chưa có đáp án tham chiếu độc lập |
| Năm 2033–2034 | Chọn tháng nhuận đúng ở cả UTC+7 và UTC+8; Yuk Tung Liu xếp 2033 là năm ngoại lệ **[KC]** | Mã cho nhuận tháng 11 năm 2033. Chưa có đáp án tham chiếu độc lập **[CK]** |
| Tháng chứa hai trung khí; năm có hơn một tháng không chứa trung khí | Theo quy tắc 6.2 | Chưa có ca |
| 07/05/2054 và 09/04/2062 | Không ra "mùng 0" | **Hỏng**: ra ngày 0 |
| Âm lịch 1929–1967 | Từng ngày khớp lịch tính ở UTC+8 | **Hỏng**: 510 trên 14.244 ngày lệch so với 6tail; ví dụ Tết 1935 mã cho 03/02 (đúng 04/02), Tết 1965 mã cho 01/02 (đúng 02/02) |
| 1968–1975 với cả hai `region` | Tết Mậu Thân: Bắc 29/01/1968, Nam 30/01/1968 | Chỉ có phương án Bắc |
| Đại hàn 1979 | Theo `official_overrides` | Chưa có ca |
| Toàn bộ ngày trong cửa sổ `BOUNDARY_RISK` | Sinh tự động từ `astro_events` | Chưa có |
| Tiết rơi 00:00–01:00 giờ Bắc Kinh | Nguyệt kiến và Trực của ngày theo giờ Việt Nam. Trong 2024–2040 có 5 tiết như vậy: Lập hạ 06/05/2031 00:35, Lập thu 08/08/2031 00:42, Hàn lộ 08/10/2036 00:49, Thanh minh 05/04/2038 00:29, Hàn lộ 08/10/2040 00:05 (giờ Bắc Kinh) | Chưa có ca; mã đang theo giờ Bắc Kinh |
| Lá số theo `civil_tz` | Sinh ở Sài Gòn năm 1950 và 1970 dùng UTC+8; sinh ở Hà Nội năm 1970 dùng UTC+7 | Chưa có ca |
| Từ khóa hồ sơ việc | Mọi từ khóa có trong từ vựng nguồn | **Hỏng**: 10 từ khóa không tồn tại (mục 14.2 dòng 7) |

### 13.4 Kỳ vọng kiểm thử phải đổi có chủ ý

Hai kỳ vọng trong `tests/run-tests.mjs` mã hóa hành vi mà tài liệu này bãi bỏ. Đổi chúng không vi phạm nguyên tắc 6 ở mục 2:

- "Động thổ năm phạm Kim lâu → không đề xuất ngày nào": bỏ, thay bằng kỳ vọng Kim lâu chỉ là dòng thông tin (bảng 8.3).
- "Phẫu thuật … có hướng Hỷ thần/Tài thần": bỏ, thay bằng kỳ vọng việc y tế không trả dòng đánh giá nào (3.1).

### 13.5 Quy tắc vận hành

Kiểm thử chuẩn đỏ thì không gộp mã. Mỗi năm đối chiếu lại với lịch in và ngày nghỉ Tết được công bố.

---

## 14. Hiện trạng mã nguồn so với đặc tả

Kiểm ngày 2026-10-05 trên nhánh `audit-g0`. Bộ kiểm thử engine đạt: 52/52 ca đạt chuẩn (100%).

### 14.1 Đã đáp ứng

- Chạy hoàn toàn trên trình duyệt; dữ liệu hồ sơ không được gửi đi đâu; CSP `default-src 'self'`, `connect-src 'none'`. Phông chữ tự lưu trữ hoàn toàn (woff2 cục bộ).
- Lá số theo thời điểm tiết khí và giờ Mặt Trời thực; chọn được cách chia giờ Tý.
- Mỗi cộng trừ điểm đều hiện lý do.
- Việc y tế và lịch an táng bị chặn quét khoảng ngày, có câu cảnh báo y khoa cố định, không lộ điểm hay xếp loại.
- Giới hạn pháp luật (tuổi kết hôn, tiếng ồn, quàn/an táng) được kiểm tra có hệ thống qua `legal.js`.
- 13 khung giờ, xuất `.ics`, sao chép tóm tắt.
- Dùng lục xung (không phải "tứ hành xung") cho xung tuổi.
- Đổi lịch 1912–2100 theo thời kỳ (`calendar_tz` và `civil_tz`), cờ ngoài vùng kiểm chứng `OUT_OF_VERIFIED_RANGE`.

### 14.2 Lỗi và khoảng cách (và tình trạng xử lý trong G0)

| # | Mức | Vấn đề | Tình trạng G0 | Hướng xử lý |
| --- | --- | --- | --- | --- |
| 1 | Cao | Âm lịch ra "mùng 0" ở 07/05/2054 và 09/04/2062 | **Đã sửa** | Vá thuật toán tìm sóc và kiểm thử bất biến 1912–2100 |
| 2 | Cao | Âm lịch dùng cố định UTC+7 cho mọi năm: lệch 1929–1967 và miền Nam 1968–1975 | **Đã sửa** | Áp dụng bảng `calendar_tz` theo vùng (`bac`/`nam`/`unknown`) |
| 3 | Cao | `getHistoricalTimezone` sai mốc | **Đã sửa** | Thay bằng `civil_tz` (IANA Asia/Ho_Chi_Minh + miền Bắc) |
| 4 | Cao | UI luôn gửi tz cứng 7/8; không có `region` | **Đã sửa** | Thêm chọn vùng (`f-region`), tự động đề xuất múi giờ theo thời kỳ |
| 5 | Cao | Kim lâu, Hoang ốc loại cả năm; áp cho cả nam khi xem cưới; phạt điểm | **Đã sửa** | Bảng 8.3: thông tin, không góp điểm; chỉ Kỵ nặng khi người dùng bật kiêng; nam xem cưới không bị phạt |
| 6 | Cao | Việc y tế lộ điểm, xếp loại ở 6 chỗ (hộp chi tiết, bảng giờ, .ics, sao chép, thống kê, lịch nhiệt) | **Đã sửa** | Ẩn hoàn toàn điểm, xếp loại, lịch nhiệt; dùng ngôn ngữ trung tính |
| 7 | Cao | 10 từ khóa nghi/kỵ không tồn tại trong `lunar.js` (chết) | **Đã sửa** | Làm sạch từ khóa chết (`立券交易`, `求财`, `买车`, v.v.); kiểm thử đối chiếu từ vựng |
| 8 | Cao | Trang tải phông chữ Google (N1) | **Đã sửa** | Tự lưu trữ Be Vietnam Pro & Noto Serif SC, siết chặt CSP |
| 9 | Vừa | Dương công kỵ nhật bị gán kỵ nặng / điểm 0; Thụ tử (`受死`) không tồn tại trong 6tail | **Đã sửa** | Dương công chuyển về thông tin không góp điểm; bỏ hoàn toàn nhánh `受死` |
| 10 | Vừa | Cờ kiểm tra pháp luật chưa có mã đọc | **Đã sửa** | Module `legal.js` (data-driven, `verified: false`) kiểm tra tuổi kết hôn, tiếng ồn, quàn thi hài |
| 11 | Vừa | Hồ sơ tự lưu vào `localStorage` mỗi lần lập lá số | **Đã sửa** | Chỉ lưu khi chủ động bấm Lưu; xóa key cũ; nút Xóa toàn bộ dữ liệu |
| 12 | Vừa | Tang lễ (`funeral_main`) cho quét dải ngày dài, hiện chữ "Hung" | **Đã sửa** | QĐ-04: chuyển sang cố định (`fixedOnly: true`), chỉ xem ngày giờ đã định, ngôn ngữ trung tính |
| 13 | Vừa | Thiếu việc nhậm chức, khám chữa bệnh tự chọn ngày | **Đã sửa** | Thêm `career_fixed` (cố định) và `med_checkup` (linh hoạt kèm nhắc nhở tập tục) |
| 14 | Vừa | Ngày chứa tiết lấy theo giờ Bắc Kinh (lệch khi tiết rơi 00:00–01:00 BK) | Tồn đọng (G2) | Xử lý khi có bảng `day_facts` đóng băng trong G2 |
| 15 | Vừa | Hướng Hỷ thần, Tài thần tính mà không dùng (chưa kiểm nguồn) | **Đã sửa** | Bỏ `posXi`, `posCai` khỏi kết quả tính giờ |
| 16 | Vừa | Chưa có cấu trúc `rule_id`, nhãn tin cậy, trích dẫn từng dòng kết quả | Tồn đọng (G3) | Triển khai trong G3 |
| 17 | Vừa | Điểm trái bảng 8.3: Tam tai, 28 tú, ngũ hành tên, ngũ hành việc tùy chỉnh | **Đã sửa** | Đưa về đúng Bảng 8.3 (0 điểm / tùy chọn bật) |
| 18 | Vừa | Năm sinh 1900–1911 và cờ ngoài vùng kiểm chứng | **Đã sửa** | Giới hạn 1912–2100; gắn cờ `OUT_OF_VERIFIED_RANGE` cho năm < 1929 |
| 19 | Vừa | Chưa có Service Worker ngoại tuyến (N10) | Tồn đọng | Cần thêm PWA/Service Worker ở giai đoạn tiếp theo |
| 20 | Thấp | Chú thích mã nhầm "Sát chủ" | **Đã sửa** | Sửa chú thích, dọn dẹp thuật ngữ v3.0 cũ |
| 21 | Thấp | Đổi âm → dương, chuỗi nhiều bước, nhiều người, chế độ không chỉ số | Tồn đọng (G2–G4) | Triển khai theo lộ trình G2–G4 |
| 22 | Thấp | Script tạm trong `scratch/` | Đã kiểm soát | Thư mục `scratch/` chỉ dùng làm môi trường kiểm thử cục bộ |

---

## 15. Lộ trình và rủi ro

### 15.1 Giai đoạn

Cổng kiểm thử giữa các giai đoạn chính là tiêu chí nghiệm thu.

| Giai đoạn | Nội dung | Cổng đạt |
| --- | --- | --- |
| **G0 — Vá lỗi đã kiểm chứng** | Mục 14.2 dòng 1–9, 10–13, 15, 17, 18, 20. Bảng quy chiếu 8.3, bảo mật phông cục bộ, lịch VN theo thời kỳ 1912–2100, kiểm soát pháp luật | **ĐÃ HOÀN THÀNH**: 52/52 kiểm thử đạt chuẩn 100% |
| **G1 — Lõi thiên văn đóng băng** | Công cụ Skyfield sinh `astro_events`; đối chiếu Yuk Tung Liu | Lớp 1 |
| **G2 — Lịch pháp Việt Nam** | Sinh `day_facts` theo `calendar_tz`; `official_overrides`; trình duyệt đọc bảng thay cho tính tại chỗ; đổi âm → dương; dòng 14 | Lớp 2, 3, 4, 5 |
| **G3 — Luật có nhãn và ngày cố định** | Dòng kết quả theo 8.2 (dòng 16); chế độ không chỉ số; use case đi thi đầy đủ (9.4) | Lớp 7, 8 |
| **G4 — Chuỗi nghi lễ** | Cưới hỏi, làm nhà, tang lễ và giỗ, Tết; `legal_limits` theo tỉnh; nhiều người | Kiểm thử chuỗi và giới hạn pháp luật |
| **G5 — Luật từ sách gốc (tùy chọn)** | Thay dần dữ liệu `UNVERIFIED` bằng bảng đã kiểm với Hán văn | Lớp 6 |

G0 đã hoàn thành xuất sắc toàn bộ mục tiêu đề ra, bảo đảm nền tảng lịch pháp và bảo mật riêng tư vững chắc trước khi tiến hành G1–G2.

### 15.2 Rủi ro còn lại

| Rủi ro | Ảnh hưởng | Giảm thiểu |
| --- | --- | --- |
| Không có chuẩn lịch quốc gia dạng máy đọc được | Phần UTC+7 chỉ kiểm chéo được | Kiểm lõi ở UTC+8 với Hồng Kông; đối chiếu ba nguồn Việt độc lập |
| Sự kiện thiên văn sát nửa đêm | Lệch một ngày âm lịch | Cờ `BOUNDARY_RISK`, hiển thị cả hai khả năng |
| Độ bất định ΔT sau 2100 | Sai số tăng dần | Chỉ cam kết 1929–2100 |
| Thiếu người đọc Hán văn | Tầng C chậm và dễ sai | AI chỉ làm nháp; bắt buộc hai người kiểm; G5 là tùy chọn |
| Múi giờ trước 1976 chưa chắc chắn | Ngày sinh âm và lá số của người lớn tuổi có thể sai | Hiện múi giờ đề xuất, cho sửa, trả cả hai kết quả khi khác nhau |
| Người dùng hiểu kết quả là dự báo | Lo lắng, quyết định sai | Dòng miễn trừ cố định; chỉ số mang nhãn `HEURISTIC`; không chỉ số ở việc nhạy cảm |
| Phụ thuộc 6tail cho toàn bộ nghi/kỵ | Sai của thư viện thành sai của ứng dụng | Nhãn `UNVERIFIED`; khóa phiên bản; G5 |

---

## 16. Quyết định cần chủ dự án chốt

| Mã | Câu hỏi | Bản này đang giả định | Yếu tố quyết định |
| --- | --- | --- | --- |
| QĐ-01 | Có giữ chỉ số 0–100 không? Đặc tả cấm; ứng dụng đang xoay quanh nó | Giữ, với 5 điều kiện ở 8.4 | Ưu tiên sự chặt chẽ (bỏ hẳn) hay khả năng sắp xếp nhanh cho người dùng (giữ có điều kiện) |
| QĐ-02 | Bát tự có thuộc phạm vi không? Đặc tả ghi "ngoài phạm vi: luận giải bát tự" | Có, giới hạn ở việc dùng lá số để cá nhân hóa chọn ngày; không luận đoán vận mệnh | Đây là mục tiêu gốc của ứng dụng |
| QĐ-03 | Có đầu tư G1–G2 (Skyfield, bảng đóng băng) hay dừng ở G0? | Có | Cần cam kết chính xác đến 2100 và cho người sinh trước 1976 đến mức nào |
| QĐ-04 | Chế độ chọn ngày cho tang lễ (funeral_main) trước G4? | Đã chọn: Cố định (fixedOnly: true), chỉ xem ngày giờ đã ấn định | Giới hạn quàn 24–48h theo luật y tế, tránh quét dải ngày dài gây sợ hãi hoặc vi phạm luật |

---

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
| Cấm mọi điểm tổng hợp | Giữ chỉ số có 5 điều kiện | QĐ-01; ứng dụng hiện có xoay quanh việc sắp xếp ngày |
| Ngoài phạm vi: luận giải bát tự | Dùng lá số để cá nhân hóa chọn ngày | QĐ-02 |
| Ngày dính luật kỵ `CONSENSUS`: chỉ đánh dấu, người dùng bật bộ lọc để ẩn | Mặc định ẩn khỏi danh sách đề xuất (vẫn hiện trên lịch), người dùng tắt được | Giữ hành vi quen thuộc của ứng dụng; vẫn không ẩn ngầm vì luôn hiện lý do |
| API HTTP ba endpoint; ứng dụng di động | Ba hàm nội bộ (4.5); chỉ web | Không có máy chủ |
| Đào giếng, nhập học thuộc việc tùy chỉnh | Thêm `DAILY_WELL`, `DAILY_SCHOOL` | Từ khóa 掘井, 入学 có sẵn trong nguồn; v3.0 cũng yêu cầu đào giếng |
| 8 nhãn tin cậy | Thêm `HEURISTIC`, `UNVERIFIED` | Gọi đúng tên phần ứng dụng tự đặt và phần lấy từ 6tail |
| Use case làm trước: đi thi | G0 vá lỗi trước, đi thi ở G3 | Lỗi lịch làm sai mọi thứ phía trên |
| Ước lượng thời lượng 5 giai đoạn | Chưa ước lượng | Phụ thuộc QĐ-03 |

---

## 18. Nguồn tham khảo

**Thiên văn và dữ liệu đối chiếu**

- [Skyfield — Almanac](https://rhodesmill.org/skyfield/almanac.html) · [Skyfield issue #1113 (tiết khí sát nửa đêm)](https://github.com/skyfielders/python-skyfield/issues/1113)
- [Yuk Tung Liu — Moon Phases and 24 Solar Terms](https://ytliu0.github.io/ChineseCalendar/docs/sunMoon.pdf) · [Rules of the Chinese calendar](https://ytliu0.github.io/ChineseCalendar/rules.html)
- [Đài Thiên văn Hồng Kông — bảng đổi lịch](https://www.hko.gov.hk/en/gts/time/conversion.htm) · [data.gov.hk (CSV, API)](https://data.gov.hk/en-data/dataset/hk-hko-rss-gregorian-lunar-calendar-conversion-table)
- [6tail/lunar-javascript](https://github.com/6tail/lunar-javascript) · [anhtuanMDev/lich-viet (lỗi "mùng 0")](https://github.com/anhtuanMDev/lich-viet)
- [Cơ sở dữ liệu múi giờ IANA — tệp `backzone` (vùng `Asia/Hanoi`)](https://github.com/eggert/tz/blob/main/backzone); vùng `Asia/Ho_Chi_Minh` trong tệp `asia`

**Lịch pháp Việt Nam**

- [Hồ Ngọc Đức — Âm lịch Việt Nam qua các thời kỳ](https://www.xemamlich.uhm.vn/histcal.html)
- [Quyết định 121-CP và 134/2002/QĐ-TTg](https://thuvienphapluat.vn/hoi-dap-phap-luat/viet-nam-nam-o-mui-gio-so-may-viec-lam-lich-duoc-nha-nuoc-quan-ly-dung-khong-138070493.html)
- [Nhân Dân — về Ban Lịch Nhà nước](https://nhandan.vn/chung-quanh-thong-tin-ve-ngay-am-lich-khac-nhau-tren-mot-so-loai-lich-post489744.html)

**Pháp luật**

- [Thông tư 21/2021/TT-BYT (Điều 4, 9, 13)](https://caselaw.vn/van-ban-phap-luat/401765-thong-tu-so-21-2021-tt-byt-ngay-26-11-2021-cua-bo-truong-bo-y-te-quy-dinh-ve-ve-sinh-trong-mai-tang-hoa-tang)
- [Thông tư 04/2011/TT-BVHTTDL](https://thuvienphapluat.vn/van-ban/van-hoa-xa-hoi/Thong-tu-04-2011-TT-BVHTTDL-Quy-dinh-thuc-hien-nep-song-van-minh-118569.aspx)
- [Nghị định 282/2025/NĐ-CP — bỏ khung thời gian về yên tĩnh chung](https://congan.hungyen.gov.vn/nghi-dinh-2822025nd-cp-tang-muc-phat-doi-voi-cac-hanh-vi-vi-pham-trat-tu-cong-cong-bo-khung-thoi-gian-trong-quy-dinh-hanh-vi-khong-bao-dam-su-yen-tinh-chung-c232375.html)
- [Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15](https://thuvienphapluat.vn/van-ban/Bo-may-hanh-chinh/Luat-Bao-ve-du-lieu-ca-nhan-2025-so-91-2025-QH15-625628.aspx) · [Bộ Công an — Luật có hiệu lực từ 01/01/2026](https://bocongan.gov.vn/chinh-sach-phap-luat/bai-viet/luat-bao-ve-du-lieu-ca-nhan-chinh-thuc-co-hieu-luc-thi-hanh-tu-ngay-01-01-2026-1767186124)
- [Độ tuổi kết hôn](https://thuvienphapluat.vn/chinh-sach-phap-luat-moi/vn/ho-tro-phap-luat/tu-van-phap-luat/42824/do-tuoi-ket-hon-theo-quy-dinh-phap-luat-hien-nay)
- [Huế: lễ tang không quá 72 giờ](https://vnexpress.net/hue-quy-dinh-le-tang-khong-qua-72-gio-5096919.html)

**Luật tốt xấu và phong tục**

- [Hiệp Kỷ Biện Phương Thư, bản Tứ khố toàn thư](https://archive.org/details/06056502.cn)
- [Lịch Vàng — nguồn gốc và cách tính](https://lichvang.com/nguon-goc-cach-tinh)
- [Giác Ngộ — mất vào tháng nhuận cúng giỗ tháng nào](https://giacngo.vn/mat-vao-thang-nhuan-cung-gio-thang-nao-post67771.html)
- [Tạp chí Nghiên cứu Phật học — trùng tang](https://tapchinghiencuuphathoc.vn/trung-tang-giai-trung-tang-trong-doi-song-van-hoa-ton-giao-cua-nguoi-viet.html)
- [VnExpress — Bộ Văn hóa đề nghị chấn chỉnh dâng sao giải hạn](https://vnexpress.net/bo-van-hoa-de-nghi-chan-chinh-viec-dang-sao-giai-han-3883419.html)

Danh sách nguồn đầy đủ nằm trong Đặc tả, mục 12.
