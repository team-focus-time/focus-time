// 전역 변수
let currentDate = new Date();
let selectedDate = new Date();
let todos = JSON.parse(localStorage.getItem("focusTodos")) || {};
let isModalOpen = false;
let editingTodoId = null;

// 초기화
document.addEventListener("DOMContentLoaded", function () {
  updateDateDisplay();
  generateCalendar();
  loadTodos();

  // 이벤트 리스너 등록
  document.getElementById("prevBtn").addEventListener("click", () => changeDate(-1));
  document.getElementById("nextBtn").addEventListener("click", () => changeDate(1));

  document.getElementById("openModalBtn").addEventListener("click", toggleAddModal);
  document.getElementById("closeModalBtn").addEventListener("click", toggleAddModal);
  document.getElementById("addTaskBtn").addEventListener("click", saveTodo);

  document.getElementById("hoursUpBtn").addEventListener("click", () => adjustTime("hours", 1));
  document.getElementById("minutesUpBtn").addEventListener("click", () => adjustTime("minutes", 1));
  document.getElementById("hoursDownBtn").addEventListener("click", () => adjustTime("hours", -1));
  document.getElementById("minutesDownBtn").addEventListener("click", () => adjustTime("minutes", -1));

  document.getElementById("hoursInput").addEventListener("input", updateTimeDisplay);
  document.getElementById("minutesInput").addEventListener("input", updateTimeDisplay);

  // 카테고리 드롭다운 색상
  const categorySelect = document.getElementById("categorySelect");
  categorySelect.addEventListener("change", function () {
    const category = this.value.toLowerCase();
    this.className = `category-dropdown ${category}`;
  });
  categorySelect.className = "category-dropdown work";

  /* Persist tasks under 'ft_tasks' and broadcast update */
  function saveTasksToStorage(tasks){
    try {
      const json = JSON.stringify(tasks || []);
      localStorage.setItem('ft_tasks', json);
      console.log('[TodoList] saved ft_tasks:', tasks);
      // same-tab broadcast
      window.dispatchEvent(new CustomEvent('ft-tasks-updated', { detail: tasks || [] }));
      // also emit a short-lived log event for other listeners
      window.dispatchEvent(new CustomEvent('ft-tasks-debug', { detail: { ts: Date.now(), count: (tasks||[]).length } }));
    } catch(e){
      console.error('[TodoList] saveTasksToStorage error', e);
    }
  }

  /* Helper to load tasks */
  function loadTasksFromStorage(){
    try { return JSON.parse(localStorage.getItem('ft_tasks') || '[]'); } catch(e){ return []; }
  }

  /* Example: ensure your add/edit/remove logic calls saveTasksToStorage.
     If your file has functions like addTodo/removeTodo/editTodo, update them to call saveTasksToStorage(updatedTasks).
     Here's a generic wrapper you can call from your existing code when tasks change: */
  function persistAndRender(updatedTasks){
    saveTasksToStorage(updatedTasks);
    if (typeof renderTodoList === 'function') renderTodoList(updatedTasks);
  }

  // React to other-tab changes (update UI in this tab)
  window.addEventListener('storage', (e) => {
    if (e.key === 'ft_tasks') {
      try {
        const tasks = JSON.parse(e.newValue || '[]');
        if (typeof renderTodoList === 'function') renderTodoList(tasks);
        window.dispatchEvent(new CustomEvent('ft-tasks-updated', { detail: tasks }));
      } catch(err){ /* ignore */ }
    }
  });

  // Quick debug helper: call window.saveTasksToStorage([...]) from console to test
  window.saveTasksToStorage = saveTasksToStorage;
  window.loadTasksFromStorage = loadTasksFromStorage;
});

