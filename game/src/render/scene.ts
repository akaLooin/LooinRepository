// 월드 상태를 화면에 그린다. 픽셀 파츠를 관절처럼 부드럽게 회전/이동시키는 방식.
import Phaser from 'phaser';
import { MAPS } from '../core/data';
import { Look } from '../core/state';
import { HURT_TIME, Mob, NodeInst, SWING_TIME, World, WorldEvent } from '../core/world';
import { Game } from '../game';
import { HEAD_ORIGIN, ITEM_ICON, THEMES, buildAll, buildLook, canvases, portraitUrl } from './sprites';
import { currentQuest, questProgress } from '../core/state';
import { NPC_NAME, SMASH_RANGE } from '../core/data';

type Img = Phaser.GameObjects.Image;
const FONT = 'Galmuri11';
const TS = 4; // 텍스트 초해상도 배율
const smooth = (cur: number, target: number, dt: number, rate: number) => cur + (target - cur) * (1 - Math.exp(-dt * rate));
const hash = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

function label(scene: Phaser.Scene, text: string, size = 7, color = '#ffffff') {
  return scene.add.text(0, 0, text, {
    fontFamily: FONT, fontSize: `${11 * TS}px`, color, stroke: '#2b1d2e', strokeThickness: TS * 2.5, align: 'center',
  }).setOrigin(0.5, 1).setScale(size / (11 * TS));
}

// ───────── 캐릭터 리그 ─────────
class CharRig {
  root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Container;
  private legF: Img; private legB: Img; private armB: Img; private torso: Img; private head: Img;
  private armF: Phaser.GameObjects.Container; private weapon: Img;
  private shadow: Img; private name: Phaser.GameObjects.Text;
  private key: string;
  private t = Math.random() * 10; private walkPh = 0;
  private flip = 1; private squash = 0; private wasGround = true;
  private blinkT = 2;
  private pose = { legF: 0, legB: 0, armF: 0, armB: 0, wpn: 0.5, by: 0, lean: 0, hy: 0, hr: 0 };
  private lie = 0;

  constructor(private scene: Phaser.Scene, look: Look, name: string) {
    const k = (this.key = buildLook(look));
    ensureTextures(scene);
    const add = (key: string, ox: number, oy: number) => scene.add.image(0, 0, key).setOrigin(ox, oy);
    this.shadow = add('shadow', 0.5, 0.5).setAlpha(0.22);
    this.legB = add(`${k}_leg`, 0.43, 0.05);
    this.legF = add(`${k}_leg`, 0.43, 0.05);
    this.armB = add(`${k}_arm`, 0.5, 0.1);
    this.torso = add(`${k}_torso`, 0.5, 1);
    this.head = add(`${k}_head`, HEAD_ORIGIN[0], HEAD_ORIGIN[1]);
    this.weapon = add('wp_sword_wood', 0.5, 0.82);
    const arm = add(`${k}_arm`, 0.5, 0.1);
    this.weapon.setPosition(0, 7.5);
    this.armF = scene.add.container(0, 0, [this.weapon, arm]);
    this.body = scene.add.container(0, 0, [this.armB, this.legB, this.legF, this.torso, this.head, this.armF]);
    this.name = label(scene, name, 6.5).setOrigin(0.5, 0).setPosition(0, 3);
    this.root = scene.add.container(0, 0, [this.shadow, this.body, this.name]).setDepth(50);
  }

