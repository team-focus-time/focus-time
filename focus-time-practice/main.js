// ---------- Safe helpers / polyfills ----------
const store = {
	get(key, defVal) {
		try {
			const raw = localStorage.getItem(key);
			return raw == null ? defVal : JSON.parse(raw);
		} catch (_) { return defVal; }
	},
	set(key, val) {
		try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {}
	}
};
// Background preset images (static, no external API calls)
const BG_PRESETS = {
    forest: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1600&auto=format&fit=crop',
    city:   'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1600&auto=format&fit=crop',
    ocean:  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1600&auto=format&fit=crop',
    space:  'https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?q=80&w=1600&auto=format&fit=crop',
    sunset: 'https://images.unsplash.com/photo-1501973801540-537f08ccae7b?q=80&w=1600&auto=format&fit=crop'
};

// Apply background and persist
function setBackground(url){
    try {
        document.body.style.setProperty('--bgImage', url||'');
        const sheetUrl = url ? `url('${url}')` : "";
        document.body.style.setProperty('--bgBeforeUrl', sheetUrl);
        if (url) { localStorage.setItem('ft_bg', url); } else { localStorage.removeItem('ft_bg'); }
        // reflect to body::before
        const e = document.createElement('style');
        e.id = 'bg-style';
        e.textContent = `body::before{ background: radial-gradient(1200px 800px at 10% 20%, rgba(167,139,250,.25), transparent 55%), radial-gradient(1200px 800px at 90% 80%, rgba(56,189,248,.18), transparent 55%), var(--bg) ${sheetUrl} center/cover no-repeat !important; }`;
        document.getElementById('bg-style')?.remove();
        document.head.appendChild(e);
    } catch(_){ }
}