/*
  Sync helpers: persist under 'ft_tasks' and broadcast update so history listens.
  This block is safe to append: it will wrap existing global add/edit/remove functions if present,
  and also wire common form/button handlers if they exist.
*/
(function(){
  function saveTasksToStorage(tasks){
    try {
      const json = JSON.stringify(tasks || []);
      localStorage.setItem('ft_tasks', json);
      console.log('[TodoList] saved ft_tasks:', tasks);
      // same-tab broadcast
      window.dispatchEvent(new CustomEvent('ft-tasks-updated', { detail: tasks || [] }));
      // also emit a short-lived log event for other listeners
      window.dispatchEvent(new CustomEvent('ft-tasks-debug', { detail: { ts: Date.now(), count: (tasks||[]).length } }));
    } catch(e){
      console.error('[TodoList] saveTasksToStorage error', e);
    }
  }
  function loadTasksFromStorage(){
    try { return JSON.parse(localStorage.getItem('ft_tasks')||'[]'); } catch(e){ return []; }
  }

  // expose for console debugging
  window.saveTasksToStorage = saveTasksToStorage;
  window.loadTasksToStorage = loadTasksFromStorage;

  // Utility to try to wrap existing functions that add/update/delete todos so they call saveTasksToStorage after running.
  function safeWrap(fnName, after){
    try {
      const orig = window[fnName];
      if (typeof orig === 'function') {
        window[fnName] = function(...args){
          const res = orig.apply(this, args);
          try { after(); } catch(e){ console.error(fnName + ' after error', e); }
          return res;
        };
        return true;
      }
    } catch(e){}
    return false;
  }

  // If your code has canonical functions, wrap them.
  // Common names: addTodo, createTask, saveTask, persistTasks, removeTodo, editTodo
  const wrapperNames = ['addTodo','createTask','saveTask','persistTasks','removeTodo','editTodo'];
  wrapperNames.forEach(name => {
    safeWrap(name, ()=> {
      // attempt to collect current tasks and persist under ft_tasks
      // If the app already keeps a tasks array in window.tasks / window.TASKS, prefer that.
      let tasks = null;
      if (window.tasks && Array.isArray(window.tasks)) tasks = window.tasks;
      else if (window.TASKS && Array.isArray(window.TASKS)) tasks = window.TASKS;
      else {
        // fallback: try to read UI via a render function if available
        try { tasks = JSON.parse(localStorage.getItem('ft_tasks')||'[]'); } catch(e){ tasks = []; }
      }
      saveTasksToStorage(tasks || []);
    });
  });

  // If there's a form with id or class that adds tasks, hook submit to ensure storage sync
  document.addEventListener('DOMContentLoaded', ()=>{
    const maybeForms = [
      document.getElementById('todoForm'),
      document.querySelector('form#todoForm'),
      document.querySelector('form[data-role="todo-form"]'),
      document.querySelector('.todo-form')
    ].filter(Boolean);
    maybeForms.forEach(f => {
      f.addEventListener('submit', (ev)=>{
        // allow original submit to run first (defer)
        setTimeout(()=>{
          // try to get app tasks if available
          let tasks = null;
          if (window.tasks && Array.isArray(window.tasks)) tasks = window.tasks;
          else if (typeof renderTodoList === 'function') {
            // assume renderTodoList uses localStorage; read from storage
            try { tasks = JSON.parse(localStorage.getItem('ft_tasks')||'[]'); } catch(e){ tasks = []; }
          } else {
            try { tasks = JSON.parse(localStorage.getItem('ft_tasks')||'[]'); } catch(e){ tasks = []; }
          }
          saveTasksToStorage(tasks || []);
        }, 10);
      }, {capture:true});
    });

    // hook add buttons (common patterns)
    const addBtns = document.querySelectorAll('[data-action="add-todo"], .add-todo, #addTodoBtn');
    addBtns.forEach(btn => {
      btn.addEventListener('click', ()=>{
        setTimeout(()=> {
          try {
            const tasks = JSON.parse(localStorage.getItem('ft_tasks')||'[]');
            saveTasksToStorage(tasks || []);
          } catch(e){}
        }, 50);
      });
    });
  });

  // respond to storage events from other tabs and update this UI if a render function exists
  window.addEventListener('storage', (e)=>{
    if (e.key === 'ft_tasks') {
      try {
        const tasks = JSON.parse(e.newValue || '[]');
        if (typeof renderTodoList === 'function') renderTodoList(tasks);
        window.dispatchEvent(new CustomEvent('ft-tasks-updated', { detail: tasks }));
      } catch(err){}
    }
  });
})();

