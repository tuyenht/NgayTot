# MASTER TECHNICAL SPECIFICATION & PRODUCT REQUIREMENT DOCUMENT (PRD)
# Tên hệ thống: Hệ thống Lịch Việt Chuẩn xác & Lộ trình Phong thủy Thông minh
# Mã dự án: LICH-VIET-CORE-2026
# Phiên bản: 3.0 (Master Production Edition - Final Complete)
# Ngày tích hợp: 2026-10-05

## I. LEGAL, SAFETY & PRIVACY BOUNDARIES (RÀNG BUỘC PHÁP LÝ & BẢO MẬT)

### 1. Ràng buộc Y tế & Sinh mệnh
- **Chỉ định Y khoa:** Hệ thống không hỗ trợ tác vụ "chọn giờ sinh mổ" tự do. Mọi gợi ý giờ chỉ mang tính chất thông tin và chỉ hiển thị khi người dùng nhập lịch mổ đã được bác sĩ ấn định (Trạng thái sự kiện: FIXED).
- Tuyệt đối không gợi ý dời ngày phẫu thuật/điều trị bệnh.
- Bắt buộc hiển thị cảnh báo tĩnh: *"Chỉ định y khoa của bác sĩ chuyên khoa là quyết định duy nhất và tối cao"*.

### 2. Giới hạn Pháp lý Hành chính (Hard Legal Limits)
Bộ lọc ngày/giờ phải loại trừ cứng các kết quả vi phạm quy định hiện hành:
- **Hiếu sự (Tang lễ):** Bị chặn cứng bởi thời gian quàn xác (tối đa 48h, hoặc 72h tùy quy định của tỉnh/thành) và mốc cải táng (không dưới 36 tháng sau mai táng).
- **Hôn nhân:** Cảnh báo cứng nếu độ tuổi đăng ký kết hôn không đạt chuẩn (Nam đủ 20 tuổi, Nữ đủ 18 tuổi theo Luật Hôn nhân & Gia đình).
- **Quy định tiếng ồn:** Nhạc đám cưới/đám tang chỉ được gợi ý trong khung giờ 06:00 - 22:00. Các giờ tiệc/đưa tang ngoài khung này bị gắn cờ cảnh báo rủi ro vi phạm tiếng ồn đô thị.

### 3. Bảo mật Dữ liệu cá nhân (Nghị định 13/2023/NĐ-CP)
- **Nguyên tắc Không lưu trữ (Zero-PII Storage):** Hệ thống không thu thập hoặc lưu trữ Thông tin Nhận dạng Cá nhân (PII) như Họ tên, Ngày sinh thực tế, Địa chỉ IP trừ khi có cờ CONSENT_GRANTED tường minh.
- **Xử lý Dữ liệu Ẩn danh:** Mọi truy vấn tính toán theo bản mệnh chỉ được xử lý dạng chuỗi băm (hash) tạm thời trong RAM Cache / local client và tự động tiêu hủy sau khi trả về kết quả.

---

## II. KIẾN TRÚC LÕI HỆ THỐNG LỊCH (3 TẦNG ĐỘC LẬP)

Sự phân tách 3 tầng là bắt buộc để truy xuất nguồn và triệt tiêu sai số thiên văn:

### 1. Tầng A (Lõi Thiên văn - Astronomical Core)
- **Engine:** Skyfield engine kết hợp dữ liệu JPL DE440 (hoặc lunar astronomical calculation engine).
- **Nhiệm vụ:** Tính toán điểm Trăng non (Sóc) và 24 Tiết khí chuẩn UTC (`YYYY-MM-DDTHH:mm:ssZ`).
- **Cờ BOUNDARY_RISK:** Khi sự kiện thiên văn rơi cực sát ranh giới nửa đêm (23:00 - 01:00), hệ thống gắn cờ rủi ro và sử dụng bảng `official_overrides` để đối chiếu với công bố của các đài thiên văn quốc gia (như Đài Hồng Kông).

### 2. Tầng B (Quy ước Lịch pháp Việt Nam - Convention Layer)
- **Nhiệm vụ:** Chuyển đổi dữ liệu UTC sang lịch Âm Dương theo bảng offset múi giờ lịch sử Việt Nam:
  - Trước `1911-05-01`: UTC+07:06:40
  - `1911-05-01` đến `1928-12-31`: UTC+07:00
  - `1929-01-01` đến `1942-12-31`: UTC+08:00
  - `1943-01-01` đến `1945-08-08`: UTC+09:00
  - `1945-08-09` đến `1959-12-31`: UTC+07:00
  - `1960-01-01` đến `1975-04-30`: Yêu cầu tham số vùng miền (`region`): Miền Bắc dùng UTC+07:00 | Miền Nam dùng UTC+08:00
  - `1975-06-13` đến nay: UTC+07:00 (Thống nhất toàn quốc)

