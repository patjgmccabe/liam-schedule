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

const GOALS = [
  { id: 1, type: "HG", outcome: "To be more independent", goal: "Teach skills for independent living skills and activities of daily living skills", method: "Staff will provide verbal prompting (or visual) to take a bath, turning on the tub and to wash each body part, put the soap on and \"scrub scrub\". Provide reminders to hang up book bag, put on shoes and socks and when taking off to put in a designated area." },
  { id: 2, type: "HG", outcome: "To have more friends", goal: "Teach social skills and coping skills", method: "Staff will review expectations for outing so I understand what is expected of me. Staff will encourage me to play with my peers/siblings. When I get frustrated I will hit people, myself or an object. To know when I am getting upset, I will say \"oh no!\" \"ouch!\" or have a stuffy nose, I will stomp or whine. When you see me doing these things take me somewhere quiet. I will also go into a closet or between the couch and the wall to have a dark quiet space when I am overwhelmed. Be aware when I am somewhere I do not want to be — I will look to leave with anyone going in the direction I want to go. Make sure I have my headphones and sunglasses when going to an environment that is very noisy and bright." },
  { id: 3, type: "HG", outcome: "To improve/maintain my communication skills", goal: "Teach communication skills", method: "Please make sure I have my proloquo2go at all times at home and in the community; encourage me to use my device. When upset it is difficult for me to use the words I have — say \"use your words\". I can say food items I want: \"egg\" \"pretzels\" \"bagel with cheese\", \"exit\" when I want to leave, and \"car\" when I want to go somewhere." },
  { id: 4, type: "HG", outcome: "To be more involved in community life", goal: "Increase community integration inside and outside NY state", method: "Staff will assist me to find community activities and provide support while participating. Staff will provide transportation to all community activities." },
  { id: 5, type: "HG", outcome: "Teach safety skills in the home and community", goal: "Teach safety skills", method: "I have a tendency to chew on my clothing, rubber and plastic toys — redirect me by saying \"that's not for eating\". I have seasonal allergies; please wipe my hands and face when coming from outside. Redirect me from touching my eyes and ensure I have my sunglasses at all times." },
  { id: 6, type: "SS", outcome: "Provide support with evacuating in an emergency", goal: "Provide total assistance", method: "Staff will remain calm and speak in a neutral tone, take me by hand to exit, and stay with me until reunited with a family member." },
  { id: 7, type: "SS", outcome: "Provide support with calling for help", goal: "Cannot call for help without assistance", method: "In event of an emergency, call 911. I am unable to explain an incident." },
  { id: 8, type: "SS", outcome: "Provide the following supervision at home", goal: "1:1 Supervision", method: "When at home keep eyes on me at all times — I will go outside for a walk. My home does not have alarms on the doors to alert someone." },
  { id: 9, type: "SS", outcome: "Provide the following supervision in the community", goal: "1:1 Supervision", method: "Staff will remain within arm's length at all times especially when cars are present. Pay extra attention when water is present — I do not know how to swim and am drawn to water. Please be mindful that I will walk away with strangers if they are going in a direction I want to go." }
];

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
  { date: "2025-04-26", day: "Saturday", startTime: "10:00 AM", endTime: "11:15 AM",location: "55 Otsego Avenue Dix Hills", claimedBy: "", hours: 1.25, goals: [] },
  { date: "2025-04-26", day: "Saturday", startTime: "11:15 AM", endTime: "12:30 PM", description: "", location: "55 Otsego Avenue Dix Hills", claimedBy: "", hours: 1.25, goals: [] },
  { date: "2025-04-26", day: "Saturday", startTime: "12:30 PM", endTime: "1:30 PM",location: "55 Otsego Avenue Dix Hills", claimedBy: "", hours: 1, goals: [] },
  { date: "2025-05-10", day: "Saturday", startTime: "12:30 PM", endTime: "1:30 PM",location: "55 Otsego Avenue Dix Hills", claimedBy: "", hours: 1, goals: [] },
  { date: "2025-05-10", day: "Saturday", startTime: "1:30 PM", endTime: "2:30 PM", description: "", location: "55 Otsego Avenue Dix Hills", claimedBy: "", hours: 1, goals: [] },
  { date: "2025-05-11", day: "Sunday", startTime: "4:30 PM", endTime: "6:00 PM", description: "", location: "Beth's House", claimedBy: "Kelly", hours: 1.5, goals: [] },
  { date: "2025-05-11", day: "Sunday", startTime: "6:00 PM", endTime: "7:30 PM", description: "", location: "Beth's House", claimedBy: "Aidan", hours: 1.5, goals: [] },
  { date: "2025-05-12", day: "Monday", startTime: "5:00 PM", endTime: "7:00 PM", description: "", location: "11 Davis Ave Garden City", claimedBy: "Aidan", hours: 2, goals: [] },
  { date: "2025-05-17", day: "Saturday", startTime: "11:30 AM", endTime: "12:30 PM", description: "Field T4", location: "55 Otsego Avenue Dix Hills", claimedBy: "", hours: 1, goals: [] },
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
  const navLinks = document.getElementById("navLinks");
  if (currentUser) {
    const name = getDisplayName();
    navUser.innerHTML = '<span class="nav-user-name">&#128100; ' + name + '</span><button class="btn-logout" onclick="logoutUser()">Sign Out</button>';
    if (addBtn) addBtn.style.display = isAdmin() ? "inline-flex" : "none";
    if (mainContent) mainContent.style.display = "block";
    if (signinWidget) signinWidget.style.display = "none";
    if (navLinks) navLinks.style.display = "";
  } else {
    navUser.innerHTML = "";
    if (addBtn) addBtn.style.display = "none";
    if (mainContent) mainContent.style.display = "none";
    if (signinWidget) signinWidget.style.display = "flex";
    if (navLinks) navLinks.style.display = "none";
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

function escapeHtml(str) { return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

/* ===== Task Helpers ===== */
function renderTaskInputs(containerId, tasks) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";
  const list = tasks && tasks.length > 0 ? tasks : [];
  if (list.length === 0) { addTaskRow(containerId, null); } else { list.forEach(function(t) { addTaskRow(containerId, t); }); }
}

function addTaskRow(containerId, task) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const row = document.createElement("div");
  row.className = "task-row";
  const goalOpts = '<option value="">— No goal linked —</option>' +
    GOALS.map(function(g) {
      const sel = task && task.goalId === g.id ? " selected" : "";
      return '<option value="' + g.id + '"' + sel + '>[' + (g.type === "HG" ? "Goal" : g.type) + '] ' + g.outcome + '</option>';
    }).join("");
  row.innerHTML =
    '<div class="task-row-top">' +
      '<input type="text" class="task-name-input" placeholder="Describe the task..." value="' + (task ? escapeHtml(task.name) : "") + '">' +
      '<select class="task-goal-select">' + goalOpts + '</select>' +
      '<button type="button" class="task-remove-btn" onclick="this.closest(\'.task-row\').remove()">&#x2715;</button>' +
    '</div>' +
    '<textarea class="task-notes-input" placeholder="Staff notes for this specific task (optional)...">' + (task && task.notes ? escapeHtml(task.notes) : "") + '</textarea>';
  container.appendChild(row);
  row.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function getTasksFromContainer(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  const tasks = [];
  container.querySelectorAll(".task-row").forEach(function(row) {
    const name = row.querySelector(".task-name-input").value.trim();
    const goalId = parseInt(row.querySelector(".task-goal-select").value) || null;
    const notesEl = row.querySelector(".task-notes-input");
    const notes = notesEl ? notesEl.value.trim() : "";
    if (name) tasks.push({ name: name, goalId: goalId, notes: notes || null });
  });
  return tasks;
}

/* ===== Form Toggle ===== */
function toggleForm() {
  if (!isAdmin()) { showToast("Only admins can add time slots.", "error"); return; }
  const form = document.getElementById("entryForm"); const btn = document.getElementById("toggleFormBtn");
  form.classList.toggle("open"); btn.classList.toggle("active");
  btn.textContent = form.classList.contains("open") ? "Cancel" : "+ Add New Slot";
  if (form.classList.contains("open")) { renderTaskInputs("taskList", []); }
}

/* ===== Add Entry (Admin Only) ===== */
function addEntry() {
  if (!isAdmin()) { showToast("Only admins can add time slots.", "error"); return; }
  const dateInput = document.getElementById("entryDate").value;
  const day = document.getElementById("entryDay").value;
  const startTime = getTimeValue("start"); const endTime = getTimeValue("end");
  const type = document.getElementById("entryType").value;
  const location = document.getElementById("entryLocation").value.trim();
  const hours = calcHoursBetween(startTime, endTime);
  const tasks = getTasksFromContainer("taskList");
  const activityNotes = document.getElementById("entryNotes").value.trim();
  if (!dateInput) { showToast("Please select a date.", "error"); return; }
  if (hours <= 0) { showToast("End time must be after start time.", "error"); return; }
  if (!location) { showToast("Please enter a location.", "error"); return; }
  const dateParts = dateInput.split("-");
  const dateISO = dateParts[2] + "-" + dateParts[0] + "-" + dateParts[1];
  const entry = { date: dateISO, day, startTime, endTime, type, location, activityNotes: activityNotes || null, claimedBy: "", hours, tasks, createdAt: Date.now() };
  const id = generateId();
  if (firebaseReady) { entriesRef.child(id).set(entry).then(() => showToast("Time slot added!", "success")); } else { allEntries[id] = entry; saveToLocalStorage(); renderTable(); showToast("Time slot added!", "success"); }
  document.getElementById("entryDate").value = ""; document.getElementById("entryDay").value = ""; document.getElementById("entryLocation").value = ""; document.getElementById("entryNotes").value = "";
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
    const timeSlot = entry.startTime + " – " + entry.endTime;
    const statusBadge = isPast ? '<span class="badge badge-passed">Past</span>' : entry.claimedBy ? '<span class="badge badge-claimed">Claimed</span>' : '<span class="badge badge-available">Available</span>';

    const entryTasks = entry.tasks || [];
    let taskCell = "";
    if (entryTasks.length > 0) {
      taskCell = '<span class="task-count-badge">' + entryTasks.length + ' task' + (entryTasks.length !== 1 ? "s" : "") + '</span>';
    } else {
      taskCell = '<span style="color:var(--text-secondary);font-size:0.75rem">—</span>';
    }

    let claimCell; const myName = getDisplayName();
    if (isPast) {
      claimCell = entry.claimedBy ? '<span class="claimed-name">' + entry.claimedBy + '</span>' : '<span style="color:var(--text-secondary)">—</span>';
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
      claimCell = '<button class="btn btn-success claim-self-btn" onclick="claimEntry(\'' + id + '\')">✓ Claim</button>';
    }

    const viewBtn = '<button class="btn btn-view" onclick="viewEntry(\'' + id + '\')" title="View Details">View</button>';
    const editBtn = isAdmin() ? '<button class="btn btn-edit" onclick="editEntry(\'' + id + '\')" title="Edit">Edit</button>' : "";
    const deleteBtn = (isAdmin() && !isPast) ? '<button class="btn btn-danger" onclick="deleteEntry(\'' + id + '\')" title="Delete">✕</button>' : "";
    const actionCell = '<div style="display:flex;gap:0.3rem;white-space:nowrap;">' + viewBtn + editBtn + deleteBtn + '</div>';

    html += '<tr class="' + (isPast ? "past-date" : "") + '">' +
      '<td>' + dateFormatted + '</td>' +
      '<td>' + entry.day + '</td>' +
      '<td style="white-space:nowrap;">' + timeSlot + '</td>' +
      '<td>' + (entry.type || "") + '</td>' +
      '<td>' + entry.location + '</td>' +
      '<td>' + taskCell + '</td>' +
      '<td>' + claimCell + '</td>' +
      '<td>' + statusBadge + '</td>' +
      '<td style="text-align:center; font-weight:700;">' + entry.hours + '</td>' +
      '<td>' + actionCell + '</td>' +
      '</tr>';
  });
  if (visibleCount === 0) { html = '<tr><td colspan="10" class="empty-state"><p>' + (showPast ? "No entries found." : "No upcoming shifts. Check back soon!") + '</p></td></tr>'; }
  tbody.innerHTML = html;
  document.getElementById("entryCount").textContent = visibleCount + " entries";
}