/* Sync helper: parse DOM todo items and persist as ft_tasks, broadcast update */
(function(){
  function escapeText(el){ return el ? el.textContent.trim() : ''; }
  function parseDuration(text){
    if(!text) return 0;
    const m = String(text).match(/(\d+)\s*M/i);
    return m ? parseInt(m[1],10) : 0;
  }

  // parseDomTasks에서 tag 추출 수정: 'category-tag'를 제외
  function parseDomTasks(){
    const nodes = document.querySelectorAll('.todo-item');
    const tasks = Array.from(nodes).map((node, idx) => {
      const id = node.dataset.id || ('dom-'+(node.id||Date.now())+'-'+idx);
      const time = escapeText(node.querySelector('.time-display'));
      const mins = parseDuration(escapeText(node.querySelector('.duration-badge')));
      const title = escapeText(node.querySelector('.todo-text'));
      const tagEl = node.querySelector('.category-tag');
      let tag = 'work';
      if (tagEl) {
        const cls = Array.from(tagEl.classList).find(c=>c.startsWith('category-') && c !== 'category-tag');
        if (cls) tag = cls.replace('category-','');
        else tag = tagEl.textContent.trim().toLowerCase();
      }
      const done = node.querySelector('.todo-checkbox')?.classList.contains('checked') || node.querySelector('.todo-text')?.classList.contains('completed') || false;
      // date: try data-date on parent containers or fallback to selected date
      const date = node.dataset.date || node.closest('[data-date]')?.getAttribute('data-date') || getLocalDateKey(selectedDate);
      return { id, date, time, title, mins: mins||0, tag, done };
    });
    return tasks;
  }

  function saveTasksToStorage(tasks){
    try {
      localStorage.setItem('ft_tasks', JSON.stringify(tasks || []));
      window.dispatchEvent(new CustomEvent('ft-tasks-updated', { detail: tasks || [] }));
    } catch(e){
      console.error('saveTasksToStorage', e);
    }
  }

  // debounce helper
  let saveTimer = null;
  function scheduleSaveFromDOM(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(()=>{
      try {
        const tasks = parseDomTasks();
        saveTasksToStorage(tasks);
      } catch(e){ console.error(e); }
    }, 80);
  }

  // Observe DOM additions/removals of .todo-item
  const observer = new MutationObserver(muts=>{
    let relevant = false;
    for(const m of muts){
      if (m.addedNodes?.length || m.removedNodes?.length || m.type === 'attributes'){
        // check nodes for todo-item
        const all = [...m.addedNodes || [], ...m.removedNodes || []];
        if (all.some(n => (n.nodeType===1 && (n.matches && n.matches('.todo-item')) ) || (n.querySelector && n.querySelector('.todo-item')) )) relevant = true;
        if (m.target && m.target.matches && m.target.matches('.todo-item')) relevant = true;
      }
      if (relevant) break;
    }
    if (relevant) scheduleSaveFromDOM();
  });

  document.addEventListener('DOMContentLoaded', ()=>{
    // attempt to observe a reasonable container to limit scope
    const container = document.querySelector('#todoList') || document.querySelector('.todo-list') || document.body;
    try { observer.observe(container, { childList:true, subtree:true, attributes:true, attributeFilter:['class','data-date'] }); } catch(e){}
    // initial snapshot -> ensure ft_tasks exists
    scheduleSaveFromDOM();

    // catch explicit delete buttons
    document.body.addEventListener('click', (e)=>{
      const d = e.target.closest && e.target.closest('.delete-btn');
      if (!d) return;
      // small delay to let UI remove element, then resync
      setTimeout(scheduleSaveFromDOM, 40);
    });

    // if there are add buttons that directly create DOM nodes, ensure click triggers resync
    document.body.addEventListener('click', (e)=>{
      const add = e.target.closest && e.target.closest('[data-action="add-todo"], .add-todo, #addTodoBtn');
      if (add) setTimeout(scheduleSaveFromDOM, 60);
    });
  });

  // expose for manual debugging
  window.parseDomTasks = parseDomTasks;
  window.saveTasksToStorage = saveTasksToStorage;
})();

