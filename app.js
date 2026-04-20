/* =============================================================
   FIREBASE CONFIGURATION
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

/* ===== Constants ===== */
const PARTICIPANTS = ["Brendan", "Caleigh", "Shannon", "Kelly", "Aidan"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const ADMIN_EMAIL = "patjg.mccabe@gmail.com";

/* ===== State ===== */
let db = null;
let entriesRef = null;
let allEntries = {};
let showPast = false;
let firebaseReady = false;
let currentUser = null;
let authReady = false;

/* ===== Seed Data ===== */
const SEED_DATA = [
  { date: "2025-04-26", day: "Saturday", startTime: "10:00 AM", endTime: "11:15 AM", description: "Field T3", location: "55 Otsego Avenue Dix Hills", claimedBy: "", hours: 1.25 },
  { date: "2025-04-26", day: "Saturday", startTime: "11:15 AM", endTime: "12:30 PM", description: "", location: "55 Otsego Avenue Dix Hills", claimedBy: "", hours: 1.25 },
  { date: "2025-04-26", day: "Saturday", startTime: "12:30 PM", endTime: "1:30 PM", description: "Field 8", location: "55 Otsego Avenue Dix Hills", claimedBy: "", hours: 1 },
  { date: "2025-05-10", day: "Saturday", startTime: "12:30 PM", endTime: "1:30 PM", description: "Field 8", location: "55 Otsego Avenue Dix Hills", claimedBy: "", hours: 1 },
  { date: "2025-05-10", day: "Saturday", startTime: "1:30 PM", endTime: "2:30 PM", description: "", location: "55 Otsego Avenue Dix Hills", claimedBy: "", hours: 1 },
  { date: "2025-05-11", day: "Sunday", startTime: "4:30 PM", endTime: "6:00 PM", description: "", location: "Beth's House", claimedBy: "Kelly", hours: 1.5 },
  { date: "2025-05-11", day: "Sunday", startTime: "6:00 PM", endTime: "7:30 PM", description: "", location: "Beth's House", claimedBy: "Aidan", hours: 1.5 },
  { date: "2025-05-12", day: "Monday", startTime: "5:00 PM", endTime: "7:00 PM", description: "", location: "11 Davis Ave Garden City", claimedBy: "Aidan", hours: 2 },
  { date: "2025-05-17", day: "Saturday", startTime: "11:30 AM", endTime: "12:30 PM", description: "Field T4", location: "55 Otsego Avenue Dix Hills", claimedBy: "", hours: 1 },
];

/* ===== Initialize ===== */
document.addEventListener("DOMContentLoaded", () => {
  initTimePickers();
  initDatePicker();
  initEditTimePickers();
  initFirebase();
});

function initFirebase() {
  if (firebaseConfig.apiKey === "YOUR_API_KEY") { loadFromLocalStorage(); return; }
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    entriesRef = db.ref("entries");
    firebaseReady = true;
    initAuth();
    entriesRef.on("value", (snapshot) => { allEntries = snapshot.val() || {}; if (authReady) renderTable(); });
    entriesRef.once("value", (snapshot) => { if (!snapshot.exists()) seedData(); });
  } catch (e) { console.error("Firebase init error:", e); loadFromLocalStorage(); }
}

/* ===== Firebase Auth ===== */
function initAuth() {
  firebase.auth().onAuthStateChanged((user) => { currentUser = user; authReady = true; updateAuthUI(); renderTable(); });
}

function isAdmin() { return currentUser && currentUser.email === ADMIN_EMAIL; }
function getDisplayName() { if (!currentUser) return null; return currentUser.displayName || currentUser.email.split("@")[0]; }

