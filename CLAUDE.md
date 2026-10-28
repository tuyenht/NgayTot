# NgayTot — quy tắc cho các phiên làm việc

Chủ dự án thường chạy nhiều phiên song song trên dự án này. Các quy tắc dưới đây để các phiên không lẫn và không ghi đè việc của nhau (lập ngày 2026-10-28, sau khi một khối kiểm thử của phiên này bị cuốn vào commit của phiên khác).

## Làm song song

- **Thư mục chính `C:\Projects\NgayTot` (nhánh `audit-g0`) là nơi gộp.** Việc nào chạy song song với phiên khác thì làm trong một worktree riêng, mỗi việc một nhánh:
  `git worktree add C:\Projects\NgayTot-wt\<ten-viec> -b par-<ten-viec> audit-g0`
  Xong việc: chạy `node tests/run-tests.mjs` trong worktree, rồi gộp vào `audit-g0` từ thư mục chính và chạy lại kiểm thử sau khi gộp. Gỡ worktree khi đã gộp xong.
- **Trước khi sửa bất kỳ tệp nào trong thư mục chính, chạy `git status`.** Có thay đổi chưa commit không phải của mình thì không sửa và không commit chúng: tìm phiên đang làm bằng ListAgents rồi nhắn (SendMessage), hoặc hỏi chủ dự án.
- **Vùng chờ commit (index) của một thư mục làm việc là dùng chung giữa mọi phiên mở thư mục đó.** Tệp một phiên đã `git add` sẽ bị cuốn vào lệnh `git commit` của phiên khác (đã xảy ra hai lần ngày 2026-10-28: khối kiểm thử vào commit 093e4b8, tệp này vào commit 16ebcb1). Vì vậy trong thư mục chính chỉ phiên gộp được commit; các phiên khác commit trong worktree của mình (mỗi worktree có vùng chờ riêng). Khi buộc phải commit trong thư mục chính, dùng `git commit --only -- <đường dẫn>` để chỉ commit đúng các tệp đó.
- **Chỉ commit đúng tệp của mình:** `git add <đường dẫn cụ thể>`, xem `git diff --cached --stat` trước khi commit. Không dùng `git add .`, `git add -A`, `git commit -a`. Thông điệp commit nêu đủ mọi thứ có trong commit.
- **Báo trước khi đụng vào phần chung:** khi bắt đầu một việc song song, nhắn các phiên đang chạy trên dự án tên nhánh và các tệp mình định sửa.

## Tệp chỉ một phiên được sửa tại một thời điểm

- `docs/HIEN-TRANG.md`, `docs/QUYET-DINH.md`, `docs/PRD-LICH-VIET-CORE-2026.md`: số dòng của bảng 14.2 và số QĐ dễ trùng khi hai phiên cùng thêm. Chỉ phiên đang gộp cập nhật các tệp này, ở cuối đợt; phiên khác gửi nội dung cần ghi cho phiên gộp (tin nhắn, hoặc mô tả trong commit của nhánh).
- Tệp sinh tự động — `data/astro_events.json`, `data/astro_events.sha256`, `js/core/lunar-months.js`, `js/core/solar-terms.js`: không sửa tay; chỉ sinh lại bằng công cụ trong `tools/astro/`. Hai nhánh cùng đổi thì sau khi gộp sinh lại một lần, không gộp tay từng dòng.
- `tests/run-tests.mjs`: khối kiểm thử mới thêm ở cuối tệp, mỗi khối có chú thích nêu nguồn; khi gộp bị xung đột thì giữ cả hai khối.

## Quy tắc khác của dự án

Yêu cầu sản phẩm ở `docs/PRD-LICH-VIET-CORE-2026.md`, quyết định ở `docs/QUYET-DINH.md` (chỉ thêm dòng mới), tình trạng ở `docs/HIEN-TRANG.md` (theo quy tắc cập nhật ghi ở đầu tệp đó). Mọi thay đổi chạm vào cách tính ngày, giờ hoặc chấm điểm phải qua `node tests/run-tests.mjs`.
