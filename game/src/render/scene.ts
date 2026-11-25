// 월드 상태를 화면에 그린다. 픽셀 파츠를 관절처럼 부드럽게 회전/이동시키는 방식.
import Phaser from 'phaser';
import { MAPS } from '../core/data';
import { Look } from '../core/state';
import { DROP_LIFE, HURT_TIME, Mob, NodeInst, Player, SWING_TIME, SwingKind, World, WorldEvent } from '../core/world';
import { Game } from '../game';
import { ART, ITEM_ICON, THEMES, buildAll, buildLook, canvases, frameDefs, portraitUrl } from './sprites';
import { CLIPS, FH, MQ_SCALE, ROOT_Y, bakeClip } from './mannequin';
import { GEAR, gearKey, gearPos, remoteGear } from './gear';
import { Character, currentQuest, lookOf, portalLock, questProgress } from '../core/state';
import { canSubclass, CLASS_LEVEL, CLASS_NPCS, FACILITY_NAMES, ITEMS, NPCS, SMASH_RANGE } from '../core/data';

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
/** 리그가 읽는 값(내 캐릭터는 World.player, 다른 플레이어는 네트워크로 받은 값) */
type RigPlayer = Pick<Player, 'x' | 'y' | 'vx' | 'vy' | 'onGround' | 'facing' | 'swingT' | 'swingKind' | 'dead' | 'hurtT' | 'rope'>;
type RigChar = Pick<Character, 'equipment' | 'cls'> & { skins?: Character['skins'] };
class CharRig {
  root: Phaser.GameObjects.Container;
  private body: Phaser.GameObjects.Container;
  private back: Img; private front: Img; private weapon: Img; private armor: Img; private hat: Img;
  private shadow: Img; private name: Phaser.GameObjects.Text;
  private key: string;
  private t = Math.random() * 10; private walkPh = 0; private idlePh = Math.random(); private airT = 0;
  private flip = 1; private squash = 0; private wasGround = true; private lie = 0;
  private clip = ''; private frame = -1;

  constructor(private scene: Phaser.Scene, look: Look, name: string) {
    const k = (this.key = buildLook(look));
    ensureTextures(scene);
    const oy = ROOT_Y / FH;
    this.shadow = scene.add.image(0, 0, 'shadow').setOrigin(0.5, 0.5).setAlpha(0.22);
    this.back = scene.add.image(0, 0, `${k}_idle`, 'b0').setOrigin(0.5, oy).setScale(MQ_SCALE);
    this.weapon = scene.add.image(0, 0, 'wp_sword_wood').setOrigin(0.5, 0.82).setScale(ART);
    this.front = scene.add.image(0, 0, `${k}_idle`, 'f0').setOrigin(0.5, oy).setScale(MQ_SCALE);
    this.armor = scene.add.image(0, 0, 'shadow').setOrigin(0, 0).setScale(MQ_SCALE).setVisible(false);
    this.hat = scene.add.image(0, 0, 'shadow').setOrigin(0, 0).setScale(MQ_SCALE).setVisible(false);
    // 몸 → 갑옷 → 모자 → 무기 → 앞팔 순서: 손이 무기 손잡이를 감싼다
    this.body = scene.add.container(0, 0, [this.back, this.armor, this.hat, this.weapon, this.front]);
    this.name = label(scene, name, 6.5).setOrigin(0.5, 0).setPosition(0, 3);
    this.root = scene.add.container(0, 0, [this.shadow, this.body, this.name]).setDepth(50);
  }

  /** 지금 상태에 맞는 동작과 프레임 */
  private pick(dt: number, p: RigPlayer): [string, number] {
    const n = (c: string) => CLIPS[c].frames;
    const at = (c: string, u: number) => [c, Math.max(0, Math.min(n(c) - 1, Math.floor(u * n(c))))] as [string, number];
    const loop = (c: string, ph: number) => [c, ((Math.floor(ph * n(c)) % n(c)) + n(c)) % n(c)] as [string, number];
    if (p.dead > 0) return ['dead', 0];
    if (p.hurtT > HURT_TIME - 0.24 && p.swingT <= 0) return at('hurt', 1 - (p.hurtT - (HURT_TIME - 0.24)) / 0.24);
    if (p.rope >= 0) { this.walkPh += dt * Math.abs(p.vy) / 28; return loop('climb', this.walkPh); }
    if (p.swingT > 0) {
      const c = ({ attack: 'swing', shoot: 'shoot', cast: 'cast', mining: 'mine', chopping: 'chop', fishing: 'chop', catching: 'swing' } as Record<SwingKind, string>)[p.swingKind];
      return at(c, 1 - p.swingT / SWING_TIME);
    }
    if (!p.onGround) { this.airT += dt; return at(p.vy < 0 ? 'jump' : 'fall', this.airT * 8); }
    this.airT = 0;
    if (Math.abs(p.vx) > 6) { this.walkPh += (dt * Math.abs(p.vx)) / 34; return loop('walk', this.walkPh); }
    this.idlePh += dt / 1.7;
    return loop('idle', this.idlePh);
  }