// UUID helper
function safeUUID(){
    try { return (crypto?.randomUUID?.() || null); } catch(_){ }
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Global state
const state = {
    mode: 'focus',
    seconds: 25*60,
    timerId: null,
    running: false,
    linkedTask: null,
    settings: { focus:25, short:5, long:15, auto:true, sound:true, accent:'#a78bfa' }
};
function setLinked(task) {
	state.linkedTask = task ? task.id : null;
	const linkedEl = document.getElementById('linked');
	if (linkedEl) {
		if (task) {
			linkedEl.textContent = `Linked: ${task.text}`;
		} else {
			linkedEl.textContent = 'No task linked';
		}
	}
}

const dingEl = document.getElementById('ding');
let audioCtx;
function playBeep(){
	try {
		if (!audioCtx) { audioCtx = new (window.AudioContext||window.webkitAudioContext)(); }
		const ctx = audioCtx;
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.type = 'sine';
		o.frequency.value = 880;
		g.gain.value = 0.001; // start silent to avoid click
		o.connect(g); g.connect(ctx.destination);
		const now = ctx.currentTime;
		g.gain.exponentialRampToValueAtTime(0.1, now + 0.01);
		o.start(now);
		g.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
		o.stop(now + 0.27);
	} catch(_){}
}
const timeEl = document.getElementById('time-display');
const modeBtns = document.querySelectorAll('.mode');
let currentSessionStart = null;
const ringProgressEl = document.querySelector('.ring-progress');
const RADIUS = 100; // matches SVG r
const CIRC = 2 * Math.PI * RADIUS;
const modeMinInput = document.getElementById('mode-min');
const btnStart = document.getElementById('btn-start');
const btnPause = document.getElementById('btn-pause');
const btnReset = document.getElementById('btn-reset');
const btnEndBreak = document.getElementById('btn-end-break');

function modeSeconds(mode){
	const s = state.settings;
	return (mode==='focus'? s.focus : mode==='short'? s.short : s.long) * 60;
}

function switchMode(mode){
	if (!mode) { mode = state.mode; }
	state.mode = mode;
	state.seconds = modeSeconds(mode);
	state.running = false;
	if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
	currentSessionStart = null;
	// update accent colors per mode (only if ring-auto is enabled)
	try {
		if (localStorage.getItem('ft_ring_auto') === '1'){
			if (mode==='focus'){
				document.documentElement.style.setProperty('--accent', '#a78bfa');
				document.documentElement.style.setProperty('--accent2', '#60a5fa');
			} else if (mode==='short'){
				document.documentElement.style.setProperty('--accent', '#2dd4bf');
				document.documentElement.style.setProperty('--accent2', '#22d3ee');
			} else {
				document.documentElement.style.setProperty('--accent', '#3b82f6');
				document.documentElement.style.setProperty('--accent2', '#60a5fa');
			}
		}
		// apply background automatically if enabled
		try {
			if (localStorage.getItem('ft_bg_auto') === '1'){
				const map = { focus:'forest', short:'ocean', long:'city' };
				const key = map[mode] || 'forest';
				const url = BG_PRESETS[key];
				setBackground(url);
			}
		} catch(_){ }
	} catch(_){ }
	// update UI
	modeBtns.forEach(b=>{
		if (b.dataset.mode === mode) { b.classList.add('active'); }
		else { b.classList.remove('active'); }
	});
	updateTime();
	updateRing();
	// UI labels per mode
	try {
		if (btnStart) { btnStart.textContent = (mode==='focus') ? '집중 시작하기' : '휴식 시작하기'; }
		if (btnPause) { btnPause.textContent = '일시정지'; }
		if (btnReset) { btnReset.textContent = (mode==='focus') ? '정지' : '휴식 정지'; }
		if (btnEndBreak) { btnEndBreak.style.display = (mode!=='focus') ? '' : 'none'; }
		if (modeMinInput) {
			modeMinInput.value = String(state.settings[mode]);
		}
	} catch(_){ }
}

function updateTime(){
	if (!timeEl) { return; }
	const m = Math.floor(state.seconds/60).toString().padStart(2,'0');
	const s = (state.seconds%60).toString().padStart(2,'0');
	timeEl.textContent = `${m}:${s}`;
	updateRing();
}

function startTimer(){
	if (state.running) { return; }
	state.running = true;
	if (state.timerId) { clearInterval(state.timerId); }
	if (!currentSessionStart) { currentSessionStart = Date.now(); }
	state.timerId = setInterval(()=>{
		state.seconds -= 1;
		if (state.seconds <= 0){
			clearInterval(state.timerId); state.timerId = null; state.running = false;
			onTimerComplete();
			return;
		}
		updateTime();
	}, 1000);
}

function pauseTimer(){
	state.running = false;
	if (state.timerId) { clearInterval(state.timerId); state.timerId = null; }
}

function resetTimer(){
	pauseTimer();
	state.seconds = modeSeconds(state.mode);
	currentSessionStart = null;
	updateTime();
	updateRing();
}

function pushSession(minutes){
	const s = store.get('ft_sessions', []);
	const end = Date.now();
	const linked = state.linkedTask ? loadTasks().find(t=> t.id===state.linkedTask) : null;
	const category = linked ? (linked.category || 'general') : null;
	s.push({ ts: end, startTs: currentSessionStart || end, endTs: end, mode: state.mode, minutes, task: state.linkedTask, category });
	store.set('ft_sessions', s);
	// If focused task exists and mode is focus, increment task's counters and minutes
	if (state.mode === 'focus' && state.linkedTask){
		const tasks = loadTasks();
		const idx = tasks.findIndex(t=> t.id === state.linkedTask);
		if (idx > -1){
			tasks[idx].donePomo = (tasks[idx].donePomo||0) + 1;
			tasks[idx].totalMinutes = (tasks[idx].totalMinutes||0) + minutes;
			const rep = tasks[idx].repeat || 'none';
			if (rep !== 'none' && tasks[idx].when){
				const d = new Date(tasks[idx].when);
				if (rep === 'daily') { d.setDate(d.getDate()+1); }
				else if (rep === 'weekly') { d.setDate(d.getDate()+7); }
				else if (rep === 'monthly') { d.setMonth(d.getMonth()+1); }
				tasks[idx].when = d.toISOString();
			}
			saveTasks(tasks);
			renderTasks();
		}
	}
}

function onTimerComplete(){
	// record session
	const durationMin = (modeSeconds(state.mode))/60;
	pushSession(durationMin);
	currentSessionStart = null;
	if (state.settings.sound) { playBeep(); }
	// auto cycle
		if (state.settings.auto){
			if (state.mode === 'focus') { switchMode('short'); } else { switchMode('focus'); }
		startTimer();
	} else {
		updateSummary(); renderTable(); renderChart?.(); // refresh dashboards
	}
	updateRing();
}

// Wire timer controls
if (btnStart) { btnStart.onclick = startTimer; }
if (btnPause) { btnPause.onclick = pauseTimer; }
if (btnReset) { btnReset.onclick = resetTimer; }
if (btnEndBreak) {
	btnEndBreak.onclick = ()=>{
		// End current break early: record elapsed (if any) as a short/long session, then switch to focus
		try {
			if (state.mode!=='focus' && currentSessionStart){
				const elapsed = Math.round((modeSeconds(state.mode) - state.seconds)/60);
				if (elapsed>0){
					const s = store.get('ft_sessions', []);
					const end = Date.now();
					s.push({ ts:end, startTs: currentSessionStart, endTs:end, mode: state.mode, minutes: elapsed, task: null, category: null });
					store.set('ft_sessions', s);
				}
			}
		} catch(_){ }
		pauseTimer();
		switchMode('focus');
	};
}
if (modeMinInput){
	modeMinInput.addEventListener('change', ()=>{
		const v = Math.max(1, Math.min(180, parseInt(modeMinInput.value||'25', 10)));
		const m = state.mode;
		state.settings[m] = v;
		// reset current mode duration to new value unless running (Focus To-Do처럼 즉시 반영)
		if (!state.running){
			state.seconds = v*60;
			updateTime();
			updateRing();
		}
	});
}
modeBtns.forEach(b=> b.addEventListener('click', ()=> switchMode(b.dataset.mode)));

// ---------- Storage helpers ----------
const taskText = document.getElementById('task-text');
const taskDate = document.getElementById('task-due-date');
const taskTime = document.getElementById('task-due-time');
const taskEst = document.getElementById('task-est');
const taskCategory = document.getElementById('task-category');
const taskRepeat = document.getElementById('task-repeat');
const listEl = document.getElementById('task-list');


const addTaskBtn = document.getElementById('add-task');
if (addTaskBtn && taskText) {
		addTaskBtn.onclick = () => {
			const text = (taskText?.value || '').trim();
			if (!text) {
				return;
			}
		const when = (taskDate?.value)
			? `${taskDate.value}T${(taskTime?.value) || '09:00'}`
			: null;
		const t = {
			id: safeUUID(),
			text,
			when,
				category: (taskCategory?.value) || 'general',
				repeat: (taskRepeat?.value) || 'none',
			estPomo: Math.max(1, parseInt((taskEst?.value) || '1', 10)),
				donePomo: 0,
				totalMinutes: 0,
			done: false,
			created: Date.now()
		};
		const list = loadTasks();
		list.unshift(t);
		saveTasks(list);
		// refresh category suggestions after adding
		try { renderCategoryDatalist?.(); } catch(_){}
		taskText.value = '';
		renderTasks();
		scheduleDue(t);
	};
}


function loadTasks(){ return store.get('ft_tasks', []); }
function saveTasks(v){ store.set('ft_tasks', v); }

// ---------- Category suggestions (datalist) ----------
function getCategorySuggestions(){
	const set = new Set(['general','habit','study','self']);
	try {
		loadTasks().forEach(t=>{
			if(t?.category){
				const c=String(t.category).trim();
				if(c) { set.add(c); }
			}
		});
	} catch(_){ }
	return Array.from(set);
}
function renderCategoryDatalist(){
	const dl = document.getElementById('category-list');
	if(!dl) { return; }
	dl.innerHTML = '';
	getCategorySuggestions().forEach(c=>{
		const opt = document.createElement('option');
		opt.value = c;
		dl.appendChild(opt);
	});
}


function scheduleDue(task){
		if (!task?.when) {
			return;
		}
		if (typeof Notification === 'undefined') {
			return;
		}
		try {
			if (Notification.permission === 'default') {
				Notification.requestPermission();
			}
		} catch(_){}
	const delay = new Date(task.when).getTime() - Date.now();
	if (delay > 0) {
		setTimeout(() => {
					try {
						if (Notification.permission === 'granted') {
							new Notification('Task due', { body: task.text });
						}
					} catch(_){}
		}, delay);
	}
}


function renderTasks(){ const list=loadTasks(); if(!listEl) { return; } listEl.innerHTML=''; list.forEach(t=>{ const li=document.createElement('li'); li.className='task'+(t.done?' done':''); li.innerHTML=`
<span class="title">${t.text}</span>
<span class="badge">⏱ ${t.donePomo}/${t.estPomo}</span>
<span class="badge">🕒 ${t.totalMinutes||0}m</span>
<span class="badge">🏷 ${t.category||'general'}</span>
<span class="badge">${t.when? fmtYMDHM(new Date(t.when)) : 'no due'}</span>
<button class="btn mini" data-act="link">▶</button>
<button class="btn mini" data-act="toggle">✓</button>
<button class="btn mini danger" data-act="del">✕</button>`;
// inline rename (dblclick title)
const titleEl = li.querySelector('.title');
if (titleEl){
	titleEl.ondblclick = () => {
		const input = document.createElement('input');
		input.className = 'title-input';
		input.value = t.text;
		titleEl.replaceWith(input);
		input.focus(); input.select();
		const idx = list.findIndex(x=>x.id===t.id);
		const save = () => {
			const val = (input.value||'').trim();
			if (val && idx>-1){ list[idx].text = val; saveTasks(list); }
			renderTasks();
		};
		const cancel = () => { renderTasks(); };
		input.addEventListener('keydown', (e)=>{
			if (e.key === 'Enter') { save(); }
			else if (e.key === 'Escape') { cancel(); }
		});
		input.addEventListener('blur', save);
	};
}
const linkBtn = li.querySelector('[data-act="link"]'); if(linkBtn) { linkBtn.onclick = ()=> setLinked(t); }
const toggleBtn = li.querySelector('[data-act="toggle"]'); if(toggleBtn) { toggleBtn.onclick = ()=>{ t.done=!t.done; saveTasks(list); renderTasks(); }; }
// mark completedAt timestamp when toggled to done
if (toggleBtn) {
	toggleBtn.onclick = ()=>{
		t.done = !t.done;
		if (t.done) { t.completedAt = new Date().toISOString(); }
		saveTasks(list); renderTasks();
	};
}
const delBtn = li.querySelector('[data-act="del"]');
if (delBtn) {
	delBtn.onclick = () => {
		const idx = list.findIndex(x => x.id === t.id);
		if (idx > -1) {
			list.splice(idx, 1);
		}
		saveTasks(list);
		renderTasks();
		if (state.linkedTask === t.id) {
			setLinked(null);
		}
	};
}
listEl.appendChild(li); scheduleDue(t);
});
// keep manual session task dropdown in sync
try { refreshManualTaskOptions?.(); } catch(_){ }
// refresh category datalist too
try { renderCategoryDatalist?.(); } catch(_){ }
}


// -------- History / Summary --------
const statHours = document.getElementById('stat-hours');
const statDays = document.getElementById('stat-days');
const statStreak= document.getElementById('stat-streak');


function updateSummary(){ const s = store.get('ft_sessions', []); const totalH = s.reduce((a,b)=> a + (b.mode==='focus'? b.minutes:0)/60, 0); if(statHours) { statHours.textContent = totalH.toFixed(1); } const days = Array.from(new Set(s.map(x=> new Date(x.ts).toISOString().slice(0,10)))); if(statDays) { statDays.textContent = String(days.length); } // streak
let streak=0; const today = new Date(); while(true){ const key=today.toISOString().slice(0,10); if(days.includes(key)){ streak++; today.setDate(today.getDate()-1); } else { break; } } if(statStreak) { statStreak.textContent=String(streak); } }


// Detail table
function renderTable(){ const s=store.get('ft_sessions', []); const tbody=document.querySelector('#session-table tbody'); if(!tbody) { return; } tbody.innerHTML=''; s.slice().reverse().forEach(x=>{ const tr=document.createElement('tr'); const task=loadTasks().find(t=>t.id===x.task); tr.innerHTML=`<td>${fmtYMDHM(x.ts)}</td><td>${task?task.text:'—'}</td><td>${x.mode}</td><td>${x.minutes}</td>`; tbody.appendChild(tr); }); }
function renderTable(){
	const s=store.get('ft_sessions', []);
	const tbody=document.querySelector('#session-table tbody');
	if(!tbody) { return; }
	tbody.innerHTML='';
	const list = s.slice().map((it, idx)=> ({...it, _idx: idx})).reverse();
	list.forEach(x=>{
		const tr=document.createElement('tr');
		const task=loadTasks().find(t=>t.id===x.task);
		const start = x.startTs ? fmtYMDHM(x.startTs) : (x.ts? fmtYMDHM(x.ts) : '—');
		const end = x.endTs ? fmtYMDHM(x.endTs) : (x.ts? fmtYMDHM(x.ts) : '—');
		tr.innerHTML=`
			<td>${start}</td>
			<td>${end}</td>
			<td>${task?task.text:'—'}</td>
			<td>${x.mode}</td>
			<td>${x.minutes}</td>
			<td>
				<button class="btn mini" data-act="edit">Edit</button>
				<button class="btn mini danger" data-act="del">Del</button>
			</td>`;

		// wire delete
			tr.querySelector('[data-act="del"]').onclick = ()=>{
			const all = store.get('ft_sessions', []);
			const orig = all[x._idx];
				if (!orig) { return; }
			// adjust task totals if needed
			if (orig.mode==='focus' && orig.task){
				const tasks = loadTasks();
				const i = tasks.findIndex(t=>t.id===orig.task);
				if (i>-1){
					tasks[i].totalMinutes = Math.max(0, (tasks[i].totalMinutes||0) - (orig.minutes||0));
					tasks[i].donePomo = Math.max(0, (tasks[i].donePomo||0) - Math.max(1, Math.round((orig.minutes||0)/state.settings.focus)));
					saveTasks(tasks);
					renderTasks();
				}
			}
			all.splice(x._idx,1);
			store.set('ft_sessions', all);
			renderTable(); updateSummary(); renderChart?.();
		};

		// wire edit (inline prompt-style for simplicity)
			tr.querySelector('[data-act="edit"]').onclick = ()=>{
			const all = store.get('ft_sessions', []);
			const orig = all[x._idx];
				if (!orig) { return; }
			// collect new values
				const newStart = prompt('Start (YYYY-MM-DD HH:mm)', (x.startTs? new Date(x.startTs): new Date()).toISOString().slice(0,16).replace('T',' '));
				if (!newStart) { return; }
				const newEnd = prompt('End (YYYY-MM-DD HH:mm)', (x.endTs? new Date(x.endTs): new Date()).toISOString().slice(0,16).replace('T',' '));
				if (!newEnd) { return; }
				const newMode = prompt('Mode (focus/short/long)', x.mode||'focus');
				if (!newMode) { return; }
			const newTask = prompt('Task ID (empty for none)', x.task||'');
			const startMs = new Date(newStart.replace(' ', 'T')).getTime();
			const endMs = new Date(newEnd.replace(' ', 'T')).getTime();
			if (!(startMs>0 && endMs>startMs)) { return; }
			const minutes = Math.round((endMs-startMs)/60000);

			// revert old task counters
			if (orig.mode==='focus' && orig.task){
				const tasks = loadTasks();
				const i = tasks.findIndex(t=>t.id===orig.task);
				if (i>-1){
					tasks[i].totalMinutes = Math.max(0, (tasks[i].totalMinutes||0) - (orig.minutes||0));
					tasks[i].donePomo = Math.max(0, (tasks[i].donePomo||0) - Math.max(1, Math.round((orig.minutes||0)/state.settings.focus)));
					saveTasks(tasks);
				}
			}

					// apply (snapshot category if task provided)
					let newCategory = null;
					if (newTask) {
						const t = loadTasks().find(tt=>tt.id===newTask);
						newCategory = t ? (t.category || 'general') : null;
					}
					all[x._idx] = { ts: endMs, startTs: startMs, endTs: endMs, mode: newMode, minutes, task: newTask||null, category: newCategory };
			store.set('ft_sessions', all);

			// apply new task counters
			if (newMode==='focus' && newTask){
				const tasks = loadTasks();
				const i = tasks.findIndex(t=>t.id===newTask);
				if (i>-1){
					tasks[i].totalMinutes = (tasks[i].totalMinutes||0) + minutes;
					tasks[i].donePomo = (tasks[i].donePomo||0) + Math.max(1, Math.round(minutes / state.settings.focus));
					saveTasks(tasks);
				}
			}
			renderTasks(); renderTable(); updateSummary(); renderChart?.();
		};

		tbody.appendChild(tr);
	});
}

// Manual session entry
function refreshManualTaskOptions(){
	const sel = document.getElementById('manual-task');
	if (!sel) { return; }
	sel.innerHTML = '<option value="">— No task —</option>';
	loadTasks().forEach(t=>{
		const opt = document.createElement('option');
		opt.value = t.id; opt.textContent = t.text;
		sel.appendChild(opt);
	});
}

function addManualSession(){
	const taskId = (document.getElementById('manual-task')?.value)||'';
	const mode = (document.getElementById('manual-mode')?.value)||'focus';
	const startStr = document.getElementById('manual-start')?.value;
	const endStr = document.getElementById('manual-end')?.value;
	if (!startStr || !endStr) { return; }
	const start = new Date(startStr).getTime();
	const end = new Date(endStr).getTime();
	if (!(start>0 && end>start)) { return; }
	const minutes = Math.round((end-start)/60000);
	const s = store.get('ft_sessions', []);
	// snapshot category if task present
	let cat = null;
	if (taskId) {
		const t = loadTasks().find(tt=>tt.id===taskId);
		cat = t ? (t.category || 'general') : null;
	}
	s.push({ ts: end, startTs: start, endTs: end, mode, minutes, task: taskId||null, category: cat });
	store.set('ft_sessions', s);
	if (mode==='focus' && taskId){
		const tasks = loadTasks();
		const idx = tasks.findIndex(t=>t.id===taskId);
		if (idx>-1){
			tasks[idx].totalMinutes = (tasks[idx].totalMinutes||0) + minutes;
			tasks[idx].donePomo = (tasks[idx].donePomo||0) + Math.max(1, Math.round(minutes / state.settings.focus));
			const rep = tasks[idx].repeat || 'none';
			if (rep !== 'none' && tasks[idx].when){
				const d = new Date(tasks[idx].when);
				if (rep === 'daily') { d.setDate(d.getDate()+1); }
				else if (rep === 'weekly') { d.setDate(d.getDate()+7); }
				else if (rep === 'monthly') { d.setMonth(d.getMonth()+1); }
				tasks[idx].when = d.toISOString();
			}
			saveTasks(tasks);
			renderTasks();
		}
	}
	updateSummary(); renderTable(); renderChart?.();
}

document.getElementById('manual-add')?.addEventListener('click', addManualSession);
refreshManualTaskOptions();


// Chart
let chart, chartRange='week', chartIdx=0; const segBtns=document.querySelectorAll('.seg-btn');
segBtns.forEach(b=> b.addEventListener('click', ()=>{ segBtns.forEach(x=>x.classList.remove('active')); b.classList.add('active'); chartRange=b.dataset.range; chartIdx=0; renderChart(); }));
const btnPrev = document.getElementById('btn-prev'); if(btnPrev) { btnPrev.onclick = ()=>{ chartIdx++; renderChart(); }; }
const btnNext = document.getElementById('btn-next'); if(btnNext) { btnNext.onclick = ()=>{ chartIdx=Math.max(0, chartIdx-1); renderChart(); }; }


function period(range, idx){
	const s=store.get('ft_sessions',[]).filter(x=>x.mode==='focus');
	const len=range==='week'?7:range==='month'?30:365;
	const end=new Date();
	if(idx>0){
		end.setDate(end.getDate()-(range==='week'?7:range==='month'?30:365)*idx);
	}
	const start=new Date(end);
	start.setDate(start.getDate()-(len-1));
	const map=new Map();
	for(let i=0;i<len;i++){
		const d=new Date(start);
		d.setDate(start.getDate()+i);
		map.set(d.toISOString().slice(0,10), 0);
	}
	s.forEach(x=>{
		const k=new Date(x.ts).toISOString().slice(0,10);
		if(map.has(k)){
			map.set(k, map.get(k)+ x.minutes/60);
		}
	});
	return { labels:[...map.keys()], values:[...map.values()].map(v=>+v.toFixed(2)) };
}


function renderChart(){ const {labels,values}=period(chartRange,chartIdx); const canvas=document.getElementById('focusChart'); if(canvas && typeof Chart!=='undefined'){ const ctx=canvas.getContext('2d'); if(chart) { chart.destroy(); } chart=new Chart(ctx,{ type:'bar', data:{ labels, datasets:[{ data:values, label:'hours' }] }, options:{ plugins:{ legend:{display:false} }, scales:{ y:{beginAtZero:true} } } }); } const labelEl=document.getElementById('range-label'); if(labelEl) { labelEl.textContent = chartIdx===0? `This ${chartRange}` : `${chartIdx} ${chartRange}(s) ago`; } updateSummary(); renderTable(); }

// ---------- Focused time widget (category bars) ----------
(function initFocusedWidget(){
	const container = document.getElementById('focused-widget');
	if (!container) { return; }
	let fwRange = 'day';
	let fwIdx = 0;
	const fwTotalEl = document.getElementById('fw-total');
	const fwLabelEl = document.getElementById('fw-label');
	const fwListEl = document.getElementById('fw-list');

	function getWindow(range, idx){
		if (range==='day'){
			const base = new Date(); base.setDate(base.getDate()-idx);
			const start = new Date(base); start.setHours(0,0,0,0);
			const stop = new Date(base); stop.setHours(23,59,59,999);
			return {start, stop, label: idx===0? '오늘':'오늘 이전 '+idx+'일'};
		}
		if (range==='week'){
			const now = new Date(); const day=(now.getDay()+6)%7; now.setDate(now.getDate()-day - 7*idx);
			const start = new Date(now); start.setHours(0,0,0,0);
			const stop = new Date(start); stop.setDate(start.getDate()+6); stop.setHours(23,59,59,999);
			return {start, stop, label: idx===0? '이번 주': `${idx}주 전`};
		}
		const now = new Date(); now.setMonth(now.getMonth()-idx, 1);
		const start = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0);
		const stop = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59,999);
		return {start, stop, label: idx===0? '이번 달': `${idx}달 전`};
	}

	function render(){
		const {start, stop, label} = getWindow(fwRange, fwIdx);
		// aggregate focus minutes by category
		const sessions = store.get('ft_sessions', []).filter(x=> x.mode==='focus' && x.ts>=start.getTime() && x.ts<=stop.getTime());
		const catMap = new Map(); let total = 0;
		sessions.forEach(s=>{
			const key = s.category || '기타';
			catMap.set(key, (catMap.get(key)||0) + (s.minutes||0));
			total += (s.minutes||0);
		});
		// render total
		if (fwTotalEl) { fwTotalEl.textContent = String(total); }
		if (fwLabelEl) { fwLabelEl.textContent = label; }
		// render bars
		if (fwListEl){
			fwListEl.innerHTML='';
			const max = Math.max(1, ...Array.from(catMap.values()));
			if (catMap.size===0){
				const row = document.createElement('div');
				row.className = 'fw-row';
				row.innerHTML = `<div class="fw-name">—</div><div class="fw-min">0분</div>`;
				const bar = document.createElement('div'); bar.className='fw-bar';
				const fill = document.createElement('span'); fill.style.width='0%'; bar.appendChild(fill);
				const wrap = document.createElement('div'); wrap.style.gridColumn='1 / span 2'; wrap.style.marginTop='4px'; wrap.appendChild(bar);
				fwListEl.appendChild(row); fwListEl.appendChild(wrap);
			} else {
				Array.from(catMap.entries()).sort((a,b)=> b[1]-a[1]).forEach(([name, minutes])=>{
					const row = document.createElement('div'); row.className='fw-row';
					row.innerHTML = `<div class="fw-name">${name}</div><div class="fw-min">${minutes}분</div>`;
					const bar = document.createElement('div'); bar.className='fw-bar';
					const fill = document.createElement('span'); fill.style.width = `${Math.round((minutes/max)*100)}%`;
					bar.appendChild(fill);
					const wrap = document.createElement('div'); wrap.style.gridColumn='1 / span 2'; wrap.style.marginTop='4px'; wrap.appendChild(bar);
					fwListEl.appendChild(row); fwListEl.appendChild(wrap);
				});
			}
		}
	}

	// events
	document.querySelectorAll('[data-fw-range]')?.forEach(b=>{
		b.addEventListener('click', ()=>{
			document.querySelectorAll('[data-fw-range]')?.forEach(x=>x.classList.remove('active'));
			b.classList.add('active');
			fwRange = b.getAttribute('data-fw-range')||'day';
			fwIdx = 0;
			render();
		});
	});
	document.getElementById('fw-prev')?.addEventListener('click', ()=>{ fwIdx++; render(); });
	document.getElementById('fw-next')?.addEventListener('click', ()=>{ fwIdx = Math.max(0, fwIdx-1); render(); });
	document.getElementById('fw-view')?.addEventListener('click', ()=>{
		// switch to Detail pane quickly
		document.querySelector('.tab[data-tab="detail"]')?.click();
	});

	// initial
	render();
	// re-render when data changes
	const _renderTable = renderTable;
	window.renderTable = function(){ _renderTable(); try { render(); } catch(_){ } };
	const _updateSummary = updateSummary;
	window.updateSummary = function(){ _updateSummary(); try { render(); } catch(_){ } };
})();


