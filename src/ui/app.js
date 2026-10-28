// The page. It reads view(state) and sends inputs to choose(); it computes
// nothing about the game (architecture invariant 3). Every click target carries
// data-act so the phone smoke test can drive it.

import { newGame, choose, view } from '../engine/game.js';
import { BACKGROUNDS } from '../data/cast.data.js';
import { saveGame, loadGame, clearSave, exportCode, importCode, STORAGE_OK } from './save.js';
import { registerSW } from './sw-register.js';

const app = document.getElementById('app');
let state = null;
let tab = 'ship';
let title = { background: 'naval', message: '' };

const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `${n < 0 ? '-' : ''}£${Math.abs(Math.round(n)).toLocaleString('en-GB')}`;
const bar = (label, v, note = '') => `<div class="bar"><span class="bar-label">${esc(label)}</span><span class="bar-track"><span class="bar-fill ${v < 30 ? 'low' : v < 50 ? 'mid' : ''}" style="width:${Math.max(0, Math.min(100, v))}%"></span></span><span class="bar-num">${Math.round(v)}</span>${note ? `<span class="bar-note">${esc(note)}</span>` : ''}</div>`;

function act(input) {
  try {
    state = choose(state, input);
    saveGame(state);
  } catch (e) {
    console.error(e);
    showError(e);
  }
  render();
}

function showError(e) {
  const code = state ? exportCode(state) : '';
  app.insertAdjacentHTML('afterbegin', `<div class="error" role="alert"><b>Something went wrong:</b> ${esc(e.message)}<br>Your game is saved. If it keeps happening, copy this code and send it with the report:<textarea readonly>${esc(code)}</textarea></div>`);
}

// ---- title -----------------------------------------------------------------

function renderTitle() {
  const saved = loadGame();
  app.innerHTML = `
  <main class="title">
    <h1>Made Post</h1>
    <p class="sub">Command a Royal Navy warship, 1793 to 1815. The sea, the enemy and the Admiralty all matter; the real game is your crew.</p>
    ${saved ? `<button class="primary" data-act="continue">Continue: ${esc(saved.player.name)}, ${esc(view(saved).date)}</button>` : ''}
    <h2>Begin a career</h2>
    <p class="hint">Your background sets your starting interest, money and seamanship.</p>
    <div class="cards">
      ${Object.entries(BACKGROUNDS).map(([id, b]) => `
        <button class="card ${title.background === id ? 'selected' : ''}" data-act="background" data-id="${id}" aria-pressed="${title.background === id}">
          <b>${esc(b.label)}</b><span>${esc(b.blurb)}</span>
          <small>Interest ${b.interest} · ${money(b.money)} · seamanship ${b.seamanship}</small>
        </button>`).join('')}
    </div>
    <label class="field">Your name <input id="cname" value="Captain James Ashworth" maxlength="40"></label>
    <button class="primary" data-act="new">Take command</button>
    <details class="import"><summary>Load a save code</summary>
      <textarea id="code" placeholder="MADP1...."></textarea>
      <button data-act="import">Load</button>
    </details>
    ${title.message ? `<p class="warn">${esc(title.message)}</p>` : ''}
    ${STORAGE_OK ? '' : '<p class="warn">This browser will not keep saves (storage is blocked). Use "Save code" on the Career tab to keep your game.</p>'}
  </main>`;
}

// ---- the game ----------------------------------------------------------------

function render() {
  if (!state) { renderTitle(); return; }
  const v = view(state);
  app.innerHTML = `
  <header class="hud">
    <div class="hud-top"><b class="ship-name">${v.ship ? `HMS ${esc(v.ship.name)}` : 'Ashore'}</b><span class="turn">${esc(v.date)}</span></div>
    <div class="hud-sub">${esc(v.captain.rank)} · ${money(v.captain.money)} · Morale ${v.crew ? Math.round(v.crew.morale) : '-'} · ${v.act ? `Act ${v.act.id}: ${esc(v.act.title)}` : ''}</div>
  </header>
  <nav class="tabs" role="tablist">
    ${[['ship', 'Ship'], ['crew', 'Crew'], ['officers', 'Officers'], ['career', 'Career'], ['log', 'Log']].map(([id, label]) => `<button role="tab" data-tab="${id}" aria-selected="${tab === id}" class="${tab === id ? 'on' : ''}">${label}${id === 'ship' && ['decision', 'battle', 'report', 'interlude'].includes(v.phase) ? ' •' : ''}</button>`).join('')}
  </nav>
  <main id="main">${{ ship: shipTab, crew: crewTab, officers: officersTab, career: careerTab, log: logTab }[tab](v)}</main>`;
}

