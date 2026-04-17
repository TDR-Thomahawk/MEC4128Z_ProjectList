const API_URL = "https://script.google.com/macros/s/AKfycbxT2r6PhuJLtf6t637R3YY_mkt4LVDp8Plj8fEBd--XPM4kCifrhNDmPg48AO07e2mq/exec";

let allProjects = [];
let selectedFields = new Set();
let selectedKeywords = new Set();
let selectedSupervisors = new Set();
let showUnassignedOnly = false;

function showLoader() {
  document.getElementById("loader").classList.remove("hidden");
  document.getElementById("projects").style.display = "none";
}

function hideLoader() {
  document.getElementById("loader").classList.add("hidden");
  document.getElementById("projects").style.display = "grid";
}

async function load(forceRefresh = false) {
  showLoader();
  clearError();
  console.log("Load Called");

  try {
    const cached = localStorage.getItem("projectCache");

    if (!forceRefresh && cached) {
        allProjects = JSON.parse(cached);
    } else {
        const res = await fetch(API_URL);

        if (!res.ok) {
          throw new Error(`HTTP error: ${res.status}`);
        }

        allProjects = await res.json();

        if (!allProjects || allProjects.error) {
          throw new Error(allProjects?.error || "Invalide API Response");
        }

        localStorage.setItem("projectCache", JSON.stringify(allProjects));
    }

    populateFilters(allProjects);
    applyFilters();

  } catch (err) {
      showError("Failed to load project data. Please try again later.");
  } finally {
    hideLoader();
  }

}

function populateFilters(data) {
  const fields = new Set();
  const keywords = new Set();
  const supervisors = new Set();

  data.forEach(p => {
    if (p.project.field) fields.add(p.project.field);
    (p.project.keywords || []).forEach(k => keywords.add(k));
    if (p.supervisor) supervisors.add(p.supervisor);
  });

  const fieldOptions = document.getElementById("fieldOptions");
  fieldOptions.innerHTML = "";
  fields.forEach(f => fieldOptions.appendChild(createCheckbox(f, selectedFields)));

  const keywordOptions = document.getElementById("keywordOptions");
  keywordOptions.innerHTML = "";
  keywords.forEach(k => keywordOptions.appendChild(createCheckbox(k, selectedKeywords)));

  const supervisorOptions = document.getElementById("supervisorOptions");
  supervisorOptions.innerHTML = "";
  supervisors.forEach(s => supervisorOptions.appendChild(createCheckbox(s, selectedSupervisors)));
}

function createCheckbox(value, set) {
  const label = document.createElement("label");
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.value = value;

  cb.addEventListener("change", () => {
    cb.checked ? set.add(value) : set.delete(value);
    applyFilters();
  });

  label.appendChild(cb);
  label.append(" " + value);
  return label;
}

function applyFilters() {
  const search = document.getElementById("search").value.toLowerCase();

  let filtered = allProjects.filter(p => {
    const textMatch =
      p.title?.toLowerCase().includes(search) ||
      p.supervisor?.toLowerCase().includes(search) ||
      p.project.brief?.toLowerCase().includes(search) ||
      (p.project.keywords || []).join(" ").toLowerCase().includes(search);

    const fieldMatch =
      selectedFields.size === 0 || selectedFields.has(p.project.field);

    const keywordMatch =
      selectedKeywords.size === 0 ||
      [...selectedKeywords].every(k => (p.project.keywords || []).includes(k));

    const supervisorMatch =
      selectedSupervisors.size === 0 ||
      selectedSupervisors.has(p.supervisor);

    const unassignedMatch =
      !showUnassignedOnly ||
      !p.project.assigned_student ||
      p.project.assigned_student.trim() === "";

    return textMatch && fieldMatch && keywordMatch && supervisorMatch && unassignedMatch;
  });

  filtered.sort((a,b) => (a.id||0) - (b.id||0));

  render(filtered);
}

function render(projects) {
  const container = document.getElementById("projects");
  container.innerHTML = "";

  projects.forEach(p => {
    const card = document.createElement("div");
    card.className = "card";

    card.innerHTML = `
      <div class="title">${p.id} — ${p.title}</div>
      <div class="meta"><b>Supervisor:</b> ${p.supervisor}</div>
      <div class="meta"><b>Field:</b> ${p.project.field || ""}</div>
      <div class="meta"><b>Number of Students:</b> ${p.project.capacity}</div>
      ${p.co_supervisor.exists ? `<div class="meta"><b>Co-supervisor:</b> ${p.co_supervisor.name}</div>` : ""}
      ${p.project.assigned_student ? `<div class="meta"><b>Assigned to:</b> ${p.project.assigned_student}</div>` : ""}      
      <p>${p.project.brief || ""}</p>
      <div>${(p.project.keywords || []).map(k => `<span class="tag">${k}</span>`).join("")}</div>
    `;

    container.appendChild(card);
  });
}

function clearFilters() {
  document.getElementById("search").value = "";
  selectedFields.clear();
  selectedKeywords.clear();
  selectedSupervisors.clear();
  document.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
  applyFilters();
}

function showError(message) {
  const el = document.getElementById("error");
  el.textContent = message;
  el.classList.remove("hidden");

  document.getElementById("projects").style.display = "none";
}

function clearError() {
  const el = document.getElementById("error");
  el.textContent = "";
  el.classList.add("hidden");
}

document.getElementById("search").addEventListener("input", applyFilters);
document.getElementById("clearFilters").addEventListener("click", clearFilters);
document.querySelectorAll(".dropdown-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    btn.parentElement.classList.toggle("open");
  });
});
window.addEventListener("click", e => {
  document.querySelectorAll(".dropdown").forEach(d => {
    if (!d.contains(e.target)) d.classList.remove("open");
  });
});
document.getElementById("refreshData").addEventListener("click", () => {
  load(true);
});

document.getElementById("toggleUnassigned").addEventListener("click", () => {
  showUnassignedOnly = !showUnassignedOnly;

  document.getElementById("toggleUnassigned").textContent =
    showUnassignedOnly ? "Show All Projects" : "Show Unassigned Only";

  applyFilters();
});



load();