// Tabs inside History
const tabs=document.querySelectorAll('.tab'); const panes={ summary:document.getElementById('summary'), detail:document.getElementById('detail') };
tabs.forEach(t=> t.addEventListener('click', ()=>{ tabs.forEach(x=>x.classList.remove('active')); t.classList.add('active'); Object.values(panes).forEach(p=> { if(p) { p.classList.add('hidden'); } }); const pane = panes[t.dataset.tab]; if(pane) { pane.classList.remove('hidden'); } if(t.dataset.tab==='summary') { renderChart(); } else { renderTable(); } }));


// ---------- Boot ----------
try { switchMode('focus'); } catch(_){}  
try { updateTime(); } catch(_){}
renderTasks(); updateSummary(); renderTable();
// Populate category datalist on boot
try { renderCategoryDatalist?.(); } catch(_){ }

// ---------- Utilities ----------
function fmtYMDHM(d){
	try {
		const dt = (d instanceof Date) ? d : new Date(d);
	if (!(dt instanceof Date) || isNaN(dt.getTime())) { return '—'; }
		const yyyy = dt.getFullYear();
		const mm = String(dt.getMonth()+1).padStart(2,'0');
		const dd = String(dt.getDate()).padStart(2,'0');
		const hh = String(dt.getHours()).padStart(2,'0');
		const mi = String(dt.getMinutes()).padStart(2,'0');
		return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
	} catch(_) { return '—'; }
}

