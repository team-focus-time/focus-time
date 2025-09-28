const userIcon = document.getElementById('user-logout');
const logoutMenu = document.getElementById('logout-menu');

const currentUser = localStorage.getItem('currentUser');

const display = document.querySelector('.stopwatch-watch');
const stopArea = document.querySelector('.main-container');
const timerPage = document.getElementById('timer-page');

const logoutBtn = document.getElementById('logout-btn');

// 로그아웃 메뉴 토글
userIcon.addEventListener('click', function (e) {
  e.preventDefault();
  logoutMenu.style.display =
    logoutMenu.style.display === 'block' ? 'none' : 'block';
});

logoutBtn.addEventListener('click', function () {
  // 로컬스토리지에서 로그인 관련 데이터 삭제
  localStorage.removeItem('currentUser');
  window.location.href = '../login/Login.html';
});

document.addEventListener('click', function (e) {
  if (!userIcon.contains(e.target) && !logoutMenu.contains(e.target)) {
    logoutMenu.style.display = 'none';
  }
});

let timer = null;
let startTime = 0;
let elapsedTime = 0;
let isRunning = false;

function start() {
  if (!isRunning) {
    startTime = Date.now() - elapsedTime;
    timer = setInterval(update, 16);
    isRunning = true;

    setupUserListener();
  }
}

function pause() {
  if (isRunning) {
    clearInterval(timer);
    elapsedTime = Date.now() - startTime;
    isRunning = false;
  }
}

function reset() {
  clearInterval(timer);
  startTime = 0;
  elapsedTime = 0;
  isRunning = false;
  display.textContent = '00:00:00:00';
}

function update() {
  const currentTime = Date.now();
  elapsedTime = currentTime - startTime;
  let hours = Math.floor(elapsedTime / (1000 * 60 * 60));
  let minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);
  let seconds = Math.floor((elapsedTime / 1000) % 60);
  let milliseconds = Math.floor((elapsedTime % 1000) / 10);

  hours = String(hours).padStart(2, '0');
  minutes = String(minutes).padStart(2, '0');
  seconds = String(seconds).padStart(2, '0');
  milliseconds = String(milliseconds).padStart(2, '0');

  display.textContent = `${hours}:${minutes}:${seconds}:${milliseconds}`;
}

function stopOnUserAction() {
  pause();
}

document.addEventListener('mousemove', (e) => {
  const selectedOption = document.querySelector(
    'input[name="stopOption"]:checked'
  )?.value;
  if (selectedOption === 'mousemove') pause();
});

stopArea.addEventListener('click', (e) => {
  const selectedOption = document.querySelector(
    'input[name="stopOption"]:checked'
  )?.value;
  if (selectedOption === 'click') {
    if (!e.target.closest('.startBtn, .pauseBtn, .resetBtn')) {
      pause();
    }
  }
});

timerPage.addEventListener('click', () => {
  window.location.href = '../timer/Timer.html';
});

userIcon.addEventListener('click', function (e) {
  e.preventDefault();
  logoutMenu.style.display =
    logoutMenu.style.display === 'block' ? 'none' : 'block';
});

document.addEventListener('click', function (e) {
  if (!userIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
    dropdownMenu.style.display = 'none';
  }
});

// 전역 변수
let currentDate = new Date();
let selectedDate = new Date();
let todos = JSON.parse(localStorage.getItem('focusTodos')) || {};
let isModalOpen = false;
let editingTodoId = null;

// 초기화
document.addEventListener('DOMContentLoaded', function () {
  updateDateDisplay();
  generateCalendar();
  loadTodos();

  // 이벤트 리스너 등록
  document
    .getElementById('prevBtn')
    .addEventListener('click', () => changeDate(-1));
  document
    .getElementById('nextBtn')
    .addEventListener('click', () => changeDate(1));

  document
    .getElementById('openModalBtn')
    .addEventListener('click', toggleAddModal);
  document
    .getElementById('closeModalBtn')
    .addEventListener('click', toggleAddModal);
  document.getElementById('addTaskBtn').addEventListener('click', saveTodo);

  document
    .getElementById('hoursUpBtn')
    .addEventListener('click', () => adjustTime('hours', 1));
  document
    .getElementById('minutesUpBtn')
    .addEventListener('click', () => adjustTime('minutes', 1));
  document
    .getElementById('hoursDownBtn')
    .addEventListener('click', () => adjustTime('hours', -1));
  document
    .getElementById('minutesDownBtn')
    .addEventListener('click', () => adjustTime('minutes', -1));

  document
    .getElementById('hoursInput')
    .addEventListener('input', updateTimeDisplay);
  document
    .getElementById('minutesInput')
    .addEventListener('input', updateTimeDisplay);

  // 카테고리 드롭다운 색상
  const categorySelect = document.getElementById('categorySelect');
  categorySelect.addEventListener('change', function () {
    const category = this.value.toLowerCase();
    this.className = `category-dropdown ${category}`;
  });
  categorySelect.className = 'category-dropdown work';
});

// 날짜 표시
function updateDateDisplay() {
  const options = { weekday: 'long', day: 'numeric', month: 'short' };
  document.getElementById('currentDate').textContent =
    currentDate.toLocaleDateString('en-US', options);
}

// 날짜 변경
function changeDate(direction) {
  currentDate.setDate(currentDate.getDate() + direction);
  updateDateDisplay();
  loadTodos();
}

