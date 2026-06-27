#!/usr/bin/env python3
"""
キッズレーシング - 子供向けレースゲーム
5台の車でゴールまでの速さを競争！
操作: スペース=加速, 左右=操作, 下=ブレーキ
全10ステージ、徐々に難しくなる！
"""

import pygame
import sys
import random
import math
import os

# --- 初期設定 ---
pygame.init()
pygame.mixer.init()

SCREEN_WIDTH = 800
SCREEN_HEIGHT = 650
FPS = 60

# --- 色定義 ---
WHITE = (255, 255, 255)


BLACK = (0, 0, 0)
GRAY = (180, 180, 180)
DARK_GRAY = (100, 100, 100)
RED = (220, 50, 50)
BLUE = (50, 100, 220)
GREEN = (50, 200, 80)
YELLOW = (255, 220, 50)
ORANGE = (255, 150, 30)
PURPLE = (160, 80, 220)
PINK = (255, 130, 180)
CYAN = (50, 200, 220)
BROWN = (139, 90, 43)
DARK_GREEN = (30, 130, 30)
LIGHT_GREEN = (120, 220, 120)
ROAD_COLOR = (90, 90, 95)
LINE_COLOR = (255, 255, 200)
GRASS_COLOR = (80, 180, 60)
SAND_COLOR = (220, 200, 140)

# --- 車の色 ---
CAR_COLORS = [
    RED,        # プレイヤー
    BLUE,       # AI 1
    GREEN,      # AI 2
    ORANGE,     # AI 3
    PURPLE,     # AI 4
]
CAR_NAMES = ["あなた", "ブルー", "グリーン", "オレンジ", "パープル"]

# --- スクリーン ---
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("🏎️ キッズレーシング 🏎️")
clock = pygame.time.Clock()

# --- フォント ---
def get_font(size):
    """日本語対応フォントを取得"""
    font_paths = [
        "/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc",
        "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
        "/System/Library/Fonts/Hiragino Sans GB.ttc",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    ]
    for fp in font_paths:
        if os.path.exists(fp):
            try:
                return pygame.font.Font(fp, size)
            except:
                pass
    return pygame.font.SysFont("arial", size)

font_small = get_font(18)
font_medium = get_font(24)
font_large = get_font(36)
font_title = get_font(52)
font_huge = get_font(72)


# ======================================================
# サウンド生成 (pygame.mixer で簡易的に)
# ======================================================
def create_beep_sound(frequency=440, duration_ms=100, volume=0.3):
    """簡易ビープ音を生成"""
    sample_rate = 44100
    n_samples = int(sample_rate * duration_ms / 1000)
    buf = bytearray(n_samples * 2)
    for i in range(n_samples):
        t = i / sample_rate
        val = int(32767 * volume * math.sin(2 * math.pi * frequency * t))
        # フェードアウト
        fade = max(0, 1.0 - (i / n_samples) * 0.5)
        val = int(val * fade)
        val = max(-32768, min(32767, val))
        buf[i * 2] = val & 0xFF
        buf[i * 2 + 1] = (val >> 8) & 0xFF
    sound = pygame.mixer.Sound(buffer=bytes(buf))
    return sound

