/* ====== 작은 유틸 ====== */
const $ = (s)=>document.querySelector(s);
const pad = (n)=>String(n).padStart(2,'0');

/* ====== 좌측 타이머 (선택적) ====== */
/* (기존 타이머 초기화 코드 유지 - 생략 가능) */
const timerEl = document.getElementById('timer');
if (timerEl) {
  let running = false, startedAt = 0, acc = 0, raf = null;
  const btnStart = document.getElementById('btnStart');
  const btnReset = document.getElementById('btnReset');

  function fmtTime(ms){
    const s = Math.floor(ms/1000);
    const hh = String(Math.floor(s/3600)).padStart(2,'0');
    const mm = String(Math.floor((s%3600)/60)).padStart(2,'0');
    const ss = String(s%60).padStart(2,'0');
    return `${hh}:${mm}:${ss}`;
  }
  function tick(){
    timerEl.textContent = fmtTime(acc + (running ? Date.now()-startedAt : 0));
    if (running) raf = requestAnimationFrame(tick);
  }

  if (btnStart) {
    btnStart.addEventListener('click', ()=>{
      if (running){
        acc += Date.now()-startedAt;
        running = false;
        btnStart.textContent = 'start';
        cancelAnimationFrame(raf);
      } else {
        startedAt = Date.now();
        running = true;
        btnStart.textContent = 'pause';
        tick();
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', ()=>{
      running = false;
      acc = 0;
      startedAt = 0;
      timerEl.textContent = '00:00:00';
      if (btnStart) btnStart.textContent = 'start';
      cancelAnimationFrame(raf);
    });
  }

  tick();
} else {
  // 좌측 타이머 DOM이 없으면 아무 동작 안 함 (StopWatch.html 주입/외부 타이머 사용)
  console.info('No inline timer found — skipping built-in timer init.');
}

/* ====== 달력 카드 생성 (기존) ====== */
const EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEAR = new Date().getFullYear();
const today = new Date();
let GRID = null; // will be set on DOMContentLoaded or after restore

function renderDaysHTML(year, monthIdx){
  const first = new Date(year, monthIdx, 1);
  const startIdx = first.getDay();
  const prevLast = new Date(year, monthIdx, 0).getDate();
  const lastDate = new Date(year, monthIdx+1, 0).getDate();
  let html = '';
  // 이전 달 남은 날
  for(let i=startIdx-1;i>=0;i--){
    html += `<div class="muted">${prevLast-i}</div>`;
  }
  // 이번 달
  for(let d=1; d<=lastDate; d++){
    const isToday = (year===today.getFullYear() && monthIdx===today.getMonth() && d===today.getDate());
    html += `<div${isToday?' class="today"':''}>${d}</div>`;
  }
  // 다음 달 빈 칸
  const total = startIdx + lastDate;
  const rest = (Math.ceil(total/7)*7) - total;
  for(let i=1;i<=rest;i++) html += `<div class="muted">${i}</div>`;
  return html;
}

function renderMonthCard(monthIdx){
  const card = document.createElement('div');
  card.className = 'month';
  card.dataset.month = monthIdx;
  card.innerHTML = `
    <div class="month-header">${monthIdx+1}월</div>
    <div class="month-en">${EN[monthIdx]}</div>
    <div class="calendar-mini">
      <div class="wdays">
        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
      </div>
      <div class="days">
        ${renderDaysHTML(YEAR, monthIdx)}
      </div>
    </div>
  `;
  return card;
}

function mountGrid(){
  // ensure GRID is fresh
  if (!GRID) GRID = document.getElementById('calendarGrid');
  if (!GRID) return;
  GRID.innerHTML = '';
  for(let m=0;m<12;m++){
    GRID.appendChild(renderMonthCard(m));
  }
  // after rebuild, update mini progress badges
  try { updateMiniCardProgress(); } catch(e){}
}

// init grid after DOM ready
function initGrid(){
  GRID = document.getElementById('calendarGrid');
  mountGrid();
}

// use event delegation but verify card is inside current calendarGrid in DOM
document.addEventListener('click', (e) => {
  const card = e.target.closest && e.target.closest('.month');
  if (!card) return;
  // ensure card belongs to the currently mounted calendar grid
  const gridEl = card.closest('#calendarGrid');
  if (!gridEl) return;
  const monthIndex = parseInt(card.dataset.month, 10);
  if (Number.isFinite(monthIndex)) {
    if (typeof window.openMonthDetail === 'function') {
      window.openMonthDetail(monthIndex, YEAR);
    } else {
      setTimeout(()=>{ if (typeof window.openMonthDetail === 'function') window.openMonthDetail(monthIndex, YEAR); }, 50);
    }
  }
});

// ensure initial mount runs after DOM load
document.addEventListener('DOMContentLoaded', initGrid);

/* ====== mock tasks (대체 가능) ====== */
const tasks = [
  { date:'2025-01-09', time:'11:00', title:'focus-time 웹 기능 구현하기', mins:210, tag:'work', done:true },
  { date:'2025-01-22', time:'13:30', title:'focus-time 유지보수하기', mins:210, tag:'hobby', done:false },
  { date:'2025-01-24', time:'09:00', title:'스터디 준비', mins:45, tag:'study', done:true },
  { date:'2025-02-07', time:'10:00', title:'디자인 회의', mins:60, tag:'work', done:true },
  // more...
];

function tasksByDateMap() {
  const map = new Map();
  tasks.forEach(t=>{
    if(!map.has(t.date)) map.set(t.date, []);
    map.get(t.date).push(t);
  });
  return map;
}
const tmap = tasksByDateMap();

/* ====== 상세 렌더러: 우측 패널 내부를 교체(대체) ====== */
const monthDetailPanel = document.getElementById('monthDetail');
const monthDetailInner = document.querySelector('.month-detail-inner');

function openMonthDetail(monthIndex, year=YEAR){
  // hide the small grid so right area is fully replaced
  if (GRID) GRID.style.display = 'none';
  if (monthDetailPanel) {
    monthDetailPanel.style.display = 'block';
    monthDetailPanel.setAttribute('data-open','true');
    monthDetailPanel.setAttribute('aria-hidden','false');
  }
  renderMonthDetail(monthIndex, year);
}

function closeMonthDetail(){
  if (monthDetailPanel) {
    monthDetailPanel.setAttribute('data-open','false');
    monthDetailPanel.setAttribute('aria-hidden','true');
    monthDetailPanel.style.display = 'none';
  }
  if (monthDetailInner) monthDetailInner.innerHTML = '';
  // show grid again
  if (GRID) GRID.style.display = '';
}

// bind close safely (guardian if element missing)
const closeBtn = document.getElementById('monthDetailClose');
if (closeBtn) closeBtn.addEventListener('click', ()=> closeMonthDetail());

/* render big month calendar + initial task list */
function renderMonthDetail(monthIndex, year=YEAR){
  const M = new Date(year, monthIndex, 1);
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex+1, 0).getDate();
  const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // build big calendar table
  let table = '<div class="big-calendar"><h2>' + (monthIndex+1) + '월 ' + year + '</h2><table><thead><tr>';
  weekdays.forEach(w=> table += `<th>${w}</th>`);
  table += `</tr></thead><tbody>`;

  let day = 1;
  for(let r=0;r<6;r++){
    table += '<tr>';
    for(let c=0;c<7;c++){
      if(r===0 && c<firstDay){
        table += '<td></td>';
      } else if(day>daysInMonth){
        table += '<td></td>';
      } else {
        const ymd = `${year}-${pad(monthIndex+1)}-${pad(day)}`;
        const dayTasks = tmap.get(ymd) || [];
        const total = dayTasks.length;
        const done = dayTasks.filter(t=>t.done).length;
        const pct = total ? Math.round((done/total)*100) : 0;
        table += `<td data-date="${ymd}" class="big-day">${day}
          <div class="day-progress"><i style="width:${pct}%;"></i></div>
        </td>`;
        day++;
      }
    }
    table += '</tr>';
    if(day>daysInMonth) break;
  }
  table += '</tbody></table></div>';

  // build filters + initial task list (default: show all tasks of first available day or empty)
  const filters = `<div class="task-filters">
    <button class="filter-btn active" data-filter="all">All</button>
    <button class="filter-btn" data-filter="work">Work</button>
    <button class="filter-btn" data-filter="hobby">Hobby</button>
    <button class="filter-btn" data-filter="study">Study</button>
  </div>`;

  const taskListWrapper = `<div class="month-tasks-wrapper">
    <div class="month-tasks" id="monthTasks"></div>
  </div>`;

  monthDetailInner.innerHTML = table + filters + taskListWrapper;

  // pick a default day to show tasks: today if in month else first date
  const defaultDay = (today.getFullYear()===year && today.getMonth()===monthIndex) ? `${year}-${pad(monthIndex+1)}-${pad(today.getDate())}` : `${year}-${pad(monthIndex+1)}-01`;
  // mark selected cell
  setTimeout(()=> {
    const defaultCell = monthDetailInner.querySelector(`td[data-date="${defaultDay}"]`);
    if(defaultCell) defaultCell.classList.add('selected');
    renderTasksForDate(defaultDay, 'all');
  }, 50);

  // bind day cell clicks
  monthDetailInner.querySelectorAll('.big-day').forEach(td=>{
    td.addEventListener('click', (e)=>{
      monthDetailInner.querySelectorAll('.big-day').forEach(x=>x.classList.remove('selected'));
      td.classList.add('selected');
      const date = td.getAttribute('data-date');
      renderTasksForDate(date, getActiveFilter());
    });
  });

  // bind filter buttons
  monthDetailInner.querySelectorAll('.filter-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      monthDetailInner.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      // re-render tasks for currently selected date
      const sel = monthDetailInner.querySelector('.big-day.selected');
      const date = sel ? sel.getAttribute('data-date') : null;
      if (date) renderTasksForDate(date, filter);
    });
  });
}

