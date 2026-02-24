/* =============================================================
   FIREBASE CONFIGURATION
   Replace the values below with your Firebase project config.
   See README.md for setup instructions.
   ============================================================= */
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

/* ===== Constants ===== */
const PARTICIPANTS = ["Brendan", "Caleigh", "Shannon", "Kelly", "Aidan"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/* ===== State ===== */
let db = null;
let entriesRef = null;
let allEntries = {};
let showPast = false;
let firebaseReady = false;

/* ===== Seed Data from existing PDF schedule ===== */
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
  initFirebase();
});

function initFirebase() {
  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    // Firebase not configured - use localStorage fallback
    document.getElementById("setupBanner").style.display = "block";
    loadFromLocalStorage();
    return;
  }
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    entriesRef = db.ref("entries");
    firebaseReady = true;
    // Listen for real-time changes
    entriesRef.on("value", (snapshot) => {
      allEntries = snapshot.val() || {};
      renderTable();
    });
    // Check if we need to seed data
    entriesRef.once("value", (snapshot) => {
      if (!snapshot.exists()) {
        seedData();
      }
    });
  } catch (e) {
    console.error("Firebase init error:", e);
    document.getElementById("setupBanner").style.display = "block";
    loadFromLocalStorage();
  }
}

function loadFromLocalStorage() {
  const stored = localStorage.getItem("liamScheduleEntries");
  if (stored) {
    allEntries = JSON.parse(stored);
  } else {
    seedData();
  }
  renderTable();
}

function saveToLocalStorage() {
  localStorage.setItem("liamScheduleEntries", JSON.stringify(allEntries));
}

function seedData() {
  SEED_DATA.forEach((entry) => {
    const id = generateId();
    entry.createdAt = Date.now();
    if (firebaseReady) {
      entriesRef.child(id).set(entry);
    } else {
      allEntries[id] = entry;
    }
  });
  if (!firebaseReady) saveToLocalStorage();
}

