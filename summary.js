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
const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b"];
const ADMIN_EMAIL = "patjg.mccabe@gmail.com";

let db = null;
let entriesRef = null;
let firebaseReady = false;
let allEntries = {};
let currentUser = null;
let isAdmin = false;

/* ===== Initialize ===== */
document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
});

function initFirebase() {
  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    document.getElementById("setupBanner").style.display = "block";
    isAdmin = true;
    loadFromLocalStorage();
    return;
  }
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
  } catch (e) {
    console.error("Firebase init error:", e);
    document.getElementById("setupBanner").style.display = "block";
    isAdmin = true;
    loadFromLocalStorage();
    return;
  }

  firebase.auth().onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    currentUser = user;
    isAdmin = user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    updateNavbar();

    if (firebaseReady) return;
    firebaseReady = true;
    db = firebase.database();
    entriesRef = db.ref("entries");
    entriesRef.on("value", (snapshot) => {
      allEntries = snapshot.val() || {};
      renderSummary();
    });
  });
}

function updateNavbar() {
  const el = document.getElementById("navUser");
  if (!el || !currentUser) return;
  const name = currentUser.displayName || currentUser.email;
  el.innerHTML = `<span class="nav-username">${name}</span>
    <button class="nav-signout-btn" onclick="signOutUser()">Sign Out</button>`;
}

function signOutUser() {
  firebase.auth().signOut().then(() => {
    window.location.href = "login.html";
  });
}

function loadFromLocalStorage() {
  const stored = localStorage.getItem("liamScheduleEntries");
  if (stored) {
    allEntries = JSON.parse(stored);
  }
  renderSummary();
}

/* ===== Get Monday of the week for a given date ===== */
function getWeekMonday(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust for Sunday
  const monday = new Date(d);
  monday.setDate(diff);
  return monday;
}

function formatDateShort(d) {
  return (d.getMonth() + 1) + "/" + d.getDate();
}

function formatWeekRange(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return formatDateShort(monday) + " - " + formatDateShort(sunday) + " (" + monday.getFullYear() + ")";
}

/* ===== Check if entry end time has passed ===== */
function entryHasPassed(entry) {
  const parts = entry.endTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!parts) return false;
  let h = parseInt(parts[1]);
  const m = parseInt(parts[2]);
  const ampm = parts[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  const entryEnd = new Date(entry.date + "T00:00:00");
  entryEnd.setHours(h, m, 0, 0);
  return entryEnd < new Date();
}

/* ===== Render Summary ===== */
function renderSummary() {
  const entriesWithIds = Object.entries(allEntries);

  // Only include entries that are claimed AND whose date/time has passed
  const claimed = entriesWithIds.filter(([id, e]) => e.claimedBy && e.claimedBy.trim() !== "" && entryHasPassed(e));

  // Group by week (Monday date), tracking entry IDs per week
  const weeks = {};
  claimed.forEach(([id, entry]) => {
    const monday = getWeekMonday(entry.date);
    const key = monday.toISOString().slice(0, 10);
    if (!weeks[key]) {
      weeks[key] = { monday: monday, participants: {}, entryIds: [] };
      PARTICIPANTS.forEach(p => weeks[key].participants[p] = 0);
    }
    weeks[key].entryIds.push(id);
    if (PARTICIPANTS.includes(entry.claimedBy)) {
      weeks[key].participants[entry.claimedBy] += entry.hours;
    }
  });

  // Sort weeks chronologically
  const sortedWeeks = Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0]));

  // Grand totals
  const grandTotals = {};
  PARTICIPANTS.forEach(p => grandTotals[p] = 0);

  const tbody = document.getElementById("summaryBody");
  let html = "";

  if (sortedWeeks.length === 0) {
    html = '<tr><td colspan="8" class="empty-state"><p>No hours worked yet.</p></td></tr>';
  } else {
    sortedWeeks.forEach(([key, week]) => {
      let weekTotal = 0;
      const idsJson = JSON.stringify(week.entryIds).replace(/"/g, '&quot;');
      html += "<tr>";
      html += `<td style="white-space:nowrap; font-weight:600;">${formatWeekRange(week.monday)}</td>`;
      PARTICIPANTS.forEach(p => {
        const hrs = week.participants[p];
        weekTotal += hrs;
        grandTotals[p] += hrs;
        html += `<td>${hrs > 0 ? hrs : "-"}</td>`;
      });
      html += `<td class="week-total">${Math.round(weekTotal * 100) / 100}</td>`;
      html += `<td>${isAdmin ? `<button class="btn btn-danger" onclick="deleteWeek('${key}', '${formatWeekRange(week.monday)}')">X</button>` : ""}</td>`;
      html += "</tr>";
    });

    // Grand total row
    let grandTotal = 0;
    html += '<tr class="total-row">';
    html += '<td>Grand Total</td>';
    PARTICIPANTS.forEach(p => {
      const t = Math.round(grandTotals[p] * 100) / 100;
      grandTotal += t;
      html += `<td>${t > 0 ? t : "-"}</td>`;
    });
    html += `<td>${Math.round(grandTotal * 100) / 100}</td>`;
    html += "<td></td>";
    html += "</tr>";
  }

  tbody.innerHTML = html;

  // Render individual total cards
  renderTotalCards(grandTotals);
}

/* ===== Individual Total Cards ===== */
function renderTotalCards(totals) {
  const grid = document.getElementById("totalsGrid");
  let html = "";
  PARTICIPANTS.forEach((p, i) => {
    const hrs = Math.round((totals[p] || 0) * 100) / 100;
    html += `<div style="
      background: ${COLORS[i]}11;
      border: 2px solid ${COLORS[i]}33;
      border-radius: 10px;
      padding: 1.2rem;
      text-align: center;
    ">
      <div style="font-size:0.85rem; color:var(--text-secondary); font-weight:600; margin-bottom:0.3rem;">${p}</div>
      <div style="font-size:1.8rem; font-weight:700; color:${COLORS[i]};">${hrs}</div>
      <div style="font-size:0.75rem; color:var(--text-secondary);">total hours</div>
    </div>`;
  });
  grid.innerHTML = html;
}

/* ===== Delete Week ===== */
function deleteWeek(weekKey, weekLabel) {
  // Find all entry IDs for this week
  const ids = [];
  Object.entries(allEntries).forEach(([id, entry]) => {
    if (entry.claimedBy && entry.claimedBy.trim() !== "") {
      const monday = getWeekMonday(entry.date);
      const key = monday.toISOString().slice(0, 10);
      if (key === weekKey) ids.push(id);
    }
  });

  if (!confirm("Are you sure you want to delete all " + ids.length + " claimed entries for the week of " + weekLabel + "? This cannot be undone.")) {
    return;
  }

  if (firebaseReady) {
    const updates = {};
    ids.forEach(id => updates[id] = null);
    entriesRef.update(updates);
  } else {
    ids.forEach(id => delete allEntries[id]);
    localStorage.setItem("liamScheduleEntries", JSON.stringify(allEntries));
    renderSummary();
  }
}