  update(dt: number, w: World) {
    const p = w.player, c = w.char, P = this.pose;
    this.t += dt;
    const moving = Math.abs(p.vx) > 6 && p.onGround && p.swingT <= 0;
    const dead = p.dead > 0;
    // 목표 포즈
    let legF = 0, legB = 0, armF = -0.25 + Math.sin(this.t * 2.2) * 0.05, armB = 0.1 - Math.sin(this.t * 2.2) * 0.05;
    let direct = false;
    let wpn = c.cls === 'archer' ? 0.25 : 0.55, by = Math.sin(this.t * 2.2) * 0.5, lean = 0, hy = Math.sin(this.t * 2.2 - 0.6) * 0.4, hr = 0;
    if (moving) {
      this.walkPh += dt * (p.vx ? Math.abs(p.vx) : 80) * 0.14;
      const s = Math.sin(this.walkPh);
      legF = s * 0.7; legB = -s * 0.7; armB = s * 0.6; armF = -0.4 - s * 0.3;
      by = -Math.abs(Math.cos(this.walkPh)) * 1.3; lean = 0.07; hy = by * 0.3; hr = 0.03;
    } else if (!p.onGround) {
      const up = p.vy < 0;
      legF = up ? -0.7 : -0.25; legB = up ? 0.5 : 0.35; armB = up ? 1.0 : 2.0; armF = up ? -1.2 : -2.2;
      lean = up ? -0.06 : 0.08; wpn = 0.2; by = 0; hy = up ? 0.6 : -0.6;
    }
    const ranged = p.swingKind === 'shoot' || p.swingKind === 'cast';
    if (p.swingT > 0 && ranged) {
      // 활/지팡이: 앞으로 겨눴다가 살짝 반동
      const s = 1 - p.swingT / SWING_TIME, kick = s > 0.45 ? Math.exp(-(s - 0.45) * 9) * 0.35 : 0;
      armF = (p.swingKind === 'shoot' ? -1.5 : -2.0) + kick;
      wpn = p.swingKind === 'shoot' ? 0 : armF + Math.PI - 0.2;
      armB = p.swingKind === 'shoot' ? -1.2 + s * 0.5 : 0.3;
      lean = -kick * 0.2; direct = true;
    } else if (p.swingT > 0) {
      // 휘두르기: 뒤로 젖혔다가(와인드업) 빠르게 내려친다
      const s = 1 - p.swingT / SWING_TIME;
      const wind = Math.min(1, s / 0.3), strike = Phaser.Math.Clamp((s - 0.3) / 0.4, 0, 1);
      const e = 1 - (1 - strike) ** 3;
      armF = Phaser.Math.Linear(-0.3, -3.0, wind) + e * 2.45;
      wpn = armF + Math.PI + 0.25 - e * 0.5;
      lean = -0.1 + e * 0.28; hr = lean * 0.4;
      legF = -0.25 * e; legB = 0.3 * e;
      direct = s > 0.25;
    }
    if (p.rope >= 0) {
      // 로프: 두 팔을 번갈아 위로 뻗고 다리도 번갈아 움직인다
      this.walkPh += dt * Math.abs(p.vy) * 0.16;
      const s = Math.sin(this.walkPh);
      armF = -2.75 + s * 0.35; armB = 2.75 + s * 0.35; legF = s * 0.45; legB = -s * 0.45;
      by = Math.abs(s) * 0.6; lean = 0; hy = 0; hr = 0; direct = false;
    }
    // 피격: 뒤로 움찔했다가 돌아온다
    const hurtK = p.hurtT > 0 ? Math.max(0, (p.hurtT - (HURT_TIME - 0.22)) / 0.22) : 0;
    if (hurtK > 0) { lean = -0.3 * hurtK; hr = -0.25 * hurtK; armF -= 0.5 * hurtK; armB += 0.5 * hurtK; }
    if (dead) { legF = 0.2; legB = -0.2; armF = -0.6; armB = 0.6; wpn = 1.4; by = 0; lean = 0; hy = 0; }

    const r = direct ? 60 : 16;
    P.legF = smooth(P.legF, legF, dt, 22); P.legB = smooth(P.legB, legB, dt, 22);
    P.armF = smooth(P.armF, armF, dt, r); P.armB = smooth(P.armB, armB, dt, 16);
    P.wpn = smooth(P.wpn, wpn, dt, r); P.by = smooth(P.by, by, dt, 20);
    P.lean = smooth(P.lean, lean, dt, 14); P.hy = smooth(P.hy, hy, dt, 14); P.hr = smooth(P.hr, hr, dt, 12);

    // 착지 스쿼시
    if (p.onGround && !this.wasGround) this.squash = 1;
    this.wasGround = p.onGround;
    this.squash = smooth(this.squash, 0, dt, 9);
    this.flip = smooth(this.flip, p.facing, dt, 22);
    this.lie = smooth(this.lie, dead ? 1 : 0, dt, 8);

    // 무기 텍스처
    const tool = p.rope >= 0 ? null : p.swingT > 0 && (p.swingKind === 'mining' || p.swingKind === 'chopping')
      ? (p.swingKind === 'mining' ? (c.equipment.pickaxe ? 'wp_pick_stone' : 'wp_pick') : (c.equipment.axe ? 'wp_axe_stone' : 'wp_axe'))
      : c.equipment.weapon ? `wp_${c.equipment.weapon}` : null;
    this.weapon.setVisible(!!tool);
    if (tool && this.weapon.texture.key !== tool) this.weapon.setTexture(tool);

    // 눈 깜빡임
    this.blinkT -= dt;
    if (this.blinkT < -0.12) this.blinkT = 2 + Math.random() * 3;
    const closed = dead || this.blinkT < 0 || p.hurtT > 0;
    const hk = `${this.key}_head${closed ? '_b' : ''}`;
    if (this.head.texture.key !== hk) this.head.setTexture(hk);

    // 적용
    const b = this.body;
    b.setScale(this.flip * (1 + this.squash * 0.12), 1 - this.squash * 0.16);
    b.setRotation(-this.lie * 1.45 * p.facing);
    b.y = -this.lie * 4;
    // 다리는 골반, 팔은 몸통 양옆 어깨, 머리는 목에 붙는다
    this.legB.setPosition(-2.4, -8.5).setRotation(P.legB);
    this.legF.setPosition(2.4, -8.5).setRotation(P.legF);
    this.torso.setPosition(0, -6.5 + P.by).setRotation(P.lean);
    const sx = P.lean * 9;
    this.armB.setPosition(-5.5 + sx, -15.5 + P.by).setRotation(P.armB);
    this.armF.setPosition(5.5 + sx, -15.5 + P.by).setRotation(P.armF);
    this.weapon.setRotation(P.wpn - P.armF).setOrigin(0.5, tool?.includes('bow') ? 0.5 : 0.82);
    this.head.setPosition(sx * 1.3, -14.5 + P.by + P.hy).setRotation(P.lean * 0.5 + P.hr);
    // 피격 표현: 처음엔 붉게, 이후 무적 시간처럼 깜빡인다(화면은 흔들지 않는다)
    const tint = hurtK > 0 ? 0xff8a8a : 0xffffff;
    for (const o of [this.torso, this.head, this.legF, this.legB, this.armB]) o.setTint(tint);
    b.setAlpha(p.hurtT > 0 && !dead && Math.sin(this.t * 38) > 0 ? 0.35 : 1);
    b.x = -p.facing * hurtK * 2.5;

    this.root.setPosition(p.x, p.y);
    this.shadow.setScale(p.onGround ? 1 : 0.7).setAlpha(p.onGround ? 0.22 : 0.1);
  }
  destroy() { this.root.destroy(); }
}

