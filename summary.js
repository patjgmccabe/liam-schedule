/* =============================================================
   FIREBASE CONFIGURATION — must match app.js
   ============================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyDyvJBbVCL-9oST1VG9apdfk_6vUYkxIrs",
  authDomain: "liam-schedule.firebaseapp.com",
  databaseURL: "https://liam-schedule-default-rtdb.firebaseio.com",
  projectId: "liam-schedule",
  storageBucket: "liam-schedule.firebasestorage.app",
  messagingSenderId: "300732041208",
  appId: "1:300732041208:web:70de624e17ca61a7ed380d"
};

const PARTICIPANTS = ["Brendan", "Caleigh", "Shannon", "Kelly", "Aidan"];
const COLORS = ["#2dd4a8", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b"];
const ADMIN_EMAIL = "patjg.mccabe@gmail.com";

let db = null;
let entriesRef = null;
let firebaseReady = false;
let allEntries = {};
let currentUser = null;
let authReady = false;

/* ===== Initialize ===== */
document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
});

function initFirebase() {
  if (firebaseConfig.apiKey === "YOUR_API_KEY") { loadFromLocalStorage(); return; }
  try {
    if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
    db = firebase.database();
    entriesRef = db.ref("entries");
    firebaseReady = true;
    initAuth();
    entriesRef.on("value", (snapshot) => { allEntries = snapshot.val() || {}; if (authReady) renderSummary(); });
  } catch (e) { console.error("Firebase init error:", e); loadFromLocalStorage(); }
}

/* ===== Auth ===== */
function initAuth() {
  firebase.auth().onAuthStateChanged((user) => { currentUser = user; authReady = true; updateAuthUI(); renderSummary(); });
}

function isAdmin() { return currentUser && currentUser.email === ADMIN_EMAIL; }

function updateAuthUI() {
  const navUser = document.getElementById("navUser");
  if (!navUser) return;
  const mainContent = document.getElementById("mainContent");
  const signinWidget = document.getElementById("signinWidget");
  if (currentUser) {
    const name = currentUser.displayName || currentUser.email.split("@")[0];
    navUser.innerHTML = '<span class="nav-user-name">&#128100; ' + name + '</span><button class="btn-logout" onclick="logoutUser()">Sign Out</button>';
    if (mainContent) mainContent.style.display = "block";
    if (signinWidget) signinWidget.style.display = "none";
  } else {
    navUser.innerHTML = "";
    if (mainContent) mainContent.style.display = "none";
    if (signinWidget) signinWidget.style.display = "flex";
  }
}

function loginWidget() {
  const email = document.getElementById("widgetEmail").value.trim();
  const password = document.getElementById("widgetPassword").value;
  const errEl = document.getElementById("widgetError");
  errEl.textContent = "";
  if (!email || !password) { errEl.textContent = "Please enter your email and password."; return; }
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(() => { showToast("Welcome back!", "success"); })
    .catch(() => { errEl.textContent = "Incorrect email or password. Please try again."; });
}

function logoutUser() { firebase.auth().signOut().then(() => { showToast("You've been signed out.", "info"); }); }

function loadFromLocalStorage() {
  authReady = true;
  const stored = localStorage.getItem("liamScheduleEntries");
  if (stored) allEntries = JSON.parse(stored);
  renderSummary();
}

/* ===== Week Helpers ===== */
function getWeekMonday(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  return monday;
}

function formatDateShort(d) { return (d.getMonth() + 1) + "/" + d.getDate(); }

function formatWeekRange(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return formatDateShort(monday) + " \u2013 " + formatDateShort(sunday) + " (" + monday.getFullYear() + ")";
}

function entryHasPassed(entry) {
  const parts = entry.endTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!parts) return false;
  let h = parseInt(parts[1]); const m = parseInt(parts[2]); const ampm = parts[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  const entryEnd = new Date(entry.date + "T00:00:00");
  entryEnd.setHours(h, m, 0, 0);
  return entryEnd < new Date();
}

