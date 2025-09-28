const display = document.querySelector(".stopwatch-watch");
const stopArea = document.querySelector(".main-container");
const timerPage = document.getElementById("timer-page");

const userIcon = document.getElementById("user-logout");
const logoutMenu = document.getElementById("logout-menu");

userIcon.addEventListener("click", function (e) {
  e.preventDefault();
  logoutMenu.style.display =
    logoutMenu.style.display === "block" ? "none" : "block";
});

document.addEventListener("click", function (e) {
  if (!userIcon.contains(e.target) && !dropdownMenu.contains(e.target)) {
    dropdownMenu.style.display = "none";
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
  display.textContent = "00:00:00:00";
}

function update() {
  const currentTime = Date.now();
  elapsedTime = currentTime - startTime;
  let hours = Math.floor(elapsedTime / (1000 * 60 * 60));
  let minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);
  let seconds = Math.floor((elapsedTime / 1000) % 60);
  let milliseconds = Math.floor((elapsedTime % 1000) / 10);

  hours = String(hours).padStart(2, "0");
  minutes = String(minutes).padStart(2, "0");
  seconds = String(seconds).padStart(2, "0");
  milliseconds = String(milliseconds).padStart(2, "0");

  display.textContent = `${hours}:${minutes}:${seconds}:${milliseconds}`;
}

function stopOnUserAction() {
  pause();
}

document.addEventListener("mousemove", (e) => {
  const selectedOption = document.querySelector(
    'input[name="stopOption"]:checked'
  )?.value;
  if (selectedOption === "mousemove") pause();
});

stopArea.addEventListener("click", (e) => {
  const selectedOption = document.querySelector(
    'input[name="stopOption"]:checked'
  )?.value;
  if (selectedOption === "click") {
    if (!e.target.closest(".startBtn, .pauseBtn, .resetBtn")) {
      pause();
    }
  }
});

timerPage.addEventListener("click", () => {
  window.location.href = "../timer/Timer.html";
});
