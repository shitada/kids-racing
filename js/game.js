/* =====================================================================
 * キッズレーシング - ブラウザ版 (racing_game.py の忠実な移植)
 * デザイン・内容・挙動を元の Python/pygame 版とそろえています。
 * 操作: スペース=加速, ←→=操作, ↓=ブレーキ (タッチ端末は画面ボタン)
 * 全10ステージ、徐々に難しくなる！
 * ===================================================================== */
"use strict";

// --- 初期設定 ---
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 650;
const FPS = 60;

// --- 色定義 (r,g,b の配列) ---
const WHITE = [255, 255, 255];
const BLACK = [0, 0, 0];
const GRAY = [180, 180, 180];
const DARK_GRAY = [100, 100, 100];
const RED = [220, 50, 50];
const BLUE = [50, 100, 220];
const GREEN = [50, 200, 80];
const YELLOW = [255, 220, 50];
const ORANGE = [255, 150, 30];
const PURPLE = [160, 80, 220];
const PINK = [255, 130, 180];
const CYAN = [50, 200, 220];
const BROWN = [139, 90, 43];
const DARK_GREEN = [30, 130, 30];
const LIGHT_GREEN = [120, 220, 120];
const ROAD_COLOR = [90, 90, 95];
const LINE_COLOR = [255, 255, 200];
const GRASS_COLOR = [80, 180, 60];
const SAND_COLOR = [220, 200, 140];

// --- 車の色 ---
const CAR_COLORS = [RED, BLUE, GREEN, ORANGE, PURPLE];
const CAR_NAMES = ["あなた", "ブルー", "グリーン", "オレンジ", "パープル"];

const STAGE_NAMES = [
  "はじめての レース", "まちの サーキット", "うみぞいの ドライブ",
  "やまみちの チャレンジ", "さばくの ヒートラン", "もりの アドベンチャー",
  "よるの ハイウェイ", "ゆきの スリップコース", "かざんの デンジャーロード",
  "グランドファイナル",
];

// ======================================================
// ユーティリティ
// ======================================================
const FONT_STACK =
  '"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","YuGothic","Meiryo","Apple Color Emoji","Segoe UI Emoji",sans-serif';

