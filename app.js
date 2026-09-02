// 1. Paste your Supabase project values here.
const SUPABASE_URL = "https://vhwbnqohtrtyajzbqjxo.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_mMIQWRk0UMkrQJ0Nxlojig_o1KSoit1";

let supabaseClient = null;
let repairs = [];

const $ = (id) => document.getElementById(id);
const authScreen = $("authScreen"), app = $("app");

function configured() {
  return !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
}

if (configured()) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  init();
} else {
  $("authMessage").textContent = "Add your Supabase URL and anon key in app.js first.";
}

async function init() {
  const { data } = await supabaseClient.auth.getSession();
  if (data.session) showApp();
  $("authForm").addEventListener("submit", login);
  $("logoutBtn").addEventListener("click", logout);
  $("addRepairBtn").addEventListener("click", () => openModal());
  $("closeModalBtn").addEventListener("click", closeModal);
  $("cancelBtn").addEventListener("click", closeModal);
  $("repairForm").addEventListener("submit", saveRepair);
  $("searchInput").addEventListener("input", renderAll);
  $("statusFilter").addEventListener("change", renderAll);
  document.querySelectorAll(".nav-btn").forEach(btn => btn.addEventListener("click", () => switchView(btn.dataset.view)));
  $("todayText").textContent = new Date().toLocaleDateString(undefined,{weekday:"long",year:"numeric",month:"long",day:"numeric"});
  setInterval(renderAll, 30000);
}

async function login(e) {
  e.preventDefault();
  $("authMessage").textContent = "";
  const { error } = await supabaseClient.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
  if (error) return $("authMessage").textContent = error.message;
  showApp();
}

async function logout() {
  await supabaseClient.auth.signOut();
  app.classList.add("hidden"); authScreen.classList.remove("hidden");
}

function showApp() {
  authScreen.classList.add("hidden"); app.classList.remove("hidden"); loadRepairs();
}

async function loadRepairs() {
  const {data,error} = await supabaseClient.from("repairs").select("*").order("created_at",{ascending:false});
  if (error) return toast(error.message);
  repairs = data || [];
  renderAll();
}

function urgency(r) {

  if (r.status === "delivered") {
    return "delivered";
  }

  if (r.status === "completed") {
    return "completed";
  }

  if (!r.promised_date || !r.promised_time) {
    return r.status;
  }

  const due = new Date(
    `${r.promised_date}T${r.promised_time}`
  );

  const diff = due - new Date();

  if (diff < 0) {
    return "overdue";
  }

  if (diff <= 3600000) {
    return "warning";
  }

  return r.status;
}
function countdown(r) {
 if (
  !r.promised_date ||
  !r.promised_time ||
  r.status === "completed" ||
  r.status === "delivered"
) return "";
  const diff = new Date(`${r.promised_date}T${r.promised_time}`) - new Date();
  if (diff < 0) return "🚨 OVERDUE";
  if (diff <= 3600000) {
    const mins = Math.ceil(diff/60000);
    return `⚠️ ${mins} minute${mins===1?"":"s"} remaining`;
  }
  const hours = Math.floor(diff/3600000), mins = Math.floor((diff%3600000)/60000);
  return `⏱ ${hours}h ${mins}m remaining`;
}

function filtered(list=repairs) {
  const q = ($("searchInput")?.value || "").toLowerCase().trim();
  const f = $("statusFilter")?.value || "all";
  return list.filter(r => {
    const text = `${r.customer_name} ${r.customer_phone} ${r.phone_brand||""} ${r.phone_model||""}`.toLowerCase();
    return (!q || text.includes(q)) && (f==="all" || urgency(r)===f || r.status===f);
  });
}

