# ⏰ 디지털 디톡스 FOCUS TIME

## 📍 프로젝트 소개

> 코딩알려주는누나 바닐라 JS 프로젝트<br>
> 프로젝트명: FOCUS TIME<br>
> 프로젝트 기간: 2025.09.22 ~ 2025.09.28

현대인은 하루 평군 수 시간 이상을 스마트폰과 PC 앞에서 보냅니다.
이로 인해 지나친 디지털 기기 사용은 집중력 저하, 수면 부족, 업무 효율 저하 등 다양한 문제를 일으킵니다.

저희 팀은 이러한 문제를 해결하기 위해 **디지털 디톡스**라는 주제에 주목했습니다.
본 프로젝트는 단순한 일정 관리가 아니라, **타이머와 스톱워치, 투두리스트를 결합하여 사용자가 집중하고 휴식하는 패턴을 갖도록 돕는것**을 목표로 했습니다.

---

## 🗒️ 팀 페이지

[👉 팀 페이지 바로가기](https://www.notion.so/3-2757ec0bf68b80d78139df58a923e3b9)

## 🔗 배포 주소

[👉 FOCUS TIME 바로가기](https://js-focustime.netlify.app/)

## 👥 We are

<table>
  <tr>
    <td colspan="4" align="center" style="background-color:  padding: 15px; font-weight: bold; font-size: 20px; border-bottom: 2px solid #e1e4e8;">
      🚀 TEAM FOCUS TIME 🚀
    </td>
  </tr>
  <tr>
    <td align="center"><strong>황수곤</strong></td>
    <td align="center"><strong>허태웅</strong></td>
    <td align="center"><strong>장은영</strong></td>
    <td align="center"><strong>양원지</strong></td>
  </tr>

  <tr>
    <td align="center">
      <a href="https://github.com/sugonhwang" target="_blank" rel="noopener noreferrer">
        <img src="https://img.shields.io/badge/GitHub-000000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/heotaewoong" target="_blank" rel="noopener noreferrer">
        <img src="https://img.shields.io/badge/GitHub-000000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/skysas" target="_blank" rel="noopener noreferrer">
        <img src="https://img.shields.io/badge/GitHub-000000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/wonjiyang" target="_blank" rel="noopener noreferrer">
        <img src="https://img.shields.io/badge/GitHub-000000?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
      </a>
    </td>
  </tr>
  <tr>
    <td align="center"><strong>팀장 · PM</strong></td>
    <td align="center"><strong>팀원 · SM</strong></td>
    <td align="center"><strong>팀원 · PL</strong></td>
    <td align="center"><strong>팀원 · PL</strong></td>
  </tr>
  <tr>
    <td>
      <ul>
        <li>투두리스트</li>
        <li>프로젝트 관리</li>
        <li>기획 및 발표</li>
      <ul>
    </td>
    <td>
      <ul>
          <li>Dashboard 메인</li>
        <li>차트 랜더링</li>
        <li>API</li>
        <li>문서 작성</li>
      <ul>
    </td>
    <td>
      <ul>
         <li>로그인 화면</li>
        <li>회원가입</li>
        <li>디자인</li>
        <li>Intro 페이지</li>
        <li>Dashboard 서브</li>
      <ul>
    </td>
    <td>
      <ul>
        <li>스톱워치</li>
        <li>타이머</li>
        <li>Navigation</li>
        <li>Footer</li>
      <ul>
    </td>
  </tr>
</table>

## 💡 기획 구조도

### 🎯 프로젝트 컨셉

사용자가 주어진 시간을 온전히 집중할 수 있도록 스톱워치/타이머/투두리스트를 제공하며<br>
**주간/월간/연간 집중한 시간 및 완료한 할 일 등을 그래프로 보여줍니다.**

### 🔀 사용자 플로우

메인 페이지 → 로그인/회원가입 → 스톱워치/타이머 실행 → Todo List 등록 → 작업 이력 확인

---

## 💻 서비스 소개

### 🖥 메인 화면

![메인화면](https://github.com/user-attachments/assets/c897b62a-b4c3-43f4-9d73-ae6b26fee9af)

- Intro 페이지입니다. 프로젝트 및 팀원들을 간단히 소개합니다.
- Start 버튼을 눌러 서비스를 이용할 수 있습니다.

---

### 🔐 로그인 & 회원가입

![I로그인화면1](https://github.com/user-attachments/assets/3e3acfec-fc6c-4d19-a233-0e1ab17d63d2)
![로그인화면2](https://github.com/user-attachments/assets/e11d5055-b40d-4b23-a12d-0f204e805a4d)

- 이메일, 비밀번호, 이름, 휴대폰번호, 주소 등 모든 항목에 대한 **유효성 검사** 처리
- **중복 계정 방지**, 비밀번호 일치 확인 등 UX 요소 구현
- 로그인 성공 시 **accessToken은 HTTP only, secure, sameSite 설정**으로 보안을 강화한 뒤<br> 쿠키에 저장 및 유저데이터와 분리하여 관리
- 가입 완료 시 로그인 모달이 실행되며, 사용자 이름이 출력됩니다.

---

### 👤 스톱워치 & 타이머

![마이페이지](https://github.com/user-attachments/assets/2d0b6745-0524-486a-ba35-8871d7418379)

- 로그인한 사용자는 스톱워치와 타이머를 사용할 수 있습니다.
- 스톱워치의 경우 **마우스 모션**이 인식되면 시간을 멈출 수 있는 방법과 사용자기 직접 멈출 수 있는 방법 2가지로 구현했습니다.
- 두 기능을 사용할 경우 `Dashboard`에서 이력을 확인 할 수 있습니다.

---

### ✅ 투두 리스트

![상품상세1](https://github.com/user-attachments/assets/a6aa3d54-37a9-43c1-ac46-b88f802c6701)
![상품상세2](https://github.com/user-attachments/assets/5852712f-54ed-4434-ac18-53c0acd7e62c)

- 상품을 탭 또는 검색을 통해 필터링
- 상세 페이지에서는 다음과 같은 기능을 제공합니다.
  - 수량 조절 및 옵션 선택
  - 찜하기
  - 장바구니 담기 & 구매하기
  - 구매 후기 작성 및 Q&A 작성

**✅ 핵심 기능 - ‘타건 사운드 체험’**  
→ 해당 키보드에 내장된 스위치의 **타건음을 직접 들어볼 수 있습니다.**

---

### 📊 Dashboard

![장바구니](https://github.com/user-attachments/assets/218298da-936e-4adf-a6fa-e0fc977e9703)

- 로그인 사용자만 접근 가능
- 수량 조절, 상품 삭제, 쇼핑 계속하기 버튼 등 기능 제공
- 주문하기를 누르면 결제 페이지로 상품이 전달됩니다.

---

### 📌 향후 개선 계획

- 모바일 성능 개선
- 접근성 강화
  - Label 없는 Input 수정
  - aria-label 없는 아이콘 버튼 수정
- 투두리스트 알람 기능
- 플레이 리스트 API 기능 사용
- 스타일 개선

---

## 🛠 기술 스택

|      <div align="left">분류</div>      | <div align="left">도구</div>                                                                                                                                                                                                           |
| :------------------------------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   <div align="left">개발 언어</div>    | ![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white) ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) |
| <div align="left">Design / Style</div> | ![Figma](https://img.shields.io/badge/figma-F24E1E?style=for-the-badge&logo=figma&logoColor=white)                                                                                                                                     |
|   <div align="left">협업 도구</div>    | ![Discord](https://img.shields.io/badge/Discord-%235865F2?style=for-the-badge&logo=Discord&logoColor=white) ![Notion](https://img.shields.io/badge/Notion-%23000000?style=for-the-badge&logo=Notion&logoColor=white)                   |
|   <div align="left">버전 관리</div>    | ![Github](https://img.shields.io/badge/Github-%23181717?style=for-the-badge&logo=Github&logoColor=white)                                                                                                                               |
|      <div align="left">IDE</div>       | ![VSCode](https://img.shields.io/badge/VSCode-%232F80ED?style=for-the-badge&logoColor=white)                                                                                                                                           |
|      <div align="left">배포</div>      | ![Netlify](https://img.shields.io/badge/netlify-%23000000.svg?style=for-the-badge&logo=netlify&logoColor=#00C7B7)                                                                                                                      |

## 📂 프로젝트 구조 및 기타

```
📂 focus-time
┣ 📁 .github
┣ 📁 assets
┃ ┣ 📁 alarms
┃ ┣ 📁 fonts
┃ ┗ 📁 images
┣ 🗂️ history
┃ ┣ ⚡ app.js
┃ ┣ 🌐 index.html
┃ ┗ 🎨 style.css
┣ 🔑 login
┃ ┣ 🎨 Login.css
┃ ┣ 🌐 Login.html
┃ ┗ ⚡ Login.js
┣ 📝 register
┃ ┣ 🎨 Register.css
┃ ┣ 🌐 Register.html
┃ ┗ ⚡ Register.js
┣ ⏱️ stopwatch
┃ ┣ 🎨 StopWatch.css
┃ ┣ 🌐 StopWatch.html
┃ ┗ ⚡ StopWatch.js
┣ ⏰ timer
┃ ┣ 🎨 Timer.css
┃ ┣ 🌐 Timer.html
┃ ┗ ⚡ Timer.js
┗ 📒 todolist
┣ 🎨 TodoList.css
┣ 🌐 TodoList.html
┣ ⚡ TodoList.js
┗ 🌐 index.html
```
