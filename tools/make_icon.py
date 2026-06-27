#!/usr/bin/env python3
"""
キッズレーシング - アプリアイコン生成スクリプト

ゲーム本編 (racing_game.py) と同じ描画スタイルで、
草原のレース場を走るプレイヤーの赤い車のアイコンを描き、
iOS / PWA 用の各サイズ PNG を icons/ に書き出します。

実行: python3 tools/make_icon.py
"""
import os

# ヘッドレス実行 (ウィンドウ・音声不要)
os.environ.setdefault("SDL_VIDEODRIVER", "dummy")
os.environ.setdefault("SDL_AUDIODRIVER", "dummy")

import pygame
import pygame.gfxdraw as gfx

pygame.init()

BASE = 1024
CX = BASE // 2


def lerp(a, b, t):
    return int(a + (b - a) * t)


def vgradient(surface, top, bottom, y0, y1):
    """縦方向グラデーション"""
    h = max(1, y1 - y0)
    for y in range(y0, y1):
        t = (y - y0) / h
        c = (lerp(top[0], bottom[0], t),
             lerp(top[1], bottom[1], t),
             lerp(top[2], bottom[2], t))
        pygame.draw.line(surface, c, (0, y), (BASE, y))


def road_edges(y, top_y, bot_y, top_w, bot_w):
    t = (y - top_y) / (bot_y - top_y)
    w = top_w + (bot_w - top_w) * t
    return CX - w / 2, CX + w / 2