// ───────── 몬스터 ─────────
class MobView {
  root: Phaser.GameObjects.Container;
  private spr: Img; private wings: Img[] = []; private shadow: Img;
  private bar: Phaser.GameObjects.Graphics;
  private ph = Math.random() * 6; private flip = 1; private scale = 0; private hpShown = 1; private wasAlive = true;
  constructor(private scene: GameScene, readonly m: Mob) {
    this.shadow = scene.add.image(0, 0, 'shadow').setAlpha(0.2);
    this.spr = scene.add.image(0, 0, `mob_${m.def.id}`).setOrigin(0.5, 1);
    const parts: Phaser.GameObjects.GameObject[] = [this.shadow];
    if (m.def.motion === 'float') {
      this.wings = [scene.add.image(-4, -12, 'mob_leafling_wing').setOrigin(1, 0.5), scene.add.image(4, -12, 'mob_leafling_wing').setOrigin(1, 0.5).setFlipX(true).setOrigin(0, 0.5)];
      parts.push(...this.wings);
    }
    this.bar = scene.add.graphics();
    parts.push(this.spr, this.bar);
    this.root = scene.add.container(m.x, m.y, parts).setDepth(40);
  }
  update(dt: number) {
    const m = this.m;
    if (!m.alive) {
      if (this.wasAlive) { this.wasAlive = false; this.scene.puff(m.x, m.y - 8, 0xffffff, 7); }
      this.scale = smooth(this.scale, 0, dt, 18);
      this.root.setVisible(this.scale > 0.05);
      this.spr.setScale(this.scale);
      return;
    }
    this.wasAlive = true;
    this.root.setVisible(true);
    // 등장: 통통 튀며 커진다
    const a = Math.min(1, m.spawnAge / 0.45);
    this.scale = a < 1 ? 1 + Math.sin(a * Math.PI) * 0.25 - (1 - a) : smooth(this.scale, 1, dt, 12);
    this.flip = smooth(this.flip, m.dir, dt, 14);
    const walking = m.moving && m.hitT <= 0;
    this.ph += dt * (walking ? 7 : 2.5);
    let y = 0, sx = 1, sy = 1, rot = 0;
    if (m.def.motion === 'hop') {
      if (walking) { const h = Math.abs(Math.sin(this.ph)); y = -h * 4.5; sy = 0.86 + h * 0.24; sx = 1.12 - h * 0.18; }
      else { sy = 1 + Math.sin(this.ph) * 0.05; sx = 1 - Math.sin(this.ph) * 0.04; }
    } else if (m.def.motion === 'waddle') {
      rot = walking ? Math.sin(this.ph * 1.3) * 0.16 : Math.sin(this.ph) * 0.03;
      y = walking ? -Math.abs(Math.sin(this.ph * 1.3)) * 1.5 : 0;
    } else {
      y = -9 + Math.sin(this.ph * 0.8) * 2.5; rot = Math.sin(this.ph * 0.8 + 1) * 0.08;
      const flap = Math.sin(this.ph * 5) * 0.6;
      this.wings[0].setRotation(flap + 0.2).setY(y - 10); this.wings[1].setRotation(-flap - 0.2).setY(y - 10);
    }
    if (m.hitT > 0) { const k = m.hitT / 0.22; sx *= 1 + k * 0.22; sy *= 1 - k * 0.2; }
    if (m.hitT > 0.12) this.spr.setTintFill(0xffffff); else this.spr.clearTint();
    this.spr.setPosition(0, y).setScale(sx * this.scale * this.flip, sy * this.scale).setRotation(rot * this.flip);
    this.shadow.setScale(1 + y * 0.03);
    this.root.setPosition(m.x, m.y);
    // 체력바
    this.hpShown = smooth(this.hpShown, m.hp / m.def.hp, dt, 14);
    this.bar.clear();
    if (m.hp < m.def.hp) {
      const top = -24 + (m.def.motion === 'float' ? -9 : 0);
      this.bar.fillStyle(0x2b1d2e).fillRect(-9, top, 18, 4);
      this.bar.fillStyle(0xf6c945).fillRect(-8, top + 1, 16 * Math.max(0, this.hpShown), 2);
      this.bar.fillStyle(0xd9574a).fillRect(-8, top + 1, 16 * Math.max(0, m.hp / m.def.hp), 2);
    }
  }
}

