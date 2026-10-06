/**
 * NgayTot — UI Controller cho Sổ Giỗ Gia Tiên (Nhắc ngày giỗ Âm lịch hàng năm).
 * 
 * Tính năng:
 *  - Cài đặt ngày giỗ Âm lịch 1 lần, tự động nhắc nhở hàng năm.
 *  - Mốc nhắc đa tầng: 14 ngày (họp gia đình), 7 ngày (chuẩn bị), 2 ngày (sắm lễ Tiên Thường), 0 ngày (Chính kỵ).
 *  - Checklist công việc theo từng giai đoạn chuẩn phong tục Việt Nam.
 *  - Đồng bộ 1-click sang Google Calendar / Apple Calendar qua file chuẩn RFC 5545 (.ics) có thông báo sớm.
 *  - Liên kết trực tiếp sang Kho Văn Khấn (tự động điền họ tên, ngày tháng cúng).
 *  - Lưu trữ 100% Offline-First trên IndexedDB, hỗ trợ sao lưu / phục hồi JSON.
 */
(function (NT) {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');

  let anniversariesList = [];
  let editingId = null;

  async function loadAnniversaries() {
    try {
      if (NT.idb && NT.idb.getAllAnniversaries) {
        anniversariesList = await NT.idb.getAllAnniversaries();
      }
    } catch (e) {
      console.warn('Lỗi đọc dữ liệu Sổ Giỗ từ IndexedDB:', e);
      anniversariesList = [];
    }
    renderAnniversaryList();
    NT.monthCalendarUI?.refreshAnniversaries?.();
  }

  function renderAnniversaryList() {
    const container = $('#anniversary-list');
    const badge = $('#anniversary-count-badge');
    const currentYear = new Date().getFullYear();

    if (!container) return;

    if (anniversariesList.length === 0) {
      if (badge) badge.textContent = '0 ngày giỗ';
      container.innerHTML = `
        <div class="empty-state full-col">
          <div class="big-han">孝</div>
          <p>Chưa có ngày giỗ nào được lưu trong Sổ Giỗ Gia Tiên.</p>
          <p class="hint">Cài đặt ngày giỗ một lần theo Âm lịch, hệ thống sẽ tự động tính đổi Dương lịch và nhắc nhở đa tầng hàng năm.</p>
          <button type="button" class="btn btn-primary" id="btn-empty-add-anniversary">
            ➕ Thêm ngày giỗ đầu tiên
          </button>
        </div>
      `;
      $('#btn-empty-add-anniversary')?.addEventListener('click', () => openEditModal());
      return;
    }

    if (badge) badge.textContent = `${anniversariesList.length} ngày giỗ`;

    // Tính toán mốc ngày giỗ tiếp theo cho từng mục
    // Một dòng dữ liệu hỏng không được làm mất cả danh sách
    const enriched = anniversariesList.flatMap(item => {
      try {
        return [{ item, calc: NT.anniversary.calculateAnniversaryReminders(item, new Date()) }];
      } catch (err) {
        console.warn(err);
        return [];
      }
    });

    // Sắp xếp theo số ngày còn lại (những ngày giỗ sắp tới gần nhất xếp lên đầu)
    enriched.sort((a, b) => a.calc.daysLeft - b.calc.daysLeft);

    container.innerHTML = enriched.map(({ item, calc }) => {
      const nextSol = calc.nextSolarDate;
      const solText = `${pad(nextSol.day || nextSol.solarDay)}/${pad(nextSol.month || nextSol.solarMonth)}/${nextSol.year || nextSol.solarYear}`;
      const isUrgent = calc.daysLeft <= 14;
      const isVeryUrgent = calc.daysLeft <= 2;

      let badgeClass = 'badge-days-left';
      if (calc.daysLeft === 0) badgeClass += ' today';
      else if (isVeryUrgent) badgeClass += ' urgent';
      else if (isUrgent) badgeClass += ' upcoming';

      const daysText = calc.daysLeft === 0
        ? 'Hôm nay (Chính Kỵ)'
        : (calc.daysLeft === 1 ? 'Ngày mai (Tiên Thường)' : `Còn ${calc.daysLeft} ngày`);

      const weekdayText = calc.weekday || calc.lunarDateObj?.weekday || '';

      return `
        <div class="anniversary-card ${isUrgent ? 'highlight' : ''}" data-id="${esc(item.id)}">
          <div class="anniversary-card-head">
            <div class="anniversary-identity">
              <span class="kinship-badge">${esc(item.relationship || 'Tổ tiên')}</span>
              <h3 class="deceased-name">${esc(item.deceasedName || item.name)}</h3>
            </div>
            <div class="${badgeClass}">
              ${daysText}
            </div>
          </div>

          <div class="anniversary-dates">
            <div class="date-row">
              <span class="label">Âm lịch:</span>
              <span class="val font-semibold">Ngày ${item.lunarDay} tháng ${item.lunarMonth} ÂL ${item.isLeapMonth ? '(tháng nhuận)' : ''}</span>
            </div>
            <div class="date-row">
              <span class="label">Lần giỗ tới (dương lịch):</span>
              <span class="val text-gold">${solText} ${weekdayText ? `(${weekdayText})` : ''}</span>
            </div>
            ${item.deathYear ? `
              <div class="date-row">
                <span class="label">Năm mất:</span>
                <span class="val">${item.deathYear} (${currentYear - item.deathYear} năm trước)</span>
              </div>
            ` : ''}
            ${(item.restingPlace || item.burialPlace) ? `
              <div class="date-row">
                <span class="label">Nơi an nghỉ:</span>
                <span class="val">${esc(item.restingPlace || item.burialPlace)}</span>
              </div>
            ` : ''}
          </div>

          <!-- Lộ trình nhắc nhở đa tầng -->
          <div class="reminders-timeline">
            ${(calc.reminders || calc.milestones || []).map(r => `
              <span class="timeline-step ${(r.passed || r.isTriggered) ? 'passed' : ''} ${(r.isToday || r.isCurrent) ? 'active' : ''}">
                <i class="dot"></i>
                <span class="step-label">${esc(r.label || r.shortLabel)}</span>
                <span class="step-date">${pad(r.solarDate?.day || r.notifyDate?.day)}/${pad(r.solarDate?.month || r.notifyDate?.month)}</span>
              </span>
            `).join('')}
          </div>

          <!-- Checklist việc cần chuẩn bị -->
          <details class="checklist-collapse">
            <summary class="checklist-summary">
              <span>📋 Việc cần chuẩn bị cho ngày giỗ (${(calc.checklist || []).length} việc)</span>
            </summary>
            <div class="checklist-items">
              ${(calc.checklist || []).map((c, idx) => `
                <label class="check checklist-item">
                  <input type="checkbox" data-anniv="${esc(item.id)}" data-idx="${idx}">
                  <span>${esc(c)}</span>
                </label>
              `).join('')}
            </div>
          </details>

          <!-- Action buttons -->
          <div class="anniversary-card-actions">
            <button type="button" class="btn btn-sm btn-primary btn-open-chinh-ky" data-id="${esc(item.id)}" title="Mở bài văn khấn cúng đúng ngày chính giỗ">
              🕯️ Khấn Chính Kỵ
            </button>
            <button type="button" class="btn btn-sm btn-secondary btn-open-tien-thuong" data-id="${esc(item.id)}" title="Mở bài văn khấn cúng chiều hôm trước ngày giỗ">
              🍵 Khấn Tiên Thường
            </button>
            <button type="button" class="btn btn-sm btn-ghost btn-export-single-ics" data-id="${esc(item.id)}" title="Thêm vào Google Calendar / Apple Calendar">
              📅 Xuất Lịch (.ics)
            </button>
            <button type="button" class="btn btn-sm btn-ghost btn-edit-anniv" data-id="${esc(item.id)}" title="Chỉnh sửa">
              ✏️ Sửa
            </button>
            <button type="button" class="btn btn-sm btn-ghost btn-delete-anniv" data-id="${esc(item.id)}" title="Xóa">
              🗑️
            </button>
          </div>
        </div>
      `;
    }).join('');

    bindListActions();
  }

  function bindListActions() {
    // 1. Mở văn khấn giỗ (Chính Kỵ và Tiên Thường) có tự điền đầy đủ 6 biến chuẩn
    const handleOpenPrayer = (btn, prayerId) => {
      const item = anniversariesList.find(a => a.id === btn.dataset.id);
      if (!item) return;

      if (NT.prayersUI && NT.prayersUI.openPrayerModal) {
        const otherAncestors = anniversariesList
          .filter(a => a.id !== item.id)
          .map(a => ({
            relationship: a.relationship,
            deceasedName: a.deceasedName
          }));

        NT.prayersUI.openPrayerModal(prayerId, 'text', {
          relationship: item.relationship || 'Cụ',
          deceasedName: item.deceasedName,
          burialPlace: item.restingPlace || '',
          lunarDay: item.lunarDay,
          lunarMonth: item.lunarMonth,
          lunarYearName: `${new Date().getFullYear()}`,
          invitedAncestors: otherAncestors,
          enablePersonalization: true
        });
      }
    };

    $$('.btn-open-chinh-ky').forEach(btn => {
      btn.addEventListener('click', () => handleOpenPrayer(btn, 'vk_gio_thuong'));
    });
    $$('.btn-open-tien-thuong').forEach(btn => {
      btn.addEventListener('click', () => handleOpenPrayer(btn, 'vk_tien_thuong'));
    });

    // 2. Xuất file .ics cho một ngày giỗ cụ thể
    $$('.btn-export-single-ics').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = anniversariesList.find(a => a.id === btn.dataset.id);
        if (!item) return;
        exportIcsFile([item], `Gio_${item.deceasedName.replace(/\s+/g, '_')}.ics`);
      });
    });

    // 3. Sửa ngày giỗ
    $$('.btn-edit-anniv').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = anniversariesList.find(a => a.id === btn.dataset.id);
        if (item) openEditModal(item);
      });
    });

    // 4. Xóa ngày giỗ
    $$('.btn-delete-anniv').forEach(btn => {
      btn.addEventListener('click', async () => {
        const item = anniversariesList.find(a => a.id === btn.dataset.id);
        if (!item) return;
        if (confirm(`Bạn có chắc chắn muốn xóa ngày giỗ của "${item.deceasedName}" không?`)) {
          if (NT.idb && NT.idb.deleteAnniversary) {
            await NT.idb.deleteAnniversary(item.id);
            await loadAnniversaries();
            if (typeof NT.toast === 'function') NT.toast(`Đã xóa ngày giỗ ${item.deceasedName}`);
          }
        }
      });
    });
  }

  function openEditModal(item = null) {
    editingId = item ? item.id : null;
    const dlg = $('#anniversary-dialog');
    if (!dlg) return;

    $('#anniv-dlg-title').textContent = item ? 'Chỉnh sửa ngày giỗ' : 'Thêm ngày giỗ mới';
    $('#anniv-name').value = item ? item.deceasedName : '';
    $('#anniv-rel').value = item ? item.relationship : 'Cụ';
    $('#anniv-lunar-day').value = item ? item.lunarDay : 15;
    $('#anniv-lunar-month').value = item ? item.lunarMonth : 1;
    $('#anniv-leap-month').checked = item ? !!item.isLeapMonth : false;
    $('#anniv-death-year').value = item && item.deathYear ? item.deathYear : '';
    $('#anniv-resting-place').value = item && item.restingPlace ? item.restingPlace : '';
    $('#anniv-notes').value = item && item.notes ? item.notes : '';

    dlg.showModal();
  }

  async function handleSaveAnniversary(e) {
    e.preventDefault();
    const name = $('#anniv-name').value.trim();
    if (!name) {
      alert('Vui lòng nhập họ và tên hoặc danh xưng người quá cố.');
      return;
    }

    const day = parseInt($('#anniv-lunar-day').value, 10);
    const month = parseInt($('#anniv-lunar-month').value, 10);
    const isLeap = $('#anniv-leap-month').checked;
    const deathYear = $('#anniv-death-year').value ? parseInt($('#anniv-death-year').value, 10) : null;

    const record = {
      id: editingId || (crypto.randomUUID ? crypto.randomUUID() : `anniv_${Date.now()}`),
      name: name,
      deceasedName: name,
      relationship: $('#anniv-rel').value.trim(),
      lunarDay: day,
      lunarMonth: month,
      isLeapMonth: isLeap,
      deathYear: deathYear,
      restingPlace: $('#anniv-resting-place').value.trim(),
      notes: $('#anniv-notes').value.trim(),
      remindDaysBefore: [14, 7, 2, 0],
      createdAt: editingId ? undefined : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (NT.idb && NT.idb.saveAnniversary) {
      await NT.idb.saveAnniversary(record);
    } else {
      // Memory fallback
      const idx = anniversariesList.findIndex(a => a.id === record.id);
      if (idx >= 0) anniversariesList[idx] = record;
      else anniversariesList.push(record);
    }

    editingId = null;
    $('#anniversary-dialog')?.close();
    await loadAnniversaries();
    const persistent = await (NT.idb.isPersistent?.() ?? true);
    if (typeof NT.toast === 'function') {
      NT.toast(persistent
        ? `Đã lưu ngày giỗ ${name}`
        : `Đã ghi tạm ngày giỗ ${name}, nhưng trình duyệt đang chặn lưu trữ (chế độ riêng tư?): đóng trang là mất. Hãy bấm Sao lưu.`);
    }
  }

  // Xuất file chuẩn .ics (iCalendar) tải về máy
  async function exportIcsFile(items, filename = 'NgayTot_SoGioGiaTien.ics') {
    const idbModule = NT.idb || NT.storage;
    if (!idbModule || !idbModule.generateIcsCalendar) {
      alert('Trình duyệt chưa hỗ trợ xuất lịch .ics');
      return;
    }

    const currentYear = new Date().getFullYear();
    const icsContent = await idbModule.generateIcsCalendar(items, currentYear);
    if (!icsContent) {
      alert('Không có sự kiện để xuất lịch.');
      return;
    }
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (typeof NT.toast === 'function') NT.toast('Đã tải file lịch .ics. Mở file để đồng bộ vào Google/Apple Calendar.');
  }

  // Sao lưu JSON
  async function handleExportJson() {
    if (NT.idb && NT.idb.exportDataJSON) {
      const jsonStr = await NT.idb.exportDataJSON();
      const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SaoLuu_SoGio_NgayTot_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }

  // Khôi phục JSON
  function handleImportJson(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target.result;
        if (NT.idb && NT.idb.importDataJSON) {
          const res = await NT.idb.importDataJSON(text);
          if (res.success) {
            alert(`Đã khôi phục ${res.count} ngày giỗ từ tệp sao lưu.` + (res.skipped ? ` Bỏ qua ${res.skipped} dòng có ngày hoặc tháng âm không hợp lệ.` : ''));
            await loadAnniversaries();
          } else {
            alert(`Lỗi khôi phục: ${res.error}`);
          }
        }
      } catch (err) {
        alert('Tệp dữ liệu không hợp lệ!');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset file input
  }

  function bindEvents() {
    // Add button
    $('#btn-add-anniversary')?.addEventListener('click', () => openEditModal());

    // Export all to ICS
    $('#btn-export-all-ics')?.addEventListener('click', () => {
      if (anniversariesList.length === 0) {
        alert('Sổ Giỗ chưa có dữ liệu để xuất lịch.');
        return;
      }
      exportIcsFile(anniversariesList, 'SoGioGiaTien_ToanBo.ics');
    });

    // Backup & Restore
    $('#btn-backup-json')?.addEventListener('click', handleExportJson);
    $('#input-restore-json')?.addEventListener('change', handleImportJson);
    $('#btn-restore-json')?.addEventListener('click', () => $('#input-restore-json')?.click());

    // Modal form submit & close
    $('#anniv-form')?.addEventListener('submit', handleSaveAnniversary);
    $('#anniv-dlg-close')?.addEventListener('click', () => $('#anniversary-dialog')?.close());
    const dlg = $('#anniversary-dialog');
    dlg?.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  }

  // Public API
  NT.anniversaryUI = Object.freeze({
    async init() {
      bindEvents();
      await loadAnniversaries();
    },
    reload: loadAnniversaries
  });

})(globalThis.NT ??= {});
