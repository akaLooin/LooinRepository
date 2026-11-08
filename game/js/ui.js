/* Talestopia Tycoon — screen. Draws the state and forwards taps to the engine. */
(function () {
  'use strict';
  var D = window.TT_DATA, E = window.TT_ENGINE, C = D.CONFIG;
  var $ = function (id) { return document.getElementById(id); };
  var fmt = E.format;

  var state, buyAmount = 1, activeTab = 'buildings';

  // ---------- storage (never trusted to work) ----------
  function save() {
    try { localStorage.setItem(C.saveKey, E.serialize(state)); return true; } catch (e) { return false; }
  }
  function load() {
    var now = Date.now();
    try {
      var raw = localStorage.getItem(C.saveKey);
      if (raw) {
        state = E.deserialize(raw, now);
        var off = E.applyOffline(state, now);
        if (off.gained > 0) {
          showModal('다녀오셨군요!', E.formatTime(off.seconds) + ' 동안 이야기꾼들이 일했어요.\n🪙 ' + fmt(off.gained) + ' 금화를 벌었어요.', null);
        }
        return;
      }
    } catch (e) { /* fall through to a new game */ }
    state = E.newState(now);
  }

  // ---------- toast & modal ----------
  var toastTimer;
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.add('hidden'); }, 2400);
  }
  var modalOk = null;
  function showModal(title, text, onOk) {
    $('modal-title').textContent = title; $('modal-text').textContent = text;
    modalOk = onOk;
    $('modal-cancel').classList.toggle('hidden', !onOk);
    $('modal').classList.remove('hidden');
  }
  $('modal-ok').onclick = function () { $('modal').classList.add('hidden'); if (modalOk) modalOk(); modalOk = null; };
  $('modal-cancel').onclick = function () { $('modal').classList.add('hidden'); modalOk = null; };

  // ---------- book ----------
  function spawnFloater(text, crit, ev) {
    var box = $('floaters'), rect = box.getBoundingClientRect();
    var f = document.createElement('div');
    f.className = 'floater' + (crit ? ' crit' : '');
    f.textContent = text;
    var x = ev && ev.clientX ? ev.clientX - rect.left : rect.width / 2;
    var y = ev && ev.clientY ? ev.clientY - rect.top : rect.height / 2;
    f.style.left = (x - 20 + Math.random() * 20) + 'px';
    f.style.top = (y - 30) + 'px';
    box.appendChild(f);
    setTimeout(function () { f.remove(); }, 900);
  }
  $('book').addEventListener('pointerdown', function (ev) {
    ev.preventDefault();
    var r = E.click(state, Date.now());
    spawnFloater('+' + fmt(r.value) + (r.crit ? ' 단서!' : ''), r.crit, ev);
  });

  // ---------- tabs ----------
  document.querySelectorAll('.tabs button').forEach(function (b) {
    b.onclick = function () {
      activeTab = b.dataset.tab;
      document.querySelectorAll('.tabs button').forEach(function (x) { x.classList.toggle('active', x === b); });
      document.querySelectorAll('.tab-body').forEach(function (x) { x.classList.toggle('hidden', x.id !== 'tab-' + activeTab); });
      render(true);
    };
  });
  document.querySelectorAll('.buy-amount button').forEach(function (b) {
    b.onclick = function () {
      buyAmount = b.dataset.amt === 'max' ? 'max' : +b.dataset.amt;
      document.querySelectorAll('.buy-amount button').forEach(function (x) { x.classList.toggle('active', x === b); });
      render(true);
    };
  });

  // ---------- buildings (built once, updated in place) ----------
  var bRows = {};
  function buildBuildingRows() {
    var list = $('building-list');
    D.BUILDINGS.forEach(function (b) {
      var row = document.createElement('button');
      row.className = 'row';
      row.innerHTML = '<div class="ic">' + b.icon + '</div>' +
        '<div><div class="nm">' + b.ko + '</div><div class="sub"></div></div>' +
        '<div class="rt"><div class="own">0</div><div class="price"></div></div>';
      row.title = b.desc;
      row.onclick = function () {
        if (E.buyBuilding(state, b.id, buyAmount)) render(true);
      };
      list.appendChild(row);
      bRows[b.id] = { el: row, sub: row.querySelector('.sub'), own: row.querySelector('.own'), price: row.querySelector('.price') };
    });
  }
  function renderBuildings(now) {
    var prevOwned = true;
    D.BUILDINGS.forEach(function (b) {
      var r = bRows[b.id], owned = state.buildings[b.id];
      var n = buyAmount === 'max' ? Math.max(1, E.maxAffordable(state, b.id)) : buyAmount;
      var cost = E.buildingCost(state, b.id, n);
      var visible = owned > 0 || prevOwned || state.coins >= b.cost * 0.5;
      r.el.classList.toggle('hidden', !visible);
      r.el.disabled = cost > state.coins;
      r.own.textContent = owned;
      r.price.textContent = '🪙 ' + fmt(cost) + (n > 1 ? ' (x' + n + ')' : '');
      r.price.classList.toggle('no', cost > state.coins);
      var each = b.cps * E.buildingMult(state, b, now) * E.globalMult(state, now);
      r.sub.textContent = owned > 0
        ? '1채당 ' + fmt(each) + '/초 · 합계 ' + fmt(each * owned) + '/초'
        : b.desc;
      prevOwned = owned > 0;
    });
  }

  // ---------- upgrades (rebuilt only when the list changes) ----------
  var upKey = '';
  function renderUpgrades() {
    var ups = E.availableUpgrades(state);
    var key = ups.map(function (u) { return u.id; }).join(',');
    var list = $('upgrade-list');
    if (key !== upKey) {
      upKey = key;
      list.innerHTML = '';
      ups.forEach(function (u) {
        var row = document.createElement('button');
        row.className = 'row'; row.dataset.id = u.id; row.dataset.cost = u.cost;
        row.innerHTML = '<div class="ic">' + u.icon + '</div><div><div class="nm"></div><div class="sub"></div></div>' +
          '<div class="rt"><div class="price"></div></div>';
        row.querySelector('.nm').textContent = u.ko;
        row.querySelector('.sub').textContent = u.desc;
        row.querySelector('.price').textContent = '🪙 ' + fmt(u.cost);
        row.onclick = function () { if (E.buyUpgrade(state, u.id)) { toast('✨ ' + u.ko + ' 완료!'); render(true); } };
        list.appendChild(row);
      });
    }
    var affordable = false;
    list.querySelectorAll('.row').forEach(function (row) {
      var ok = state.coins >= +row.dataset.cost;
      affordable = affordable || ok;
      row.disabled = !ok;
      row.querySelector('.price').classList.toggle('no', !ok);
    });
    $('upgrade-empty').classList.toggle('hidden', ups.length > 0);
    $('up-dot').classList.toggle('hidden', !affordable);
  }

  // ---------- genres ----------
  var genreKey = '';
  function renderGenres() {
    var can = E.canChooseGenre(state);
    var key = (state.genre || '') + '|' + can;
    $('genre-dot').classList.toggle('hidden', !can);
    $('genre-intro').textContent = state.genre
      ? '이번 판본의 장르는 「' + E.genre(state.genre).ko + '」예요. 다시 쓰면 다른 장르를 고를 수 있어요.'
      : can ? '이번 판본에서 쓸 이야기의 장르를 하나 고르세요. 판본이 끝날 때까지 바꿀 수 없어요.'
            : '이번 판본에서 금화 ' + fmt(D.GENRE_UNLOCK) + '개를 벌면 장르를 고를 수 있어요. (지금 ' + fmt(state.runEarned) + ')';
    if (key === genreKey) return;
    genreKey = key;
    var list = $('genre-list'); list.innerHTML = '';
    D.GENRES.forEach(function (g) {
      var el = document.createElement('button');
      el.className = 'genre' + (state.genre === g.id ? ' chosen' : '') + (state.genre && state.genre !== g.id ? ' dim' : '');
      el.style.setProperty('--g', g.color);
      el.disabled = !can;
      el.innerHTML = '<h4></h4><p><span class="tag">효과</span> <span class="ps"></span></p>' +
        '<p><span class="tag">주문</span> <span class="sp"></span></p>';
      el.querySelector('h4').textContent = g.icon + ' ' + g.ko + ' · ' + g.en;
      el.querySelector('.ps').textContent = g.passive;
      el.querySelector('.sp').textContent = g.spell.ko + ' (영감 ' + g.spell.cost + ') — ' + g.spell.desc;
      el.onclick = function () {
        showModal(g.icon + ' ' + g.ko, '이번 판본의 장르를 「' + g.ko + '」(으)로 정할까요?', function () {
          if (E.chooseGenre(state, g.id)) { toast(g.icon + ' 「' + g.ko + '」 이야기가 시작됐어요!'); render(true); }
        });
      };
      list.appendChild(el);
    });
  }

  // ---------- rewrite ----------
  function renderRewrite() {
    var gain = E.legendsOnRewrite(state);
    $('legends').textContent = fmt(state.legends);
    $('legend-gain').textContent = '+' + fmt(gain);
    var nextTotal = state.legends + gain + 1;
    $('legend-next').textContent = '🪙 ' + fmt(nextTotal * nextTotal * C.legendDivisor);
    $('rewrites').textContent = state.rewrites;
    $('rewrite-btn').disabled = gain < 1;
  }
  $('rewrite-btn').onclick = function () {
    var gain = E.legendsOnRewrite(state);
    if (gain < 1) return;
    showModal('🪶 다시 쓰기', '전설 ' + fmt(gain) + '개를 얻고 새 판본을 시작해요.\n금화·건물·개선·장르는 사라지고, 전설과 명장면은 남아요.', function () {
      var got = E.rewrite(state, Date.now());
      upKey = ''; genreKey = '';
      save();
      toast('🌟 전설 ' + fmt(got) + '개를 얻었어요! 제 ' + (state.rewrites + 1) + '판 시작');
      render(true);
    });
  };

  // ---------- highlights ----------
  var hlKey = '';
  function renderHighlights() {
    var key = Object.keys(state.highlights).join(',');
    $('hl-count').textContent = E.highlightCount(state);
    $('hl-total').textContent = D.HIGHLIGHTS.length;
    if (key === hlKey) return;
    hlKey = key;
    var list = $('highlight-list'); list.innerHTML = '';
    D.HIGHLIGHTS.forEach(function (h) {
      var el = document.createElement('div');
      el.className = 'hl' + (state.highlights[h.id] ? ' on' : '');
      el.innerHTML = '<b></b><span></span>';
      el.querySelector('b').textContent = (state.highlights[h.id] ? '🏅 ' : '🔒 ') + h.ko;
      el.querySelector('span').textContent = h.desc;
      list.appendChild(el);
    });
  }

  // ---------- settings ----------
  $('save-btn').onclick = function () { toast(save() ? '💾 저장했어요' : '이 브라우저에서는 저장할 수 없어요. 저장 코드를 복사해 두세요.'); };
  $('export-btn').onclick = function () {
    var code = btoa(unescape(encodeURIComponent(E.serialize(state))));
    var box = $('save-code'); box.value = code; box.select();
    try { navigator.clipboard.writeText(code).then(function () { toast('📋 저장 코드를 복사했어요'); }, function () { toast('아래 칸의 코드를 직접 복사하세요'); }); }
    catch (e) { toast('아래 칸의 코드를 직접 복사하세요'); }
  };
  $('import-btn').onclick = function () {
    var code = $('save-code').value.trim();
    if (!code) { toast('저장 코드를 먼저 붙여넣어 주세요'); return; }
    try {
      var s = E.deserialize(decodeURIComponent(escape(atob(code))), Date.now());
      showModal('불러오기', '지금 진행 상황을 덮어쓰고 저장 코드를 불러올까요?', function () {
        state = s; state.lastTick = Date.now(); upKey = genreKey = hlKey = ''; save(); render(true); toast('📖 불러왔어요');
      });
    } catch (e) { toast('저장 코드가 올바르지 않아요'); }
  };
  $('reset-btn').onclick = function () {
    showModal('정말 처음부터?', '전설과 명장면을 포함한 모든 기록이 사라져요. 되돌릴 수 없어요.', function () {
      state = E.newState(Date.now()); upKey = genreKey = hlKey = ''; save(); render(true); toast('새 이야기를 시작해요');
    });
  };

  // ---------- spell ----------
  $('spell-btn').onclick = function () {
    var r = E.castSpell(state, Date.now());
    if (!r) return;
    toast('🔮 ' + r.spell.ko + (r.gained ? ' — 🪙 ' + fmt(r.gained) : '') + '!');
    render(true);
  };

  // ---------- header & stage ----------
  function renderTop(now) {
    $('coins').textContent = fmt(state.coins);
    $('cps').textContent = fmt(E.cps(state, now));
    var max = E.maxMana(state);
    $('mana-fill').style.width = (state.mana / max * 100) + '%';
    $('mana-text').textContent = '영감 ' + Math.floor(state.mana) + ' / ' + max;
    var btn = $('spell-btn');
    if (state.genre) {
      var sp = E.genre(state.genre).spell, on = E.spellActive(state, sp.id, now);
      btn.textContent = on ? sp.ko + ' 발동 중' : '🔮 ' + sp.ko + ' (' + sp.cost + ')';
      btn.disabled = on || state.mana < sp.cost;
    } else {
      btn.textContent = '장르를 고르면 주문이 열려요';
      btn.disabled = true;
    }
    $('edition').textContent = '제 ' + (state.rewrites + 1) + '판' + (state.legends ? ' · 전설 ' + fmt(state.legends) : '');
    var badge = $('genre-badge');
    if (state.genre) {
      var g = E.genre(state.genre);
      badge.textContent = g.icon + ' ' + g.ko; badge.style.background = g.color; badge.classList.remove('hidden');
    } else badge.classList.add('hidden');
    var ci = E.clickInfo(state, now);
    $('click-val').textContent = fmt(ci.base) + (ci.critChance ? ' (단서 ' + Math.round(ci.critChance * 100) + '%)' : '');

    var fx = [];
    for (var id in state.activeSpells) {
      var left = (state.activeSpells[id] - now) / 1000;
      if (left > 0) {
        var name = D.GENRES.filter(function (g) { return g.spell.id === id; })[0].spell.ko;
        fx.push(name + ' ' + Math.ceil(left) + '초');
      }
    }
    if (state.genre === 'ghost') fx.push('시간 보너스 +' + Math.round(E.ghostBonus(state, now) * 100) + '%');
    var fxText = fx.join('|');
    var box = $('effects');
    if (box.dataset.k !== fxText) {
      box.dataset.k = fxText; box.innerHTML = '';
      fx.forEach(function (t) { var s = document.createElement('span'); s.className = 'effect'; s.textContent = t; box.appendChild(s); });
    }

    $('st-lifetime').textContent = fmt(state.lifetime);
    $('st-clicks').textContent = fmt(state.stats.clicks);
    $('st-spells').textContent = fmt(state.stats.spells);
    $('st-best').textContent = fmt(Math.max(state.stats.bestRun || 0, state.runEarned));
  }

  var lastRender = 0;
  function render(force) {
    var now = Date.now();
    if (!force && now - lastRender < 200) return;
    lastRender = now;
    renderTop(now);
    renderBuildings(now);
    renderUpgrades();
    renderGenres();
    renderRewrite();
    renderHighlights();
  }

  // ---------- loop ----------
  function loop() {
    var now = Date.now();
    E.tick(state, now);
    E.checkHighlights(state).forEach(function (h) { toast('🏅 명장면 달성: ' + h.ko); });
    render(false);
  }

  load();
  buildBuildingRows();
  render(true);
  setInterval(loop, C.tickMs);
  setInterval(save, C.autosaveMs);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) save();
    else { var off = E.applyOffline(state, Date.now()); if (off.gained > 0) toast('자리를 비운 사이 🪙 ' + fmt(off.gained) + ' 벌었어요'); }
  });
  window.addEventListener('pagehide', save);
})();
