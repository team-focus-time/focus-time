/* ====== 작은 유틸 ====== */
const $ = (s) => document.querySelector(s);
const pad = (n) => String(n).padStart(2, '0');

/* ====== 좌측 타이머 (선택적) ====== */
/* (기존 타이머 초기화 코드 유지 - 생략 가능) */
const timerEl = document.getElementById('timer');

if (timerEl) {
  let running = false,
    startedAt = 0,
    acc = 0,
    raf = null;
  const btnStart = document.getElementById('btnStart');
  const btnReset = document.getElementById('btnReset');

  function fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  function tick() {
    timerEl.textContent = fmtTime(acc + (running ? Date.now() - startedAt : 0));
    if (running) raf = requestAnimationFrame(tick);
  }

  if (btnStart) {
    btnStart.addEventListener('click', () => {
      if (running) {
        acc += Date.now() - startedAt;
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
    btnReset.addEventListener('click', () => {
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
const EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const YEAR = new Date().getFullYear();
const today = new Date();
let GRID = null; // will be set on DOMContentLoaded or after restore

function renderDaysHTML(year, monthIdx) {
  const first = new Date(year, monthIdx, 1);
  const startIdx = first.getDay();
  const prevLast = new Date(year, monthIdx, 0).getDate();
  const lastDate = new Date(year, monthIdx + 1, 0).getDate();
  let html = '';
  // 이전 달 남은 날
  for (let i = startIdx - 1; i >= 0; i--) {
    html += `<div class="muted">${prevLast - i}</div>`;
  }
  // 이번 달
  for (let d = 1; d <= lastDate; d++) {
    const isToday =
      year === today.getFullYear() &&
      monthIdx === today.getMonth() &&
      d === today.getDate();
    html += `<div${isToday ? ' class="today"' : ''}>${d}</div>`;
  }
  // 다음 달 빈 칸
  const total = startIdx + lastDate;
  const rest = Math.ceil(total / 7) * 7 - total;
  for (let i = 1; i <= rest; i++) html += `<div class="muted">${i}</div>`;
  return html;
}

function renderMonthCard(monthIdx) {
  const card = document.createElement('div');
  card.className = 'month';
  card.dataset.month = monthIdx;
  card.innerHTML = `
    <div class="month-header">${monthIdx + 1}월</div>
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

function mountGrid() {
  // ensure GRID is fresh
  if (!GRID) GRID = document.getElementById('calendarGrid');
  if (!GRID) return;
  GRID.innerHTML = '';
  for (let m = 0; m < 12; m++) {
    GRID.appendChild(renderMonthCard(m));
  }
  // after rebuild, update mini progress badges
  try {
    updateMiniCardProgress();
  } catch (e) {}
}

// init grid after DOM ready
function initGrid() {
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
      setTimeout(() => {
        if (typeof window.openMonthDetail === 'function')
          window.openMonthDetail(monthIndex, YEAR);
      }, 50);
    }
  }
});

// ensure initial mount runs after DOM load
document.addEventListener('DOMContentLoaded', initGrid);

/* ====== mock tasks (대체 가능) ====== */

// tmap을 동적 재생성하는 함수로 바꾸기
function buildTmapFrom(tasksArr) {
  const map = new Map();
  (tasksArr || []).forEach((t) => {
    if (!t || !t.date) return;
    if (!map.has(t.date)) map.set(t.date, []);
    map.get(t.date).push(t);
  });
  return map;
}

// 초기 로드: localStorage의 ft_tasks 사용
function _loadFt() {
  try {
    return JSON.parse(localStorage.getItem('ft_tasks') || '[]');
  } catch (e) {
    return [];
  }
}
let tmap = buildTmapFrom(_loadFt());

/* ====== 상세 렌더러: 우측 패널 내부를 교체(대체) ====== */
const monthDetailPanel = document.getElementById('monthDetail');
const monthDetailInner = document.querySelector('.month-detail-inner');

function openMonthDetail(monthIndex, year = YEAR) {
  // hide the small grid so right area is fully replaced
  if (GRID) GRID.style.display = 'none';
  if (monthDetailPanel) {
    monthDetailPanel.style.display = 'block';
    monthDetailPanel.setAttribute('data-open', 'true');
    monthDetailPanel.setAttribute('aria-hidden', 'false');
  }
  renderMonthDetail(monthIndex, year);
}

function closeMonthDetail() {
  if (monthDetailPanel) {
    monthDetailPanel.setAttribute('data-open', 'false');
    monthDetailPanel.setAttribute('aria-hidden', 'true');
    monthDetailPanel.style.display = 'none';
  }
  if (monthDetailInner) monthDetailInner.innerHTML = '';
  // show grid again
  if (GRID) GRID.style.display = '';
}

// bind close safely (guardian if element missing)
const closeBtn = document.getElementById('monthDetailClose');
if (closeBtn) closeBtn.addEventListener('click', () => closeMonthDetail());

/* render big month calendar + initial task list */
function renderMonthDetail(monthIndex, year = YEAR) {
  const M = new Date(year, monthIndex, 1);
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // build big calendar table
  let table =
    '<div class="big-calendar"><h2>' +
    (monthIndex + 1) +
    '월 ' +
    year +
    '</h2><table><thead><tr>';
  weekdays.forEach((w) => (table += `<th>${w}</th>`));
  table += `</tr></thead><tbody>`;

  let day = 1;
  for (let r = 0; r < 6; r++) {
    table += '<tr>';
    for (let c = 0; c < 7; c++) {
      if (r === 0 && c < firstDay) {
        table += '<td></td>';
      } else if (day > daysInMonth) {
        table += '<td></td>';
      } else {
        const ymd = `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
        const dayTasks = tmap.get(ymd) || [];
        const total = dayTasks.length;
        const done = dayTasks.filter((t) => t.done).length;
        const pct = total ? Math.round((done / total) * 100) : 0;
        table += `<td data-date="${ymd}" class="big-day">${day}
          <div class="day-progress"><i style="width:${pct}%;"></i></div>
        </td>`;
        day++;
      }
    }
    table += '</tr>';
    if (day > daysInMonth) break;
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
  const defaultDay =
    today.getFullYear() === year && today.getMonth() === monthIndex
      ? `${year}-${pad(monthIndex + 1)}-${pad(today.getDate())}`
      : `${year}-${pad(monthIndex + 1)}-01`;
  // mark selected cell
  setTimeout(() => {
    const defaultCell = monthDetailInner.querySelector(
      `td[data-date="${defaultDay}"]`
    );
    if (defaultCell) defaultCell.classList.add('selected');
    renderTasksForDate(defaultDay, 'all');
  }, 50);

  // bind day cell clicks
  monthDetailInner.querySelectorAll('.big-day').forEach((td) => {
    td.addEventListener('click', (e) => {
      monthDetailInner
        .querySelectorAll('.big-day')
        .forEach((x) => x.classList.remove('selected'));
      td.classList.add('selected');
      const date = td.getAttribute('data-date');
      renderTasksForDate(date, getActiveFilter());
    });
  });

  // bind filter buttons
  monthDetailInner.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      monthDetailInner
        .querySelectorAll('.filter-btn')
        .forEach((b) => b.classList.remove('active'));
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
function getActiveFilter() {
  const b = monthDetailInner.querySelector('.filter-btn.active');
  return b ? b.dataset.filter : 'all';
}

/* render tasks in bottom area for a date and filter */
function renderTasksForDate(ymd, filter = 'all') {
  const wrapper = monthDetailInner.querySelector('#monthTasks');
  if (!wrapper) return;
  wrapper.innerHTML = '';
  const dayTasks = tmap.get(ymd) || [];
  const filtered = dayTasks.filter((t) =>
    filter === 'all' ? true : t.tag === filter
  );
  if (filtered.length === 0) {
    wrapper.innerHTML = `<div class="task"><div style="padding:14px;color:#fff">No tasks for ${ymd}</div></div>`;
    return;
  }
  filtered.forEach((t) => {
    const pct = t.done ? 100 : 30; // simple fill pct
    const div = document.createElement('div');
    div.className = 'task';
    div.innerHTML = `<div class="left"><div class="time">${
      t.time
    }</div><div class="title ${t.done ? 'completed' : ''}">${
      t.title
    }</div><div class="mins">${t.mins}m</div></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="tag ${t.tag}">${t.tag}</div>`;
    wrapper.appendChild(div);
  });
}

// renderAllTasks에서 제목과 완료 여부 표시
function renderAllTasks(filter = 'all') {
  const wrapper = monthDetailInner.querySelector('#monthTasks');
  if (!wrapper) return;
  wrapper.innerHTML = '';
  const allTasks = Array.from(tmap.values()).flat();
  const filtered = allTasks.filter((t) =>
    filter === 'all' ? true : t.tag === filter
  );
  if (filtered.length === 0) {
    wrapper.innerHTML = `<div class="task no-tasks">No tasks for the month</div>`;
    return;
  }
  filtered.forEach((t) => {
    const pct = t.done ? 100 : 30;
    const el = document.createElement('div');
    el.className = 'task';
    el.innerHTML = `<div class="left"><div class="time">${
      t.time
    }</div><div class="title ${t.done ? 'completed' : ''}">${
      t.title
    }</div><div class="mins">${t.mins}m</div></div>
      <div class="bar"><i style="width:${pct}%"></i></div>
      <div class="tag ${t.tag}">${t.tag}</div>`;
    wrapper.appendChild(el);
  });
}

// renderTasksForDate에서도 제목과 완료 여부 표시
function renderTasksForDate(ymd, filter = 'all') {
  const wrapper = document.getElementById('detailTasks');
  wrapper.innerHTML = '';
  const dayTasks = tmap.get(ymd) || [];
  const filtered = dayTasks.filter((t) =>
    filter === 'all' ? true : t.tag === filter
  );
  if (filtered.length === 0) {
    wrapper.innerHTML = `<div class="task no-tasks">No tasks for ${ymd}</div>`;
    return;
  }
  filtered.forEach((t) => {
    const row = document.createElement('div');
    row.className = 'task-row';
    row.innerHTML = `
      <div class="time">${t.time || ''}</div>
      <div class="title ${t.done ? 'completed' : ''}" title="${
      t.title || ''
    }">${t.title || 'Untitled'}</div>
      <div class="mins">${t.mins || 0}m</div>
      <div class="tag">${t.tag || 'work'}</div>
    `;
    wrapper.appendChild(row);
  });
}

/* close button binding */
document
  .getElementById('monthDetailClose')
  .addEventListener('click', () => closeMonthDetail());

/* clicking outside detail should close it (optional) */
document.addEventListener('click', (e) => {
  const panel = document.getElementById('monthDetail');
  if (panel && panel.getAttribute('data-open') === 'true') {
    const inside = e.target.closest && e.target.closest('.month-detail-inner');
    if (!inside && !e.target.closest('.month')) {
      // closeMonthDetail(); // comment/uncomment depending desired behavior
    }
  }
});

/* optional: update mini-card month progress badges (simple) */
function updateMiniCardProgress() {
  const cards = document.querySelectorAll('.calendar-grid .month');
  cards.forEach((card, idx) => {
    const monthIdx = parseInt(card.dataset.month, 10);
    let total = 0,
      done = 0;
    for (const [d, arr] of tmap.entries()) {
      const dt = new Date(d);
      if (dt.getFullYear() === YEAR && dt.getMonth() === monthIdx) {
        total += arr.length;
        done += arr.filter((x) => x.done).length;
      }
    }
    const pct = total ? Math.round((done / total) * 100) : 0;
    let el = card.querySelector('.mini-month-progress');
    if (!el) {
      el = document.createElement('div');
      el.className = 'mini-month-progress';
      el.style.position = 'absolute';
      el.style.right = '18px';
      el.style.top = '56px';
      el.style.width = '36px';
      el.style.height = '6px';
      el.style.background = 'rgba(255,255,255,0.08)';
      el.style.borderRadius = '6px';
      el.innerHTML = `<i style="display:block;height:100%;width:${pct}%;background:linear-gradient(90deg,#2b5fff,#66b0ff);border-radius:6px"></i>`;
      card.appendChild(el);
    } else {
      el.querySelector('i').style.width = pct + '%';
    }
  });
}
document.addEventListener('DOMContentLoaded', () =>
  setTimeout(updateMiniCardProgress, 200)
);

/* ===== ensure monthDetail replaced-right behavior (REPLACE right.innerHTML) ===== */
(function () {
  const RIGHT = document.querySelector('.right');
  if (!RIGHT) return;
  let originalRightHTML = null;
  let currentRenderedMonth = null;

  function buildDetailShell() {
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
  function renderDetailMonthInto(monthIndex, year = YEAR) {
    const container = RIGHT.querySelector('.detail-calendar');
    const tasksContainer = RIGHT.querySelector('#detailTasks');
    if (!container || !tasksContainer) return;

    // reuse logic from renderMonthDetail but target local container
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

    let html = `<div class="big-calendar"><h2>${
      monthIndex + 1
    }월 ${year}</h2><table><thead><tr>`;
    weekdays.forEach((w) => (html += `<th>${w}</th>`));
    html += `</tr></thead><tbody>`;

    let day = 1;
    for (let r = 0; r < 6; r++) {
      html += '<tr>';
      for (let c = 0; c < 7; c++) {
        if (r === 0 && c < firstDay) {
          html += '<td></td>';
        } else if (day > daysInMonth) {
          html += '<td></td>';
        } else {
          const ymd = `${year}-${pad(monthIndex + 1)}-${pad(day)}`;
          const dayTasks = tmap.get(ymd) || [];
          const total = dayTasks.length;
          const done = dayTasks.filter((t) => t.done).length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          html += `<td class="big-day" data-date="${ymd}">${day}
                    <div class="day-progress"><i style="width:${pct}%;"></i></div>
                  </td>`;
          day++;
        }
      }
      html += '</tr>';
      if (day > daysInMonth) break;
    }
    html += `</tbody></table></div>`;
    container.innerHTML = html;

    // default selection: today if in month, else first day
    const defaultDay =
      today.getFullYear() === year && today.getMonth() === monthIndex
        ? `${year}-${pad(monthIndex + 1)}-${pad(today.getDate())}`
        : `${year}-${pad(monthIndex + 1)}-01`;

    setTimeout(() => {
      const cell = container.querySelector(`td[data-date="${defaultDay}"]`);
      if (cell) cell.classList.add('selected');
      renderTasksForDateInto(defaultDay, 'all', tasksContainer);
    }, 20);

    // bind day clicks
    container.querySelectorAll('.big-day').forEach((td) => {
      td.addEventListener('click', () => {
        container
          .querySelectorAll('.big-day')
          .forEach((x) => x.classList.remove('selected'));
        td.classList.add('selected');
        const date = td.getAttribute('data-date');
        const active = RIGHT.querySelector('.filter-btn.active').dataset.filter;
        renderTasksForDateInto(date, active, tasksContainer);
      });
    });

    // bind filters
    RIGHT.querySelectorAll('.filter-btn').forEach((b) => {
      b.addEventListener('click', () => {
        RIGHT.querySelectorAll('.filter-btn').forEach((x) =>
          x.classList.remove('active')
        );
        b.classList.add('active');
        const sel = container.querySelector('.big-day.selected');
        if (sel)
          renderTasksForDateInto(
            sel.getAttribute('data-date'),
            b.dataset.filter,
            tasksContainer
          );
      });
    });
  }

  function renderTasksForDateInto(ymd, filter, container) {
    container.innerHTML = '';
    const dayTasks = tmap.get(ymd) || [];
    const filtered = dayTasks.filter((t) =>
      filter === 'all' ? true : t.tag === filter
    );
    if (filtered.length === 0) {
      container.innerHTML = `<div class="task no-tasks">No tasks for ${ymd}</div>`;
      return;
    }
    filtered.forEach((t) => {
      const pct = t.done ? 100 : 30;
      const el = document.createElement('div');
      el.className = 'task';
      el.innerHTML = `<div class="left"><div class="time">${
        t.time
      }</div><div class="title ${t.done ? 'completed' : ''}">${
        t.title
      }</div><div class="mins">${t.mins}m</div></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div class="tag ${t.tag}">${t.tag}</div>`;
      container.appendChild(el);
    });
  }

  // OPEN: save original and replace
  window.openMonthDetail = function (monthIndex, year = YEAR) {
    currentRenderedMonth = monthIndex;
    if (originalRightHTML === null) originalRightHTML = RIGHT.innerHTML;
    RIGHT.classList.add('replaced-right');
    RIGHT.innerHTML = buildDetailShell();
    renderDetailMonthInto(monthIndex, year);
  };

  // CLOSE: restore original right content and re-init grid interactions
  window.closeMonthDetail = function () {
    if (originalRightHTML !== null) {
      RIGHT.innerHTML = originalRightHTML;
      RIGHT.classList.remove('replaced-right');
      // re-bind GRID and rebuild interactive grid after a brief delay to allow DOM to settle
      setTimeout(() => {
        GRID = document.getElementById('calendarGrid');
        try {
          mountGrid();
        } catch (e) {}
        try {
          updateMiniCardProgress();
        } catch (e) {}
      }, 50);
    }
  };

  // close via delegated click (in case)
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'detailClose') closeMonthDetail();
    if (
      e.target &&
      e.target.classList &&
      e.target.classList.contains('month-detail-close')
    )
      closeMonthDetail();
  });
})();

/* ===== Chart panel: full replacement + data-driven charts (using ft_tasks / ft_sessions from localStorage) ===== */
(function () {
  const RIGHT = document.querySelector('.right');
  if (!RIGHT) return;
  let originalRightHTML = null;

  // colors per tag
  const TAGS = {
    work: { color: '#cfe3ff', stroke: '#2b5fff', label: 'Work' },
    hobby: { color: '#ffe6c7', stroke: '#ffb66b', label: 'Hobby' },
    study: { color: '#e9ffea', stroke: '#28d37b', label: 'Study' },
  };

  // read app data from localStorage (fall back to example)
  function loadData() {
    try {
      const tasks = JSON.parse(localStorage.getItem('ft_tasks') || '[]');
      const sessions = JSON.parse(localStorage.getItem('ft_sessions') || '[]');
      return { tasks, sessions };
    } catch (e) {
      return { tasks: [], sessions: [] };
    }
  }

  // helpers: parse YYYY-MM-DD
  function toYmd(d) {
    return d.toISOString().slice(0, 10);
  }
  function parseYmd(s) {
    const p = s.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  // period range helper
  function periodRange(period, refDate = new Date()) {
    const d = new Date(refDate);
    if (period === 'day') {
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      return { start, end };
    }
    if (period === 'week') {
      const day = d.getDay();
      const start = new Date(d);
      start.setDate(d.getDate() - day);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return { start, end };
    }
    // month
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return { start, end };
  }

  // aggregate functions
  function sumMinutesByTagInRange(tasks, start, end) {
    const map = { work: 0, hobby: 0, study: 0 };
    tasks.forEach((t) => {
      const dt = new Date(t.date || t.start || t.ymd || t.day);
      if (isNaN(dt)) return;
      if (dt >= start && dt < end) {
        const tag = t.tag || 'work';
        map[tag] = (map[tag] || 0) + (t.mins || t.duration || 0);
      }
    });
    return map;
  }

  function dailySums(tasks, start, end) {
    const out = {};
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      out[toYmd(new Date(d))] = 0;
    }
    tasks.forEach((t) => {
      const dt = new Date(t.date || t.start || t.ymd || t.day);
      if (isNaN(dt)) return;
      if (dt >= start && dt < end) {
        const k = toYmd(dt);
        out[k] = (out[k] || 0) + (t.mins || t.duration || 0);
      }
    });
    return out;
  }

  // UI build
  function buildPanelShell() {
    return `
      <div class="chart-panel" role="region" aria-label="history chart panel">
        <button class="panel-close" id="panelClose" title="닫기">×</button>
        <button class="panel-refresh" id="panelRefresh" title="새로고침">⟳</button>

        <div class="chart-inner">
          <div class="left-col">
            <div class="card-small" id="miniCalendarCard"></div>
            <div class="card-small" id="todayTasksCard"></div>
            <div class="card-small" id="goalCard"></div>
          </div>

          <div class="right-col">
            <div class="card-small big-chart" id="focusBarsCard"></div>
            <div class="card-small donut-card" id="donutCard"></div>
          </div>
        </div>
      </div>
    `;
  }

  // render functions
  function renderMiniCalendar(container, year, monthIndex, goalMap) {
    // simple month grid with small circles indicating goal completion ratio
    const date = new Date(year, monthIndex, 1);
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const lastDate = new Date(year, monthIndex + 1, 0).getDate();
    let html = `<div style="font-weight:800;color:#122168;margin-bottom:10px">${
      monthIndex + 1
    }월<br><small style="color:#6b6f85;font-weight:600">${year}</small></div>`;
    html += `<div class="month-grid">`;
    html += `<div class="wdays-row"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>`;
    html += `<div class="dates">`;
    for (let i = 0; i < firstDay; i++) html += `<div class="cell empty"></div>`;
    for (let d = 1; d <= lastDate; d++) {
      const ymd = `${year}-${pad(monthIndex + 1)}-${pad(d)}`;
      const pct = Math.min(100, Math.round(goalMap[ymd] || 0));
      html += `<div class="cell" data-date="${ymd}">
        <div class="date-num">${d}</div>
        <svg class="date-ring" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" class="bg" /><circle cx="18" cy="18" r="16" class="fg" stroke-dasharray="${pct} 100" /></svg>
      </div>`;
    }
    html += `</div></div>`;
    container.innerHTML = html;
  }

  function renderTodayTasks(
    container,
    data,
    period = 'day',
    tagFilter = 'all'
  ) {
    const { tasks } = data;
    const pr = periodRange(period);
    // collect tasks in that period (grouped by date)
    const filtered = tasks.filter((t) => {
      const dt = new Date(t.date || t.start || t.ymd || t.day);
      if (isNaN(dt)) return false;
      return (
        dt >= pr.start &&
        dt < pr.end &&
        (tagFilter === 'all' || t.tag === tagFilter)
      );
    });
    let html = `<div style="font-weight:800;color:#122168;margin-bottom:8px">오늘의 작업</div>`;
    html += `<div class="period-controls"><button data-period="day" class="pbtn">Day</button><button data-period="week" class="pbtn">Week</button><button data-period="month" class="pbtn">Month</button></div>`;
    if (filtered.length === 0) html += `<div class="no-tasks">No tasks</div>`;
    else {
      html += `<div class="task-list">`;
      filtered.forEach((t) => {
        html += `<div class="task-row">
          <div class="time">${t.time || ''}</div>
          <div class="title" title="${escapeHtml(t.title || '')}">${escapeHtml(
          t.title || ''
        )}</div>
          <div class="mins">${t.mins || 0}m</div>
          <div class="tag ${t.tag || 'work'}">${t.tag || 'work'}</div>
        </div>`;
      });
      html += `</div>`;
    }
    container.innerHTML = html;
    // wire period buttons and tag filter via event delegation outside
  }

  function renderDonut(container, data, period = 'month') {
    const { tasks } = data;
    const pr = periodRange(period);
    const byTag = sumMinutesByTagInRange(tasks, pr.start, pr.end);
    const total = Object.values(byTag).reduce((a, b) => a + b, 0) || 1;
    // svg donut
    const parts = Object.keys(byTag).map((k) => ({ tag: k, mins: byTag[k] }));
    let html = `<div style="display:flex;align-items:center;gap:18px"><div style="width:240px;height:240px">`;
    html += `<svg viewBox="0 0 42 42" class="donut" width="240" height="240">`;
    let offset = 0;
    parts.forEach((p) => {
      const frac = p.mins / total;
      const arc = Math.round(frac * 100);
      html += `<circle class="donut-seg" r="15.9" cx="21" cy="21" stroke="${
        TAGS[p.tag].stroke
      }" stroke-width="8"
                 stroke-dasharray="${arc} ${
        100 - arc
      }" transform="rotate(-90 21 21)" style="stroke-dashoffset:${-offset}"></circle>`;
      offset += arc;
    });
    html += `</svg></div>`;
    // legend
    html += `<div style="flex:1"><h3 style="margin:0;color:#122168">프로젝트 시간 비율</h3><div style="color:#6b6f85;margin-top:8px">일간, 주간, 월간 선택</div>`;
    parts.forEach((p) => {
      const pct = Math.round((p.mins / total) * 100);
      html += `<div class="legend-row"><span class="legend-swatch" style="background:${
        TAGS[p.tag].stroke
      }"></span><strong>${
        TAGS[p.tag].label
      }</strong> <small style="color:#6b6f85">${
        p.mins
      }m • ${pct}%</small></div>`;
    });
    html += `</div></div>`;
    container.innerHTML = html;
  }

  function renderFocusBars(container, data, period = 'week') {
    const { tasks } = data;
    const pr = periodRange(period);
    // bar per tag
    const byTag = sumMinutesByTagInRange(tasks, pr.start, pr.end);
    const max = Math.max(...Object.values(byTag), 60);
    let html = `<div style="display:flex;align-items:flex-end;gap:18px;height:220px">`;
    Object.keys(byTag).forEach((tag) => {
      const val = byTag[tag];
      const h = Math.round((val / max) * 100);
      html += `<div class="bar-col"><div class="bar" style="height:${h}%"><i style="background:${TAGS[tag].stroke};"></i></div><div class="bar-label">${TAGS[tag].label}</div><div class="bar-val">${val}m</div></div>`;
    });
    html += `</div>`;
    container.innerHTML =
      `<div style="display:flex;justify-content:space-between;align-items:flex-start"><h3 style="margin:0;color:#122168">전체 집중한 시간</h3><div style="color:#122168;font-weight:700">주간, 월간, 연간</div></div>` +
      html;
  }

  // utils
  function escapeHtml(s) {
    return (s + '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // primary open/close
  window.openChartPanel = function () {
    if (!RIGHT) return;
    if (originalRightHTML === null) originalRightHTML = RIGHT.innerHTML;
    RIGHT.classList.add('replaced-right');
    RIGHT.innerHTML = buildPanelShell();

    const data = loadData();

    // goal map: compute percent per day (mins/targetMinsPerDay*100) for current month
    const targetMinsPerDay = parseInt(
      localStorage.getItem('targetMinsPerDay') || '60',
      10
    );
    const year = new Date().getFullYear();
    const monthIndex = new Date().getMonth();
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 1);
    const daily = dailySums(data.tasks, monthStart, monthEnd);
    const goalMap = {};
    Object.keys(daily).forEach(
      (k) => (goalMap[k] = Math.round((daily[k] / targetMinsPerDay) * 100))
    );

    // render sections
    const mini = RIGHT.querySelector('#miniCalendarCard');
    renderMiniCalendar(mini, year, monthIndex, goalMap);
    const todayCard = RIGHT.querySelector('#todayTasksCard');
    renderTodayTasks(todayCard, data, 'day', 'all');
    const goalCard = RIGHT.querySelector('#goalCard');
    goalCard.innerHTML = `<div style="font-weight:800;color:#122168">목표 달성 시간</div><div style="color:#6b6f85;margin-top:8px">목표: ${Math.round(
      targetMinsPerDay / 60
    )}h / day</div>`;

    const focusCard = RIGHT.querySelector('#focusBarsCard');
    renderFocusBars(focusCard, data, 'week');
    const donut = RIGHT.querySelector('#donutCard');
    renderDonut(donut, data, 'month');

    // wire controls: refresh & period change (delegated)
    RIGHT.querySelector('#panelRefresh').addEventListener('click', () => {
      // re-load and re-render quickly
      const d = loadData();
      renderMiniCalendar(
        RIGHT.querySelector('#miniCalendarCard'),
        year,
        monthIndex,
        goalMap
      );
      renderTodayTasks(RIGHT.querySelector('#todayTasksCard'), d, 'day', 'all');
      renderFocusBars(RIGHT.querySelector('#focusBarsCard'), d, 'week');
      renderDonut(RIGHT.querySelector('#donutCard'), d, 'month');
    });

    RIGHT.querySelector('#panelClose').addEventListener('click', () => {
      // restore
      RIGHT.innerHTML = originalRightHTML;
      RIGHT.classList.remove('replaced-right');
      setTimeout(() => {
        if (typeof mountGrid === 'function') mountGrid();
        if (typeof updateMiniCardProgress === 'function')
          updateMiniCardProgress();
      }, 60);
    });

    // event delegation for period buttons inside todayTasksCard
    RIGHT.addEventListener('click', function handler(e) {
      const btn = e.target.closest && e.target.closest('.pbtn');
      if (!btn) return;
      const period = btn.dataset.period;
      renderTodayTasks(
        RIGHT.querySelector('#todayTasksCard'),
        loadData(),
        period,
        'all'
      );
    });
  };

  // wire chart button if present
  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'chartBtn') {
      e.preventDefault();
      openChartPanel();
    }
  });
})();

/* ===== ft_tasks 리스너 유지 + 타이머/스톱워치 구현 추가 ===== */
(function () {
  function _loadFt() {
    try {
      return JSON.parse(localStorage.getItem('ft_tasks') || '[]');
    } catch (e) {
      return [];
    }
  }
  // 기존 ft-tasks-updated 존재하면 그대로 동작하므로 여기선 보완만 함
  window.addEventListener('ft-tasks-updated', (ev) => {
    const tasks = ev && ev.detail ? ev.detail : _loadFt();
    console.log('[History] ft-tasks-updated ->', (tasks || []).length);
    // 기존 업데이트 루틴가 있으면 호출
    try {
      if (typeof updateMonthProgressFromTasks === 'function')
        updateMonthProgressFromTasks(tasks);
    } catch (e) {}
    try {
      if (typeof updateTodayTasksCard === 'function')
        updateTodayTasksCard(tasks, 'day');
    } catch (e) {}
    try {
      if (typeof updateChartPanel === 'function')
        updateChartPanel(tasks, 'month');
    } catch (e) {}
  });

  // storage 이벤트 보완
  window.addEventListener('storage', (e) => {
    if (e.key === 'ft_tasks') {
      try {
        const tasks = JSON.parse(e.newValue || '[]');
        window.dispatchEvent(
          new CustomEvent('ft-tasks-updated', { detail: tasks })
        );
      } catch (err) {
        console.error('[History] storage parse', err);
      }
    }
  });

  /* ===== Timer & Stopwatch (persistent, rAF 기반) ===== */
  function _formatMS(ms) {
    const s = Math.floor(ms / 1000);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (hh > 0)
      return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(
        2,
        '0'
      )}`;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  // Timer (counts down from target minutes)
  (function timerModule() {
    const el =
      document.getElementById('timer') ||
      document.querySelector('.timer-display');
    if (!el) return;
    const startBtn =
      document.getElementById('btnStart') ||
      document.querySelector('[data-action="timer-start"]');
    const stopBtn =
      document.getElementById('btnStop') ||
      document.querySelector('[data-action="timer-stop"]');
    const resetBtn =
      document.getElementById('btnReset') ||
      document.querySelector('[data-action="timer-reset"]');
    const KEY = 'ft_timer_state';
    let state = { running: false, startedAt: 0, acc: 0, targetMins: 60 };
    let raf = null;

    function load() {
      try {
        const s = JSON.parse(localStorage.getItem(KEY));
        if (s) state = Object.assign(state, s);
      } catch (e) {}
    }
    function save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) {}
    }
    function getRemaining() {
      const now = Date.now();
      const elapsed = state.acc + (state.running ? now - state.startedAt : 0);
      const remainMs = Math.max(0, state.targetMins * 60000 - elapsed);
      return remainMs;
    }
    function render() {
      const rem = getRemaining();
      if (el) el.textContent = _formatMS(rem);
    }
    function loop() {
      render();
      if (state.running) raf = requestAnimationFrame(loop);
    }
    function start() {
      if (state.running) return;
      state.running = true;
      state.startedAt = Date.now();
      save();
      if (!raf) loop();
    }
    function stop() {
      if (!state.running) return;
      state.acc += Date.now() - state.startedAt;
      state.running = false;
      state.startedAt = 0;
      save();
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      render();
    }
    function reset() {
      state = {
        running: false,
        startedAt: 0,
        acc: 0,
        targetMins: state.targetMins,
      };
      save();
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      render();
    }

    // wire UI
    load();
    render();
    if (startBtn) startBtn.addEventListener('click', () => start());
    if (stopBtn) stopBtn.addEventListener('click', () => stop());
    if (resetBtn) resetBtn.addEventListener('click', () => reset());
    // resume if running when page loaded
    if (state.running) {
      start();
    }
    // expose
    window.ftTimer = { start, stop, reset, state, save, load };
  })();

  // Stopwatch (counts up)
  (function swModule() {
    const el =
      document.getElementById('stopwatch') ||
      document.querySelector('.stopwatch-display');
    if (!el) return;
    const startBtn =
      document.getElementById('swStart') ||
      document.querySelector('[data-action="sw-start"]');
    const stopBtn =
      document.getElementById('swStop') ||
      document.querySelector('[data-action="sw-stop"]');
    const lapBtn =
      document.getElementById('swLap') ||
      document.querySelector('[data-action="sw-lap"]');
    const resetBtn =
      document.getElementById('swReset') ||
      document.querySelector('[data-action="sw-reset"]');
    const KEY = 'ft_stopwatch_state';
    let state = { running: false, startedAt: 0, acc: 0, laps: [] };
    let raf = null;

    function load() {
      try {
        const s = JSON.parse(localStorage.getItem(KEY));
        if (s) state = Object.assign(state, s);
      } catch (e) {}
    }
    function save() {
      try {
        localStorage.setItem(KEY, JSON.stringify(state));
      } catch (e) {}
    }
    function getElapsed() {
      const now = Date.now();
      return state.acc + (state.running ? now - state.startedAt : 0);
    }
    function render() {
      if (el) el.textContent = _formatMS(getElapsed());
    }
    function loop() {
      render();
      if (state.running) raf = requestAnimationFrame(loop);
    }
    function start() {
      if (state.running) return;
      state.running = true;
      state.startedAt = Date.now();
      save();
      if (!raf) loop();
    }
    function stop() {
      if (!state.running) return;
      state.acc += Date.now() - state.startedAt;
      state.running = false;
      state.startedAt = 0;
      save();
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      render();
    }
    function reset() {
      state = { running: false, startedAt: 0, acc: 0, laps: [] };
      save();
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      render();
    }
    function lap() {
      state.laps = state.laps || [];
      state.laps.push(getElapsed());
      save();
    }

    load();
    render();
    if (startBtn) startBtn.addEventListener('click', () => start());
    if (stopBtn) stopBtn.addEventListener('click', () => stop());
    if (lapBtn) lapBtn.addEventListener('click', () => lap());
    if (resetBtn) resetBtn.addEventListener('click', () => reset());
    if (state.running) start();
    window.ftStopwatch = { start, stop, reset, lap, state, load, save };
  })();
})();

/* ===== 보강: #stopwatchRoot에 나중에 주입된 타이머/스탑워치 자동 초기화 / 폴백 바인딩 ===== */
(function ensureLeftWidgetsInit() {
  function _fmtMS(ms) {
    const s = Math.floor(ms / 1000);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (hh > 0)
      return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(
        2,
        '0'
      )}`;
    return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  }

  function bindTimerFallback() {
    const el =
      document.getElementById('timer') ||
      document.querySelector('.timer-display');
    if (!el) return;
    if (window.ftTimer && typeof window.ftTimer.start === 'function') {
      // already present
      console.log('[app] ftTimer already present');
      return;
    }
    const startBtn =
      document.getElementById('btnStart') ||
      document.querySelector('[data-action="timer-start"]');
    const stopBtn =
      document.getElementById('btnStop') ||
      document.querySelector('[data-action="timer-stop"]');
    const resetBtn =
      document.getElementById('btnReset') ||
      document.querySelector('[data-action="timer-reset"]');
    let state = { running: false, startedAt: 0, acc: 0, targetMins: 60 };
    let raf = null;
    function remaining() {
      return Math.max(
        0,
        state.targetMins * 60000 -
          (state.acc + (state.running ? Date.now() - state.startedAt : 0))
      );
    }
    function render() {
      if (el) el.textContent = _fmtMS(remaining());
    }
    function loop() {
      render();
      if (state.running) raf = requestAnimationFrame(loop);
    }
    function start() {
      if (state.running) return;
      state.running = true;
      state.startedAt = Date.now();
      if (!raf) loop();
    }
    function stop() {
      if (!state.running) return;
      state.acc += Date.now() - state.startedAt;
      state.running = false;
      state.startedAt = 0;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      render();
    }
    function reset() {
      state = {
        running: false,
        startedAt: 0,
        acc: 0,
        targetMins: state.targetMins,
      };
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      render();
    }
    if (startBtn)
      startBtn.addEventListener('click', () => {
        if (state.running) stop();
        else start();
      });
    if (stopBtn) stopBtn.addEventListener('click', () => stop());
    if (resetBtn) resetBtn.addEventListener('click', () => reset());
    // expose
    window.ftTimer = window.ftTimer || { start, stop, reset, state };
    render();
    console.log('[app] fallback timer bound');
  }

  function bindStopwatchFallback() {
    const el =
      document.getElementById('stopwatch') ||
      document.querySelector('.stopwatch-display');
    if (!el) return;
    if (window.ftStopwatch && typeof window.ftStopwatch.start === 'function') {
      console.log('[app] ftStopwatch already present');
      return;
    }
    const startBtn =
      document.getElementById('swStart') ||
      document.querySelector('[data-action="sw-start"]');
    const stopBtn =
      document.getElementById('swStop') ||
      document.querySelector('[data-action="sw-stop"]');
    const lapBtn =
      document.getElementById('swLap') ||
      document.querySelector('[data-action="sw-lap"]');
    const resetBtn =
      document.getElementById('swReset') ||
      document.querySelector('[data-action="sw-reset"]');
    let state = { running: false, startedAt: 0, acc: 0, laps: [] };
    let raf = null;
    function elapsed() {
      return state.acc + (state.running ? Date.now() - state.startedAt : 0);
    }
    function render() {
      if (el) el.textContent = _fmtMS(elapsed());
    }
    function loop() {
      render();
      if (state.running) raf = requestAnimationFrame(loop);
    }
    function start() {
      if (state.running) return;
      state.running = true;
      state.startedAt = Date.now();
      if (!raf) loop();
    }
    function stop() {
      if (!state.running) return;
      state.acc += Date.now() - state.startedAt;
      state.running = false;
      state.startedAt = 0;
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      render();
    }
    function lap() {
      state.laps.push(elapsed());
    }
    function reset() {
      state = { running: false, startedAt: 0, acc: 0, laps: [] };
      if (raf) {
        cancelAnimationFrame(raf);
        raf = null;
      }
      render();
    }
    if (startBtn) startBtn.addEventListener('click', () => start());
    if (stopBtn) stopBtn.addEventListener('click', () => stop());
    if (lapBtn) lapBtn.addEventListener('click', () => lap());
    if (resetBtn) resetBtn.addEventListener('click', () => reset());
    window.ftStopwatch = window.ftStopwatch || {
      start,
      stop,
      lap,
      reset,
      getElapsed: elapsed,
      state,
    };
    render();
    console.log('[app] fallback stopwatch bound');
  }

  function initIfPresent() {
    // prefer module-provided inits
    if (document.getElementById('timer')) {
      if (typeof window.initTimerUI === 'function') {
        try {
          window.initTimerUI();
          console.log('[app] initTimerUI called');
          return;
        } catch (e) {
          console.error('[app] initTimerUI error', e);
        }
      }
      bindTimerFallback();
    }
    if (document.getElementById('stopwatch')) {
      if (typeof window.initStopwatchUI === 'function') {
        try {
          window.initStopwatchUI();
          console.log('[app] initStopwatchUI called');
          return;
        } catch (e) {
          console.error('[app] initStopwatchUI error', e);
        }
      }
      bindStopwatchFallback();
    }
  }

  // observe insertion into #stopwatchRoot (or body fallback)
  const watchRoot = document.getElementById('stopwatchRoot') || document.body;
  try {
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.addedNodes && m.addedNodes.length) {
          setTimeout(initIfPresent, 50);
          break;
        }
      }
    });
    mo.observe(watchRoot, { childList: true, subtree: true });
  } catch (e) {
    /* ignore */
  }

  // initial attempt (delayed to allow async fetch injection)
  document.addEventListener('DOMContentLoaded', () =>
    setTimeout(initIfPresent, 120)
  );
  // also try a later attempt in case scripts load slowly
  setTimeout(initIfPresent, 800);
})();