function card(r) {
  const u = urgency(r);
  const price = Number(r.estimated_price||0).toLocaleString("en-IN");
  return `<article class="repair-card ${u}">
<div class="status-badge">
  ${labelFor(r.status)}
  ${u === "warning" ? " ⚠️ DUE SOON" : ""}
  ${u === "overdue" ? " 🚨 OVERDUE" : ""}
</div>    
    <h3>${escapeHtml(r.customer_name)}</h3>
    <div class="muted">${escapeHtml([r.phone_brand,r.phone_model].filter(Boolean).join(" ")) || "Phone not specified"}</div>
    <div class="card-row">📞 <a class="phone-link" href="tel:${escapeHtml(r.customer_phone)}">${escapeHtml(r.customer_phone)}</a></div>
    <div class="card-row">🔧 <b>Issue:</b> ${escapeHtml(r.repair_issue||"-")}</div>
    <div class="card-row">💰 <b>Estimated:</b> ₹${price}</div>
    <div class="card-row">📅 <b>Promised:</b> ${formatDue(r)}</div>
    <div class="countdown">${countdown(r)}</div>
    <div class="card-actions">

  ${r.status !== "repairing" &&
  r.status !== "completed" &&
  r.status !== "delivered"
  ? `<button
      class="action-btn under-repair"
      onclick="markUnderRepair(${r.id})"
    >
      🔧 Under Repair
    </button>`
  : ""
}

  ${r.status !== "completed" && r.status !== "delivered"
    ? `<button
        class="action-btn complete"
        onclick="markCompleted(${r.id})"
      >
        ✓ Complete
      </button>`
    : ""
  }

  ${r.status === "completed"
    ? `<button
        class="action-btn"
        onclick="markDelivered(${r.id})"
      >
        📦 Delivered
      </button>`
    : ""
  }

  <button
    class="action-btn edit"
    onclick="editRepair(${r.id})"
  >
    ✏ Edit
  </button>

  <button
    class="action-btn receipt"
    onclick="printReceipt(${r.id})"
  >
    🖨 Receipt
  </button>

  <button
    class="action-btn delete"
    onclick="deleteRepair(${r.id})"
  >
    🗑 Delete
  </button>

</div>
  </article>`;
}

function labelFor(u){return ({ pending: "PENDING",
    repairing: "UNDER REPAIR",
    completed: "COMPLETED",
    delivered: "DELIVERED",
    warning: "DUE SOON",
    overdue: "OVERDUE"})[u]||u.toUpperCase()}
function formatDue(r){if(!r.promised_date)return "-"; return `${new Date(r.promised_date+"T00:00:00").toLocaleDateString()} ${r.promised_time?r.promised_time.slice(0,5):""}`}

function renderAll() {
  updateRepairIssueSuggestions();
  const all = filtered();
  $("repairList").innerHTML = all.length ? all.map(card).join("") : empty("No repairs found.");
  const active = repairs.filter(r=>r.status!=="completed");
  $("activeRepairList").innerHTML = active.length ? active.map(card).join("") : empty("No active repairs.");
  const history = repairs.filter(
  r =>
    r.status === "completed" ||
    r.status === "delivered");
  $("historyList").innerHTML = history.length ? history.map(card).join("") : empty("No completed repairs yet.");

  $("totalRepairs").textContent=repairs.length;
  $("pendingCount").textContent=repairs.filter(r=>r.status==="pending").length;
  $("repairingCount").textContent=repairs.filter(r=>r.status==="repairing").length;
  $("completedCount").textContent =
  repairs.filter(
    r => r.status === "completed"
  ).length;
  $("deliveredCount").textContent =
  repairs.filter(
    r => r.status === "delivered"
  ).length;
}

function empty(t){return `<div class="empty">${t}</div>`}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

function switchView(name){
  ["dashboard","repairs","history"].forEach(v=>$(`${v}View`).classList.toggle("hidden",v!==name));
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
  $("pageTitle").textContent=name==="dashboard"?"Welcome to the HF Communication":name==="repairs"?"Active Repairs":"Repair History";
}

function openModal(r=null){
  $("repairForm").reset();
  $("repairId").value="";
  $("modalTitle").textContent=r?"Edit Repair":"Add New Repair";
  if(r){
    $("repairId").value=r.id;$("customerName").value=r.customer_name;$("customerPhone").value=r.customer_phone;
    $("phoneBrand").value=r.phone_brand||"";$("phoneModel").value=r.phone_model||"";$("repairIssue").value=r.repair_issue||"";
    $("estimatedPrice").value=r.estimated_price||"";$("promisedDate").value=r.promised_date||"";
    $("promisedTime").value=r.promised_time?r.promised_time.slice(0,5):"";$("repairStatus").value=r.status;
  }
  $("repairModal").classList.remove("hidden");
}
function closeModal(){$("repairModal").classList.add("hidden")}