/* ===== Render Summary ===== */
function renderSummary() {
  const entriesWithIds = Object.entries(allEntries);
  const claimed = entriesWithIds.filter(([id, e]) => e.claimedBy && e.claimedBy.trim() !== "" && entryHasPassed(e));
  const weeks = {};
  claimed.forEach(([id, entry]) => {
    const monday = getWeekMonday(entry.date);
    const key = monday.toISOString().slice(0, 10);
    if (!weeks[key]) { weeks[key] = { monday, participants: {}, entryIds: [] }; PARTICIPANTS.forEach(p => weeks[key].participants[p] = 0); }
    weeks[key].entryIds.push(id);
    if (PARTICIPANTS.includes(entry.claimedBy)) { weeks[key].participants[entry.claimedBy] += entry.hours; }
  });
  const sortedWeeks = Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0]));
  const grandTotals = {};
  PARTICIPANTS.forEach(p => grandTotals[p] = 0);
  const tbody = document.getElementById("summaryBody");
  let html = "";
  if (sortedWeeks.length === 0) {
    html = '<tr><td colspan="8" class="empty-state"><p>No completed shifts yet.</p></td></tr>';
  } else {
    sortedWeeks.forEach(([key, week]) => {
      let weekTotal = 0;
      html += "<tr>";
      html += '<td style="white-space:nowrap; font-weight:600;">' + formatWeekRange(week.monday) + '</td>';
      PARTICIPANTS.forEach(p => {
        const hrs = week.participants[p]; weekTotal += hrs; grandTotals[p] += hrs;
        html += '<td>' + (hrs > 0 ? hrs : '\u2013') + '</td>';
      });
      html += '<td class="week-total">' + (Math.round(weekTotal * 100) / 100) + '</td>';
      const delBtn = isAdmin() ? '<button class="btn btn-danger" style="font-size:0.75rem;padding:0.28rem 0.6rem;" onclick="deleteWeek(\'' + key + '\', \'' + formatWeekRange(week.monday) + '\')">' + '\u2715</button>' : '';
      html += '<td>' + delBtn + '</td>';
      html += "</tr>";
    });
    let grandTotal = 0;
    html += '<tr class="total-row"><td>Grand Total</td>';
    PARTICIPANTS.forEach(p => { const t = Math.round(grandTotals[p] * 100) / 100; grandTotal += t; html += '<td>' + (t > 0 ? t : '\u2013') + '</td>'; });
    html += '<td>' + (Math.round(grandTotal * 100) / 100) + '</td><td></td></tr>';
  }
  tbody.innerHTML = html;
  renderTotalCards(grandTotals);
}

/* ===== Individual Total Cards ===== */
function renderTotalCards(totals) {
  const grid = document.getElementById("totalsGrid");
  let html = "";
  PARTICIPANTS.forEach((p, i) => {
    const hrs = Math.round((totals[p] || 0) * 100) / 100;
    html += '<div style="background:' + COLORS[i] + '18; border:2px solid ' + COLORS[i] + '40; border-radius:12px; padding:1.2rem; text-align:center;">' +
      '<div style="font-size:0.8rem; color:var(--text-secondary); font-weight:600; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:0.4rem;">' + p + '</div>' +
      '<div style="font-size:1.9rem; font-weight:800; color:' + COLORS[i] + ';">' + hrs + '</div>' +
      '<div style="font-size:0.73rem; color:var(--text-secondary); margin-top:0.1rem;">total hours</div></div>';
  });
  grid.innerHTML = html;
}

/* ===== Delete Week (Admin Only) ===== */
function deleteWeek(weekKey, weekLabel) {
  if (!isAdmin()) { showToast("Only admins can delete entries.", "error"); return; }
  const ids = [];
  Object.entries(allEntries).forEach(([id, entry]) => {
    if (entry.claimedBy && entry.claimedBy.trim() !== "") {
      const monday = getWeekMonday(entry.date);
      const key = monday.toISOString().slice(0, 10);
      if (key === weekKey) ids.push(id);
    }
  });
  if (!confirm('Delete all ' + ids.length + ' claimed entries for the week of ' + weekLabel + '? This cannot be undone.')) return;
  if (firebaseReady) { const updates = {}; ids.forEach(id => updates[id] = null); entriesRef.update(updates); }
  else { ids.forEach(id => delete allEntries[id]); localStorage.setItem("liamScheduleEntries", JSON.stringify(allEntries)); renderSummary(); }
}

/* ===== Toast ===== */
function showToast(message, type) {
  const container = document.getElementById("toastContainer");
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateX(110%)"; toast.style.transition = "all 0.3s ease"; setTimeout(() => toast.remove(), 300); }, 3000);
}
