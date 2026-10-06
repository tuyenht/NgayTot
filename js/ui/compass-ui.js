/**
 * NgayTot — UI Controller cho La Bàn Số Phong Thủy 360° & Hướng Xuất Hành Cát Lợi.
 * 
 * Tính năng:
 *  - Kim La bàn vector xoay 360° theo cảm biến con quay hồi chuyển điện thoại (DeviceOrientationEvent).
 *  - Thanh trượt chỉnh góc thủ công (0° – 359°) cho máy tính và thiết bị không có gyro.
 *  - 24 Sơn Hướng, Bát Quái Cung Mệnh (Càn, Khảm, Cấn, Chấn, Tốn, Ly, Khôn, Đoài).
 *  - Chỉ định trực quan hướng Hỷ Thần (Tình duyên, Hỷ sự), Tài Thần (Cầu tài, Kinh doanh) và Hạc Thần (Đại kỵ) hôm nay.
 */
(function (NT) {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  let currentHeading = 0; // Độ góc hiện tại
  let isSensorActive = false;

  const DIRECTIONS_8 = [
    { name: 'Chính Bắc', min: 337.5, max: 22.5, bagua: 'Khảm (Thủy)', element: 'Thủy' },
    { name: 'Đông Bắc', min: 22.5, max: 67.5, bagua: 'Cấn (Thổ)', element: 'Thổ' },
    { name: 'Chính Đông', min: 67.5, max: 112.5, bagua: 'Chấn (Mộc)', element: 'Mộc' },
    { name: 'Đông Nam', min: 112.5, max: 157.5, bagua: 'Tốn (Mộc)', element: 'Mộc' },
    { name: 'Chính Nam', min: 157.5, max: 202.5, bagua: 'Ly (Hỏa)', element: 'Hỏa' },
    { name: 'Tây Nam', min: 202.5, max: 247.5, bagua: 'Khôn (Thổ)', element: 'Thổ' },
    { name: 'Chính Tây', min: 247.5, max: 292.5, bagua: 'Đoài (Kim)', element: 'Kim' },
    { name: 'Tây Bắc', min: 292.5, max: 337.5, bagua: 'Càn (Kim)', element: 'Kim' }
  ];

  function getDirectionInfo(deg) {
    const d = (deg % 360 + 360) % 360;
    for (const dir of DIRECTIONS_8) {
      if (dir.min > dir.max) {
        // Vùng qua 0 độ (Chính Bắc: 337.5 - 22.5)
        if (d >= dir.min || d < dir.max) return dir;
      } else {
        if (d >= dir.min && d < dir.max) return dir;
      }
    }
    return DIRECTIONS_8[0];
  }

  function setCompassAngle(deg) {
    currentHeading = Math.round((deg % 360 + 360) % 360);
    const dial = $('#compass-dial');
    if (dial) {
      dial.style.transform = `rotate(${-currentHeading}deg)`;
    }

    const degEl = $('#compass-degree-val');
    if (degEl) degEl.textContent = `${currentHeading}°`;

    const dirInfo = getDirectionInfo(currentHeading);
    const dirNameEl = $('#compass-direction-name');
    if (dirNameEl) dirNameEl.textContent = dirInfo.name;

    const baguaEl = $('#compass-bagua-val');
    if (baguaEl) baguaEl.textContent = `${dirInfo.bagua} · Ngũ hành ${dirInfo.element}`;

    const slider = $('#compass-manual-slider');
    if (slider && !isSensorActive) slider.value = currentHeading;
  }

  // Cảm biến hướng. Android (Chrome) chỉ cho hướng so với bắc từ ở sự kiện 'deviceorientationabsolute';
  // iOS Safari cho qua webkitCompassHeading. Sự kiện 'deviceorientation' thường trên Android là góc
  // tương đối so với lúc mở trang, không phải hướng la bàn, nên không dùng.
  const SENSOR_EVENT = 'ondeviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
  let sensorWatchdog = null;
  let gotHeading = false;

  function stopSensor() {
    window.removeEventListener(SENSOR_EVENT, handleOrientation);
    clearTimeout(sensorWatchdog);
    isSensorActive = false;
    updateSensorBtn(false);
  }

  function startSensor() {
    gotHeading = false;
    window.addEventListener(SENSOR_EVENT, handleOrientation);
    isSensorActive = true;
    updateSensorBtn(true);
    // Máy tính và một số máy không có la bàn vẫn phát sự kiện rỗng: báo rõ thay vì để nút "đang bật" mãi
    clearTimeout(sensorWatchdog);
    sensorWatchdog = setTimeout(() => {
      if (isSensorActive && !gotHeading) {
        stopSensor();
        (NT.toast || alert)('Thiết bị không cung cấp hướng la bàn. Bạn có thể xoay la bàn bằng tay.');
      }
    }, 2500);
  }

  async function requestOrientationSensor() {
    if (typeof DeviceOrientationEvent === 'undefined') {
      (NT.toast || alert)('Thiết bị không hỗ trợ cảm biến hướng. Bạn có thể xoay la bàn bằng tay.');
      return;
    }
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try {
        const response = await DeviceOrientationEvent.requestPermission();
        if (response !== 'granted') {
          (NT.toast || alert)('Quyền truy cập cảm biến hướng đã bị từ chối.');
          return;
        }
      } catch (err) {
        console.warn('Lỗi xin quyền cảm biến:', err);
        return;
      }
    }
    startSensor();
  }

  /** Hướng la bàn (độ, theo chiều kim đồng hồ từ bắc) từ một sự kiện cảm biến, hoặc null nếu không có. */
  function headingFromEvent(e) {
    // Cảm biến đo theo thân máy: màn hình xoay ngang thì cộng góc xoay của màn hình
    const screenAngle = (globalThis.screen?.orientation?.angle) || 0;
    if (typeof e.webkitCompassHeading === 'number' && e.webkitCompassHeading >= 0) return (e.webkitCompassHeading + screenAngle) % 360;
    // alpha tăng ngược chiều kim đồng hồ; chỉ dùng khi là góc tuyệt đối
    if (e.absolute === true && typeof e.alpha === 'number') return (360 - e.alpha + screenAngle) % 360;
    return null;
  }

  function handleOrientation(e) {
    const heading = headingFromEvent(e);
    if (heading == null) return;
    gotHeading = true;
    setCompassAngle(heading);
  }

  function updateSensorBtn(active) {
    const btn = $('#btn-toggle-compass-sensor');
    if (btn) {
      btn.textContent = active ? '📳 Đang bật cảm biến' : '🧭 Kích hoạt cảm biến điện thoại';
      btn.classList.toggle('active', active);
    }
  }

  // Render thông tin Hỷ Thần / Tài Thần của hôm nay
  function updateTodayDirections() {
    const now = new Date();
    // Từ 23:00 tính theo ngày hôm sau, cùng quy ước với thanh canh giờ
    const today = now.getHours() >= 23 ? new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) : now;
    const gz = NT.calendar.solarToGanZhi(today.getDate(), today.getMonth() + 1, today.getFullYear());
    
    let dirs = { hyThan: 'Đông Nam', taiThan: 'Tây Bắc', hacThan: 'Chính Bắc' };
    if (NT.canhClock && NT.canhClock.getDirections) {
      dirs = NT.canhClock.getDirections(gz.dCan, gz.dChi);
    }

    const hyEl = $('#compass-hy-than');
    const taiEl = $('#compass-tai-than');
    const hacEl = $('#compass-hac-than');

    if (hyEl) hyEl.textContent = dirs.hyThan;
    if (taiEl) taiEl.textContent = dirs.taiThan;
    if (hacEl) hacEl.textContent = dirs.hacThan;
  }

  function bindEvents() {
    $('#btn-toggle-compass-sensor')?.addEventListener('click', () => {
      if (isSensorActive) {
        stopSensor();
      } else {
        requestOrientationSensor();
      }
    });

    $('#compass-manual-slider')?.addEventListener('input', (e) => {
      if (isSensorActive) {
        stopSensor();
      }
      setCompassAngle(parseFloat(e.target.value));
    });

    // Preset direction buttons
    $$('.compass-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (isSensorActive) {
          stopSensor();
        }
        setCompassAngle(parseFloat(btn.dataset.deg));
      });
    });
  }

  NT.compassUI = Object.freeze({
    init() {
      setCompassAngle(0);
      updateTodayDirections();
      bindEvents();
    },
    setAngle: setCompassAngle,
    refreshDirections: updateTodayDirections,
    headingFromEvent
  });

})(globalThis.NT ??= {});
