const pwInputs = document.querySelectorAll('.pw-wrapper input');
const pwToggles = document.querySelectorAll('.pw-btn');

pwToggles.forEach((toggle, index) => {
  toggle.addEventListener('click', function () {
    if (pwInputs[index].type === 'password') {
      pwInputs[index].type = 'text';
      toggle.classList.add('fa-eye-slash');
    } else {
      pwInputs[index].type = 'password';
      toggle.classList.remove('fa-eye-slash');
    }
  });
});
