/* ============ app.js ============ */

/* ─────────────────────────────────────────────────────
   Data layer — mirrors the SQLite schema.
   programmes · eligibility_rules · documents
   Add rows here as they are verified against source.
   ───────────────────────────────────────────────────── */

const CATEGORY_LABELS = {
  work_experience: 'Work experience',
  learnership:     'Learnership',
  internship:      'Internship',
  training:        'Training',
  funding:         'Funding',
  platform:        'Platform'
};

const SCOPE_LABELS = {
  national:      'National',
  gauteng:       'Gauteng',
  ekurhuleni:    'Ekurhuleni',
  johannesburg:  'Johannesburg'
};

const STATUS_LABELS = {
  open:    'Open',
  closed:  'Closed',
  rolling: 'Rolling',
  unknown: 'Check source'
};

/* documents (id, name, tip) */
const DOCUMENTS = [
  { id:1, name:'Certified copy of SA ID',      tip:'Certify at a police station; keep several copies.' },
  { id:2, name:'Updated CV',                   tip:'Keep it to 2 pages with a working phone number.' },
  { id:3, name:'Matric certificate',           tip:'Request a replacement from Umalusi/DBE if lost.' },
  { id:4, name:'Proof of address',             tip:'Not older than 3 months.' },
  { id:5, name:'Affidavit of unemployment',    tip:'Commissioner of Oaths at a police station is free.' },
  { id:6, name:'Bank account details',         tip:'Needed for stipend payments.' }
];

/* programmes + one row of eligibility rules each */
const PROGRAMMES = [
  {
    id:1,
    name:'YES (Youth Employment Service)',
    provider:'YES / private employers',
    category:'work_experience',
    description:'12-month paid work experience with private employers. Apply through SA Youth, not the YES site.',
    scope:'national',
    apply_url:'https://sayouth.mobi',
    source_url:'https://www.yes4youth.co.za',
    status:'rolling',
    closing_date:null,
    last_verified:'2026-09-30',
    is_active:1,
    rules:{
      min_age:18, max_age:34,
      sa_citizen_required:1, must_be_unemployed:1, not_in_fulltime_study:1,
      matric:'preferred', province:null,
      notes:'Most host employers ask for matric. One YES placement per person.'
    },
    documents:[1,2,3,4,5,6]
  },
  {
    id:2,
    name:'SA Youth platform',
    provider:'National Pathway Management Network',
    category:'platform',
    description:'Free, zero-rated platform linking young people to work and learning opportunities.',
    scope:'national',
    apply_url:'https://sayouth.mobi',
    source_url:'https://sayouth.mobi',
    status:'rolling',
    closing_date:null,
    last_verified:'2026-09-30',
    is_active:1,
    rules:{
      min_age:18, max_age:35,
      sa_citizen_required:1, must_be_unemployed:0, not_in_fulltime_study:0,
      matric:'none', province:null,
      notes:'Open to young people generally.'
    },
    documents:[1,2]
  },
  {
    id:3,
    name:'MICT SETA learnerships',
    provider:'MICT SETA',
    category:'learnership',
    description:'Funded training plus workplace experience in IT and digital skills. Windows open at set times.',
    scope:'national',
    apply_url:null,
    source_url:'https://www.mictseta.org.za',
    status:'unknown',
    closing_date:null,
    last_verified:'2026-09-30',
    is_active:1,
    rules:{
      min_age:18, max_age:35,
      sa_citizen_required:1, must_be_unemployed:1, not_in_fulltime_study:0,
      matric:'required', province:null,
      notes:'Requirements differ per learnership. Check each advert.'
    },
    documents:[1,2,3]
  },
  {
    id:4,
    name:'NYDA Grant Programme',
    provider:'National Youth Development Agency',
    category:'funding',
    description:'Grant funding and business support for young entrepreneurs with a viable idea or existing small business.',
    scope:'national',
    apply_url:'https://www.nyda.gov.za',
    source_url:'https://www.nyda.gov.za',
    status:'rolling',
    closing_date:null,
    last_verified:'2026-09-30',
    is_active:1,
    rules:{
      min_age:18, max_age:35,
      sa_citizen_required:1, must_be_unemployed:0, not_in_fulltime_study:0,
      matric:'none', province:null,
      notes:'Business plan and supporting documents required. Branch visit usually needed.'
    },
    documents:[1,2,4,6]
  },
  {
    id:5,
    name:'Harambee work-seeker support',
    provider:'Harambee Youth Employment Accelerator',
    category:'work_experience',
    description:'Connects first-time work seekers to entry-level roles and placement support with partner employers.',
    scope:'national',
    apply_url:'https://www.harambee.co.za',
    source_url:'https://www.harambee.co.za',
    status:'rolling',
    closing_date:null,
    last_verified:'2026-09-30',
    is_active:1,
    rules:{
      min_age:18, max_age:34,
      sa_citizen_required:1, must_be_unemployed:1, not_in_fulltime_study:1,
      matric:'preferred', province:null,
      notes:'Registration is free. Some placements are location-specific.'
    },
    documents:[1,2,4]
  }
];

