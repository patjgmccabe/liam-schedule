/* =============================================================
   CDPAP HOURS LOG — Admin Only
   Workers: Caleigh, Cristhian, Jen S.
   Data stored separately under "cdpap_entries/" in Firebase.
   Access restricted to admin emails via Firebase Auth.
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

/* ===== Auth Guard ===== */
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

/* ===== Firebase DB ===== */
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

/* ===== Date Picker ===== */
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

/* ===== Time Pickers ===== */
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

/* ===== Form Toggle ===== */
function toggleForm() {
  const form = document.getElementById("entryForm");
  const btn = document.getElementById("toggleFormBtn");
  form.classList.toggle("open");
  btn.classList.toggle("active");
  btn.textContent = form.classList.contains("open") ? "Cancel" : "+ Log New Entry";
}

/* ===== Add Entry ===== */
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

/* ===== Delete Entry ===== */
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

/* ===== Render Table ===== */
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
    const dateDisplay = entry.date.split("-").slice(1).join("-") + "-" + entry.date.split("-")[0];
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

/* ===== Edit Modal ===== */
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

/* ===== Toast ===== */
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
/* =============================================================
   CDPAP HOURS LOG — Admin Only
   Workers: Caleigh, Cristhian, Jen S.
   Data stored separately under "cdpap_entries/" in Firebase.
   Access restricted to admin emails via Firebase Auth.
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
const LS_KEY = "cdpapEntries";

let db = null, entriesRef = null, allEntries = {}, firebaseReady = false, currentUser = null;

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
    entriesRef.on("value", (snapshot) => { allEntries = snapshot.val() || {}; renderTable(); });
  } catch (e) { console.error("Firebase DB error:", e); loadFromLocalStorage(); }
}

function loadFromLocalStorage() {
  const stored = localStorage.getItem(LS_KEY);
  allEntries = stored ? JSON.parse(stored) : {};
  renderTable();
}

function saveToLocalStorage() { localStorage.setItem(LS_KEY, JSON.stringify(allEntries)); }
function generateId() { return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function initDatePicker() {
  flatpickr("#entryDate", {
    dateFormat: "m-d-Y", disableMobile: true,
    onChange: function(selectedDates) {
      if (selectedDates.length > 0) document.getElementById("entryDay").value = DAYS[selectedDates[0].getDay()];
    }
  });
}

function initTimePickers() {
  const hours = Array.from({length:12},(_,i)=>i+1);
  const mins = Array.from({length:12},(_,i)=>(i*5).toString().padStart(2,"0"));
  ["start","end"].forEach((prefix) => {
    const hSel = document.getElementById(prefix+"Hour"), mSel = document.getElementById(prefix+"Min");
    hSel.innerHTML = hours.map(h=>`<option value="${h}">${h}</option>`).join("");
    mSel.innerHTML = mins.map(m=>`<option value="${m}">${m}</option>`).join("");
    if (prefix==="start"){hSel.value="9";mSel.value="00";}
    if (prefix==="end"){hSel.value="10";mSel.value="00";}
    hSel.addEventListener("change",recalcHours);
    mSel.addEventListener("change",recalcHours);
  });
  document.getElementById("startAmpm").addEventListener("change",recalcHours);
  document.getElementById("endAmpm").addEventListener("change",recalcHours);
  recalcHours();
}

function getTimeValue(prefix) {
  return formatTime(parseInt(document.getElementById(prefix+"Hour").value),
    parseInt(document.getElementById(prefix+"Min").value),
    document.getElementById(prefix+"Ampm").value);
}
function formatTime(h,m,ampm){ return h+":"+m.toString().padStart(2,"0")+" "+ampm; }
function timeToMinutes(t){
  const p=t.match(/(\d+):(\d+)\s*(AM|PM)/i);if(!p)return 0;
  let h=parseInt(p[1]);const m=parseInt(p[2]),ap=p[3].toUpperCase();
  if(ap==="PM"&&h!==12)h+=12;if(ap==="AM"&&h===12)h=0;return h*60+m;
}
function calcHoursBetween(s,e){
  const sm=timeToMinutes(s);let em=timeToMinutes(e);
  if(em<=sm)em+=1440;return Math.round((em-sm)/60*100)/100;
}
function recalcHours(){
  const h=calcHoursBetween(getTimeValue("start"),getTimeValue("end"));
  document.getElementById("hoursDisplay").textContent=h>0?h:"0";
}

function toggleForm(){
  const f=document.getElementById("entryForm"),b=document.getElementById("toggleFormBtn");
  f.classList.toggle("open");b.classList.toggle("active");
  b.textContent=f.classList.contains("open")?"Cancel":"+ Log New Entry";
}

function addEntry(){
  const worker=document.getElementById("entryWorker").value;
  const dateInput=document.getElementById("entryDate").value;
  const day=document.getElementById("entryDay").value;
  const startTime=getTimeValue("start"),endTime=getTimeValue("end");
  const desc=document.getElementById("entryDesc").value.trim();
  const hours=calcHoursBetween(startTime,endTime);
  if(!worker){showToast("Please select a worker.","error");return;}
  if(!dateInput){showToast("Please select a date.","error");return;}
  if(hours<=0){showToast("End time must be after start time.","error");return;}
  const dp=dateInput.split("-");
  const entry={worker,date:dp[2]+"-"+dp[0]+"-"+dp[1],day,startTime,endTime,hours,description:desc,createdAt:Date.now()};
  const id=generateId();
  if(firebaseReady){entriesRef.child(id).set(entry).then(()=>showToast("Hours logged for "+worker+"!","success"));}
  else{allEntries[id]=entry;saveToLocalStorage();renderTable();showToast("Hours logged for "+worker+"!","success");}
  document.getElementById("entryWorker").value="";document.getElementById("entryDate").value="";
  document.getElementById("entryDay").value="";document.getElementById("entryDesc").value="";
  toggleForm();
}

function deleteEntry(id){
  if(!confirm("Delete this entry? This cannot be undone."))return;
  if(firebaseReady)entriesRef.child(id).remove();
  else{delete allEntries[id];saveToLocalStorage();renderTable();}
  showToast("Entry deleted.","info");
}

function renderTable(){
  const tbody=document.getElementById("logBody");
  const sorted=Object.entries(allEntries).sort((a,b)=>{
    const dc=b[1].date.localeCompare(a[1].date);
    return dc!==0?dc:timeToMinutes(b[1].startTime)-timeToMinutes(a[1].startTime);
  });
  if(sorted.length===0){
    tbody.innerHTML='<tr><td colspan="7" class="empty-state"><p>No hours logged yet. Use the button above to add an entry.</p></td></tr>';
    document.getElementById("entryCount").textContent="";return;
  }
  const colors={"Caleigh":"font-weight:600;color:#7c3aed;","Cristhian":"font-weight:600;color:#2563eb;","Jen S.":"font-weight:600;color:#db2777;"};
  tbody.innerHTML=sorted.map(([id,e])=>`<tr>
    <td>${e.date.split("-").slice(1).join("-").replace(/^(\d+)-(\d+)$/,"$1-$2")+" -"+e.date.split("-")[0]}</td>
    <td>${e.day}</td>
    <td><span style="${colors[e.worker]||"font-weight:600;"}">${e.worker}</span></td>
    <td style="white-space:nowrap;">${e.startTime} – ${e.endTime}</td>
    <td style="text-align:center;font-weight:600;color:var(--primary);">${e.hours}</td>
    <td>${e.description||'<span style="color:var(--text-secondary);">—</span>'}</td>
    <td style="white-space:nowrap;">
      <button class="btn btn-edit" onclick="editEntry('${id}')">Edit</button>
      <button class="btn btn-danger" onclick="deleteEntry('${id}')" style="margin-left:0.25rem;">X</button>
    </td>
  </tr>`).join("");
  document.getElementById("entryCount").textContent=sorted.length+" entries";
}

function formatDateDisplay(d){const p=d.split("-");return p[1]+"-"+p[2]+"-"+p[0];}

let editingId=null,editDatePicker=null;

function initEditTimePickers(){
  const hours=Array.from({length:12},(_,i)=>i+1);
  const mins=Array.from({length:12},(_,i)=>(i*5).toString().padStart(2,"0"));
  ["editStart","editEnd"].forEach((prefix)=>{
    const hSel=document.getElementById(prefix+"Hour"),mSel=document.getElementById(prefix+"Min");
    hSel.innerHTML=hours.map(h=>`<option value="${h}">${h}</option>`).join("");
    mSel.innerHTML=mins.map(m=>`<option value="${m}">${m}</option>`).join("");
    hSel.addEventListener("change",recalcEditHours);mSel.addEventListener("change",recalcEditHours);
  });
  document.getElementById("editStartAmpm").addEventListener("change",recalcEditHours);
  document.getElementById("editEndAmpm").addEventListener("change",recalcEditHours);
  editDatePicker=flatpickr("#editDate",{dateFormat:"m-d-Y",disableMobile:true,
    onChange:function(sd){if(sd.length>0){document.getElementById("editDay").value=DAYS[sd[0].getDay()];recalcEditHours();}}
  });
}

function recalcEditHours(){
  const h=calcHoursBetween(getEditTimeValue("editStart"),getEditTimeValue("editEnd"));
  document.getElementById("editHoursDisplay").textContent=h>0?h:"0";
}
function getEditTimeValue(prefix){
  return formatTime(parseInt(document.getElementById(prefix+"Hour").value),
    parseInt(document.getElementById(prefix+"Min").value),
    document.getElementById(prefix+"Ampm").value);
}
function setTimeSelects(prefix,timeStr){
  const m=timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);if(!m)return;
  const rounded=Math.round(parseInt(m[2])/5)*5;
  document.getElementById(prefix+"Hour").value=parseInt(m[1]);
  document.getElementById(prefix+"Min").value=rounded.toString().padStart(2,"0");
  document.getElementById(prefix+"Ampm").value=m[3].toUpperCase();
}
function editEntry(id){
  const e=allEntries[id];if(!e)return;editingId=id;
  document.getElementById("editWorker").value=e.worker;
  const p=e.date.split("-");editDatePicker.setDate(p[1]+"-"+p[2]+"-"+p[0],true,"m-d-Y");
  document.getElementById("editDay").value=e.day;
  setTimeSelects("editStart",e.startTime);setTimeSelects("editEnd",e.endTime);
  document.getElementById("editDesc").value=e.description||"";
  recalcEditHours();document.getElementById("editModal").style.display="flex";
}
function closeEditModal(){document.getElementById("editModal").style.display="none";editingId=null;}
function saveEdit(){
  if(!editingId)return;
  const worker=document.getElementById("editWorker").value;
  const dateInput=document.getElementById("editDate").value;
  const day=document.getElementById("editDay").value;
  const startTime=getEditTimeValue("editStart"),endTime=getEditTimeValue("editEnd");
  const desc=document.getElementById("editDesc").value.trim();
  const hours=calcHoursBetween(startTime,endTime);
  if(!worker){showToast("Please select a worker.","error");return;}
  if(!dateInput){showToast("Please select a date.","error");return;}
  if(hours<=0){showToast("End time must be after start time.","error");return;}
  const dp=dateInput.split("-");
  const updates={worker,date:dp[2]+"-"+dp[0]+"-"+dp[1],day,startTime,endTime,hours,description:desc};
  if(firebaseReady)entriesRef.child(editingId).update(updates).then(()=>showToast("Entry updated!","success"));
  else{Object.assign(allEntries[editingId],updates);saveToLocalStorage();renderTable();showToast("Entry updated!","success");}
  closeEditModal();
}

function showToast(message,type){
  const c=document.getElementById("toastContainer"),t=document.createElement("div");
  t.className="toast toast-"+type;t.textContent=message;c.appendChild(t);
  setTimeout(()=>{t.style.opacity="0";t.style.transform="translateX(100%)";t.style.transition="all 0.3s ease";setTimeout(()=>t.remove(),300);},3000);
}/* =============================================================
   CDPAP HOURS LOG — Admin Only
   Workers: Caleigh, Cristhian, Jen S.
   Data stored separately under "cdpap_entries/" in Firebase.
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
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const LS_KEY = "cdpapEntries";

/* ===== State ===== */
let db = null;
let entriesRef = null;
let allEntries = {};
let firebaseReady = false;
let currentUser = null;

