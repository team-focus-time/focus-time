// ===================== 공통 데이터/유틸 =====================
const TAGS = {
  work:  { label: 'Work',  color: '#2b5fff' },
  hobby: { label: 'Hobby', color: '#ffb66b' },
  study: { label: 'Study', color: '#28d37b' }
};
const GOAL_PER_DAY_MIN = 8 * 60; // 일 목표(분)

function normalizeTag(tag){
  tag = (tag||'').toString().trim().toLowerCase();
  return ['work','hobby','study'].includes(tag) ? tag : 'work';
}
function loadTasks(){
  try { return JSON.parse(localStorage.getItem('ft_tasks') || '[]'); }
  catch(e){ return []; }
}
function rangeOf(type){
  const now = new Date();
  let s, e;
  if (type==='day'){
    s = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    e = new Date(s); e.setDate(s.getDate()+1);
  } else if (type==='week'){
    const wd = now.getDay();
    s = new Date(now); s.setDate(now.getDate()-wd); s.setHours(0,0,0,0);
    e = new Date(s); e.setDate(s.getDate()+7);
  } else {
    s = new Date(now.getFullYear(), now.getMonth(), 1);
    e = new Date(now.getFullYear(), now.getMonth()+1, 1);
  }
  return {start:s, end:e};
}
function isInRange(iso, start, end){
  // 날짜만 비교 (시간 무시)
  const d = new Date(iso.slice(0,10));
  return d >= start && d < end;
}

// ===================== 전체 집중한 시간(스택 막대) =====================
function renderTotalTimeStacked(rangeType='day'){
  const host = document.getElementById('focusBarsCard');
  if (!host) return;
  const { start, end } = rangeOf(rangeType);
  const tasks = loadTasks();

  // 날짜별 태그별 집계: { 'YYYY-MM-DD': { work:0, hobby:0, study:0 } }
  const bucket = {};
  tasks.forEach(t=>{
    if (!t?.date) return;
    if (!isInRange(t.date, start, end)) return;
    const k = t.date.slice(0,10);
    if (!bucket[k]) bucket[k] = { work:0, hobby:0, study:0 };
    const tag = normalizeTag(t.tag);
    bucket[k][tag] += (+t.mins || 0);
  });

  const keys = Object.keys(bucket).sort();
  const max = Math.max(...keys.map(k=>bucket[k].work+bucket[k].hobby+bucket[k].study), 1);

  host.innerHTML = `
    <h3 style="margin:0 0 8px;color:#122168">전체 집중한 시간</h3>
    <div class="focus-legend">
      <button class="${rangeType==='day'?'on':''}"   data-range="day">일간</button>
      <button class="${rangeType==='week'?'on':''}"  data-range="week">주간</button>
      <button class="${rangeType==='month'?'on':''}" data-range="month">월간</button>
    </div>
    <div class="focus-bars">
      ${
        keys.length
        ? keys.map(k=>{
            const v = bucket[k];
            const total = v.work+v.hobby+v.study;
            // 각 태그별 높이 비율
            const hWork  = v.work/max*100;
            const hHobby = v.hobby/max*100;
            const hStudy = v.study/max*100;
            return `
              <div class="focus-col">
                <div style="width:18px;height:100px;display:flex;flex-direction:column-reverse;">
                  <div style="height:${hWork}px;background:${TAGS.work.color};border-radius:6px 6px 0 0"></div>
                  <div style="height:${hHobby}px;background:${TAGS.hobby.color};"></div>
                  <div style="height:${hStudy}px;background:${TAGS.study.color};border-radius:0 0 6px 6px"></div>
                </div>
                <div class="focus-x">${k.slice(5)}</div>
                <div class="focus-val">${total}m</div>
              </div>
            `;
          }).join('')
        : `<div style="padding:10px;color:#889">데이터 없음</div>`
      }
    </div>
  `;
  host.querySelectorAll('.focus-legend button').forEach(b=>{
    b.onclick = ()=> renderTotalTimeStacked(b.dataset.range);
  });
}