/* ===== 자동 동기화: DOM .todo-item -> localStorage 'ft_tasks' ===== */
(function(){
  function text(el){ return el ? el.textContent.trim() : ''; }
  function parseMins(s){
    if (!s) return 0;
    const m = String(s).match(/(\d+)\s*M/i);
    return m ? parseInt(m[1],10) : 0;
  }

  function parseTodoNode(node, idx){
    const id = node.dataset.id || `dom-${Date.now()}-${idx}`;
    const time = text(node.querySelector('.time-display')) || '';
    const mins = parseMins(text(node.querySelector('.duration-badge')));
    const titleEl = node.querySelector('.todo-text');
    const title = titleEl ? titleEl.textContent.trim() : '';
    const tagEl = node.querySelector('.category-tag');
    let tag = 'work';
    if (tagEl){
      const found = Array.from(tagEl.classList || []).find(c => c.startsWith('category-'));
      if (found) tag = found.replace('category-','');
      else tag = tagEl.textContent.trim().toLowerCase() || 'work';
    }
    const done = !!node.querySelector('.todo-checkbox.checked') || !!(titleEl && titleEl.classList.contains('completed'));
    // date: try data-date on node or ancestor; fallback to today
    const date = node.dataset.date || node.closest('[data-date]')?.getAttribute('data-date') || (new Date()).toISOString().slice(0,10);
    return { id, date, time, title, mins: mins||0, tag, done };
  }

  function collectDomTasks(){
    const nodes = Array.from(document.querySelectorAll('.todo-item'));
    return nodes.map((n,i) => parseTodoNode(n,i));
  }

  function saveTasks(tasks){
    try {
      localStorage.setItem('ft_tasks', JSON.stringify(tasks || []));
      console.log('[TodoList] synced ft_tasks ->', tasks.length);
      window.dispatchEvent(new CustomEvent('ft-tasks-updated', { detail: tasks || [] }));
    } catch(e){
      console.error('[TodoList] saveTasks error', e);
    }
  }

  // Debounced sync
  let t = 0;
  function scheduleSync(delay=80){
    clearTimeout(t);
    t = setTimeout(()=> {
      try { saveTasks(collectDomTasks()); } catch(e){ console.error(e); }
    }, delay);
  }

  // Observe additions/removals/attribute changes affecting todo items
  const observer = new MutationObserver(muts => {
    let relevant = false;
    for (const m of muts){
      if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) {
        relevant = [...m.addedNodes, ...m.removedNodes].some(n => (n.nodeType===1 && (n.matches && n.matches('.todo-item'))) || (n.querySelector && n.querySelector('.todo-item')));
      }
      if (!relevant && m.type === 'attributes' && m.target && m.target.matches && m.target.matches('.todo-item, .todo-item *')) relevant = true;
      if (relevant) break;
    }
    if (relevant) scheduleSync();
  });

  document.addEventListener('DOMContentLoaded', ()=>{
    const container = document.querySelector('#todoList') || document.querySelector('.todo-list') || document.body;
    try { observer.observe(container, { childList:true, subtree:true, attributes:true, attributeFilter:['class','data-date'] }); } catch(e){ console.warn('observer failed', e); }
    // initial sync
    scheduleSync(30);

    // clicks: delete/add buttons often manipulate DOM -> resync after short delay
    document.body.addEventListener('click', (ev)=>{
      if (ev.target.closest && (ev.target.closest('.delete-btn') || ev.target.closest('[data-action="add-todo"]') || ev.target.closest('.add-todo') || ev.target.closest('#addTodoBtn'))) {
        setTimeout(()=> scheduleSync(60), 40);
      }
    }, true);
  });

  // expose for debugging
  window.syncTodoDomToStorage = () => { saveTasks(collectDomTasks()); return collectDomTasks(); };
})();

