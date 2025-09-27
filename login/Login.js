// 기존 데이터 불러오기
var storedUserData = localStorage.getItem('userData');
var userData = storedUserData ? JSON.parse(storedUserData) : {};

const errorId = ['id-error', 'pw-error'];
const LoginBtn = document.getElementById('login-btn');
const LoginInputEmail = document.getElementById('login-input-email');
const LoginInputPw = document.getElementById('login-input-pw');
const pwInput = document.querySelector('.pw-wrapper input');
const pwToggle = document.querySelector('.pw-btn');
const btnRegister = document.getElementById('btn-Register');

LoginBtn.addEventListener('click', login);

// 비밀번호 show/hide 토글
pwToggle.addEventListener('click', function () {
  if (pwInput.type === 'password') {
    pwInput.type = 'text';
    pwToggle.classList.add('fa-eye-slash');
  } else {
    pwInput.type = 'password';
    pwToggle.classList.remove('fa-eye-slash');
  }
});

btnRegister.addEventListener('click', function () {
  window.location.replace('/register/Register.html');
});

// 엔터키 입력 시 로그인 실행 + 입력 유효성 검사
[LoginInputEmail, LoginInputPw].forEach((input, index) => {
  input.addEventListener('keyup', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      login();
    }
  });

  // 포커스 시 값 확인
  input.addEventListener('focus', function () {
    if (input.value.trim() === '') {
      document.getElementById(errorId[index]).innerHTML =
        index === 0 ? '이메일을 입력하세요.' : '비밀번호를 입력하세요.';
    } else {
      document.getElementById(errorId[index]).innerHTML = '';
    }
  });

  // 입력 시 값 확인
  input.addEventListener('input', function () {
    if (input.value.trim() === '') {
      document.getElementById(errorId[index]).innerHTML =
        index === 0 ? '이메일을 입력하세요.' : '비밀번호를 입력하세요.';
    } else {
      document.getElementById(errorId[index]).innerHTML = '';
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

  const goStopwatch = () => {
    alertWrapper.style.display = 'none';
    window.location.replace('/register/Register.html');
    document.removeEventListener('keydown', handleEnter);
  };

  newAlertYes.addEventListener('click', goStopwatch);

  const handleEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      goStopwatch();
    }
  };

  document.addEventListener('keydown', handleEnter);
}

function login() {
  const email = LoginInputEmail.value.trim();
  const pw = LoginInputPw.value.trim();
  let hasError = false;

  // 이메일 빈 값 체크
  if (email === '') {
    document.getElementById(errorId[0]).innerHTML = '이메일을 입력하세요.';
    hasError = true;
  }

  // 비밀번호 빈 값 체크
  if (pw === '') {
    document.getElementById(errorId[1]).innerHTML = '비밀번호를 입력하세요.';
    hasError = true;
  }

  // 오류가 있을 시 로그인 중단
  if (hasError) return;

  // 회원가입 유무 확인
  if (userData[email]) {
    if (userData[email].password === pw) {
      // 로그인 성공 → 로그인 상태 저장
      localStorage.setItem('currentUser', email);
      window.location.replace('/stopwatch/StopWatch.html');
    } else {
      document.getElementById(errorId[1]).innerHTML =
        '비밀번호가 일치하지 않습니다.';
    }
  } else {
    showAlert('가입되지 않은 회원정보입니다');
  }
}