### 3. Tầng C (Engine Nguyên tắc Phong thủy - Rules Engine)
- Tra bảng thuần túy (Lookup Table) từ cổ thư: *Hiệp Kỷ Biện Phương Thư*, *Ngọc Hạp Thông Thư*.
- **Hệ thống Nhãn Tin cậy (Trust Labels):**
  - `ASTRO`: Dữ liệu thiên văn tuyệt đối.
  - `CONVENTION`: Quy ước lịch pháp nhà nước.
  - `CONSENSUS`: Các trường phái cổ thư đều thống nhất.
  - `SCHOOL_SPLIT`: Có sự bất đồng giữa các trường phái phong thủy.
  - `VN_FOLK`: Tín ngưỡng dân gian Việt Nam.
  - `DISPUTED`: Tranh cãi, thiếu đồng thuận khoa học/cổ thư.

---

## III. MA TRẬN ĐÁNH GIÁ 5 LỚP (5-LAYER SCORING ENGINE)

**Công thức tổng hợp điểm:**
$$\text{Tổng điểm Ngày} = \text{Điểm HardGate} + \text{Điểm Ngũ Hành} + \text{Điểm 12 Trực} + \text{Điểm 28 Sao \& Thần Sát} + \text{Điểm Giờ Hoàng Đạo}$$

1. **Lớp 1 (Hard Gate):** Kiểm tra Kim Lâu, Hoang Ốc, Tứ Hành Xung, Sát Chủ. Nếu vi phạm $\rightarrow$ Điểm HardGate = 0, xếp hạng `HUNG` và loại trừ ngay.
2. **Lớp 2 (Ngũ Hành & Nạp Âm - Trọng số 30%):** Tương sinh (+100đ), Tương hòa (+80đ), Bản mệnh khắc Ngày (+60đ), Ngày khắc Bản mệnh (0đ).
3. **Lớp 3 (Tiết Khí & 12 Trực - Trọng số 25%):** Đánh giá độ tương thích loại hình công việc với Trực ngày (VD: Trực Thành tốt cho Ký kết, Trực Phá tốt cho Phá dỡ).
4. **Lớp 4 (Thần Sát & Nhị Thập Bát Tú - Trọng số 25%):** Cộng điểm Cát tinh (Thiên Đức, Thiên Hỷ), trừ điểm Hung tinh (Tam Nương, Sát Chủ). Minh bạch nguồn gốc mã luật (`rule_id`) và tên cổ thư tra cứu.
5. **Lớp 5 (Giờ Hoàng Đạo - Trọng số 20%):** Phân rã 24h thành Heatmap màu sắc: Hoàng đạo (+100đ), Trung tính (+50đ), Hắc đạo (-50đ).

### * Cấu hình đặc biệt - Thuyết Trùng Tang:
- **Trạng thái mặc định:** Tắt (OFF) và gắn nhãn `DISPUTED`.
- **Logic:** Chỉ tính toán khi tang chủ chủ động bật cấu hình. Tra cứu Tuổi người mất, Ngày/Giờ/Tháng mất theo nấc: Trùng Tang Nhị Bộc, Tam Bộc, Nhị Nhật, Tam Nhật.

---

## IV. TAXONOMY PHÂN KHU NGHIỆP VỤ & LỘ TRÌNH ĐA BƯỚC

### 1. Danh mục Mã Tác Vụ (Task ID Taxonomy)

#### [PK-01] Chuỗi Đại Sự Đời Người (Multi-stage Workflows):
- **WF-01 (Hôn nhân):**
  - `WED_ENGAGE` (Dạm ngõ) - Tính chất: CHOSEN
  - `WED_BETROTHAL` (Ăn hỏi) - Tính chất: CHOSEN (Có thể nhóm với WED_ENGAGE)
  - `WED_MAIN` (Đón dâu/Cưới) - Tính chất: CHOSEN
  - `WED_BED` (An sàng) - Tính chất: CHOSEN
- **WF-02 (Xây nhà):**
  - `BUILD_EARTH` (Động thổ) - Tính chất: CHOSEN
  - `BUILD_ROOF` (Cất nóc) - Tính chất: CHOSEN
  - `BUILD_IN` (Nhập trạch) - Tính chất: CHOSEN
  - `BUILD_OPEN` (Khánh thành) - Tính chất: CHOSEN
- **WF-03 (Hiếu sự):**
  - `FUNERAL_DEATH` (Thời điểm mất) - Tính chất: FIXED
  - `FUNERAL_MAIN` (Khâm liệm/Di quan) - Tính chất: CHOSEN
  - `FUNERAL_CREMATE` (Lịch lò hỏa táng/An táng) - Tính chất: FIXED
  - `FUNERAL_3DAYS` (Cúng 3 ngày) - Tính chất: COMPUTED
  - `FUNERAL_49DAYS` (Cúng 49 ngày) - Tính chất: COMPUTED
  - `FUNERAL_100DAYS` (Cúng 100 ngày) - Tính chất: COMPUTED

#### [PK-02] Kinh doanh & Tài chính:
- `BIZ_OPEN` (Khai trương)
- `BIZ_SIGN` (Ký kết hợp đồng)
- `BUY_ASSET` (Mua tài sản lớn/Xe)
- `TRAVEL_BIZ` (Xuất hành kinh doanh)

