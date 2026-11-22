const MODEL_SELECT = document.getElementById("modelSelect");

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}
const RUN_BTN = document.getElementById("runBtn");
const RUN_ALL_BTN = document.getElementById("runAllBtn");
const COPY_BTN = document.getElementById("copyBtn");
const DOWNLOAD_BTN = document.getElementById("downloadBtn");
const LOAD_DEMO_BTN = document.getElementById("loadDemo");
const CLEAR_BTN = document.getElementById("clearBtn");
const SUBJECT_INPUT = document.getElementById("subjectName");
const SAMPLE_INPUT = document.getElementById("sampleText");
const FILES_INPUT = document.getElementById("files");
const TABS = document.querySelectorAll(".tab");
const RESULTS = document.getElementById("results");
const OPS_STATUS = document.getElementById("opsStatus");
const CONN_STATUS = document.getElementById("connStatus");
const OPLOG = document.getElementById("oplog");

const DEMO_TEXT =
  "The thesis was never that the rocket works once. Anybody can light a candle. " +
  "The question is whether the system holds together across a flight record, because " +
  "reliability is what turns a spectacle into infrastructure, and infrastructure is " +
  "what actually gets priced. I keep coming back to the same pattern in the data: " +
  "the companies that survive are the ones that build the whole stack instead of " +
  "renting the critical pieces from somebody who can change the terms. That is why " +
  "the balance sheet matters more than the headline. Cash runway is just time, and " +
  "time is the only resource that lets a hard engineering problem get solved before " +
  "the market loses patience.";

let resultsByKind = {};
let payloadsByKind = {};
let lastPayload = null;
let currentPayload = null;
let lastRunAll = null;
let lastRunAllPayload = null;

/* ——— Logging ——— */

function log(message, level = "info") {
  const ts = new Date().toLocaleTimeString(undefined, { hour12: false });
  const div = document.createElement("div");
  div.innerHTML = `<span class="ts">[${ts}]</span>${level === "error" ? '<span style="color:#ff6a00;">[ERR]</span>' : ''}${escapeHtml(message)}`;
  OPLOG.appendChild(div);
  OPLOG.scrollTop = OPLOG.scrollHeight;
}

function status(message, kind = "") {
  OPS_STATUS.textContent = message;
  OPS_STATUS.className = "ops-status" + (kind ? " " + kind : "");
}

/* ——— Helpers ——— */

function activeKind() {
  const active = document.querySelector(".tab.active");
  return active ? active.getAttribute("data-kind") : "iq";
}

function setActiveTab(kind) {
  TABS.forEach((t) => {
    const match = t.getAttribute("data-kind") === kind;
    t.classList.toggle("active", match);
    if (match) t.scrollIntoView({ block: "nearest", inline: "nearest" });
  });
}

/* ——— Inputs ——— */

async function collectInputs() {
  const inputs = [];
  const text = SAMPLE_INPUT.value.trim();
  if (text) inputs.push({ label: "pasted.txt", text });

  const files = Array.from(FILES_INPUT.files ?? []);
  for (const f of files) {
    let content = "";
    try {
      content = await f.text();
    } catch {
      content = "";
    }
    inputs.push({ label: f.name, text: content });
  }
  return inputs;
}

async function loadDemo() {
  const demo = DEMO_TEXT + "\n\n— subject: " + SUBJECT_INPUT.value;
  SAMPLE_INPUT.value = demo;
  log(`Loaded demo sample (${demo.length} chars)`);
  status("Demo sample loaded.", "ok");
}

function clearForm() {
  SAMPLE_INPUT.value = "";
  FILES_INPUT.value = "";
  RESULTS.innerHTML = '<div class="empty">Cleared. Run an analysis.</div>';
  resultsByKind = {};
  payloadsByKind = {};
  lastPayload = null;
  currentPayload = null;
  lastRunAll = null;
  lastRunAllPayload = null;
  log("Inputs cleared.");
  status("Desk ready.", "ok");
}

/* — — API — — */

