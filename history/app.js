/* ====== 작은 유틸 ====== */
const $ = (s)=>document.querySelector(s);
const pad = (n)=>String(n).padStart(2,'0');

/* ====== 좌측 타이머 ====== */
// 타이머 (간단한 start/pause)
let running=false, startedAt=0, acc=0, raf=null;
const timerEl = document.getElementById('timer');
const btnStart = document.getElementById('btnStart');
function fmt(ms){
  const s = Math.floor(ms/1000);
  return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}
function tick(){
  timerEl.textContent = fmt(acc + (running ? Date.now()-startedAt : 0));
  if(running) raf = requestAnimationFrame(tick);
}
btnStart.addEventListener('click', ()=>{
  if(running){
    acc += Date.now()-startedAt;
    running = false;
    btnStart.textContent = 'start';
    cancelAnimationFrame(raf);
  }else{
    startedAt = Date.now();
    running = true;
    btnStart.textContent = 'pause';
    tick();
  }
});
tick();

// 달력 카드 생성
const EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEAR = new Date().getFullYear();
const GRID = document.getElementById('calendarGrid');
const today = new Date();
function renderMonthCard(monthIdx){
  const card = document.createElement('div');
  card.className = 'month';
  card.innerHTML = `
    <div class="month-header">${monthIdx+1}월</div>
    <div class="month-en">${EN[monthIdx]}</div>
    <div class="calendar-mini">
      <div class="wdays">
        <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
      </div>
      <div class="days">
        ${renderDays(YEAR, monthIdx)}
      </div>
    </div>
  `;
  // 확장 이벤트 (기존 로직 유지)
  card.addEventListener('click', (e) => {
    if (card.classList.contains('expanded')) return;
    openExpand(card);
    e.stopPropagation();
  });
  return card;
}
function renderDays(year, monthIdx){
  const first = new Date(year, monthIdx, 1);
  const startIdx = first.getDay();
  const prevDays = new Date(year, monthIdx, 0).getDate();
  let html = '';
  for(let i=startIdx-1;i>=0;i--){
    html += `<div class="muted">${prevDays-i}</div>`;
  }
  const lastDate = new Date(year, monthIdx+1, 0).getDate();
  for(let d=1; d<=lastDate; d++){
    const isToday = (year===today.getFullYear() && monthIdx===today.getMonth() && d===today.getDate());
    html += `<div${isToday?' class="today"':''}>${d}</div>`;
  }
  const totalCells = startIdx + lastDate;
  const rest = (Math.ceil(totalCells/7)*7) - totalCells;
  for(let i=1;i<=rest;i++){
    html += `<div class="muted">${i}</div>`;
  }
  return html;
}
function mountGrid(){
  GRID.innerHTML = '';
  for(let m=0;m<12;m++){
    GRID.appendChild(renderMonthCard(m));
  }
}
mountGrid();

/* ====== 확장 뷰 (오른쪽 절반만 덮음) ====== */
function openExpand(card) {
  const right = document.querySelector('.right');
  right.classList.add('expanded');

  // 오버레이 생성 (원본 유지)
  const overlay = document.createElement('div');
  overlay.className = 'month-overlay';

  // 복제해서 보여줌 (원본 건드리지 않음)
  const clone = card.cloneNode(true);
  clone.classList.add('expanded');

  // 오버레이 내 닫기 버튼
  const closeBtn = document.createElement('button');
  closeBtn.className = 'overlay-close';
  closeBtn.setAttribute('aria-label','닫기');
  closeBtn.textContent = '✕';

  overlay.appendChild(closeBtn);
  overlay.appendChild(clone);
  right.appendChild(overlay);

  // 닫기 로직
  function closeExpand() {
    right.classList.remove('expanded');
    if (overlay.parentElement) overlay.parentElement.removeChild(overlay);
    document.removeEventListener('keydown', onKey);
    overlay.removeEventListener('click', onOverlayClick);
    closeBtn.removeEventListener('click', closeExpand);
  }

  // 오버레이 외부(빈 공간) 클릭 시 닫기 — 오버레이 바깥(패널) 클릭과 구분
  function onOverlayClick(e){
    if (e.target === overlay) closeExpand();
  }

  function onKey(e){
    if (e.key === 'Escape') closeExpand();
  }

  // 이벤트 연결
  closeBtn.addEventListener('click', closeExpand);
  overlay.addEventListener('click', onOverlayClick);
  document.addEventListener('keydown', onKey);
}
