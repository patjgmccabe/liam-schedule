/* =============================================================
   CDPAP HOURS LOG — Admin Only
   Workers: Caleigh, Cristhian, Jen S.
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

const ADMIN_EMAILS = ["patjg.mccabe@gmail.com", "shannennmccabe@gmail.com"];
const WORKERS = ["Caleigh", "Cristhian", "Jen S."];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

let db = null;
let entriesRef = null;
let allEntries = {};
let firebaseReady = false;
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  auth.onAuthStateChanged((user) => {
    if (!user) { window.location.href = "login.html"; return; }
    currentUser = user;
    if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) { window.location.href = "index.html"; return; }
    initApp();
  });
});

function initApp() {
  initTimePickers();
  initDatePicker();
  initEditTimePickers();
  initFirebaseDB();
}

function initFirebaseDB() {
  try {
    db = firebase.database();
    entriesRef = db.ref("cdpap_entries");
    firebaseReady = true;
    entriesRef.on("value", (snapshot) => {
      allEntries = snapshot.val() || {};
      renderTable();
    });
  } catch (e) {
    console.error("Firebase DB error:", e);
    allEntries = {};
    renderTable();
  }
}

function generateId() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function initDatePicker() {
  flatpickr("#entryDate", {
    dateFormat: "m-d-Y",
    disableMobile: true,
    onChange: function(selectedDates) {
      if (selectedDates.length > 0) {
        document.getElementById("entryDay").value = DAYS[selectedDates[0].getDay()];
      }
    }
  });
}

function buildTimeSelects(prefix, defaultHour, onChange) {
  const hours = Array.from({length: 12}, (_, i) => i + 1);
  const mins = Array.from({length: 12}, (_, i) => (i * 5).toString().padStart(2, "0"));
  const hourSel = document.getElementById(prefix + "Hour");
  const minSel = document.getElementById(prefix + "Min");
  hourSel.innerHTML = hours.map(h => `<option value="${h}">${h}</option>`).join("");
  minSel.innerHTML = mins.map(m => `<option value="${m}">${m}</option>`).join("");
  hourSel.value = defaultHour;
  minSel.value = "00";
  hourSel.addEventListener("change", onChange);
  minSel.addEventListener("change", onChange);
  document.getElementById(prefix + "Ampm").addEventListener("change", onChange);
}

function initTimePickers() {
  buildTimeSelects("start", "9", recalcHours);
  buildTimeSelects("end", "10", recalcHours);
  recalcHours();
}

function initEditTimePickers() {
  buildTimeSelects("editStart", "9", recalcEditHours);
  buildTimeSelects("editEnd", "10", recalcEditHours);
  editDatePicker = flatpickr("#editDate", {
    dateFormat: "m-d-Y",
    disableMobile: true,
    onChange: function(selectedDates) {
      if (selectedDates.length > 0) {
        document.getElementById("editDay").value = DAYS[selectedDates[0].getDay()];
        recalcEditHours();
      }
    }
  });
}

function getTimeValue(prefix) {
  const h = parseInt(document.getElementById(prefix + "Hour").value);
  const m = parseInt(document.getElementById(prefix + "Min").value);
  const ampm = document.getElementById(prefix + "Ampm").value;
  return h + ":" + m.toString().padStart(2, "0") + " " + ampm;
}

function timeToMinutes(timeStr) {
  const parts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!parts) return 0;
  let h = parseInt(parts[1]);
  const m = parseInt(parts[2]);
  const ampm = parts[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function calcHoursBetween(startStr, endStr) {
  const startMins = timeToMinutes(startStr);
  let endMins = timeToMinutes(endStr);
  if (endMins <= startMins) endMins += 24 * 60;
  return Math.round((endMins - startMins) / 60 * 100) / 100;
}

function recalcHours() {
  const hours = calcHoursBetween(getTimeValue("start"), getTimeValue("end"));
  document.getElementById("hoursDisplay").textContent = hours > 0 ? hours : "0";
}

function recalcEditHours() {
  const hours = calcHoursBetween(getTimeValue("editStart"), getTimeValue("editEnd"));
  document.getElementById("editHoursDisplay").textContent = hours > 0 ? hours : "0";
}

function toggleForm() {
  const form = document.getElementById("entryForm");
  const btn = document.getElementById("toggleFormBtn");
  form.classList.toggle("open");
  btn.classList.toggle("active");
  btn.textContent = form.classList.contains("open") ? "Cancel" : "+ Log New Entry";
}

function addEntry() {
  const worker = document.getElementById("entryWorker").value;
  const dateInput = document.getElementById("entryDate").value;
  const day = document.getElementById("entryDay").value;
  const startTime = getTimeValue("start");
  const endTime = getTimeValue("end");
  const desc = document.getElementById("entryDesc").value.trim();
  const hours = calcHoursBetween(startTime, endTime);

  if (!worker) { showToast("Please select a worker.", "error"); return; }
  if (!dateInput) { showToast("Please select a date.", "error"); return; }
  if (hours <= 0) { showToast("End time must be after start time.", "error"); return; }

  const dateParts = dateInput.split("-");
  const dateISO = dateParts[2] + "-" + dateParts[0] + "-" + dateParts[1];
  const entry = { worker, date: dateISO, day, startTime, endTime, hours, description: desc, createdAt: Date.now() };
  const id = generateId();

  if (firebaseReady) {
    entriesRef.child(id).set(entry).then(() => showToast("Hours logged for " + worker + "!", "success"));
  } else {
    allEntries[id] = entry;
    renderTable();
    showToast("Hours logged for " + worker + "!", "success");
  }

  document.getElementById("entryWorker").value = "";
  document.getElementById("entryDate").value = "";
  document.getElementById("entryDay").value = "";
  document.getElementById("entryDesc").value = "";
  toggleForm();
}

function deleteEntry(id) {
  if (!confirm("Delete this entry? This cannot be undone.")) return;
  if (firebaseReady) {
    entriesRef.child(id).remove();
  } else {
    delete allEntries[id];
    renderTable();
  }
  showToast("Entry deleted.", "info");
}

function renderTable() {
  const tbody = document.getElementById("logBody");
  const sorted = Object.entries(allEntries).sort((a, b) => {
    const d = b[1].date.localeCompare(a[1].date);
    return d !== 0 ? d : timeToMinutes(b[1].startTime) - timeToMinutes(a[1].startTime);
  });

  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><p>No hours logged yet. Use the button above to add an entry.</p></td></tr>';
    document.getElementById("entryCount").textContent = "";
    return;
  }

  const colors = { "Caleigh": "#7c3aed", "Cristhian": "#2563eb", "Jen S.": "#db2777" };
  tbody.innerHTML = sorted.map(([id, entry]) => {
    const parts = entry.date.split("-");
    const dateDisplay = parts[1] + "-" + parts[2] + "-" + parts[0];
    const color = colors[entry.worker] || "#374151";
    return `<tr>
      <td>${dateDisplay}</td>
      <td>${entry.day}</td>
      <td><span style="font-weight:600;color:${color};">${entry.worker}</span></td>
      <td style="white-space:nowrap;">${entry.startTime} – ${entry.endTime}</td>
      <td style="text-align:center;font-weight:600;color:var(--primary);">${entry.hours}</td>
      <td>${entry.description || '<span style="color:var(--text-secondary);">—</span>'}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-edit" onclick="editEntry('${id}')">Edit</button>
        <button class="btn btn-danger" onclick="deleteEntry('${id}')" style="margin-left:0.25rem;">X</button>
      </td>
    </tr>`;
  }).join("");
  document.getElementById("entryCount").textContent = sorted.length + " entries";
}

let editingId = null;
let editDatePicker = null;

function editEntry(id) {
  const entry = allEntries[id];
  if (!entry) return;
  editingId = id;
  document.getElementById("editWorker").value = entry.worker;
  const parts = entry.date.split("-");
  editDatePicker.setDate(parts[1] + "-" + parts[2] + "-" + parts[0], true, "m-d-Y");
  document.getElementById("editDay").value = entry.day;
  setTimeSelects("editStart", entry.startTime);
  setTimeSelects("editEnd", entry.endTime);
  document.getElementById("editDesc").value = entry.description || "";
  recalcEditHours();
  document.getElementById("editModal").style.display = "flex";
}

function closeEditModal() {
  document.getElementById("editModal").style.display = "none";
  editingId = null;
}

function setTimeSelects(prefix, timeStr) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return;
  document.getElementById(prefix + "Hour").value = parseInt(match[1]);
  document.getElementById(prefix + "Min").value = (Math.round(parseInt(match[2]) / 5) * 5).toString().padStart(2, "0");
  document.getElementById(prefix + "Ampm").value = match[3].toUpperCase();
}

function saveEdit() {
  if (!editingId) return;
  const worker = document.getElementById("editWorker").value;
  const dateInput = document.getElementById("editDate").value;
  const day = document.getElementById("editDay").value;
  const startTime = getTimeValue("editStart");
  const endTime = getTimeValue("editEnd");
  const desc = document.getElementById("editDesc").value.trim();
  const hours = calcHoursBetween(startTime, endTime);

  if (!worker) { showToast("Please select a worker.", "error"); return; }
  if (!dateInput) { showToast("Please select a date.", "error"); return; }
  if (hours <= 0) { showToast("End time must be after start time.", "error"); return; }

  const dateParts = dateInput.split("-");
  const dateISO = dateParts[2] + "-" + dateParts[0] + "-" + dateParts[1];
  const updates = { worker, date: dateISO, day, startTime, endTime, hours, description: desc };

  if (firebaseReady) {
    entriesRef.child(editingId).update(updates).then(() => showToast("Entry updated!", "success"));
  } else {
    Object.assign(allEntries[editingId], updates);
    renderTable();
    showToast("Entry updated!", "success");
  }
  closeEditModal();
}

function showToast(message, type) {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = "toast toast-" + type;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
