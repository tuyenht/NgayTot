# Ngày Tốt — Chọn ngày giờ tốt theo Bát tự cá nhân

Ứng dụng web tĩnh, chạy hoàn toàn trên trình duyệt: không backend, không build, không cần `npm`.
Dữ liệu cá nhân không rời khỏi máy (hồ sơ lưu ở `localStorage`).

## Chạy

```powershell
# Cách 1 (khuyến nghị): server tĩnh
python -m http.server 5173 --bind 127.0.0.1
# mở http://127.0.0.1:5173

# Cách 2: mở trực tiếp file index.html
#   (chưa kiểm chứng: CSP script-src 'self' có thể chặn script trên file:// ở một số trình duyệt → dùng Cách 1)
```

Kiểm thử engine: `node tests/run-tests.mjs`

## Tính năng

- **Lá số Tứ trụ chính xác**
  - Trụ năm/tháng theo **thời điểm** tiết khí (có quy đổi múi giờ UTC+7 hoặc UTC+8).
  - Trụ ngày/giờ theo **giờ Mặt Trời thực** (kinh độ + phương trình thời gian).
  - Chọn phái đổi ngày ở giờ Tý (23:00 hoặc 00:00).
  - Hiển thị Thập thần, tàng can, Nạp âm, Đại vận.
- **Vượng suy và Dụng thần**
  - Định lượng lực ngũ hành, Phù ức, Điều hậu, cách Tòng.
  - Xếp vai trò Dụng / Hỷ / Nhàn / Cừu / Kỵ thần.
- **18 loại việc theo 5 nhóm + việc tùy chỉnh** (theo `docs/PRD-LICH-VIET-CORE-2026.md`)
  - Đại sự: dạm ngõ/ăn hỏi, cưới, an sàng, động thổ, cất nóc, nhập trạch, khánh thành, khâm liệm/di quan, an táng.
  - Kinh doanh: khai trương, ký hợp đồng, mua tài sản/xe, xuất hành.
  - Tâm linh: lập bàn thờ. Thường nhật: cắt tóc, gieo trồng.
  - Y tế (sinh mổ, phẫu thuật) và an táng: **chỉ xem thông tin cho đúng ngày giờ đã được ấn định**, không quét khoảng ngày, không gợi ý đổi ngày. Chỉ định của bác sĩ là quyết định duy nhất.
  - Việc tùy chỉnh: tự đặt tên, chọn ngũ hành của việc, mượn quy tắc 宜/忌 của một việc mẫu.
- **2 chế độ giờ**
  - Tìm giờ tốt nhất trong ngày (13 khung giờ, tách Tý sớm/Tý muộn).
  - Giờ cố định hằng ngày (chấm điểm đúng tại giờ đó).
- **Kết quả minh bạch**
  - Top 12 ngày đề xuất kèm heatmap lịch.
  - Mỗi điểm cộng/trừ đều ghi lý do; xem chi tiết 13 khung giờ.
  - Xuất file `.ics` và sao chép tóm tắt.

## Kiến trúc

```
index.html              Giao diện (CSP: script-src 'self')
css/styles.css          Design system
vendor/lunar.js         lunar-javascript v1.7.7 (MIT), nguồn Hoàng lịch 协纪辨方书
js/core/data.js         Can Chi, ngũ hành, hợp/xung/hình/hại, thần sát cá nhân, ngày kỵ VN
js/core/i18n-vi.js      Từ điển Hán → Việt (宜忌, thần sát, Trực, Tú, Nạp âm)
js/core/calendar-vn.js  Âm lịch VN theo thời kỳ (1912–2100) + giờ Mặt Trời thực
js/core/bazi.js         Lập lá số, vượng suy, Dụng thần, xử lý múi giờ đồng hồ & vùng miền
js/core/name-element.js Ngũ hành tên (Ngũ âm), hệ số phụ
js/core/activities.js   Quy tắc theo từng loại việc
js/core/legal.js        Giới hạn pháp luật Việt Nam (kết hôn, tiếng ồn, quàn/an táng)
js/core/scoring.js      Chấm điểm ngày/giờ, tìm ngày (Bảng quy chiếu 8.3)
js/ui/app.js            Điều khiển giao diện
tests/run-tests.mjs     Kiểm thử engine
```