async function loadModels() {
  try {
    const res = await fetch("/api/models");
    if (!res.ok) throw new Error(`models ${res.status}`);
    const ids = await res.json();
    MODEL_SELECT.innerHTML = "";
    if (!ids.length) {
      MODEL_SELECT.insertAdjacentHTML("beforeend", '<option disabled selected>No models available</option>');
      status("No models returned by /api/models.", "err");
      CONN_STATUS.textContent = "API error";
      return;
    }
    for (const id of ids) {
      const o = document.createElement("option");
      o.value = id;
      o.textContent = id;
      MODEL_SELECT.appendChild(o);
    }
    CONN_STATUS.textContent = "API online";
    status(`Loaded ${ids.length} model(s).`, "ok");
    log(`Models loaded: ${ids.join(", ")}`);
  } catch (e) {
    log(`Failed to load models: ${e}`, "error");
    status("Failed to load models — is the API running?", "err");
    CONN_STATUS.textContent = "API unreachable";
  }
}

function buildFormData(kind, model, inputs) {
  const form = new FormData();
  form.append("kind", kind);
  form.append("model", model);
  form.append("inputs", JSON.stringify(inputs));
  return form;
}

function renderResult(kind, result) {
  const tierBadge = result.tier === "experimental"
    ? '<span class="warn-badge">EXPERIMENTAL &middot; result may be unreliable</span>'
    : '';
  const parsed = result.parsed ?? null;
  const body = parsed
    ? '<pre class="result-raw">' + escapeHtml(JSON.stringify(parsed, null, 2)) + '</pre>'
    : '<pre class="result-raw">' + escapeHtml(result.raw ?? "") + '</pre>';
  const err = result.parseError
    ? '<div class="result-error">Parse error: ' + escapeHtml(result.parseError) + '</div>'
    : '';
  const warnText = result.warning && result.tier !== "experimental"
    ? '<div class="result-warn">' + escapeHtml(result.warning) + '</div>'
    : '';
  const rawDetails = parsed && result.raw
    ? '<details class="result-raw-details"><summary>raw model output</summary><pre class="result-raw">' + escapeHtml(result.raw) + '</pre></details>'
    : '';

  RESULTS.innerHTML =
    '<div class="result-card">' +
    '<div class="result-head"><span class="result-kind">' + escapeHtml(kind) + '</span>' + tierBadge + '</div>' +
    body + warnText + err + rawDetails +
    '</div>';
}

function renderRunAll(payload) {
  const cards = payload.results.map((r) => {
    const tierBadge = r.tier === "experimental"
      ? '<span class="warn-badge">EXPERIMENTAL &middot; result may be unreliable</span>'
      : '';
    const parsed = r.parsed ?? null;
    const body = parsed
      ? '<pre class="result-raw">' + escapeHtml(JSON.stringify(parsed, null, 2)) + '</pre>'
      : '<pre class="result-raw">' + escapeHtml(r.raw ?? "") + '</pre>';
    const err = r.parseError
      ? '<div class="result-error">Parse error: ' + escapeHtml(r.parseError) + '</div>'
      : '';
    const rawDetails = r.parsed && r.raw
      ? '<details class="result-raw-details"><summary>raw model output</summary><pre class="result-raw">' + escapeHtml(r.raw) + '</pre></details>'
      : '';
    return (
      '<div class="result-card">' +
      '<div class="result-head"><span class="result-kind">' + escapeHtml(r.kind) + '</span>' + tierBadge + '</div>' +
      body + err + rawDetails +
      '</div>'
    );
  }).join("");
  RESULTS.innerHTML = '<div style="margin-bottom:8px; font:600 11px var(--mono); text-transform:uppercase; letter-spacing:.1em;">Run all &middot; ' + escapeHtml(payload.results.length) + ' analyses</div>' + cards;
}

/* — — Actions — — */