/* ---------- History dashboard integration (TodoList -> ft_tasks reflected) ---------- */
const GOAL_PER_DAY_MIN = 8 * 60; // 기본 일 목표 (분)
const TAGS = {
  work: { label: 'Work', color: '#2b5fff' },
  hobby: { label: 'Hobby', color: '#ffb66b' },
  study: { label: 'Study', color: '#28d37b' },
};

function loadFtTasks() {
  try {
    return JSON.parse(localStorage.getItem('ft_tasks') || '[]');
  } catch (e) {
    return [];
  }
}
function normalizeTag(t) {
  t = (t || '').toString().trim().toLowerCase();
  return ['work', 'hobby', 'study'].includes(t) ? t : 'work';
}

function rangeOf(type) {
  const now = new Date();
  const s = new Date(now),
    e = new Date(now);
  if (type === 'day') {
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
  } else if (type === 'week') {
    const day = (now.getDay() + 6) % 7;
    s.setDate(now.getDate() - day);
    s.setHours(0, 0, 0, 0);
    e = new Date(s);
    e.setDate(s.getDate() + 6);
    e.setHours(23, 59, 59, 999);
  } else {
    s.setDate(1);
    s.setHours(0, 0, 0, 0);
    e = new Date(s.getFullYear(), s.getMonth() + 1, 0);
    e.setHours(23, 59, 59, 999);
  }
  return [s, e];
}

