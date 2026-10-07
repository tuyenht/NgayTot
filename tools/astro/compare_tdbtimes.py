"""Lớp kiểm thử 1 (PRD 13.1): so bảng đã đóng băng với thời điểm sóc, tiết khí của Yuk Tung Liu.

    .venv/Scripts/python.exe tools/astro/compare_tdbtimes.py

Nguồn đối chiếu: tools/astro/TDBtimes.txt, lấy từ src/TDBtimes.txt của kho ytliu0/ChineseCalendar
(thang giờ TDB, tính bằng DE431). So trên thang TT của bảng; TDB và TT lệch nhau dưới 0,002 giây,
và bảng làm tròn tới giây, nên sai số của chính phép so là khoảng 0,5 giây. Ngưỡng đạt: 60 giây.
"""
import bisect
import datetime
import hashlib
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
EVENTS = os.path.join(ROOT, 'data', 'astro_events.json')
HASH = os.path.join(ROOT, 'data', 'astro_events.sha256')
REF = os.path.join(HERE, 'TDBtimes.txt')
# Mã băm của bản TDBtimes.txt đã dùng ngày 2026-10-07; bản khác thì vẫn chạy nhưng báo rõ
REF_SHA256 = '38f5d14b6c55a25d0c9530edaba583372b22559716d8af94163da3e37486cc81'
LIMIT_SECONDS = 60.0
JD_UNIX_EPOCH = 2440587.5
EPOCH = datetime.datetime(1970, 1, 1)


def jd_of(iso):
    dt = datetime.datetime.strptime(iso, '%Y-%m-%dT%H:%M:%S')
    return JD_UNIX_EPOCH + (dt - EPOCH).total_seconds() / 86400.0


def load_reference(year_from, year_to):
    """Trả (tiết khí: {chỉ số: [jd]}, sóc: [jd]) trong TDBtimes, bỏ dòng trùng giữa các năm."""
    terms = {i: set() for i in range(24)}
    moons = set()
    with open(REF, encoding='ascii') as f:
        header = f.readline().split()
        term_cols = [i for i, h in enumerate(header) if h[0] in 'ZJ']
        moon_cols = [i for i, h in enumerate(header) if h.startswith('Q0_')]
        assert len(term_cols) == 25 and header[term_cols[0]] == 'Z11a', header[:30]
        for line in f:
            p = line.split()
            year = int(p[0])
            if year < year_from - 1 or year > year_to + 1:
                continue
            jd0 = float(p[1])
            # Cột đầu là Đông chí (270°), mỗi cột sau thêm 15°; chỉ số 0 = Xuân phân
            for n, c in enumerate(term_cols):
                terms[(18 + n) % 24].add(round(jd0 + float(p[c]), 7))
            for c in moon_cols:
                moons.add(round(jd0 + float(p[c]), 7))
    return {i: dedupe(v) for i, v in terms.items()}, dedupe(moons)


def dedupe(values):
    """Một sự kiện nằm ở hai dòng năm liền nhau được cộng từ hai mốc jd0 khác nhau nên có thể lệch cỡ 0,01 giây:
    coi hai giá trị cách nhau dưới 1 giây là một."""
    out = []
    for v in sorted(values):
        if not out or v - out[-1] > 1.0 / 86400:
            out.append(v)
    return out


def nearest(sorted_list, x):
    i = bisect.bisect_left(sorted_list, x)
    best = None
    for j in (i - 1, i):
        if 0 <= j < len(sorted_list) and (best is None or abs(sorted_list[j] - x) < abs(best - x)):
            best = sorted_list[j]
    return best


def main():
    if not os.path.exists(REF):
        print('Thiếu tools/astro/TDBtimes.txt. Tải từ https://raw.githubusercontent.com/ytliu0/ChineseCalendar/master/src/TDBtimes.txt')
        sys.exit(2)
    ref_digest = hashlib.sha256(open(REF, 'rb').read()).hexdigest()
    if ref_digest != REF_SHA256:
        print(f'Lưu ý: TDBtimes.txt có mã băm {ref_digest}, khác bản đã dùng khi nghiệm thu G1 ({REF_SHA256})')
    raw = open(EVENTS, 'rb').read()
    digest = hashlib.sha256(raw).hexdigest()
    frozen = open(HASH, encoding='ascii').read().split()[0]
    if digest != frozen:
        print(f'Mã băm của bảng không khớp tệp .sha256: {digest} != {frozen}')
        sys.exit(1)
    doc = json.loads(raw.decode('utf-8'))
    y0, y1 = doc['meta']['khoang_nam']
    ref_terms, ref_moons = load_reference(y0, y1)

    stats = {'soc': [], 'tiet_khi': []}
    worst = []
    used = set()
    for kind, seq, tt, _ut1, _dt in doc['events']:
        jd = jd_of(tt)
        ref = nearest(ref_moons, jd) if kind == 'soc' else nearest(ref_terms[seq[1]], jd)
        used.add((kind, ref))
        diff = (jd - ref) * 86400.0
        stats[kind].append(diff)
        worst.append((abs(diff), kind, seq, tt))
    worst.sort(reverse=True)

    # Chiều ngược lại: mọi sự kiện của nguồn đối chiếu nằm trong khoảng của bảng đều phải được khớp đúng một lần,
    # để một sự kiện bị sót hoặc bị tính hai lần không lọt qua phép tìm gần nhất.
    # Khoảng soát là cả khoảng năm bảng cam kết (00:00 TT ngày 1/1 năm đầu tới 00:00 TT ngày 1/1 sau năm cuối),
    # không phải từ sự kiện đầu tới sự kiện cuối của bảng, để sót ở hai mép cũng bị bắt.
    jd_lo, jd_hi = jd_of(f'{y0:04d}-01-01T00:00:00'), jd_of(f'{y1 + 1:04d}-01-01T00:00:00')
    ref_all = [('soc', jd) for jd in ref_moons] + [('tiet_khi', jd) for v in ref_terms.values() for jd in v]
    ref_in_range = [e for e in ref_all if jd_lo <= e[1] < jd_hi]
    missing = [e for e in ref_in_range if e not in used]
    failed = len(used) != len(doc['events']) or bool(missing)
    print(f'Nguồn đối chiếu có {len(ref_in_range)} sự kiện trong khoảng của bảng; bảng có {len(doc["events"])}; '
          f'không khớp được: {len(missing)}; khớp trùng: {len(doc["events"]) - len(used)}')

    for kind, label in (('soc', 'Sóc'), ('tiet_khi', 'Tiết khí')):
        d = stats[kind]
        a = sorted(abs(x) for x in d)
        over = sum(1 for x in a if x > LIMIT_SECONDS)
        failed = failed or over > 0
        print(f'{label}: {len(d)} sự kiện; lệch lớn nhất {a[-1]:.2f} giây; trung vị {a[len(a) // 2]:.2f} giây; '
              f'trung bình có dấu {sum(d) / len(d):+.2f} giây; vượt {LIMIT_SECONDS:.0f} giây: {over}')
    print('Năm sự kiện lệch nhiều nhất:')
    for diff, kind, seq, tt in worst[:5]:
        print(f'  {diff:.2f} giây  {kind} {seq} {tt} TT')
    print('KHÔNG ĐẠT' if failed else f'Đạt lớp 1: mọi sự kiện lệch không quá {LIMIT_SECONDS:.0f} giây (bảng {frozen[:12]}…)')
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
