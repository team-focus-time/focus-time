let currentDate = new Date();

let dateEl = document.getElementById("current-date");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");

function updateDate() {
  const options = { weekday: "long", day: "numeric", month: "short" };
  dateEl.textContent = currentDate.toLocaleDateString("en-GB", options);
}
prevButton.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() - 1);
  updateDate();
});

nextButton.addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() + 1);
  updateDate();
});

updateDate();