// ===================== 프로젝트 시간 비율(도넛) =====================
function renderProjectDonut(rangeType='day'){
  const host = document.getElementById('donutCard');
  if (!host) return;
  const { start, end } = rangeOf(rangeType);
  const tasks = loadTasks();

  const byTag = { work:0, hobby:0, study:0 };
  tasks.forEach(t=>{
    if (!t?.date) return;
    if (!isInRange(t.date, start, end)) return;
    const mins = +t.mins || 0;
    const tag  = normalizeTag(t.tag);
    if (byTag[tag] !== undefined) byTag[tag] += mins;
  });

  const total = byTag.work + byTag.hobby + byTag.study;
  const pct   = total ? {
    work:  Math.round(byTag.work/total*100),
    hobby: Math.round(byTag.hobby/total*100),
    study: 100
           - Math.round(byTag.work/total*100)
           - Math.round(byTag.hobby/total*100)
  } : {work:0,hobby:0,study:0};

  host.innerHTML = `
    <div class="donut-wrap">
      <div class="donut" style="background:
        conic-gradient(
          ${TAGS.work.color} 0 ${pct.work}%,
          ${TAGS.hobby.color} ${pct.work}% ${pct.work+pct.hobby}%,
          ${TAGS.study.color} ${pct.work+pct.hobby}% 100%)"></div>
      <div style="flex:1">
        <h3 style="margin:0 0 8px;color:#122168">프로젝트 시간 비율</h3>
        <div class="focus-legend">
          <button class="${rangeType==='day'?'on':''}"   data-range="day">일간</button>
          <button class="${rangeType==='week'?'on':''}"  data-range="week">주간</button>
          <button class="${rangeType==='month'?'on':''}" data-range="month">월간</button>
        </div>
        <div class="legend-row"><span class="legend-swatch" style="background:${TAGS.work.color}"></span><strong>Work</strong> <small style="color:#6b6f85">${byTag.work}m • ${pct.work}%</small></div>
        <div class="legend-row"><span class="legend-swatch" style="background:${TAGS.hobby.color}"></span><strong>Hobby</strong> <small style="color:#6b6f85">${byTag.hobby}m • ${pct.hobby}%</small></div>
        <div class="legend-row"><span class="legend-swatch" style="background:${TAGS.study.color}"></span><strong>Study</strong> <small style="color:#6b6f85">${byTag.study}m • ${pct.study}%</small></div>
      </div>
    </div>
  `;
  host.querySelectorAll('.focus-legend button').forEach(b=>{
    b.onclick = ()=> renderProjectDonut(b.dataset.range);
  });
}

// ===================== 목표 시간 설정 및 저장 =====================
function getGoalPerDay() {
  return Number(localStorage.getItem('ft_goal_per_day') || 60); // 기본 60분(1h)
}
function setGoalPerDay(mins) {
  localStorage.setItem('ft_goal_per_day', mins);
  window.dispatchEvent(new CustomEvent('ft-goal-updated'));
}