/* helper to get active filter */
function getActiveFilter(){
  const b = monthDetailInner.querySelector('.filter-btn.active');
  return b ? b.dataset.filter : 'all';
}

/* render tasks in bottom area for a date and filter */
function renderTasksForDate(ymd, filter='all'){
  const wrapper = monthDetailInner.querySelector('#monthTasks');
  if(!wrapper) return;
  wrapper.innerHTML = '';
  const dayTasks = tmap.get(ymd) || [];
  const filtered = dayTasks.filter(t=> filter==='all' ? true : (t.tag===filter));
  if(filtered.length===0){
    wrapper.innerHTML = `<div class="task"><div style="padding:14px;color:#fff">No tasks for ${ymd}</div></div>`;
    return;
  }
  filtered.forEach(t=>{
    const pct = t.done ? 100 : 30; // simple fill pct
    const div = document.createElement('div');
    div.className = 'task';
    div.innerHTML = `<div class="left"><div class="time">${t.time}</div><div class="mins">${t.mins}m</div></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="tag ${t.tag}">${t.tag}</div>`;
    wrapper.appendChild(div);
  });
}

/* close button binding */
document.getElementById('monthDetailClose').addEventListener('click', ()=> closeMonthDetail());

/* clicking outside detail should close it (optional) */
document.addEventListener('click', (e)=>{
  const panel = document.getElementById('monthDetail');
  if(panel && panel.getAttribute('data-open')==='true') {
    const inside = e.target.closest && e.target.closest('.month-detail-inner');
    if(!inside && !e.target.closest('.month')) {
      // closeMonthDetail(); // comment/uncomment depending desired behavior
    }
  }
});