function generateId() {
  return "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ===== Date Picker (Flatpickr) ===== */
function initDatePicker() {
  flatpickr("#entryDate", {
    dateFormat: "m-d-Y",
    minDate: "today",
    disableMobile: true,
    onChange: function(selectedDates) {
      if (selectedDates.length > 0) {
        const d = selectedDates[0];
        document.getElementById("entryDay").value = DAYS[d.getDay()];
      }
    }
  });
}

/* ===== Time Picker Dropdowns ===== */
function initTimePickers() {
  const hours = [];
  for (let i = 1; i <= 12; i++) hours.push(i);
  const mins = [];
  for (let i = 0; i < 60; i += 5) mins.push(i.toString().padStart(2, "0"));

  ["start", "end"].forEach((prefix) => {
    const hourSel = document.getElementById(prefix + "Hour");
    const minSel = document.getElementById(prefix + "Min");
    hourSel.innerHTML = hours.map(h => `<option value="${h}">${h}</option>`).join("");
    minSel.innerHTML = mins.map(m => `<option value="${m}">${m}</option>`).join("");
    // Set sensible defaults
    if (prefix === "start") { hourSel.value = "9"; minSel.value = "00"; }
    if (prefix === "end") { hourSel.value = "10"; minSel.value = "00"; }
    // Recalc hours on change
    hourSel.addEventListener("change", recalcHours);
    minSel.addEventListener("change", recalcHours);
  });
  document.getElementById("startAmpm").addEventListener("change", recalcHours);
  document.getElementById("endAmpm").addEventListener("change", recalcHours);
  recalcHours();
}

function getTimeValue(prefix) {
  const h = parseInt(document.getElementById(prefix + "Hour").value);
  const m = parseInt(document.getElementById(prefix + "Min").value);
  const ampm = document.getElementById(prefix + "Ampm").value;
  return formatTime(h, m, ampm);
}

function formatTime(h, m, ampm) {
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
  if (endMins <= startMins) endMins += 24 * 60; // crosses midnight
  return Math.round((endMins - startMins) / 60 * 100) / 100;
}

function recalcHours() {
  const start = getTimeValue("start");
  const end = getTimeValue("end");
  const hours = calcHoursBetween(start, end);
  document.getElementById("hoursDisplay").textContent = hours > 0 ? hours : "0";
}

/* ===== Form Toggle ===== */
function toggleForm() {
  const form = document.getElementById("entryForm");
  const btn = document.getElementById("toggleFormBtn");
  form.classList.toggle("open");
  btn.classList.toggle("active");
  btn.textContent = form.classList.contains("open") ? "Cancel" : "+ Add New Slot";
}

/* ===== Add Entry ===== */
function addEntry() {
  const dateInput = document.getElementById("entryDate").value;
  const day = document.getElementById("entryDay").value;
  const startTime = getTimeValue("start");
  const endTime = getTimeValue("end");
  const desc = document.getElementById("entryDesc").value.trim();
  const location = document.getElementById("entryLocation").value.trim();
  const hours = calcHoursBetween(startTime, endTime);

  if (!dateInput) { showToast("Please select a date.", "error"); return; }
  if (hours <= 0) { showToast("End time must be after start time.", "error"); return; }
  if (!location) { showToast("Please enter a location.", "error"); return; }

  // Convert date from MM-DD-YYYY to YYYY-MM-DD for storage
  const dateParts = dateInput.split("-");
  const dateISO = dateParts[2] + "-" + dateParts[0] + "-" + dateParts[1];

  const entry = {
    date: dateISO,
    day: day,
    startTime: startTime,
    endTime: endTime,
    description: desc,
    location: location,
    claimedBy: "",
    hours: hours,
    createdAt: Date.now()
  };

  const id = generateId();
  if (firebaseReady) {
    entriesRef.child(id).set(entry).then(() => {
      showToast("Time slot added!", "success");
    });
  } else {
    allEntries[id] = entry;
    saveToLocalStorage();
    renderTable();
    showToast("Time slot added!", "success");
  }

  // Reset form
  document.getElementById("entryDate").value = "";
  document.getElementById("entryDay").value = "";
  document.getElementById("entryDesc").value = "";
  document.getElementById("entryLocation").value = "";
  toggleForm();
}

/* ===== Claim / Unclaim ===== */
function claimEntry(id) {
  const sel = document.getElementById("claim-" + id);
  const name = sel.value;
  if (!name) { showToast("Please select a name.", "error"); return; }
  if (firebaseReady) {
    entriesRef.child(id).update({ claimedBy: name });
  } else {
    allEntries[id].claimedBy = name;
    saveToLocalStorage();
    renderTable();
  }
  showToast(name + " claimed the slot!", "success");
}

function unclaimEntry(id) {
  if (firebaseReady) {
    entriesRef.child(id).update({ claimedBy: "" });
  } else {
    allEntries[id].claimedBy = "";
    saveToLocalStorage();
    renderTable();
  }
  showToast("Slot unclaimed.", "info");
}

function deleteEntry(id) {
  if (!confirm("Delete this time slot?")) return;
  if (firebaseReady) {
    entriesRef.child(id).remove();
  } else {
    delete allEntries[id];
    saveToLocalStorage();
    renderTable();
  }
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Sort entries by date then time
  const sorted = Object.entries(allEntries).sort((a, b) => {
    const dateCompare = a[1].date.localeCompare(b[1].date);
    if (dateCompare !== 0) return dateCompare;
    return timeToMinutes(a[1].startTime) - timeToMinutes(b[1].startTime);
  });

  let html = "";
  let visibleCount = 0;

  sorted.forEach(([id, entry]) => {
    const entryDate = new Date(entry.date + "T00:00:00");
    const isPast = entryDate < today;

    if (isPast && !showPast) return;
    visibleCount++;

    const dateFormatted = formatDateDisplay(entry.date);
    const timeSlot = entry.startTime + " - " + entry.endTime;
    const statusBadge = isPast
      ? '<span class="badge badge-passed">Date Passed</span>'
      : entry.claimedBy
        ? '<span class="badge badge-claimed">Claimed</span>'
        : '<span class="badge badge-available">Available</span>';

    let claimCell;
    if (isPast) {
      claimCell = entry.claimedBy ? `<span class="claimed-name">${entry.claimedBy}</span>` : '<span style="color:var(--text-secondary);">-</span>';
    } else if (entry.claimedBy) {
      claimCell = `<span class="claimed-name">${entry.claimedBy}</span> <button class="unclaim-btn" onclick="unclaimEntry('${id}')">remove</button>`;
    } else {
      const opts = PARTICIPANTS.map(p => `<option value="${p}">${p}</option>`).join("");
      claimCell = `<div class="claim-controls">
        <select id="claim-${id}"><option value="">Select...</option>${opts}</select>
        <button class="btn btn-success" onclick="claimEntry('${id}')">Claim</button>
      </div>`;
    }

    const deleteBtn = isPast ? "" : `<button class="btn btn-danger" onclick="deleteEntry('${id}')" title="Delete">X</button>`;

    html += `<tr class="${isPast ? 'past-date' : ''}">
      <td>${dateFormatted}</td>
      <td>${entry.day}</td>
      <td style="white-space:nowrap;">${timeSlot}</td>
      <td>${entry.description || ""}</td>
      <td>${entry.location}</td>
      <td>${claimCell}</td>
      <td>${statusBadge}</td>
      <td style="text-align:center; font-weight:600;">${entry.hours}</td>
      <td>${deleteBtn}</td>
    </tr>`;
  });

  if (visibleCount === 0) {
    html = `<tr><td colspan="9" class="empty-state"><p>${showPast ? "No entries found." : "No upcoming entries. Add a new time slot!"}</p></td></tr>`;
  }

  tbody.innerHTML = html;
  document.getElementById("entryCount").textContent = visibleCount + " entries";
}

/* ===== Date Formatting ===== */
function formatDateDisplay(isoDate) {
  const parts = isoDate.split("-");
  return parts[1] + "-" + parts[2] + "-" + parts[0];
}

/* ===== Toast Notifications ===== */
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