class NodeView {
  private top: Img | null = null; private base: Img;
  private bar: Phaser.GameObjects.Graphics; private t = Math.random() * 5; private shown = 0;
  constructor(scene: Phaser.Scene, readonly n: NodeInst) {
    if (n.def.skill === 'chopping') {
      this.base = scene.add.image(n.x, n.y + 1, `node_${n.def.id}_trunk`).setOrigin(0.5, 1).setDepth(20);
      this.top = scene.add.image(n.x, n.y - 22, `node_${n.def.id}_top`).setOrigin(0.5, 0.85).setDepth(21);
    } else {
      this.base = scene.add.image(n.x, n.y + 2, `node_${n.def.id}`).setOrigin(0.5, 1).setDepth(20);
    }
    this.bar = scene.add.graphics().setDepth(60).setPosition(n.x, n.y);
    label(scene, n.def.name, 6, '#fff3d6').setPosition(n.x, n.y - (this.top ? 58 : 30)).setDepth(22).setAlpha(0.9);
  }
  update(dt: number) {
    const n = this.n;
    this.t += dt;
    const k = n.shakeT / 0.3, shake = Math.sin(n.shakeT * 45) * k;
    if (this.top) {
      this.top.setRotation(Math.sin(this.t * 1.3) * 0.025 + shake * 0.09).setScale(1 + k * 0.04, 1 - k * 0.05);
      this.base.setRotation(shake * 0.02);
    } else {
      this.base.setX(n.x + shake * 1.5).setScale(1 + k * 0.06, 1 - k * 0.08);
    }
    this.shown = smooth(this.shown, n.progress / n.def.hp, dt, 16);
    this.bar.clear();
    if (n.progress > 0 || n.shakeT > 0) {
      const top = this.top ? -66 : -38;
      this.bar.fillStyle(0x2b1d2e).fillRect(-11, top, 22, 4);
      this.bar.fillStyle(0x8fde5d).fillRect(-10, top + 1, 20 * Phaser.Math.Clamp(this.shown, 0, 1), 2);
    }
  }
}

let texturesReady = false;
function ensureTextures(scene: Phaser.Scene) {
  for (const [key, cv] of canvases) if (!scene.textures.exists(key)) scene.textures.addCanvas(key, cv);
  texturesReady = true;
}