function updateAuthUI() {
  const navUser = document.getElementById("navUser");
  if (!navUser) return;
  const addBtn = document.getElementById("toggleFormBtn");
  const mainContent = document.getElementById("mainContent");
  const signinWidget = document.getElementById("signinWidget");
  if (currentUser) {
    const name = getDisplayName();
    navUser.innerHTML = '<span class="nav-user-name">&#128100; ' + name + '</span><button class="btn-logout" onclick="logoutUser()">Sign Out</button>';
    if (addBtn) addBtn.style.display = isAdmin() ? "inline-flex" : "none";
    if (mainContent) mainContent.style.display = "block";
    if (signinWidget) signinWidget.style.display = "none";
  } else {
    navUser.innerHTML = "";
    if (addBtn) addBtn.style.display = "none";
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

function showLoginModal() { document.getElementById("loginModal").style.display = "flex"; setTimeout(() => { const el = document.getElementById("loginEmail"); if (el) el.focus(); }, 80); }
function closeLoginModal() { document.getElementById("loginModal").style.display = "none"; document.getElementById("loginError").textContent = ""; }

function loginUser() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;
  const errEl = document.getElementById("loginError");
  errEl.textContent = "";
  if (!email || !password) { errEl.textContent = "Please enter your email and password."; return; }
  firebase.auth().signInWithEmailAndPassword(email, password)
    .then(() => { closeLoginModal(); showToast("Welcome back!", "success"); })
    .catch(() => { errEl.textContent = "Incorrect email or password. Please try again."; });
}

function logoutUser() { firebase.auth().signOut().then(() => { showToast("You've been signed out.", "info"); }); }

/* ===== LocalStorage Fallback ===== */
function loadFromLocalStorage() {
  authReady = true;
  const stored = localStorage.getItem("liamScheduleEntries");
  if (stored) { allEntries = JSON.parse(stored); } else { seedData(); }
  renderTable();
}

function saveToLocalStorage() { localStorage.setItem("liamScheduleEntries", JSON.stringify(allEntries)); }

function seedData() {
  SEED_DATA.forEach((entry) => { const id = generateId(); entry.createdAt = Date.now(); if (firebaseReady) { entriesRef.child(id).set(entry); } else { allEntries[id] = entry; } });
  if (!firebaseReady) saveToLocalStorage();
}

function generateId() { return "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

/* ===== Date Picker (Flatpickr) ===== */
function initDatePicker() {
  flatpickr("#entryDate", {
    dateFormat: "m-d-Y", minDate: "today", disableMobile: true,
    onChange: function(selectedDates) { if (selectedDates.length > 0) { document.getElementById("entryDay").value = DAYS[selectedDates[0].getDay()]; } }
  });
}

/* ===== Time Picker Dropdowns ===== */
function initTimePickers() {
  const hours = []; for (let i = 1; i <= 12; i++) hours.push(i);
  const mins = []; for (let i = 0; i < 60; i += 5) mins.push(i.toString().padStart(2, "0"));
  ["start", "end"].forEach((prefix) => {
    const hourSel = document.getElementById(prefix + "Hour");
    const minSel = document.getElementById(prefix + "Min");
    hourSel.innerHTML = hours.map(h => '<option value="' + h + '">' + h + '</option>').join("");
    minSel.innerHTML = mins.map(m => '<option value="' + m + '">' + m + '</option>').join("");
    if (prefix === "start") { hourSel.value = "9"; minSel.value = "00"; }
    if (prefix === "end") { hourSel.value = "10"; minSel.value = "00"; }
    hourSel.addEventListener("change", recalcHours);
    minSel.addEventListener("change", recalcHours);
  });
  document.getElementById("startAmpm").addEventListener("change", recalcHours);
  document.getElementById("endAmpm").addEventListener("change", recalcHours);
  recalcHours();
}

function getTimeValue(prefix) { const h = parseInt(document.getElementById(prefix + "Hour").value); const m = parseInt(document.getElementById(prefix + "Min").value); const ampm = document.getElementById(prefix + "Ampm").value; return formatTime(h, m, ampm); }
function formatTime(h, m, ampm) { return h + ":" + m.toString().padStart(2, "0") + " " + ampm; }

function timeToMinutes(timeStr) {
  const parts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!parts) return 0;
  let h = parseInt(parts[1]); const m = parseInt(parts[2]); const ampm = parts[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function calcHoursBetween(startStr, endStr) { const startMins = timeToMinutes(startStr); let endMins = timeToMinutes(endStr); if (endMins <= startMins) endMins += 24 * 60; return Math.round((endMins - startMins) / 60 * 100) / 100; }
function recalcHours() { const start = getTimeValue("start"); const end = getTimeValue("end"); const hours = calcHoursBetween(start, end); document.getElementById("hoursDisplay").textContent = hours > 0 ? hours : "0"; }

/* ===== Form Toggle ===== */
function toggleForm() {
  if (!isAdmin()) { showToast("Only admins can add time slots.", "error"); return; }
  const form = document.getElementById("entryForm"); const btn = document.getElementById("toggleFormBtn");
  form.classList.toggle("open"); btn.classList.toggle("active");
  btn.textContent = form.classList.contains("open") ? "Cancel" : "+ Add New Slot";
}

/* ===== Add Entry (Admin Only) ===== */
function addEntry() {
  if (!isAdmin()) { showToast("Only admins can add time slots.", "error"); return; }
  const dateInput = document.getElementById("entryDate").value;
  const day = document.getElementById("entryDay").value;
  const startTime = getTimeValue("start"); const endTime = getTimeValue("end");
  const type = document.getElementById("entryType").value;
  const desc = document.getElementById("entryDesc").value.trim();
  const location = document.getElementById("entryLocation").value.trim();
  const hours = calcHoursBetween(startTime, endTime);
  if (!dateInput) { showToast("Please select a date.", "error"); return; }
  if (hours <= 0) { showToast("End time must be after start time.", "error"); return; }
  if (!location) { showToast("Please enter a location.", "error"); return; }
  const dateParts = dateInput.split("-");
  const dateISO = dateParts[2] + "-" + dateParts[0] + "-" + dateParts[1];
  const entry = { date: dateISO, day, startTime, endTime, type, description: desc, location, claimedBy: "", hours, createdAt: Date.now() };
  const id = generateId();
  if (firebaseReady) { entriesRef.child(id).set(entry).then(() => showToast("Time slot added!", "success")); } else { allEntries[id] = entry; saveToLocalStorage(); renderTable(); showToast("Time slot added!", "success"); }
  document.getElementById("entryDate").value = ""; document.getElementById("entryDay").value = ""; document.getElementById("entryDesc").value = ""; document.getElementById("entryLocation").value = "";
  toggleForm();
}

/* ===== Claim / Unclaim ===== */
function claimEntry(id) {
  if (!currentUser) { showLoginModal(); showToast("Please sign in to claim a shift.", "error"); return; }
  let name;
  if (isAdmin()) {
    const sel = document.getElementById("claim-" + id);
    if (sel) { name = sel.value; if (!name) { showToast("Please select a name.", "error"); return; } } else { name = getDisplayName(); }
  } else {
    name = getDisplayName();
  }
  if (firebaseReady) { entriesRef.child(id).update({ claimedBy: name }); } else { allEntries[id].claimedBy = name; saveToLocalStorage(); renderTable(); }
  showToast(name + " claimed the slot!", "success");
}

function unclaimEntry(id) {
  if (!currentUser) { showToast("Please sign in.", "error"); return; }
  const entry = allEntries[id]; const myName = getDisplayName();
  if (!isAdmin() && entry.claimedBy !== myName) { showToast("You can only remove your own claim.", "error"); return; }
  if (firebaseReady) { entriesRef.child(id).update({ claimedBy: "" }); } else { allEntries[id].claimedBy = ""; saveToLocalStorage(); renderTable(); }
  showToast("Slot unclaimed.", "info");
}

function deleteEntry(id) {
  if (!isAdmin()) { showToast("Only admins can delete entries.", "error"); return; }
  if (!confirm("Delete this time slot?")) return;
  if (firebaseReady) { entriesRef.child(id).remove(); } else { delete allEntries[id]; saveToLocalStorage(); renderTable(); }
  showToast("Entry deleted.", "info");
}

/* ===== Toggle Past Dates ===== */
function togglePast() {
  showPast = !showPast;
  const btn = document.getElementById("showPastBtn");
  btn.textContent = showPast ? "Hide Past Dates" : "Show Past Dates";
  btn.classList.toggle("active", showPast);
  renderTable();
}

/* ===== Render Table ===== */
function renderTable() {
  const tbody = document.getElementById("scheduleBody");
  if (!tbody) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sorted = Object.entries(allEntries).sort((a, b) => { const dc = a[1].date.localeCompare(b[1].date); if (dc !== 0) return dc; return timeToMinutes(a[1].startTime) - timeToMinutes(b[1].startTime); });
  let html = ""; let visibleCount = 0;
  sorted.forEach(([id, entry]) => {
    const entryDate = new Date(entry.date + "T00:00:00");
    const isPast = entryDate < today;
    if (isPast && !showPast) return;
    visibleCount++;
    const dateFormatted = formatDateDisplay(entry.date);
    const timeSlot = entry.startTime + " \u2013 " + entry.endTime;
    const statusBadge = isPast ? '<span class="badge badge-passed">Past</span>' : entry.claimedBy ? '<span class="badge badge-claimed">Claimed</span>' : '<span class="badge badge-available">Available</span>';
    let claimCell; const myName = getDisplayName();
    if (isPast) {
      claimCell = entry.claimedBy ? '<span class="claimed-name">' + entry.claimedBy + '</span>' : '<span style="color:var(--text-secondary)">\u2014</span>';
    } else if (entry.claimedBy) {
      const canUnclaim = isAdmin() || (myName && entry.claimedBy === myName);
      claimCell = '<span class="claimed-name">' + entry.claimedBy + '</span>';
      if (canUnclaim) claimCell += ' <button class="unclaim-btn" onclick="unclaimEntry(\'' + id + '\')">remove</button>';
    } else if (!currentUser) {
      claimCell = '<span class="sign-in-prompt">Sign in to claim</span>';
    } else if (isAdmin()) {
      const opts = PARTICIPANTS.map(p => '<option value="' + p + '">' + p + '</option>').join("");
      claimCell = '<div class="claim-controls"><select id="claim-' + id + '"><option value="">Select...</option>' + opts + '</select><button class="btn btn-success" onclick="claimEntry(\'' + id + '\')">Claim</button></div>';
    } else {
      claimCell = '<button class="btn btn-success claim-self-btn" onclick="claimEntry(\'' + id + '\')">\u2713 Claim</button>';
    }
    const editBtn = isAdmin() ? '<button class="btn btn-edit" onclick="editEntry(\'' + id + '\')" title="Edit">Edit</button>' : "";
    const deleteBtn = (isAdmin() && !isPast) ? '<button class="btn btn-danger" onclick="deleteEntry(\'' + id + '\')" title="Delete">\u2715</button>' : "";
    const actionCell = (editBtn || deleteBtn) ? '<div style="display:flex;gap:0.3rem;white-space:nowrap;">' + editBtn + deleteBtn + '</div>' : "";
    html += '<tr class="' + (isPast ? 'past-date' : '') + '"><td>' + dateFormatted + '</td><td>' + entry.day + '</td><td style="white-space:nowrap;">' + timeSlot + '</td><td>' + (entry.type || "") + '</td><td>' + (entry.description || "") + '</td><td>' + entry.location + '</td><td>' + claimCell + '</td><td>' + statusBadge + '</td><td style="text-align:center; font-weight:700;">' + entry.hours + '</td><td>' + actionCell + '</td></tr>';
  });
  if (visibleCount === 0) { html = '<tr><td colspan="10" class="empty-state"><p>' + (showPast ? "No entries found." : "No upcoming shifts. Check back soon!") + '</p></td></tr>'; }
  tbody.innerHTML = html;
  document.getElementById("entryCount").textContent = visibleCount + " entries";
}

function formatDateDisplay(isoDate) { const parts = isoDate.split("-"); return parts[1] + "/" + parts[2] + "/" + parts[0]; }

/* ===== Edit Modal ===== */
let editingId = null;
let editDatePicker = null;

function initEditTimePickers() {
  const hours = []; for (let i = 1; i <= 12; i++) hours.push(i);
  const mins = []; for (let i = 0; i < 60; i += 5) mins.push(i.toString().padStart(2, "0"));
  ["editStart", "editEnd"].forEach((prefix) => {
    const hourSel = document.getElementById(prefix + "Hour");
    const minSel = document.getElementById(prefix + "Min");
    hourSel.innerHTML = hours.map(h => '<option value="' + h + '">' + h + '</option>').join("");
    minSel.innerHTML = mins.map(m => '<option value="' + m + '">' + m + '</option>').join("");
    hourSel.addEventListener("change", recalcEditHours);
    minSel.addEventListener("change", recalcEditHours);
  });
  document.getElementById("editStartAmpm").addEventListener("change", recalcEditHours);
  document.getElementById("editEndAmpm").addEventListener("change", recalcEditHours);
  // Pass DOM element (not selector string) so flatpickr returns single instance, not array
  editDatePicker = flatpickr(document.getElementById("editDate"), {
    dateFormat: "m-d-Y", disableMobile: true,
    onChange: function(selectedDates) { if (selectedDates.length > 0) { document.getElementById("editDay").value = DAYS[selectedDates[0].getDay()]; recalcEditHours(); } }
  });
}

function recalcEditHours() { const start = getEditTimeValue("editStart"); const end = getEditTimeValue("editEnd"); const hours = calcHoursBetween(start, end); document.getElementById("editHoursDisplay").textContent = hours > 0 ? hours : "0"; }
function getEditTimeValue(prefix) { const h = parseInt(document.getElementById(prefix + "Hour").value); const m = parseInt(document.getElementById(prefix + "Min").value); const ampm = document.getElementById(prefix + "Ampm").value; return formatTime(h, m, ampm); }

function setTimeSelects(prefix, timeStr) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return;
  const h = parseInt(match[1]); const mInt = parseInt(match[2]); const ampm = match[3].toUpperCase();
  const rounded = Math.round(mInt / 5) * 5;
  document.getElementById(prefix + "Hour").value = h;
  document.getElementById(prefix + "Min").value = rounded.toString().padStart(2, "0");
  document.getElementById(prefix + "Ampm").value = ampm;
}

function editEntry(id) {
  if (!isAdmin()) { showToast("Only admins can edit entries.", "error"); return; }
  const entry = allEntries[id]; if (!entry) return;
  editingId = id;
  const parts = entry.date.split("-");
  const displayDate = parts[1] + "-" + parts[2] + "-" + parts[0];
  editDatePicker.setDate(displayDate, true, "m-d-Y");
  document.getElementById("editDay").value = entry.day;
  setTimeSelects("editStart", entry.startTime); setTimeSelects("editEnd", entry.endTime);
  document.getElementById("editType").value = entry.type || "Com Hab";
  document.getElementById("editDesc").value = entry.description || "";
  document.getElementById("editLocation").value = entry.location || "";
  recalcEditHours();
  document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() { document.getElementById("editModal").style.display = "none"; editingId = null; }

function saveEdit() {
  if (!editingId || !isAdmin()) return;
  const dateInput = document.getElementById("editDate").value;
  const day = document.getElementById("editDay").value;
  const startTime = getEditTimeValue("editStart"); const endTime = getEditTimeValue("editEnd");
  const type = document.getElementById("editType").value;
  const desc = document.getElementById("editDesc").value.trim();
  const location = document.getElementById("editLocation").value.trim();
  const hours = calcHoursBetween(startTime, endTime);
  if (!dateInput) { showToast("Please select a date.", "error"); return; }
  if (hours <= 0) { showToast("End time must be after start time.", "error"); return; }
  if (!location) { showToast("Please enter a location.", "error"); return; }
  const dateParts = dateInput.split("-");
  const dateISO = dateParts[2] + "-" + dateParts[0] + "-" + dateParts[1];
  const updates = { date: dateISO, day, startTime, endTime, type, description: desc, location, hours };
  if (firebaseReady) { entriesRef.child(editingId).update(updates).then(() => showToast("Time slot updated!", "success")); } else { Object.assign(allEntries[editingId], updates); saveToLocalStorage(); renderTable(); showToast("Time slot updated!", "success"); }
  closeEditModal();
}

/* ===== Toast Notifications ===== */
function showToast(message, type) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateX(110%)"; toast.style.transition = "all 0.3s ease"; setTimeout(() => toast.remove(), 300); }, 3000);
     }