#### [PK-03] Tâm linh & Thờ cúng:
- `ALTAR_SET` (Lập bàn thờ/Bốc bát hương)
- `ALTAR_INCENSE` (Cúng lễ định kỳ/Rằm/Mùng 1)
- `VOTIVE_CEREMONY` (Lễ tạ/Tạ mộ)

#### [PK-04] Y tế & Sức khỏe:
- `MED_BIRTH` (Sinh mổ - Yêu cầu nhập lịch bác sĩ chỉ định FIXED)
- `MED_SURGERY` (Phẫu thuật - Yêu cầu nhập lịch bác sĩ chỉ định FIXED)
- `BABY_FULLMONTH` (Cúng đầy tháng - Áp dụng lùi ngày theo giới tính/vùng miền)

#### [PK-05] Sinh hoạt Thường nhật (Bypass Lớp 2 & 3 để tối ưu hiệu năng):
- `DAILY_HAIR` (Cắt tóc)
- `DAILY_CROP` (Gieo hạt/Trồng cây)
- `DAILY_WELL` (Đào giếng/Khởi công nhỏ)

---

## V. ĐẦU RA SẢN PHẨM, MÃ LỖI & CẤU TRÚC API

### 1. Trải nghiệm Người dùng (UI/UX)
- **Summary Card:** Score (0-100), Status Badge (`DAI_CAT` | `CAT` | `HUNG`), Core Rationale (3 câu tóm tắt).
- **Heatmap 24h:** Thanh ngang 12 khung giờ (Xanh/Vàng/Đỏ) kèm Hướng Hỷ Thần và Tài Thần.
- **Export Calendar:** Nút bấm 1-click xuất file `.ics` đồng bộ Google Calendar/Apple Calendar.

### 2. Bảng Mã Lỗi Hệ Thống (System Error Codes)
- `ERR_HARD_GATE_FAILED` (400): Ngày vi phạm hạn nặng (Kim Lâu, Hoang Ốc, Sát Chủ).
- `ERR_UNDERAGE_MARRIAGE` (422): Độ tuổi kết hôn không đủ chuẩn pháp luật (Nam < 20, Nữ < 18).
- `ERR_NOISE_VIOLATION` (422): Khung giờ tổ chức sự kiện vi phạm quy định tiếng ồn (22:00 - 06:00).
- `ERR_MEDICAL_DIRECTIVE_REQUIRED` (400): Chọn giờ y tế không có lịch ấn định của bác sĩ.
- `ERR_BURIAL_TIME_EXCEEDED` (422): Thời gian quàn xác vượt quá 48h/72h theo luật hiện hành.

### 3. API JSON Schema Standard
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FengShuiEvaluationResult",
  "type": "object",
  "properties": {
    "disclaimer": { 
      "type": "string",
      "example": "Thông tin mang tính chất tham khảo. Chỉ định y khoa của bác sĩ là quyết định duy nhất và tối cao."
    },
    "summary": {
      "type": "object",
      "properties": {
        "overall_score": { "type": "integer", "minimum": 0, "maximum": 100 },
        "status_badge": { "type": "string", "enum": ["DAI_CAT", "CAT", "HUNG"] },
        "core_rationale": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["overall_score", "status_badge", "core_rationale"]
    },
    "audit_layers": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "score": { "type": "integer" },
          "rule_id": { "type": "string" },
          "label": { "type": "string", "example": "CONSENSUS" },
          "is_auspicious": { "type": "boolean" },
          "description": { "type": "string" },
          "alternatives": { "type": "array", "items": { "type": "string" } },
          "source": { "type": "string", "example": "Hiệp Kỷ Biện Phương Thư" }
        },
        "required": ["rule_id", "label", "is_auspicious", "source"]
      }
    },
    "trust_metadata": {
      "type": "object",
      "properties": {
        "labels": { "type": "array", "items": { "type": "string" } },
        "boundary_risk": { "type": "boolean" }
      },
      "required": ["labels", "boundary_risk"]
    }
  },
  "required": ["disclaimer", "summary", "audit_layers", "trust_metadata"]
}
```

---

## VI. NON-FUNCTIONAL REQUIREMENTS (NFR) & API SPECIFICATIONS

### 1. API Endpoint Standard
- Base URI: `POST /api/v3/fengshui/evaluate`
- Headers bắt buộc:
  - `x-api-key` (Xác thực client)
  - `x-consent-granted`: boolean (Bắt buộc = true nếu truyền PII vào payload theo yêu cầu Bảo mật Nghị định 13/2023/NĐ-CP).

### 2. Tiêu chuẩn Hiệu năng & SLA
- **Latency:** < 250ms cho tác vụ thông thường (PK-02 đến PK-05) và < 500ms cho Workflow phức tạp (PK-01).
- **Rate Limiting:** 50 requests/phút/IP để chống Abuse/Spam.
- **Availability:** 99.9% Uptime.

### 3. Chiến lược Caching
- **Ephemeris Data (JPL DE440 / Astronomical Engine):** Pre-loaded vào RAM khi khởi động service.
- **Sóc / Khí:** Cache TTL = 1 năm để triệt tiêu tải tính toán lặp.