export class GameScene extends Phaser.Scene {
  private world: World | null = null;
  private rig: CharRig | null = null;
  private mobs: MobView[] = [];
  private nodeViews: NodeView[] = [];
  private dropViews = new Map<number, Img>();
  private shotViews = new Map<number, Img>();
  private statics: Phaser.GameObjects.GameObject[] = [];
  private hills: { ts: Phaser.GameObjects.TileSprite; f: number }[] = [];
  private clouds: { img: Img; x: number; y: number; sp: number }[] = [];
  private swayers: { img: Img; ph: number }[] = [];
  private portals: { ring: Img; glow: Img; lock: Img; text: Phaser.GameObjects.Text; idx: number }[] = [];
  private flames: Img[] = [];
  private arrow: Img | null = null;
  private npc: { img: Img; mark: Phaser.GameObjects.Text } | null = null;
  private camX = 0; private camY = 0; private time0 = 0;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private pending: World | null | undefined;

  constructor(private game_: Game) { super('game'); }

  create() {
    buildAll();
    ensureTextures(this);
    this.keys = this.input.keyboard!.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE') as Record<string, Phaser.Input.Keyboard.Key>;
    this.scale.on('resize', () => this.fitCamera());
    document.getElementById('game')!.addEventListener('pointerdown', (e) => this.onTap(e));
    this.fitCamera();
    if (this.pending !== undefined) this.setWorld(this.pending);
    else this.setWorld(this.game_.world);
  }

  private fitCamera() {
    const { width, height } = this.scale;
    this.cameras.main.setZoom(Math.min(height / 205, width / 250));
  }

  /** 맵 전환/캐릭터 전환 시 화면을 새로 구성 */
  setWorld(w: World | null) {
    if (!texturesReady || !this.sys.isActive()) { this.pending = w; return; }
    this.pending = undefined;
    this.world = w;
    this.rig?.destroy(); this.rig = null;
    for (const o of this.statics) o.destroy();
    for (const v of this.mobs) v.root.destroy();
    for (const d of this.dropViews.values()) d.destroy();
    for (const d of this.shotViews.values()) d.destroy();
    this.shotViews.clear();
    this.statics = []; this.mobs = []; this.nodeViews = []; this.dropViews.clear();
    this.hills = []; this.clouds = []; this.swayers = []; this.portals = []; this.flames = []; this.npc = null;
    const sky = document.getElementById('sky')!;
    if (!w) { sky.style.background = 'linear-gradient(#3b3355, #6a5a8a)'; return; }

    const map = w.map, th = THEMES[map.theme];
    sky.style.background = `linear-gradient(${th.sky[0]}, ${th.sky[1]} 75%)`;
    const keep = <T extends Phaser.GameObjects.GameObject>(o: T) => { this.statics.push(o); return o; };

    // 원경
    for (const [layer, f, y] of [['far', 0.12, -28], ['mid', 0.3, -6]] as const) {
      const ts = keep(this.add.tileSprite(0, y, 600, 90, `hill_${map.theme}_${layer}`).setOrigin(0, 1).setDepth(layer === 'far' ? 1 : 3));
      ts.setAlpha(layer === 'far' ? 0.75 : 1);
      this.hills.push({ ts, f });
    }
    keep(this.add.rectangle(-600, -6, map.width + 1200, 12, Phaser.Display.Color.HexStringToColor(th.mid).color).setOrigin(0, 0).setDepth(3));
    for (let i = 0; i < 6; i++) {
      const img = keep(this.add.image(0, 0, 'cloud').setDepth(2).setAlpha(map.theme === 'forest' ? 0.25 : 0.8).setScale(0.7 + hash(i + 3) * 0.8));
      this.clouds.push({ img, x: hash(i + 11) * 700, y: -95 - hash(i + 20) * 90, sp: 3 + hash(i + 40) * 5 });
    }
    // 지면과 발판
    keep(this.add.tileSprite(-600, 0, map.width + 1200, 48, `tile_${map.theme}`).setOrigin(0, 0).setDepth(10));
    keep(this.add.rectangle(-600, 48, map.width + 1200, 400, Phaser.Display.Color.HexStringToColor(th.dirt[1]).color).setOrigin(0, 0).setDepth(10));
    for (const p of map.platforms) {
      keep(this.add.image(p.x - 2, p.y, `plat_${map.theme}_l`).setOrigin(0, 0).setDepth(11));
      keep(this.add.tileSprite(p.x + 14, p.y, p.w - 28, 12, `plat_${map.theme}_m`).setOrigin(0, 0).setDepth(11));
      keep(this.add.image(p.x + p.w + 2, p.y, `plat_${map.theme}_r`).setOrigin(1, 0).setDepth(11));
    }
    // 로프
    for (const r of map.ropes) {
      keep(this.add.tileSprite(r.x, r.top - 3, 5, r.bottom - r.top + 1, 'rope').setOrigin(0.5, 0).setDepth(13));
      keep(this.add.image(r.x, r.top + 1, 'rope_knot').setDepth(14));
    }
    this.arrow = keep(this.add.image(0, 0, 'ui_arrow').setDepth(96).setVisible(false));
    // 풀/꽃 장식
    const seed = map.id.length * 13 + map.width;
    const surfaces = [{ x: 0, y: 0, w: map.width }, ...map.platforms];
    for (let i = 0; i < Math.floor(map.width / 14); i++) {
      const s = surfaces[Math.floor(hash(seed + i * 3) * surfaces.length)];
      const x = s.x + 6 + hash(seed + i * 7) * (s.w - 12);
      const flower = hash(seed + i * 5) > 0.72;
      const key = flower ? `deco_flower${Math.floor(hash(seed + i) * 3)}` : 'deco_grass';
      const img = keep(this.add.image(x, s.y + 1, key).setOrigin(0.5, 1).setDepth(hash(seed + i * 9) > 0.5 ? 12 : 70));
      this.swayers.push({ img, ph: hash(i) * 6 });
    }
    // 마을 오브젝트
    if (map.craftX !== undefined) {
      keep(this.add.image(map.craftX, 1, 'obj_craft').setOrigin(0.5, 1).setDepth(20));
      keep(label(this, '제작대', 6.5, '#fff3d6').setPosition(map.craftX, -26).setDepth(22));
      const fx = 62;
      keep(this.add.image(fx, 1, 'obj_logs').setOrigin(0.5, 1).setDepth(20));
      for (let i = 0; i < 3; i++) this.flames.push(keep(this.add.image(fx + (i - 1) * 4, -4, 'fx_flame').setOrigin(0.5, 1).setDepth(21)));
    }
    if (map.npcX !== undefined) {
      const look = { hair: 2, hairColor: '#e9e4f0', skin: '#f2bd94', outfit: '#8a6fd1' };
      portraitUrl(look);
      ensureTextures(this);
      const img = keep(this.add.image(map.npcX, 1, `${buildLook(look)}_portrait`).setOrigin(0.5, 1).setDepth(30).setFlipX(true));
      keep(label(this, NPC_NAME, 6.5, '#fff3d6').setOrigin(0.5, 0).setPosition(map.npcX, 3).setDepth(31));
      const mark = keep(label(this, '!', 13, '#ffd84a').setDepth(31));
      this.npc = { img, mark };
    }
    // 포탈
    map.portals.forEach((q, idx) => {
      const glow = keep(this.add.image(q.x, -22, 'portal_glow').setDepth(18));
      const ring = keep(this.add.image(q.x, -22, 'portal_ring').setDepth(19));
      const lock = keep(this.add.image(q.x, -22, 'portal_locked').setDepth(19));
      const text = keep(label(this, '', 6.5).setPosition(q.x, -47).setDepth(22));
      this.portals.push({ ring, glow, lock, text, idx });
    });
    this.nodeViews = w.nodes.map((n) => new NodeView(this, n));
    this.mobs = w.mobs.map((m) => new MobView(this, m));
    this.rig = new CharRig(this, w.char.look, w.char.name);
    this.camX = w.player.x; this.camY = 0;
    this.cameras.main.fadeIn(250, 20, 16, 30);
  }

