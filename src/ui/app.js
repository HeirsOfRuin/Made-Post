// The page. It reads view(state) and sends inputs to choose(); it computes
// nothing about the game (architecture invariant 3). Every click target carries
// data-act so the phone smoke test can drive it.
//
// Layout rule: each screen leads with one story paragraph and one decision.
// Detail (numbers, settings, records) sits in folded sections underneath, so a
// new player is never handed everything at once.

import { newGame, choose, view } from '../engine/game.js';
import { BACKGROUNDS } from '../data/cast.data.js';
import { saveGame, loadGame, clearSave, exportCode, importCode, STORAGE_OK } from './save.js';
import { registerSW } from './sw-register.js';

const app = document.getElementById('app');
let state = null;
let tab = 'ship';
const title = { background: 'naval', message: '' };

const esc = (x) => String(x ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => `${n < 0 ? '-' : ''}£${Math.abs(Math.round(n)).toLocaleString('en-GB')}`;
const bar = (label, v, note = '') => `<div class="bar"><span class="bar-label">${esc(label)}</span><span class="bar-track"><span class="bar-fill ${v < 30 ? 'low' : v < 50 ? 'mid' : ''}" style="width:${Math.max(0, Math.min(100, v))}%"></span></span><span class="bar-num">${Math.round(v)}</span>${note ? `<span class="bar-note">${esc(note)}</span>` : ''}</div>`;
const fold = (summary, body, open = false) => `<details class="fold"${open ? ' open' : ''}><summary>${esc(summary)}</summary>${body}</details>`;

function act(input) {
  try {
    state = choose(state, input);
    saveGame(state);
  } catch (e) {
    console.error(e);
    render();
    showError(e);
    return;
  }
  render();
}

function showError(e) {
  const code = state ? exportCode(state) : '';
  app.insertAdjacentHTML('afterbegin', `<div class="error" role="alert"><b>Something went wrong:</b> ${esc(e.message)}<br>Your game is saved. If it keeps happening, copy this code and send it with a note of what you did:<textarea readonly>${esc(code)}</textarea></div>`);
}

// ---- title -----------------------------------------------------------------

function renderTitle() {
  const saved = loadGame();
  app.innerHTML = `
  <main class="title">
    <h1>Made Post</h1>
    <p class="sub">The career of a Royal Navy captain, 1794 to 1815. Your ship, your crew, and every choice in between.</p>
    ${saved ? `<button class="primary big" data-act="continue">Continue: ${esc(saved.player.name)}, ${esc(view(saved).date)}</button>` : ''}
    <h2>A new career</h2>
    <label class="field">Your name <input id="cname" value="James Ashworth" maxlength="40" autocomplete="off"></label>
    <p class="q">Where did you come from?</p>
    <div class="cards">
      ${Object.entries(BACKGROUNDS).map(([id, b]) => `
        <button class="card ${title.background === id ? 'selected' : ''}" data-act="background" data-id="${id}" aria-pressed="${title.background === id}">
          <b>${esc(b.label)}</b><span>${esc(b.blurb)}</span>
        </button>`).join('')}
    </div>
    <button class="primary big" data-act="new">Begin</button>
    ${fold('Load a saved game from a code', '<textarea id="code" placeholder="MADP1...."></textarea><button data-act="import">Load</button>')}
    ${title.message ? `<p class="warn">${esc(title.message)}</p>` : ''}
    ${STORAGE_OK ? '' : '<p class="warn">This browser will not keep saves. Use "Save code" on the Career tab to keep your game.</p>'}
  </main>`;
}

// ---- the game ----------------------------------------------------------------

function render() {
  if (!state) { renderTitle(); return; }
  const v = view(state);
  const tabs = v.phase !== 'setup';
  app.innerHTML = `
  <header class="hud">
    <div class="hud-top"><b class="ship-name">${v.ship ? `HMS ${esc(v.ship.name)}` : 'Ashore'}</b><span class="turn">${esc(v.date)}</span></div>
    <div class="hud-sub">${esc(v.captain.rank)} ${esc(v.captain.name)} · ${money(v.captain.money)}</div>
  </header>
  ${tabs ? `<nav class="tabs" role="tablist">
    ${[['ship', 'Ship'], ['crew', 'Crew'], ['officers', 'Officers'], ['career', 'Career'], ['log', 'Log']].map(([id, label]) => `<button role="tab" data-tab="${id}" aria-selected="${tab === id}" class="${tab === id ? 'on' : ''}">${label}${id === 'ship' && tab !== 'ship' && ['decision', 'battle', 'report', 'interlude'].includes(v.phase) ? ' •' : ''}</button>`).join('')}
  </nav>` : ''}
  <main id="main">${!tabs ? setupPanel(v) : { ship: shipTab, crew: crewTab, officers: officersTab, career: careerTab, log: logTab }[tab](v)}</main>`;
}

function setupPanel(v) {
  const st = v.setup;
  return `<section class="panel setup">
    <p class="step">Taking command · ${st.step} of ${st.of}</p>
    <h2>${esc(st.title)}</h2>
    ${st.text.map((p) => `<p class="story">${esc(p)}</p>`).join('')}
    <div class="choices">${st.options.map((o) => `
      <button class="choice" data-act="setup" data-choice="${o.id}" data-id="${o.id}"><b>${esc(o.label)}</b>${o.hint ? `<span class="stake">${esc(o.hint)}</span>` : ''}</button>`).join('')}</div>
  </section>`;
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
    default: return `<p>Unknown screen ${esc(v.phase)}.</p>`;
  }
}