/* ===== Auth Guard — runs first ===== */
document.addEventListener("DOMContentLoaded", () => {
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();

  auth.onAuthStateChanged((user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }
    currentUser = user;
    const isAdmin = ADMIN_EMAILS.includes(user.email.toLowerCase());
    if (!isAdmin) {
      window.location.href = "index.html";
      return;
    }
    initApp();
  });
});

/* ===== Initialize App ===== */
function initApp() {
  initTimePickers();
  initDatePicker();
  initEditTimePickers();
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
      renderTable();
    });
  } catch (e) {
    console.error("Firebase DB error:", e);
    loadFromLocalStorage();
  }
}

function loadFromLocalStorage() {
  const stored = localStorage.getItem(LS_KEY);
  allEntries = stored ? JSON.parse(stored) : {};
  renderTable();
}

function saveToLocalStorage() {
  localStorage.setItem(LS_KEY, JSON.stringify(allEntries));
}

function generateId() {
  return "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ===== Date Picker ===== */
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
    if (prefix === "start") { hourSel.value = "9"; minSel.value = "00"; }
    if (prefix === "end")   { hourSel.value = "10"; minSel.value = "00"; }
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
  if (endMins <= startMins) endMins += 24 * 60;
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
  btn.textContent = form.classList.contains("open") ? "Cancel" : "+ Log New Entry";
}