  /** 월드 이벤트 연출 */
  handle(e: WorldEvent) {
    if (!this.world) return;
    if (e.t === 'dmg') {
      const col = e.onPlayer ? '#ff6b6b' : e.crit ? '#ffd84a' : '#ffffff';
      const t = label(this, `${e.amount}${e.crit ? '!' : ''}`, e.crit ? 11 : 8.5, col).setPosition(e.x + (Math.random() - 0.5) * 8, e.y).setDepth(90);
      const s0 = t.scale;
      t.setScale(s0 * 0.4);
      this.tweens.add({ targets: t, scale: s0, duration: 160, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t, y: e.y - 20, duration: 750, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: t, alpha: 0, delay: 480, duration: 270, onComplete: () => t.destroy() });
      if (!e.onPlayer) this.puff(e.x, e.y + 8, 0xfff3b0, 3);
    } else if (e.t === 'level' || e.t === 'skill') {
      const p = this.world.player;
      const txt = e.t === 'level' ? 'LEVEL UP!' : `${e.name} Lv.${e.level}`;
      const t = label(this, txt, 11, e.t === 'level' ? '#ffe98a' : '#a5f0c0').setPosition(p.x, p.y - 44).setDepth(95);
      this.tweens.add({ targets: t, y: p.y - 66, duration: 1400, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: t, alpha: 0, delay: 1000, duration: 400, onComplete: () => t.destroy() });
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const s = this.add.image(p.x, p.y - 16, 'fx_px').setTint(e.t === 'level' ? 0xffe98a : 0xa5f0c0).setDepth(94).setScale(0.6);
        this.tweens.add({ targets: s, x: p.x + Math.cos(a) * 30, y: p.y - 16 + Math.sin(a) * 30, alpha: 0, angle: 180, duration: 700, ease: 'Cubic.easeOut', onComplete: () => s.destroy() });
      }
    } else if (e.t === 'cast') {
      if (e.id === 'nova') {
        const ring = this.add.circle(e.x, e.y - 10, 6, 0xa5d8ff, 0.5).setStrokeStyle(2, 0xffffff).setDepth(86);
        this.tweens.add({ targets: ring, scale: 9, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
        this.puff(e.x, e.y - 10, 0xa5d8ff, 12);
        this.cameras.main.shake(120, 0.005);
      } else if (e.id === 'volley') {
        this.puff(e.x, e.y - 16, 0xffffff, 4);
      } else if (e.id === 'smash' || e.id === 'cleave') {
        // 충격파 고리
        const ring = this.add.ellipse(e.x, e.y - 3, 10, 4).setStrokeStyle(2, 0xffe98a).setDepth(86);
        this.tweens.add({ targets: ring, width: SMASH_RANGE * 2, height: 14, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onUpdate: () => ring.setSize(ring.width, ring.height), onComplete: () => ring.destroy() });
        this.puff(e.x, e.y - 4, 0xffe98a, 10);
        this.cameras.main.shake(120, 0.006);
      } else {
        for (let i = 0; i < 8; i++) {
          const s = this.add.image(e.x + (Math.random() - 0.5) * 20, e.y - 6 - Math.random() * 10, 'fx_px').setTint(0x8fde5d).setDepth(94).setScale(0.7);
          this.tweens.add({ targets: s, y: s.y - 24, alpha: 0, delay: i * 40, duration: 600, onComplete: () => s.destroy() });
        }
      }
    } else if (e.t === 'yield') {
      this.puff(e.x, e.y + 10, 0xe8c08a, 5);
    }
  }

  puff(x: number, y: number, tint: number, n: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = 6 + Math.random() * 10;
      const s = this.add.image(x, y, 'fx_puff').setTint(tint).setDepth(85).setScale(0.5 + Math.random() * 0.6).setAlpha(0.9);
      this.tweens.add({ targets: s, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d - 4, alpha: 0, scale: 0.1, duration: 320 + Math.random() * 200, ease: 'Cubic.easeOut', onComplete: () => s.destroy() });
    }
  }