function updateRing(){
	if (!ringProgressEl) { return; }
	const total = modeSeconds(state.mode);
	const done = Math.max(0, Math.min(1, 1 - (state.seconds / total)));
	const dash = `${(done * CIRC).toFixed(1)} ${CIRC.toFixed(1)}`;
	ringProgressEl.setAttribute('stroke-dasharray', dash);
}

// ---------- Ring customization ----------
(function initRingCustomization(){
	try {
		const autoChk = document.getElementById('ring-auto');
		const c1 = document.getElementById('ring-c1');
		const c2 = document.getElementById('ring-c2');
		const w = document.getElementById('ring-w');
		// load saved
		const savedAuto = localStorage.getItem('ft_ring_auto');
		if (savedAuto!=null && autoChk) { autoChk.checked = savedAuto==='1'; }
		const savedC1 = localStorage.getItem('ft_ring_c1'); if (savedC1 && c1){ c1.value = savedC1; }
		const savedC2 = localStorage.getItem('ft_ring_c2'); if (savedC2 && c2){ c2.value = savedC2; }
		const savedW = localStorage.getItem('ft_ring_w'); if (savedW && w){ w.value = savedW; document.documentElement.style.setProperty('--ringWidth', savedW); }

		function applyManual(){
			if (!autoChk?.checked){
				if (c1?.value) { document.documentElement.style.setProperty('--accent', c1.value); }
				if (c2?.value) { document.documentElement.style.setProperty('--accent2', c2.value); }
			}
			if (w?.value) { document.documentElement.style.setProperty('--ringWidth', w.value); }
		}
		autoChk?.addEventListener('change', ()=>{
			localStorage.setItem('ft_ring_auto', autoChk.checked?'1':'0');
			if (autoChk.checked){
				// apply current mode's colors instantly
				const m = state.mode;
				if (m==='focus'){
					document.documentElement.style.setProperty('--accent', '#a78bfa');
					document.documentElement.style.setProperty('--accent2', '#60a5fa');
				} else if (m==='short'){
					document.documentElement.style.setProperty('--accent', '#2dd4bf');
					document.documentElement.style.setProperty('--accent2', '#22d3ee');
				} else {
					document.documentElement.style.setProperty('--accent', '#3b82f6');
					document.documentElement.style.setProperty('--accent2', '#60a5fa');
				}
			} else {
				// switch to manual palette
				applyManual();
			}
		});
		c1?.addEventListener('input', ()=>{ localStorage.setItem('ft_ring_c1', c1.value); applyManual(); });
		c2?.addEventListener('input', ()=>{ localStorage.setItem('ft_ring_c2', c2.value); applyManual(); });
		w?.addEventListener('input', ()=>{ localStorage.setItem('ft_ring_w', w.value); applyManual(); updateRing(); });
		applyManual();
	} catch(_){ }
})();