/* ===== Add Entry ===== */
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

  const entry = {
    worker,
    date: dateISO,
    day,
    startTime,
    endTime,
    hours,
    description: desc,
    createdAt: Date.now()
  };

  const id = generateId();
  if (firebaseReady) {
    entriesRef.child(id).set(entry).then(() => {
      showToast("Hours logged for " + worker + "!", "success");
    });
  } else {
    allEntries[id] = entry;
    saveToLocalStorage();
    renderTable();
    showToast("Hours logged for " + worker + "!", "success");
  }

  document.getElementById("entryWorker").value = "";
  document.getElementById("entryDate").value = "";
  document.getElementById("entryDay").value = "";
  document.getElementById("entryDesc").value = "";
  toggleForm();
}

/* ===== Delete Entry ===== */
function deleteEntry(id) {
  if (!confirm("Delete this entry? This cannot be undone.")) return;
  if (firebaseReady) {
    entriesRef.child(id).remove();
  } else {
    delete allEntries[id];
    saveToLocalStorage();
    renderTable();
  }
  showToast("Entry deleted.", "info");
}

/* ===== Render Table ===== */
function renderTable() {
  const tbody = document.getElementById("logBody");

  const sorted = Object.entries(allEntries).sort((a, b) => {
    const dateCompare = b[1].date.localeCompare(a[1].date);
    if (dateCompare !== 0) return dateCompare;
    return timeToMinutes(b[1].startTime) - timeToMinutes(a[1].startTime);
  });

  if (sorted.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><p>No hours logged yet. Use the button above to add an entry.</p></td></tr>';
    document.getElementById("entryCount").textContent = "";
    return;
  }

  let html = "";
  sorted.forEach(([id, entry]) => {
    const dateFormatted = formatDateDisplay(entry.date);
    const timeSlot = entry.startTime + " – " + entry.endTime;
    const workerStyle = workerColorStyle(entry.worker);

    html += `<tr>
      <td>${dateFormatted}</td>
      <td>${entry.day}</td>
      <td><span style="${workerStyle}">${entry.worker}</span></td>
      <td style="white-space:nowrap;">${timeSlot}</td>
      <td style="text-align:center; font-weight:600; color:var(--primary);">${entry.hours}</td>
      <td>${entry.description || '<span style="color:var(--text-secondary);">—</span>'}</td>
      <td style="white-space:nowrap;">
        <button class="btn btn-edit" onclick="editEntry('${id}')">Edit</button>
        <button class="btn btn-danger" onclick="deleteEntry('${id}')" style="margin-left:0.25rem;">X</button>
      </td>
    </tr>`;
  });

  tbody.innerHTML = html;
  document.getElementById("entryCount").textContent = sorted.length + " entries";
}

