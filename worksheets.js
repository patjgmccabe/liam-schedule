const firebaseConfig = {
  apiKey: "AIzaSyDyvJBbVCL-9oST1VG9apdfk_6vUYkxIrs",
  authDomain: "liam-schedule.firebaseapp.com",
  databaseURL: "https://liam-schedule-default-rtdb.firebaseio.com",
  projectId: "liam-schedule",
  storageBucket: "liam-schedule.firebasestorage.app",
  messagingSenderId: "300732041208",
  appId: "1:300732041208:web:70de624e17ca61a7ed380d"
};

document.addEventListener("DOMContentLoaded", () => {
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  firebase.auth().onAuthStateChanged((user) => {
    const navUser = document.getElementById("navUser");
    const mainContent = document.getElementById("mainContent");
    const signinWidget = document.getElementById("signinWidget");
    const navLinks = document.getElementById("navLinks");
    if (user) {
      const name = user.displayName || user.email.split("@")[0];
      navUser.innerHTML = '<span class="nav-user-name">&#128100; ' + name + '</span><button class="btn-logout" onclick="firebase.auth().signOut()">Sign Out</button>';
      mainContent.style.display = "block";
      signinWidget.style.display = "none";
      navLinks.style.display = "";
    } else {
      navUser.innerHTML = "";
      mainContent.style.display = "none";
      signinWidget.style.display = "flex";
      navLinks.style.display = "none";
    }
  });
});

function loginWidget() {
  const email = document.getElementById("widgetEmail").value.trim();
  const password = document.getElementById("widgetPassword").value;
  const errEl = document.getElementById("widgetError");
  errEl.textContent = "";
  if (!email || !password) { errEl.textContent = "Please enter your email and password."; return; }
  firebase.auth().signInWithEmailAndPassword(email, password)
    .catch(() => { errEl.textContent = "Incorrect email or password. Please try again."; });
}