async function run(kind) {
  if (kind === "runAll") return runAll();
  const model = MODEL_SELECT.value;
  if (!model || MODEL_SELECT.options[MODEL_SELECT.selectedIndex]?.disabled) {
    status("No model selected.", "err");
    return;
  }
  let inputs;
  try {
    inputs = await collectInputs();
  } catch (e) {
    log(`Failed to read inputs: ${e}`, "error");
    status("Could not read inputs.", "err");
    return;
  }
  if (!inputs.length) {
    status("Nothing to analyze — paste text or attach files.", "err");
    return;
  }

  setActiveTab(kind);
  status(`Running ${kind}…`);
  log(`POST /api/run kind=${kind} model=${model} inputs=${inputs.length}`);

  try {
    const res = await fetch("/api/run", { method: "POST", body: buildFormData(kind, model, inputs) });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${res.status} ${body}`);
    }
    const result = await res.json();
    resultsByKind[kind] = result;
    lastPayload = { subject: SUBJECT_INPUT.value, model, kind, inputs, result };
    payloadsByKind[kind] = lastPayload;
    currentPayload = lastPayload;
    renderResult(kind, result);
    log(`Run complete: kind=${kind} tier=${result.tier} parsed=${result.parsed != null}`);
    status(`Run complete (${result.tier}).`, result.tier === "experimental" ? "" : "ok");
  } catch (e) {
    log(`Run failed: ${e}`, "error");
    status(`Run failed: ${e.message}`, "err");
  }
}

async function runAll() {
  const model = MODEL_SELECT.value;
  if (!model || MODEL_SELECT.options[MODEL_SELECT.selectedIndex]?.disabled) {
    status("No model selected.", "err");
    return;
  }
  let inputs;
  try {
    inputs = await collectInputs();
  } catch (e) {
    log(`Failed to read inputs: ${e}`, "error");
    status("Could not read inputs.", "err");
    return;
  }
  if (!inputs.length) {
    status("Nothing to analyze — paste text or attach files.", "err");
    return;
  }

  setActiveTab("runAll");
  status("Running all analyses…");
  log(`POST /api/run-all model=${model} inputs=${inputs.length}`);

  try {
    const res = await fetch("/api/run-all", { method: "POST", body: buildFormData("all", model, inputs) });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${res.status} ${body}`);
    }
    const payload = await res.json();
    lastRunAll = payload;
    lastPayload = { subject: SUBJECT_INPUT.value, model, kind: "runAll", inputs, results: payload.results, tier: payload.tier };
    lastRunAllPayload = lastPayload;
    currentPayload = lastPayload;
    payload.results.forEach((r) => { resultsByKind[r.kind] = r; payloadsByKind[r.kind] = { subject: SUBJECT_INPUT.value, model, kind: r.kind, inputs, result: r }; });
    renderRunAll(payload);
    log(`Run-all complete: ${payload.results.length} analyses tier=${payload.tier}`);
    status(`Run-all complete (${payload.tier}).`, payload.tier === "experimental" ? "" : "ok");
  } catch (e) {
    log(`Run-all failed: ${e}`, "error");
    status(`Run-all failed: ${e.message}`, "err");
  }
}

function copyCaseFile() {
  const payload = currentPayload || lastPayload;
  if (!payload) {
    status("No case file to copy yet.", "err");
    return;
  }
  const text = JSON.stringify(payload, null, 2);
  navigator.clipboard.writeText(text).then(() => {
    log("Case file copied to clipboard.");
    status("Case file copied.", "ok");
  }).catch((e) => {
    log(`Copy failed: ${e}`, "error");
    status("Copy failed.", "err");
  });
}

function downloadCaseFile() {
  const payload = currentPayload || lastPayload;
  if (!payload) {
    status("No case file to download yet.", "err");
    return;
  }
  const text = JSON.stringify(payload, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `casefile-${(payload.subject || "case").replace(/\s+/g, "_")}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  log(`Case file downloaded: ${a.download}`);
  status("Case file downloaded.", "ok");
}

/* — — Wiring — — */

TABS.forEach((t) => {
  t.addEventListener("click", () => {
    const kind = t.getAttribute("data-kind");
    TABS.forEach((other) => other.classList.toggle("active", other === t));
    if (kind === "runAll") {
      if (lastRunAll) { renderRunAll(lastRunAll); currentPayload = lastRunAllPayload || currentPayload; }
      else RESULTS.innerHTML = '<div class="empty">Run-all not executed yet. Press [ RUN ] or [ RUN ALL ].</div>';
      return;
    }
    const existing = resultsByKind[kind];
    if (existing) {
      renderResult(kind, existing);
      currentPayload = payloadsByKind[kind] || currentPayload;
      status(`Showing cached ${kind} result.`);
    } else {
      RESULTS.innerHTML = `<div class="empty">No ${escapeHtml(kind)} result yet. Press [ RUN ] to analyze.</div>`;
    }
  });
});

RUN_BTN.addEventListener("click", () => run(activeKind()));
RUN_ALL_BTN.addEventListener("click", () => runAll());
COPY_BTN.addEventListener("click", copyCaseFile);
DOWNLOAD_BTN.addEventListener("click", downloadCaseFile);
LOAD_DEMO_BTN.addEventListener("click", loadDemo);
CLEAR_BTN.addEventListener("click", clearForm);

/* — — Boot — — */

log("Desk initialized.");
loadModels();
