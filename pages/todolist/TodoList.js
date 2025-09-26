let currentDate = new Date();

let dateEl = document.getElementById("current-date");
let formEl = document.getElementById("form-current-date");
const addBtn = document.getElementById("add-btn");

// 이전 날짜로 이동
document.getElementById("prev-btn").addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() - 1);
  updateDateTitle();
});

// 다음 날짜로 이동
document.getElementById("next-btn").addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() + 1);
  updateDateTitle();
});

// 테스크 폼: 이전 날짜로 이동
document.getElementById("form-prev-btn").addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() - 1);
  formUpdateDateTitle();
});

// 테스크 폼: 다음 날짜로 이동
document.getElementById("form-next-btn").addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() + 1);
  formUpdateDateTitle();
});

function updateDateTitle() {
  const options = {
    weekday: "short",
    day: "numeric",
    month: "short",
  };
  dateEl.textContent = currentDate.toLocaleDateString("en-US", options);
}

function formUpdateDateTitle() {
  const options = {
    weekday: "short",
    day: "numeric",
    month: "short",
  };
  formEl.textContent = currentDate.toLocaleDateString("en-US", options);
}

updateDateTitle();

formUpdateDateTitle();
