/* =============================================================
   CDPAP WEEKLY SUMMARY — Admin Only
   Weeks run Sunday through Saturday.
   Access restricted to admin emails via Firebase Auth.
   ============================================================= */

/* ===== Firebase Configuration ===== */
const firebaseConfig = {
  apiKey: "AIzaSyDyvJBbVCL-9oST1VG9apdfk_6vUYkxIrs",
  authDomain: "liam-schedule.firebaseapp.com",
  databaseURL: "https://liam-schedule-default-rtdb.firebaseio.com",
  projectId: "liam-schedule",
  storageBucket: "liam-schedule.firebasestorage.app",
  messagingSenderId: "300732041208",
  appId: "1:300732041208:web:70de624e17ca61a7ed380d"
};

/* ===== Admin Access List ===== */
const ADMIN_EMAILS = ["patjg.mccabe@gmail.com", "shannennmccabe@gmail.com"];

/* ===== Constants ===== */
const WORKERS = ["Caleigh", "Cristhian", "Jen S."];
const WORKER_COLORS = ["#7c3aed", "#2563eb", "#db2777"];
const LS_KEY = "cdpapEntries";

/* ===== State ===== */
let db = null;
let entriesRef = null;
let firebaseReady = false;
let allEntries = {};

/* ===== Auth Guard — runs first ===== */
document.addEventListener("DOMContentLoaded", () => {
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
    if (!isAdmin) {
      window.location.href = "index.html";
      return;
    }
    // Admin confirmed — initialize the app
    initApp();
  });
});

/* ===== Initialize App ===== */
function initApp() {
  initFirebaseDB();
}

/* ===== Firebase Database ===== */
function initFirebaseDB() {
  try {
    db = firebase.database();
    entriesRef = db.ref("cdpap_entries");
    firebaseReady = true;
    entriesRef.on("value", (snapshot) => {
      allEntries = snapshot.val() || {};
      renderSummary();
    });
  } catch (e) {
    console.error("Firebase DB error:", e);
    loadFromLocalStorage();
  }
}

function loadFromLocalStorage() {
  const stored = localStorage.getItem(LS_KEY);
  allEntries = stored ? JSON.parse(stored) : {};
  renderSummary();
}

/* =============================================================
   Week Helpers — Sunday through Saturday
   ============================================================= */

/**
 * Returns a Date set to the Sunday that starts the week containing dateStr.
 */
function getWeekSunday(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - d.getDay()); // subtract day-of-week (0=Sun)
  return sunday;
}

function formatDateShort(d) {
  return (d.getMonth() + 1) + "/" + d.getDate();
}

/** Returns a label like "Sun 3/2 – Sat 3/8 (2026)" */
function formatWeekRange(sunday) {
  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);
  return "Sun " + formatDateShort(sunday) + " – Sat " + formatDateShort(saturday) + " (" + sunday.getFullYear() + ")";
}

/* =============================================================
   Render Summary
   ============================================================= */
function renderSummary() {
  const tbody = document.getElementById("summaryBody");
  const entries = Object.values(allEntries);

  if (entries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><p>No hours logged yet. <a href="cdpap.html" style="color:var(--primary);">Go to the CDPAP Log</a> to add entries.</p></td></tr>';
    renderTotalCards({ Caleigh: 0, Cristhian: 0, "Jen S.": 0 });
    return;
  }

  // Group entries by week (keyed by Sunday ISO date)
  const weeks = {};
  entries.forEach((entry) => {
    const sunday = getWeekSunday(entry.date);
    const key = sunday.toISOString().slice(0, 10);
    if (!weeks[key]) {
      weeks[key] = { sunday, workers: {} };
      WORKERS.forEach(w => weeks[key].workers[w] = 0);
    }
    if (WORKERS.includes(entry.worker)) {
      weeks[key].workers[entry.worker] += entry.hours;
    }
  });

  // Sort weeks chronologically
  const sortedWeeks = Object.entries(weeks).sort((a, b) => a[0].localeCompare(b[0]));

  // Grand totals
  const grandTotals = {};
  WORKERS.forEach(w => grandTotals[w] = 0);

  let html = "";
  sortedWeeks.forEach(([key, week]) => {
    let weekTotal = 0;
    html += "<tr>";
    html += `<td style="white-space:nowrap; font-weight:600;">${formatWeekRange(week.sunday)}</td>`;
    WORKERS.forEach(w => {
      const hrs = Math.round(week.workers[w] * 100) / 100;
      weekTotal += hrs;
      grandTotals[w] += hrs;
      html += `<td>${hrs > 0 ? hrs : "–"}</td>`;
    });
    html += `<td class="week-total">${Math.round(weekTotal * 100) / 100}</td>`;
    html += "</tr>";
  });

  // Grand total row
  let grandTotal = 0;
  html += '<tr class="total-row"><td>Grand Total</td>';
  WORKERS.forEach(w => {
    const t = Math.round(grandTotals[w] * 100) / 100;
    grandTotal += t;
    html += `<td>${t > 0 ? t : "–"}</td>`;
  });
  html += `<td>${Math.round(grandTotal * 100) / 100}</td></tr>`;

  tbody.innerHTML = html;
  renderTotalCards(grandTotals);
}

/* ===== Individual Total Cards ===== */
function renderTotalCards(totals) {
  const grid = document.getElementById("totalsGrid");
  let html = "";
  WORKERS.forEach((w, i) => {
    const color = WORKER_COLORS[i];
    const hrs = Math.round((totals[w] || 0) * 100) / 100;
    html += `<div style="
      background: ${color}11;
      border: 2px solid ${color}33;
      border-radius: 10px;
      padding: 1.2rem;
      text-align: center;
    ">
      <div style="font-size:0.85rem; color:${color}; font-weight:700; margin-bottom:0.3rem;">${w}</div>
      <div style="font-size:1.8rem; font-weight:700; color:${color};">${hrs}</div>
      <div style="font-size:0.75rem; color:var(--text-secondary);">total hours</div>
    </div>`;
  });
  grid.innerHTML = html;
}