function formatDateDisplay(isoDate) { const parts = isoDate.split("-"); return parts[1] + "/" + parts[2] + "/" + parts[0]; }

/* ===== View Entry Modal ===== */
function viewEntry(id) {
  const entry = allEntries[id]; if (!entry) return;
  const entryTasks = entry.tasks || [];
  const dateStr = formatDateDisplay(entry.date);

  let tasksHtml = "";
  if (entryTasks.length > 0) {
    tasksHtml = '<div class="view-goals-section">' +
      '<h3 class="view-goals-title">Tasks &amp; Goals</h3>' +
      '<div class="view-goals-list">' +
      entryTasks.map(function(task, i) {
        const goal = task.goalId ? GOALS.find(function(g) { return g.id === task.goalId; }) : null;
        const hasNotes = task.notes && task.notes.trim();
        return '<div class="view-task-card' + (goal ? ' view-goal-' + goal.type.toLowerCase() : '') + '">' +
          '<label class="view-task-check-label" for="vtc-' + i + '">' +
            '<input type="checkbox" id="vtc-' + i + '" class="view-task-check">' +
            '<span class="view-task-check-box">&#10003;</span>' +
            '<span class="view-task-name">' + escapeHtml(task.name) + '</span>' +
          '</label>' +
          (hasNotes ?
            '<p class="view-goal-label" style="margin-top:0.85rem;">Staff Notes</p>' +
            '<p class="view-goal-text view-task-notes-text">' + escapeHtml(task.notes).replace(/\n/g, "<br>") + '</p>'
          : '') +
          (goal ?
            '<div class="view-goal-header" style="margin-top:' + (hasNotes ? '1.1rem' : '0.85rem') + ';margin-bottom:0;">' +
              '<span class="goal-type-badge goal-type-' + goal.type.toLowerCase() + '">' + (goal.type === "HG" ? "Goal" : goal.type) + '</span>' +
              '<span class="view-goal-outcome">' + goal.outcome + '</span>' +
            '</div>'
          : (!hasNotes ? '<p class="view-goal-text" style="color:var(--text-secondary);margin-top:0.5rem;font-style:italic;">No goal or notes linked</p>' : '')) +
          '</div>';
      }).join("") +
      '</div>' +
      '<button class="btn btn-send-report" onclick="sendTaskReport(\'' + id + '\')">&#128231; Send Completion Report</button>' +
      '</div>';
  } else {
    tasksHtml = '<p style="color:var(--text-secondary);font-style:italic;margin-top:1rem;">No tasks assigned to this activity.</p>';
  }

  const header =
    '<div class="view-entry-header">' +
      '<div class="view-entry-meta">' +
        '<div class="view-meta-item"><span class="view-meta-label">Date</span><span class="view-meta-value">' + dateStr + ' &mdash; ' + entry.day + '</span></div>' +
        '<div class="view-meta-item"><span class="view-meta-label">Time</span><span class="view-meta-value">' + entry.startTime + ' &ndash; ' + entry.endTime + '</span></div>' +
        '<div class="view-meta-item"><span class="view-meta-label">Hours</span><span class="view-meta-value view-meta-hours">' + entry.hours + '</span></div>' +
        '<div class="view-meta-item"><span class="view-meta-label">Type</span><span class="view-meta-value">' + (entry.type || "—") + '</span></div>' +
        '<div class="view-meta-item" style="grid-column:span 2;"><span class="view-meta-label">Location</span><span class="view-meta-value">' + entry.location + '</span></div>' +
        '<div class="view-meta-item"><span class="view-meta-label">Worker</span><span class="view-meta-value">' + (entry.claimedBy || '<em style="color:rgba(255,255,255,0.4)">Unclaimed</em>') + '</span></div>' +
      '</div>' +
    '</div>';
  const notesHtml = entry.activityNotes
    ? '<div class="view-activity-notes">' +
        '<h3 class="view-goals-title">Notes</h3>' +
        '<p class="view-activity-notes-text">' + escapeHtml(entry.activityNotes).replace(/\n/g, "<br>") + '</p>' +
      '</div>'
    : '';

  document.getElementById("viewModalContent").innerHTML = header + notesHtml + tasksHtml;
  document.getElementById("viewModal").style.display = "flex";
}

