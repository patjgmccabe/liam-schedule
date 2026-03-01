const firebaseConfig = {
  apiKey: "AIzaSyDyvJBbVCL-9oST1VG9apdfk_6vUYkxIrs",
  authDomain: "liam-schedule.firebaseapp.com",
  databaseURL: "https://liam-schedule-default-rtdb.firebaseio.com",
  projectId: "liam-schedule",
  storageBucket: "liam-schedule.firebasestorage.app",
  messagingSenderId: "300732041208",
  appId: "1:300732041208:web:70de624e17ca61a7ed380d"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// Already signed in → skip to schedule
auth.onAuthStateChanged((user) => {
  if (user) window.location.href = "index.html";
});

function showTab(tab) {
  document.getElementById("signinForm").style.display  = tab === "signin" ? "block" : "none";
  document.getElementById("signupForm").style.display  = tab === "signup" ? "block" : "none";
  document.getElementById("tabSignin").classList.toggle("active", tab === "signin");
  document.getElementById("tabSignup").classList.toggle("active", tab === "signup");
}

function signIn() {
  const email    = document.getElementById("siEmail").value.trim();
  const password = document.getElementById("siPassword").value;
  const errEl    = document.getElementById("siError");
  errEl.style.display = "none";
  if (!email || !password) { showAuthError(errEl, "Please enter your email and password."); return; }
  auth.signInWithEmailAndPassword(email, password)
    .then(() => { window.location.href = "index.html"; })
    .catch((e) => showAuthError(errEl, friendlyError(e.code)));
}

function signUp() {
  const name     = document.getElementById("suName").value.trim();
  const email    = document.getElementById("suEmail").value.trim();
  const password = document.getElementById("suPassword").value;
  const errEl    = document.getElementById("suError");
  errEl.style.display = "none";
  if (!name)             { showAuthError(errEl, "Please enter your name."); return; }
  if (!email)            { showAuthError(errEl, "Please enter your email."); return; }
  if (password.length < 6) { showAuthError(errEl, "Password must be at least 6 characters."); return; }
  auth.createUserWithEmailAndPassword(email, password)
    .then((cred) => cred.user.updateProfile({ displayName: name }))
    .then(() => {
      emailjs.send("service_ngsub84", "template_adnp9ov", {
        user_name: name,
        user_email: email
      }).catch(() => {}); // silently ignore if email fails
      window.location.href = "index.html";
    })
    .catch((e) => showAuthError(errEl, friendlyError(e.code)));
}

function showAuthError(el, msg) {
  el.textContent = msg;
  el.style.display = "block";
}

function friendlyError(code) {
  switch (code) {
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":   return "Incorrect email or password.";
    case "auth/email-already-in-use": return "An account with this email already exists.";
    case "auth/invalid-email":        return "Please enter a valid email address.";
    case "auth/weak-password":        return "Password must be at least 6 characters.";
    case "auth/too-many-requests":    return "Too many attempts. Please try again later.";
    default: return "Something went wrong. Please try again.";
  }
}
