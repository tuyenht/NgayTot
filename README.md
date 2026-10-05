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
js/core/calendar-vn.js  Âm lịch VN UTC+7 (Hồ Ngọc Đức / Meeus) + giờ Mặt Trời thực
js/core/bazi.js         Lập lá số, vượng suy, Dụng thần
js/core/name-element.js Ngũ hành tên (Ngũ âm), hệ số phụ
js/core/activities.js   Quy tắc theo từng loại việc
js/core/scoring.js      Chấm điểm ngày/giờ, tìm ngày
js/ui/app.js            Điều khiển giao diện
tests/run-tests.mjs     Kiểm thử engine
```

## Quy tắc chấm điểm (tóm tắt)

| Nhóm | Yếu tố | Điểm |
|---|---|---|
| Hoàng lịch | Ghi NÊN việc chính / việc liên quan | +14 / +8 |
| | Ghi KỴ việc chính (kỵ nặng) / việc liên quan | −22 / −10 |
| | Hoàng đạo / Hắc đạo | ±6 |
| | Trực hợp / Trực kỵ theo việc | +6 / −8 |
| | Sao trong Nhị thập bát tú cát / hung | ±3 |
| | Cát thần chung (tối đa) / hợp việc (tối đa) | +9 / +8 |
| | Hung sát (Nguyệt phá là kỵ nặng), tối đa | −24 |
| Dân gian VN | Tam nương / Nguyệt kỵ / Dương công (kỵ nặng) | −8 / −6 / −12 |
| Bát tự | Xung tuổi (kỵ nặng) / xung Nhật chi | −16 / −10 |
| | Thiên khắc địa xung Nhật trụ (kỵ nặng) | −8 |
| | Hình / Hại / Lục hợp / Tam hợp | −5 / −4 / +6 / +5 |
| | Can, chi ngày theo Dụng/Kỵ thần | ±8 / ±6 |
| | Quý nhân, Lộc, Văn Xương, Dịch Mã, Đào Hoa | nhân hệ số theo việc |
| Hạn năm | Kim lâu / Hoang ốc / Tam tai | −6 / −6 / −4 |
| Tên | Ngũ hành ngày so với ngũ hành tên | ±3 |

- Điểm ngày = `50 + raw × 0.85`. Điểm giờ = `50 + raw × 2.2`. Tổng = 75% điểm ngày + 25% điểm giờ.
- Ngày có yếu tố **kỵ nặng** bị loại khỏi danh sách đề xuất, nhưng vẫn hiện trên heatmap.
- **Loại cứng (điểm ngày = 0):** năm phạm Kim lâu/Hoang ốc (với việc có xét), Hoàng lịch ghi kỵ việc chính hoặc "mọi việc không nên", ngày xung tuổi, Dương công kỵ nhật, ngày có Nguyệt phá/Thụ tử/Đại hao/Vãng vong. Tam nương và Nguyệt kỵ chỉ trừ điểm.
- Tùy chọn **"Bỏ qua hạn năm"** (đã mượn tuổi): Kim lâu/Hoang ốc chỉ còn trừ điểm, không loại cả năm.
- Nạp âm ngày so với mệnh năm: sinh +5/+4, hòa +3, ngày khắc mệnh −2.

> Trạch nhật là tri thức văn hóa truyền thống, chưa có kiểm chứng khoa học. Kết quả chỉ để tham khảo.
