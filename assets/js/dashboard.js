/* Webfile – interactive sample dashboard (demo data only, nothing is sent anywhere).
   Loaded by main.js only when the dashboard section scrolls into view. */
(() => {
  'use strict';
  const root = document.querySelector('[data-app]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = '1';

  /* ---------- helpers ---------- */
  const DAY = 864e5;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const at = off => new Date(today.getTime() + off * DAY);
  const fmt = (d, o = { day: 'numeric', month: 'short', year: 'numeric' }) => d.toLocaleDateString('en-GB', o);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = n => n.replace(/\b(ltd|limited|llp|plc|&)\b/gi, '').trim().split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || 'CO';
  const rnd = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const P = {
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    building: '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3"/>',
    calendar: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/>',
    bell: '<path d="M6 9a6 6 0 1 1 12 0c0 6 3 7 3 7H3s3-1 3-7M10 20a2 2 0 0 0 4 0"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4.5 7 7.5 6 7.5-6"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    shield: '<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/><path d="m9 12 2 2 4-4"/>',
    chev: '<path d="m9 6 6 6-6 6"/>', left: '<path d="m15 6-6 6 6 6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    alert: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5.5M12 16.5v.01"/>'
  };
  const ic = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;

  /* ---------- sample data ---------- */
  const seed = () => [
    { id: 'c1', name: 'Sample Bakery Ltd', no: '00000001', dl: [{ t: 'Annual accounts', due: 6 }, { t: 'Confirmation statement', due: 140 }] },
    { id: 'c2', name: 'Northfield Lettings Ltd', no: '00000002', dl: [{ t: 'Confirmation statement', due: 20 }, { t: 'Annual accounts', due: 95 }] },
    { id: 'c3', name: 'Maple & Co Consulting Ltd', no: '00000003', dl: [{ t: 'Confirmation statement', due: 12 }, { t: 'Annual accounts', due: 220 }] },
    { id: 'c4', name: 'Greenway Property Holdings Ltd', no: '00000004', dl: [{ t: 'Confirmation statement', due: 74 }, { t: 'Annual accounts', due: 130 }] },
    { id: 'c5', name: 'Harbour Studio Ltd', no: '00000005', dl: [{ t: 'Confirmation statement', due: 9, filed: -2 }, { t: 'Annual accounts', due: 45 }] }
  ];
  const S = {
    page: 'overview', filter: 'all', cos: seed(), banner: true, drawer: null, adding: false,
    cal: new Date(today.getFullYear(), today.getMonth(), 1),
    offsets: new Set([30, 14, 7, 3, 1]), untilFiled: true, cc: false
  };

  const status = d => d.filed !== undefined ? { k: 'filed', label: 'Filed' }
    : d.due <= 7 ? { k: 'red', label: 'Action required' }
    : d.due <= 30 ? { k: 'amber', label: 'Due soon' }
    : { k: 'green', label: 'On track' };
  const rows = () => S.cos.flatMap(c => c.dl.map((d, i) => ({ c, d, i, s: status(d) }))).sort((a, b) => a.d.due - b.d.due);
  const count = k => rows().filter(r => r.s.k === k).length;
  const schedule = d => [...S.offsets].sort((a, b) => b - a).map(o => {
    const when = new Date(at(d.due).getTime() - o * DAY);
    const cut = d.filed !== undefined ? at(d.filed) : today;
    const st = when <= cut ? 'sent' : d.filed !== undefined ? 'stopped' : 'scheduled';
    return { o, when, st };
  });
  const pill = s => `<span class="dpill dpill--${s.k}">${s.label}</span>`;
  const avatar = c => `<span class="dav">${esc(initials(c.name))}</span>`;
  const left = d => d.filed !== undefined ? 'Filed' : `${d.due} day${d.due === 1 ? '' : 's'}`;

  /* ---------- pages ---------- */
  const greet = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
  const head = (title, sub, actions = '') => `<div class="dhead"><div><h3 class="dh1">${title}</h3><p class="dsub">${sub}</p></div><div class="dhead__act">${actions}</div></div>`;
  const bell = () => { const n = count('red') + count('amber'); return `<button type="button" class="dicon-btn" data-page="reminders" aria-label="Reminders">${ic('bell')}${n ? `<span class="dbadge">${n}</span>` : ''}</button>`; };
  const addBtn = `<button type="button" class="dbtn" data-act="add-open">${ic('plus')}Add company</button>`;

  function overview() {
    const urgent = rows().find(r => r.s.k === 'red');
    const banner = S.banner && urgent ? `
      <div class="dbanner">
        <span class="dbanner__ic">${ic('clock')}</span>
        <div><strong>${esc(urgent.d.t)} for ${esc(urgent.c.name)} is due in ${urgent.d.due} days</strong><p>Filing early keeps things stress-free.</p></div>
        <button type="button" class="dbtn dbtn--red" data-open="${urgent.c.id}" data-dl="${urgent.i}">View deadline</button>
        <button type="button" class="dx" data-act="dismiss" aria-label="Dismiss">${ic('x')}</button>
      </div>` : '';
    const nextRed = rows().find(r => r.s.k === 'red');
    const card = (k, icon, n, label, sub) => `<div class="dstat dstat--${k}"><span class="dstat__ic">${ic(icon)}</span><div><b>${n}</b><span>${label}</span><small>${sub}</small></div></div>`;
    const tabs = [['all', 'All', rows().filter(r => r.s.k !== 'filed').length], ['red', 'Action required', count('red')], ['amber', 'Due soon', count('amber')], ['green', 'On track', count('green')], ['filed', 'Filed', count('filed')]];
    const list = rows().filter(r => S.filter === 'all' ? r.s.k !== 'filed' : r.s.k === S.filter);
    return head(greet(), 'Here’s what’s coming up across your companies.', bell() + addBtn) + banner + `
      <div class="dstats">
        ${card('red', 'alert', count('red'), 'Action required', nextRed ? `Next in ${nextRed.d.due} days` : 'Nothing urgent')}
        ${card('amber', 'clock', count('amber'), 'Due soon', 'Within 8–30 days')}
        ${card('green', 'shield', count('green'), 'On track', '31+ days away')}
        ${card('brand', 'building', S.cos.length, 'Companies', 'Monitored for you')}
      </div>
      <div class="dcard">
        <div class="dcard__head">
          <h4>Upcoming deadlines</h4>
          <div class="dtabs" role="tablist">${tabs.map(([k, l, n]) => `<button type="button" role="tab" aria-selected="${S.filter === k}" data-filter="${k}">${l}<span>${n}</span></button>`).join('')}</div>
        </div>
        <div class="dtable">
          <div class="dtr dtr--head"><span>Company</span><span>What’s due</span><span>Deadline</span><span>Time left</span><span>Status</span><span></span></div>
          ${list.length ? list.map(r => `
          <button type="button" class="dtr" data-open="${r.c.id}" data-dl="${r.i}">
            <span class="dco">${avatar(r.c)}<span><b>${esc(r.c.name)}</b><small>${r.c.no}</small></span></span>
            <span class="dwhat">${esc(r.d.t)}</span>
            <span class="ddate dtone--${r.s.k}">${ic('calendar')}${fmt(at(r.d.due))}</span>
            <span class="dleft dtone--${r.s.k}">${left(r.d)}</span>
            <span>${pill(r.s)}</span>
            <span class="dchev">${ic('chev')}</span>
          </button>`).join('') : `<p class="dempty">Nothing here right now.</p>`}
        </div>
      </div>`;
  }

  function companies() {
    const form = S.adding ? `
      <form class="dadd" data-act="add-form">
        <label class="sr-only" for="dadd-name">Company name or number</label>
        <input id="dadd-name" name="n" maxlength="40" placeholder="Company name or number" autocomplete="off">
        <button type="submit" class="dbtn">Add</button>
        <button type="button" class="dbtn dbtn--ghost" data-act="add-cancel">Cancel</button>
        <small>Demo only: we’ll make up some dates for it.</small>
      </form>` : '';
    return head('Companies', `${S.cos.length} companies monitored`, S.adding ? '' : addBtn) + form + `
      <div class="dgrid">${S.cos.map(c => `
        <button type="button" class="dco-card" data-open="${c.id}" data-dl="0">
          <span class="dco">${avatar(c)}<span><b>${esc(c.name)}</b><small>Company no. ${c.no}</small></span></span>
          ${c.dl.map(d => `<span class="dco-card__row"><span>${esc(d.t)}<small>${d.filed !== undefined ? 'Filed ' + fmt(at(d.filed)) : 'Due ' + fmt(at(d.due))}</small></span>${pill(status(d))}</span>`).join('')}
        </button>`).join('')}
      </div>`;
  }

  function deadlines() {
    const y = S.cal.getFullYear(), m = S.cal.getMonth();
    const first = new Date(y, m, 1), startPad = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate();
    const inMonth = rows().filter(r => { const d = at(r.d.due); return d.getFullYear() === y && d.getMonth() === m; });
    const cells = [];
    for (let i = 0; i < startPad; i++) cells.push('<div class="dcal__cell is-pad"></div>');
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d), isToday = +date === +today;
      const items = inMonth.filter(r => at(r.d.due).getDate() === d);
      cells.push(`<div class="dcal__cell${isToday ? ' is-today' : ''}"><span class="dcal__n">${d}</span>${items.map(r =>
        `<button type="button" class="dchip dchip--${r.s.k}" data-open="${r.c.id}" data-dl="${r.i}" title="${esc(r.c.name)}: ${esc(r.d.t)}"><span>${esc(initials(r.c.name))} · ${r.d.t === 'Annual accounts' ? 'Accounts' : 'CS'}</span></button>`).join('')}</div>`);
    }
    const nav = `<div class="dmonth"><button type="button" class="dicon-btn" data-act="cal-prev" aria-label="Previous month">${ic('left')}</button><b>${fmt(first, { month: 'long', year: 'numeric' })}</b><button type="button" class="dicon-btn" data-act="cal-next" aria-label="Next month">${ic('chev')}</button><button type="button" class="dbtn dbtn--ghost" data-act="cal-today">Today</button></div>`;
    return head('Deadlines', 'Every filing date, month by month.', nav) + `
      <div class="dcard dcal">
        <div class="dcal__wk">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => `<span>${w}</span>`).join('')}</div>
        <div class="dcal__grid">${cells.join('')}</div>
      </div>
      <div class="dlegend"><span class="dl--red">Action required</span><span class="dl--amber">Due soon</span><span class="dl--green">On track</span><span class="dl--filed">Filed</span></div>
      <div class="dcard dmlist"><h4>${inMonth.length ? `${inMonth.length} deadline${inMonth.length > 1 ? 's' : ''} this month` : 'No deadlines this month'}</h4>
        ${inMonth.map(r => `<button type="button" class="dmrow" data-open="${r.c.id}" data-dl="${r.i}"><span>${fmt(at(r.d.due), { day: 'numeric', month: 'short' })}</span><b>${esc(r.c.name)}</b><span>${esc(r.d.t)}</span>${pill(r.s)}</button>`).join('')}
      </div>`;
  }

  function reminders() {
    const all = S.cos.flatMap(c => c.dl.flatMap((d, i) => schedule(d).map(s => ({ c, d, i, ...s }))));
    const up = all.filter(r => r.st === 'scheduled').sort((a, b) => a.when - b.when).slice(0, 6);
    const sent = all.filter(r => r.st === 'sent').sort((a, b) => b.when - a.when).slice(0, 6);
    const item = r => `<button type="button" class="drem" data-open="${r.c.id}" data-dl="${r.i}">
        <span class="drem__ic">${ic('mail')}</span>
        <span><b>${esc(r.d.t)} due in ${r.o} day${r.o > 1 ? 's' : ''}</b><small>${esc(r.c.name)}</small></span>
        <span class="drem__when">${fmt(r.when, { day: 'numeric', month: 'short' })}<small>Email${S.cc ? ' + accountant' : ''}</small></span></button>`;
    return head('Reminders', 'What we’ve sent, and what’s coming next.') + `
      <div class="dcols">
        <div class="dcard"><h4>Coming up</h4>${up.length ? up.map(item).join('') : '<p class="dempty">No reminders scheduled.</p>'}</div>
        <div class="dcard"><h4>Recently sent</h4>${sent.length ? sent.map(item).join('') : '<p class="dempty">Nothing sent yet.</p>'}</div>
      </div>`;
  }

  function settings() {
    const opts = [60, 30, 14, 7, 3, 1];
    const tog = (key, label, sub, on, disabled) => `<div class="dset"><div><b>${label}</b><small>${sub}</small></div>
      <button type="button" class="dswitch" role="switch" aria-checked="${on}" ${disabled ? 'disabled' : `data-set="${key}"`} aria-label="${label}"><span></span></button></div>`;
    return head('Settings', 'Choose how and when you’d like to be reminded.') + `
      <div class="dcard">
        <h4>Reminder timing</h4><p class="dsub">Send me a reminder this many days before each deadline:</p>
        <div class="doffs">${opts.map(o => `<button type="button" class="doff" aria-pressed="${S.offsets.has(o)}" data-off="${o}">${o} day${o > 1 ? 's' : ''}</button>`).join('')}</div>
      </div>
      <div class="dcard">
        <h4>Reminder options</h4>
        ${tog('untilFiled', 'Keep reminding until it’s filed', 'Reminders stop automatically once Companies House shows it’s filed.', S.untilFiled)}
        ${tog('cc', 'Copy in my accountant', 'Send the same reminders to your accountant too.', S.cc)}
        ${tog('', 'Text message reminders', 'Coming soon', false, true)}
      </div>
      <p class="dnote">Changes here update the reminders throughout this demo.</p>`;
  }

  function drawer() {
    if (!S.drawer) return '';
    const c = S.cos.find(x => x.id === S.drawer.id); if (!c) return '';
    const d = c.dl[S.drawer.dl], s = status(d);
    const sch = schedule(d);
    return `<div class="dscrim" data-act="close"></div>
      <aside class="ddrawer" role="dialog" aria-label="${esc(c.name)}">
        <div class="ddrawer__head">${avatar(c)}<div><b>${esc(c.name)}</b><small>Company no. ${c.no} (sample)</small></div><button type="button" class="dx" data-act="close" aria-label="Close">${ic('x')}</button></div>
        <div class="dseg">${c.dl.map((x, i) => `<button type="button" aria-pressed="${i === S.drawer.dl}" data-seldl="${i}">${esc(x.t)}</button>`).join('')}</div>
        <div class="dbig">
          <small>${d.filed !== undefined ? 'Filed on' : 'Due on'}</small>
          <b>${fmt(d.filed !== undefined ? at(d.filed) : at(d.due), { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}</b>
          ${pill(s)} ${d.filed === undefined ? `<span class="dleft dtone--${s.k}">${left(d)} left</span>` : ''}
        </div>
        <h5>Reminder schedule</h5>
        <ul class="dtl">${sch.map(r => `<li class="is-${r.st}"><span>${r.o} day${r.o > 1 ? 's' : ''} before</span><small>${fmt(r.when, { day: 'numeric', month: 'short' })}</small><em>${r.st === 'sent' ? 'Sent' : r.st === 'stopped' ? 'Stopped' : 'Scheduled'}</em></li>`).join('')}
          ${S.untilFiled && d.filed === undefined ? '<li class="is-scheduled"><span>Then every few days</span><small>until filed</small><em>Auto</em></li>' : ''}</ul>
        <div class="ddrawer__foot">${d.filed !== undefined
          ? `<p class="ddone">${ic('check')}Filed. Remaining reminders stopped.</p>`
          : `<button type="button" class="dbtn" data-act="file">Simulate filing</button><small>In Webfile this happens automatically once Companies House updates the register.</small>`}</div>
      </aside>`;
  }

  /* ---------- shell ---------- */
  const NAV = [['overview', 'Overview', 'grid'], ['companies', 'Companies', 'building'], ['deadlines', 'Deadlines', 'calendar'], ['reminders', 'Reminders', 'mail'], ['settings', 'Settings', 'sliders']];
  const PAGES = { overview, companies, deadlines, reminders, settings };

  function render(keepScroll) {
    const main = root.querySelector('.dmain'), y = keepScroll && main ? main.scrollTop : 0;
    root.innerHTML = `
      <div class="app__bar" aria-hidden="true"><span></span><span></span><span></span><p>webfile.com/${S.page === 'overview' ? 'dashboard' : S.page}</p></div>
      <div class="dapp">
        <nav class="dside" aria-label="Demo dashboard pages">
          <p class="dlogo">webfile<span>.</span></p>
          ${NAV.map(([k, l, i]) => `<button type="button" class="dnav${S.page === k ? ' is-active' : ''}" data-page="${k}" aria-current="${S.page === k ? 'page' : 'false'}">${ic(i)}<span>${l}</span></button>`).join('')}
          <div class="dside__foot">
            <div class="dpromo">${ic('shield')}<b>Stay ahead.</b><small>We’ll nudge you before every deadline.</small></div>
            <div class="dme"><span class="dav dav--me">DA</span><span><b>Demo account</b><small>Free plan</small></span></div>
          </div>
        </nav>
        <div class="dmain">${PAGES[S.page]()}</div>
        ${drawer()}
      </div>`;
    const m = root.querySelector('.dmain'); if (m) m.scrollTop = y;
  }

  root.addEventListener('click', e => {
    const t = e.target.closest('button, [data-act]'); if (!t || !root.contains(t)) return;
    const act = t.dataset.act;
    if (t.dataset.page) { S.page = t.dataset.page; S.drawer = null; S.adding = false; return render(); }
    if (t.dataset.filter) { S.filter = t.dataset.filter; return render(true); }
    if (t.dataset.open) { S.drawer = { id: t.dataset.open, dl: +t.dataset.dl || 0 }; render(true); root.querySelector('.ddrawer .dx')?.focus(); return; }
    if (t.dataset.seldl) { S.drawer.dl = +t.dataset.seldl; return render(true); }
    if (t.dataset.off) { const o = +t.dataset.off; if (S.offsets.has(o) && S.offsets.size > 1) S.offsets.delete(o); else S.offsets.add(o); return render(true); }
    if (t.dataset.set) { S[t.dataset.set] = !S[t.dataset.set]; return render(true); }
    switch (act) {
      case 'close': S.drawer = null; return render(true);
      case 'dismiss': S.banner = false; return render(true);
      case 'file': { const c = S.cos.find(x => x.id === S.drawer.id); c.dl[S.drawer.dl].filed = 0; return render(true); }
      case 'add-open': S.page = 'companies'; S.adding = true; render(); root.querySelector('#dadd-name')?.focus(); return;
      case 'add-cancel': S.adding = false; return render(true);
      case 'cal-prev': S.cal = new Date(S.cal.getFullYear(), S.cal.getMonth() - 1, 1); return render(true);
      case 'cal-next': S.cal = new Date(S.cal.getFullYear(), S.cal.getMonth() + 1, 1); return render(true);
      case 'cal-today': S.cal = new Date(today.getFullYear(), today.getMonth(), 1); return render(true);
    }
  });
  root.addEventListener('submit', e => {
    if (!e.target.matches('[data-act="add-form"]')) return;
    e.preventDefault();
    const name = (e.target.n.value || '').trim().slice(0, 40) || 'New Company Ltd';
    if (S.cos.length >= 9) S.cos.pop();
    const id = 'n' + Date.now();
    S.cos.unshift({ id, name, no: 'Demo', dl: [{ t: 'Confirmation statement', due: rnd(15, 300) }, { t: 'Annual accounts', due: rnd(20, 320) }] });
    S.adding = false; render();
  });
  root.addEventListener('keydown', e => { if (e.key === 'Escape' && S.drawer) { S.drawer = null; render(true); } });

  render();
})();