def create_bgm(tempo=140, bars=8, volume=0.08):
    """簡易BGMを生成（ループ用のポップな曲）"""
    sample_rate = 44100
    beat_duration = 60.0 / tempo
    total_duration = beat_duration * 4 * bars  # 4拍 x bars小節
    n_samples = int(sample_rate * total_duration)
    buf = bytearray(n_samples * 2)

    # メロディ (周波数リスト: C D E F G A B)
    notes = {
        'C4': 261.6, 'D4': 293.7, 'E4': 329.6, 'F4': 349.2,
        'G4': 392.0, 'A4': 440.0, 'B4': 493.9,
        'C5': 523.3, 'D5': 587.3, 'E5': 659.3,
    }
    # メロディパターン
    melody_pattern = [
        'C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'G4', 'A4',
        'F4', 'A4', 'C5', 'A4', 'G4', 'E4', 'D4', 'E4',
        'C4', 'G4', 'E4', 'C5', 'D5', 'C5', 'A4', 'G4',
        'F4', 'E4', 'D4', 'C4', 'D4', 'E4', 'G4', 'C5',
    ]
    # ベースパターン
    bass_pattern = [
        'C4', 'C4', 'F4', 'F4', 'G4', 'G4', 'C4', 'C4',
    ]

    beat_samples = int(sample_rate * beat_duration)
    half_beat = beat_samples // 2

    for i in range(n_samples):
        t = i / sample_rate
        beat_idx = int(t / beat_duration)
        beat_pos = (i % beat_samples) / beat_samples  # 0-1 within beat

        # メロディ
        mel_idx = beat_idx % len(melody_pattern)
        mel_freq = notes.get(melody_pattern[mel_idx], 261.6)
        # エンベロープ: アタック→減衰
        env = max(0, 1.0 - beat_pos * 1.5) * 0.5
        mel_val = math.sin(2 * math.pi * mel_freq * t) * env

        # ベース (半分の周波数)
        bass_idx = (beat_idx // 4) % len(bass_pattern)
        bass_freq = notes.get(bass_pattern[bass_idx], 130.8) * 0.5
        bass_env = max(0, 1.0 - beat_pos * 0.8) * 0.6
        bass_val = math.sin(2 * math.pi * bass_freq * t) * bass_env

        # ドラム (キック on 1,3 / ハイハット on every beat)
        kick = 0
        if beat_idx % 4 in (0, 2):
            kick_t = beat_pos
            if kick_t < 0.15:
                kick = math.sin(2 * math.pi * 80 * (1-kick_t*5) * t) * (1-kick_t/0.15) * 0.7
        hihat = 0
        if beat_pos < 0.05:
            hihat = random.uniform(-0.3, 0.3) * (1 - beat_pos/0.05)

        val = (mel_val + bass_val + kick + hihat) * volume
        ival = int(32767 * max(-1, min(1, val)))
        buf[i * 2] = ival & 0xFF
        buf[i * 2 + 1] = (ival >> 8) & 0xFF

    sound = pygame.mixer.Sound(buffer=bytes(buf))
    return sound

try:
    snd_accel = create_beep_sound(220, 50, 0.15)
    snd_crash = create_beep_sound(100, 200, 0.3)
    snd_goal = create_beep_sound(880, 300, 0.2)
    snd_countdown = create_beep_sound(660, 150, 0.2)
    snd_start = create_beep_sound(1320, 400, 0.25)
    snd_bgm = create_bgm(tempo=140, bars=8, volume=0.08)
except:
    snd_accel = snd_crash = snd_goal = snd_countdown = snd_start = snd_bgm = None


# ======================================================
# ステージ設定
# ======================================================
class StageConfig:
    """各ステージの設定"""
    def __init__(self, stage_num):
        self.stage_num = stage_num
        self.name = self._get_name()
        # ゴール距離(ピクセル。約90秒で到達するよう調整)
        self.goal_distance = 18000 + stage_num * 1500
        # 障害物の数
        self.obstacle_count = 5 + stage_num * 4
        # 障害物の種類の多さ
        self.obstacle_variety = min(stage_num, 5)
        # AI の強さ (0.0-1.0)
        self.ai_strength = 0.3 + stage_num * 0.06
        # 道幅 (狭くなるほど難しい)
        self.road_width = max(320, 440 - stage_num * 12)
        # レーン数
        self.lane_count = 5
        # 最大速度
        self.max_speed = 6.0 + stage_num * 0.3
        # 障害物の動き (ステージ5以降)
        self.moving_obstacles = stage_num >= 5
        # 天候効果
        self.weather = self._get_weather()
        # 背景色
        self.bg_colors = self._get_bg_colors()

    def _get_name(self):
        names = [
            "はじめての レース", "まちの サーキット", "うみぞいの ドライブ",
            "やまみちの チャレンジ", "さばくの ヒートラン", "もりの アドベンチャー",
            "よるの ハイウェイ", "ゆきの スリップコース", "かざんの デンジャーロード",
            "グランドファイナル"
        ]
        return names[min(self.stage_num - 1, 9)]

    def _get_weather(self):
        if self.stage_num <= 3:
            return "clear"
        elif self.stage_num <= 5:
            return random.choice(["clear", "clear", "rain"])
        elif self.stage_num <= 7:
            return random.choice(["clear", "rain", "rain"])
        else:
            return random.choice(["rain", "snow", "rain"])

    def _get_bg_colors(self):
        stage_bg = [
            (GRASS_COLOR, LIGHT_GREEN),        # 1: 草原
            (GRASS_COLOR, (180, 180, 180)),    # 2: 街
            ((100, 180, 220), SAND_COLOR),     # 3: 海沿い
            (DARK_GREEN, BROWN),               # 4: 山道
            (SAND_COLOR, (200, 180, 100)),     # 5: 砂漠
            (DARK_GREEN, (60, 120, 40)),       # 6: 森
            ((30, 30, 60), (40, 40, 50)),      # 7: 夜
            ((220, 230, 240), (200, 210, 220)),# 8: 雪
            ((80, 40, 30), (60, 30, 20)),      # 9: 火山
            ((50, 50, 80), (80, 50, 60)),      # 10: ファイナル
        ]
        idx = min(self.stage_num - 1, 9)
        return stage_bg[idx]


# ======================================================
# 車クラス
# ======================================================
class Car:
    WIDTH = 36
    HEIGHT = 60

    def __init__(self, color, name, lane, is_player=False):
        self.color = color
        self.name = name
        self.is_player = is_player
        self.lane = lane
        self.x = 0  # set by reset
        self.y = 0
        self.speed = 0.0
        self.max_speed = 6.0
        self.acceleration = 0.08
        self.brake_power = 0.15
        self.friction = 0.02
        self.steering_speed = 3.5
        self.distance = 0.0
        self.finished = False
        self.finish_time = 0
        self.finish_rank = 0
        self.invincible_timer = 0
        self.crash_timer = 0
        # AI用
        self.ai_target_speed = 0.0
        self.ai_dodge_dir = 0
        self.ai_think_timer = 0

    def reset(self, road_center_x, road_width, lane_count, start_y):
        lane_width = road_width / lane_count
        self.x = road_center_x - road_width / 2 + lane_width * self.lane + lane_width / 2
        self.y = start_y
        self.speed = 0.0
        self.distance = 0.0
        self.finished = False
        self.finish_time = 0
        self.finish_rank = 0
        self.invincible_timer = 0
        self.crash_timer = 0

    def draw(self, surface, camera_y):
        if self.finished and not self.is_player:
            return
        screen_y = self.y - camera_y
        if screen_y < -80 or screen_y > SCREEN_HEIGHT + 80:
            return

        # 点滅(無敵時間)
        if self.invincible_timer > 0 and (self.invincible_timer // 4) % 2 == 0:
            return

        cx, cy = int(self.x), int(screen_y)

        # 車本体
        body_rect = pygame.Rect(cx - self.WIDTH // 2, cy - self.HEIGHT // 2,
                                self.WIDTH, self.HEIGHT)
        pygame.draw.rect(surface, self.color, body_rect, border_radius=8)

        # 窓
        window_color = (180, 220, 255)
        wr = pygame.Rect(cx - 12, cy - 18, 24, 14)
        pygame.draw.rect(surface, window_color, wr, border_radius=4)

        # タイヤ
        tire_color = (40, 40, 40)
        for dx in [-self.WIDTH // 2 - 2, self.WIDTH // 2 - 4]:
            for dy in [-self.HEIGHT // 2 + 6, self.HEIGHT // 2 - 16]:
                tr = pygame.Rect(cx + dx, cy + dy, 6, 10)
                pygame.draw.rect(surface, tire_color, tr, border_radius=2)

        # ヘッドライト
        light_color = (255, 255, 200)
        pygame.draw.circle(surface, light_color, (cx - 10, cy - self.HEIGHT // 2 + 3), 4)
        pygame.draw.circle(surface, light_color, (cx + 10, cy - self.HEIGHT // 2 + 3), 4)

        # クラッシュ演出
        if self.crash_timer > 0:
            star_color = YELLOW
            for i in range(3):
                angle = (self.crash_timer * 10 + i * 120) * math.pi / 180
                sx = cx + int(math.cos(angle) * 30)
                sy = cy + int(math.sin(angle) * 30)
                pygame.draw.circle(surface, star_color, (sx, sy), 5)

    def update_ai(self, stage_config, obstacles, road_center_x, road_width, dt):
        """AIの行動"""
        if self.finished:
            return
        if self.crash_timer > 0:
            self.crash_timer -= 1
            self.speed *= 0.95
            return
        if self.invincible_timer > 0:
            self.invincible_timer -= 1

        self.ai_think_timer -= 1
        strength = stage_config.ai_strength

        # 定期的にAI思考
        if self.ai_think_timer <= 0:
            self.ai_think_timer = random.randint(15, 40)
            # 目標速度 (AIもmax_speedを超えて加速可能)
            ai_max = stage_config.max_speed * (1.0 + strength * 0.6)
            self.ai_target_speed = ai_max * (0.65 + strength * 0.30 + random.uniform(-0.08, 0.08))
            # 障害物回避判断
            self.ai_dodge_dir = 0
            for obs in obstacles:
                dx = obs.x - self.x
                dy = obs.y - self.y
                if -180 < dy < 20 and abs(dx) < 60:
                    self.ai_dodge_dir = -1 if dx > 0 else 1
                    break

        # 加速/減速
        ai_accel_rate = self.acceleration * (1.0 + strength * 0.6)
        if self.speed < self.ai_target_speed:
            self.speed += ai_accel_rate
        else:
            self.speed -= self.friction

        ai_speed_cap = stage_config.max_speed * (1.0 + strength * 0.6)
        self.speed = max(0, min(self.speed, ai_speed_cap))

        # ステアリング
        road_left = road_center_x - road_width / 2 + 25
        road_right = road_center_x + road_width / 2 - 25
        if self.ai_dodge_dir != 0:
            self.x += self.ai_dodge_dir * self.steering_speed * 0.8
        # 道路内に留まる
        if self.x < road_left + 20:
            self.x += self.steering_speed
        elif self.x > road_right - 20:
            self.x -= self.steering_speed

        # 移動
        self.y -= self.speed
        self.distance += self.speed

    def update_physics(self, road_center_x, road_width):
        """物理更新(プレイヤー用)"""
        # 摩擦
        if self.speed > 0:
            self.speed -= self.friction
        self.speed = max(0, self.speed)

        # 道路外でのペナルティ
        road_left = road_center_x - road_width / 2
        road_right = road_center_x + road_width / 2
        if self.x < road_left or self.x > road_right:
            self.speed *= 0.96

        # 移動
        self.y -= self.speed
        self.distance += self.speed

        # 壁制限
        margin = 50
        self.x = max(margin, min(SCREEN_WIDTH - margin, self.x))

        # タイマー
        if self.invincible_timer > 0:
            self.invincible_timer -= 1
        if self.crash_timer > 0:
            self.crash_timer -= 1


# ======================================================
# 障害物クラス
# ======================================================
class Obstacle:
    def __init__(self, x, y, obs_type="cone", moving=False):
        self.x = x
        self.y = y
        self.type = obs_type
        self.width = 30
        self.height = 30
        self.moving = moving
        self.move_dir = random.choice([-1, 1])
        self.move_speed = random.uniform(0.5, 1.5)
        self.move_range = random.uniform(30, 60)
        self.origin_x = x
        self.timer = random.uniform(0, math.pi * 2)
        self._set_size()

    def _set_size(self):
        if self.type == "cone":
            self.width, self.height = 20, 20
        elif self.type == "rock":
            self.width, self.height = 36, 32
        elif self.type == "puddle":
            self.width, self.height = 50, 30
        elif self.type == "oil":
            self.width, self.height = 40, 40
        elif self.type == "barrier":
            self.width, self.height = 60, 20

    def update(self):
        if self.moving:
            self.timer += 0.03
            self.x = self.origin_x + math.sin(self.timer) * self.move_range

    def draw(self, surface, camera_y):
        screen_y = self.y - camera_y
        if screen_y < -50 or screen_y > SCREEN_HEIGHT + 50:
            return

        cx, cy = int(self.x), int(screen_y)

        if self.type == "cone":
            # コーン (三角)
            pygame.draw.polygon(surface, ORANGE,
                                [(cx, cy - 12), (cx - 10, cy + 8), (cx + 10, cy + 8)])
            pygame.draw.rect(surface, WHITE, (cx - 12, cy + 8, 24, 5))
        elif self.type == "rock":
            # 岩
            pygame.draw.ellipse(surface, DARK_GRAY,
                                (cx - 18, cy - 16, 36, 32))
            pygame.draw.ellipse(surface, GRAY,
                                (cx - 14, cy - 12, 20, 16))
        elif self.type == "puddle":
            # 水たまり
            pygame.draw.ellipse(surface, (60, 120, 200),
                                (cx - 25, cy - 15, 50, 30))
            pygame.draw.ellipse(surface, (100, 160, 230),
                                (cx - 18, cy - 10, 30, 16))
        elif self.type == "oil":
            # オイル
            pygame.draw.ellipse(surface, (30, 30, 30),
                                (cx - 20, cy - 20, 40, 40))
            pygame.draw.ellipse(surface, (50, 50, 60),
                                (cx - 14, cy - 14, 24, 20))
        elif self.type == "barrier":
            # バリア
            pygame.draw.rect(surface, RED, (cx - 30, cy - 10, 60, 20))
            pygame.draw.rect(surface, WHITE, (cx - 30, cy - 10, 15, 20))
            pygame.draw.rect(surface, WHITE, (cx, cy - 10, 15, 20))

    def check_collision(self, car):
        """車との衝突判定"""
        if car.invincible_timer > 0:
            return False
        car_rect = pygame.Rect(car.x - car.WIDTH // 2, car.y - car.HEIGHT // 2,
                               car.WIDTH, car.HEIGHT)
        obs_rect = pygame.Rect(self.x - self.width // 2, self.y - self.height // 2,
                               self.width, self.height)
        return car_rect.colliderect(obs_rect)


# ======================================================
# パーティクル
# ======================================================
class Particle:
    def __init__(self, x, y, color, vx=0, vy=0, life=30):
        self.x = x
        self.y = y
        self.color = color
        self.vx = vx + random.uniform(-2, 2)
        self.vy = vy + random.uniform(-2, 2)
        self.life = life
        self.max_life = life

    def update(self):
        self.x += self.vx
        self.y += self.vy
        self.life -= 1
        self.vy += 0.05  # 重力

    def draw(self, surface, camera_y):
        if self.life <= 0:
            return
        alpha = self.life / self.max_life
        r = max(2, int(4 * alpha))
        screen_y = int(self.y - camera_y)
        if 0 <= screen_y <= SCREEN_HEIGHT:
            pygame.draw.circle(surface, self.color, (int(self.x), screen_y), r)


# ======================================================
# 天候エフェクト
# ======================================================
class WeatherEffect:
    def __init__(self, weather_type):
        self.type = weather_type
        self.drops = []
        if weather_type == "rain":
            for _ in range(80):
                self.drops.append([random.randint(0, SCREEN_WIDTH),
                                   random.randint(0, SCREEN_HEIGHT),
                                   random.uniform(4, 8)])
        elif weather_type == "snow":
            for _ in range(60):
                self.drops.append([random.randint(0, SCREEN_WIDTH),
                                   random.randint(0, SCREEN_HEIGHT),
                                   random.uniform(1, 3)])

    def update(self):
        if self.type == "rain":
            for d in self.drops:
                d[1] += d[2] * 2
                d[0] += 1
                if d[1] > SCREEN_HEIGHT:
                    d[0] = random.randint(0, SCREEN_WIDTH)
                    d[1] = -10
        elif self.type == "snow":
            for d in self.drops:
                d[1] += d[2]
                d[0] += math.sin(d[1] * 0.02) * 0.5
                if d[1] > SCREEN_HEIGHT:
                    d[0] = random.randint(0, SCREEN_WIDTH)
                    d[1] = -10

    def draw(self, surface):
        if self.type == "rain":
            for d in self.drops:
                x, y, spd = d
                pygame.draw.line(surface, (150, 180, 220),
                                 (int(x), int(y)), (int(x + 1), int(y + 6)), 1)
        elif self.type == "snow":
            for d in self.drops:
                x, y, spd = d
                r = max(1, int(spd))
                pygame.draw.circle(surface, WHITE, (int(x), int(y)), r)


# ======================================================
# ゲーム本体クラス
# ======================================================
class RacingGame:
    def __init__(self):
        self.state = "title"  # title, stage_select, countdown, racing, result, game_clear
        self.current_stage = 1
        self.stage_config = None
        self.cars = []
        self.obstacles = []
        self.particles = []
        self.weather = None
        self.camera_y = 0
        self.race_time = 0
        self.countdown = 0
        self.countdown_timer = 0
        self.finish_order = []
        self.road_center_x = SCREEN_WIDTH // 2
        self.road_marks_offset = 0
        self.cleared_stages = set()
        self.title_anim = 0
        self.result_timer = 0
        self.bgm_playing = False
        # タイトルBGM開始
        self._start_bgm()

    # --- ステージ初期化 ---
    def init_stage(self, stage_num):
        self.current_stage = stage_num
        self.stage_config = StageConfig(stage_num)
        self.road_center_x = SCREEN_WIDTH // 2

        # 車を生成
        self.cars = []
        for i in range(5):
            car = Car(CAR_COLORS[i], CAR_NAMES[i], i, is_player=(i == 0))
            car.max_speed = self.stage_config.max_speed
            self.cars.append(car)

        # 位置をリセット
        start_y = 0
        for i, car in enumerate(self.cars):
            row = i // 3
            car.reset(self.road_center_x, self.stage_config.road_width,
                      self.stage_config.lane_count, start_y + row * 80)

        # 障害物を生成
        self._generate_obstacles()

        # 天候
        if self.stage_config.weather != "clear":
            self.weather = WeatherEffect(self.stage_config.weather)
        else:
            self.weather = None

        self.particles = []
        self.camera_y = -SCREEN_HEIGHT // 2
        self.race_time = 0
        self.finish_order = []
        self.road_marks_offset = 0

        # カウントダウン開始
        self.state = "countdown"
        self.countdown = 3
        self.countdown_timer = FPS

        # BGM開始
        self._start_bgm()

    def _start_bgm(self):
        """BGMをループ再生(小さめ音量)"""
        if snd_bgm:
            snd_bgm.play(loops=-1)
            snd_bgm.set_volume(0.08)
            self.bgm_playing = True

    def _stop_bgm(self):
        """BGM停止"""
        if snd_bgm:
            snd_bgm.stop()
            self.bgm_playing = False

    def _generate_obstacles(self):
        """障害物を配置"""
        self.obstacles = []
        cfg = self.stage_config
        road_left = self.road_center_x - cfg.road_width // 2 + 30
        road_right = self.road_center_x + cfg.road_width // 2 - 30

        types = ["cone"]
        if cfg.obstacle_variety >= 2:
            types.append("rock")
        if cfg.obstacle_variety >= 3:
            types.append("puddle")
        if cfg.obstacle_variety >= 4:
            types.append("oil")
        if cfg.obstacle_variety >= 5:
            types.append("barrier")

        # ゴール距離に合わせて均等に配置
        spacing = cfg.goal_distance / (cfg.obstacle_count + 1)
        for i in range(cfg.obstacle_count):
            y = -(spacing * (i + 1))
            x = random.randint(int(road_left), int(road_right))
            obs_type = random.choice(types)
            moving = cfg.moving_obstacles and random.random() < 0.3
            self.obstacles.append(Obstacle(x, y, obs_type, moving))

    # --- 更新 ---
    def update(self):
        if self.state == "countdown":
            self._update_countdown()
        elif self.state == "racing":
            self._update_racing()
        elif self.state == "result":
            self.result_timer += 1

        self.title_anim += 1

    def _update_countdown(self):
        self.countdown_timer -= 1
        if self.countdown_timer <= 0:
            self.countdown -= 1
            self.countdown_timer = FPS
            if self.countdown > 0:
                if snd_countdown:
                    snd_countdown.play()
            elif self.countdown == 0:
                if snd_start:
                    snd_start.play()
                self.state = "racing"

    def _update_racing(self):
        self.race_time += 1
        keys = pygame.key.get_pressed()
        player = self.cars[0]

        # --- プレイヤー操作 ---
        if not player.finished and player.crash_timer <= 0:
            # 加速 (スペースを押し続けるとmax_speedが徐々に上がる)
            if keys[pygame.K_SPACE]:
                player.speed += player.acceleration
                # 最大速度を徐々に上昇させる(上限あり)
                speed_cap = self.stage_config.max_speed * 1.8
                if player.max_speed < speed_cap:
                    player.max_speed += 0.005
                if player.speed > player.max_speed:
                    player.speed = player.max_speed
            else:
                # スペースを離すと最大速度がゆっくり下がる
                base_max = self.stage_config.max_speed
                if player.max_speed > base_max:
                    player.max_speed -= 0.01
            # ブレーキ
            if keys[pygame.K_DOWN]:
                player.speed -= player.brake_power
                if player.speed < 0:
                    player.speed = 0
            # 左右
            if keys[pygame.K_LEFT]:
                player.x -= player.steering_speed
            if keys[pygame.K_RIGHT]:
                player.x += player.steering_speed

        # プレイヤー物理更新
        if not player.finished:
            player.update_physics(self.road_center_x, self.stage_config.road_width)
        elif player.crash_timer > 0:
            player.crash_timer -= 1

        # --- AI更新 ---
        for car in self.cars[1:]:
            if not car.finished:
                car.update_ai(self.stage_config, self.obstacles,
                              self.road_center_x, self.stage_config.road_width, 1)

        # --- 障害物更新 ---
        for obs in self.obstacles:
            obs.update()

        # --- 衝突判定 ---
        for car in self.cars:
            if car.finished:
                continue
            for obs in self.obstacles:
                if obs.check_collision(car):
                    self._handle_collision(car, obs)

        # --- ゴール判定 ---
        for car in self.cars:
            if not car.finished and car.distance >= self.stage_config.goal_distance:
                car.finished = True
                car.finish_time = self.race_time
                car.finish_rank = len(self.finish_order) + 1
                self.finish_order.append(car)
                if car.is_player:
                    if snd_goal:
                        snd_goal.play()

        # プレイヤーがゴールしたら即リザルトへ（他車は予測タイム）
        if player.finished and self.state == "racing":
            self._finish_race_with_predictions()

        # 制限時間(120秒)でも終了
        time_up = self.race_time > 120 * FPS
        if time_up and self.state == "racing":
            player.finished = True
            player.finish_time = self.race_time
            if player not in self.finish_order:
                player.finish_rank = len(self.finish_order) + 1
                self.finish_order.append(player)
            self._finish_race_with_predictions()

        # --- カメラ ---
        if not player.finished:
            self.camera_y = player.y - SCREEN_HEIGHT * 0.65
        # ゴール後はカメラ固定（スクロール停止）

        # --- パーティクル ---
        self.particles = [p for p in self.particles if p.life > 0]
        for p in self.particles:
            p.update()

        # --- 天候 ---
        if self.weather:
            self.weather.update()

        # --- 道路マーク ---
        if not player.finished:
            self.road_marks_offset = (self.road_marks_offset + player.speed) % 40

    def _finish_race_with_predictions(self):
        """プレイヤーゴール時に他車の予測タイムを計算してリザルトへ"""
        player = self.cars[0]
        goal_dist = self.stage_config.goal_distance

        # 未ゴールの車の予測タイムを計算
        unfinished = [c for c in self.cars if not c.finished]
        for c in unfinished:
            if c.speed > 0.1:
                remaining = goal_dist - c.distance
                # 現在速度から予測タイムを計算（少しランダム性を加える）
                avg_speed = c.speed * random.uniform(0.85, 1.05)
                predicted_frames = remaining / avg_speed
                c.finish_time = int(self.race_time + predicted_frames)
            else:
                # ほぼ停止中 → 大きめの予測
                c.finish_time = int(self.race_time + random.randint(300, 600))
            c.finished = True

        # 全車を予測タイム順にソート
        unfinished.sort(key=lambda c: c.finish_time)
        for c in unfinished:
            c.finish_rank = len(self.finish_order) + 1
            self.finish_order.append(c)

        self.state = "result"
        self.result_timer = 0
        # 3位以内ならクリア
        if player.finish_rank <= 3:
            self.cleared_stages.add(self.current_stage)

    def _handle_collision(self, car, obs):
        """衝突処理"""
        if car.invincible_timer > 0:
            return

        if obs.type == "puddle":
            # 水たまり: 少し減速
            car.speed *= 0.8
        elif obs.type == "oil":
            # オイル: 大きく減速+スリップ
            car.speed *= 0.6
            car.x += random.uniform(-20, 20)
        else:
            # コーン/岩/バリア: クラッシュ
            car.speed *= 0.3
            car.crash_timer = 30

        car.invincible_timer = 60

        if car.is_player and snd_crash:
            snd_crash.play()

        # パーティクル
        for _ in range(8):
            self.particles.append(
                Particle(car.x, car.y, YELLOW,
                         random.uniform(-3, 3), random.uniform(-3, 3), 20))

    # --- 描画 ---
    def draw(self):
        if self.state == "title":
            self._draw_title()
        elif self.state == "stage_select":
            self._draw_stage_select()
        elif self.state in ("countdown", "racing"):
            self._draw_race()
            if self.state == "countdown":
                self._draw_countdown()
            else:
                self._draw_hud()
        elif self.state == "result":
            self._draw_race()
            self._draw_result()
        elif self.state == "game_clear":
            self._draw_game_clear()

    def _draw_title(self):
        """タイトル画面"""
        screen.fill((30, 30, 60))

        # 背景の装飾道路
        for i in range(10):
            y = (self.title_anim * 2 + i * 70) % (SCREEN_HEIGHT + 100) - 50
            pygame.draw.rect(screen, ROAD_COLOR, (300, y, 200, 50))
            pygame.draw.rect(screen, LINE_COLOR, (395, y + 10, 10, 30))

        # タイトル
        wave = math.sin(self.title_anim * 0.05) * 10
        title_text = font_title.render("キッズレーシング", True, YELLOW)
        tr = title_text.get_rect(center=(SCREEN_WIDTH // 2, 160 + wave))
        # 影
        shadow = font_title.render("キッズレーシング", True, (80, 60, 0))
        screen.blit(shadow, (tr.x + 3, tr.y + 3))
        screen.blit(title_text, tr)

        # サブタイトル
        sub = font_medium.render("🏎️  5だいの くるまで レース！ 🏎️", True, WHITE)
        sr = sub.get_rect(center=(SCREEN_WIDTH // 2, 240))
        screen.blit(sub, sr)

        # 車のアニメーション
        car_x = (self.title_anim * 3) % (SCREEN_WIDTH + 200) - 100
        for i, color in enumerate(CAR_COLORS):
            cx = car_x - i * 80
            cy = 330
            rect = pygame.Rect(cx - 18, cy - 30, 36, 60)
            pygame.draw.rect(screen, color, rect, border_radius=8)
            wr = pygame.Rect(cx - 12, cy - 18, 24, 14)
            pygame.draw.rect(screen, (180, 220, 255), wr, border_radius=4)

        # 操作説明
        controls = [
            "スペース: かそく",
            "← →: そうさ",
            "↓: ブレーキ",
            "3いないに ゴールしよう！",
        ]
        for i, text in enumerate(controls):
            ct = font_small.render(text, True, (200, 200, 220))
            screen.blit(ct, (SCREEN_WIDTH // 2 - ct.get_width() // 2, 420 + i * 30))

        # スタートボタン
        pulse = int(abs(math.sin(self.title_anim * 0.08)) * 50)
        btn_color = (50 + pulse, 200 + pulse // 3, 50 + pulse)
        btn_rect = pygame.Rect(SCREEN_WIDTH // 2 - 140, 555, 280, 55)
        pygame.draw.rect(screen, btn_color, btn_rect, border_radius=12)
        pygame.draw.rect(screen, WHITE, btn_rect, 3, border_radius=12)
        btn_text = font_medium.render("スペースで スタート！", True, WHITE)
        screen.blit(btn_text, btn_text.get_rect(center=btn_rect.center))

    def _draw_stage_select(self):
        """ステージ選択画面"""
        screen.fill((20, 20, 50))

        title = font_large.render("ステージ せんたく", True, YELLOW)
        screen.blit(title, title.get_rect(center=(SCREEN_WIDTH // 2, 50)))

        for i in range(10):
            stage_num = i + 1
            col = i % 5
            row = i // 5
            x = 60 + col * 145
            y = 110 + row * 220

            locked = stage_num > 1 and (stage_num - 1) not in self.cleared_stages
            cleared = stage_num in self.cleared_stages

            # ボックス
            box_rect = pygame.Rect(x, y, 130, 190)
            if locked:
                box_color = (60, 60, 70)
            elif cleared:
                box_color = (40, 100, 50)
            else:
                box_color = (50, 60, 120)

            pygame.draw.rect(screen, box_color, box_rect, border_radius=10)
            pygame.draw.rect(screen, WHITE if not locked else GRAY, box_rect, 2, border_radius=10)

            # ステージ番号
            num_text = font_large.render(f"{stage_num}", True, WHITE if not locked else GRAY)
            screen.blit(num_text, num_text.get_rect(center=(x + 65, y + 40)))

            # ステージ名
            cfg = StageConfig(stage_num)
            name_lines = cfg.name.split(" ")
            for j, line in enumerate(name_lines):
                nt = font_small.render(line, True, WHITE if not locked else GRAY)
                screen.blit(nt, nt.get_rect(center=(x + 65, y + 80 + j * 22)))

            # 状態
            if locked:
                lock_text = font_small.render("🔒", True, GRAY)
                screen.blit(lock_text, lock_text.get_rect(center=(x + 65, y + 150)))
            elif cleared:
                clear_text = font_small.render("⭐ クリア！", True, YELLOW)
                screen.blit(clear_text, clear_text.get_rect(center=(x + 65, y + 150)))
            else:
                play_text = font_small.render("▶ プレイ", True, CYAN)
                screen.blit(play_text, play_text.get_rect(center=(x + 65, y + 150)))

            # キー表示
            key_label = font_small.render(f"[{stage_num}]" if stage_num <= 9 else "[0]", True,
                                          WHITE if not locked else GRAY)
            screen.blit(key_label, key_label.get_rect(center=(x + 65, y + 175)))

        # 戻る
        back = font_small.render("[ESC] もどる", True, (180, 180, 180))
        screen.blit(back, (20, SCREEN_HEIGHT - 30))

    def _draw_race(self):
        """レース画面"""
        cfg = self.stage_config
        bg1, bg2 = cfg.bg_colors

        # 背景
        screen.fill(bg1)

        # 道路
        road_left = self.road_center_x - cfg.road_width // 2
        road_right = self.road_center_x + cfg.road_width // 2

        # 草/砂地テクスチャ(簡易)
        pygame.draw.rect(screen, bg2, (0, 0, road_left, SCREEN_HEIGHT))
        pygame.draw.rect(screen, bg2, (road_right, 0, SCREEN_WIDTH - road_right, SCREEN_HEIGHT))

        # 道路本体
        pygame.draw.rect(screen, ROAD_COLOR, (road_left, 0, cfg.road_width, SCREEN_HEIGHT))

        # 道路の端線
        pygame.draw.rect(screen, WHITE, (road_left, 0, 4, SCREEN_HEIGHT))
        pygame.draw.rect(screen, WHITE, (road_right - 4, 0, 4, SCREEN_HEIGHT))

        # 白線(点線)
        lane_width = cfg.road_width / cfg.lane_count
        mark_offset = self.road_marks_offset
        for lane in range(1, cfg.lane_count):
            lx = road_left + lane * lane_width
            for my in range(-40, SCREEN_HEIGHT + 40, 40):
                y_pos = my + mark_offset
                if 0 <= y_pos <= SCREEN_HEIGHT:
                    pygame.draw.rect(screen, LINE_COLOR,
                                     (int(lx) - 2, int(y_pos), 4, 20))

        # 路肩の模様
        for y in range(-40, SCREEN_HEIGHT + 40, 20):
            y_pos = y + (mark_offset % 20)
            if 0 <= y_pos <= SCREEN_HEIGHT:
                if (y // 20) % 2 == 0:
                    pygame.draw.rect(screen, RED, (road_left - 8, int(y_pos), 8, 10))
                    pygame.draw.rect(screen, RED, (road_right, int(y_pos), 8, 10))
                else:
                    pygame.draw.rect(screen, WHITE, (road_left - 8, int(y_pos), 8, 10))
                    pygame.draw.rect(screen, WHITE, (road_right, int(y_pos), 8, 10))

        # ゴールライン
        goal_y = -(cfg.goal_distance)
        goal_screen_y = goal_y - self.camera_y
        if -20 < goal_screen_y < SCREEN_HEIGHT + 20:
            for gx in range(road_left, road_right, 20):
                color = BLACK if ((gx - road_left) // 20) % 2 == 0 else WHITE
                pygame.draw.rect(screen, color, (gx, int(goal_screen_y), 20, 12))
                color2 = WHITE if color == BLACK else BLACK
                pygame.draw.rect(screen, color2, (gx, int(goal_screen_y) + 12, 20, 12))
            # ゴールテキスト
            gt = font_large.render("🏁 GOAL 🏁", True, YELLOW)
            gtr = gt.get_rect(center=(self.road_center_x, int(goal_screen_y) - 25))
            screen.blit(gt, gtr)

        # 障害物描画
        for obs in self.obstacles:
            obs.draw(screen, self.camera_y)

        # パーティクル
        for p in self.particles:
            p.draw(screen, self.camera_y)

        # 車描画(後ろから前へ)
        sorted_cars = sorted(self.cars, key=lambda c: -c.y)
        for car in sorted_cars:
            car.draw(screen, self.camera_y)

        # 天候
        if self.weather:
            self.weather.draw(screen)

    def _draw_countdown(self):
        """カウントダウン表示"""
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 100))
        screen.blit(overlay, (0, 0))

        if self.countdown > 0:
            scale = 1.0 + (self.countdown_timer / FPS) * 0.5
            size = int(80 * scale)
            f = get_font(size)
            text = f.render(str(self.countdown), True, YELLOW)
        else:
            text = font_huge.render("GO!", True, GREEN)

        tr = text.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2))
        # 影
        shadow = font_huge.render("GO!" if self.countdown == 0 else str(max(1, self.countdown)),
                                  True, (50, 50, 50))
        screen.blit(shadow, (tr.x + 3, tr.y + 3))
        screen.blit(text, tr)

        # ステージ名
        sn = font_medium.render(f"ステージ {self.current_stage}: {self.stage_config.name}",
                                True, WHITE)
        screen.blit(sn, sn.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 + 80)))

    def _draw_hud(self):
        """レース中のHUD"""
        player = self.cars[0]
        cfg = self.stage_config

        # 半透明パネル
        panel = pygame.Surface((220, 160), pygame.SRCALPHA)
        panel.fill((0, 0, 0, 140))
        screen.blit(panel, (5, 5))

        # タイム
        seconds = self.race_time / FPS
        time_text = font_medium.render(f"タイム: {seconds:.1f}秒", True, WHITE)
        screen.blit(time_text, (15, 12))

        # スピードメーター
        speed_pct = player.speed / cfg.max_speed
        speed_text = font_small.render(f"スピード:", True, WHITE)
        screen.blit(speed_text, (15, 45))
        bar_bg = pygame.Rect(110, 48, 100, 16)
        pygame.draw.rect(screen, DARK_GRAY, bar_bg, border_radius=4)
        bar_fill = pygame.Rect(110, 48, int(100 * speed_pct), 16)
        bar_color = GREEN if speed_pct < 0.7 else (YELLOW if speed_pct < 0.9 else RED)
        pygame.draw.rect(screen, bar_color, bar_fill, border_radius=4)

        # 進行度
        progress = min(1.0, player.distance / cfg.goal_distance)
        prog_text = font_small.render(f"ゴールまで:", True, WHITE)
        screen.blit(prog_text, (15, 75))
        pbar_bg = pygame.Rect(15, 98, 195, 14)
        pygame.draw.rect(screen, DARK_GRAY, pbar_bg, border_radius=4)
        pbar_fill = pygame.Rect(15, 98, int(195 * progress), 14)
        pygame.draw.rect(screen, CYAN, pbar_fill, border_radius=4)
        pct_text = font_small.render(f"{int(progress * 100)}%", True, WHITE)
        screen.blit(pct_text, (100, 95))

        # 順位表示
        rank = self._get_current_rank()
        rank_colors = {1: YELLOW, 2: (200, 200, 200), 3: (200, 150, 80)}
        rank_color = rank_colors.get(rank, WHITE)
        rank_text = font_large.render(f"{rank}い", True, rank_color)
        screen.blit(rank_text, (15, 120))

        # ステージ表示
        stage_text = font_small.render(f"ステージ {self.current_stage}", True, YELLOW)
        screen.blit(stage_text, (SCREEN_WIDTH - 130, 12))

        # ミニマップ(右側)
        self._draw_minimap()

    def _get_current_rank(self):
        """現在順位を取得"""
        player = self.cars[0]
        rank = 1
        for car in self.cars[1:]:
            if car.distance > player.distance:
                rank += 1
        return rank

    def _draw_minimap(self):
        """ミニマップ"""
        mx, my, mw, mh = SCREEN_WIDTH - 45, 50, 30, 200
        panel = pygame.Surface((mw + 10, mh + 10), pygame.SRCALPHA)
        panel.fill((0, 0, 0, 120))
        screen.blit(panel, (mx - 5, my - 5))

        # 道
        pygame.draw.rect(screen, DARK_GRAY, (mx + 5, my, 20, mh))

        goal_dist = self.stage_config.goal_distance

        # 各車の位置
        for car in self.cars:
            progress = min(1.0, car.distance / goal_dist)
            dot_y = my + mh - int(mh * progress)
            pygame.draw.circle(screen, car.color, (mx + 15, dot_y), 5)
            if car.is_player:
                pygame.draw.circle(screen, WHITE, (mx + 15, dot_y), 5, 2)

        # ゴールライン
        pygame.draw.line(screen, YELLOW, (mx, my + 3), (mx + mw, my + 3), 2)
        g_text = font_small.render("G", True, YELLOW)
        screen.blit(g_text, (mx + mw + 2, my - 5))

    def _draw_result(self):
        """リザルト画面"""
        overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 180))
        screen.blit(overlay, (0, 0))

        player = self.cars[0]

        # タイトル
        if player.finish_rank <= 3:
            result_title = "🎉 クリア！ 🎉"
            title_color = YELLOW
        else:
            result_title = "😢 ざんねん..."
            title_color = (180, 180, 180)

        rt = font_large.render(result_title, True, title_color)
        screen.blit(rt, rt.get_rect(center=(SCREEN_WIDTH // 2, 80)))

        # 順位表
        for i, car in enumerate(self.finish_order[:5]):
            y = 140 + i * 55
            rank = i + 1

            # 背景バー
            bar_color = (60, 60, 100) if not car.is_player else (80, 60, 30)
            bar = pygame.Rect(150, y, 500, 45)
            pygame.draw.rect(screen, bar_color, bar, border_radius=8)

            # 順位
            rank_colors = {1: YELLOW, 2: (200, 200, 200), 3: (200, 150, 80)}
            rc = rank_colors.get(rank, WHITE)
            rank_t = font_medium.render(f"{rank}い", True, rc)
            screen.blit(rank_t, (170, y + 10))

            # 車の色ドット
            pygame.draw.circle(screen, car.color, (250, y + 22), 12)

            # 名前
            name_t = font_medium.render(car.name, True, WHITE)
            screen.blit(name_t, (275, y + 10))

            # タイム
            time_sec = car.finish_time / FPS
            time_t = font_small.render(f"{time_sec:.1f}秒", True, (180, 180, 180))
            screen.blit(time_t, (540, y + 12))

        # ボタン表示
        if self.result_timer > 60:
            if player.finish_rank <= 3:
                if self.current_stage < 10:
                    btn_text = "スペース: つぎの ステージへ"
                else:
                    btn_text = "スペース: エンディングへ"
            else:
                btn_text = "スペース: もういちど / ESC: ステージせんたく"

            bt = font_small.render(btn_text, True, (200, 200, 220))
            screen.blit(bt, bt.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT - 60)))

    def _draw_game_clear(self):
        """全ステージクリア画面"""
        screen.fill((10, 10, 30))

        # 紙吹雪
        for i in range(50):
            x = (self.title_anim * (i * 7 % 5 + 1) + i * 137) % SCREEN_WIDTH
            y = (self.title_anim * (i * 3 % 4 + 1) + i * 97) % SCREEN_HEIGHT
            color = random.choice([RED, YELLOW, GREEN, BLUE, PINK, CYAN, ORANGE])
            pygame.draw.circle(screen, color, (int(x), int(y)), 4)

        # テキスト
        wave = math.sin(self.title_anim * 0.05) * 8
        ct = font_title.render("🏆 おめでとう！ 🏆", True, YELLOW)
        screen.blit(ct, ct.get_rect(center=(SCREEN_WIDTH // 2, 150 + wave)))

        ct2 = font_large.render("ぜんステージ クリア！", True, WHITE)
        screen.blit(ct2, ct2.get_rect(center=(SCREEN_WIDTH // 2, 240)))

        ct3 = font_medium.render("きみは さいこうの レーサーだ！", True, CYAN)
        screen.blit(ct3, ct3.get_rect(center=(SCREEN_WIDTH // 2, 310)))

        # 車パレード
        for i, color in enumerate(CAR_COLORS):
            x = SCREEN_WIDTH // 2 + (i - 2) * 70
            y = 400 + math.sin(self.title_anim * 0.08 + i) * 15
            rect = pygame.Rect(x - 18, int(y) - 30, 36, 60)
            pygame.draw.rect(screen, color, rect, border_radius=8)
            wr = pygame.Rect(x - 12, int(y) - 18, 24, 14)
            pygame.draw.rect(screen, (180, 220, 255), wr, border_radius=4)

        # 戻るボタン
        bt = font_small.render("スペース: タイトルへ もどる", True, (200, 200, 220))
        screen.blit(bt, bt.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT - 60)))

    # --- イベント処理 ---
    def handle_event(self, event):
        if event.type == pygame.QUIT:
            return False

        if event.type == pygame.KEYDOWN:
            if self.state == "title":
                if event.key == pygame.K_SPACE:
                    self.state = "stage_select"
            elif self.state == "stage_select":
                self._handle_stage_select_key(event.key)
            elif self.state == "result":
                if self.result_timer > 60:
                    if event.key == pygame.K_SPACE:
                        player = self.cars[0]
                        if player.finish_rank <= 3:
                            if self.current_stage < 10:
                                self.init_stage(self.current_stage + 1)
                            else:
                                self.state = "game_clear"
                        else:
                            # リトライ
                            self.init_stage(self.current_stage)
                    elif event.key == pygame.K_ESCAPE:
                        self.state = "stage_select"
            elif self.state == "game_clear":
                if event.key == pygame.K_SPACE:
                    self.state = "title"
            elif self.state == "racing":
                if event.key == pygame.K_ESCAPE:
                    self.state = "stage_select"
                    self._stop_bgm()

        return True

    def _handle_stage_select_key(self, key):
        key_map = {
            pygame.K_1: 1, pygame.K_2: 2, pygame.K_3: 3,
            pygame.K_4: 4, pygame.K_5: 5, pygame.K_6: 6,
            pygame.K_7: 7, pygame.K_8: 8, pygame.K_9: 9,
            pygame.K_0: 10,
        }
        if key in key_map:
            stage = key_map[key]
            # ステージ1は常にアンロック
            if stage == 1 or (stage - 1) in self.cleared_stages:
                self.init_stage(stage)
        elif key == pygame.K_ESCAPE:
            self.state = "title"


# ======================================================
# メインループ
# ======================================================
def main():
    game = RacingGame()

    running = True
    while running:
        for event in pygame.event.get():
            running = game.handle_event(event)

        game.update()
        game.draw()

        pygame.display.flip()
        clock.tick(FPS)

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
