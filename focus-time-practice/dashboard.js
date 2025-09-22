// Dashboard logic: reads ft_sessions and ft_tasks from localStorage
(function(){
  const store = {
    get(k, d){ try{ const r=localStorage.getItem(k); return r==null? d: JSON.parse(r);}catch(_){return d;} },
    set(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(_){}}
  };
  const sessions = store.get('ft_sessions', []);
  const tasks = store.get('ft_tasks', []);

  // Compute main dashboard height to fill viewport (absolute 4:2 rows)
  function setMainHeight(){
  const main = document.querySelector('.dash-main');
  if (!main) { return; }
  const { top } = main.getBoundingClientRect(); // distance from viewport top
    const vh = Math.max(window.innerHeight || 0, 600);
    const gap = parseInt(getComputedStyle(main).gap || '12', 10);
  const colR = main.querySelector('.colR.row1');
  const colRWidth = colR ? colR.clientWidth : Math.max(240, Math.floor((main.clientWidth||900) * 2 / 6 - gap));
    // target row height: make right-column cards square while fitting viewport
    const maxUsable = Math.max(420, vh - top - 20);
    const MIN_ROW = 560; // ensure calendar fits without scroll on desktop
    const rowH = Math.max(MIN_ROW, Math.min(colRWidth, Math.floor((maxUsable - gap)/2)));
    const totalH = rowH*2 + gap;
    main.style.height = totalH + 'px';
    main.style.gridTemplateRows = `${rowH}px ${rowH}px`;
    document.documentElement.style.setProperty('--mainHeight', totalH + 'px');
  }
  setMainHeight();
  window.addEventListener('resize', setMainHeight);

  // KPI totals
  const totalMin = sessions.reduce((a,b)=> a + (b.mode==='focus'? (b.minutes||0):0), 0);
  const kpiTotalH = Math.floor(totalMin/60); const kpiTotalM = totalMin%60;
  document.getElementById('kpi-total-h').textContent = String(kpiTotalH);
  document.getElementById('kpi-total-m').textContent = String(kpiTotalM);

  function isSameDay(a,b){ return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
  function weekStart(d){ const x=new Date(d); const day=(x.getDay()+6)%7; x.setHours(0,0,0,0); x.setDate(x.getDate()-day); return x; }
  function weekEnd(d){ const x=weekStart(d); x.setDate(x.getDate()+6); x.setHours(23,59,59,999); return x; }

  const now = new Date();
  // Utilities (local-date boundaries)
  function ymd(d){ const dt=new Date(d); const y=dt.getFullYear(); const m=String(dt.getMonth()+1).padStart(2,'0'); const day=String(dt.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
  function addDays(d, n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
  function rangeDays(end, len){ const arr=[]; for(let i=len-1;i>=0;i--){ arr.push(ymd(addDays(end, -i))); } return arr; }
  function dayWindow(anchor){ const s=new Date(anchor); s.setHours(0,0,0,0); const e=new Date(anchor); e.setHours(23,59,59,999); return {start:s, end:e}; }
  function monthWindow(anchor){ const s=new Date(anchor.getFullYear(), anchor.getMonth(), 1, 0,0,0,0); const e=new Date(anchor.getFullYear(), anchor.getMonth()+1, 0, 23,59,59,999); return {start:s, end:e}; }
  function monthMatrix(anchor){
    const d=new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const startIdx=(d.getDay()+6)%7; // Mon=0
    d.setDate(d.getDate()-startIdx);
    const cells=[];
    for(let i=0;i<42;i++){ const cur=new Date(d); cells.push({d: new Date(cur), dim: cur.getMonth()!==anchor.getMonth()}); d.setDate(d.getDate()+1); }
    return cells;
  }
  function renderHeatmap(){
    const canvas = document.getElementById('goalHeatmap');
    if (!canvas) { return; }
    const ctx = canvas.getContext('2d');
    const DPR = Math.max(1, Math.floor(window.devicePixelRatio||1));
    // grid sizes
    let cell = 10, gap = 2;
    const Hcss = canvas.clientHeight || 200;
    const top = 22, left = 40;
    // aggregate minutes per day for current year
    const now = new Date(); const year = now.getFullYear();
    const map = new Map();
    sessions.filter(s=> s.mode==='focus').forEach(s=>{ const d=new Date(s.ts); if (d.getFullYear()===year){ const k=ymd(d); map.set(k,(map.get(k)||0)+(s.minutes||0)); } });
    // compute start (Mon) and end (Sun) of full-year span
    const yStart = new Date(year,0,1); yStart.setHours(0,0,0,0); const sShift=(yStart.getDay()+6)%7; yStart.setDate(yStart.getDate()-sShift);
    const yEnd = new Date(year,11,31); yEnd.setHours(0,0,0,0); const eShift=(7-((yEnd.getDay()+6)%7))%7; yEnd.setDate(yEnd.getDate()+eShift);
    const totalDays = Math.round((yEnd - yStart) / (1000*60*60*24)) + 1;
    const cols = Math.ceil(totalDays/7);
    // compute content width; densify if too wide
    const wrap = document.getElementById('goalHeatmapWrap');
    let Wcss = left + cols*(cell+gap) + 20;
    const viewportW = wrap ? wrap.clientWidth || 600 : 600;
    if (Wcss > viewportW * 1.8){ cell = 9; gap = 1; Wcss = left + cols*(cell+gap) + 20; }
    canvas.style.width = Wcss + 'px';
    canvas.width = Wcss * DPR; canvas.height = Hcss * DPR; ctx.setTransform(DPR,0,0,DPR,0,0);
    ctx.clearRect(0,0,Wcss,Hcss);
    // color scale up to >12h
    const buckets = [0, 30, 60, 180, 300, 480, 720];
    const colors = ['#f1f5f9','#e2e8f0','#c7d2fe','#a5b4fc','#818cf8','#6366f1','#4f46e5'];
    function colorFor(min){ for (let i=buckets.length-1;i>=0;i--){ if (min>=buckets[i]) { return colors[i]; } } return colors[0]; }
    // month labels: compute x position of the first visible day of each month
    ctx.fillStyle = '#9eb3da'; ctx.font='12px system-ui';
    for (let m=0;m<12;m++){
      const md = new Date(year, m, 1); const dOff = Math.floor((md - yStart)/(1000*60*60*24));
      const cx = left + Math.floor(dOff/7)*(cell+gap);
      ctx.fillText(`${m+1}월`, cx, 12);
    }
    // draw grid
    const meta = []; const tooltip = document.getElementById('tt');
    for (let c=0;c<cols;c++){
      for (let r=0;r<7;r++){
        const d = new Date(yStart); d.setDate(yStart.getDate()+c*7+r);
        const k = ymd(d); const min = map.get(k)||0;
        const x = left + c*(cell+gap); const y = top + r*(cell+gap);
        ctx.fillStyle = colorFor(min); ctx.fillRect(x,y,cell,cell);
        if (d>=new Date(year,0,1) && d<=new Date(year,11,31)){
          meta.push({x,y,w:cell,h:cell,date:d,min});
        }
      }
    }
    // hover tooltip
    canvas.onmousemove = (e)=>{
      const rect = canvas.getBoundingClientRect(); const mx=e.clientX-rect.left; const my=e.clientY-rect.top;
      let hit=null; for(const it of meta){ if(mx>=it.x && mx<=it.x+it.w && my>=it.y && my<=it.y+it.h){ hit=it; break; } }
      if(hit){ const hh=Math.floor(hit.min/60), mm=hit.min%60; tooltip.textContent=`${hit.date.getMonth()+1}월 ${hit.date.getDate()}, ${hh>0?hh+'h ':''}${mm}m`; tooltip.style.left=e.pageX+'px'; tooltip.style.top=e.pageY+'px'; tooltip.style.display='block'; }
      else { tooltip.style.display='none'; }
    };
    canvas.onmouseleave = ()=>{ const tt=document.getElementById('tt'); tt.style.display='none'; };
  }

  // Goal & Calendar (month view) and summary
  const goalInput = document.getElementById('goalH');
  const goalSummary = document.getElementById('goalSummary');
  const goalPillVal = document.getElementById('goalPillVal');
  let calAnchor = new Date();
  let goalView = 'month';
  function updateGoalSummary(){
    const now = new Date();
    const curYear = now.getFullYear(); const curMonth = now.getMonth();
    const goalH = Math.max(0, parseInt(goalInput?.value || '10', 10));
    // sum minutes per day in current month
    const dayMap = new Map();
    sessions.filter(s=> s.mode==='focus').forEach(s=>{
      const d = new Date(s.ts);
      if (d.getFullYear()===curYear && d.getMonth()===curMonth){
        const k = ymd(d); dayMap.set(k, (dayMap.get(k)||0) + (s.minutes||0));
      }
    });
    const focusDays = dayMap.size;
    const achievedDays = Array.from(dayMap.values()).filter(m=> m >= goalH*60).length;
    const monthlyMin = Array.from(dayMap.values()).reduce((a,b)=>a+b,0);
    const daysInMonth = new Date(curYear, curMonth+1, 0).getDate();
    const pct = goalH>0? Math.min(100, (monthlyMin/(goalH*60*daysInMonth))*100) : 0;
    if (goalSummary){ goalSummary.textContent = `집중한 날: ${focusDays}일, 달성한 목표 일수: ${achievedDays}일, 달성률: ${pct.toFixed(0)}%`; }
    if (goalPillVal){ goalPillVal.textContent = String(goalH); }
  }
  function renderCalendar(){
    const monthEl = document.getElementById('cal-month');
    const grid = document.getElementById('cal-grid');
    if (!grid || !monthEl) { return; }
    grid.innerHTML = '';
    monthEl.textContent = `${calAnchor.getFullYear()}년 ${calAnchor.getMonth()+1}월`;
    const cells = monthMatrix(calAnchor);
    const goalH = Math.max(0, parseInt(goalInput?.value || '10', 10));
    const dailyTargetMin = goalH*60;
    const byDay = new Map();
    sessions.filter(s=> s.mode==='focus').forEach(s=>{ const k=ymd(s.ts); byDay.set(k,(byDay.get(k)||0)+(s.minutes||0)); });
    cells.forEach(c=>{
      const dstr = ymd(c.d);
      const div = document.createElement('div');
      const min = byDay.get(dstr)||0;
      const pct = dailyTargetMin>0? Math.min(100, Math.round((min/dailyTargetMin)*100)) : 0;
      div.className = `cal-day${c.dim?' dim':''}${min>0?' mark':''}${pct>0?' has-pct':''}`;
      div.textContent = String(c.d.getDate());
      if (pct>0) { div.style.setProperty('--pct', String(pct)); }
      // tooltip
      div.onmousemove = (e)=>{
        const tt = document.getElementById('tt');
        tt.textContent = `${dstr} · ${min}분 · ${pct}%`;
        tt.style.left = e.pageX+'px'; tt.style.top = e.pageY+'px'; tt.style.display='block';
      };
      div.onmouseleave = ()=>{ const tt=document.getElementById('tt'); tt.style.display='none'; };
      grid.appendChild(div);
    });
  }
  // Wire goal tabs (scoped to goal card)
  const goalTabs = document.querySelector('#goalTabs');
  if (goalTabs){
    goalTabs.querySelectorAll('button[data-goalview]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        goalTabs.querySelectorAll('button[data-goalview]').forEach(x=>x.classList.remove('active'));
        btn.classList.add('active');
        goalView = btn.dataset.goalview || 'month';
        const cal = document.getElementById('calendar'); const heat = document.getElementById('goalHeatmapWrap');
  if (cal) { cal.style.display = goalView==='month'? 'block':'none'; }
  if (heat) { heat.style.display = goalView==='year'? 'block':'none'; }
        if (goalView==='year') { renderHeatmap(); } else { renderCalendar(); }
      });
    });
  }
  // Prev/Next month
  const btnCalPrev = document.getElementById('cal-prev');
  const btnCalNext = document.getElementById('cal-next');
  if (btnCalPrev) { btnCalPrev.addEventListener('click', ()=>{ calAnchor.setMonth(calAnchor.getMonth()-1); renderCalendar(); }); }
  if (btnCalNext) { btnCalNext.addEventListener('click', ()=>{ calAnchor.setMonth(calAnchor.getMonth()+1); renderCalendar(); }); }
  // Goal input
  if (goalInput){ goalInput.addEventListener('change', ()=>{ updateGoalSummary(); if (goalView==='month') { renderCalendar(); } else { renderHeatmap(); } }); }
  // Initial
  updateGoalSummary();
  // default to month view visible
  const calWrap = document.getElementById('calendar'); const heatWrap = document.getElementById('goalHeatmapWrap');
  if (calWrap) { calWrap.style.display = 'block'; }
  if (heatWrap) { heatWrap.style.display = 'none'; }
  renderCalendar();

  // Timeline chart with range + nav
  let tlRange='day', tlIdx=0; // 0: this period, 1: prev, ...
  const tlLabel = document.getElementById('tl-label');
  const tlCanvas = document.getElementById('timelineCanvas');
  const ctxT = tlCanvas.getContext('2d');
  function computeTimelineMatrix(){
    // Build a matrix [rows=days, cols=hours] of minutes
    const days = tlRange==='day'? 1 : tlRange==='week'? 7 : 30;
    const end = new Date();
    const offset = (tlRange==='day'?1:tlRange==='week'?7:30)*tlIdx;
    end.setDate(end.getDate()-offset);
    const rows = [];
    for(let i=0;i<days;i++){
      const d = new Date(end); d.setDate(end.getDate()-i); d.setHours(0,0,0,0);
      rows.push({ label: i===0? (tlRange==='day'?'오늘': ymd(d)) : ymd(d), key: ymd(d), mins: Array(24).fill(0) });
    }
    const map = new Map(rows.map(r=> [r.key, r]));
    sessions.filter(s=> s.mode==='focus').forEach(s=>{
      const dt = new Date(s.ts);
      const key = ymd(dt);
      const row = map.get(key);
      if (row){ row.mins[dt.getHours()] += (s.minutes||0); }
    });
    // stats
    const allMins = rows.flatMap(r=> r.mins);
    const maxMin = Math.max(0, ...allMins);
    const avgMin = allMins.length? Math.round(allMins.reduce((a,b)=>a+b,0)/allMins.length):0;
    document.getElementById('tl-max').textContent = String(maxMin);
    document.getElementById('tl-avg').textContent = String(avgMin);
    tlLabel.textContent = tlIdx===0 ? (tlRange==='day'?'오늘': tlRange==='week'?'이번 주':'이번 달') : `${tlIdx}${tlRange==='day'?'일':tlRange==='week'?'주':'개월'} 전`;
    return rows;
  }
  function renderTimeline(){
    const wrap = document.querySelector('.timeline-wrap');
    if (!wrap) { return; }
    wrap.classList.remove('day','week','month'); wrap.classList.add(tlRange);
    if (tlRange==='day'){
      // Vertical day schedule: 00:00 at top -> 24:00 bottom, blocks per session with task name
      const target = new Date(); target.setDate(target.getDate()-tlIdx); target.setHours(0,0,0,0);
      const dayKey = ymd(target);
      const daySessions = sessions.filter(s=> s.mode==='focus' && ymd(s.ts)===dayKey);
      // label
      const tlLabelEl = document.getElementById('tl-label');
      if (tlLabelEl){ tlLabelEl.textContent = tlIdx===0? '오늘' : `${tlIdx}일 전`; }
      // layout
      const W = Math.max(300, wrap.clientWidth - 2);
      const slotH = 44; // px per hour
      const padding = {l:120, r:16, t:24, b:24};
      const H = padding.t + slotH*24 + padding.b; // full height to allow scroll
      tlCanvas.width = W; tlCanvas.height = H;
      ctxT.clearRect(0,0,W,H);
      // hour grid and labels
      ctxT.strokeStyle='rgba(255,255,255,.08)'; ctxT.lineWidth=1; ctxT.setLineDash([4,6]);
      ctxT.font='12px system-ui'; ctxT.fillStyle='#9eb3da'; ctxT.textAlign='right'; ctxT.textBaseline='middle';
      for (let h=0; h<=24; h+=2){
        const y = padding.t + slotH*h;
        ctxT.beginPath(); ctxT.moveTo(padding.l, y); ctxT.lineTo(W - padding.r, y); ctxT.stroke();
        ctxT.fillText(`${String(h).padStart(2,'0')}:00`, padding.l-10, y);
      }
      ctxT.setLineDash([]);
      // draw session blocks
      const x0 = padding.l + 6; const barW = Math.max(80, W - padding.l - padding.r - 12);
      const rects = [];
      daySessions.sort((a,b)=> a.ts - b.ts).forEach(s=>{
        const start = new Date(s.ts);
        const end = new Date(s.ts + (s.minutes||0)*60000);
        const startH = start.getHours() + start.getMinutes()/60;
        const endH = Math.min(24, end.getHours() + end.getMinutes()/60 + (end.getSeconds()? end.getSeconds()/3600:0));
        const y = padding.t + startH*slotH + 4;
        const h = Math.max(8, (endH - startH) * slotH - 8);
        ctxT.fillStyle = '#818cf8';
        ctxT.fillRect(x0, y, barW, h);
        // label
        const t = tasks.find(tt=> tt.id===s.task);
        const label = (t? t.text : '—') + ` · ${s.minutes}분`;
        ctxT.fillStyle = '#e6edff'; ctxT.textAlign='left'; ctxT.textBaseline='top';
        const textY = y + 4; const textX = x0 + 8;
        ctxT.fillText(label.length>40? label.slice(0,37)+'…' : label, textX, textY);
        rects.push({x:x0,y,w:barW,h, label, start, end});
      });
      // tooltip
      const tooltip = document.getElementById('tt');
      tlCanvas.onmousemove = (e)=>{
        const rect = tlCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
        let hit=null; for (const r of rects){ if (mx>=r.x && mx<=r.x+r.w && my>=r.y && my<=r.y+r.h){ hit=r; break; } }
        if (hit){
          const fmt=(d)=> `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
          tooltip.textContent = `${fmt(hit.start)} ~ ${fmt(hit.end)} · ${hit.label}`;
          tooltip.style.left = e.pageX+'px'; tooltip.style.top = e.pageY+'px'; tooltip.style.display='block';
        } else { tooltip.style.display='none'; }
      };
      tlCanvas.onmouseleave = ()=>{ const tt=document.getElementById('tt'); tt.style.display='none'; };
      return;
    }

    // week/month: horizontal multi-row by hour
    const rows = computeTimelineMatrix();
    const baseRh = tlRange==='week'? 36 : 24;
    const wrapH = Math.max(180, wrap.clientHeight || 260);
    const rowsH = baseRh * Math.max(1, rows.length);
    const H = Math.min(wrapH, 24 + rowsH + 32);
    const W = Math.max(300, wrap.clientWidth - 2);
    tlCanvas.width = W; tlCanvas.height = H;
    ctxT.clearRect(0,0,W,H);
    const padding = {l:100, r:16, t:24, b:28};
    const colCount = 24;
    const rowCount = rows.length;
    const cw = (W - padding.l - padding.r) / colCount;
    const rh = (H - padding.t - padding.b) / Math.max(1,rowCount);
    ctxT.fillStyle = '#9eb3da'; ctxT.textAlign='center'; ctxT.textBaseline='top'; ctxT.font='12px system-ui';
    for(let h=0; h<24; h+=2){ const x=padding.l + cw*h + cw/2; ctxT.fillText(`${String(h).padStart(2,'0')}:00`, x, H - padding.b + 4); }
    const rowsVis = rows.slice().reverse();
    ctxT.textAlign='right'; ctxT.textBaseline='middle';
    rowsVis.forEach((r,ri)=>{
      const y = padding.t + rh*ri + rh/2;
      ctxT.fillStyle='#9eb3da'; ctxT.fillText(r.label, padding.l-10, y);
      ctxT.strokeStyle='rgba(255,255,255,.08)'; ctxT.lineWidth=1; ctxT.beginPath(); ctxT.moveTo(padding.l, y); ctxT.lineTo(W-padding.r, y); ctxT.stroke();
      for(let h=0; h<24; h++){
        const min = r.mins[h]||0; if (!min) { continue; }
        const x = padding.l + cw*h + Math.max(1, cw*0.2);
        const w = Math.max(3, cw*0.6);
        const bh = Math.min(rh-10, Math.max(6, (min/60) * (rh-10)));
        const by = y - bh/2;
        ctxT.fillStyle = '#818cf8';
        ctxT.fillRect(x, by, w, bh);
        ctxT.fillRect(x, by, w, 2); ctxT.fillRect(x, by+bh-2, w, 2);
      }
    });
  }
  document.querySelectorAll('.tabs2 button[data-range]').forEach(b=> b.addEventListener('click', ()=>{ document.querySelectorAll('.tabs2 button[data-range]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); tlRange=b.dataset.range; tlIdx=0; renderTimeline(); }));
  document.getElementById('tl-prev').addEventListener('click', ()=>{ tlIdx++; renderTimeline(); });
  document.getElementById('tl-next').addEventListener('click', ()=>{ tlIdx=Math.max(0, tlIdx-1); renderTimeline(); });
  renderTimeline();

  // Focus summary (top-right card) — independent of pie chart
  let focusScope = 'day'; // 'day' | 'week' | 'month'
  let focusIdx = 0;       // 0 = current, 1 = previous, ...
  function periodWindow(scope, idx){
    const end = new Date();
    if (scope==='day'){
      end.setDate(end.getDate()-idx);
      const w = dayWindow(end); return { start: w.start, end: w.end, label: idx===0? '오늘' : `${idx}일 전` };
    } else if (scope==='week'){
      const anchor = addDays(new Date(), -7*idx); const s = weekStart(anchor), e = weekEnd(anchor);
      return { start: s, end: e, label: idx===0? '이번 주' : `${idx}주 전` };
    } else {
      const anchor = new Date(); anchor.setMonth(anchor.getMonth()-idx);
      const w = monthWindow(anchor); const lab = idx===0? '이번 달' : `${idx}개월 전`;
      return { start: w.start, end: w.end, label: lab };
    }
  }
  function renderFocusSummary(){
    const { start, end, label } = periodWindow(focusScope, focusIdx);
    // aggregate
    const byCat = new Map(); let total = 0;
    sessions.filter(s=> s.mode==='focus').forEach(s=>{
      const dt = new Date(s.ts);
      if (dt>=start && dt<=end){ total += (s.minutes||0); const k=s.category||'기타'; byCat.set(k,(byCat.get(k)||0)+(s.minutes||0)); }
    });
    // top category
    let topName='—', topMin=0;
    for (const [k,v] of byCat.entries()){ if (v>topMin){ topMin=v; topName=k; } }
    // update DOM
  const labEl = document.getElementById('scope-label'); if (labEl) { labEl.textContent = label; }
  const sumEl = document.getElementById('sum-min'); if (sumEl) { sumEl.textContent = String(total); }
  const tn = document.getElementById('top-cat-name'); if (tn) { tn.textContent = topName; }
  const tv = document.getElementById('top-cat-min'); if (tv) { tv.textContent = String(topMin); }
  const tf = document.getElementById('top-cat-fill'); if (tf) { tf.style.width = (total? (topMin/total*100) : 0).toFixed(1)+'%'; }
  }
  // wire events
  document.querySelectorAll('.tabs2 button[data-scope]').forEach(b=> b.addEventListener('click', ()=>{
    document.querySelectorAll('.tabs2 button[data-scope]').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    focusScope = b.dataset.scope; focusIdx = 0; renderFocusSummary();
  }));
  document.getElementById('nav-prev').addEventListener('click', ()=>{ focusIdx++; renderFocusSummary(); });
  document.getElementById('nav-next').addEventListener('click', ()=>{ focusIdx = Math.max(0, focusIdx-1); renderFocusSummary(); });
  renderFocusSummary();

  // Category breakdown (pie)
  function aggByCategory(period){
    const now = new Date();
    let start, end;
    if (period==='day'){ const w=dayWindow(now); start=w.start; end=w.end; }
    else if (period==='week'){ start=weekStart(now); end=weekEnd(now); }
    else { const w=monthWindow(now); start=w.start; end=w.end; }
    const byCat = new Map();
    sessions.filter(s=> s.mode==='focus').forEach(s=>{
      const dt = new Date(s.ts);
      if (dt>=start && dt<=end){ const cat = s.category || '기타'; byCat.set(cat, (byCat.get(cat)||0)+ s.minutes); }
    });
    return byCat;
  }
  let piePeriod='day';
  function renderPie(){
    const byCat = aggByCategory(piePeriod);
    const labelsP = Array.from(byCat.keys());
    const valuesP = Array.from(byCat.values());
    if (chartPie) { chartPie.destroy(); }
  chartPie = new Chart(ctxP, { type:'doughnut', data:{ labels:labelsP, datasets:[{ data:valuesP, backgroundColor: labelsP.map((_,i)=> colors[i%colors.length]) }] }, options:{ responsive:true, maintainAspectRatio:false, layout:{ padding:8 }, plugins:{ legend:{ position:'right', labels:{ boxWidth:10, color:'#e6edff', font:{ size:11 } } } }, cutout:'58%' } });
    const sumMin = valuesP.reduce((a,b)=>a+b,0);
    document.getElementById('sum-min').textContent = String(sumMin);
    const topIdx = valuesP.findIndex(v=> v===Math.max(...valuesP, 0));
    const name = topIdx>-1? labelsP[topIdx] : '—'; const min = topIdx>-1? valuesP[topIdx] : 0;
    document.getElementById('top-cat-name').textContent = name;
    document.getElementById('top-cat-min').textContent = String(min);
    document.getElementById('top-cat-fill').style.width = (sumMin? (min/sumMin*100) : 0).toFixed(1)+'%';
  }
  document.querySelectorAll('.tabs2 button[data-pie]').forEach(b=> b.addEventListener('click', ()=>{ document.querySelectorAll('.tabs2 button[data-pie]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); piePeriod=b.dataset.pie; renderPie(); }));
  const colors = ['#818cf8','#60a5fa','#34d399','#f59e0b','#f43f5e','#a78bfa','#22d3ee'];
  const ctxP = document.getElementById('chartPie').getContext('2d');
  let chartPie;


  // Detail tabs (category / task / sessions) with totals for selected period/day
  let detailMode='cat';
  function renderDetails(){
    const thead = document.querySelector('#detail-table thead');
    const tbody = document.querySelector('#detail-table tbody');
    const sumEl = document.getElementById('detail-sum');
    tbody.innerHTML=''; thead.innerHTML='';
    const period = piePeriod; // reuse
    let start, end;
    if (selectedDay){ const d=new Date(selectedDay); const w=dayWindow(d); start=w.start; end=w.end; }
    else if (period==='day'){ const w=dayWindow(new Date()); start=w.start; end=w.end; }
    else if (period==='week'){ start=weekStart(new Date()); end=weekEnd(new Date()); }
    else { const w=monthWindow(new Date()); start=w.start; end=w.end; }
    let inRange = sessions.filter(s=>{ const dt=new Date(s.ts); return dt>=start && dt<=end; });
    // apply filters
    const fcat = document.getElementById('f-cat').value;
    const ftask = document.getElementById('f-task').value;
    const fmode = document.getElementById('f-mode').value;
    if (fcat) { inRange = inRange.filter(s=> (s.category||'')===fcat); }
    if (ftask) { inRange = inRange.filter(s=> (s.task||'')===ftask); }
    if (fmode) { inRange = inRange.filter(s=> (s.mode||'')===fmode); }
    if (detailMode==='cat'){
      thead.innerHTML = '<tr><th>카테고리</th><th>분</th></tr>';
      const map=new Map(); inRange.filter(s=>s.mode==='focus').forEach(s=>{ const k=s.category||'기타'; map.set(k,(map.get(k)||0)+s.minutes); });
      let total=0; Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{ total+=v; const tr=document.createElement('tr'); tr.innerHTML=`<td>${k}</td><td>${v}</td>`; tbody.appendChild(tr); });
      sumEl.textContent = `합계: ${total}분`;
    } else if (detailMode==='task'){
      thead.innerHTML = '<tr><th>작업</th><th>분</th></tr>';
      const map=new Map(); inRange.filter(s=>s.mode==='focus' && s.task).forEach(s=>{ const t=tasks.find(tt=>tt.id===s.task); const name=t? t.text:'—'; map.set(name,(map.get(name)||0)+s.minutes); });
      let total=0; Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>{ total+=v; const tr=document.createElement('tr'); tr.innerHTML=`<td>${k}</td><td>${v}</td>`; tbody.appendChild(tr); });
      sumEl.textContent = `합계: ${total}분`;
    } else {
      thead.innerHTML = '<tr><th>날짜</th><th>작업</th><th>모드</th><th>분</th></tr>';
      let total=0; inRange.slice().sort((a,b)=>b.ts-a.ts).forEach(s=>{ total+=s.minutes; const t=tasks.find(tt=>tt.id===s.task); const tr=document.createElement('tr'); tr.innerHTML=`<td>${ymd(s.ts)}</td><td>${t? t.text:'—'}</td><td>${s.mode}</td><td>${s.minutes}</td>`; tbody.appendChild(tr); });
      sumEl.textContent = `합계: ${total}분`;
    }
  }
  document.querySelectorAll('.tabs2 button[data-detail]').forEach(b=> b.addEventListener('click', ()=>{ document.querySelectorAll('.tabs2 button[data-detail]').forEach(x=>x.classList.remove('active')); b.classList.add('active'); detailMode=b.dataset.detail; renderDetails(); }));
  renderDetails();

  // Populate filter selects
  (function initFilters(){
    try {
      const cats = Array.from(new Set(sessions.filter(s=>s.category).map(s=> s.category)));
      const catSel = document.getElementById('f-cat');
      cats.forEach(c=>{ const o=document.createElement('option'); o.value=c; o.textContent=c; catSel.appendChild(o); });
      const taskSel = document.getElementById('f-task');
      tasks.forEach(t=>{ const o=document.createElement('option'); o.value=t.id; o.textContent=t.text; taskSel.appendChild(o); });
      ['f-cat','f-task','f-mode'].forEach(id=> document.getElementById(id).addEventListener('change', renderDetails));
    } catch(_){ }
  })();

  // CSV export for current detail view
  document.getElementById('btn-csv').addEventListener('click', ()=>{
    const rows = [['date','task','mode','minutes','category']];
    const period = piePeriod; let start, end;
    if (selectedDay){ const d=new Date(selectedDay); const w=dayWindow(d); start=w.start; end=w.end; }
    else if (period==='day'){ const w=dayWindow(new Date()); start=w.start; end=w.end; }
    else if (period==='week'){ start=weekStart(new Date()); end=weekEnd(new Date()); }
    else { const w=monthWindow(new Date()); start=w.start; end=w.end; }
    let inRange = sessions.filter(s=>{ const dt=new Date(s.ts); return dt>=start && dt<=end; });
    const fcat = document.getElementById('f-cat').value; const ftask = document.getElementById('f-task').value; const fmode = document.getElementById('f-mode').value;
    if (fcat) { inRange = inRange.filter(s=> (s.category||'')===fcat); }
    if (ftask) { inRange = inRange.filter(s=> (s.task||'')===ftask); }
    if (fmode) { inRange = inRange.filter(s=> (s.mode||'')===fmode); }
    inRange.forEach(s=>{ const t=tasks.find(tt=>tt.id===s.task); rows.push([ymd(s.ts), (t? t.text:''), s.mode||'', String(s.minutes||0), s.category||'']); });
    const csv = rows.map(r=> r.map(x=> '"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'focus-sessions.csv'; a.click(); URL.revokeObjectURL(url);
  });
})();