/* optional: update mini-card month progress badges (simple) */
function updateMiniCardProgress(){
  const cards = document.querySelectorAll('.calendar-grid .month');
  cards.forEach((card, idx)=>{
    const monthIdx = parseInt(card.dataset.month,10);
    let total=0, done=0;
    for(const [d, arr] of tmap.entries()){
      const dt = new Date(d);
      if(dt.getFullYear()===YEAR && dt.getMonth()===monthIdx){
        total += arr.length;
        done += arr.filter(x=>x.done).length;
      }
    }
    const pct = total ? Math.round((done/total)*100) : 0;
    let el = card.querySelector('.mini-month-progress');
    if(!el){
      el = document.createElement('div');
      el.className = 'mini-month-progress';
      el.style.position='absolute';
      el.style.right='18px';
      el.style.top='56px';
      el.style.width='36px';
      el.style.height='6px';
      el.style.background='rgba(255,255,255,0.08)';
      el.style.borderRadius='6px';
      el.innerHTML = `<i style="display:block;height:100%;width:${pct}%;background:linear-gradient(90deg,#2b5fff,#66b0ff);border-radius:6px"></i>`;
      card.appendChild(el);
    } else {
      el.querySelector('i').style.width = pct + '%';
    }
  });
}
document.addEventListener('DOMContentLoaded', ()=> setTimeout(updateMiniCardProgress,200));

