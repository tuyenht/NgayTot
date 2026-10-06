/**
 * NgayTot — Quản lý lưu trữ ngoại tuyến IndexedDB (Sổ Giỗ Gia Tiên, Hồ sơ Gia đình, Cài đặt).
 * Hỗ trợ lưu trữ bền vững, chạy 100% Offline-First, sao lưu/phục hồi JSON,
 * và xuất file iCalendar (.ics) đồng bộ 1-chạm vào Google Calendar / Apple Calendar.
 */
(function (NT) {
  'use strict';

  const DB_NAME = 'NgayTotDB';
  const DB_VERSION = 1;

  const STORES = {
    ANNIVERSARIES: 'anniversaries',
    USER_PROFILE: 'user_profile',
    FAMILY_MEMBERS: 'family_members',
    PREFERENCES: 'preferences'
  };

  let dbInstance = null;

  // Fallback in-memory storage cho môi trường không có IndexedDB (test headless / private mode cũ)
  const memoryFallback = {
    [STORES.ANNIVERSARIES]: new Map(),
    [STORES.USER_PROFILE]: new Map(),
    [STORES.FAMILY_MEMBERS]: new Map(),
    [STORES.PREFERENCES]: new Map()
  };

  /**
   * Khởi tạo hoặc kết nối cơ sở dữ liệu IndexedDB.
   * @returns {Promise<IDBDatabase|null>}
   */
  function openDB() {
    if (dbInstance) return Promise.resolve(dbInstance);

    const idb = globalThis.indexedDB;
    if (!idb) {
      console.warn('[NgayTot IDB] Trình duyệt không hỗ trợ IndexedDB, sử dụng in-memory fallback.');
      return Promise.resolve(null);
    }

    return new Promise((resolve, reject) => {
      const request = idb.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Bảng ngày giỗ
        if (!db.objectStoreNames.contains(STORES.ANNIVERSARIES)) {
          const store = db.createObjectStore(STORES.ANNIVERSARIES, { keyPath: 'id' });
          store.createIndex('lunarMonth', 'lunarMonth', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Bảng hồ sơ gia chủ
        if (!db.objectStoreNames.contains(STORES.USER_PROFILE)) {
          db.createObjectStore(STORES.USER_PROFILE, { keyPath: 'id' });
        }

        // Bảng thành viên gia đình
        if (!db.objectStoreNames.contains(STORES.FAMILY_MEMBERS)) {
          db.createObjectStore(STORES.FAMILY_MEMBERS, { keyPath: 'id' });
        }

        // Bảng cài đặt / tùy chọn
        if (!db.objectStoreNames.contains(STORES.PREFERENCES)) {
          db.createObjectStore(STORES.PREFERENCES, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        dbInstance = event.target.result;
        resolve(dbInstance);
      };

      request.onerror = (event) => {
        console.error('[NgayTot IDB] Lỗi mở IndexedDB:', event.target.error);
        resolve(null);
      };
    });
  }

  // --- CRUD: SỔ GIỖ GIA TIÊN (ANNIVERSARIES) ---

  const clampInt = (v, lo, hi) => {
    const n = Math.trunc(Number(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
  };
  const str = (v) => (v == null ? '' : String(v));

  function normalizeAnniversaryRecord(data, id = null) {
    const finalId = id || data.id || `ann_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const name = str(data.deceasedName || data.name || 'Gia Tiên').trim();
    const rel = str(data.relationship || 'Người quá cố').trim();
    const burial = str(data.restingPlace || data.burialPlace || '').trim();
    const deathY = data.deathYear ? Number(data.deathYear) : (data.solarYearPassed ? Number(data.solarYearPassed) : null);
    const notes = str(data.notes || data.note || '').trim();
    const isLeap = !!(data.isLeapMonth ?? data.isLeap);
    const reminds = Array.isArray(data.remindDaysBefore) ? data.remindDaysBefore : (Array.isArray(data.remindDays) ? data.remindDays : [14, 7, 2, 0]);

    return {
      id: finalId,
      name,
      deceasedName: name,
      relationship: rel,
      lunarDay: clampInt(data.lunarDay, 1, 30),
      lunarMonth: clampInt(data.lunarMonth, 1, 12),
      isLeap,
      isLeapMonth: isLeap,
      burialPlace: burial,
      restingPlace: burial,
      solarYearPassed: deathY,
      deathYear: deathY,
      note: notes,
      notes: notes,
      remindDays: reminds,
      remindDaysBefore: reminds,
      notifyTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(str(data.notifyTime)) ? str(data.notifyTime) : '07:00',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * Thêm một sự kiện ngày Giỗ mới.
   */
  async function addAnniversary(data) {
    const db = await openDB();
    const record = normalizeAnniversaryRecord(data);

    if (!db) {
      memoryFallback[STORES.ANNIVERSARIES].set(record.id, record);
      return record;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ANNIVERSARIES, 'readwrite');
      const store = tx.objectStore(STORES.ANNIVERSARIES);
      const req = store.add(record);
      req.onsuccess = () => resolve(record);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Cập nhật thông tin ngày Giỗ.
   */
  async function updateAnniversary(id, data) {
    const db = await openDB();
    const existing = await getAnniversary(id);
    if (!existing) throw new Error(`Không tìm thấy ngày giỗ với ID: ${id}`);

    const record = normalizeAnniversaryRecord({ ...existing, ...data, createdAt: existing.createdAt || data.createdAt }, id);

    if (!db) {
      memoryFallback[STORES.ANNIVERSARIES].set(id, record);
      return record;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ANNIVERSARIES, 'readwrite');
      const store = tx.objectStore(STORES.ANNIVERSARIES);
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Lưu ngày Giỗ (Tự động thêm mới nếu chưa có hoặc cập nhật nếu đã tồn tại).
   */
  async function saveAnniversary(data) {
    if (!data.id) return addAnniversary(data);
    const existing = await getAnniversary(data.id);
    if (existing) {
      return updateAnniversary(data.id, data);
    }
    return addAnniversary(data);
  }

  /**
   * Lấy chi tiết 1 sự kiện ngày Giỗ.
   */
  async function getAnniversary(id) {
    const db = await openDB();
    if (!db) {
      return memoryFallback[STORES.ANNIVERSARIES].get(id) || null;
    }

    return new Promise((resolve) => {
      const tx = db.transaction(STORES.ANNIVERSARIES, 'readonly');
      const store = tx.objectStore(STORES.ANNIVERSARIES);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  /**
   * Lấy toàn bộ danh sách ngày Giỗ đã lưu.
   */
  async function getAllAnniversaries() {
    const db = await openDB();
    if (!db) {
      return Array.from(memoryFallback[STORES.ANNIVERSARIES].values());
    }

    return new Promise((resolve) => {
      const tx = db.transaction(STORES.ANNIVERSARIES, 'readonly');
      const store = tx.objectStore(STORES.ANNIVERSARIES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  /**
   * Xóa một ngày Giỗ.
   */
  async function deleteAnniversary(id) {
    const db = await openDB();
    if (!db) {
      memoryFallback[STORES.ANNIVERSARIES].delete(id);
      return true;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ANNIVERSARIES, 'readwrite');
      const store = tx.objectStore(STORES.ANNIVERSARIES);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  // --- HỒ SƠ GIA CHỦ (USER PROFILE) ---

  const PROFILE_KEY = 'primary_user';

  async function saveUserProfile(profile) {
    const db = await openDB();
    const record = {
      id: PROFILE_KEY,
      fullName: str(profile.fullName).trim(),
      birthYear: Number.isInteger(Number(profile.birthYear)) && Number(profile.birthYear) >= 1900 && Number(profile.birthYear) <= 2100 ? Number(profile.birthYear) : null,
      gender: profile.gender === 'female' ? 'female' : 'male',
      address: str(profile.address).trim(),
      branch: profile.branch || 'Trưởng gia đình',
      culturalRegion: str(profile.culturalRegion),
      culturalEthnicity: str(profile.culturalEthnicity),
      updatedAt: new Date().toISOString()
    };

    if (!db) {
      memoryFallback[STORES.USER_PROFILE].set(PROFILE_KEY, record);
      return record;
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.USER_PROFILE, 'readwrite');
      const store = tx.objectStore(STORES.USER_PROFILE);
      const req = store.put(record);
      req.onsuccess = () => resolve(record);
      req.onerror = (e) => reject(e.target.error);
    });
  }

  async function getUserProfile() {
    const db = await openDB();
    if (!db) {
      return memoryFallback[STORES.USER_PROFILE].get(PROFILE_KEY) || null;
    }

    return new Promise((resolve) => {
      const tx = db.transaction(STORES.USER_PROFILE, 'readonly');
      const store = tx.objectStore(STORES.USER_PROFILE);
      const req = store.get(PROFILE_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  // --- SAO LƯU & CHIA SẺ GIA TỘC (BACKUP / CLAN SHARING) ---

  /**
   * Xuất toàn bộ dữ liệu ra chuỗi JSON để sao lưu hoặc chia sẻ gia đình qua mã QR.
   */
  async function exportDataJSON() {
    const profile = await getUserProfile();
    const anniversaries = await getAllAnniversaries();

    return JSON.stringify({
      schema: 'NgayTot_Clan_Sync_v1',
      exportedAt: new Date().toISOString(),
      profile,
      anniversaries
    }, null, 2);
  }

  /**
   * Nhập dữ liệu từ chuỗi JSON sao lưu.
   */
  async function importDataJSON(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (!data || !Array.isArray(data.anniversaries)) {
        throw new Error('Định dạng tệp dữ liệu không hợp lệ!');
      }

      if (data.profile) {
        await saveUserProfile(data.profile);
      }

      // Bỏ qua dòng có ngày, tháng âm ngoài miền; ghi đè theo id để nhập lại chính bản sao lưu không lỗi
      const inRange = (v, lo, hi) => (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) && Number.isInteger(Number(v)) && Number(v) >= lo && Number(v) <= hi;
      const valid = data.anniversaries.filter((a) => a && typeof a === 'object' && inRange(a.lunarDay, 1, 30) && inRange(a.lunarMonth, 1, 12));
      const text = (v) => (typeof v === 'string' || typeof v === 'number' ? v : undefined);
      for (const ann of valid) {
        // Chỉ nhận chuỗi, số cho các trường văn bản và id; kiểu khác thì bỏ trường đó
        await saveAnniversary({ ...ann, id: typeof ann.id === 'string' && ann.id ? ann.id : undefined,
          name: text(ann.name), deceasedName: text(ann.deceasedName), relationship: text(ann.relationship),
          note: text(ann.note), notes: text(ann.notes), burialPlace: text(ann.burialPlace), restingPlace: text(ann.restingPlace) });
      }

      return { success: true, count: valid.length, skipped: data.anniversaries.length - valid.length };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // --- XUẤT LỊCH ĐỒNG BỘ ICALENDAR (.ICS) ---

  /**
   * Tạo tệp iCalendar chuẩn RFC 5545 cho Google / Apple Calendar.
   * Tính toán ngày giỗ dương lịch cho năm hiện tại và 2 năm tiếp theo.
   * Hỗ trợ gọi:
   *  - generateIcsCalendar(targetYears)
   *  - generateIcsCalendar(items, currentYear)
   */
  async function generateIcsCalendar(itemsOrYears = null, targetYears = null) {
    let anniversaries;
    let years;
    const curYear = new Date().getFullYear();

    if (Array.isArray(itemsOrYears) && itemsOrYears.length > 0 && typeof itemsOrYears[0] === 'object') {
      anniversaries = itemsOrYears;
      years = Array.isArray(targetYears)
        ? targetYears
        : (typeof targetYears === 'number' ? [targetYears, targetYears + 1] : [curYear, curYear + 1, curYear + 2]);
    } else {
      anniversaries = await getAllAnniversaries();
      years = Array.isArray(itemsOrYears) ? itemsOrYears : [curYear, curYear + 1, curYear + 2];
    }

    if (!anniversaries || anniversaries.length === 0) return null;

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//NgayTot//So Gio Gia Tien//VI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Lịch Giỗ Gia Tiên - NgayTot',
      'X-WR-TIMEZONE:Asia/Ho_Chi_Minh'
    ];

    // RFC 5545: escape \ ; , và xuống dòng trong giá trị văn bản; gấp dòng dài quá 75 octet
    const icsText = (v) => str(v).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n|\r/g, '\\n');
    const enc = new TextEncoder();
    const fold = (line) => {
      const out = [];
      let cur = '';
      let bytes = 0;
      for (const ch of line) {
        const b = enc.encode(ch).length;
        if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; }
        cur += ch; bytes += b;
      }
      out.push(cur);
      return out.join('\r\n ');
    };

    for (const ann of anniversaries) {
      if (!NT.anniversary || typeof NT.anniversary.getAnniversaryOccurrences !== 'function') continue;
      const isLeap = !!(ann.isLeapMonth ?? ann.isLeap);
      // Một năm dương có thể có hai lần giỗ (đầu tháng 1 và cuối tháng 12): lấy đủ
      const occurrences = years.flatMap((y) => NT.anniversary.getAnniversaryOccurrences(Number(ann.lunarDay), Number(ann.lunarMonth), y, isLeap));
      for (const sol of occurrences) {

        const annName = ann.name || ann.deceasedName || 'Gia Tiên';
        const remindRaw = Array.isArray(ann.remindDaysBefore) ? ann.remindDaysBefore : (Array.isArray(ann.remindDays) ? ann.remindDays : [2]);
        // Sự kiện cả ngày bắt đầu lúc 00:00: lùi n ngày rồi cộng giờ nhắc (mặc định 07:00) để không báo lúc nửa đêm
        const [nh, nm] = /^([01]\d|2[0-3]):[0-5]\d$/.test(str(ann.notifyTime)) ? str(ann.notifyTime).split(':').map(Number) : [7, 0];
        const alarmTrigger = (n) => {
          const mins = nh * 60 + nm - n * 1440;
          return `${mins < 0 ? '-' : ''}PT${Math.abs(mins)}M`;
        };
        const remindDays = [...new Set(remindRaw.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 60))];
        const rel = ann.relationship || 'Tổ tiên';
        const ymd = `${sol.solarYear}${String(sol.solarMonth).padStart(2, '0')}${String(sol.solarDay).padStart(2, '0')}`;
        const uid = `${str(ann.id || 'ann').replace(/[^A-Za-z0-9_-]/g, '')}_${ymd}@ngaytot.vn`;
        const summary = `Ngày Giỗ: ${rel} ${annName} (${ann.lunarDay}/${ann.lunarMonth} Âm lịch)`;
        const desc = `Lễ giỗ ${rel} ${annName}. Âm lịch: ngày ${ann.lunarDay} tháng ${ann.lunarMonth}${isLeap ? ' (nhuận)' : ''}. ${ann.note || ann.notes || ''}`;

        ics.push(
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
          `DTSTART;VALUE=DATE:${ymd}`,
          `SUMMARY:${icsText(summary)}`,
          `DESCRIPTION:${icsText(desc)}`,
          'STATUS:CONFIRMED',
          'TRANSP:TRANSPARENT',
          ...remindDays.flatMap((n) => [
            'BEGIN:VALARM',
            'ACTION:DISPLAY',
            `DESCRIPTION:${icsText(n ? `Còn ${n} ngày nữa là giỗ ${rel} ${annName}` : `Hôm nay là giỗ ${rel} ${annName}`)}`,
            `TRIGGER:${alarmTrigger(n)}`,
            'END:VALARM'
          ]),
          'END:VEVENT'
        );
      }
    }

    ics.push('END:VCALENDAR');
    return ics.map(fold).join('\r\n') + '\r\n';
  }

  /** true nếu dữ liệu được ghi xuống IndexedDB; false nếu chỉ nằm trong bộ nhớ của lần mở trang này. */
  async function isPersistent() {
    return !!(await openDB());
  }

  NT.storage = Object.freeze({
    STORES,
    openDB,
    isPersistent,
    addAnniversary,
    saveAnniversary,
    updateAnniversary,
    getAnniversary,
    getAllAnniversaries,
    deleteAnniversary,
    saveUserProfile,
    getUserProfile,
    exportDataJSON,
    importDataJSON,
    generateIcsCalendar
  });

  // Alias NT.idb -> NT.storage để tương thích 100% với các UI controller
  NT.idb = NT.storage;
})(globalThis.NT ??= {});