/* ===== ft_tasks 동기화 보강: DOM + 내부 배열 감지, 수동/자동 동기화 API 추가 ===== */
(function(){
  function text(el){ return el ? el.textContent.trim() : ''; }
  function parseMins(s){ if(!s) return 0; const m = String(s).match(/(\d+)\s*M/i); return m ? parseInt(m[1],10) : 0; }

  function parseTodoNode(node, idx){
    const id = node.dataset.id || `dom-${Date.now()}-${idx}`;
    const time = text(node.querySelector('.time-display')) || '';
    const mins = parseMins(text(node.querySelector('.duration-badge')));
    const titleEl = node.querySelector('.todo-text');
    const title = titleEl ? titleEl.textContent.trim() : '';
    const tagEl = node.querySelector('.category-tag');
    let tag = 'work';
    if (tagEl){
      const found = Array.from(tagEl.classList || []).find(c => c.startsWith('category-'));
      if (found) tag = found.replace('category-','');
      else tag = (tagEl.textContent||'').trim().toLowerCase() || 'work';
    }
    const done = !!node.querySelector('.todo-checkbox.checked') || !!(titleEl && titleEl.classList.contains('completed'));
    const date = node.dataset.date || node.closest('[data-date]')?.getAttribute('data-date') || (new Date()).toISOString().slice(0,10);
    return { id, date, time, title, mins: mins||0, tag, done };
  }

  function collectDomTasks(){
    return Array.from(document.querySelectorAll('.todo-item')).map((n,i)=> parseTodoNode(n,i));
  }

  function collectAppTasksFallback(){
    // 우선 window.tasks / window.TASKS 같은 내부 변수 우선 사용
    if (window.tasks && Array.isArray(window.tasks)) return window.tasks;
    if (window.TASKS && Array.isArray(window.TASKS)) return window.TASKS;
    // fallback: DOM 파싱
    return collectDomTasks();
  }

  function saveFtTasks(tasks){
    try {
      localStorage.setItem('ft_tasks', JSON.stringify(tasks||[]));
      console.log('[TodoList] ft_tasks synced ->', (tasks||[]).length);
      window.dispatchEvent(new CustomEvent('ft-tasks-updated', { detail: tasks||[] }));
    } catch(e){
      console.error('[TodoList] saveFtTasks', e);
    }
  }

  // Debounced sync that prefers app state but falls back to DOM
  let syncTimer = 0;
  function syncFtTasks(debounce = 60){
    clearTimeout(syncTimer);
    syncTimer = setTimeout(()=>{
      try {
        const appTasks = collectAppTasksFallback();
        // normalize items to ensure {date, mins, title, tag, time, id}
        const norm = (appTasks||[]).map((t,i) => {
          if (!t) return null;
          if (typeof t === 'string') return null;
          return {
            id: t.id ?? t._id ?? `a-${i}`,
            date: t.date || t.day || (new Date()).toISOString().slice(0,10),
            time: t.time || t.start || '',
            title: t.title || t.text || '',
            mins: Number(t.mins || t.duration || 0),
            tag: t.tag || (t.category && String(t.category).toLowerCase()) || 'work',
            done: !!t.done
          };
        }).filter(Boolean);
        // if no app tasks, use DOM parse
        const out = (norm.length>0) ? norm : collectDomTasks();
        saveFtTasks(out);
      } catch(e){ console.error('[TodoList] sync error', e); }
    }, debounce);
  }

  // observe DOM changes (new .todo-item nodes) and hook common add/delete UI actions
  const observer = new MutationObserver(muts=>{
    let should = false;
    for (const m of muts){
      if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) {
        if ([...m.addedNodes, ...m.removedNodes].some(n => (n.nodeType===1 && (n.matches && n.matches('.todo-item'))) || (n.querySelector && n.querySelector('.todo-item')))) { should = true; break; }
      }
      if (m.type === 'attributes' && m.target && m.target.matches && m.target.matches('.todo-item, .todo-item *')) { should = true; break; }
    }
    if (should) syncFtTasks();
  });

  document.addEventListener('DOMContentLoaded', ()=>{
    const container = document.querySelector('#todoList') || document.querySelector('.todo-list') || document.body;
    try { observer.observe(container, { childList:true, subtree:true, attributes:true, attributeFilter:['class','data-date'] }); } catch(e){ console.warn('[TodoList] observer fail', e); }
    // initial sync
    syncFtTasks(20);

    // hook add / delete UI clicks (common selectors) to trigger sync after UI mutation
    document.body.addEventListener('click', (ev)=>{
      if (ev.target.closest && (ev.target.closest('.delete-btn') || ev.target.closest('[data-action="add-todo"]') || ev.target.closest('.add-todo') || ev.target.closest('#addTodoBtn') )) {
        setTimeout(()=> syncFtTasks(40), 40);
      }
    }, true);

    // also hook forms
    document.body.addEventListener('submit', (ev)=>{
      const f = ev.target;
      if (f && (f.matches('#todoForm') || f.matches('.todo-form') || f.dataset?.role === 'todo-form')) {
        setTimeout(()=> syncFtTasks(60), 60);
      }
    }, true);
  });

  // expose helper for debugging/manual use
  window.forceSyncFtTasks = () => { syncFtTasks(0); return (JSON.parse(localStorage.getItem('ft_tasks')||'[]')); };
})();