function aggregate(rangeType) {
  const [s, e] = rangeOf(rangeType);
  const list = (loadFtTasks() || [])
    .map((t) => ({ ...t, tag: normalizeTag(t.tag) }))
    .filter((t) => t.date && new Date(t.date) >= s && new Date(t.date) <= e);
  const totalMin = list.reduce((a, c) => a + (+c.mins || 0), 0);
  const byTag = { work: 0, hobby: 0, study: 0 };
  list.forEach((t) => (byTag[t.tag] = (byTag[t.tag] || 0) + (+t.mins || 0)));
  const days =
    rangeType === 'day' ? 1 : rangeType === 'week' ? 7 : new Date().getDate();
  const goal =
    GOAL_PER_DAY_MIN *
    (rangeType === 'day'
      ? 1
      : rangeType === 'week'
      ? 7
      : new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          0
        ).getDate());
  const pct = goal ? Math.min(100, Math.round((totalMin / goal) * 100)) : 0;
  return { list, totalMin, byTag, goal, pct };
}

/* renderers */
function renderTotalTime(rangeType) {
  const host = document.getElementById('totalTimeChart');
  if (!host) return;
  host.innerHTML = '';
  const { list } = aggregate(rangeType);
  const bucket = new Map();
  list.forEach((t) => {
    const k = t.date.slice(0, 10);
    bucket.set(k, (bucket.get(k) || 0) + (+t.mins || 0));
  });
  const keys = Array.from(bucket.keys()).sort();
  if (keys.length === 0) {
    host.innerHTML = '<div style="padding:10px;color:#889">데이터 없음</div>';
    return;
  }
  const max = Math.max(60, ...Array.from(bucket.values()));
  keys.forEach((k) => {
    const m = bucket.get(k);
    const el = document.createElement('div');
    el.className = 'bar';
    el.innerHTML = `<i style="height:${((m / max) * 100).toFixed(
      1
    )}%"></i><b>${m}m</b>`;
    host.appendChild(el);
  });
}