// ===================== 목표 달성 시간(게이지) =====================
function renderGoal(rangeType='day') {
  const host = document.getElementById('goalCard');
  if (!host) return;
  const goalMin = getGoalPerDay();
  const { start, end } = rangeOf(rangeType);
  const tasks = loadTasks();

  // 날짜별 총 집중 시간 집계
  const bucket = {};
  tasks.forEach(t => {
    if (!t?.date) return;
    const d = t.date.slice(0,10);
    if (!bucket[d]) bucket[d] = 0;
    if (isInRange(t.date, start, end)) bucket[d] += (+t.mins || 0);
  });

  // 목표 달성일수/비율 계산
  const days = [];
  let achieved = 0, focused = 0;
  for (let d = new Date(start); d < end; d.setDate(d.getDate()+1)) {
    const key = d.toISOString().slice(0,10);
    const min = bucket[key] || 0;
    days.push({ date: key, min });
    if (min > 0) focused++;
    if (min >= goalMin) achieved++;
  }
  const pct = days.length ? Math.round(achieved/days.length*100) : 0;

  // 목표 입력 UI
  let inputUI = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <label style="font-weight:700;color:#122168">목표:</label>
      <input id="goalInput" type="number" min="1" max="1440" value="${goalMin}" style="width:60px;padding:2px 6px;border-radius:6px;border:1px solid #dbe2ff">
      <span style="color:#6b6f85">분/일</span>
      <button id="goalSaveBtn" style="margin-left:8px;padding:2px 10px;border-radius:6px;border:0;background:#2b5fff;color:#fff;font-weight:700;cursor:pointer">저장</button>
    </div>
  `;

  // 달력/잔디 UI
  let calendarUI = '';
  if (rangeType === 'month') {
    // 월간: 원형 달력
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m+1, 0);
    calendarUI += `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin:12px 0 8px 0">`;
    for (let i=0; i<firstDay.getDay(); i++) calendarUI += `<div></div>`;
    for (let d=1; d<=lastDay.getDate(); d++) {
      const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const min = bucket[key] || 0;
      const color = min >= goalMin ? '#2b5fff' : (min > 0 ? '#ffb66b' : '#eef1ff');
      calendarUI += `<div style="display:flex;flex-direction:column;align-items:center">
        <div style="width:22px;height:22px;border-radius:50%;background:${color};margin-bottom:2px"></div>
        <span style="font-size:11px;color:#6b6f85">${d}</span>
      </div>`;
    }
    calendarUI += `</div>`;
  } else if (rangeType === 'year') {
    // 연간: 잔디(깃허브 스타일)
    const now = new Date();
    const y = now.getFullYear();
    calendarUI += `<div style="margin:12px 0 8px 0"><div style="display:flex;gap:6px">`;
    for (let m=0; m<12; m++) {
      calendarUI += `<div style="display:flex;flex-direction:column;gap:2px">`;
      for (let d=1; d<=31; d++) {
        const key = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const min = bucket[key] || 0;
        let color = '#eef1ff';
        if (min >= goalMin) color = '#2b5fff';
        else if (min > 0) color = '#ffb66b';
        calendarUI += `<div style="width:10px;height:10px;border-radius:2px;background:${color};margin-bottom:1px"></div>`;
      }
      calendarUI += `</div>`;
    }
    calendarUI += `</div></div>`;
  }

  // 목표 달성 텍스트
  let info = `<div style="color:#122168;font-weight:700;margin-bottom:8px">
    집중한 날: ${focused}일, 달성한 목표일수: ${achieved}일, 달성률: ${pct}%
  </div>`;

  // 토글 버튼
  let toggleUI = `
    <div style="margin-bottom:8px">
      <button class="goal-tab" data-range="month" ${rangeType==='month'?'style="font-weight:bold;color:#2b5fff" : ''}>월</button>
      <button class="goal-tab" data-range="year" ${rangeType==='year'?'style="font-weight:bold;color:#2b5fff" : ''}>연</button>
    </div>
  `;

  host.innerHTML = `
    <h3 style="margin:0 0 8px;color:#122168">목표 집중 시간</h3>
    ${inputUI}
    ${toggleUI}
    ${info}
    ${calendarUI}
  `;

  // 목표 입력 이벤트
  host.querySelector('#goalSaveBtn')?.addEventListener('click', () => {
    const val = Number(host.querySelector('#goalInput').value);
    if (val > 0 && val <= 1440) setGoalPerDay(val);
  });

  // 탭 이벤트
  host.querySelectorAll('.goal-tab').forEach(btn => {
    btn.onclick = () => renderGoal(btn.dataset.range);
  });
}

// 목표 변경 시 차트 갱신
window.addEventListener('ft-goal-updated', () => {
  renderGoal(document.querySelector('#goalCard .goal-tab[style*="font-weight:bold"]')?.dataset.range || 'month');
});

// 최초 렌더 및 실시간 연동
document.addEventListener('DOMContentLoaded', () => {
  renderGoal('month');
});
window.addEventListener('ft-tasks-updated', () => {
  renderGoal(document.querySelector('#goalCard .goal-tab[style*="font-weight:bold"]')?.dataset.range || 'month');
});
window.addEventListener('storage', (e) => {
  if (e.key === 'ft_tasks' || e.key === 'ft_goal_per_day') {
    renderGoal(document.querySelector('#goalCard .goal-tab[style*="font-weight:bold"]')?.dataset.range || 'month');
  }
});

// ===================== 실시간 연동 =====================
function renderAllCharts(){
  renderTotalTimeStacked(document.querySelector('#focusBarsCard .on')?.dataset.range || 'day');
  renderProjectDonut(document.querySelector('#donutCard .on')?.dataset.range || 'day');
  renderGoal(document.querySelector('#goalCard .on')?.dataset.range || 'day');
}
document.addEventListener('DOMContentLoaded', renderAllCharts);
window.addEventListener('ft-tasks-updated', renderAllCharts);
window.addEventListener('storage', (e)=>{ if(e.key==='ft_tasks') renderAllCharts(); });