function rgb(c) {
  return typeof c === "string" ? c : `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
}
function rgba(c, a) {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}
// Python 互換の剰余 / 整数除算
function pymod(a, b) {
  return ((a % b) + b) % b;
}
function floordiv(a, b) {
  return Math.floor(a / b);
}
const trunc = Math.trunc;

// 乱数 (Python random 互換)
function randUniform(a, b) {
  return a + Math.random() * (b - a);
}
function randInt(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 描画ヘルパ
function pathRoundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function fillRect(x, y, w, h, color) {
  ctx.fillStyle = rgb(color);
  ctx.fillRect(x, y, w, h);
}
function fillRectA(x, y, w, h, color, alpha) {
  ctx.fillStyle = rgba(color, alpha);
  ctx.fillRect(x, y, w, h);
}
function fillRoundRect(x, y, w, h, r, color) {
  ctx.fillStyle = rgb(color);
  pathRoundRect(x, y, w, h, r);
  ctx.fill();
}
function strokeRoundRect(x, y, w, h, r, color, lw) {
  ctx.strokeStyle = rgb(color);
  ctx.lineWidth = lw;
  // pygame の枠線は内側に描かれるので half 分内側に寄せる
  const o = lw / 2;
  pathRoundRect(x + o, y + o, w - lw, h - lw, Math.max(0, r - o));
  ctx.stroke();
}
function fillCircle(x, y, r, color) {
  ctx.fillStyle = rgb(color);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}
function strokeCircle(x, y, r, color, lw) {
  ctx.strokeStyle = rgb(color);
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}
function fillEllipse(x, y, w, h, color) {
  // pygame.draw.ellipse は外接矩形 (x,y,w,h) 指定
  ctx.fillStyle = rgb(color);
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}
function fillPolygon(points, color) {
  ctx.fillStyle = rgb(color);
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
  ctx.fill();
}
function drawLine(x1, y1, x2, y2, color, lw) {
  ctx.strokeStyle = rgb(color);
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}
function setFont(size) {
  ctx.font = `bold ${size}px ${FONT_STACK}`;
}
// 左上基準でテキスト描画 (pygame の blit((x,y)) 相当)
function drawText(text, x, y, size, color) {
  setFont(size);
  ctx.fillStyle = rgb(color);
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(text, x, y);
}
// 中央寄せ (pygame の get_rect(center=...) 相当)
function drawTextCentered(text, cx, cy, size, color) {
  setFont(size);
  ctx.fillStyle = rgb(color);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy);
}
function textWidth(text, size) {
  setFont(size);
  return ctx.measureText(text).width;
}

// フォントサイズ (pygame: 18/24/36/52/72)
const FS_SMALL = 18,
  FS_MEDIUM = 24,
  FS_LARGE = 36,
  FS_TITLE = 52,
  FS_HUGE = 72;

// ======================================================
// ステージ設定
// ======================================================
class StageConfig {
  constructor(stageNum) {
    this.stage_num = stageNum;
    this.name = STAGE_NAMES[Math.min(stageNum - 1, 9)];
    // ゴール距離(ピクセル。約90秒で到達するよう調整)
    this.goal_distance = 18000 + stageNum * 1500;
    // 障害物の数
    this.obstacle_count = 5 + stageNum * 4;
    // 障害物の種類の多さ
    this.obstacle_variety = Math.min(stageNum, 5);
    // AI の強さ (0.0-1.0)
    this.ai_strength = 0.3 + stageNum * 0.06;
    // 道幅 (狭くなるほど難しい)
    this.road_width = Math.max(320, 440 - stageNum * 12);
    // レーン数
    this.lane_count = 5;
    // 最大速度
    this.max_speed = 6.0 + stageNum * 0.3;
    // 障害物の動き (ステージ5以降)
    this.moving_obstacles = stageNum >= 5;
    // 天候効果
    this.weather = this._getWeather();
    // 背景色
    this.bg_colors = this._getBgColors();
  }

  _getWeather() {
    if (this.stage_num <= 3) return "clear";
    else if (this.stage_num <= 5) return randChoice(["clear", "clear", "rain"]);
    else if (this.stage_num <= 7) return randChoice(["clear", "rain", "rain"]);
    else return randChoice(["rain", "snow", "rain"]);
  }

  _getBgColors() {
    const stageBg = [
      [GRASS_COLOR, LIGHT_GREEN], // 1: 草原
      [GRASS_COLOR, [180, 180, 180]], // 2: 街
      [[100, 180, 220], SAND_COLOR], // 3: 海沿い
      [DARK_GREEN, BROWN], // 4: 山道
      [SAND_COLOR, [200, 180, 100]], // 5: 砂漠
      [DARK_GREEN, [60, 120, 40]], // 6: 森
      [[30, 30, 60], [40, 40, 50]], // 7: 夜
      [[220, 230, 240], [200, 210, 220]], // 8: 雪
      [[80, 40, 30], [60, 30, 20]], // 9: 火山
      [[50, 50, 80], [80, 50, 60]], // 10: ファイナル
    ];
    const idx = Math.min(this.stage_num - 1, 9);
    return stageBg[idx];
  }
}

// ======================================================
// 車クラス
// ======================================================
class Car {
  static WIDTH = 36;
  static HEIGHT = 60;

  constructor(color, name, lane, isPlayer = false) {
    this.color = color;
    this.name = name;
    this.is_player = isPlayer;
    this.lane = lane;
    this.x = 0;
    this.y = 0;
    this.speed = 0.0;
    this.max_speed = 6.0;
    this.acceleration = 0.08;
    this.brake_power = 0.15;
    this.friction = 0.02;
    this.steering_speed = 3.5;
    this.distance = 0.0;
    this.finished = false;
    this.finish_time = 0;
    this.finish_rank = 0;
    this.invincible_timer = 0;
    this.crash_timer = 0;
    // AI用
    this.ai_target_speed = 0.0;
    this.ai_dodge_dir = 0;
    this.ai_think_timer = 0;
  }

  reset(roadCenterX, roadWidth, laneCount, startY) {
    const laneWidth = roadWidth / laneCount;
    this.x = roadCenterX - roadWidth / 2 + laneWidth * this.lane + laneWidth / 2;
    this.y = startY;
    this.speed = 0.0;
    this.distance = 0.0;
    this.finished = false;
    this.finish_time = 0;
    this.finish_rank = 0;
    this.invincible_timer = 0;
    this.crash_timer = 0;
  }

  draw(cameraY) {
    if (this.finished && !this.is_player) return;
    const screenY = this.y - cameraY;
    if (screenY < -80 || screenY > SCREEN_HEIGHT + 80) return;

    // 点滅(無敵時間)
    if (this.invincible_timer > 0 && floordiv(this.invincible_timer, 4) % 2 === 0)
      return;

    const cx = trunc(this.x),
      cy = trunc(screenY);
    const W = Car.WIDTH,
      Hh = Car.HEIGHT;

    // 車本体
    fillRoundRect(cx - (W >> 1), cy - (Hh >> 1), W, Hh, 8, this.color);

    // 窓
    fillRoundRect(cx - 12, cy - 18, 24, 14, 4, [180, 220, 255]);

    // タイヤ
    const tireColor = [40, 40, 40];
    for (const dx of [-(W >> 1) - 2, (W >> 1) - 4]) {
      for (const dy of [-(Hh >> 1) + 6, (Hh >> 1) - 16]) {
        fillRoundRect(cx + dx, cy + dy, 6, 10, 2, tireColor);
      }
    }

    // ヘッドライト
    const lightColor = [255, 255, 200];
    fillCircle(cx - 10, cy - (Hh >> 1) + 3, 4, lightColor);
    fillCircle(cx + 10, cy - (Hh >> 1) + 3, 4, lightColor);

    // クラッシュ演出
    if (this.crash_timer > 0) {
      for (let i = 0; i < 3; i++) {
        const angle = ((this.crash_timer * 10 + i * 120) * Math.PI) / 180;
        const sx = cx + trunc(Math.cos(angle) * 30);
        const sy = cy + trunc(Math.sin(angle) * 30);
        fillCircle(sx, sy, 5, YELLOW);
      }
    }
  }

  updateAi(stageConfig, obstacles, roadCenterX, roadWidth) {
    if (this.finished) return;
    if (this.crash_timer > 0) {
      this.crash_timer -= 1;
      this.speed *= 0.95;
      return;
    }
    if (this.invincible_timer > 0) this.invincible_timer -= 1;

    this.ai_think_timer -= 1;
    const strength = stageConfig.ai_strength;

    // 定期的にAI思考
    if (this.ai_think_timer <= 0) {
      this.ai_think_timer = randInt(15, 40);
      // 目標速度 (AIもmax_speedを超えて加速可能)
      const aiMax = stageConfig.max_speed * (1.0 + strength * 0.6);
      this.ai_target_speed =
        aiMax * (0.65 + strength * 0.3 + randUniform(-0.08, 0.08));
      // 障害物回避判断
      this.ai_dodge_dir = 0;
      for (const obs of obstacles) {
        const dx = obs.x - this.x;
        const dy = obs.y - this.y;
        if (dy > -180 && dy < 20 && Math.abs(dx) < 60) {
          this.ai_dodge_dir = dx > 0 ? -1 : 1;
          break;
        }
      }
    }

    // 加速/減速
    const aiAccelRate = this.acceleration * (1.0 + strength * 0.6);
    if (this.speed < this.ai_target_speed) this.speed += aiAccelRate;
    else this.speed -= this.friction;

    const aiSpeedCap = stageConfig.max_speed * (1.0 + strength * 0.6);
    this.speed = Math.max(0, Math.min(this.speed, aiSpeedCap));

    // ステアリング
    const roadLeft = roadCenterX - roadWidth / 2 + 25;
    const roadRight = roadCenterX + roadWidth / 2 - 25;
    if (this.ai_dodge_dir !== 0)
      this.x += this.ai_dodge_dir * this.steering_speed * 0.8;
    // 道路内に留まる
    if (this.x < roadLeft + 20) this.x += this.steering_speed;
    else if (this.x > roadRight - 20) this.x -= this.steering_speed;

    // 移動
    this.y -= this.speed;
    this.distance += this.speed;
  }

  updatePhysics(roadCenterX, roadWidth) {
    // 摩擦
    if (this.speed > 0) this.speed -= this.friction;
    this.speed = Math.max(0, this.speed);

    // 道路外でのペナルティ
    const roadLeft = roadCenterX - roadWidth / 2;
    const roadRight = roadCenterX + roadWidth / 2;
    if (this.x < roadLeft || this.x > roadRight) this.speed *= 0.96;

    // 移動
    this.y -= this.speed;
    this.distance += this.speed;

    // 壁制限
    const margin = 50;
    this.x = Math.max(margin, Math.min(SCREEN_WIDTH - margin, this.x));

    // タイマー
    if (this.invincible_timer > 0) this.invincible_timer -= 1;
    if (this.crash_timer > 0) this.crash_timer -= 1;
  }
}

// ======================================================
// 障害物クラス
// ======================================================
class Obstacle {
  constructor(x, y, obsType = "cone", moving = false) {
    this.x = x;
    this.y = y;
    this.type = obsType;
    this.width = 30;
    this.height = 30;
    this.moving = moving;
    this.move_dir = randChoice([-1, 1]);
    this.move_speed = randUniform(0.5, 1.5);
    this.move_range = randUniform(30, 60);
    this.origin_x = x;
    this.timer = randUniform(0, Math.PI * 2);
    this._setSize();
  }

  _setSize() {
    if (this.type === "cone") {
      this.width = 20;
      this.height = 20;
    } else if (this.type === "rock") {
      this.width = 36;
      this.height = 32;
    } else if (this.type === "puddle") {
      this.width = 50;
      this.height = 30;
    } else if (this.type === "oil") {
      this.width = 40;
      this.height = 40;
    } else if (this.type === "barrier") {
      this.width = 60;
      this.height = 20;
    }
  }

  update() {
    if (this.moving) {
      this.timer += 0.03;
      this.x = this.origin_x + Math.sin(this.timer) * this.move_range;
    }
  }

  draw(cameraY) {
    const screenY = this.y - cameraY;
    if (screenY < -50 || screenY > SCREEN_HEIGHT + 50) return;
    const cx = trunc(this.x),
      cy = trunc(screenY);

    if (this.type === "cone") {
      fillPolygon(
        [[cx, cy - 12], [cx - 10, cy + 8], [cx + 10, cy + 8]],
        ORANGE
      );
      fillRect(cx - 12, cy + 8, 24, 5, WHITE);
    } else if (this.type === "rock") {
      fillEllipse(cx - 18, cy - 16, 36, 32, DARK_GRAY);
      fillEllipse(cx - 14, cy - 12, 20, 16, GRAY);
    } else if (this.type === "puddle") {
      fillEllipse(cx - 25, cy - 15, 50, 30, [60, 120, 200]);
      fillEllipse(cx - 18, cy - 10, 30, 16, [100, 160, 230]);
    } else if (this.type === "oil") {
      fillEllipse(cx - 20, cy - 20, 40, 40, [30, 30, 30]);
      fillEllipse(cx - 14, cy - 14, 24, 20, [50, 50, 60]);
    } else if (this.type === "barrier") {
      fillRect(cx - 30, cy - 10, 60, 20, RED);
      fillRect(cx - 30, cy - 10, 15, 20, WHITE);
      fillRect(cx, cy - 10, 15, 20, WHITE);
    }
  }

  checkCollision(car) {
    if (car.invincible_timer > 0) return false;
    const carLeft = car.x - Car.WIDTH / 2;
    const carTop = car.y - Car.HEIGHT / 2;
    const obsLeft = this.x - this.width / 2;
    const obsTop = this.y - this.height / 2;
    return (
      carLeft < obsLeft + this.width &&
      carLeft + Car.WIDTH > obsLeft &&
      carTop < obsTop + this.height &&
      carTop + Car.HEIGHT > obsTop
    );
  }
}

// ======================================================
// パーティクル
// ======================================================
class Particle {
  constructor(x, y, color, vx = 0, vy = 0, life = 30) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.vx = vx + randUniform(-2, 2);
    this.vy = vy + randUniform(-2, 2);
    this.life = life;
    this.max_life = life;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= 1;
    this.vy += 0.05; // 重力
  }

  draw(cameraY) {
    if (this.life <= 0) return;
    const alpha = this.life / this.max_life;
    const r = Math.max(2, trunc(4 * alpha));
    const screenY = trunc(this.y - cameraY);
    if (screenY >= 0 && screenY <= SCREEN_HEIGHT)
      fillCircle(trunc(this.x), screenY, r, this.color);
  }
}

// ======================================================
// 天候エフェクト
// ======================================================
class WeatherEffect {
  constructor(weatherType) {
    this.type = weatherType;
    this.drops = [];
    if (weatherType === "rain") {
      for (let i = 0; i < 80; i++)
        this.drops.push([
          randInt(0, SCREEN_WIDTH),
          randInt(0, SCREEN_HEIGHT),
          randUniform(4, 8),
        ]);
    } else if (weatherType === "snow") {
      for (let i = 0; i < 60; i++)
        this.drops.push([
          randInt(0, SCREEN_WIDTH),
          randInt(0, SCREEN_HEIGHT),
          randUniform(1, 3),
        ]);
    }
  }

  update() {
    if (this.type === "rain") {
      for (const d of this.drops) {
        d[1] += d[2] * 2;
        d[0] += 1;
        if (d[1] > SCREEN_HEIGHT) {
          d[0] = randInt(0, SCREEN_WIDTH);
          d[1] = -10;
        }
      }
    } else if (this.type === "snow") {
      for (const d of this.drops) {
        d[1] += d[2];
        d[0] += Math.sin(d[1] * 0.02) * 0.5;
        if (d[1] > SCREEN_HEIGHT) {
          d[0] = randInt(0, SCREEN_WIDTH);
          d[1] = -10;
        }
      }
    }
  }

  draw() {
    if (this.type === "rain") {
      for (const d of this.drops) {
        const x = d[0],
          y = d[1];
        drawLine(trunc(x), trunc(y), trunc(x + 1), trunc(y + 6), [150, 180, 220], 1);
      }
    } else if (this.type === "snow") {
      for (const d of this.drops) {
        const x = d[0],
          y = d[1],
          spd = d[2];
        const r = Math.max(1, trunc(spd));
        fillCircle(trunc(x), trunc(y), r, WHITE);
      }
    }
  }
}

// ======================================================
// ゲーム本体クラス
// ======================================================
class RacingGame {
  constructor() {
    this.state = "title"; // title, stage_select, countdown, racing, result, game_clear
    this.current_stage = 1;
    this.stage_config = null;
    this.cars = [];
    this.obstacles = [];
    this.particles = [];
    this.weather = null;
    this.camera_y = 0;
    this.race_time = 0;
    this.countdown = 0;
    this.countdown_timer = 0;
    this.finish_order = [];
    this.road_center_x = SCREEN_WIDTH / 2;
    this.road_marks_offset = 0;
    this.cleared_stages = new Set();
    this.title_anim = 0;
    this.result_timer = 0;
    this.bgm_playing = false;
    // タイトルBGM開始
    this._startBgm();
  }

  // --- ステージ初期化 ---
  initStage(stageNum) {
    this.current_stage = stageNum;
    this.stage_config = new StageConfig(stageNum);
    this.road_center_x = SCREEN_WIDTH / 2;

    // 車を生成
    this.cars = [];
    for (let i = 0; i < 5; i++) {
      const car = new Car(CAR_COLORS[i], CAR_NAMES[i], i, i === 0);
      car.max_speed = this.stage_config.max_speed;
      this.cars.push(car);
    }

    // 位置をリセット
    const startY = 0;
    for (let i = 0; i < this.cars.length; i++) {
      const row = floordiv(i, 3);
      this.cars[i].reset(
        this.road_center_x,
        this.stage_config.road_width,
        this.stage_config.lane_count,
        startY + row * 80
      );
    }

    // 障害物を生成
    this._generateObstacles();

    // 天候
    if (this.stage_config.weather !== "clear")
      this.weather = new WeatherEffect(this.stage_config.weather);
    else this.weather = null;

    this.particles = [];
    this.camera_y = -SCREEN_HEIGHT / 2;
    this.race_time = 0;
    this.finish_order = [];
    this.road_marks_offset = 0;

    // カウントダウン開始
    this.state = "countdown";
    this.countdown = 3;
    this.countdown_timer = FPS;

    // BGM開始
    this._startBgm();
  }

  _startBgm() {
    if (window.gameAudio && window.gameAudio.ready) {
      window.gameAudio.startBgm();
      this.bgm_playing = true;
    }
  }

  _stopBgm() {
    if (window.gameAudio) window.gameAudio.stopBgm();
    this.bgm_playing = false;
  }

  _generateObstacles() {
    this.obstacles = [];
    const cfg = this.stage_config;
    const roadLeft = this.road_center_x - floordiv(cfg.road_width, 2) + 30;
    const roadRight = this.road_center_x + floordiv(cfg.road_width, 2) - 30;

    const types = ["cone"];
    if (cfg.obstacle_variety >= 2) types.push("rock");
    if (cfg.obstacle_variety >= 3) types.push("puddle");
    if (cfg.obstacle_variety >= 4) types.push("oil");
    if (cfg.obstacle_variety >= 5) types.push("barrier");

    // ゴール距離に合わせて均等に配置
    const spacing = cfg.goal_distance / (cfg.obstacle_count + 1);
    for (let i = 0; i < cfg.obstacle_count; i++) {
      const y = -(spacing * (i + 1));
      const x = randInt(trunc(roadLeft), trunc(roadRight));
      const obsType = randChoice(types);
      const moving = cfg.moving_obstacles && Math.random() < 0.3;
      this.obstacles.push(new Obstacle(x, y, obsType, moving));
    }
  }

  // --- 更新 ---
  update() {
    if (this.state === "countdown") this._updateCountdown();
    else if (this.state === "racing") this._updateRacing();
    else if (this.state === "result") this.result_timer += 1;

    this.title_anim += 1;
  }

  _updateCountdown() {
    this.countdown_timer -= 1;
    if (this.countdown_timer <= 0) {
      this.countdown -= 1;
      this.countdown_timer = FPS;
      if (this.countdown > 0) {
        window.gameAudio.play("countdown");
      } else if (this.countdown === 0) {
        window.gameAudio.play("start");
        this.state = "racing";
      }
    }
  }

  _updateRacing() {
    this.race_time += 1;
    const player = this.cars[0];

    // --- プレイヤー操作 ---
    if (!player.finished && player.crash_timer <= 0) {
      // 加速 (スペースを押し続けるとmax_speedが徐々に上がる)
      if (keys.space) {
        player.speed += player.acceleration;
        const speedCap = this.stage_config.max_speed * 1.8;
        if (player.max_speed < speedCap) player.max_speed += 0.005;
        if (player.speed > player.max_speed) player.speed = player.max_speed;
      } else {
        // スペースを離すと最大速度がゆっくり下がる
        const baseMax = this.stage_config.max_speed;
        if (player.max_speed > baseMax) player.max_speed -= 0.01;
      }
      // ブレーキ
      if (keys.down) {
        player.speed -= player.brake_power;
        if (player.speed < 0) player.speed = 0;
      }
      // 左右
      if (keys.left) player.x -= player.steering_speed;
      if (keys.right) player.x += player.steering_speed;
    }

    // プレイヤー物理更新
    if (!player.finished)
      player.updatePhysics(this.road_center_x, this.stage_config.road_width);
    else if (player.crash_timer > 0) player.crash_timer -= 1;

    // --- AI更新 ---
    for (let i = 1; i < this.cars.length; i++) {
      const car = this.cars[i];
      if (!car.finished)
        car.updateAi(
          this.stage_config,
          this.obstacles,
          this.road_center_x,
          this.stage_config.road_width
        );
    }

    // --- 障害物更新 ---
    for (const obs of this.obstacles) obs.update();

    // --- 衝突判定 ---
    for (const car of this.cars) {
      if (car.finished) continue;
      for (const obs of this.obstacles) {
        if (obs.checkCollision(car)) this._handleCollision(car, obs);
      }
    }

    // --- ゴール判定 ---
    for (const car of this.cars) {
      if (!car.finished && car.distance >= this.stage_config.goal_distance) {
        car.finished = true;
        car.finish_time = this.race_time;
        car.finish_rank = this.finish_order.length + 1;
        this.finish_order.push(car);
        if (car.is_player) window.gameAudio.play("goal");
      }
    }

    // プレイヤーがゴールしたら即リザルトへ（他車は予測タイム）
    if (player.finished && this.state === "racing")
      this._finishRaceWithPredictions();

    // 制限時間(120秒)でも終了
    const timeUp = this.race_time > 120 * FPS;
    if (timeUp && this.state === "racing") {
      player.finished = true;
      player.finish_time = this.race_time;
      if (!this.finish_order.includes(player)) {
        player.finish_rank = this.finish_order.length + 1;
        this.finish_order.push(player);
      }
      this._finishRaceWithPredictions();
    }

    // --- カメラ ---
    if (!player.finished) this.camera_y = player.y - SCREEN_HEIGHT * 0.65;
    // ゴール後はカメラ固定（スクロール停止）

    // --- パーティクル ---
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) p.update();

    // --- 天候 ---
    if (this.weather) this.weather.update();

    // --- 道路マーク ---
    if (!player.finished)
      this.road_marks_offset = (this.road_marks_offset + player.speed) % 40;
  }

  _finishRaceWithPredictions() {
    const player = this.cars[0];
    const goalDist = this.stage_config.goal_distance;

    // 未ゴールの車の予測タイムを計算
    const unfinished = this.cars.filter((c) => !c.finished);
    for (const c of unfinished) {
      if (c.speed > 0.1) {
        const remaining = goalDist - c.distance;
        const avgSpeed = c.speed * randUniform(0.85, 1.05);
        const predictedFrames = remaining / avgSpeed;
        c.finish_time = trunc(this.race_time + predictedFrames);
      } else {
        c.finish_time = trunc(this.race_time + randInt(300, 600));
      }
      c.finished = true;
    }

    // 全車を予測タイム順にソート
    unfinished.sort((a, b) => a.finish_time - b.finish_time);
    for (const c of unfinished) {
      c.finish_rank = this.finish_order.length + 1;
      this.finish_order.push(c);
    }

    this.state = "result";
    this.result_timer = 0;
    // 3位以内ならクリア
    if (player.finish_rank <= 3) this.cleared_stages.add(this.current_stage);
  }

  _handleCollision(car, obs) {
    if (car.invincible_timer > 0) return;

    if (obs.type === "puddle") {
      car.speed *= 0.8;
    } else if (obs.type === "oil") {
      car.speed *= 0.6;
      car.x += randUniform(-20, 20);
    } else {
      car.speed *= 0.3;
      car.crash_timer = 30;
    }

    car.invincible_timer = 60;

    if (car.is_player) window.gameAudio.play("crash");

    // パーティクル
    for (let i = 0; i < 8; i++) {
      this.particles.push(
        new Particle(car.x, car.y, YELLOW, randUniform(-3, 3), randUniform(-3, 3), 20)
      );
    }
  }

  // --- 描画 ---
  draw() {
    if (this.state === "title") this._drawTitle();
    else if (this.state === "stage_select") this._drawStageSelect();
    else if (this.state === "countdown" || this.state === "racing") {
      this._drawRace();
      if (this.state === "countdown") this._drawCountdown();
      else this._drawHud();
    } else if (this.state === "result") {
      this._drawRace();
      this._drawResult();
    } else if (this.state === "game_clear") {
      this._drawGameClear();
    }
  }

  _drawTitle() {
    fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, [30, 30, 60]);

    // 背景の装飾道路
    for (let i = 0; i < 10; i++) {
      const y =
        pymod(this.title_anim * 2 + i * 70, SCREEN_HEIGHT + 100) - 50;
      fillRect(300, y, 200, 50, ROAD_COLOR);
      fillRect(395, y + 10, 10, 30, LINE_COLOR);
    }

    // タイトル
    const wave = Math.sin(this.title_anim * 0.05) * 10;
    // 影
    drawTextCentered("キッズレーシング", SCREEN_WIDTH / 2 + 3, 160 + wave + 3, FS_TITLE, [80, 60, 0]);
    drawTextCentered("キッズレーシング", SCREEN_WIDTH / 2, 160 + wave, FS_TITLE, YELLOW);

    // サブタイトル
    drawTextCentered("🏎️  5だいの くるまで レース！ 🏎️", SCREEN_WIDTH / 2, 240, FS_MEDIUM, WHITE);

    // 車のアニメーション
    const carX = pymod(this.title_anim * 3, SCREEN_WIDTH + 200) - 100;
    for (let i = 0; i < CAR_COLORS.length; i++) {
      const cx = carX - i * 80;
      const cy = 330;
      fillRoundRect(cx - 18, cy - 30, 36, 60, 8, CAR_COLORS[i]);
      fillRoundRect(cx - 12, cy - 18, 24, 14, 4, [180, 220, 255]);
    }

    // 操作説明
    const controls = [
      "スペース: かそく",
      "← →: そうさ",
      "↓: ブレーキ",
      "3いないに ゴールしよう！",
    ];
    for (let i = 0; i < controls.length; i++) {
      drawTextCentered(controls[i], SCREEN_WIDTH / 2, 420 + i * 30 + FS_SMALL / 2, FS_SMALL, [200, 200, 220]);
    }

    // スタートボタン
    const pulse = trunc(Math.abs(Math.sin(this.title_anim * 0.08)) * 50);
    const btnColor = [50 + pulse, 200 + floordiv(pulse, 3), 50 + pulse];
    fillRoundRect(SCREEN_WIDTH / 2 - 140, 555, 280, 55, 12, btnColor);
    strokeRoundRect(SCREEN_WIDTH / 2 - 140, 555, 280, 55, 12, WHITE, 3);
    drawTextCentered("スペースで スタート！", SCREEN_WIDTH / 2, 555 + 27, FS_MEDIUM, WHITE);
  }

  _drawStageSelect() {
    fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, [20, 20, 50]);

    drawTextCentered("ステージ せんたく", SCREEN_WIDTH / 2, 50, FS_LARGE, YELLOW);

    for (let i = 0; i < 10; i++) {
      const stageNum = i + 1;
      const col = i % 5;
      const row = floordiv(i, 5);
      const x = 60 + col * 145;
      const y = 110 + row * 220;

      const locked = stageNum > 1 && !this.cleared_stages.has(stageNum - 1);
      const cleared = this.cleared_stages.has(stageNum);

      // ボックス
      let boxColor;
      if (locked) boxColor = [60, 60, 70];
      else if (cleared) boxColor = [40, 100, 50];
      else boxColor = [50, 60, 120];

      fillRoundRect(x, y, 130, 190, 10, boxColor);
      strokeRoundRect(x, y, 130, 190, 10, locked ? GRAY : WHITE, 2);

      // ステージ番号
      drawTextCentered(`${stageNum}`, x + 65, y + 40, FS_LARGE, locked ? GRAY : WHITE);

      // ステージ名
      const nameLines = STAGE_NAMES[i].split(" ");
      for (let j = 0; j < nameLines.length; j++) {
        drawTextCentered(nameLines[j], x + 65, y + 80 + j * 22, FS_SMALL, locked ? GRAY : WHITE);
      }

      // 状態
      if (locked) {
        drawTextCentered("🔒", x + 65, y + 150, FS_SMALL, GRAY);
      } else if (cleared) {
        drawTextCentered("⭐ クリア！", x + 65, y + 150, FS_SMALL, YELLOW);
      } else {
        drawTextCentered("▶ プレイ", x + 65, y + 150, FS_SMALL, CYAN);
      }

      // キー表示
      drawTextCentered(stageNum <= 9 ? `[${stageNum}]` : "[0]", x + 65, y + 175, FS_SMALL, locked ? GRAY : WHITE);
    }

    // 戻る
    drawText("[ESC] もどる", 20, SCREEN_HEIGHT - 30, FS_SMALL, [180, 180, 180]);
  }

  _drawRace() {
    const cfg = this.stage_config;
    const [bg1, bg2] = cfg.bg_colors;

    // 背景
    fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, bg1);

    // 道路
    const roadLeft = this.road_center_x - floordiv(cfg.road_width, 2);
    const roadRight = this.road_center_x + floordiv(cfg.road_width, 2);

    // 草/砂地テクスチャ(簡易)
    fillRect(0, 0, roadLeft, SCREEN_HEIGHT, bg2);
    fillRect(roadRight, 0, SCREEN_WIDTH - roadRight, SCREEN_HEIGHT, bg2);

    // 道路本体
    fillRect(roadLeft, 0, cfg.road_width, SCREEN_HEIGHT, ROAD_COLOR);

    // 道路の端線
    fillRect(roadLeft, 0, 4, SCREEN_HEIGHT, WHITE);
    fillRect(roadRight - 4, 0, 4, SCREEN_HEIGHT, WHITE);

    // 白線(点線)
    const laneWidth = cfg.road_width / cfg.lane_count;
    const markOffset = this.road_marks_offset;
    for (let lane = 1; lane < cfg.lane_count; lane++) {
      const lx = roadLeft + lane * laneWidth;
      for (let my = -40; my < SCREEN_HEIGHT + 40; my += 40) {
        const yPos = my + markOffset;
        if (yPos >= 0 && yPos <= SCREEN_HEIGHT)
          fillRect(trunc(lx) - 2, trunc(yPos), 4, 20, LINE_COLOR);
      }
    }

    // 路肩の模様
    for (let y = -40; y < SCREEN_HEIGHT + 40; y += 20) {
      const yPos = y + pymod(markOffset, 20);
      if (yPos >= 0 && yPos <= SCREEN_HEIGHT) {
        if (pymod(floordiv(y, 20), 2) === 0) {
          fillRect(roadLeft - 8, trunc(yPos), 8, 10, RED);
          fillRect(roadRight, trunc(yPos), 8, 10, RED);
        } else {
          fillRect(roadLeft - 8, trunc(yPos), 8, 10, WHITE);
          fillRect(roadRight, trunc(yPos), 8, 10, WHITE);
        }
      }
    }

    // ゴールライン
    const goalY = -cfg.goal_distance;
    const goalScreenY = goalY - this.camera_y;
    if (goalScreenY > -20 && goalScreenY < SCREEN_HEIGHT + 20) {
      for (let gx = roadLeft; gx < roadRight; gx += 20) {
        const color = pymod(floordiv(gx - roadLeft, 20), 2) === 0 ? BLACK : WHITE;
        fillRect(gx, trunc(goalScreenY), 20, 12, color);
        const color2 = color === BLACK ? WHITE : BLACK;
        fillRect(gx, trunc(goalScreenY) + 12, 20, 12, color2);
      }
      // ゴールテキスト
      drawTextCentered("🏁 GOAL 🏁", this.road_center_x, trunc(goalScreenY) - 25, FS_LARGE, YELLOW);
    }

    // 障害物描画
    for (const obs of this.obstacles) obs.draw(this.camera_y);

    // パーティクル
    for (const p of this.particles) p.draw(this.camera_y);

    // 車描画(後ろから前へ): key=-c.y の昇順 → y が大きい順
    const sortedCars = this.cars.slice().sort((a, b) => b.y - a.y);
    for (const car of sortedCars) car.draw(this.camera_y);

    // 天候
    if (this.weather) this.weather.draw();
  }

  _drawCountdown() {
    fillRectA(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, BLACK, 100 / 255);

    if (this.countdown > 0) {
      const scale = 1.0 + (this.countdown_timer / FPS) * 0.5;
      const size = trunc(80 * scale);
      // 影
      drawTextCentered(String(Math.max(1, this.countdown)), SCREEN_WIDTH / 2 + 3, SCREEN_HEIGHT / 2 + 3, FS_HUGE, [50, 50, 50]);
      drawTextCentered(String(this.countdown), SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, size, YELLOW);
    } else {
      // 影
      drawTextCentered("GO!", SCREEN_WIDTH / 2 + 3, SCREEN_HEIGHT / 2 + 3, FS_HUGE, [50, 50, 50]);
      drawTextCentered("GO!", SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, FS_HUGE, GREEN);
    }

    // ステージ名
    drawTextCentered(
      `ステージ ${this.current_stage}: ${this.stage_config.name}`,
      SCREEN_WIDTH / 2,
      SCREEN_HEIGHT / 2 + 80,
      FS_MEDIUM,
      WHITE
    );
  }

  _drawHud() {
    const player = this.cars[0];
    const cfg = this.stage_config;

    // 半透明パネル
    fillRectA(5, 5, 220, 160, BLACK, 140 / 255);

    // タイム
    const seconds = this.race_time / FPS;
    drawText(`タイム: ${seconds.toFixed(1)}秒`, 15, 12, FS_MEDIUM, WHITE);

    // スピードメーター
    const speedPct = player.speed / cfg.max_speed;
    drawText("スピード:", 15, 45, FS_SMALL, WHITE);
    fillRoundRect(110, 48, 100, 16, 4, DARK_GRAY);
    const barColor = speedPct < 0.7 ? GREEN : speedPct < 0.9 ? YELLOW : RED;
    if (speedPct > 0) fillRoundRect(110, 48, trunc(100 * speedPct), 16, 4, barColor);

    // 進行度
    const progress = Math.min(1.0, player.distance / cfg.goal_distance);
    drawText("ゴールまで:", 15, 75, FS_SMALL, WHITE);
    fillRoundRect(15, 98, 195, 14, 4, DARK_GRAY);
    if (progress > 0) fillRoundRect(15, 98, trunc(195 * progress), 14, 4, CYAN);
    drawText(`${trunc(progress * 100)}%`, 100, 95, FS_SMALL, WHITE);

    // 順位表示
    const rank = this._getCurrentRank();
    const rankColors = { 1: YELLOW, 2: [200, 200, 200], 3: [200, 150, 80] };
    const rankColor = rankColors[rank] || WHITE;
    drawText(`${rank}い`, 15, 120, FS_LARGE, rankColor);

    // ステージ表示
    drawText(`ステージ ${this.current_stage}`, SCREEN_WIDTH - 130, 12, FS_SMALL, YELLOW);

    // ミニマップ(右側)
    this._drawMinimap();
  }

  _getCurrentRank() {
    const player = this.cars[0];
    let rank = 1;
    for (let i = 1; i < this.cars.length; i++) {
      if (this.cars[i].distance > player.distance) rank += 1;
    }
    return rank;
  }

  _drawMinimap() {
    const mx = SCREEN_WIDTH - 45,
      my = 50,
      mw = 30,
      mh = 200;
    fillRectA(mx - 5, my - 5, mw + 10, mh + 10, BLACK, 120 / 255);

    // 道
    fillRect(mx + 5, my, 20, mh, DARK_GRAY);

    const goalDist = this.stage_config.goal_distance;

    // 各車の位置
    for (const car of this.cars) {
      const progress = Math.min(1.0, car.distance / goalDist);
      const dotY = my + mh - trunc(mh * progress);
      fillCircle(mx + 15, dotY, 5, car.color);
      if (car.is_player) strokeCircle(mx + 15, dotY, 5, WHITE, 2);
    }

    // ゴールライン
    drawLine(mx, my + 3, mx + mw, my + 3, YELLOW, 2);
    drawText("G", mx + mw + 2, my - 5, FS_SMALL, YELLOW);
  }

  _drawResult() {
    fillRectA(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, BLACK, 180 / 255);

    const player = this.cars[0];

    // タイトル
    let resultTitle, titleColor;
    if (player.finish_rank <= 3) {
      resultTitle = "🎉 クリア！ 🎉";
      titleColor = YELLOW;
    } else {
      resultTitle = "😢 ざんねん...";
      titleColor = [180, 180, 180];
    }
    drawTextCentered(resultTitle, SCREEN_WIDTH / 2, 80, FS_LARGE, titleColor);

    // 順位表
    const top = this.finish_order.slice(0, 5);
    for (let i = 0; i < top.length; i++) {
      const car = top[i];
      const y = 140 + i * 55;
      const rank = i + 1;

      // 背景バー
      const barColor = !car.is_player ? [60, 60, 100] : [80, 60, 30];
      fillRoundRect(150, y, 500, 45, 8, barColor);

      // 順位
      const rankColors = { 1: YELLOW, 2: [200, 200, 200], 3: [200, 150, 80] };
      const rc = rankColors[rank] || WHITE;
      drawText(`${rank}い`, 170, y + 10, FS_MEDIUM, rc);

      // 車の色ドット
      fillCircle(250, y + 22, 12, car.color);

      // 名前
      drawText(car.name, 275, y + 10, FS_MEDIUM, WHITE);

      // タイム
      const timeSec = car.finish_time / FPS;
      drawText(`${timeSec.toFixed(1)}秒`, 540, y + 12, FS_SMALL, [180, 180, 180]);
    }

    // ボタン表示
    if (this.result_timer > 60) {
      let btnText;
      if (player.finish_rank <= 3) {
        btnText =
          this.current_stage < 10
            ? "スペース: つぎの ステージへ"
            : "スペース: エンディングへ";
      } else {
        btnText = "スペース: もういちど / ESC: ステージせんたく";
      }
      drawTextCentered(btnText, SCREEN_WIDTH / 2, SCREEN_HEIGHT - 60, FS_SMALL, [200, 200, 220]);
    }
  }

  _drawGameClear() {
    fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT, [10, 10, 30]);

    // 紙吹雪
    for (let i = 0; i < 50; i++) {
      const x = pymod(this.title_anim * ((i * 7) % 5 + 1) + i * 137, SCREEN_WIDTH);
      const y = pymod(this.title_anim * ((i * 3) % 4 + 1) + i * 97, SCREEN_HEIGHT);
      const color = randChoice([RED, YELLOW, GREEN, BLUE, PINK, CYAN, ORANGE]);
      fillCircle(trunc(x), trunc(y), 4, color);
    }

    // テキスト
    const wave = Math.sin(this.title_anim * 0.05) * 8;
    drawTextCentered("🏆 おめでとう！ 🏆", SCREEN_WIDTH / 2, 150 + wave, FS_TITLE, YELLOW);
    drawTextCentered("ぜんステージ クリア！", SCREEN_WIDTH / 2, 240, FS_LARGE, WHITE);
    drawTextCentered("きみは さいこうの レーサーだ！", SCREEN_WIDTH / 2, 310, FS_MEDIUM, CYAN);

    // 車パレード
    for (let i = 0; i < CAR_COLORS.length; i++) {
      const x = SCREEN_WIDTH / 2 + (i - 2) * 70;
      const y = 400 + Math.sin(this.title_anim * 0.08 + i) * 15;
      fillRoundRect(x - 18, trunc(y) - 30, 36, 60, 8, CAR_COLORS[i]);
      fillRoundRect(x - 12, trunc(y) - 18, 24, 14, 4, [180, 220, 255]);
    }

    // 戻るボタン
    drawTextCentered("スペース: タイトルへ もどる", SCREEN_WIDTH / 2, SCREEN_HEIGHT - 60, FS_SMALL, [200, 200, 220]);
  }

  // --- イベント処理 ---
  handleKeyDown(code) {
    if (this.state === "title") {
      if (code === "Space") this.state = "stage_select";
    } else if (this.state === "stage_select") {
      this._handleStageSelectKey(code);
    } else if (this.state === "result") {
      if (this.result_timer > 60) {
        if (code === "Space") {
          const player = this.cars[0];
          if (player.finish_rank <= 3) {
            if (this.current_stage < 10) this.initStage(this.current_stage + 1);
            else this.state = "game_clear";
          } else {
            this.initStage(this.current_stage); // リトライ
          }
        } else if (code === "Escape") {
          this.state = "stage_select";
        }
      }
    } else if (this.state === "game_clear") {
      if (code === "Space") this.state = "title";
    } else if (this.state === "racing") {
      if (code === "Escape") {
        this.state = "stage_select";
        this._stopBgm();
      }
    }
  }

  _handleStageSelectKey(code) {
    const keyMap = {
      Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4, Digit5: 5,
      Digit6: 6, Digit7: 7, Digit8: 8, Digit9: 9, Digit0: 10,
      Numpad1: 1, Numpad2: 2, Numpad3: 3, Numpad4: 4, Numpad5: 5,
      Numpad6: 6, Numpad7: 7, Numpad8: 8, Numpad9: 9, Numpad0: 10,
    };
    if (code in keyMap) {
      this.selectStage(keyMap[code]);
    } else if (code === "Escape") {
      this.state = "title";
    }
  }

  selectStage(stage) {
    // ステージ1は常にアンロック
    if (stage === 1 || this.cleared_stages.has(stage - 1)) {
      this.initStage(stage);
    }
  }

  // タッチ: 画面タップ時の処理
  onTap(gx, gy) {
    if (this.state === "title") {
      this.handleKeyDown("Space");
    } else if (this.state === "stage_select") {
      const stage = this._stageAtPoint(gx, gy);
      if (stage) this.selectStage(stage);
    } else if (this.state === "result") {
      if (this.result_timer > 60) this.handleKeyDown("Space");
    } else if (this.state === "game_clear") {
      this.handleKeyDown("Space");
    }
  }

  _stageAtPoint(gx, gy) {
    for (let i = 0; i < 10; i++) {
      const col = i % 5;
      const row = floordiv(i, 5);
      const x = 60 + col * 145;
      const y = 110 + row * 220;
      if (gx >= x && gx <= x + 130 && gy >= y && gy <= y + 190) return i + 1;
    }
    return null;
  }

  // タッチ: ホーム/もどるボタン
  onHome() {
    if (this.state === "racing") {
      this.state = "stage_select";
      this._stopBgm();
    } else if (this.state === "stage_select") {
      this.state = "title";
    } else if (this.state === "result") {
      this.state = "stage_select";
    } else if (this.state === "game_clear") {
      this.state = "title";
    }
  }
}

// ======================================================
// 入力
// ======================================================
const keys = { space: false, left: false, right: false, down: false };
let game = null;

const KEY_CODES_PREVENT = new Set([
  "Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
]);

window.addEventListener("keydown", (e) => {
  const code = e.code;
  if (KEY_CODES_PREVENT.has(code)) e.preventDefault();
  // 連続入力 (レース操作)
  if (code === "Space") keys.space = true;
  else if (code === "ArrowLeft") keys.left = true;
  else if (code === "ArrowRight") keys.right = true;
  else if (code === "ArrowDown") keys.down = true;
  // 離散イベント (メニュー等)。リピートは無視
  if (!e.repeat && game) game.handleKeyDown(code);
});

window.addEventListener("keyup", (e) => {
  const code = e.code;
  if (code === "Space") keys.space = false;
  else if (code === "ArrowLeft") keys.left = false;
  else if (code === "ArrowRight") keys.right = false;
  else if (code === "ArrowDown") keys.down = false;
});

// ======================================================
// タッチ操作のセットアップ
// ======================================================
const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
if (isTouch) document.body.classList.add("touch");

function setupTouchButton(id, onDown, onUp) {
  const el = document.getElementById(id);
  if (!el) return;
  const down = (e) => {
    e.preventDefault();
    onDown();
  };
  const up = (e) => {
    e.preventDefault();
    onUp();
  };
  el.addEventListener("pointerdown", down);
  el.addEventListener("pointerup", up);
  el.addEventListener("pointercancel", up);
  el.addEventListener("pointerleave", up);
}

setupTouchButton("btn-accel", () => (keys.space = true), () => (keys.space = false));
setupTouchButton("btn-brake", () => (keys.down = true), () => (keys.down = false));
setupTouchButton("btn-left", () => (keys.left = true), () => (keys.left = false));
setupTouchButton("btn-right", () => (keys.right = true), () => (keys.right = false));

function toGameCoords(clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  const gx = ((clientX - r.left) / r.width) * SCREEN_WIDTH;
  const gy = ((clientY - r.top) / r.height) * SCREEN_HEIGHT;
  return [gx, gy];
}

canvas.addEventListener("pointerdown", (e) => {
  if (!game) return;
  // レース中はタッチボタンで操作するのでタップは無視
  if (game.state === "racing" || game.state === "countdown") return;
  const [gx, gy] = toGameCoords(e.clientX, e.clientY);
  game.onTap(gx, gy);
});

// ホーム/もどるボタン (タッチのメニュー用)
const homeBtn = document.getElementById("touch-home");
if (homeBtn) {
  homeBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    if (game) game.onHome();
  });
}

// タッチUIの表示切り替え
function updateTouchUi() {
  if (!isTouch) return;
  const controls = document.getElementById("touch-controls");
  const home = document.getElementById("touch-home");
  const racing = game && (game.state === "racing" || game.state === "countdown");
  if (controls) controls.classList.toggle("active", racing);
  if (home) {
    const show =
      game &&
      (game.state === "stage_select" ||
        game.state === "result" ||
        game.state === "game_clear" ||
        game.state === "racing");
    home.classList.toggle("active", show);
  }
}

// ======================================================
// メインループ (固定タイムステップ 60FPS)
// ======================================================
let acc = 0;
let last = performance.now();
const STEP = 1 / FPS;

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25; // タブ復帰などの大ジャンプ抑制
  acc += dt;
  let steps = 0;
  while (acc >= STEP && steps < 5) {
    game.update();
    acc -= STEP;
    steps++;
  }
  if (steps === 5) acc = 0;
  game.draw();
  updateTouchUi();
  requestAnimationFrame(frame);
}

// ======================================================
// 起動 (サウンド有効化オーバーレイのタップ後に開始)
// ======================================================
function startGame() {
  const overlay = document.getElementById("start-overlay");
  // AudioContext はユーザー操作後に生成
  window.gameAudio.init();
  window.gameAudio.resume();
  game = new RacingGame(); // コンストラクタ内でタイトルBGM開始
  if (overlay) overlay.classList.add("hidden");
  last = performance.now();
  requestAnimationFrame(frame);
}

const startOverlay = document.getElementById("start-overlay");
if (startOverlay) {
  startOverlay.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    startGame();
  }, { once: true });
}
