const currentUser = localStorage.getItem('currentUser');

const start = document.getElementById('start');
const stop = document.getElementById('stop');
const reset = document.getElementById('reset');
const timer = document.getElementById('timer');
const setTimeBtn = document.getElementById('set-time');
const minuteInput = document.getElementById('minute-input');
const stopwatchPage = document.getElementById('stopwatch-page');

const alarm = document.getElementById('alarm-notification');
const stopAlarm = document.getElementById('stop-alarm');

const userIcon = document.getElementById('user-logout');
const logoutMenu = document.getElementById('logout-menu');
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

let timeSet = 1800;
let interval;

let alarmAudio = new Audio(
  '../assets/alarms/826685__madgravitystudio__daiquiri-please.wav'
);
alarmAudio.loop = false;

const updateTimer = () => {
  const minutes = Math.floor(timeSet / 60);
  const seconds = timeSet % 60;
  timer.innerHTML = `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}`;
};

// const getAlarmUrl = async () => {
//   try {
//     const response = await fetch(
//       `https://freesound.org/apiv2/search/text/?query=piano&fields=id,previews&token=${apiKey}`
//     );
//     const data = await response.json();
//     if (data.results.length > 0) {
//       const randomSound = Math.floor(Math.random() * data.results.length);
//       return data.results[randomSound].previews["preview-hq-mp3"];
//     } else {
//       return null;
//     }
//   } catch (err) {
//     console.error("API error", err);
//     return null;
//   }
// };

// const playAlarm = async () => {
//   if (!alarmAudio) {
//     const url = await getAlarmUrl();
//     if (url) alarmAudio = new Audio(url);
//   }
// };

const startTimer = () => {
  clearInterval(interval);
  interval = setInterval(async () => {
    timeSet--;
    updateTimer();
    if (timeSet <= 0) {
      clearInterval(interval);
      alarm.style.display = 'flex';
      stopwatchPage.style.display = 'none';
      alarmAudio.play();
      timeSet = 1800;
      updateTimer();
    }
  }, 1000);
};

const stopTimer = () => clearInterval(interval);

const resetTimer = () => {
  clearInterval(interval);
  timeSet = 1800;
  updateTimer();
};

const setUserTime = () => {
  const minutes = parseInt(minuteInput.value, 10);
  if (isNaN(minutes) || minutes < 1 || minutes > 60) {
    alert('시간은 최소 1분, 최대 60분까지만 설정할 수 있습니다.');
    return;
  }

  clearInterval(interval);
  timeSet = minutes * 60;
  updateTimer();
  minuteInput.value = '';
};

stopAlarm.addEventListener('click', () => {
  if (alarmAudio) {
    alarmAudio.pause();
    alarmAudio.currentTime = 0;
  }
  alarm.style.display = 'none';
  stopwatchPage.style.display = 'inline-block';
});

start.addEventListener('click', startTimer);
stop.addEventListener('click', stopTimer);
reset.addEventListener('click', resetTimer);
setTimeBtn.addEventListener('click', setUserTime);
stopwatchPage.addEventListener('click', () => {
  window.location.href = '../stopwatch/StopWatch.html';
});

minuteInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    setUserTime();
  }
});

updateTimer();