function renderRatio(rangeType) {
  const host = document.getElementById('ratioChart');
  if (!host) return;
  const { byTag } = aggregate(rangeType);
  const sum = (byTag.work || 0) + (byTag.hobby || 0) + (byTag.study || 0);
  const w = sum ? Math.round((byTag.work / sum) * 100) : 0;
  const h = sum ? Math.round((byTag.hobby / sum) * 100) : 0;
  const s = 100 - w - h;
  const donut = host.querySelector('.donut');
  if (donut)
    donut.style.background = `conic-gradient(${TAGS.work.color} 0 ${w}%, ${
      TAGS.hobby.color
    } ${w}% ${w + h}%, ${TAGS.study.color} ${w + h}% 100%)`;
  host.querySelector('li[data-tag="work"] b').textContent = `${
    byTag.work || 0
  }m`;
  host.querySelector('li[data-tag="hobby"] b').textContent = `${
    byTag.hobby || 0
  }m`;
  host.querySelector('li[data-tag="study"] b').textContent = `${
    byTag.study || 0
  }m`;
}

function renderGoal(rangeType) {
  const host = document.getElementById('goalChart');
  if (!host) return;
  const { totalMin, goal, pct } = aggregate(rangeType);
  const gauge = host.querySelector('.gauge i');
  if (gauge) gauge.style.width = pct + '%';
  const txt = host.querySelector('.goal-text');
  if (txt)
    txt.innerHTML = `<b>${pct}%</b> (${Math.round(totalMin)}m / ${goal}m)`;
}

function bindChartTabs() {
  document.querySelectorAll('#charts .chart-card').forEach((card) => {
    const tabs = card.querySelectorAll('.chart-tabs button');
    tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabs.forEach((b) => b.classList.remove('on'));
        btn.classList.add('on');
        const r = btn.dataset.range;
        if (card.querySelector('#totalTimeChart')) renderTotalTime(r);
        if (card.querySelector('#ratioChart')) renderRatio(r);
        if (card.querySelector('#goalChart')) renderGoal(r);
      });
    });
  });
}

function renderAllCharts() {
  const getR = (id) =>
    document
      .querySelector(`#${id}`)
      ?.closest('.chart-card')
      ?.querySelector('.chart-tabs .on')?.dataset.range || 'day';
  renderTotalTime(getR('totalTimeChart'));
  renderRatio(getR('ratioChart'));
  renderGoal(getR('goalChart'));
}

/* init and events */
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    bindChartTabs();
    renderAllCharts();
  }, 60);
});
window.addEventListener('ft-tasks-updated', renderAllCharts);
window.addEventListener('storage', (e) => {
  if (e.key === 'ft_tasks') renderAllCharts();
});
