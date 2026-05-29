const API_URL = "https://script.google.com/macros/s/AKfycbxT2r6PhuJLtf6t637R3YY_mkt4LVDp8Plj8fEBd--XPM4kCifrhNDmPg48AO07e2mq/exec";

let allProjects = [];
let selectedFields = new Set();
let selectedKeywords = new Set();
let selectedSupervisors = new Set();
let expandedProjects = new Set();
let projectPreferences = {};
let showUnassignedOnly = false;
let showExpandedOnly = false;

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
    if (p.project.field) {
        fields.add(p.project.field.trim());
    }

    (p.project.keywords || []).forEach(k => {
      if (k) keywords.add(k.trim());
    });

    if (p.supervisor) {
      supervisors.add(p.supervisor.trim());
    }
  });

  const fieldOptions = document.getElementById("fieldOptions");
  fieldOptions.innerHTML = "";
  [...fields]
    .sort()
    .forEach(f => fieldOptions.appendChild(createCheckbox(f, selectedFields)));

  const keywordOptions = document.getElementById("keywordOptions");
  keywordOptions.innerHTML = "";
  [...keywords]
    .sort()
    .forEach(k => keywordOptions.appendChild(createCheckbox(k, selectedKeywords)));

  const supervisorOptions = document.getElementById("supervisorOptions");
  supervisorOptions.innerHTML = "";
  [...supervisors]
    .sort()
    .forEach(s => supervisorOptions.appendChild(createCheckbox(s, selectedSupervisors)));
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

    const expandedMatch =
      !showExpandedOnly || expandedProjects.has(p.id);

    return (textMatch && 
            fieldMatch &&
            keywordMatch &&
            supervisorMatch &&
            unassignedMatch &&
            expandedMatch);
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

        ${p.co_supervisor.exists 
            ?`<div class="meta"><b>Co-supervisor:</b> ${p.co_supervisor.name}</div>`
            : ""
        }

        ${(p.project.assigned_student?.length)
            ? `<div class="meta2"><b>Assigned to:</b> ${p.project.assigned_student.join(", ")}</div>`
            : ""
        }

        ${(p.project.assigned_student?.length &&
            p.project.capacity > (p.project.assigned_student.length))
            ? `<div class="meta2"><b>Additional available slots:</b> ${
                p.project.capacity - (p.project.assigned_student.length)
                }</div>`
            : ""
        }        

        ${p.project.brief 
            ? `<div class="brief">${p.project.brief}</div>`
            : ""
        }

        <div>${(p.project.keywords || [])
            .map(k => `<span class="tag">${k}</span>`).join("")}
        </div>

        ${
            expandedProjects.has(p.id)
            ? `
                <div class="meta preference-row">
                    <label><b>Preference:</b></label>
                    <select class="preference-select" data-project-id="${p.id}">
                    <option value="">--</option>
                    ${Array.from({ length: 12 }, (_, i) => `
                        <option value="${i + 1}"
                        ${projectPreferences[p.id] == i + 1 ? "selected" : ""}>
                        ${i + 1}
                    </option>
                    `).join("")}
                    </select>
                </div>
            ` : ""}
      `;
    
    if (expandedProjects.has(p.id)) {
        card.classList.add("expanded");
    }

    card.addEventListener("click", e => {
        if (e.target.closest(".preference-select")) return;

        if (expandedProjects.has(p.id)) {
            expandedProjects.delete(p.id);
            delete projectPreferences[p.id];
        } else {
            expandedProjects.add(p.id);
        }

        applyFilters();
    });

    const prefSelect = card.querySelector(".preference-select");

    if (prefSelect) {
        prefSelect.addEventListener("change", e => {
            const value = e.target.value;

            if (value === "") {
                delete projectPreferences[p.id];
            } else {
                projectPreferences[p.id] = Number(value);
            }
        });
    }

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

function exportSelectedToCSV() {
  const selected = [...expandedProjects]
    .map(id => ({
        id,
        preference: projectPreferences[id]
    }))
    .filter( p => p.preference);

  if (selected.length === 0) {
    alert("No projects selected.");
    return;
  }

  if (selected.length !== 12) {
    alert("You must assign preferences to exactly 12 projects.");
    return;
  }    

  const prefs = selected.map(p => p.preference);

  const duplicates = prefs.filter(
      (pref, index) => prefs.indexOf(pref) !== index
  );

  const duplicateRanks = [...new Set(duplicates)];

  if (duplicateRanks.length > 0){
    alert(`Duplicate preference rank(s) found: ${duplicateRanks.join(", ")}. Each project must have a unique rank.`);
    return;
  }

  const unavailableProjects = selected.filter(sel => {
      const project = allProjects.find(
          p => String(p.id) === String(sel.id)
      );

      if (!project) return true;

      const assigned =
          project.project.assigned_student &&
          project.project.assigned_student.trim() !== "";

      const capacity =
          Number(project.project.capacity || 1);
       
      return assigned && capacity <=1;
  });

  if (unavailableProjects.length > 0) {
    const ids = unavailableProjects
      .map(p => p.id)
      .join(", ");

    alert(
      `These projects are already assigned and unavailable: ${ids}`
    );
    return;
  }

  selected.sort((a,b) => a.preference - b.preference);

  let csv = "preference,project_id\n";

  selected.forEach( p => {
      csv += `${p.preference},${p.id}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "project_preferences.csv";
  link.click();

  URL.revokeObjectURL(url);
}

function exportSelectedToMarkdown() {
  const selectedProjects = [...expandedProjects]
    .map(id => allProjects.find(p => String(p.id) === String(id)))
    .filter(Boolean);

  if (selectedProjects.length === 0) {
    alert("No projects selected.");
    return;
  }

  let md = "# Selected MEC4128Z Projects\n\n";

  selectedProjects.forEach((p, index) => {
    md += `## ${index + 1}. ${p.id} — ${p.title}\n\n`;
    md += `**Supervisor:** ${p.supervisor}\n\n`;

    if (p.project.field) {
      md += `**Field:** ${p.project.field}\n\n`;
    }

    if (p.project.brief) {
      md += `${p.project.brief}\n\n`;
    }

    if (p.project.keywords?.length) {
      md += `**Keywords:** ${p.project.keywords.join(", ")}\n\n`;
    }

    md += `---\n\n`;
  });

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "selected_projects.md";
  link.click();

  URL.revokeObjectURL(url);
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

document.getElementById("expandedFilterBtn").addEventListener("click", () => {
  showExpandedOnly = !showExpandedOnly;

  document.getElementById("expandedFilterBtn").textContent =
    showExpandedOnly ? "Show All Projects" : "Show Selected Projects";

  applyFilters();
});

document.getElementById("exportCsv")
  .addEventListener("click", exportSelectedToCSV);

document.getElementById("exportMarkdown")
  .addEventListener("click", exportSelectedToMarkdown);

load();