  update(_: number, deltaMs: number) {
    const dt = Math.min(deltaMs / 1000, 0.05), g = this.game_, k = this.keys;
    this.time0 += dt;
    // 키보드 입력 합치기 (PC)
    g.input.move = (k.LEFT.isDown || k.A.isDown ? -1 : 0) + (k.RIGHT.isDown || k.D.isDown ? 1 : 0);
    g.input.climb = (k.UP.isDown || k.W.isDown ? -1 : 0) + (k.DOWN.isDown || k.S.isDown ? 1 : 0);
    g.tick(dt);

    const w = this.world;
    if (!w || w !== g.world) return;
    this.rig?.update(dt, w);
    for (const v of this.mobs) v.update(dt);
    for (const v of this.nodeViews) v.update(dt);
    this.syncDrops(w);
    this.syncShots(w);
    for (const s of this.swayers) s.img.setRotation(Math.sin(this.time0 * 1.6 + s.ph) * 0.12);
    this.flames.forEach((f, i) => f.setScale(0.9 + Math.sin(this.time0 * 11 + i * 2) * 0.25, 1 + Math.sin(this.time0 * 8 + i * 1.3) * 0.35).setAlpha(0.85));
    // 터치로 지정한 대상 위에 화살표를 띄운다
    const tgt = w.commandTarget();
    if (this.arrow) {
      this.arrow.setVisible(!!tgt);
      if (tgt) this.arrow.setPosition(tgt.x, tgt.y + Math.sin(this.time0 * 7) * 2.2);
    }
    if (this.npc) {
      const q = currentQuest(w.char), qp = questProgress(w.char);
      const m = !q ? '' : !w.char.quest.accepted ? '!' : qp?.done ? '?' : '';
      if (this.npc.mark.text !== m) this.npc.mark.setText(m);
      this.npc.mark.setPosition(w.map.npcX!, -34 + Math.sin(this.time0 * 4) * 1.5);
      this.npc.img.setScale(1 - Math.sin(this.time0 * 2.2) * 0.012, 1 + Math.sin(this.time0 * 2.2) * 0.02);
    }
    for (const pv of this.portals) {
      const q = w.map.portals[pv.idx], open = w.portalOpen(q);
      pv.ring.setVisible(open); pv.glow.setVisible(open); pv.lock.setVisible(!open);
      pv.glow.setScale(0.9 + Math.sin(this.time0 * 3 + pv.idx) * 0.1, 1).setAlpha(0.75 + Math.sin(this.time0 * 4) * 0.2);
      pv.ring.setY(-22 + Math.sin(this.time0 * 2 + pv.idx) * 1);
      const txt = open ? MAPS[q.to].name : `처치 ${w.char.kills[w.map.id] ?? 0}/${q.reqKills}`;
      if (pv.text.text !== txt) pv.text.setText(txt);
    }

    // 카메라: 부드럽게 따라가며 맵 경계에서 멈춘다
    const cam = this.cameras.main, p = w.player;
    const halfW = cam.width / cam.zoom / 2, halfH = cam.height / cam.zoom / 2;
    const tx = w.map.width > halfW * 2 ? Phaser.Math.Clamp(p.x + p.facing * 14, halfW, w.map.width - halfW) : w.map.width / 2;
    const base = 52 - halfH;
    const ty = base + Math.min(0, (p.y + 50) * 0.7);
    this.camX = smooth(this.camX, tx, dt, 5); this.camY = smooth(this.camY, ty, dt, 4);
    if (Math.abs(this.camX - tx) > halfW * 2) this.camX = tx;
    cam.centerOn(this.camX, this.camY);
    const left = this.camX - halfW;
    for (const h of this.hills) { h.ts.setPosition(left - 4, h.ts.y).setSize(halfW * 2 + 8, 90); h.ts.tilePositionX = left * h.f; }
    for (const c of this.clouds) {
      const span = halfW * 2 + 120;
      const x = (((c.x + this.time0 * c.sp - left * 0.08) % span) + span) % span;
      c.img.setPosition(left - 60 + x, c.y);
    }
  }