## Quy tắc chấm điểm (Bảng quy chiếu 8.3)

| Nhóm | Yếu tố | Điểm (HEURISTIC) | Mức mặc định |
|---|---|---|---|
| Hoàng lịch | Mọi việc không nên (`诸事不宜`) | −25 | Kỵ nặng |
| | Ghi KỴ việc chính / việc liên quan | −22 / −10 | Kỵ việc chính: Kỵ nặng |
| | Ghi NÊN việc chính / việc liên quan | +14 / +8 | Thông tin |
| | Việc khác không nên làm (`馀事勿取`) | −6 | Thông tin |
| | Hoàng đạo / Hắc đạo | ±6 | Thông tin |
| | Trực hợp / Trực kỵ theo việc | +6 / −8 | Thông tin |
| | Cát thần chung (tối đa) / hợp việc (tối đa) | +9 / +8 | Thông tin |
| | Hung sát (tối đa −24); Nguyệt phá | theo sao | Nguyệt phá: Kỵ nặng |
| | Nhị thập bát tú | 0 (chờ điểm neo) | Thông tin |
| Dân gian VN | Tam nương / Nguyệt kỵ | −8 / −6 | Thông tin |
| | Dương công kỵ nhật (13 ngày) | 0 (chờ nguồn) | Thông tin |
| Bát tự | Xung chi tuổi (lục xung) | −16 | Kỵ nặng |
| | Thiên khắc địa xung năm sinh / Nhật trụ | −6 / −8 | Thông tin |
| | Xung Nhật chi / Nguyệt chi / Thời chi / Trụ năm | −10 / −4 / −3 / −8 | Thông tin |
| | Lục hợp / Tam hợp / Thiên can hợp Nhật chủ | +6 / +5 / +4 | Thông tin |
| | Tương hình / Lục hại | −5 / −4 | Thông tin |
| | Can, chi ngày theo Dụng/Hỷ/Cừu/Kỵ thần | fG × 4 / fZ × 3 | Thông tin |
| | Nạp âm ngày sinh/khắc Mệnh năm | +5 / +4 / +3 / −2 | Thông tin |
| | Thập thần hợp việc | +3 / +1 | Thông tin |
| | Quý nhân, Lộc, Văn Xương, Dịch Mã, Đào Hoa | theo việc | Thông tin |
| Hạn năm | Kim lâu, Hoang ốc, Tam tai (DISPUTED) | 0 | Thông tin (bật kiêng → Kỵ nặng) |
| Tên | Ngũ hành ngày so với ngũ hành tên (Ngũ âm) | 0 (bật: +3/+1.5/−3/−1/−0.5) | Thông tin (mặc định tắt) |
| Việc tùy chỉnh | Can ngày so với hành của việc (USER_DEFINED) | 0 | Thông tin riêng |

- **Điểm số tham khảo 0–100:** Điểm ngày = `clamp(50 + raw × 0.85, 0, 100)`. Điểm giờ = `clamp(50 + raw × 2.2, 0, 100)`. Tổng = 75% ngày + 25% giờ.
- **Không có loại cứng điểm = 0:** Giới hạn pháp luật là căn cứ duy nhất được phép loại hoặc cảnh báo cứng.
- **Kỵ nặng:** Ngày xung tuổi, Nguyệt phá, Hoàng lịch kỵ việc chính, hoặc "mọi việc không nên" (hoặc Kim lâu/Hoang ốc khi người dùng bật kiêng) được đánh dấu "Có điều kỵ nặng". Mặc định các ngày này được ẩn khỏi danh sách đề xuất; người dùng có thể tắt bộ lọc để hiển thị lại.
- **Việc cố định & Tang lễ:** Không hiện điểm và xếp loại, không gợi ý đổi ngày.

> Trạch nhật là tri thức văn hóa truyền thống, chưa có kiểm chứng khoa học. Kết quả chỉ để tham khảo.