function shipTab(v) {
  switch (v.phase) {
    case 'port': return portPanel(v);
    case 'sea': return seaPanel(v);
    case 'decision': return decisionPanel(v);
    case 'battle': return battlePanel(v);
    case 'report': return reportPanel(v);
    case 'interlude': return interludePanel(v);
    case 'ended': return endingPanel(v);
    default: return `<p>Unknown phase ${esc(v.phase)}.</p>`;
  }
}

function ordersPanel(v) {
  return `<section class="panel"><h3>Standing orders</h3>
    ${Object.entries(v.orderChoices).map(([key, spec]) => `
      <div class="order"><span>${esc(spec.label)}</span><div class="seg">
        ${Object.entries(spec.values).map(([val, label]) => `<button data-act="order" data-key="${key}" data-value="${val}" class="${v.orders[key] === val ? 'on' : ''}" aria-pressed="${v.orders[key] === val}">${esc(label)}</button>`).join('')}
      </div></div>`).join('')}
    <ul class="effects">${v.orderEffects.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
  </section>`;
}

function shipSummary(v) {
  const s = v.ship;
  return `<section class="panel"><h3>${esc(s.cls)} <small>${esc(s.guns)}</small></h3>
    ${s.trait ? `<p class="trait"><b>${esc(s.trait.label)}.</b> ${esc(s.trait.note)}</p>` : ''}
    ${bar('Hull', s.hull)}${bar('Rigging', s.rigging)}
    <p class="stores">Food ${s.stores.food} wks · Water ${s.stores.water} wks · Powder ${s.stores.powder} bbl · Speed ${s.speed}</p>
    <p class="stores">Crew ${v.crew.total} of ${v.crew.complement} · Seamanship ${v.crew.effective.seamanship} · Gunnery ${v.crew.effective.gunnery}</p>
  </section>`;
}

function portPanel(v) {
  const n = v.port.next;
  return `<section class="panel"><h2>${esc(v.port.name)}: fitting out</h2>
    ${n ? `<p class="orders-note"><b>Next orders:</b> ${esc(n.orders)}, ${esc(n.station)}, about ${n.weeks} weeks under ${esc(n.superior)}. ${esc(n.note)}</p>` : ''}
    <div class="actions">${v.port.actions.map((a) => `
      <div class="action ${a.primary ? 'primary-row' : ''}">
        <button data-act="port" data-id="${a.id}" ${a.locked ? 'disabled' : ''} class="${a.primary ? 'primary' : ''}">${esc(a.label)}</button>
        <p>${esc(a.note)}${a.locked ? ` <span class="lock">${esc(a.locked)}</span>` : ''}</p>
      </div>`).join('')}</div>
  </section>${shipSummary(v)}${ordersPanel(v)}`;
}

function outcomeLine(v) {
  const o = v.lastOutcome;
  if (!o) return '';
  return `<p class="outcome"><b>${esc(o.title)}:</b> ${esc(o.choice)}${o.passed === null ? '' : o.passed ? ' — it went well.' : ' — it went badly.'} ${esc(o.effects)}</p>`;
}

function seaPanel(v) {
  const c = v.commission;
  return `<section class="panel"><h2>${esc(c.label)}, ${esc(c.station)}</h2>
    <p>Week ${c.week} of ${c.weeks}. ${esc(c.brief)}</p>
    <p class="hint">${esc(c.superior)}: ${esc(c.superiorNote)}</p>
    ${outcomeLine(v)}
    <ul class="signs">${v.crew.signs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="hint">${v.crew.offences} offence${v.crew.offences === 1 ? '' : 's'} punished last week under your standing order.</p>
    <button class="primary big" data-act="end-turn">Next week</button>
  </section>${ordersPanel(v)}${shipSummary(v)}`;
}

function decisionPanel(v) {
  const d = v.decision;
  return `<section class="panel decision"><h2>${esc(d.title)}</h2>
    <p class="story">${esc(d.text)}</p>
    <div class="choices">${d.options.map((o) => `
      <button class="choice" data-choice="${o.id}" data-act="option" data-id="${o.id}">
        <b>${esc(o.label)}</b><span class="stake">At stake: ${esc(o.stake)}</span>
      </button>`).join('')}</div>
  </section>${shipSummary(v)}`;
}

function battlePanel(v) {
  const b = v.battle;
  const side = (name, x) => `<div class="side"><b>${esc(name)}</b>${bar('Hull', x.hull)}${bar('Men', (100 * x.crew) / x.crewStart, `${x.crew} of ${x.crewStart}`)}<small>Broadside ${x.broadside} lb · gunnery ${x.gunnery} · seamanship ${x.seamanship}</small></div>`;
  const phaseName = { approach: 'The approach', engage: 'Engaging', decide: 'The decision', aftermath: 'Aftermath', done: 'The action is over' }[b.phase];
  return `<section class="panel battle"><h2>Action: ${esc(b.foe)}</h2>
    <div class="sides">${side('Your ship', b.own)}${side(b.foe, b.enemy)}</div>
    ${b.gauge ? `<p class="hint">${b.gauge === 'own' ? 'You hold the weather gauge.' : 'She holds the weather gauge.'}</p>` : ''}
    <ol class="battle-log">${b.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>
    <h3>${esc(phaseName)}</h3>
    <div class="choices">${b.options.map((o) => `
      <button class="choice" data-choice="${o.id}" data-act="battle" data-id="${o.id}">
        <b>${esc(o.label)}</b>${o.stake ? `<span class="stake">${esc(o.stake)}</span>` : ''}
      </button>`).join('')}</div>
  </section>`;
}

