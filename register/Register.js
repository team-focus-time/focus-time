let storedUserData = localStorage.getItem('userData');
let userData = storedUserData ? JSON.parse(storedUserData) : {};

const inputName = document.getElementById('login-input-name');
const inputEmail = document.getElementById('login-input-email');
const inputPw = document.getElementById('login-input-pw');
const inputPwConfirm = document.getElementById('login-input-pw-confirm');
const btnRegister = document.getElementById('login-btn');
const btnLogin = document.getElementById('btn-login');
const errorName = document.getElementById('name-error');
const errorEmail = document.getElementById('email-error');
const errorPw = document.getElementById('pw-error');
const errorPwConfirm = document.getElementById('pw-confirm-error');

btnLogin.addEventListener('click', function () {
  window.location.replace('/login/Login.html');
});

// 비밀번호 show/hide 토글
document.querySelectorAll('.pw-toggle').forEach((toggleBtn) => {
  toggleBtn.addEventListener('click', function () {
    const input = this.parentElement.querySelector('input');
    const icon = this.querySelector('.pw-btn');
    if (input.type === 'password') {
      input.type = 'text';
      icon.classList.add('fa-eye-slash');
    } else {
      input.type = 'password';
      icon.classList.remove('fa-eye-slash');
    }
  });
});

btnRegister.addEventListener('click', Register);

// 엔터키로 회원가입 실행
[inputName, inputEmail, inputPw, inputPwConfirm].forEach((input) => {
  input.addEventListener('keyup', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      Register();
    }
  });
});

function showAlert(message) {
  const alertWrapper = document.getElementById('alert');
  const alertYes = document.getElementById('alert-yes');
  const messageMain = document.getElementById('message-main');

  messageMain.textContent = message;
  alertWrapper.style.display = 'flex';

  const newAlertYes = alertYes.cloneNode(true);
  alertYes.replaceWith(newAlertYes);

  const goLogin = () => {
    alertWrapper.style.display = 'none';
    window.location.replace('/login/Login.html');
    document.removeEventListener('keydown', handleEnter);
  };

  newAlertYes.addEventListener('click', goLogin);

  const handleEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      goLogin();
    }
  };
  document.addEventListener('keydown', handleEnter);
}

function Register() {
  const name = inputName.value.trim();
  const email = inputEmail.value.trim();
  const pw = inputPw.value.trim();
  const pwConfirm = inputPwConfirm.value.trim();

  let isValid = true;

  // 이름 검사
  if (name === '') {
    errorName.innerText = '이름을 입력하세요.';
    isValid = false;
  } else {
    errorName.innerText = '';
  }

  // 이메일 검사
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email === '') {
    errorEmail.innerText = '이메일을 입력하세요.';
    isValid = false;
  } else if (!emailRegex.test(email)) {
    errorEmail.innerText = '올바른 이메일 형식을 입력하세요.';
    isValid = false;
  } else if (userData[email]) {
    errorEmail.innerText = '이미 가입된 이메일입니다.';
    isValid = false;
  } else {
    errorEmail.innerText = '';
  }

  // 비밀번호 검사
  const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
  if (!pwRegex.test(pw)) {
    errorPw.innerText =
      '비밀번호는 대소문자, 숫자를 포함해 8자리 이상이어야 합니다.';
    isValid = false;
  } else {
    errorPw.innerText = '';
  }

  // 비밀번호 확인 검사
  if (pw !== pwConfirm) {
    errorPwConfirm.innerText = '비밀번호가 일치하지 않습니다.';
    isValid = false;
  } else {
    errorPwConfirm.innerText = '';
  }

  if (!isValid) return;

  // 회원가입 성공 → 로컬스토리지 저장
  userData[email] = { name, password: pw };
  localStorage.setItem('userData', JSON.stringify(userData));

  showAlert('회원가입이 완료되었습니다');
}