// 날짜 표시
function updateDateDisplay() {
  const options = { weekday: "long", day: "numeric", month: "short" };
  document.getElementById("currentDate").textContent = currentDate.toLocaleDateString("en-US", options);
}

// 날짜 변경
function changeDate(direction) {
  currentDate.setDate(currentDate.getDate() + direction);
  updateDateDisplay();
  loadTodos();
}

// 달력
function generateCalendar() {
  const calendar = document.getElementById("calendar");
  calendar.innerHTML = "";

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  daysOfWeek.forEach((day) => {
    const dayHeader = document.createElement("div");
    dayHeader.className = "calendar-header";
    dayHeader.textContent = day;
    calendar.appendChild(dayHeader);
  });

  const year = selectedDate.getFullYear();
  const month = selectedDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);

    const dayElement = document.createElement("div");
    dayElement.className = "calendar-day";
    dayElement.textContent = date.getDate();

    if (date.getMonth() !== month) dayElement.classList.add("other-month");
    if (date.toDateString() === selectedDate.toDateString()) dayElement.classList.add("selected");

    dayElement.addEventListener("click", () => {
      selectedDate = new Date(date);
      generateCalendar();
    });

    calendar.appendChild(dayElement);
  }
}

// 투두 로드
function loadTodos() {
  const dateKey = currentDate.toISOString().split("T")[0];
  const todosForDate = todos[dateKey] || [];

  const todoContent = document.getElementById("todoContent");
  todoContent.innerHTML = "";

  todosForDate.forEach((todo) => {
    const todoItem = createTodoElement(todo);
    todoContent.appendChild(todoItem);
  });
}

// 투두 생성
function createTodoElement(todo) {
  const todoItem = document.createElement("div");
  todoItem.className = "todo-item";
  todoItem.dataset.date = guessSelectedISO();  // 추가: 렌더 타이밍에 날짜를 박아둠

  const timeInfo = document.createElement("div");
  timeInfo.className = "time-info";

  const timeDisplay = document.createElement("div");
  timeDisplay.className = "time-display";
  timeDisplay.textContent = todo.time || "00:00 AM";

  const durationBadge = document.createElement("div");
  durationBadge.className = "duration-badge";
  durationBadge.textContent = todo.duration || "0M";

  timeInfo.appendChild(timeDisplay);
  timeInfo.appendChild(durationBadge);

  const checkbox = document.createElement("div");
  checkbox.className = "todo-checkbox";
  if (todo.completed) checkbox.classList.add("checked");
  checkbox.addEventListener("click", () => toggleTodoComplete(todo.id));

  const todoText = document.createElement("div");
  todoText.className = "todo-text";
  if (todo.completed) todoText.classList.add("completed");
  todoText.textContent = todo.text;
  todoText.addEventListener("click", () => startEditTodo(todo.id, todoText));

  const categoryTag = document.createElement("span");
  categoryTag.className = `category-tag category-${todo.category.toLowerCase()}`;
  categoryTag.textContent = todo.category;

  const deleteBtn = document.createElement("i");
  deleteBtn.className = "fas fa-trash delete-btn";
  deleteBtn.addEventListener("click", () => deleteTodo(todo.id));

  todoItem.append(timeInfo, checkbox, todoText, categoryTag, deleteBtn);
  return todoItem;
}

// 완료 토글
function toggleTodoComplete(todoId) {
  const dateKey = getLocalDateKey(currentDate);  // 변경
  const todo = (todos[dateKey] || []).find((t) => t.id === todoId);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodosToStorage();
    loadTodos();
  }
}

// 편집
function startEditTodo(todoId, textElement) {
  if (editingTodoId) return;
  editingTodoId = todoId;

  const input = document.createElement("input");
  input.className = "todo-text editing";
  input.value = textElement.textContent;

  input.addEventListener("blur", () => finishEditTodo(todoId, input));
  input.addEventListener("keypress", (e) => e.key === "Enter" && finishEditTodo(todoId, input));

  textElement.parentNode.replaceChild(input, textElement);
  input.focus();
  input.select();
}

function finishEditTodo(todoId, input) {
  const dateKey = getLocalDateKey(currentDate);  // 변경
  const todo = (todos[dateKey] || []).find((t) => t.id === todoId);
  if (todo && input.value.trim()) {
    todo.text = input.value.trim();
    saveTodosToStorage();
  }
  editingTodoId = null;
  loadTodos();
}