function closeViewModal() { document.getElementById("viewModal").style.display = "none"; }

function sendTaskReport(entryId) {
  const entry = allEntries[entryId];
  if (!entry) return;
  const workerName = getDisplayName() || "Staff";
  const dateStr = formatDateDisplay(entry.date);
  const tasks = entry.tasks || [];
  let doneCount = 0;
  const taskLines = tasks.map(function(task, i) {
    const cb = document.getElementById("vtc-" + i);
    const done = cb && cb.checked;
    if (done) doneCount++;
    return (done ? "✓ DONE    " : "□ PENDING ") + task.name;
  }).join("\n");
  const subject = "Task Report – Liam – " + dateStr + " " + entry.startTime;
  const body =
    "TASK COMPLETION REPORT\n" +
    "======================\n\n" +
    "Worker:    " + workerName + "\n" +
    "Date:      " + dateStr + " (" + entry.day + ")\n" +
    "Time:      " + entry.startTime + " – " + entry.endTime + "\n" +
    "Location:  " + entry.location + "\n\n" +
    "COMPLETED: " + doneCount + " of " + tasks.length + " tasks\n" +
    "----------------------\n" +
    taskLines + "\n\n" +
    "----------------------\n" +
    "Sent from Liam’s Schedule App";
  const a = document.createElement("a");
  a.href = "mailto:patjg.mccabe@gmail.com?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("Opening email...", "info");
}