/* ─────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────── */

const $  = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

function docById(id){ return DOCUMENTS.find(d => d.id === id); }

function formatDate(iso){
  if (!iso) return null;
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' });
}

function statusClass(status){
  return ['open','rolling','closed','unknown'].includes(status) ? status : 'unknown';
}

/* ─────────────────────────────────────────────────────
   Card renderer
   ───────────────────────────────────────────────────── */

function renderCard(p, opts = {}){
  const { muted = false, reasons = [] } = opts;
  const scope  = SCOPE_LABELS[p.scope] || p.scope;
  const cat    = CATEGORY_LABELS[p.category] || p.category;
  const status = STATUS_LABELS[p.status] || p.status;
  const r      = p.rules || {};

  const ageRange = (r.min_age || r.max_age)
    ? `${r.min_age ?? '—'}–${r.max_age ?? '—'}`
    : 'No limit';

  const matricLabel = { none:'Not required', preferred:'Preferred', required:'Required' }[r.matric] || '—';

  const docs = (p.documents || []).map(docById).filter(Boolean);

  const applyBtn = p.apply_url
    ? `<a class="btn btn--gold btn--sm" href="${p.apply_url}" target="_blank" rel="noopener">Apply</a>`
    : `<a class="btn btn--ghost btn--sm" href="${p.source_url}" target="_blank" rel="noopener">Check source</a>`;

  const reasonBlock = reasons.length
    ? `<p class="reason">Not matching: ${reasons.join(' · ')}</p>`
    : '';

  return `
    <article class="opp ${muted ? 'opp--muted' : ''}" data-id="${p.id}">
      <div class="opp-top">
        <span class="badge badge--${statusClass(p.status)}">${status}</span>
        <span class="opp-cat">${cat}</span>
      </div>

      <h3>${p.name}</h3>
      <p class="opp-provider">${p.provider} · ${scope}</p>
      <p class="opp-desc">${p.description || ''}</p>
      ${reasonBlock}

      <div class="opp-foot">
        ${applyBtn}
        <button class="link-btn" data-toggle-more aria-expanded="false">Eligibility &amp; documents</button>
        <div class="opp-meta">
          <span><b>Verified</b> ${formatDate(p.last_verified) || '—'}</span>
        </div>
      </div>

      <div class="opp-more" hidden>
        <div>
          <h4>Eligibility</h4>
          <dl>
            <div><dt>Age</dt><dd>${ageRange}</dd></div>
            <div><dt>Matric</dt><dd>${matricLabel}</dd></div>
            <div><dt>SA citizen</dt><dd>${r.sa_citizen_required ? 'Required' : 'Not required'}</dd></div>
            <div><dt>Unemployed</dt><dd>${r.must_be_unemployed ? 'Required' : 'Not required'}</dd></div>
            <div><dt>Full-time study</dt><dd>${r.not_in_fulltime_study ? 'Not permitted' : 'Allowed'}</dd></div>
            <div><dt>Province</dt><dd>${r.province || 'Any'}</dd></div>
          </dl>
        </div>
        <div>
          <h4>What to bring</h4>
          <ul>
            ${docs.length
              ? docs.map(d => `<li>${d.name}</li>`).join('')
              : '<li>See the official source for requirements.</li>'}
          </ul>
        </div>
        <div>
          <h4>Good to know</h4>
          <p class="opp-note">${r.notes || 'Check the official source for full details.'}</p>
          <p class="reason" style="margin-top:14px">
            Official source:
            <a href="${p.source_url}" target="_blank" rel="noopener"
               style="border-bottom:1px solid var(--line)">${p.source_url.replace(/^https?:\/\//,'')}</a>
          </p>
        </div>
      </div>
    </article>
  `;
}

/* Expand / collapse the detail panel on any card */
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-toggle-more]');
  if (!btn) return;
  const card = btn.closest('.opp');
  const panel = $('.opp-more', card);
  if (!panel) return;
  const open = panel.hasAttribute('hidden');
  if (open) panel.removeAttribute('hidden');
  else panel.setAttribute('hidden', '');
  btn.setAttribute('aria-expanded', String(open));
  btn.textContent = open ? 'Hide details' : 'Eligibility & documents';
});

/* ─────────────────────────────────────────────────────
   Home page — featured list
   ───────────────────────────────────────────────────── */

