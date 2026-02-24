/* =============================================================
   FIREBASE CONFIGURATION — must match app.js
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

const PARTICIPANTS = ["Brendan", "Caleigh", "Shannon", "Kelly", "Aidan"];
const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b"];

let db = null;
let entriesRef = null;
let firebaseReady = false;
let allEntries = {};

/* ===== Initialize ===== */
document.addEventListener("DOMContentLoaded", () => {
  initFirebase();
});

function initFirebase() {
  if (firebaseConfig.apiKey === "YOUR_API_KEY") {
    document.getElementById("setupBanner").style.display = "block";
    loadFromLocalStorage();
    return;
  }
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    db = firebase.database();
    entriesRef = db.ref("entries");
    firebaseReady = true;
    entriesRef.on("value", (snapshot) => {
      allEntries = snapshot.val() || {};
      renderSummary();
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

/* ===== Render Summary ===== */
function renderSummary() {
  const entries = Object.values(allEntries);

  // Only include entries that have been claimed
  const claimed = entries.filter(e => e.claimedBy && e.claimedBy.trim() !== "");

  // Group by week (Monday date)
  const weeks = {};
  claimed.forEach(entry => {
    const monday = getWeekMonday(entry.date);
    const key = monday.toISOString().slice(0, 10);
    if (!weeks[key]) {
      weeks[key] = { monday: monday, participants: {} };
      PARTICIPANTS.forEach(p => weeks[key].participants[p] = 0);
    }
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
    html = '<tr><td colspan="7" class="empty-state"><p>No claimed hours yet.</p></td></tr>';
  } else {
    sortedWeeks.forEach(([key, week]) => {
      let weekTotal = 0;
      html += "<tr>";
      html += `<td style="white-space:nowrap; font-weight:600;">${formatWeekRange(week.monday)}</td>`;
      PARTICIPANTS.forEach(p => {
        const hrs = week.participants[p];
        weekTotal += hrs;
        grandTotals[p] += hrs;
        html += `<td>${hrs > 0 ? hrs : "-"}</td>`;
      });
      html += `<td class="week-total">${Math.round(weekTotal * 100) / 100}</td>`;
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
