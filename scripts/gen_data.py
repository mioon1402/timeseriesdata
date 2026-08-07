#!/usr/bin/env python3
"""
학습용 예시 데이터 생성기 (표준 라이브러리만 사용)

하나의 가상 카페 "밀롱 커피"의 2년치 운영 데이터를 만든다.
초보자가 숫자의 의미를 바로 이해할 수 있으면서, 동시에
시계열 분석에 필요한 성질(추세·주간 계절성·연간 계절성·휴일 효과·
날씨 영향·결측치·이상치)을 모두 갖도록 설계했다.

    python3 scripts/gen_data.py

생성 파일:
    data/cafe_sales.csv        메인 데이터 (일별 매출)
    data/cafe_sales_messy.csv  데이터 정리 실습용 (일부러 지저분하게)
    data/weather.csv           병합(merge) 실습용
    data/menu_orders.csv       groupby 실습용 (메뉴별 주문)
"""

import csv
import math
import os
import random
from datetime import date, timedelta

SEED = 20240101
START = date(2024, 1, 1)
END = date(2025, 12, 31)
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

WEEKDAY_KO = ["월", "화", "수", "목", "금", "토", "일"]

# 한국 공휴일 (2024~2025, 주요 날짜)
HOLIDAYS = {
    # 2024
    "2024-01-01", "2024-02-09", "2024-02-10", "2024-02-11", "2024-02-12",
    "2024-03-01", "2024-04-10", "2024-05-05", "2024-05-06", "2024-05-15",
    "2024-06-06", "2024-08-15", "2024-09-16", "2024-09-17", "2024-09-18",
    "2024-10-03", "2024-10-09", "2024-12-25",
    # 2025
    "2025-01-01", "2025-01-28", "2025-01-29", "2025-01-30",
    "2025-03-01", "2025-03-03", "2025-05-05", "2025-05-06",
    "2025-06-06", "2025-08-15", "2025-10-03", "2025-10-05", "2025-10-06",
    "2025-10-07", "2025-10-08", "2025-10-09", "2025-12-25",
}

# 요일별 방문객 배수 (월~일). 카페라 금·토가 강하고 일요일은 조금 빠진다.
WEEKDAY_MULT = [0.86, 0.90, 0.94, 1.00, 1.18, 1.30, 1.05]

MENUS = [
    ("아메리카노", 4500, 0.34),
    ("카페라떼", 5000, 0.20),
    ("바닐라라떼", 5500, 0.11),
    ("콜드브루", 5500, 0.10),
    ("카푸치노", 5000, 0.07),
    ("녹차라떼", 5500, 0.06),
    ("초코라떼", 5500, 0.05),
    ("에스프레소", 3500, 0.04),
    ("디카페인 아메리카노", 5000, 0.03),
]


def daterange(start, end):
    d = start
    while d <= end:
        yield d
        d += timedelta(days=1)


def seasonal_temp(d, rng):
    """일평균기온 — 서울 기준 대략적인 연간 사인 곡선 + 잡음."""
    day_of_year = d.timetuple().tm_yday
    base = 12.5 - 13.5 * math.cos(2 * math.pi * (day_of_year - 15) / 365.25)
    return round(base + rng.gauss(0, 2.6), 1)


def build_rows():
    rng = random.Random(SEED)
    rows = []

    for d in daterange(START, END):
        iso = d.isoformat()
        is_holiday = iso in HOLIDAYS
        wd = d.weekday()

        temp = seasonal_temp(d, rng)

        # 강수 — 여름에 잦다
        month = d.month
        rain_prob = 0.30 if month in (6, 7, 8) else 0.15
        rain = round(rng.expovariate(1 / 12.0), 1) if rng.random() < rain_prob else 0.0

        # ---- 방문객 수 ----
        t = (d - START).days
        trend = 145 + 0.085 * t                      # 2년에 걸쳐 뚜렷하게 성장

        # 연간 계절성은 기온과 위상을 맞춘다(여름 피크). 위상이 어긋나면
        # "더우면 매출이 오른다"는 기본 관계가 데이터에서 사라진다.
        yearly = 1 + 0.09 * math.sin(2 * math.pi * (t - 105) / 365.25)
        base = trend * WEEKDAY_MULT[wd] * yearly

        # 기온의 완만한 양의 효과 (15℃를 기준으로)
        base *= 1 + 0.006 * (temp - 15)

        if is_holiday:
            base *= 1.22                             # 공휴일엔 나들이 손님
        if rain > 0:
            base *= 1 - min(0.22, 0.012 * rain)      # 비 오면 발길이 준다
        if temp >= 30:
            base *= 1.07                             # 폭염엔 아이스 수요
        elif temp <= -5:
            base *= 0.92

        visitors = max(20, int(rng.gauss(base, base * 0.075)))

        # ---- 객단가 ----
        # 더울수록 비싼 아이스 음료 비중이 올라간다
        avg_price = 4900 + 16 * max(0, temp - 15) + rng.gauss(0, 120)
        sales = int(visitors * avg_price)

        rows.append({
            "date": iso,
            "weekday": WEEKDAY_KO[wd],
            "visitors": visitors,
            "sales": sales,
            "avg_temp": temp,
            "rain_mm": rain,
            "is_holiday": is_holiday,
        })

    # ---- 이상치 심기 (실습용) ----
    # 리모델링 휴점 이틀, 방송 노출로 폭증한 하루, 기계 고장으로 반나절 휴업
    def find(iso):
        return next(i for i, r in enumerate(rows) if r["date"] == iso)

    for iso in ("2024-07-15", "2024-07-16"):
        i = find(iso)
        rows[i]["visitors"] = 0
        rows[i]["sales"] = 0

    i = find("2025-04-19")            # 맛집 방송 소개
    rows[i]["visitors"] = int(rows[i]["visitors"] * 3.4)
    rows[i]["sales"] = int(rows[i]["sales"] * 3.4)

    i = find("2025-09-08")            # 커피머신 고장
    rows[i]["visitors"] = int(rows[i]["visitors"] * 0.35)
    rows[i]["sales"] = int(rows[i]["sales"] * 0.35)

    # ---- 결측치 심기 (실습용) ----
    rng2 = random.Random(SEED + 7)
    for iso in ("2024-03-14", "2024-11-02", "2025-02-21", "2025-08-30"):
        rows[find(iso)]["sales"] = None            # POS 오류로 매출 누락
    for _ in range(9):
        rows[rng2.randrange(len(rows))]["avg_temp"] = None   # 센서 결측

    return rows