  update(dt: number, p: RigPlayer, c: RigChar) {
    this.t += dt;
    const dead = p.dead > 0;
    const [clip, f] = this.pick(dt, p);
    if (clip !== this.clip || f !== this.frame) {
      this.clip = clip; this.frame = f;
      this.back.setTexture(`${this.key}_${clip}`, `b${f}`);
      this.front.setTexture(`${this.key}_${clip}`, `f${f}`);
    }
    const an = bakeClip(clip).anchors[f];

    // 무기: 손 위치에 붙이고 프레임에 기록된 각도로 돌린다
    // 채집 중에는 그 기술의 도구(없으면 기본 도구)를 든다
    const TOOL: Partial<Record<SwingKind, [keyof RigChar['equipment'], string]>> = { mining: ['pickaxe', 'wp_pick'], chopping: ['axe', 'wp_axe'], fishing: ['rod', 'wp_rod'], catching: ['net', 'wp_net'] };
    const tk = p.swingT > 0 ? TOOL[p.swingKind] : undefined;
    const tool = p.rope >= 0 ? null : tk ? (c.equipment[tk[0]] ? `wp_${c.equipment[tk[0]]}` : tk[1])
      : c.equipment.weapon ? `wp_${c.equipment.weapon}` : null;
    this.weapon.setVisible(!!tool);
    if (tool && this.weapon.texture.key !== tool) this.weapon.setTexture(tool);
    if (tool) {
      this.weapon.setOrigin(0.5, tool.includes('bow') ? 0.5 : 0.82);
      this.weapon.setPosition(an.hand[0] * MQ_SCALE, an.hand[1] * MQ_SCALE).setRotation(an.wpn);
    }

    // 장비 겉모습: 머리·몸통이 움직인 칸만큼 따라간다
    const look = lookOf(c);
    for (const [img, id] of [[this.hat, look.hat], [this.armor, look.body]] as const) {
      const g = id ? GEAR[id] : undefined;
      img.setVisible(!!g);
      if (!g || !id) continue;
      if (img.texture.key !== gearKey(id)) img.setTexture(gearKey(id));
      const [x, y] = gearPos(g, an.off);
      img.setPosition(x * MQ_SCALE, y * MQ_SCALE);
    }

    // 착지 스쿼시, 방향 전환, 쓰러짐
    if (p.onGround && !this.wasGround) this.squash = 1;
    this.wasGround = p.onGround;
    this.squash = smooth(this.squash, 0, dt, 9);
    this.flip = smooth(this.flip, p.facing, dt, 22);
    this.lie = smooth(this.lie, dead ? 1 : 0, dt, 8);
    const b = this.body;
    b.setScale(this.flip * (1 + this.squash * 0.1), 1 - this.squash * 0.12);
    b.setRotation(-this.lie * 1.45 * p.facing);
    b.y = -this.lie * 4;
    // 피격: 처음엔 붉게, 이후 무적 시간처럼 깜빡인다(화면은 흔들지 않는다)
    const hurtK = p.hurtT > 0 ? Math.max(0, (p.hurtT - (HURT_TIME - 0.3)) / 0.3) : 0;
    // 맞는 순간 붉었다가 부드럽게 돌아온다(깜빡이지 않게)
    const gb = Math.round(255 - 110 * hurtK), tint = (0xff << 16) | (gb << 8) | gb;
    this.back.setTint(tint); this.front.setTint(tint); this.hat.setTint(tint); this.armor.setTint(tint);
    b.setAlpha(1);
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
    this.spr = scene.add.image(0, 0, `mob_${m.def.art ?? m.def.id}`).setOrigin(0.5, 1);
    if (m.def.tint) this.spr.setTint(m.def.tint);
    const parts: Phaser.GameObjects.GameObject[] = [this.shadow];
    if (m.def.motion === 'float') {
      const art = m.def.art ?? m.def.id, wk = scene.textures.exists(`mob_${art}_wing`) ? `mob_${art}_wing` : 'mob_leafling_wing';
      this.wings = [scene.add.image(-4, -12, wk).setOrigin(1, 0.5).setScale(ART), scene.add.image(4, -12, wk).setOrigin(1, 0.5).setFlipX(true).setOrigin(0, 0.5).setScale(ART)];
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
    // 맞으면 잠깐 옅은 붉은빛(번쩍이는 흰색 대신)
    if (m.hitT > 0.12) this.spr.setTint(0xffb4b4); else if (m.def.tint) this.spr.setTint(m.def.tint); else this.spr.clearTint();
    const k = (m.def.scale ?? 1) * ART;
    // 보스 내려찍기 예고: 몸을 움츠렸다가 내려찍는다
    if (m.windup > 0) { const t = 1 - m.windup / m.def.boss!.slamWindup; sy *= 1 - Math.sin(t * Math.PI * 0.5) * 0.28; sx *= 1 + Math.sin(t * Math.PI * 0.5) * 0.18; }
    this.spr.setPosition(0, y).setScale(sx * this.scale * this.flip * k, sy * this.scale * k).setRotation(rot * this.flip);
    this.shadow.setScale(1 + y * 0.03);
    this.root.setPosition(m.x, m.y);
    // 체력바
    this.hpShown = smooth(this.hpShown, m.hp / m.def.hp, dt, 14);
    this.bar.clear();
    if (m.hp < m.def.hp && !m.def.boss) {
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
      this.base = scene.add.image(n.x, n.y + 1, `node_${n.def.id}_trunk`).setOrigin(0.5, 1).setDepth(20).setScale(ART);
      this.top = scene.add.image(n.x, n.y - 22, `node_${n.def.id}_top`).setOrigin(0.5, 0.85).setDepth(21).setScale(ART);
    } else {
      this.base = scene.add.image(n.x, n.y + 2, `node_${n.def.id}`).setOrigin(0.5, 1).setDepth(20).setScale(ART);
    }
    this.bar = scene.add.graphics().setDepth(60).setPosition(n.x, n.y);
    this.name = label(scene, n.def.name, 6, '#fff3d6').setPosition(n.x, n.y - (this.top ? 58 : 30)).setDepth(22).setAlpha(0.9);
  }
  private name: Phaser.GameObjects.Text;
  destroy() { this.base.destroy(); this.top?.destroy(); this.bar.destroy(); this.name.destroy(); }
  update(dt: number) {
    const n = this.n;
    this.t += dt;
    const k = n.shakeT / 0.3, shake = Math.sin(n.shakeT * 45) * k;
    if (this.top) {
      this.top.setRotation(Math.sin(this.t * 1.3) * 0.025 + shake * 0.09).setScale((1 + k * 0.04) * ART, (1 - k * 0.05) * ART);
      this.base.setRotation(shake * 0.02);
    } else {
      this.base.setX(n.x + shake * 1.5).setScale((1 + k * 0.06) * ART, (1 - k * 0.08) * ART);
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
  for (const [key, cv] of canvases) {
    if (scene.textures.exists(key)) continue;
    const tex = scene.textures.addCanvas(key, cv);
    for (const [name, x, y, w, h] of frameDefs.get(key) ?? []) tex?.add(name, 0, x, y, w, h);
  }
  texturesReady = true;
}

const SNOWY: string[] = ['snowtown', 'snowfield', 'pinewood', 'frostlake', 'icecave', 'glacier', 'aurora', 'frostpeak'];
const SPACE: string[] = ['nebtown', 'moondust', 'crater', 'nebula', 'asteroid', 'rings', 'comet', 'voidedge'];
const NO_FLOWERS = new Set(['cave', 'mine', 'dunes', 'canyon', 'mirage', 'tomb', 'saltlake', 'starfield', 'sunspire', ...SNOWY, ...SPACE]);
export class GameScene extends Phaser.Scene {
  private world: World | null = null;
  private rig: CharRig | null = null;
  /** 다른 플레이어: 받은 위치로 부드럽게 따라가며 같은 리그로 그린다 */
  private remotes = new Map<string, { rig: CharRig; p: RigPlayer; cls: string; lastSwing: number; seen: number }>();
  private bubbles = new Map<string, { text: Phaser.GameObjects.Text; t: number }>();
  private mobs: MobView[] = [];
  private nodeViews: NodeView[] = [];
  private dropViews = new Map<number, Img>();
  private shotViews = new Map<number, Img>();
  private statics: Phaser.GameObjects.GameObject[] = [];
  private hills: { ts: Phaser.GameObjects.TileSprite; f: number }[] = [];
  private clouds: { img: Img; x: number; y: number; sp: number }[] = [];
  /** 3월드: 내리는 눈송이(화면 기준으로 감싸 돈다) */
  private snow: { img: Img; x: number; y: number; sp: number; ph: number }[] = [];
  private swayers: { img: Img; ph: number }[] = [];
  private twinkles: { img: Img; ph: number }[] = [];
  private portals: { ring: Img; glow: Img; lock: Img; text: Phaser.GameObjects.Text; idx: number }[] = [];
  private flames: Img[] = [];
  private arrow: Img | null = null;
  private npcs: { id: string; img: Img; mark: Phaser.GameObjects.Text; x: number; y: number }[] = [];
  private bossRing: Phaser.GameObjects.Ellipse | null = null;
  private camX = 0; private camY = 0; private time0 = 0;
  private press: { x: number; y: number; used: boolean } | null = null;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private pending: World | null | undefined;

  constructor(private game_: Game) { super('game'); }

  create() {
    buildAll();
    ensureTextures(this);
    // enableCapture=false: 입력칸(이름·채팅)에 W·A·S·D·스페이스를 칠 수 있도록 키를 가로채지 않는다
    this.keys = this.input.keyboard!.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S,SPACE', false) as Record<string, Phaser.Input.Keyboard.Key>;
    this.scale.on('resize', () => this.fitCamera());
    const el = document.getElementById('game')!;
    // 누르는 순간: 떨어진 아이템이면 바로 줍는다. 이동·상호작용 명령은 손을 뗄 때 내린다
    el.addEventListener('pointerdown', (e) => {
      this.sweeping = true;
      this.press = { x: e.clientX, y: e.clientY, used: this.pickDrop(e) };
    });
    // 누른 채 밀면 지나간 자리의 아이템을 줍는다(캐릭터는 움직이지 않는다)
    el.addEventListener('pointermove', (e) => {
      if (!this.sweeping || !this.press) return;
      if (Math.hypot(e.clientX - this.press.x, e.clientY - this.press.y) > 14) this.press.used = true;
      this.pickAt(e);
    });
    el.addEventListener('pointerup', (e) => {
      const p = this.press;
      this.sweeping = false; this.press = null;
      if (p && !p.used) this.onTap(e);
    });
    addEventListener('pointerup', () => { this.sweeping = false; this.press = null; });
    addEventListener('pointercancel', () => { this.sweeping = false; this.press = null; });
    this.fitCamera();
    if (this.pending !== undefined) this.setWorld(this.pending);
    else this.setWorld(this.game_.world);
  }

  private fitCamera() {
    const { width, height } = this.scale;
    this.cameras.main.setZoom(Math.min(height / 200, width / 245)); // 위쪽 발판(y -96)의 문·NPC 이름까지 보이게
  }

  /** 맵 전환/캐릭터 전환 시 화면을 새로 구성 */
  setWorld(w: World | null) {
    if (!texturesReady || !this.sys.isActive()) { this.pending = w; return; }
    this.pending = undefined;
    this.world = w;
    this.rig?.destroy(); this.rig = null;
    for (const r of this.remotes.values()) r.rig.destroy();
    this.remotes.clear();
    for (const b of this.bubbles.values()) b.text.destroy();
    this.bubbles.clear();
    for (const o of this.statics) o.destroy();
    for (const v of this.mobs) v.root.destroy();
    for (const v of this.nodeViews) v.destroy();
    this.bossRing?.destroy(); this.bossRing = null;
    for (const d of this.dropViews.values()) d.destroy();
    for (const d of this.shotViews.values()) d.destroy();
    this.shotViews.clear();
    this.statics = []; this.mobs = []; this.nodeViews = []; this.dropViews.clear();
    this.hills = []; this.clouds = []; this.snow = []; this.swayers = []; this.twinkles = []; this.portals = []; this.flames = []; this.npcs = [];
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
      const img = keep(this.add.image(0, 0, 'cloud').setDepth(2).setAlpha(map.theme === 'cave' || map.theme === 'mine' || map.theme === 'icecave' || SPACE.includes(map.theme) ? 0 : map.theme === 'forest' || map.theme === 'grove' || map.theme === 'aurora' ? 0.25 : 0.8).setScale(0.7 + hash(i + 3) * 0.8));
      this.clouds.push({ img, x: hash(i + 11) * 700, y: -95 - hash(i + 20) * 90, sp: 3 + hash(i + 40) * 5 });
    }
    // 오로라 언덕: 하늘에 일렁이는 빛의 띠(먼 배경과 함께 천천히 흐른다)
    if (map.theme === 'aurora') for (const [y, col, a] of [[-112, 0x7affc8, 0.22], [-92, 0xff9ae0, 0.14], [-132, 0x9ad8ff, 0.16]] as const) {
      keep(this.add.tileSprite(-600, y, map.width + 1200, 40, 'fx_aurora').setOrigin(0, 0.5).setDepth(0.5).setTint(col).setAlpha(a * 2.2).setTilePosition(y * 3, 0));
    }
    // 별빛 성운: 하늘 가득 반짝이는 별(먼 배경처럼 천천히 따라온다)
    if (SPACE.includes(map.theme)) for (let i = 0; i < 70; i++) {
      const img = keep(this.add.image(-200 + hash(i + 300) * (map.width + 400), -40 - hash(i + 400) * 200, 'fx_px').setDepth(0.4).setScrollFactor(0.4, 1).setScale(0.12 + hash(i + 500) * 0.22));
      img.setAlpha(0.35 + hash(i + 600) * 0.6);
      if (hash(i + 700) > 0.7) this.twinkles.push({ img, ph: hash(i) * 6 });
    }
    if (SNOWY.includes(map.theme)) for (let i = 0; i < 46; i++) {
      const img = keep(this.add.image(0, 0, 'fx_px').setDepth(90).setAlpha(0.55 + hash(i + 70) * 0.4).setScale(0.5 + hash(i + 90) * 0.7));
      this.snow.push({ img, x: hash(i + 31) * 1000, y: hash(i + 51) * 1000, sp: 10 + hash(i + 61) * 16, ph: hash(i + 81) * 6 });
    }
    // 지면과 발판
    keep(this.add.tileSprite(-600, 0, map.width + 1200, 48, `tile_${map.theme}`).setOrigin(0, 0).setDepth(10).setTileScale(ART));
    keep(this.add.rectangle(-600, 48, map.width + 1200, 400, Phaser.Display.Color.HexStringToColor(th.dirt[1]).color).setOrigin(0, 0).setDepth(10));
    for (const p of map.platforms) {
      if (p.solid) {
        // 아래가 흙으로 꽉 찬 언덕: 윗면은 풀, 옆면은 어두운 테두리
        keep(this.add.tileSprite(p.x, p.y, p.w, -p.y + 2, `tile_${map.theme}`).setOrigin(0, 0).setDepth(11).setTileScale(ART));
        keep(this.add.rectangle(p.x, p.y + 3, 2, -p.y, 0x2b1d2e, 0.6).setOrigin(0, 0).setDepth(11));
        keep(this.add.rectangle(p.x + p.w - 2, p.y + 3, 2, -p.y, 0x2b1d2e, 0.6).setOrigin(0, 0).setDepth(11));
        continue;
      }
      keep(this.add.image(p.x - 2, p.y, `plat_${map.theme}_l`).setOrigin(0, 0).setDepth(11).setScale(ART));
      keep(this.add.tileSprite(p.x + 14, p.y, p.w - 28, 12, `plat_${map.theme}_m`).setOrigin(0, 0).setDepth(11).setTileScale(ART));
      keep(this.add.image(p.x + p.w + 2, p.y, `plat_${map.theme}_r`).setOrigin(1, 0).setDepth(11).setScale(ART));
    }
    // 로프
    for (const r of map.ropes) {
      keep(this.add.tileSprite(r.x, r.top - 3, 5, r.bottom - r.top + 1, 'rope').setOrigin(0.5, 0).setDepth(13).setTileScale(ART));
      keep(this.add.image(r.x, r.top + 1, 'rope_knot').setDepth(14).setScale(ART));
    }
    this.arrow = keep(this.add.image(0, 0, 'ui_arrow').setDepth(96).setVisible(false));
    // 풀/꽃 장식
    const seed = map.id.length * 13 + map.width;
    const surfaces = [{ x: 0, y: 0, w: map.width }, ...map.platforms];
    for (let i = 0; i < Math.floor(map.width / 14); i++) {
      const s = surfaces[Math.floor(hash(seed + i * 3) * surfaces.length)];
      const x = s.x + 6 + hash(seed + i * 7) * (s.w - 12);
      // 동굴·광산·사막(오아시스 빼고)에는 꽃이 피지 않는다
      const flower = hash(seed + i * 5) > 0.72 && !NO_FLOWERS.has(map.theme);
      const key = flower ? `deco_flower${Math.floor(hash(seed + i) * 3)}` : 'deco_grass';
      const img = keep(this.add.image(x, s.y + 1, key).setOrigin(0.5, 1).setDepth(hash(seed + i * 9) > 0.5 ? 12 : 70).setScale(ART));
      if (SNOWY.includes(map.theme)) img.setTintFill(0xe4f0fa); // 눈 덮인 풀
      else if (SPACE.includes(map.theme)) img.setTintFill(Phaser.Display.Color.HexStringToColor(th.grass[2]).color); // 바위 결
      this.swayers.push({ img, ph: hash(i) * 6 });
    }
    // 모닥불
    if (map.campfireX !== undefined) {
      const fx = map.campfireX;
      keep(this.add.image(fx, 1, 'obj_logs').setOrigin(0.5, 1).setDepth(20).setScale(ART));
      for (let i = 0; i < 3; i++) this.flames.push(keep(this.add.image(fx + (i - 1) * 4, -4, 'fx_flame').setOrigin(0.5, 1).setDepth(21)));
    }
    // 시설: 모루·창고·상점·NPC
    for (const f of map.facilities) {
      if (f.kind === 'npc') {
        const npc = NPCS[f.npc ?? 'elder'];
        portraitUrl(npc.look);
        ensureTextures(this);
        const img = keep(this.add.image(f.x, f.y + 1, `${buildLook(npc.look)}_portrait`).setOrigin(0.5, 1).setDepth(30).setFlipX(f.x > map.width / 2).setScale(MQ_SCALE));
        // NPC 이름은 머리 위(플레이어 이름은 발밑이라 겹치지 않게)
        keep(label(this, npc.name, 6.5, '#fff3d6').setPosition(f.x, f.y - 35).setDepth(31));
        const mark = keep(label(this, '', 13, '#ffd84a').setDepth(31));
        this.npcs.push({ id: npc.id, img, mark, x: f.x, y: f.y });
        continue;
      }
      const key = f.kind === 'anvil' ? 'obj_craft' : f.kind === 'storage' ? 'obj_storage' : f.kind === 'forge' ? 'obj_forge' : f.kind === 'stamps' ? 'obj_stamps' : f.kind === 'tasks' ? 'obj_tasks' : f.kind === 'statues' ? 'obj_statues' : f.kind === 'pets' ? 'obj_pets' : f.kind === 'owl' ? 'obj_owl' : f.kind === 'games' ? 'obj_games' : f.kind === 'post' ? 'obj_post' : f.kind === 'traps' ? 'obj_traps' : f.kind === 'build' ? 'obj_build' : f.kind === 'shrine' ? 'obj_shrine' : f.kind === 'kitchen' ? 'obj_kitchen' : f.kind === 'nest' ? 'obj_nest' : f.kind === 'lab' ? 'obj_lab' : f.kind === 'alchemy' ? 'obj_alchemy' : f.kind === 'totem' ? 'obj_totem' : 'obj_shop';
      const img = keep(this.add.image(f.x, f.y + 1, key).setOrigin(0.5, 1).setDepth(20).setScale(ART));
      keep(label(this, FACILITY_NAMES[f.kind], 6.5, '#fff3d6').setPosition(f.x, f.y - img.displayHeight - 3).setDepth(22));
    }
    // 포탈
    map.portals.forEach((q, idx) => {
      const py = q.y ?? 0;
      const glow = keep(this.add.image(q.x, py - 22, 'portal_glow').setDepth(18).setScale(ART));
      const ring = keep(this.add.image(q.x, py - 22, 'portal_ring').setDepth(19).setScale(ART));
      const lock = keep(this.add.image(q.x, py - 22, 'portal_locked').setDepth(19).setScale(ART));
      const text = keep(label(this, '', 6.5).setPosition(q.x, py - 47).setDepth(22));
      this.portals.push({ ring, glow, lock, text, idx });
    });
    this.nodeViews = w.nodes.map((n) => new NodeView(this, n));
    this.mobs = w.mobs.map((m) => new MobView(this, m));
    this.rig = new CharRig(this, w.char.look, w.char.name);
    this.camX = w.player.x; this.camY = 0; this.camGoal = null;
    this.cameras.main.fadeIn(250, 20, 16, 30);
  }

  /** 월드 이벤트 연출 */
  handle(e: WorldEvent) {
    if (!this.world) return;
    if (e.t === 'heal') {
      this.floatText(`+${e.amount}`, e.x, e.y, 8.5, '#8fde5d');
    } else if (e.t === 'dmg') {
      // 빗나감 / 막음(피해 0) / 일반 / 치명타
      const col = e.miss ? '#c9bcd6' : e.onPlayer ? (e.amount ? '#ff6b6b' : '#a5d8ff') : e.crit ? '#ffd84a' : '#ffffff';
      const txt = e.miss ? '빗나감' : e.onPlayer && !e.amount ? '막음' : `${e.amount}${e.crit ? '!' : ''}`;
      const t = label(this, txt, e.crit ? 11 : e.miss ? 7 : 8.5, col).setPosition(e.x + (Math.random() - 0.5) * 8, e.y).setDepth(90);
      const s0 = t.scale;
      t.setScale(s0 * 0.4);
      this.tweens.add({ targets: t, scale: s0, duration: 160, ease: 'Back.easeOut' });
      this.tweens.add({ targets: t, y: e.y - 20, duration: 750, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: t, alpha: 0, delay: 480, duration: 270, onComplete: () => t.destroy() });
      if (!e.onPlayer && !e.miss) this.puff(e.x, e.y + 8, 0xfff3b0, 3);
    } else if (e.t === 'level' || e.t === 'skill') {
      const p = this.world.player;
      const txt = e.t === 'level' ? 'LEVEL UP!' : `${e.name} Lv.${e.level}`;
      const t = label(this, txt, 11, e.t === 'level' ? '#ffe98a' : '#a5f0c0').setPosition(p.x, p.y - 48).setDepth(95);
      this.tweens.add({ targets: t, y: p.y - 66, duration: 1400, ease: 'Cubic.easeOut' });
      this.tweens.add({ targets: t, alpha: 0, delay: 1000, duration: 400, onComplete: () => t.destroy() });
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const s = this.add.image(p.x, p.y - 16, 'fx_px').setTint(e.t === 'level' ? 0xffe98a : 0xa5f0c0).setDepth(94).setScale(0.6);
        this.tweens.add({ targets: s, x: p.x + Math.cos(a) * 30, y: p.y - 16 + Math.sin(a) * 30, alpha: 0, angle: 180, duration: 700, ease: 'Cubic.easeOut', onComplete: () => s.destroy() });
      }
    } else if (e.t === 'telegraph') {
      // 내려찍기 범위를 바닥에 붉게 표시하고, 시간이 지날수록 진해진다
      this.bossRing?.destroy();
      const ring = (this.bossRing = this.add.ellipse(e.x, e.y + 1, e.r * 2, 10, 0xd9574a, 0.15).setStrokeStyle(1.5, 0xff8a7a, 0.9).setDepth(15));
      this.tweens.add({ targets: ring, fillAlpha: 0.45, duration: e.time * 1000, ease: 'Quad.easeIn' });
    } else if (e.t === 'slam') {
      this.bossRing?.destroy(); this.bossRing = null;
      for (let i = 0; i < 14; i++) this.puff(e.x + (i / 13 - 0.5) * e.r * 2, e.y - 2, 0xc9b28a, 1);
    } else if (e.t === 'boss') {
      const p = this.world.player;
      const t = label(this, `${e.name} 처치!`, 14, '#ffe98a').setPosition(p.x, p.y - 50).setDepth(95);
      this.tweens.add({ targets: t, y: p.y - 76, alpha: 0, delay: 1400, duration: 900, onComplete: () => t.destroy() });
    } else if (e.t === 'cast') {
      if (e.id === 'meteor' || e.id === 'starfall') {
        // 하늘에서 떨어지는 불덩이·별 + 넓은 고리
        const col = e.id === 'meteor' ? 0xff8a3a : 0xfff0a8;
        const rock = this.add.circle(e.x - 30, e.y - 110, 7, col).setStrokeStyle(2, 0xffffff).setDepth(86);
        this.tweens.add({ targets: rock, x: e.x, y: e.y - 8, duration: 220, ease: 'Quad.easeIn', onComplete: () => {
          rock.destroy();
          const ring = this.add.circle(e.x, e.y - 8, 8, col, 0.45).setStrokeStyle(2, 0xffffff).setDepth(86);
          this.tweens.add({ targets: ring, scale: 10, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
          this.puff(e.x, e.y - 8, col, 14);
        } });
      } else if (e.id === 'quake' || e.id === 'rampage') {
        const ring = this.add.ellipse(e.x, e.y - 3, 10, 4).setStrokeStyle(3, e.id === 'quake' ? 0xc8a46a : 0xff6a4a).setDepth(86);
        this.tweens.add({ targets: ring, width: (e.id === 'quake' ? 90 : 60) * 2, height: 18, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onUpdate: () => ring.setSize(ring.width, ring.height), onComplete: () => ring.destroy() });
        this.puff(e.x, e.y - 4, e.id === 'quake' ? 0xc8a46a : 0xff6a4a, 14);
        this.cameras.main.shake(140, 0.004);
      } else if (e.id === 'pierce' || e.id === 'arrowrain') {
        this.puff(e.x, e.y - 16, 0xffffff, 6);
      } else if (e.id === 'nova') {
        const ring = this.add.circle(e.x, e.y - 10, 6, 0xa5d8ff, 0.5).setStrokeStyle(2, 0xffffff).setDepth(86);
        this.tweens.add({ targets: ring, scale: 9, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
        this.puff(e.x, e.y - 10, 0xa5d8ff, 12);
      } else if (e.id === 'volley') {
        this.puff(e.x, e.y - 16, 0xffffff, 4);
      } else if (e.id === 'smash' || e.id === 'cleave') {
        // 충격파 고리
        const ring = this.add.ellipse(e.x, e.y - 3, 10, 4).setStrokeStyle(2, 0xffe98a).setDepth(86);
        this.tweens.add({ targets: ring, width: SMASH_RANGE * 2, height: 14, alpha: 0, duration: 320, ease: 'Cubic.easeOut', onUpdate: () => ring.setSize(ring.width, ring.height), onComplete: () => ring.destroy() });
        this.puff(e.x, e.y - 4, 0xffe98a, 10);
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

  private floatText(txt: string, x: number, y: number, size: number, col: string) {
    const t = label(this, txt, size, col).setPosition(x, y).setDepth(90);
    this.tweens.add({ targets: t, y: y - 18, duration: 800, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: t, alpha: 0, delay: 520, duration: 280, onComplete: () => t.destroy() });
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
    // 입력칸에 글을 쓰는 중이면 키보드로 움직이지 않는다
    const typing = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
    g.input.move = typing ? 0 : (k.LEFT.isDown || k.A.isDown ? -1 : 0) + (k.RIGHT.isDown || k.D.isDown ? 1 : 0);
    g.input.climb = typing ? 0 : (k.UP.isDown || k.W.isDown ? -1 : 0) + (k.DOWN.isDown || k.S.isDown ? 1 : 0);
    g.tick(dt);

    const w = this.world;
    if (!w || w !== g.world) return;
    this.rig?.update(dt, w.player, w.char);
    this.updateOthers(dt, w);
    // 콜로세움 웨이브·미니보스처럼 나중에 생긴 몬스터도 그린다
    if (this.mobs.length < w.mobs.length) for (const m of w.mobs.slice(this.mobs.length)) this.mobs.push(new MobView(this, m));
    for (const v of this.mobs) v.update(dt);
    for (const v of this.nodeViews) v.update(dt);
    this.syncDrops(w);
    this.syncShots(w);
    for (const s of this.swayers) s.img.setRotation(Math.sin(this.time0 * 1.6 + s.ph) * 0.12);
    for (const s of this.twinkles) s.img.setAlpha(0.3 + 0.7 * Math.abs(Math.sin(this.time0 * 1.3 + s.ph)));
    this.flames.forEach((f, i) => f.setScale(0.9 + Math.sin(this.time0 * 11 + i * 2) * 0.25, 1 + Math.sin(this.time0 * 8 + i * 1.3) * 0.35).setAlpha(0.85));
    // 터치로 지정한 대상 위에 화살표를 띄운다
    const tgt = w.commandTarget();
    if (this.arrow) {
      this.arrow.setVisible(!!tgt);
      if (tgt) this.arrow.setPosition(tgt.x, tgt.y + Math.sin(this.time0 * 7) * 2.2);
    }
    // NPC 머리 위: 새 퀘스트 ! / 완료 가능 ? (전직 가능하면 촌장에게 ★)
    for (const n of this.npcs) {
      const c = w.char, q = currentQuest(c, n.id), qp = questProgress(c, n.id);
      const promo = CLASS_NPCS.includes(n.id) && ((c.cls === 'beginner' && c.level >= CLASS_LEVEL) || canSubclass(c));
      const m = promo ? '★' : !q ? '' : !c.quests[n.id]?.accepted ? '!' : qp?.done ? '?' : '';
      if (n.mark.text !== m) n.mark.setText(m);
      n.mark.setPosition(n.x, n.y - 45 + Math.sin(this.time0 * 4) * 1.5);
      n.img.setScale((1 - Math.sin(this.time0 * 2.2) * 0.012) * MQ_SCALE, (1 + Math.sin(this.time0 * 2.2) * 0.02) * MQ_SCALE);
    }
    for (const pv of this.portals) {
      const q = w.map.portals[pv.idx], open = w.portalOpen(q);
      pv.ring.setVisible(open); pv.glow.setVisible(open); pv.lock.setVisible(!open);
      pv.glow.setScale((0.9 + Math.sin(this.time0 * 3 + pv.idx) * 0.1) * ART, ART).setAlpha(0.75 + Math.sin(this.time0 * 4) * 0.2);
      pv.ring.setY((q.y ?? 0) - 22 + Math.sin(this.time0 * 2 + pv.idx) * 1);
      const dest = q.label ?? MAPS[q.to].name;
      const txt = !open ? `${dest}\n${portalLock(w.char, w.map.id, q) ?? ''}` : q.key ? `${dest} (${ITEMS[q.key].name})` : dest;
      if (pv.text.text !== txt) pv.text.setText(txt);
      // 맵 끝의 문 이름이 화면 밖으로 잘리지 않게 안쪽으로 당긴다
      const hw = pv.text.displayWidth / 2 + 4, py = q.y ?? 0;
      if (py <= -96) {
        // 높은 발판의 문: 화면 위로 잘리지 않게 이름을 문 옆에 붙인다(맵 끝이면 왼쪽)
        const right = q.x + 16 + hw * 2 < w.map.width;
        pv.text.setX(right ? q.x + 16 + hw : q.x - 16 - hw).setY(py - 16);
      } else pv.text.setX(Phaser.Math.Clamp(q.x, hw, w.map.width - hw)).setY(py - (open ? 47 : 53));
    }

    // 카메라: 부드럽게 따라가며 맵 경계에서 멈춘다
    const cam = this.cameras.main, p = w.player;
    const halfW = cam.width / cam.zoom / 2, halfH = cam.height / cam.zoom / 2;
    // 가운데 좁은 구역 안에서는 크게 흔들리지 않고, 벗어나면 따라간다. 멈춰 있어도 천천히 캐릭터 쪽으로 다시 맞춘다
    const dz = halfW * 0.14;
    let goal = this.camGoal ?? p.x;
    goal += (p.x - goal) * Math.min(1, dt * 1.2);
    if (p.x > goal + dz) goal = p.x - dz; else if (p.x < goal - dz) goal = p.x + dz;
    const tx = w.map.width > halfW * 2 ? Phaser.Math.Clamp(goal, halfW, w.map.width - halfW) : w.map.width / 2;
    this.camGoal = tx;
    const base = 44 - halfH;
    const ty = base + Math.min(0, (p.y + 50) * 0.7);
    this.camX = smooth(this.camX, tx, dt, 3.6); this.camY = smooth(this.camY, ty, dt, 2.8);
    if (Math.abs(this.camX - tx) > halfW * 2) this.camX = tx;
    cam.centerOn(this.camX, this.camY);
    const left = this.camX - halfW;
    for (const h of this.hills) { h.ts.setPosition(left - 4, h.ts.y).setSize(halfW * 2 + 8, 90); h.ts.tilePositionX = left * h.f; }
    for (const c of this.clouds) {
      const span = halfW * 2 + 120;
      const x = (((c.x + this.time0 * c.sp - left * 0.08) % span) + span) % span;
      c.img.setPosition(left - 60 + x, c.y);
    }
    const spanX = halfW * 2 + 20, spanY = halfH * 2 + 20, top = this.camY - halfH - 10;
    for (const f of this.snow) {
      const x = (((f.x + Math.sin(this.time0 * 0.8 + f.ph) * 6 + this.time0 * 4) % spanX) + spanX) % spanX, y = (f.y + this.time0 * f.sp) % spanY;
      f.img.setPosition(left - 10 + x, top + y);
    }
  }

  private updateOthers(dt: number, w: World) {
    const others = this.game_.others;
    for (const [id, r] of this.remotes) if (!others.has(id)) { r.rig.destroy(); this.remotes.delete(id); }
    for (const [id, o] of others) {
      if (o.map !== w.map.id) continue;
      let r = this.remotes.get(id);
      if (!r) {
        r = { rig: new CharRig(this, o.look, o.name), p: { x: o.x, y: o.y, vx: 0, vy: 0, onGround: true, facing: o.f, swingT: 0, swingKind: 'attack', dead: 0, hurtT: 0, rope: -1 }, cls: o.cls, lastSwing: o.s, seen: 0 };
        r.rig.root.setAlpha(0.88).setDepth(45);
        this.remotes.set(id, r);
      }
      const p = r.p;
      // 받은 위치 쪽으로 부드럽게(네트워크 간격이 있어도 끊기지 않게)
      const nx = p.x + (o.x - p.x) * (1 - Math.exp(-dt * 12)), ny = p.y + (o.y - p.y) * (1 - Math.exp(-dt * 12));
      p.vx = o.m ? (nx - p.x) / Math.max(dt, 1e-3) || o.f * 60 : 0;
      if (Math.abs(o.x - p.x) > 200) { p.x = o.x; p.y = o.y; } else { p.x = nx; p.y = ny; }
      p.facing = o.f; p.onGround = o.g; p.rope = o.r ? 0 : -1; p.vy = o.g ? 0 : o.y < p.y ? -1 : 1;
      if (o.s !== r.lastSwing) { r.lastSwing = o.s; p.swingT = SWING_TIME; p.swingKind = o.k as SwingKind; }
      p.swingT = Math.max(0, p.swingT - dt);
      r.rig.update(dt, p, { equipment: remoteGear(o.gear, o.cls), cls: o.cls as Character['cls'] });
    }
    // 말풍선: 말한 사람 머리 위에 4초
    for (const [id, b] of this.bubbles) {
      b.t -= dt;
      const at = id === 'me' ? w.player : this.remotes.get(id)?.p;
      if (b.t <= 0 || !at) { b.text.destroy(); this.bubbles.delete(id); continue; }
      b.text.setPosition(at.x, at.y - 40).setAlpha(Math.min(1, b.t * 2));
    }
  }

  /** 채팅 말풍선 */
  bubble(id: string | 'me', text: string) {
    this.bubbles.get(id)?.text.destroy();
    const t = this.add.text(0, 0, text.length > 24 ? text.slice(0, 23) + '…' : text, {
      fontFamily: FONT, fontSize: `${11 * TS}px`, color: '#2b1d2e', backgroundColor: '#fff6e6', padding: { x: 3 * TS, y: 2 * TS },
    }).setOrigin(0.5, 1).setScale(6 / (11 * TS)).setDepth(97);
    this.bubbles.set(id, { text: t, t: 4 });
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

  private sweeping = false;
  /** 카메라가 머무는 가로 위치(가운데 구역을 벗어날 때만 옮긴다) */
  private camGoal: number | null = null;
  private toWorld(ev: PointerEvent): [number, number] {
    const v = this.cameras.main.worldView;
    return [v.x + (ev.clientX / innerWidth) * v.width, v.y + (ev.clientY / innerHeight) * v.height];
  }
  private pickAt(ev: PointerEvent): number {
    const w = this.world;
    if (!w || w !== this.game_.world) return 0;
    const [x, y] = this.toWorld(ev);
    return w.pickAt(x, y);
  }
  /** 떨어진 아이템을 눌렀으면 줍고 true(가방이 차서 못 줍더라도 캐릭터는 움직이지 않는다) */
  private pickDrop(ev: PointerEvent): boolean {
    const w = this.world;
    if (!w || w !== this.game_.world) return false;
    const [x, y] = this.toWorld(ev);
    if (!w.dropNear(x, y)) return false;
    w.pickAt(x, y);
    return true;
  }
  /** 손을 뗀 자리 → 월드 좌표로 바꿔 명령을 내린다 */
  private onTap(ev: PointerEvent) {
    const w = this.world;
    if (!w || w !== this.game_.world) return;
    const [x, y] = this.toWorld(ev);
    const cmd = w.tap(x, y);
    // 터치 표시: 빈 바닥으로 걸어갈 때만 작은 화살표(몬스터·NPC·시설·포탈은 표시하지 않는다)
    if (!cmd || cmd.k !== 'move') return;
    const tx = cmd.x, ty = cmd.y, col = 0xffffff;
    const arrow = this.add.triangle(tx, ty - 10, 0, 0, 7, 0, 3.5, 5, col).setOrigin(0.5, 1).setStrokeStyle(1, 0x1e1420).setDepth(88).setAlpha(0);
    this.tweens.add({ targets: arrow, y: ty - 2, alpha: 1, duration: 160, ease: 'Quad.easeIn' });
    this.tweens.add({ targets: arrow, alpha: 0, delay: 520, duration: 260, onComplete: () => arrow.destroy() });
  }

  private syncDrops(w: World) {
    const alive = new Set<number>();
    for (const d of w.drops) {
      alive.add(d.uid);
      let img = this.dropViews.get(d.uid);
      if (!img) { img = this.add.image(d.x, d.y, d.coin ? 'it_coin' : ITEM_ICON[d.id]).setDepth(45).setScale(0.85); this.dropViews.set(d.uid, img); }
      const rest = d.vy === 0;
      img.setPosition(d.x, d.y + (rest ? Math.sin(d.age * 5) * 1.2 : 0)).setRotation(rest && !d.picked ? 0 : d.age * 9);
      // 사라지기 1분 전부터 깜빡이지 않고 서서히 옅어진다
      img.setAlpha(d.picked ? 1 : Math.max(0.35, Math.min(1, (DROP_LIFE - d.age) / 60)));
    }
    for (const [uid, img] of this.dropViews) if (!alive.has(uid)) { img.destroy(); this.dropViews.delete(uid); }
  }
}