def draw_icon():
    surf = pygame.Surface((BASE, BASE))

    # --- 背景: 草原 (ステージ1のイメージ) ---
    vgradient(surf, (120, 205, 95), (55, 150, 60), 0, BASE)

    # 遠くの空っぽい明るさを上部に
    vgradient_overlay = pygame.Surface((BASE, BASE), pygame.SRCALPHA)
    for y in range(0, 260):
        a = int(120 * (1 - y / 260))
        pygame.draw.line(vgradient_overlay, (180, 230, 255, a), (0, y), (BASE, y))
    surf.blit(vgradient_overlay, (0, 0))

    # --- 道路 (奥に向かって細くなる台形) ---
    top_y, bot_y = 70, BASE
    top_w, bot_w = 380, 760
    road_color = (90, 90, 95)
    road_poly = [
        (CX - top_w / 2, top_y),
        (CX + top_w / 2, top_y),
        (CX + bot_w / 2, bot_y),
        (CX - bot_w / 2, bot_y),
    ]
    pts = [(int(x), int(y)) for x, y in road_poly]
    gfx.filled_polygon(surf, pts, road_color)
    gfx.aapolygon(surf, pts, road_color)

    # 路肩 (赤白) の縞
    for i in range(0, 26):
        y0 = top_y + (bot_y - top_y) * i / 26
        y1 = top_y + (bot_y - top_y) * (i + 1) / 26
        col = (220, 50, 50) if i % 2 == 0 else (255, 255, 255)
        l0, r0 = road_edges(y0, top_y, bot_y, top_w, bot_w)
        l1, r1 = road_edges(y1, top_y, bot_y, top_w, bot_w)
        wth = max(6, (r0 - l0) * 0.035)
        pygame.draw.polygon(surf, col, [
            (l0, y0), (l0 + wth, y0), (l1 + wth, y1), (l1, y1)])
        pygame.draw.polygon(surf, col, [
            (r0 - wth, y0), (r0, y0), (r1, y1), (r1 - wth, y1)])

    # 白い端線
    l_t, r_t = road_edges(top_y, top_y, bot_y, top_w, bot_w)
    l_b, r_b = road_edges(bot_y, top_y, bot_y, top_w, bot_w)
    pygame.draw.line(surf, (255, 255, 255), (l_t, top_y), (l_b, bot_y), 12)
    pygame.draw.line(surf, (255, 255, 255), (r_t, top_y), (r_b, bot_y), 12)

    # 中央の黄色い破線 (奥ほど細く)
    line_color = (255, 255, 200)
    n = 7
    for i in range(n):
        ya = top_y + (bot_y - top_y) * (i + 0.15) / n
        yb = top_y + (bot_y - top_y) * (i + 0.62) / n
        wa = top_w + (bot_w - top_w) * ((ya - top_y) / (bot_y - top_y))
        th = max(7, wa * 0.028)
        pygame.draw.line(surf, line_color, (CX, ya), (CX, yb), int(th))

    # --- ゴールの チェッカーフラッグ (奥) ---
    fy = top_y + 26
    cols = 8
    l, r = road_edges(fy, top_y, bot_y, top_w, bot_w)
    cw = (r - l) / cols
    for row in range(2):
        for c in range(cols):
            color = (25, 25, 25) if (row + c) % 2 == 0 else (240, 240, 240)
            pygame.draw.rect(surf, color,
                             (int(l + c * cw), int(fy + row * cw),
                              int(cw + 1), int(cw + 1)))

    # --- プレイヤーの赤い車 (ゲームと同じスタイルを大きく) ---
    car_w, car_h = 348, 540
    cxx = CX
    cyc = BASE - 300

    # 影
    shadow = pygame.Surface((BASE, BASE), pygame.SRCALPHA)
    pygame.draw.ellipse(shadow, (0, 0, 0, 90),
                        (cxx - car_w // 2 - 6, int(cyc + car_h * 0.36),
                         car_w + 12, 150))
    surf.blit(shadow, (0, 0))

    # タイヤ (本体の下からのぞく)
    tire = (35, 35, 35)
    tw, tht = 48, 128
    for dx in (-car_w // 2 + 2, car_w // 2 - 2 - tw):
        for dy in (-car_h // 2 + 64, car_h // 2 - 64 - tht):
            pygame.draw.rect(surf, tire,
                             (cxx + dx, cyc + dy, tw, tht), border_radius=20)

    # 車本体
    body = pygame.Rect(cxx - car_w // 2, cyc - car_h // 2, car_w, car_h)
    pygame.draw.rect(surf, (220, 50, 50), body, border_radius=76)
    # ふちの濃い赤
    pygame.draw.rect(surf, (165, 28, 28), body, width=12, border_radius=76)
    # ハイライト (上面の光沢)
    hi = pygame.Surface((BASE, BASE), pygame.SRCALPHA)
    pygame.draw.rect(hi, (255, 255, 255, 45),
                     (cxx - car_w // 2 + 24, cyc - car_h // 2 + 20,
                      car_w // 2 - 20, car_h - 60), border_radius=50)
    surf.blit(hi, (0, 0))

    # フロントガラス
    pygame.draw.rect(surf, (185, 222, 255),
                     (cxx - 116, cyc - 156, 232, 138), border_radius=44)
    # リアガラス
    pygame.draw.rect(surf, (150, 200, 245),
                     (cxx - 104, cyc + 54, 208, 116), border_radius=38)

    # ヘッドライト
    light = (255, 255, 210)
    for lx in (cxx - 84, cxx + 84):
        gfx.filled_circle(surf, lx, cyc - car_h // 2 + 44, 27, light)
        gfx.aacircle(surf, lx, cyc - car_h // 2 + 44, 27, light)

    # スピード線 (動きの演出)
    streak = pygame.Surface((BASE, BASE), pygame.SRCALPHA)
    for side in (-1, 1):
        x0 = cxx + side * (car_w // 2 + 54)
        for k, yy in enumerate((cyc - 150, cyc - 10, cyc + 130)):
            pygame.draw.line(streak, (255, 255, 255, 150),
                             (x0, yy), (x0, yy + 96), 12)
    surf.blit(streak, (0, 0))

    return surf


def main():
    icon = draw_icon()
    out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")
    os.makedirs(out_dir, exist_ok=True)

    sizes = {
        "apple-touch-icon.png": 180,
        "icon-120.png": 120,
        "icon-152.png": 152,
        "icon-167.png": 167,
        "icon-180.png": 180,
        "icon-192.png": 192,
        "icon-512.png": 512,
        "icon-1024.png": 1024,
        "favicon-32.png": 32,
    }
    for name, sz in sizes.items():
        scaled = pygame.transform.smoothscale(icon, (sz, sz))
        pygame.image.save(scaled, os.path.join(out_dir, name))
        print(f"  wrote icons/{name} ({sz}x{sz})")

    print("done.")


if __name__ == "__main__":
    main()