function ordersFold(v, open = false) {
  return fold('How the ship is run', `
    <p class="hint">Your standing orders. They apply every week until you change them.</p>
    ${Object.entries(v.orderChoices).map(([key, spec]) => `
      <div class="order"><span>${esc(spec.label)}</span><div class="seg">
        ${Object.entries(spec.values).map(([val, label]) => `<button data-act="order" data-key="${key}" data-value="${val}" class="${v.orders[key] === val ? 'on' : ''}" aria-pressed="${v.orders[key] === val}">${esc(label)}</button>`).join('')}
      </div><small>${esc(v.orderHints[key])}</small></div>`).join('')}`, open);
}

function conditionFold(v) {
  const s = v.ship;
  return fold('Ship and stores', `
    <p><b>${esc(s.cls)}</b>, ${esc(s.guns)}.</p>
    ${s.trait ? `<p class="trait"><b>${esc(s.trait.label)}.</b> ${esc(s.trait.note)}</p>` : ''}
    ${bar('Hull', s.hull)}${bar('Masts and sails', s.rigging)}
    <p class="stores">Food for ${s.stores.food} weeks · water for ${s.stores.water} weeks · ${s.stores.powder} barrels of powder</p>
    <p class="stores">Crew ${v.crew.total} of ${v.crew.complement} · sailing skill ${v.crew.effective.seamanship} · gunnery ${v.crew.effective.gunnery} (out of 100)</p>`);
}

function portPanel(v) {
  const n = v.port.next;
  const open = v.port.actions.filter((a) => !a.locked && !a.primary);
  const shut = v.port.actions.filter((a) => a.locked && !a.primary);
  const sail = v.port.actions.find((a) => a.primary);
  return `<section class="panel"><h2>In port: ${esc(v.port.name)}</h2>
    ${n ? `<div class="orders-card"><p class="step">Your next orders</p><b>${esc(n.orders)}, ${esc(n.station)}</b><p>${esc(n.note)}</p><small>About ${n.weeks} weeks, under ${esc(n.superior)}.</small></div>` : ''}
    <p>${esc(v.status)}</p>
    <h3>Before you sail</h3>
    <div class="actions">${open.map((a) => `
      <div class="action"><button data-act="port" data-id="${a.id}">${esc(a.label)}</button><p>${esc(a.note)}</p></div>`).join('') || '<p class="hint">Nothing more to do here.</p>'}</div>
    <div class="action primary-row"><button class="primary big" data-act="port" data-id="sail" ${sail.locked ? 'disabled' : ''}>Put to sea</button><p>${esc(sail.note)}${sail.locked ? ` <span class="lock">${esc(sail.locked)}</span>` : ''}</p></div>
    ${shut.length ? fold('Not available now', `<ul class="plain">${shut.map((a) => `<li><b>${esc(a.label)}</b>: ${esc(a.locked)}</li>`).join('')}</ul>`) : ''}
  </section>${ordersFold(v)}${conditionFold(v)}`;
}

