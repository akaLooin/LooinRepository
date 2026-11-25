import Phaser from 'phaser';
import { Audio } from './audio';
import { songFor } from './music';
import { Game } from './game';
import { GameScene } from './render/scene';
import { buildAll } from './render/sprites';
import { UI } from './ui/ui';
import './ui/tokens.css';
import './ui/components.css';
import './ui/style.css';

async function boot() {
  // 캔버스 텍스트가 픽셀 폰트로 그려지도록 폰트를 먼저 불러온다
  try { await Promise.all([document.fonts.load('11px Galmuri11'), document.fonts.load('bold 11px Galmuri11')]); } catch { /* 폰트 실패 시 기본 글꼴 */ }
  buildAll();
  // 서버 주소가 설정돼 있으면 온라인(게스트 계정), 아니면 이 기기에만 저장
  const game = new Game(import.meta.env.VITE_SERVER_URL as string | undefined);
  const scene = new GameScene(game);
  const ui = new UI(game);
  const onWorld = game.onWorld;
  const audio = new Audio();
  // 맵에 따라 곡을 바꾼다(캐릭터 선택 화면은 마을 곡)
  game.onWorld = (w) => { scene.setWorld(w); onWorld(w); audio.setSong(w ? songFor(w.map.theme, !!w.map.boss, !!w.map.arena) : 'town'); if (w) audio.play('portal'); };
  ui.audio = audio;
  game.onEvent = (e) => {
    scene.handle(e); ui.onEvent(e);
    // 효과음
    if (e.t === 'dmg') audio.play(e.miss ? 'miss' : e.onPlayer ? (e.amount ? 'hurt' : 'miss') : e.crit ? 'crit' : 'hit');
    else if (e.t === 'loot') audio.play(e.text.includes('카드') ? 'card' : e.text.includes('나타났') ? 'warn' : e.text.includes('코인') ? 'coin' : e.item ? 'item' : 'click');
    else if (e.t === 'level' || e.t === 'skill' || e.t === 'boss') audio.play('level');
    else if (e.t === 'yield') audio.play(e.item === 'ore' ? 'mine' : 'chop');
    else if (e.t === 'slam') audio.play('slam');
    else if (e.t === 'heal') audio.play('heal');
    else if (e.t === 'cast') audio.play('skill');
    else if (e.t === 'kill') audio.play('kill');
    else if (e.t === 'miniboss' || e.t === 'arenaEnd') audio.play('quest');
    else if (e.t === 'faint') audio.play('fail');
  };
  game.onNet = (st, msg) => {
    if (st === 'online') ui.toast('서버에 연결되었습니다');
    else if (st === 'offline') ui.toast(`오프라인으로 진행합니다${msg ? ` — ${msg}` : ''}`);
    ui.refresh(true);
  };
  game.onChat = (l) => { if (l.id) scene.bubble(l.id === game.liveId ? 'me' : l.id, l.text); ui.onChat(l); };
  game.connect().then(() => ui.refresh(true));

  const dpr = () => Math.min(window.devicePixelRatio || 1, 3);
  const phaser = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', transparent: true,
    scale: { mode: Phaser.Scale.NONE, width: innerWidth * dpr(), height: innerHeight * dpr() },
    render: { antialias: false, roundPixels: false, powerPreference: 'high-performance' },
    audio: { noAudio: true },
    scene,
  });
  addEventListener('resize', () => phaser.scale.resize(innerWidth * dpr(), innerHeight * dpr()));
  document.addEventListener('visibilitychange', () => { if (document.hidden) { game.suspend(); audio.suspend(); } else { game.resume(); audio.resume(); } });
  addEventListener('pagehide', () => game.save());
  // 개발/테스트용 핸들
  Object.assign(window, { __game: game, __scene: scene, __uiRef: ui });
}
boot();