function reportPanel(v) {
  const r = v.report;
  return `<section class="panel"><h2>${esc(r.title)}</h2>
    <ul class="report">${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    ${v.lastBattle ? `<details><summary>Last action: ${esc(v.lastBattle.foe)}</summary><ol class="battle-log">${v.lastBattle.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ol></details>` : ''}
    <button class="primary" data-act="close" data-choice="report">Continue</button>
  </section>`;
}

function interludePanel(v) {
  return `<section class="panel"><h2>The years between</h2>
    ${v.interlude.text.split('\n\n').map((p) => `<p class="story">${esc(p)}</p>`).join('')}
    <div class="choices">${v.interlude.options.map((o) => `
      <button class="choice" data-choice="${o.id}" data-act="interlude" data-id="${o.id}"><b>${esc(o.label)}</b>${o.stake ? `<span class="stake">${esc(o.stake)}</span>` : ''}</button>`).join('')}</div>
  </section>`;
}

function endingPanel(v) {
  const e = v.ending;
  return `<section class="panel ending"><h2>${esc(e.title)}</h2>
    ${e.lines.map((l) => `<p>${esc(l)}</p>`).join('')}
    <div class="obit"><h3>The Naval Chronicle</h3>${e.obituary.map((l, i) => `<p class="${i === 0 ? 'obit-name' : ''}">${esc(l)}</p>`).join('')}</div>
    <h3>Score: ${e.score.total}</h3>
    <table class="score">${Object.entries(e.score.parts).map(([k, n]) => `<tr><td>${esc(k[0].toUpperCase() + k.slice(1))}</td><td>${n}</td></tr>`).join('')}</table>
    <button class="primary" data-act="restart">A new career</button>
  </section>`;
}

function crewTab(v) {
  const c = v.crew;
  const dn = { fairness: 'Fairness', trust: 'Trust in the captain', provisions: 'Provisions', workload: 'Rest', prospects: 'Prospects' };
  return `<section class="panel"><h2>Ship's company: ${c.total} of ${c.complement}</h2>
    ${bar('Morale', c.morale)}
    <p class="hint">Morale is what the men believe about their captain and their ship: the five drivers below, weighted.</p>
    ${Object.entries(c.drivers).map(([k, x]) => bar(dn[k], x)).join('')}
    <h3>Discipline and unrest</h3>
    ${bar('Discipline', c.discipline, c.discipline < 25 ? 'falling apart' : '')}
    ${bar('Grievance', c.grievance, c.stage)}
    <ul class="signs">${c.signs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    <h3>Health</h3>${bar('Health', c.health, `${c.sick} sick`)}
    <h3>Skill</h3>${bar('Seamanship', c.effective.seamanship, `trained ${c.skill.seamanship}`)}${bar('Gunnery', c.effective.gunnery, `trained ${c.skill.gunnery}`)}
    <table class="groups">${c.groups.map((g) => `<tr><td><b>${esc(g.label)}</b><br><small>${esc(g.note)}</small></td><td>${g.n}</td></tr>`).join('')}</table>
  </section>
  <section class="panel"><h3>Men with names</h3>
    ${v.named.map((m) => `<div class="person ${m.status !== 'aboard' && m.status !== 'rated' ? 'gone' : ''}"><b>${esc(m.name)}</b>, ${esc(m.role)} <small>(${esc(m.origin)})</small><br><span>${esc(m.note)}</span>${m.says ? `<br><i>${esc(m.says)}</i>` : ''}<br><small>${m.status === 'aboard' || m.status === 'rated' ? esc(m.mood) : esc({ dead: 'Dead', hanged: 'Hanged', ashore: 'Sent ashore', deserted: 'Ran' }[m.status] || m.status)}</small></div>`).join('')}
  </section>`;
}

function officersTab(v) {
  return `<section class="panel"><h2>Officers</h2>
    ${v.officers.map((o) => `<div class="person"><b>${esc(o.name)}</b>, ${esc(o.label)}<br><small>Competence ${o.competence} · Loyalty ${o.loyalty} · ${esc(o.fault)}</small>${o.faultNote ? `<br><span>${esc(o.faultNote)}</span>` : ''}</div>`).join('')}
    <h3>Your followers</h3>
    <p>${v.followers.length ? esc(v.followers.join(', ')) : 'None yet. Recommend a midshipman for lieutenant when in port.'}</p>
  </section>`;
}

function careerTab(v) {
  const p = v.career.posting;
  return `<section class="panel"><h2>${esc(v.captain.name)}</h2>
    <p>${esc(v.captain.rank)}${v.captain.postList ? `, ${v.captain.postList} places from the head of the post list` : ''}. Interest ${v.captain.interest}. Patron: ${esc(v.patron.name)}.</p>
    ${bar('Service reputation', v.captain.rep.service)}${bar('Public name', v.captain.rep.public)}${bar('Name among the men', v.captain.rep.men)}
    ${v.career.promotion ? `<p class="hint">To be made post: performance ${v.career.promotion.score} against ${v.career.promotion.threshold} (service reputation, interest, actions won).</p>` : ''}
    <h3>Posting score: ${p.total}</h3>
    <p class="hint">What the Admiralty weighs when it gives out ships. ${v.career.offered ? esc(v.career.offered.reason) : ''}</p>
    <table class="score">${Object.entries(p.parts).map(([k, n]) => `<tr><td>${esc(k)}</td><td>${n}</td></tr>`).join('')}</table>
    <h3>Record</h3>
    <p>Actions ${v.record.actions} (won ${v.record.won}, lost ${v.record.lost}) · Prizes ${v.record.prizes} · Ships lost ${v.record.shipsLost}</p>
    <p>Punishments ${v.record.punishments}, ${v.record.lashes} lashes (${v.career.lashRate} per 100 men a year: ${esc(v.career.conduct)}). Men killed ${v.record.killed}, died ${v.record.died}, ran ${v.record.deserted}.</p>
    <h3>Reports</h3>${v.reports.map((r) => `<details><summary>${esc(r.title)}</summary><ul>${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul></details>`).join('') || '<p>None yet.</p>'}
    <h3>Ledger</h3><table class="ledger">${v.ledger.slice(0, 12).map((l) => `<tr><td>${esc(l.date)}</td><td>${esc(l.reason)}</td><td>${money(l.amount)}</td></tr>`).join('')}</table>
    <h3>Save</h3><p class="hint">Saved on this device after every move. A save code moves the game to another device.</p>
    <button data-act="export">Show save code</button> <button data-act="quit">Back to title</button>
    <div id="codebox"></div>
  </section>`;
}

function logTab(v) {
  return `<section class="panel"><h2>Ship's log</h2><ul class="log">${v.log.map((l) => `<li class="k-${esc(l.kind)}"><small>${esc(l.date)}</small> ${esc(l.text)}</li>`).join('')}</ul></section>`;
}

// ---- input -------------------------------------------------------------------

document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-act], [data-tab]');
  if (!t || t.disabled) return;
  if (t.dataset.tab) { tab = t.dataset.tab; render(); window.scrollTo(0, 0); return; }
  const a = t.dataset.act;
  switch (a) {
    case 'background': title.background = t.dataset.id; renderTitle(); return;
    case 'new': {
      const name = (document.getElementById('cname')?.value || '').trim() || 'Captain James Ashworth';
      state = newGame({ seed: (Math.random() * 2 ** 31) >>> 0, background: title.background, name });
      saveGame(state); tab = 'ship'; render(); return;
    }
    case 'start': render(); return;
    case 'continue': state = loadGame(); tab = 'ship'; render(); return;
    case 'import':
      try { state = importCode(document.getElementById('code').value); saveGame(state); tab = 'ship'; render(); } catch (e) { title.message = e.message; renderTitle(); }
      return;
    case 'order': act({ type: 'orders', key: t.dataset.key, value: t.dataset.value }); return;
    case 'port': act({ type: 'port', id: t.dataset.id }); return;
    case 'end-turn': act({ type: 'advance' }); window.scrollTo(0, 0); return;
    case 'option': act({ type: 'option', id: t.dataset.id }); window.scrollTo(0, 0); return;
    case 'battle': act({ type: 'battle', id: t.dataset.id }); return;
    case 'close': act({ type: 'report' }); window.scrollTo(0, 0); return;
    case 'interlude': act({ type: 'interlude', id: t.dataset.id }); window.scrollTo(0, 0); return;
    case 'export': document.getElementById('codebox').innerHTML = `<textarea readonly>${esc(exportCode(state))}</textarea>`; return;
    case 'quit': state = null; title.message = ''; renderTitle(); return;
    case 'restart': clearSave(); state = null; renderTitle(); return;
    default: break;
  }
});

renderTitle();
registerSW(() => {
  if (document.querySelector('.update')) return;
  document.body.insertAdjacentHTML('beforeend', '<button class="update" data-act="reload" onclick="location.reload()">A new version is ready. Reload</button>');
});