function initFeatured(){
  const mount = $('#featured');
  if (!mount) return;
  mount.innerHTML = PROGRAMMES
    .filter(p => p.is_active)
    .slice(0, 3)
    .map(p => renderCard(p))
    .join('');
}

/* ─────────────────────────────────────────────────────
   Opportunities page — filters + search
   ───────────────────────────────────────────────────── */

function initOpportunities(){
  const mount = $('#opportunityGrid');
  if (!mount) return;

  const state = { category:'all', scope:'all', q:'' };
  const countEl = $('#resultCount');
  const emptyEl = $('#emptyState');

  function apply(){
    const q = state.q.trim().toLowerCase();

    const results = PROGRAMMES.filter(p => {
      if (!p.is_active) return false;
      if (state.category !== 'all' && p.category !== state.category) return false;
      if (state.scope !== 'all' && p.scope !== state.scope) return false;
      if (q){
        const hay = `${p.name} ${p.provider} ${p.description} ${p.category}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    mount.innerHTML = results.map(p => renderCard(p)).join('');
    if (countEl) countEl.textContent = `${results.length} programme${results.length === 1 ? '' : 's'}`;
    if (emptyEl) emptyEl.hidden = results.length !== 0;
  }

  /* chips */
  $$('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const group = chip.dataset.filter;
      $$(`.chip[data-filter="${group}"]`).forEach(c => c.classList.remove('is-on'));
      chip.classList.add('is-on');
      state[group] = chip.dataset.value;
      apply();
    });
  });

  /* search */
  const search = $('#search');
  if (search){
    search.addEventListener('input', () => { state.q = search.value; apply(); });
  }

  apply();
}

/* ─────────────────────────────────────────────────────
   Guide — eligibility check
   ───────────────────────────────────────────────────── */

function ageBand(age){
  if (age < 18) return 'under-18';
  if (age <= 24) return '18-24';
  if (age <= 29) return '25-29';
  if (age <= 35) return '30-35';
  return '35+';
}

/* Anonymous, aggregated stats only — mirrors eligibility_checks */
function recordAnonymousCheck(band, province, matched){
  try {
    const key = 'vuka_stats';
    const stats = JSON.parse(localStorage.getItem(key) || '{"total":0,"matched":0,"bands":{},"provinces":{}}');
    stats.total += 1;
    if (matched) stats.matched += 1;
    stats.bands[band] = (stats.bands[band] || 0) + 1;
    stats.provinces[province] = (stats.provinces[province] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(stats));
  } catch (_) { /* storage unavailable — carry on */ }
}

function evaluate(user){
  return PROGRAMMES.filter(p => p.is_active).map(p => {
    const r = p.rules || {};
    const reasons = [];

    if (r.min_age != null && user.age < r.min_age)
      reasons.push(`minimum age ${r.min_age}`);
    if (r.max_age != null && user.age > r.max_age)
      reasons.push(`maximum age ${r.max_age}`);
    if (r.sa_citizen_required && user.citizen !== 'yes')
      reasons.push('SA citizenship required');
    if (r.must_be_unemployed && user.employed === 'yes')
      reasons.push('must be unemployed');
    if (r.not_in_fulltime_study && user.studying === 'yes')
      reasons.push('not open to full-time students');
    if (r.matric === 'required' && user.matric !== 'yes')
      reasons.push('matric certificate required');
    if (r.province && user.province &&
        r.province.toLowerCase() !== user.province.toLowerCase())
      reasons.push(`only for ${r.province}`);

    return { programme:p, eligible: reasons.length === 0, reasons };
  });
}

function initEligibility(){
  const form = $('#checkForm');
  if (!form) return;

  const results      = $('#results');
  const title        = $('#resultsTitle');
  const sub          = $('#resultsSub');
  const matchedList  = $('#matchedList');
  const unmatchedList= $('#unmatchedList');
  const nearWrap     = $('#nearMissWrap');

  form.addEventListener('submit', e => {
    e.preventDefault();

    const age = parseInt($('#age').value, 10);
    const province = $('#province').value;

    if (!age || age < 14 || age > 60){
      $('#age').focus();
      $('#age').style.borderColor = '#A9853F';
      return;
    }
    if (!province){
      $('#province').focus();
      return;
    }

    const user = {
      age,
      province,
      citizen:  form.querySelector('input[name="citizen"]:checked').value,
      employed: form.querySelector('input[name="employed"]:checked').value,
      studying: form.querySelector('input[name="studying"]:checked').value,
      matric:   form.querySelector('input[name="matric"]:checked').value
    };

    const evaluated = evaluate(user);
    const matched   = evaluated.filter(x => x.eligible);
    const unmatched = evaluated.filter(x => !x.eligible);

    recordAnonymousCheck(ageBand(age), province, matched.length > 0);

    title.textContent = matched.length
      ? `${matched.length} programme${matched.length === 1 ? '' : 's'} match you.`
      : 'No exact matches yet.';

    sub.textContent = matched.length
      ? 'Open the details on each card to see what to bring, then apply at the official source.'
      : 'That is not a dead end — the programmes below are close, and new listings are verified regularly.';

    matchedList.innerHTML = matched.length
      ? matched.map(x => renderCard(x.programme)).join('')
      : `<p class="empty">Nothing matched your answers exactly. Check the list below for near misses.</p>`;

    unmatchedList.innerHTML = unmatched
      .map(x => renderCard(x.programme, { muted:true, reasons:x.reasons }))
      .join('');

    nearWrap.hidden = unmatched.length === 0;

    results.hidden = false;
    results.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  form.addEventListener('reset', () => {
    results.hidden = true;
    $('#age').style.borderColor = '';
  });
}

/* ─────────────────────────────────────────────────────
   Guide — document checklist (saved on device only)
   ───────────────────────────────────────────────────── */

function initChecklist(){
  const mount = $('#documentList');
  if (!mount) return;

  const KEY = 'vuka_docs';
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (_) {}

  mount.innerHTML = DOCUMENTS.map(d => `
    <li>
      <label class="check-item">
        <input type="checkbox" data-doc="${d.id}" ${saved[d.id] ? 'checked' : ''}>
        <span class="box" aria-hidden="true"></span>
        <span class="check-body">
          <h3>${d.name}</h3>
          <p>${d.tip}</p>
        </span>
      </label>
    </li>
  `).join('');

  const label = $('#docProgress');
  const bar   = $('#docBar');

  function sync(){
    const boxes = $$('input[data-doc]', mount);
    const done  = boxes.filter(b => b.checked);
    const next  = {};
    boxes.forEach(b => { if (b.checked) next[b.dataset.doc] = 1; });

    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch (_) {}

    if (label) label.textContent = `${done.length} of ${boxes.length} ready`;
    if (bar)   bar.style.width = `${(done.length / boxes.length) * 100}%`;
  }

  mount.addEventListener('change', sync);
  sync();

  const clear = $('#clearDocs');
  if (clear){
    clear.addEventListener('click', () => {
      $$('input[data-doc]', mount).forEach(b => { b.checked = false; });
      sync();
    });
  }
}

/* ─────────────────────────────────────────────────────
   Chrome: header, mobile nav, year
   ───────────────────────────────────────────────────── */

function initChrome(){
  const header = $('#siteHeader');
  if (header){
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive:true });
  }

  const toggle = $('#navToggle');
  const nav    = $('#nav');
  if (toggle && nav){
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', e => {
      if (e.target.tagName === 'A'){
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
}

/* ─────────────────────────────────────────────────────
   Boot
   ───────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', () => {
  initChrome();
  initFeatured();
  initOpportunities();
  initEligibility();
  initChecklist();
});

/* ============ app.js — Sable ============ */

document.addEventListener('DOMContentLoaded', () => {

  /* ── Header scroll state ───────────────────────────── */
  const header = document.getElementById('siteHeader');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ── Mobile nav ────────────────────────────────────── */
  const toggle = document.getElementById('navToggle');
  const nav    = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', e => {
      if (e.target.tagName === 'A') {
        nav.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ── Contact form (static demo) ────────────────────── */
  const form = document.getElementById('contactForm');
  const success = document.getElementById('formSuccess');
  if (form && success) {
    form.addEventListener('submit', e => {
      e.preventDefault();

      // Basic validation
      const required = form.querySelectorAll('[required]');
      let valid = true;
      required.forEach(field => {
        if (!field.value.trim()) {
          field.style.borderBottomColor = 'var(--gold)';
          valid = false;
        } else {
          field.style.borderBottomColor = '';
        }
      });
      if (!valid) {
        const first = form.querySelector('[required]:invalid, [required]');
        if (first) first.focus();
        return;
      }

      // Show success, hide the form fields
      form.querySelectorAll('.form-row, .form-field, .form-actions').forEach(el => {
        el.style.display = 'none';
      });
      success.hidden = false;
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // NOTE: Replace this with your real endpoint (Formspree, Netlify Forms,
      // your own API, etc.) when you are ready to receive messages.
      // Example:
      // fetch('https://formspree.io/f/YOUR_ID', {
      //   method: 'POST',
      //   headers: { 'Accept': 'application/json' },
      //   body: new FormData(form)
      // });
    });
  }

  /* ── Year in footer ────────────────────────────────── */
  document.querySelectorAll('#year').forEach(el => {
    el.textContent = new Date().getFullYear();
  });

  /* ── Smooth anchor offset for fixed header ─────────── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

});