  private syncShots(w: World) {
    const alive = new Set<number>();
    for (const s of w.shots) {
      alive.add(s.uid);
      let img = this.shotViews.get(s.uid);
      if (!img) { img = this.add.image(s.x, s.y, `shot_${s.kind}`).setDepth(80); this.shotViews.set(s.uid, img); }
      img.setPosition(s.x, s.y).setRotation(s.kind === 'arrow' ? s.angle : this.time0 * 8);
    }
    for (const [uid, img] of this.shotViews) if (!alive.has(uid)) { img.destroy(); this.shotViews.delete(uid); }
  }

  /** 화면 터치 → 월드 좌표로 바꿔 명령을 내린다 */
  private onTap(ev: PointerEvent) {
    const w = this.world;
    if (!w || w !== this.game_.world) return;
    const v = this.cameras.main.worldView;
    const x = v.x + (ev.clientX / innerWidth) * v.width, y = v.y + (ev.clientY / innerHeight) * v.height;
    const cmd = w.tap(x, y);
    if (!cmd) return;
    // 터치 표시: 이동은 바닥에 고리, 대상 지정은 붉은 고리
    const target = cmd.k !== 'move';
    const ring = this.add.ellipse(cmd.k === 'move' ? cmd.x : x, cmd.k === 'move' ? cmd.y : y, 4, target ? 4 : 2)
      .setStrokeStyle(1.5, target ? 0xff8a7a : 0xffffff).setDepth(88);
    this.tweens.add({ targets: ring, scaleX: 5, scaleY: 5, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  private syncDrops(w: World) {
    const alive = new Set<number>();
    for (const d of w.drops) {
      alive.add(d.uid);
      let img = this.dropViews.get(d.uid);
      if (!img) { img = this.add.image(d.x, d.y, d.coin ? 'it_coin' : ITEM_ICON[d.id]).setDepth(45).setScale(0.85); this.dropViews.set(d.uid, img); }
      const rest = d.vy === 0;
      img.setPosition(d.x, d.y + (rest ? Math.sin(d.age * 5) * 1.2 : 0)).setRotation(rest ? 0 : d.age * 9);
    }
    for (const [uid, img] of this.dropViews) if (!alive.has(uid)) { img.destroy(); this.dropViews.delete(uid); }
  }
}
