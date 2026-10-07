"""Tầng A (PRD mục 5): tính trước thời điểm sóc và 24 tiết khí rồi đóng băng thành bảng.

Chạy trên máy phát triển, không chạy trên trình duyệt:

    .venv/Scripts/python.exe tools/astro/build_astro_events.py

Cần tệp de440.bsp (114 MB, không đưa vào git) trong tools/astro/; thiếu thì Skyfield tự tải từ máy chủ JPL.
Kết quả: data/astro_events.json và data/astro_events.sha256.

Thêm --check để tính lại rồi so với bảng đã đóng băng mà không ghi đè (dung sai 1 giây): dùng khi đổi máy,
đổi phiên bản Python, numpy hoặc Skyfield. Thời điểm nằm sát ranh làm tròn giây có thể nhảy 1 giây giữa các
phiên bản, nên mã băm khác chưa chắc là kết quả sai; --check mới là phép so có nghĩa.

Tầng này không biết gì về múi giờ hay âm lịch: chỉ trả thời điểm theo TT và UT1 (làm tròn tới giây),
kèm ΔT đã dùng. Mọi quy ước lịch thuộc tầng B (G2).
"""
import hashlib
import json
import os
import sys

import numpy as np
import skyfield
from skyfield import almanac
from skyfield.api import Loader
from skyfield.framelib import ecliptic_frame

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT_JSON = os.path.join(ROOT, 'data', 'astro_events.json')
OUT_HASH = os.path.join(ROOT, 'data', 'astro_events.sha256')

YEAR_FROM, YEAR_TO = 1799, 2200
EPHEMERIS = 'de440.bsp'
# Mã băm của đúng tệp đã dùng để sinh bảng; tệp khác thì dừng
EPHEMERIS_SHA256 = 'a4ce9bf9b3282becc9f4b2ac3cebe03a2ae7599981aabd7265fd8482fff7c4b5'
# Mốc đánh số tuần trăng: k = 0 là sóc ngày 06/01/2000 (Meeus, Astronomical Algorithms, ch. 49)
LUNATION_EPOCH_JD_TT = 2451550.09766
SYNODIC_MONTH = 29.530588861
FMT = '%Y-%m-%dT%H:%M:%S'

# Chỉ số 0 = Xuân phân (kinh độ Mặt Trời 0°), mỗi bước 15°. Chỉ số chẵn là trung khí, lẻ là tiết.
TERM_NAMES = [
    'Xuân phân', 'Thanh minh', 'Cốc vũ', 'Lập hạ', 'Tiểu mãn', 'Mang chủng',
    'Hạ chí', 'Tiểu thử', 'Đại thử', 'Lập thu', 'Xử thử', 'Bạch lộ',
    'Thu phân', 'Hàn lộ', 'Sương giáng', 'Lập đông', 'Tiểu tuyết', 'Đại tuyết',
    'Đông chí', 'Tiểu hàn', 'Đại hàn', 'Lập xuân', 'Vũ thủy', 'Kinh trập',
]


