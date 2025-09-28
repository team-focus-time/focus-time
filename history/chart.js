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

// ===================== 목표 달성 시간(게이지) =====================
function renderGoal(rangeType='day'){
  const host = document.getElementById('goalCard');
  if (!host) return;
  const { start, end } = rangeOf(rangeType);
  const tasks = loadTasks();

  let totalMin = 0;
  tasks.forEach(t=>{
    if (!t?.date) return;
    if (!isInRange(t.date, start, end)) return;
    totalMin += (+t.mins || 0);
  });

  const days = (rangeType==='day') ? 1 : (rangeType==='week' ? 7 : new Date().getDate());
  const goal = GOAL_PER_DAY_MIN * days;
  const pct  = goal ? Math.min(100, Math.round(totalMin/goal*100)) : 0;

  host.innerHTML = `
    <h3 style="margin:0 0 8px;color:#122168">목표 달성 시간</h3>
    <div class="goal-legend">
      <button class="${rangeType==='day'?'on':''}"   data-range="day">일간</button>
      <button class="${rangeType==='week'?'on':''}"  data-range="week">주간</button>
      <button class="${rangeType==='month'?'on':''}" data-range="month">월간</button>
    </div>
    <div class="gauge"><i style="width:${pct}%"></i></div>
    <div class="goal-text"><b>${pct}%</b> (${Math.round(totalMin)}m / ${goal}m)</div>
  `;
  host.querySelectorAll('.goal-legend button').forEach(b=>{
    b.onclick = ()=> renderGoal(b.dataset.range);
  });
}

// ===================== 실시간 연동 =====================
function renderAllCharts(){
  renderTotalTimeStacked(document.querySelector('#focusBarsCard .on')?.dataset.range || 'day');
  renderProjectDonut(document.querySelector('#donutCard .on')?.dataset.range || 'day');
  renderGoal(document.querySelector('#goalCard .on')?.dataset.range || 'day');
}
document.addEventListener('DOMContentLoaded', renderAllCharts);
window.addEventListener('ft-tasks-updated', renderAllCharts);
window.addEventListener('storage', (e)=>{ if(e.key==='ft_tasks') renderAllCharts(); });

const newTask = {
  title: ...,
  mins: ...,
  date: "2025-09-29", // 또는 "2025-09-29T01:00:00"
  tag: "study"        // 반드시 study/work/hobby 중 하나
};