def write_main(rows):
    path = os.path.join(OUT_DIR, "cafe_sales.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["date", "weekday", "visitors", "sales", "avg_temp", "rain_mm", "is_holiday"])
        for r in rows:
            w.writerow([
                r["date"], r["weekday"], r["visitors"],
                "" if r["sales"] is None else r["sales"],
                "" if r["avg_temp"] is None else r["avg_temp"],
                r["rain_mm"],
                "True" if r["is_holiday"] else "False",
            ])
    return path


def write_messy(rows):
    """
    데이터 정리 실습용. 현실에서 실제로 만나는 문제들을 심는다.
      - 날짜 형식이 세 가지로 섞임
      - 숫자에 천 단위 쉼표와 '원' 단위가 붙음
      - 앞뒤 공백, 대소문자 불일치
      - 중복 행
      - 빈 칸과 'N/A', '-' 가 섞인 결측 표기
    """
    rng = random.Random(SEED + 99)
    sub = rows[:180]                                  # 6개월치면 실습에 충분
    path = os.path.join(OUT_DIR, "cafe_sales_messy.csv")

    out = []
    for r in sub:
        y, m, d = r["date"].split("-")
        style = rng.randrange(3)
        if style == 0:
            ds = f"{y}-{m}-{d}"
        elif style == 1:
            ds = f"{y}/{m}/{d}"
        else:
            ds = f"{int(m)}월 {int(d)}일, {y}"

        wd = r["weekday"]
        if rng.random() < 0.25:
            wd = f"  {wd} "                            # 공백 오염

        if r["sales"] is None:
            sales = rng.choice(["", "N/A", "-"])
        else:
            sales = f"{r['sales']:,}원" if rng.random() < 0.5 else f"{r['sales']:,}"

        temp = "" if r["avg_temp"] is None else str(r["avg_temp"])
        out.append([ds, wd, r["visitors"], sales, temp])

    # 중복 행 4개 심기
    for _ in range(4):
        out.append(list(out[rng.randrange(len(out))]))

    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["날짜", "요일", "방문객수", "매출", "평균기온"])
        w.writerows(out)
    return path


def write_weather(rows):
    """병합(merge) 실습용 — 일부 날짜가 일부러 빠져 있다."""
    rng = random.Random(SEED + 3)
    path = os.path.join(OUT_DIR, "weather.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["date", "avg_temp", "rain_mm", "weather"])
        for r in rows:
            if rng.random() < 0.03:                   # 3% 결측 → merge 실습 포인트
                continue
            t = r["avg_temp"]
            rain = r["rain_mm"]
            if rain > 15:
                desc = "비"
            elif rain > 0:
                desc = "약한비"
            elif t is not None and t >= 28:
                desc = "맑음"
            else:
                desc = rng.choice(["맑음", "구름많음", "흐림"])
            w.writerow([r["date"], "" if t is None else t, rain, desc])
    return path


def write_menu_orders(rows):
    """groupby 실습용 — 날짜 × 메뉴별 주문 건수와 금액."""
    rng = random.Random(SEED + 11)
    path = os.path.join(OUT_DIR, "menu_orders.csv")
    names = [m[0] for m in MENUS]
    prices = {m[0]: m[1] for m in MENUS}
    weights = [m[2] for m in MENUS]

    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["date", "menu", "category", "orders", "amount"])
        for r in rows:
            if r["visitors"] == 0:
                continue
            # 더운 날엔 아이스 계열(콜드브루)이 강해진다
            adj = list(weights)
            if r["avg_temp"] is not None and r["avg_temp"] >= 25:
                adj[names.index("콜드브루")] *= 1.8
                adj[names.index("카푸치노")] *= 0.7
            total = sum(adj)
            adj = [a / total for a in adj]

            for name, share in zip(names, adj):
                cnt = max(0, int(rng.gauss(r["visitors"] * share, r["visitors"] * share * 0.2)))
                if cnt == 0:
                    continue
                cat = "커피" if name in ("아메리카노", "에스프레소", "콜드브루",
                                        "디카페인 아메리카노") else "라떼/기타"
                w.writerow([r["date"], name, cat, cnt, cnt * prices[name]])
    return path


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    rows = build_rows()
    paths = [
        write_main(rows),
        write_messy(rows),
        write_weather(rows),
        write_menu_orders(rows),
    ]
    for p in paths:
        size = os.path.getsize(p) / 1024
        with open(p, encoding="utf-8") as f:
            n = sum(1 for _ in f) - 1
        print(f"{os.path.relpath(p, os.path.dirname(OUT_DIR)):32s} {n:6,d} rows  {size:7.1f} KB")


if __name__ == "__main__":
    main()