def solar_term_function(eph):
    earth, sun = eph['earth'], eph['sun']

    def term_at(t):
        _, lon, _ = earth.at(t).observe(sun).apparent().frame_latlon(ecliptic_frame)
        return (lon.degrees // 15.0).astype(int) % 24

    term_at.step_days = 5.0
    return term_at


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def compute(load):
    ts = load.timescale(builtin=True)
    eph = load(EPHEMERIS)
    got = file_sha256(os.path.join(HERE, EPHEMERIS))
    if got != EPHEMERIS_SHA256:
        sys.exit(f'{EPHEMERIS} có mã băm {got}, khác tệp đã dùng để sinh bảng ({EPHEMERIS_SHA256})')
    # Lấy dư mỗi đầu vài ngày rồi lọc theo năm của thời điểm TT
    t0 = ts.tt(YEAR_FROM - 1, 12, 25)
    t1 = ts.tt(YEAR_TO + 1, 1, 7)

    events = []

    t_terms, idx = almanac.find_discrete(t0, t1, solar_term_function(eph))
    for t, i in zip(t_terms, idx):
        year = int(t.tt_strftime('%Y'))
        if YEAR_FROM <= year <= YEAR_TO:
            events.append(('tiet_khi', [year, int(i)], t))

    t_phases, phase = almanac.find_discrete(t0, t1, almanac.moon_phases(eph))
    for t, p in zip(t_phases, phase):
        if int(p) != 0:
            continue
        year = int(t.tt_strftime('%Y'))
        if YEAR_FROM <= year <= YEAR_TO:
            k = int(round((t.tt - LUNATION_EPOCH_JD_TT) / SYNODIC_MONTH))
            events.append(('soc', k, t))

    events.sort(key=lambda e: e[2].tt)
    return ts, events


def check(events):
    """Cổng G1 (PRD 15.1, lớp 1): đủ 24 tiết khí mỗi năm; hai sóc liên tiếp cách nhau 29,2–29,9 ngày."""
    problems = []
    per_year = {}
    for kind, seq, _ in events:
        if kind == 'tiet_khi':
            per_year.setdefault(seq[0], []).append(seq[1])
    for year in range(YEAR_FROM, YEAR_TO + 1):
        got = sorted(per_year.get(year, []))
        if got != list(range(24)):
            problems.append(f'Năm {year}: tiết khí {got}')
    soc = [(seq, t.tt) for kind, seq, t in events if kind == 'soc']
    gaps = np.diff([jd for _, jd in soc])
    ks = np.diff([k for k, _ in soc])
    if not (ks == 1).all():
        problems.append('Số thứ tự tuần trăng không tăng đều 1')
    if gaps.min() < 29.2 or gaps.max() > 29.9:
        problems.append(f'Khoảng cách hai sóc ngoài 29,2–29,9 ngày: {gaps.min():.4f}–{gaps.max():.4f}')
    return problems, (float(gaps.min()), float(gaps.max()))


def compare_with_frozen(rows, problems):
    """So lượt tính này với bảng đã đóng băng, dung sai 1 giây cho tt và ut1, 0,01 giây cho delta_t."""
    import datetime
    frozen = json.load(open(OUT_JSON, encoding='utf-8'))['events']
    epoch = datetime.datetime(1970, 1, 1)
    # Không dùng .timestamp(): trên Windows nó lỗi với ngày trước 1970
    sec = lambda iso: (datetime.datetime.strptime(iso, FMT) - epoch).total_seconds()
    bad, shifted = [], 0
    if len(rows) != len(frozen):
        bad.append(f'số sự kiện {len(rows)} khác bảng {len(frozen)}')
    for new, old in zip(rows, frozen):
        if new[:2] != old[:2] or abs(sec(new[2]) - sec(old[2])) > 1 or abs(sec(new[3]) - sec(old[3])) > 1 or abs(new[4] - old[4]) > 0.011:
            bad.append(f'{old} != {new}')
        elif new != old:
            shifted += 1
    print(f'So với bảng đã đóng băng: {len(frozen)} sự kiện; lệch đúng 1 giây do làm tròn: {shifted}; sai khác thật: {len(bad)}')
    for b in (bad + problems)[:20]:
        print('  -', b)
    return 1 if bad or problems else 0


def main():
    load = Loader(HERE)
    ts, events = compute(load)
    problems, (gap_min, gap_max) = check(events)

    rows = []
    for kind, seq, t in events:
        rows.append([kind, seq, t.tt_strftime(FMT), t.ut1_strftime(FMT), round(float(t.delta_t), 2)])

    if '--check' in sys.argv:
        sys.exit(compare_with_frozen(rows, problems))

    doc = {
        'meta': {
            'mo_ta': 'Thời điểm sóc (Mặt Trăng và Mặt Trời cùng kinh độ hoàng đạo biểu kiến) và 24 tiết khí '
                     '(kinh độ biểu kiến Mặt Trời là bội số của 15°), địa tâm, hoàng đạo và điểm xuân phân của ngày.',
            'khoang_nam': [YEAR_FROM, YEAR_TO],
            'thang_gio': 'tt và ut1 theo lịch Gregory, làm tròn tới giây; delta_t = TT − UT1, tính bằng giây',
            'seq': 'soc: số thứ tự tuần trăng k (k = 0 là sóc 06/01/2000); tiet_khi: [năm của thời điểm TT, chỉ số 0–23, 0 = Xuân phân]',
            'ten_tiet_khi': TERM_NAMES,
            'model_version': {
                'ephemeris': EPHEMERIS,
                'skyfield': skyfield.__version__,
                'delta_t': 'bảng và mô hình ΔT đi kèm Skyfield (timescale builtin=True)',
            },
            'so_su_kien': {'soc': sum(1 for r in rows if r[0] == 'soc'), 'tiet_khi': sum(1 for r in rows if r[0] == 'tiet_khi')},
        },
        'columns': ['kind', 'seq', 'tt', 'ut1', 'delta_t'],
        'events': rows,
    }
    # Mỗi sự kiện một dòng để bản so sánh thay đổi trong git đọc được
    head = json.dumps({k: v for k, v in doc.items() if k != 'events'}, ensure_ascii=False, indent=1)
    body = ',\n'.join(json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in rows)
    text = head[:-2] + ',\n "events": [\n' + body + '\n ]\n}\n'
    json.loads(text)

    os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
    data = text.encode('utf-8')
    with open(OUT_JSON, 'wb') as f:
        f.write(data)
    digest = hashlib.sha256(data).hexdigest()
    with open(OUT_HASH, 'wb') as f:
        f.write(f'{digest}  astro_events.json\n'.encode('ascii'))

    print(f'Số sự kiện: {doc["meta"]["so_su_kien"]}')
    print(f'Hai sóc liên tiếp cách nhau {gap_min:.4f}–{gap_max:.4f} ngày')
    print(f'SHA-256: {digest}')
    if problems:
        print('KHÔNG ĐẠT cổng G1:')
        for p in problems[:20]:
            print('  -', p)
        sys.exit(1)
    print('Đạt: đủ 24 tiết khí mỗi năm; khoảng cách sóc trong 29,2–29,9 ngày')


if __name__ == '__main__':
    main()