function workerColorStyle(worker) {
  const colors = {
    "Caleigh":   "font-weight:600; color:#7c3aed;",
    "Cristhian": "font-weight:600; color:#2563eb;",
    "Jen S.":    "font-weight:600; color:#db2877;"
  };
  return colors[worker] || "font-weight:600;";
}

function formatDateDisplay(isoDate) {
  const parts = isoDate.split("-");
  return parts[1] + "-" + parts[2] + "-" + parts[0];
}

/* ===== Edit Modal ===== */
let editingId = null;
let editDatePicker = null;

function initEditTimePickers() {
  const hours = [];
  for (let i = 1; i <= 12; i++) hours.push(i);
  const mins = [];
  for (let i = 0; i < 60; i += 5) mins.push(i.toString().padStart(2, "0"));

  ["editStart", "editEnd"].forEach((prefix) => {
    const hourSel = document.getElementById(prefix + "Hour");
    const minSel = document.getElementById(prefix + "Min");
    hourSel.innerHTML = hours.map(h => `<option value="${h}">${h}</option>`).join("");
    minSel.innerHTML = mins.map(m => `<option value="${m}">${m}</option>`).join("");
    hourSel.addEventListener("change", recalcEditHours);
    minSel.addEventListener("change", recalcEditHours);
  });
  document.getElementById("editStartAmpm").addEventListener("change", recalcEditHours);
  document.getElementById("editEndAmpm").addEventListener("change", recalcEditHours);

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

function recalcEditHours() {
  const start = getEditTimeValue("editStart");
  const end = getEditTimeValue("editEnd");
  const hours = calcHoursBetween(start, end);
  document.getElementById("editHoursDisplay").textContent = hours > 0 ? hours : "0";
}

function getEditTimeValue(prefix) {
  const h = parseInt(document.getElementById(prefix + "Hour").value);
  const m = parseInt(document.getElementById(prefix + "Min").value);
  const ampm = document.getElementById(prefix + "Ampm").value;
  return formatTime(h, m, ampm);
}

function setTimeSelects(prefix, timeStr) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return;
  const rounded = Math.round(parseInt(match[2]) / 5) * 5;
  document.getElementById(prefix + "Hour").value = parseInt(match[1]);
  document.getElementById(prefix + "Min").value = rounded.toString().padStart(2, "0");
  document.getElementById(prefix + "Ampm").value = match[3].toUpperCase();
}

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

function saveEdit() {
  if (!editingId) return;

  const worker = document.getElementById("editWorker").value;
  const dateInput = document.getElementById("editDate").value;
  const day = document.getElementById("editDay").value;
  const startTime = getEditTimeValue("editStart");
  const endTime = getEditTimeValue("editEnd");
  const desc = document.getElementById("editDesc").value.trim();
  const hours = calcHoursBetween(startTime, endTime);

  if (!worker) { showToast("Please select a worker.", "error"); return; }
  if (!dateInput) { showToast("Please select a date.", "error"); return; }
  if (hours <= 0) { showToast("End time must be after start time.", "error"); return; }

  const dateParts = dateInput.split("-");
  const dateISO = dateParts[2] + "-" + dateParts[0] + "-" + dateParts[1];
  const updates = { worker, date: dateISO, day, startTime, endTime, hours, description: desc };

  if (firebaseReady) {
    entriesRef.child(editingId).update(updates).then(() => {
      showToast("Entry updated!", "success");
    });
  } else {
    Object.assign(allEntries[editingId], updates);
    saveToLocalStorage();
    renderTable();
    showToast("Entry updated!", "success");
  }
  closeEditModal();
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