function outcomeLine(v) {
  const o = v.lastOutcome;
  if (!o) return '';
  return `<p class="outcome"><b>${esc(o.title)}:</b> ${esc(o.choice)}${o.passed === null ? '.' : o.passed ? '. It worked.' : '. It did not work.'} <small>${esc(o.effects)}</small></p>`;
}

function seaPanel(v) {
  const c = v.commission;
  if (c.week === 0) {
    return `<section class="panel"><p class="step">Your orders</p><h2>${esc(c.label)}: ${esc(c.station)}</h2>
      <p class="story">${esc(c.story)}</p>
      <p class="hint">${esc(c.brief)}</p>
      <p class="hint">Your admiral: ${esc(c.superior)}. ${esc(c.superiorNote)}</p>
      <button class="primary big" data-act="end-turn">Set sail</button>
    </section>${ordersFold(v)}`;
  }
  const bad = v.crew.signs.filter((x) => !/happy ship/.test(x));
  return `<section class="panel"><p class="step">Week ${c.week} of ${c.weeks} · ${esc(c.label)}, ${esc(c.station)}</p>
    <p class="story">${esc(v.status)}</p>
    ${outcomeLine(v)}
    ${bad.length ? `<ul class="signs">${bad.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
    <button class="primary big" data-act="end-turn">Next week</button>
  </section>${ordersFold(v)}${conditionFold(v)}`;
}

function decisionPanel(v) {
  const d = v.decision;
  return `<section class="panel decision"><h2>${esc(d.title)}</h2>
    <p class="story">${esc(d.text)}</p>
    <div class="choices">${d.options.map((o) => `
      <button class="choice" data-choice="${o.id}" data-act="option" data-id="${o.id}">
        <b>${esc(o.label)}</b><span class="stake">${esc(o.stake)}</span>
      </button>`).join('')}</div>
  </section>`;
}

function battlePanel(v) {
  const b = v.battle;
  const side = (name, x) => `<div class="side"><b>${esc(name)}</b>${bar('Hull', x.hull)}${bar('Men', (100 * x.crew) / x.crewStart, `${x.crew} of ${x.crewStart} still fighting`)}</div>`;
  const q = { approach: 'She is in sight. How do you go at her?', engage: 'Within range. How do you fight?', decide: 'Both ships are hurt. What now?', aftermath: 'She has surrendered. What do you do with her?', done: 'The fight is over.' }[b.phase];
  return `<section class="panel battle"><p class="step">Action</p><h2>${esc(b.foe)}</h2>
    <div class="sides">${side('Your ship', b.own)}${side(b.foe, b.enemy)}</div>
    ${b.lines.length ? `<ol class="battle-log">${b.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>` : ''}
    <h3>${esc(q)}</h3>
    <div class="choices">${b.options.map((o) => `
      <button class="choice" data-choice="${o.id}" data-act="battle" data-id="${o.id}">
        <b>${esc(o.label)}</b>${o.stake ? `<span class="stake">${esc(o.stake)}</span>` : ''}
      </button>`).join('')}</div>
    ${fold('Strength of each ship', `<p class="stores">You: ${b.own.broadside} lb of shot per broadside, gunnery ${b.own.gunnery}, sailing ${b.own.seamanship}.</p><p class="stores">Her: ${b.enemy.broadside} lb, gunnery ${b.enemy.gunnery}, sailing ${b.enemy.seamanship}.</p>`)}
  </section>`;
}

function reportPanel(v) {
  const r = v.report;
  return `<section class="panel"><p class="step">Home from sea</p><h2>${esc(r.title)}</h2>
    <ul class="report">${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    ${v.lastBattle ? fold(`Your last fight: ${v.lastBattle.foe}`, `<ol class="battle-log">${v.lastBattle.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ol>`) : ''}
    <button class="primary big" data-act="close" data-choice="report">Continue</button>
  </section>`;
}

function interludePanel(v) {
  return `<section class="panel"><p class="step">The years pass</p>
    <p class="story">${esc(v.interlude.text.head)}</p>
    ${v.interlude.text.act ? `<h2>Act ${v.interlude.text.act.id}: ${esc(v.interlude.text.act.title)}</h2><p class="step">${esc(v.interlude.text.act.years)}</p><p class="story">${esc(v.interlude.text.act.intro)}</p>` : ''}
    <div class="choices">${v.interlude.options.map((o) => `
      <button class="choice" data-choice="${o.id}" data-act="interlude" data-id="${o.id}"><b>${esc(o.label)}</b>${o.stake ? `<span class="stake">${esc(o.stake)}</span>` : ''}</button>`).join('')}</div>
  </section>`;
}

function endingPanel(v) {
  const e = v.ending;
  return `<section class="panel ending"><p class="step">The end</p><h2>${esc(e.title)}</h2>
    ${e.lines.map((l) => `<p>${esc(l)}</p>`).join('')}
    <div class="obit"><h3>From the Naval Chronicle</h3>${e.obituary.map((l, i) => `<p class="${i === 0 ? 'obit-name' : ''}">${esc(l)}</p>`).join('')}</div>
    <h3>Score: ${e.score.total}</h3>
    <table class="score">${Object.entries(e.score.parts).map(([k, n]) => `<tr><td>${esc(k[0].toUpperCase() + k.slice(1))}</td><td>${n}</td></tr>`).join('')}</table>
    <button class="primary big" data-act="restart">Start a new career</button>
  </section>`;
}

const DRIVERS = {
  fairness: ['Fairness', 'Are the punishments fair?'],
  trust: ['Trust', 'Do they trust you?'],
  provisions: ['Food', 'Is there enough, and is it decent?'],
  workload: ['Rest', 'Do they get enough sleep?'],
  prospects: ['Hope', 'Do they expect prizes and success?'],
};

function crewTab(v) {
  const c = v.crew;
  return `<section class="panel"><h2>Your crew</h2>
    <p class="story">${esc(v.status)}</p>
    ${bar('Morale', c.morale)}
    <p class="hint">Morale comes from five things the men care about:</p>
    ${Object.entries(c.drivers).map(([k, x]) => bar(DRIVERS[k][0], x, DRIVERS[k][1])).join('')}
    <h3>Order and unrest</h3>
    ${bar('Discipline', c.discipline, c.discipline < 25 ? 'Falling apart' : 'Do they obey orders?')}
    ${bar('Unrest', c.grievance, `${c.stage}. If this climbs, it ends in mutiny.`)}
    <ul class="signs">${c.signs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  </section>
  <section class="panel"><h3>Men you know by name</h3>
    ${v.named.map((m) => `<div class="person ${m.status !== 'aboard' && m.status !== 'rated' ? 'gone' : ''}"><b>${esc(m.name)}</b>, ${esc(m.role)}<br>${m.says ? `<i>${esc(m.says)}</i>` : `<small>${esc({ dead: 'Dead', hanged: 'Hanged', ashore: 'Sent ashore', deserted: 'Deserted' }[m.status] || '')}</small>`}${fold('About him', `<p>${esc(m.note)} From ${esc(m.origin)}.</p>`)}</div>`).join('')}
  </section>
  ${fold('Health and skill', `${bar('Health', c.health, `${c.sick} on the sick list`)}${bar('Sailing', c.effective.seamanship, `Trained to ${c.skill.seamanship}; less if men are tired, sick or few`)}${bar('Gunnery', c.effective.gunnery, `Trained to ${c.skill.gunnery}`)}`)}
  ${fold(`Who is aboard: ${c.total} of ${c.complement}`, `<table class="groups">${c.groups.map((g) => `<tr><td><b>${esc(g.label)}</b><br><small>${esc(g.note)}</small></td><td>${g.n}</td></tr>`).join('')}</table>`)}`;
}

function officersTab(v) {
  return `<section class="panel"><h2>Your officers</h2>
    ${v.officers.map((o) => `<div class="person"><b>${esc(o.name)}</b>, ${esc(o.label.toLowerCase())}<br><small>Ability ${o.competence} · loyalty to you ${o.loyalty} (out of 100)${o.fault !== 'Steady' ? ` · ${esc(o.fault.toLowerCase())}` : ''}</small>${o.fault !== 'Steady' && o.faultNote ? `<br><span>${esc(o.faultNote)}</span>` : ''}</div>`).join('')}
    <h3>Officers you have had promoted</h3>
    <p>${v.followers.length ? esc(v.followers.join(', ')) : 'None yet. In port, you can recommend a midshipman for promotion to lieutenant.'}</p>
  </section>`;
}

function careerTab(v) {
  const p = v.career.posting;
  return `<section class="panel"><h2>${esc(v.captain.rank)} ${esc(v.captain.name)}</h2>
    <p>${esc(v.captain.rank)}${v.captain.postList ? `, number ${v.captain.postList} on the list of captains waiting to rise` : ''}. Money ${money(v.captain.money)}. Influence ${v.captain.interest}.</p>
    <p class="hint">Patron: ${esc(v.patron.name)}.</p>
    ${bar('Name in the navy', v.captain.rep.service)}${bar('Name with the public', v.captain.rep.public)}${bar('Name with sailors', v.captain.rep.men)}
    ${v.career.promotion ? `<p class="outcome">To be promoted to captain you need a record of ${v.career.promotion.threshold}. Yours is ${Math.round(v.career.promotion.score)}. Fights won, your name in the navy and your influence all count.</p>` : ''}
    <h3>Your record</h3>
    <p>${v.record.actions} fights (${v.record.won} won, ${v.record.lost} lost) · ${v.record.prizes} ships captured · ${v.record.shipsLost} ships lost.</p>
    <p>${v.record.lashes} lashes ordered: ${esc(v.career.conduct)}. ${v.record.killed} men killed in action, ${v.record.died} died of sickness or accident, ${v.record.deserted} deserted.</p>
  </section>
  ${fold(`How the Admiralty gives out ships (your score: ${p.total})`, `<p class="hint">${v.career.offered ? esc(v.career.offered.reason) : ''} Below 30, you may be left without a ship.</p><table class="score">${Object.entries(p.parts).map(([k, n]) => `<tr><td>${esc({ interest: 'Influence', service: 'Name in the navy', public: 'Name with the public', record: 'Ships lost and mutinies' }[k] || k)}</td><td>${n}</td></tr>`).join('')}</table>`)}
  ${fold('Reports', v.reports.map((r) => `<h3>${esc(r.title)}</h3><ul class="plain">${r.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`).join('') || '<p>None yet.</p>')}
  ${fold('Money', `<table class="ledger">${v.ledger.slice(0, 15).map((l) => `<tr><td>${esc(l.date)}</td><td>${esc(l.reason)}</td><td>${money(l.amount)}</td></tr>`).join('')}</table>`)}
  ${fold('Save and quit', `<p class="hint">The game saves after every move on this device. A save code moves it to another device.</p><button data-act="export">Show save code</button> <button data-act="quit">Back to title</button><div id="codebox"></div>`)}`;
}

function logTab(v) {
  return `${fold('Words used in this game', `<dl class="gloss">${v.glossary.map(([w, d]) => `<dt>${esc(w)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>`)}
  <section class="panel"><h2>Ship's log</h2><ul class="log">${v.log.map((l) => `<li class="k-${esc(l.kind)}"><small>${esc(l.date)}</small> ${esc(l.text)}</li>`).join('')}</ul></section>`;
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
      const name = (document.getElementById('cname')?.value || '').trim().replace(/^(captain|commander)\s+/i, '') || 'James Ashworth';
      state = newGame({ seed: (Math.random() * 2 ** 31) >>> 0, background: title.background, name });
      saveGame(state); tab = 'ship'; render(); return;
    }
    case 'continue': state = loadGame(); tab = 'ship'; render(); return;
    case 'import':
      try { state = importCode(document.getElementById('code').value); saveGame(state); tab = 'ship'; render(); } catch (e) { title.message = e.message; renderTitle(); }
      return;
    case 'setup': act({ type: 'setup', id: t.dataset.id }); window.scrollTo(0, 0); return;
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
  document.body.insertAdjacentHTML('beforeend', '<button class="update" onclick="location.reload()">A new version is ready. Reload</button>');
});