// ---------- Background switcher ----------
(function initBackground(){
	try {
		const btnSet = document.getElementById('btn-bg');
		const btnReset = document.getElementById('btn-bg-reset');
		const apply = (url)=> setBackground(url);
		const saved = localStorage.getItem('ft_bg');
		if (saved) { apply(saved); }
		btnSet?.addEventListener('click', async ()=>{
			try {
				// let user paste an image URL (local file paths won't work due to browser sandboxing)
				const url = prompt('배경 이미지 URL을 입력하세요 (Unsplash 이미지 권장)');
				if (!url) { return; }
				apply(url);
			} catch(_){ }
		});
		btnReset?.addEventListener('click', ()=> apply(''));
		// Preset chips using static mapping
		document.querySelectorAll('.bg-presets .chip')?.forEach(chip=>{
			chip.addEventListener('click', ()=>{
				const key = chip.getAttribute('data-bg-key')||'forest';
				const url = BG_PRESETS[key] || BG_PRESETS.forest;
				apply(url);
			});
		});

		// Mode-based auto background toggle persistence
		const bgAuto = document.getElementById('bg-auto');
		if (bgAuto){
			const savedAuto = localStorage.getItem('ft_bg_auto')==='1';
			bgAuto.checked = savedAuto;
			bgAuto.addEventListener('change', ()=>{
				localStorage.setItem('ft_bg_auto', bgAuto.checked ? '1' : '0');
				if (bgAuto.checked){
					// immediately apply for current mode
					try {
						const map = { focus:'forest', short:'ocean', long:'city' };
						const key = map[state.mode] || 'forest';
						setBackground(BG_PRESETS[key]);
					} catch(_){ }
				}
			});
		}
	} catch(_){ }
})();

// ---------- Date/Time Pickers ----------
(function initPickers(){
	try {
		if (typeof flatpickr === 'undefined') { return; }
		const dateEl = document.getElementById('task-due-date');
		if (dateEl) {
			flatpickr(dateEl, { dateFormat: 'Y-m-d', allowInput: true });
		}
		const timeEl = document.getElementById('task-due-time');
		if (timeEl) {
			flatpickr(timeEl, { enableTime: true, noCalendar: true, dateFormat: 'H:i', time_24hr: true, allowInput: true });
		}
		const startEl = document.getElementById('manual-start');
		if (startEl) {
			flatpickr(startEl, { enableTime: true, dateFormat: 'Y-m-d\\TH:i', time_24hr: true, allowInput: true });
		}
		const endEl = document.getElementById('manual-end');
		if (endEl) {
			flatpickr(endEl, { enableTime: true, dateFormat: 'Y-m-d\\TH:i', time_24hr: true, allowInput: true });
		}
	} catch(_){ }
})();