function printEntry() {
  const content = document.getElementById("viewModalContent");
  if (!content) return;
  const win = window.open("", "_blank", "width=820,height=750");
  win.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Activity Details — Liam\'s Schedule</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">' +
    '<style>' +
    'body{font-family:Inter,sans-serif;color:#1e293b;padding:2rem;max-width:680px;margin:0 auto;}' +
    '.print-header{display:flex;align-items:center;gap:0.75rem;margin-bottom:0.25rem;}' +
    '.print-header h1{font-size:1.25rem;font-weight:800;color:#0b1628;}' +
    '.print-sub{color:#64748b;font-size:0.82rem;margin-bottom:1.5rem;border-bottom:2px solid #e2e8f0;padding-bottom:0.75rem;}' +
    '.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;background:#f1f5f9;border-radius:10px;padding:1.2rem;margin-bottom:1.5rem;}' +
    '.meta-item .lbl{font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;}' +
    '.meta-item .val{font-size:0.93rem;font-weight:600;color:#0b1628;margin-top:0.1rem;}' +
    '.goals-title{font-size:0.88rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#0b1628;margin-bottom:0.85rem;display:flex;align-items:center;gap:0.5rem;}' +
    '.goals-title::before{content:"";display:inline-block;width:3px;height:13px;background:#2dd4a8;border-radius:2px;}' +
    '.goal-card{border-radius:10px;padding:1rem;margin-bottom:0.85rem;page-break-inside:avoid;}' +
    '.goal-card.hg{background:#f0fdf4;border-left:4px solid #10b981;}' +
    '.goal-card.ss{background:#fffbeb;border-left:4px solid #f59e0b;}' +
    '.goal-header{display:flex;align-items:center;gap:0.5rem;margin-bottom:0.65rem;}' +
    '.gbadge{display:inline-block;padding:0.18rem 0.55rem;border-radius:50px;font-size:0.7rem;font-weight:700;}' +
    '.gbadge.hg{background:#d1fae5;color:#065f46;}' +
    '.gbadge.ss{background:#fef3c7;color:#92400e;}' +
    '.goal-outcome{font-weight:700;font-size:0.93rem;color:#0b1628;}' +
    '.glbl{font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;margin-top:0.6rem;margin-bottom:0.15rem;}' +
    '.gtxt{font-size:0.86rem;color:#334155;line-height:1.65;}' +
    '@media print{body{padding:1rem;}.no-print{display:none;}}' +
    '</style></head><body>');
  win.document.write('<div class="print-header"><span style="font-size:1.5rem;">&#9201;</span><h1>Liam\'s Schedule &mdash; Activity Details</h1></div>');
  win.document.write('<div class="print-sub">Printed ' + new Date().toLocaleDateString("en-US", {weekday:"long",year:"numeric",month:"long",day:"numeric"}) + '</div>');

  const metaItems = content.querySelectorAll('.view-meta-item');
  if (metaItems.length) {
    win.document.write('<div class="meta-grid">');
    metaItems.forEach(function(item) {
      const lbl = item.querySelector('.view-meta-label');
      const val = item.querySelector('.view-meta-value');
      if (lbl && val) {
        win.document.write('<div class="meta-item"><div class="lbl">' + lbl.textContent + '</div><div class="val">' + val.innerHTML + '</div></div>');
      }
    });
    win.document.write('</div>');
  }

  const goalCards = content.querySelectorAll('.view-goal-card');
  if (goalCards.length) {
    win.document.write('<div class="goals-title">Goals &amp; Methods</div>');
    goalCards.forEach(function(card) {
      const isHG = card.classList.contains('view-goal-hg');
      const tc = isHG ? 'hg' : 'ss';
      const outcome = card.querySelector('.view-goal-outcome');
      const labels = card.querySelectorAll('.view-goal-label');
      const texts = card.querySelectorAll('.view-goal-text');
      win.document.write('<div class="goal-card ' + tc + '"><div class="goal-header"><span class="gbadge ' + tc + '">' + (isHG ? 'HG' : 'SS') + '</span><span class="goal-outcome">' + (outcome ? outcome.textContent : '') + '</span></div>');
      labels.forEach(function(lbl, i) {
        win.document.write('<div class="glbl">' + lbl.textContent + '</div>');
        if (texts[i]) win.document.write('<div class="gtxt">' + texts[i].textContent + '</div>');
      });
      win.document.write('</div>');
    });
  }

  win.document.write('</body></html>');
  win.document.close();
  win.focus();
  setTimeout(function() { win.print(); }, 500);
}

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
  document.getElementById("editLocation").value = entry.location || "";
  document.getElementById("editNotes").value = entry.activityNotes || "";
  recalcEditHours();
  renderTaskInputs("editTaskList", entry.tasks || []);
  document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() { document.getElementById("editModal").style.display = "none"; editingId = null; }

function saveEdit() {
  if (!editingId || !isAdmin()) return;
  const dateInput = document.getElementById("editDate").value;
  const day = document.getElementById("editDay").value;
  const startTime = getEditTimeValue("editStart"); const endTime = getEditTimeValue("editEnd");
  const type = document.getElementById("editType").value;
  const location = document.getElementById("editLocation").value.trim();
  const hours = calcHoursBetween(startTime, endTime);
  const tasks = getTasksFromContainer("editTaskList");
  const activityNotes = document.getElementById("editNotes").value.trim();
  if (!dateInput) { showToast("Please select a date.", "error"); return; }
  if (hours <= 0) { showToast("End time must be after start time.", "error"); return; }
  if (!location) { showToast("Please enter a location.", "error"); return; }
  const dateParts = dateInput.split("-");
  const dateISO = dateParts[2] + "-" + dateParts[0] + "-" + dateParts[1];
  const updates = { date: dateISO, day, startTime, endTime, type, location, activityNotes: activityNotes || null, hours, tasks };
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