async function saveRepair(e){
  e.preventDefault();
  const id=$("repairId").value;
  const payload={
    customer_name:$("customerName").value.trim(),customer_phone:$("customerPhone").value.trim(),
    phone_brand:$("phoneBrand").value.trim()||null,phone_model:$("phoneModel").value.trim()||null,
    repair_issue:$("repairIssue").value.trim()||null,estimated_price:Number($("estimatedPrice").value||0),
    promised_date:$("promisedDate").value||null,promised_time:$("promisedTime").value||null,status:$("repairStatus").value
  };
  const query=id?supabaseClient.from("repairs").update(payload).eq("id",id):supabaseClient.from("repairs").insert(payload);
  const {error}=await query;if(error)return toast(error.message);
  closeModal();toast(id?"Repair updated":"Repair added");loadRepairs();
}

window.editRepair=(id)=>openModal(repairs.find(r=>r.id===id));
window.markUnderRepair = async(id) => {

  const { error } = await supabaseClient
    .from("repairs")
    .update({
      status: "repairing"
    })
    .eq("id", id);

  if (error) {
    return toast(error.message);
  }

  toast("Marked as Under Repair");

  loadRepairs();
};
window.markCompleted=async(id)=>{const {error}=await supabaseClient.from("repairs").update({status:"completed",completed_at:new Date().toISOString()}).eq("id",id);if(error)return toast(error.message);toast("Marked as completed");loadRepairs()}
window.markDelivered = async(id) => {

  const { error } = await supabaseClient
    .from("repairs")
    .update({
      status: "delivered"
    })
    .eq("id", id);

  if (error) {
    return toast(error.message);
  }

  toast("Phone marked as Delivered");

  loadRepairs();
};
window.deleteRepair=async(id)=>{if(!confirm("Delete this repair permanently?"))return;const {error}=await supabaseClient.from("repairs").delete().eq("id",id);if(error)return toast(error.message);toast("Repair deleted");loadRepairs()}
window.printReceipt=(id)=>{
  const r=repairs.find(x=>x.id===id); if(!r)return;
  const w=window.open("","_blank");
  w.document.write(`<html><head><title>HF Communication Receipt</title><style>body{font-family:Arial;padding:30px;max-width:700px;margin:auto}h1{color:#2563eb}table{width:100%;border-collapse:collapse}td{padding:10px;border-bottom:1px solid #ddd}</style></head><body><h1>HF Communication</h1><h2>Mobile Repair Receipt</h2><table><tr><td>Customer</td><td>${escapeHtml(r.customer_name)}</td></tr><tr><td>Phone</td><td>${escapeHtml([r.phone_brand,r.phone_model].filter(Boolean).join(" "))}</td></tr><tr><td>Mobile</td><td>${escapeHtml(r.customer_phone)}</td></tr><tr><td>Issue</td><td>${escapeHtml(r.repair_issue||"-")}</td></tr><tr><td>Estimated Price</td><td>₹${Number(r.estimated_price||0).toLocaleString("en-IN")}</td></tr><tr><td>Promised</td><td>${formatDue(r)}</td></tr><tr><td>Status</td><td>${labelFor(urgency(r))}</td></tr></table><p>Thank you for choosing HF Communication.</p><script>window.onload=()=>window.print()<\/script></body></html>`);
  w.document.close();
}

function toast(msg){const t=$("toast");t.textContent=msg;t.classList.remove("hidden");setTimeout(()=>t.classList.add("hidden"),3500)}
function updateRepairIssueSuggestions() {

  const suggestionBox =
    document.getElementById(
      "repairIssueSuggestions"
    );

  if (!suggestionBox) return;


  const issues = [
    ...new Set(
      repairs
        .map(repair =>
          repair.repair_issue
        )
        .filter(issue =>
          issue &&
          issue.trim() !== ""
        )
    )
  ];


  suggestionBox.innerHTML =
    issues
      .slice(0, 30)
      .map(issue =>
        `<option value="${escapeHtml(issue)}">`
      )
      .join("");
}