// 삭제
function deleteTodo(todoId) {
  const dateKey = getLocalDateKey(currentDate);  // 변경
  todos[dateKey] = (todos[dateKey] || []).filter((t) => t.id !== todoId);
  saveTodosToStorage();
  loadTodos();
}

// 모달
function toggleAddModal() {
  const modal = document.getElementById("addModal");
  isModalOpen = !isModalOpen;

  if (isModalOpen) {
    modal.classList.add("active");
    selectedDate = new Date(currentDate);
    generateCalendar();
    document.getElementById("todoInput").value = "";
    document.getElementById("hoursInput").value = "0";
    document.getElementById("minutesInput").value = "0";
    updateTimeDisplay();
  } else {
    modal.classList.remove("active");
  }
}

// 시간
function adjustTime(type, amount) {
  const input = document.getElementById(type === "hours" ? "hoursInput" : "minutesInput");
  let value = parseInt(input.value) + amount * (type === "minutes" ? 5 : 1);
  input.value = type === "hours" ? Math.max(0, Math.min(23, value)) : Math.max(0, Math.min(59, value));
  updateTimeDisplay();
}

function updateTimeDisplay() {
  const hours = parseInt(document.getElementById("hoursInput").value) || 0;
  const minutes = parseInt(document.getElementById("minutesInput").value) || 0;
  document.getElementById("timeDisplayLarge").textContent = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

// 저장
function saveTodo() {
  const todoText = document.getElementById("todoInput").value.trim();
  const category = document.getElementById("categorySelect").value;
  const hours = parseInt(document.getElementById("hoursInput").value) || 0;
  const minutes = parseInt(document.getElementById("minutesInput").value) || 0;

  if (!todoText) {
    alert("할 일을 입력해주세요.");
    return;
  }

  const dateKey = getLocalDateKey(selectedDate);  // 변경: 로컬 날짜 사용
  todos[dateKey] = todos[dateKey] || [];

  const newTodo = {
    id: Date.now(),
    text: todoText,
    category: category,
    time: formatTime(hours, minutes),
    duration: `${hours * 60 + minutes}M`,
    completed: false,
    createdAt: new Date().toISOString(),
  };

  todos[dateKey].push(newTodo);
  saveTodosToStorage();
  if (currentDate.toDateString() === selectedDate.toDateString()) loadTodos();
  toggleAddModal();

  // ft_tasks에 추가하고 동기화
  const existingFtTasks = JSON.parse(localStorage.getItem('ft_tasks') || '[]');
  const normalizedTask = {
    id: newTodo.id,
    date: dateKey,  // 로컬 날짜
    time: newTodo.time,
    title: newTodo.text,
    mins: hours * 60 + minutes,
    tag: category.toLowerCase(),
    done: false
  };
  existingFtTasks.push(normalizedTask);
  localStorage.setItem('ft_tasks', JSON.stringify(existingFtTasks));
  window.dispatchEvent(new CustomEvent('ft-tasks-updated', { detail: existingFtTasks }));
  console.log('[TodoList] Synced new task to ft_tasks:', normalizedTask);
}

function saveTodosToStorage() {
  localStorage.setItem("focusTodos", JSON.stringify(todos));
}

// 날짜 추출 헬퍼 추가 (맨 위 유틸 근처)
function pad(n){ return String(n).padStart(2,'0'); }
function getLocalDateKey(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}
function guessSelectedISO(){
  // 화면 상단의 "Sunday, Sep 28" 같은 텍스트를 로컬 날짜로 변환
  const el = document.getElementById('currentDate');
  if (!el) return getLocalDateKey(new Date());
  const txt = el.textContent.trim(); // e.g. "Sunday, Sep 28"
  const m = txt.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*\s(\d{1,2})/i);
  const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  if (!m) return getLocalDateKey(new Date());
  const month = MONTHS.indexOf(m[1].toLowerCase());
  const day = parseInt(m[2], 10);
  const year = new Date().getFullYear();
  return `${year}-${pad(month+1)}-${pad(day)}`;
}

// formatTime 함수 추가 (누락됨)
function formatTime(hours, minutes) {
  const h = hours % 12 || 12;
  const ampm = hours < 12 ? 'AM' : 'PM';
  return `${h.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}