/* ===== ensure monthDetail replaced-right behavior (REPLACE right.innerHTML) ===== */
(function(){
  const RIGHT = document.querySelector('.right');
  if (!RIGHT) return;
  let originalRightHTML = null;
  let currentRenderedMonth = null;

  function buildDetailShell(){
    return `
      <div class="month-detail-root">
        <button id="detailClose" class="month-detail-close" aria-label="닫기">×</button>
        <div class="detail-top">
          <div class="detail-calendar"></div>
        </div>
        <div class="detail-bottom">
          <div class="task-controls">
            <div class="task-filters">
              <button class="filter-btn active" data-filter="all">All</button>
              <button class="filter-btn" data-filter="work">Work</button>
              <button class="filter-btn" data-filter="hobby">Hobby</button>
              <button class="filter-btn" data-filter="study">Study</button>
            </div>
          </div>
          <div class="detail-tasks" id="detailTasks"></div>
        </div>
      </div>
    `;
  }

  // render month into .detail-calendar and wire interactions
  function renderDetailMonthInto(monthIndex, year=YEAR){
    const container = RIGHT.querySelector('.detail-calendar');
    const tasksContainer = RIGHT.querySelector('#detailTasks');
    if (!container || !tasksContainer) return;

    // reuse logic from renderMonthDetail but target local container
    const weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex+1, 0).getDate();

    let html = `<div class="big-calendar"><h2>${monthIndex+1}월 ${year}</h2><table><thead><tr>`;
    weekdays.forEach(w=> html += `<th>${w}</th>`);
    html += `</tr></thead><tbody>`;

    let day = 1;
    for(let r=0;r<6;r++){
      html += '<tr>';
      for(let c=0;c<7;c++){
        if(r===0 && c<firstDay){ html += '<td></td>'; }
        else if(day>daysInMonth){ html += '<td></td>'; }
        else {
          const ymd = `${year}-${pad(monthIndex+1)}-${pad(day)}`;
          const dayTasks = tmap.get(ymd) || [];
          const total = dayTasks.length;
          const done = dayTasks.filter(t=>t.done).length;
          const pct = total ? Math.round((done/total)*100) : 0;
          html += `<td class="big-day" data-date="${ymd}">${day}
                    <div class="day-progress"><i style="width:${pct}%;"></i></div>
                  </td>`;
          day++;
        }
      }
      html += '</tr>';
      if(day>daysInMonth) break;
    }
    html += `</tbody></table></div>`;
    container.innerHTML = html;

    // default selection: today if in month, else first day
    const defaultDay = (today.getFullYear()===year && today.getMonth()===monthIndex)
                       ? `${year}-${pad(monthIndex+1)}-${pad(today.getDate())}`
                       : `${year}-${pad(monthIndex+1)}-01`;

    setTimeout(()=> {
      const cell = container.querySelector(`td[data-date="${defaultDay}"]`);
      if (cell) cell.classList.add('selected');
      renderTasksForDateInto(defaultDay, 'all', tasksContainer);
    }, 20);

    // bind day clicks
    container.querySelectorAll('.big-day').forEach(td=>{
      td.addEventListener('click', ()=>{
        container.querySelectorAll('.big-day').forEach(x=>x.classList.remove('selected'));
        td.classList.add('selected');
        const date = td.getAttribute('data-date');
        const active = RIGHT.querySelector('.filter-btn.active').dataset.filter;
        renderTasksForDateInto(date, active, tasksContainer);
      });
    });

    // bind filters
    RIGHT.querySelectorAll('.filter-btn').forEach(b=>{
      b.addEventListener('click', ()=>{
        RIGHT.querySelectorAll('.filter-btn').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        const sel = container.querySelector('.big-day.selected');
        if (sel) renderTasksForDateInto(sel.getAttribute('data-date'), b.dataset.filter, tasksContainer);
      });
    });
  }

  function renderTasksForDateInto(ymd, filter, container){
    container.innerHTML = '';
    const dayTasks = tmap.get(ymd) || [];
    const filtered = dayTasks.filter(t=> filter==='all' ? true : (t.tag===filter));
    if (filtered.length===0){
      container.innerHTML = `<div class="task no-tasks">No tasks for ${ymd}</div>`;
      return;
    }
    filtered.forEach(t=>{
      const pct = t.done ? 100 : 30;
      const el = document.createElement('div');
      el.className = 'task';
      el.innerHTML = `<div class="left"><div class="time">${t.time}</div><div class="mins">${t.mins}m</div></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div class="tag ${t.tag}">${t.tag}</div>`;
      container.appendChild(el);
    });
  }

  // OPEN: save original and replace
  window.openMonthDetail = function(monthIndex, year=YEAR){
    currentRenderedMonth = monthIndex;
    if (originalRightHTML === null) originalRightHTML = RIGHT.innerHTML;
    RIGHT.classList.add('replaced-right');
    RIGHT.innerHTML = buildDetailShell();
    renderDetailMonthInto(monthIndex, year);
  };

  // CLOSE: restore original right content and re-init grid interactions
  window.closeMonthDetail = function(){
    if (originalRightHTML !== null){
      RIGHT.innerHTML = originalRightHTML;
      RIGHT.classList.remove('replaced-right');
      // re-bind GRID and rebuild interactive grid after a brief delay to allow DOM to settle
      setTimeout(()=>{
        GRID = document.getElementById('calendarGrid');
        try { mountGrid(); } catch(e){}
        try { updateMiniCardProgress(); } catch(e){}
      }, 50);
    }
  };

  // close via delegated click (in case)
  document.addEventListener('click', (e)=>{
    if (e.target && e.target.id === 'detailClose') closeMonthDetail();
    if (e.target && e.target.classList && e.target.classList.contains('month-detail-close')) closeMonthDetail();
  });
})();
