// 부품 확인 페이지(개발용). 모든 부품을 상태별로 한 화면에 늘어놓는다.
import './tokens.css';
import './components.css';
import { pixelIcon } from './icons';

const root = document.getElementById('root')!;
const card = (title: string, html: string) => `<section><div class="ui-sm ui-muted" style="margin-bottom:var(--sp-2)">${title}</div>${html}</section>`;
const swatch = (k: string) => `<div style="display:flex;align-items:center;gap:var(--sp-2)"><i style="width:1.4em;height:1.4em;border-radius:var(--r-sm);border:var(--sp-1) solid var(--c-border);background:var(--c-${k})"></i><span class="ui-xs">${k}</span></div>`;
const colors = ['bg', 'surface', 'surface-raised', 'surface-inset', 'border-input', 'text', 'text-muted', 'accent', 'danger', 'success', 'text-good', 'text-bad', 'text-accent', 'bar-hp', 'bar-mp', 'bar-xp', 'focus'];

root.innerHTML = [
  card('색 역할', `<div style="display:grid;grid-template-columns:repeat(3,auto);gap:var(--sp-2) var(--sp-5)">${colors.map(swatch).join('')}</div>`),
  card('글자', `<div class="ui-xs">xs 아주 작은 글</div><div class="ui-sm">sm 작은 글</div><div>base 본문 글</div><div class="ui-lg">lg 제목</div><div class="ui-xl">xl 큰 제목</div>`),
  card('버튼', `<div class="ui-row" style="flex-wrap:wrap;max-width:24em">
    <button class="ui-btn">기본</button><button class="ui-btn primary">제작</button><button class="ui-btn success">완료</button>
    <button class="ui-btn danger">버리기</button><button class="ui-btn" disabled>비활성</button><button class="ui-btn sm">작게</button></div>`),
  card('게이지', `<div style="width:14em;display:grid;gap:var(--sp-2)">
    <div class="ui-bar hp" role="progressbar" aria-valuenow="42" aria-valuemax="51"><i style="width:82%"></i><span>42 / 51</span></div>
    <div class="ui-bar mp"><i style="width:60%"></i><span>6 / 10</span></div>
    <div class="ui-bar xp"><i style="width:23%"></i><span>23.0%</span></div>
    <div class="ui-bar skill"><i style="width:100%"></i><span>가득</span></div></div>`),
  card('칸 상태', `<div class="ui-grid" style="width:calc(var(--slot) * 5 + var(--sp-2) * 4)">
    <button class="ui-slot">${pixelIcon('items')}<span class="qty">12</span></button>
    <button class="ui-slot" aria-selected="true">${pixelIcon('talents')}</button>
    <button class="ui-slot ready">${pixelIcon('shop')}</button>
    <button class="ui-slot short">${pixelIcon('shop')}</button>
    <button class="ui-slot locked"></button>
    <div class="ui-slot empty"></div>
    <button class="ui-slot r2">${pixelIcon('codex')}</button>
    <button class="ui-slot r3">${pixelIcon('codex')}</button>
    <button class="ui-slot r4">${pixelIcon('codex')}<span class="lv">Lv.3</span></button>
    <button class="ui-slot round">${pixelIcon('attacks')}<span class="cool">4</span></button></div>`),
  card('창 + 탭 + 상세', `<div class="ui-win" role="dialog" aria-labelledby="w1" style="width:30em">
    <header><h2 id="w1">모루</h2><button class="ui-btn sm" aria-label="닫기">✕</button></header>
    <div class="body">
      <div class="ui-tabs" role="tablist"><button role="tab" aria-selected="true">1단계</button><button role="tab" aria-selected="false">2단계</button><button role="tab" disabled>3단계</button></div>
      <div class="ui-tabpanel" style="display:flex;gap:var(--sp-4)">
        <div class="ui-grid" style="width:calc(var(--slot) * 3 + var(--sp-2) * 2)">
          <button class="ui-slot ready" aria-selected="true">${pixelIcon('attacks')}</button><button class="ui-slot short">${pixelIcon('shop')}</button><div class="ui-slot empty"></div></div>
        <div class="ui-detail ui-grow"><b>돌날 검</b><span class="ui-xs ui-muted">무기 · Lv.5</span><span class="ui-sm ui-good">공격력 +9</span>
          <div class="ui-kv"><span>조약돌</span><span>12/10</span><span>통나무</span><span class="ui-bad">3/5</span></div>
          <button class="ui-btn primary block" disabled>제작</button></div>
      </div></div></div>`),
  card('대화 상자 · 말풍선 · 알림', `<div style="display:grid;gap:var(--sp-4)">
    <div class="ui-dialog"><div class="speaker"><div class="face"></div>촌장</div>
      <div class="ui-grow"><div>“풀밭의 방울들이 너무 늘었어.”</div><div class="ui-sm ui-muted">목표: 방울 5마리 처치 (2/5)</div>
      <div class="ui-row" style="margin-top:var(--sp-3)"><span class="ui-grow"></span><button class="ui-btn success">완료</button></div></div></div>
    <div class="ui-row"><span class="ui-bubble">!</span><span class="ui-bubble">…</span><span class="ui-bubble done">?</span>
      <span class="ui-toast">${pixelIcon('items')}통나무 +1</span></div>
    <input class="ui-input" placeholder="이름 (최대 10자)"></div>`),
].join('');

// 하단 바: 참고 화면의 배치(요약 | 게이지 | 메뉴 버튼 줄)
const bar = document.createElement('div');
bar.className = 'ui-bottom';
bar.style.position = 'fixed'; // 확인 페이지는 스크롤되므로 화면 하단에 고정
const menu = [['auto', '자동', 'on'], ['attacks', '공격'], ['items', '아이템'], ['talents', '특성', 'dot'], ['codex', '도감'], ['map', '지도'], ['chat', '채팅'], ['menu', '메뉴']];
bar.innerHTML = `
  <div class="ui-summary"><div class="face"></div><div class="who"><b>루인</b><span class="ui-muted">초보자</span><span class="ui-accent">Lv.1</span></div></div>
  <div class="ui-gauges">
    <label>HP</label><div class="ui-bar hp"><i style="width:100%"></i><span>15 / 15</span></div>
    <label>MP</label><div class="ui-bar mp"><i style="width:100%"></i><span>10 / 10</span></div>
    <label>XP</label><div class="ui-bar xp"><i style="width:0%"></i><span>0 / 15</span></div>
  </div>
  <nav class="ui-menu" aria-label="메뉴">${menu.map(([k, label, st]) => `<button class="ui-menubtn ${st === 'on' ? 'on' : ''}" aria-label="${label}">${pixelIcon(k)}<span>${label}</span>${st === 'dot' ? '<i class="dot"></i>' : ''}</button>`).join('')}</nav>`;
document.body.appendChild(bar);