// 달력
function generateCalendar() {
  const calendar = document.getElementById('calendar');
  calendar.innerHTML = '';

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  daysOfWeek.forEach((day) => {
    const dayHeader = document.createElement('div');
    dayHeader.className = 'calendar-header';
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

    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = date.getDate();

    if (date.getMonth() !== month) dayElement.classList.add('other-month');
    if (date.toDateString() === selectedDate.toDateString())
      dayElement.classList.add('selected');

    dayElement.addEventListener('click', () => {
      selectedDate = new Date(date);
      generateCalendar();
    });

    calendar.appendChild(dayElement);
  }
}

// 투두 로드
function loadTodos() {
  const dateKey = currentDate.toISOString().split('T')[0];
  const todosForDate = todos[dateKey] || [];

  const todoContent = document.getElementById('todoContent');
  todoContent.innerHTML = '';

  todosForDate.forEach((todo) => {
    const todoItem = createTodoElement(todo);
    todoContent.appendChild(todoItem);
  });
}

// 투두 생성
function createTodoElement(todo) {
  const todoItem = document.createElement('div');
  todoItem.className = 'todo-item';

  const timeInfo = document.createElement('div');
  timeInfo.className = 'time-info';

  const timeDisplay = document.createElement('div');
  timeDisplay.className = 'time-display';
  timeDisplay.textContent = todo.time || '00:00 AM';

  const durationBadge = document.createElement('div');
  durationBadge.className = 'duration-badge';
  durationBadge.textContent = todo.duration || '0M';

  timeInfo.appendChild(timeDisplay);
  timeInfo.appendChild(durationBadge);

  const checkbox = document.createElement('div');
  checkbox.className = 'todo-checkbox';
  if (todo.completed) checkbox.classList.add('checked');
  checkbox.addEventListener('click', () => toggleTodoComplete(todo.id));

  const todoText = document.createElement('div');
  todoText.className = 'todo-text';
  if (todo.completed) todoText.classList.add('completed');
  todoText.textContent = todo.text;
  todoText.addEventListener('click', () => startEditTodo(todo.id, todoText));

  const categoryTag = document.createElement('span');
  categoryTag.className = `category-tag category-${todo.category.toLowerCase()}`;
  categoryTag.textContent = todo.category;

  const deleteBtn = document.createElement('i');
  deleteBtn.className = 'fas fa-trash delete-btn';
  deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

  todoItem.append(timeInfo, checkbox, todoText, categoryTag, deleteBtn);
  return todoItem;
}

// 완료 토글
function toggleTodoComplete(todoId) {
  const dateKey = currentDate.toISOString().split('T')[0];
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

  const input = document.createElement('input');
  input.className = 'todo-text editing';
  input.value = textElement.textContent;

  input.addEventListener('blur', () => finishEditTodo(todoId, input));
  input.addEventListener(
    'keypress',
    (e) => e.key === 'Enter' && finishEditTodo(todoId, input)
  );

  textElement.parentNode.replaceChild(input, textElement);
  input.focus();
  input.select();
}

function finishEditTodo(todoId, input) {
  const dateKey = currentDate.toISOString().split('T')[0];
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
  const dateKey = currentDate.toISOString().split('T')[0];
  todos[dateKey] = (todos[dateKey] || []).filter((t) => t.id !== todoId);
  saveTodosToStorage();
  loadTodos();
}

// 모달
function toggleAddModal() {
  const modal = document.getElementById('addModal');
  isModalOpen = !isModalOpen;

  if (isModalOpen) {
    modal.classList.add('active');
    selectedDate = new Date(currentDate);
    generateCalendar();
    document.getElementById('todoInput').value = '';
    document.getElementById('hoursInput').value = '0';
    document.getElementById('minutesInput').value = '0';
    updateTimeDisplay();
  } else {
    modal.classList.remove('active');
  }
}

// 시간
function adjustTime(type, amount) {
  const input = document.getElementById(
    type === 'hours' ? 'hoursInput' : 'minutesInput'
  );
  let value = parseInt(input.value) + amount * (type === 'minutes' ? 5 : 1);
  input.value =
    type === 'hours'
      ? Math.max(0, Math.min(23, value))
      : Math.max(0, Math.min(59, value));
  updateTimeDisplay();
}

function updateTimeDisplay() {
  const hours = parseInt(document.getElementById('hoursInput').value) || 0;
  const minutes = parseInt(document.getElementById('minutesInput').value) || 0;
  document.getElementById('timeDisplayLarge').textContent = `${hours
    .toString()
    .padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// 저장
function saveTodo() {
  const todoText = document.getElementById('todoInput').value.trim();
  const category = document.getElementById('categorySelect').value;
  const hours = parseInt(document.getElementById('hoursInput').value) || 0;
  const minutes = parseInt(document.getElementById('minutesInput').value) || 0;

  if (!todoText) {
    alert('할 일을 입력해주세요.');
    return;
  }

  const dateKey = selectedDate.toISOString().split('T')[0];
  todos[dateKey] = todos[dateKey] || [];

  todos[dateKey].push({
    id: Date.now(),
    text: todoText,
    category: category,
    time: formatTime(hours, minutes),
    duration: `${hours * 60 + minutes}M`,
    completed: false,
    createdAt: new Date().toISOString(),
  });

  saveTodosToStorage();
  if (currentDate.toDateString() === selectedDate.toDateString()) loadTodos();
  toggleAddModal();
}

function formatTime(hours, minutes) {
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function saveTodosToStorage() {
  localStorage.setItem('focusTodos', JSON.stringify(todos));
}
