const API_URL = "http://localhost:3000";

let patients = [];
const rowsPerPage = 10;
let currentPage = 1;
let currentEditIndex = null;
let sortField = "created_at";
let sortDirection = "desc";
let currentPatientId = null;
let currentPatientData = null;

// Filters state
let filters = {
  search: "",
  created_from: "",
  created_to: "",
  follow_up_from: "",
  follow_up_to: "",
};

// Format date to "Month Day, Year"
function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Calculate BMI
function calculateBMI(height, weight) {
  if (height && weight) return (weight / (height / 100) ** 2).toFixed(1);
  return "";
}

// Calculate age from birthdate string (YYYY-MM-DD)
function calculateAge(birthDateString) {
  if (!birthDateString) return "";
  const today = new Date();
  const birth = new Date(birthDateString);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// ==================== API FUNCTIONS ====================

async function fetchPatients() {
  try {
    const params = new URLSearchParams({
      page: currentPage,
      limit: rowsPerPage,
      sort_by: sortField,
      sort_order: sortDirection,
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== ""),
      ),
    });

    const response = await fetch(`${API_URL}/patients?${params}`);
    const data = await response.json();

    if (data.success) {
      patients = data.data;
      renderTable(data.pagination);
    } else {
      console.error("Error fetching patients:", data.error);
      alert("Failed to load patients");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to connect to server");
  }
}

async function fetchSinglePatient(id) {
  try {
    const response = await fetch(`${API_URL}/patients/${id}`);
    const data = await response.json();

    if (data.success) {
      return data.data;
    } else {
      console.error("Error fetching patient:", data.error);
      return null;
    }
  } catch (error) {
    console.error("Error:", error);
    return null;
  }
}

async function createPatient(patientData) {
  try {
    const response = await fetch(`${API_URL}/patients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patientData),
    });

    const data = await response.json();

    if (data.success) {
      await fetchPatients();
      return true;
    } else {
      alert("Error creating patient: " + data.error);
      return false;
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to create patient");
    return false;
  }
}

async function updatePatient(id, patientData) {
  try {
    const response = await fetch(`${API_URL}/patients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patientData),
    });

    const data = await response.json();

    if (data.success) {
      await fetchPatients();
      return true;
    } else {
      alert("Error updating patient: " + data.error);
      return false;
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to update patient");
    return false;
  }
}

async function deletePatientAPI(id) {
  try {
    const response = await fetch(`${API_URL}/patients/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (data.success) {
      await fetchPatients();
      return true;
    } else {
      alert("Error deleting patient: " + data.error);
      return false;
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to delete patient");
    return false;
  }
}

// ==================== SORT FUNCTIONS ====================

function updateSortIcons() {
  document.querySelectorAll(".sort-icon").forEach((icon) => {
    icon.classList.remove("active", "bi-arrow-up", "bi-arrow-down");
    icon.classList.add("bi-arrow-down");
  });

  const iconMap = {
    created_at: "sortCreatedIcon",
    follow_up_date: "sortFollowUpIcon",
  };

  const iconId = iconMap[sortField];
  const icon = document.getElementById(iconId);
  if (icon) {
    icon.classList.add("active");
    icon.classList.remove("bi-arrow-up", "bi-arrow-down");
    icon.classList.add(
      sortDirection === "asc" ? "bi-arrow-up" : "bi-arrow-down",
    );
  }
}

function toggleSort(field) {
  const fieldMap = {
    created: "created_at",
    followUp: "follow_up_date",
  };

  const dbField = fieldMap[field] || field;

  if (sortField === dbField) {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
  } else {
    sortField = dbField;
    sortDirection = "asc";
  }

  updateSortIcons();
  currentPage = 1;
  fetchPatients();
}

// ==================== FILTER FUNCTIONS ====================

function applyFilters() {
  filters.search = document.getElementById("searchName").value;
  filters.created_from = document.getElementById("filterCreated").value;
  filters.created_to = document.getElementById("filterCreatedEnd").value;
  filters.follow_up_from = document.getElementById("filterFollowUp").value;
  filters.follow_up_to = document.getElementById("filterFollowUpEnd").value;

  currentPage = 1;
  fetchPatients();
}

// ==================== TABLE RENDERING ====================

function renderTable(pagination = null) {
  const tbody = document.getElementById("patientTableBody");
  tbody.innerHTML = "";

  if (patients.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-4">
          <i class="bi bi-emoji-frown fs-1 d-block mb-2"></i>
          No patients found matching your criteria
        </td>
      </tr>
    `;
  } else {
    patients.forEach((p) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${p.name}</td>
        <td>${p.gender || "-"}</td>
        <td>${p.phone || "-"}</td>
        <td>${formatDate(p.created_at)}</td>
        <td>${formatDate(p.follow_up_date)}</td>
        <td>
          <div class="d-flex gap-1 w-100">
            <button class="btn btn-sm btn-secondary text-white px-3" onclick="viewPatient(${p.id})" title="View Details">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-primary text-white flex-grow-1" onclick="showLabModal(${p.id})">
              Lab
            </button>
            <button class="btn btn-sm btn-primary text-white flex-grow-1" onclick="showCertModal(${p.id})">
              Cert
            </button>
            <button class="btn btn-sm btn-primary text-white flex-grow-1" onclick="showPresModal(${p.id})">
              Presc
            </button>
            <button class="btn btn-sm btn-danger text-white px-3" onclick="deletePatient(${p.id}, '${p.name.replace(/'/g, "\\'")}')" title="Delete">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  if (pagination) {
    renderPagination(pagination);
  }
}

function renderPagination(pagination) {
  const paginationEl = document.getElementById("pagination");
  paginationEl.innerHTML = "";

  if (pagination.totalPages <= 1) return;

  // Previous button
  const prevLi = document.createElement("li");
  prevLi.className = `page-item ${currentPage === 1 ? "disabled" : ""}`;
  prevLi.innerHTML = `<a class="page-link" style="cursor:pointer" onclick="goPage(${currentPage - 1})">&laquo;</a>`;
  paginationEl.appendChild(prevLi);

  // Page numbers
  for (let i = 1; i <= pagination.totalPages; i++) {
    const li = document.createElement("li");
    li.className = `page-item ${i === currentPage ? "active" : ""}`;
    li.innerHTML = `<a class="page-link" style="cursor:pointer" onclick="goPage(${i})">${i}</a>`;
    paginationEl.appendChild(li);
  }

  // Next button
  const nextLi = document.createElement("li");
  nextLi.className = `page-item ${currentPage === pagination.totalPages ? "disabled" : ""}`;
  nextLi.innerHTML = `<a class="page-link" style="cursor:pointer" onclick="goPage(${currentPage + 1})">&raquo;</a>`;
  paginationEl.appendChild(nextLi);
}

function goPage(page) {
  if (page < 1) return;
  currentPage = page;
  fetchPatients();
}

// ==================== MODAL FUNCTIONS ====================

function showLabModal(id) {
  new bootstrap.Modal(document.getElementById("labModal")).show();
}

async function showPresModal(patientId) {
  currentPatientId = patientId;
  // Reuse already-fetched patient data if it's the same patient, otherwise fetch
  if (!currentPatientData || currentPatientData.id !== patientId) {
    currentPatientData = await fetchSinglePatient(patientId);
  }
  await loadPrescriptions(patientId);
  new bootstrap.Modal(document.getElementById("presModal")).show();
}

async function deletePatient(id, name) {
  if (confirm(`Are you sure you want to delete ${name}?`)) {
    await deletePatientAPI(id);
  }
}

async function viewPatient(id) {
  const p = await fetchSinglePatient(id);
  if (!p) {
    alert("Failed to load patient details");
    return;
  }

  currentEditIndex = id;

  const allergies = Array.isArray(p.allergies)
    ? p.allergies.join(", ")
    : p.allergies || "";
  const illnesses = Array.isArray(p.past_illnesses)
    ? p.past_illnesses.join(", ")
    : p.past_illnesses || "";
  const surgery = Array.isArray(p.surgery_history)
    ? p.surgery_history.join(", ")
    : p.surgery_history || "";

  const formHTML = `
    <h6>Basic Info</h6>
    <div class="row mb-3">
      <div class="col-md-4">
        <div class="form-floating mb-3">
          <input type="text" class="form-control" id="editName" value="${p.name || ""}">
          <label for="editName">Name</label>
        </div>
      </div>
      <div class="col-md-4">
        <div class="form-floating mb-3">
          <input type="text" class="form-control" id="editPhone" value="${p.phone || ""}">
          <label for="editPhone">Phone</label>
        </div>
      </div>
      <div class="col-md-4">
        <div class="form-floating mb-3">
          <input type="email" class="form-control" id="editEmail" value="${p.email || ""}">
          <label for="editEmail">Email</label>
        </div>
      </div>
      <div class="col-md-4">
        <div class="form-floating mb-3">
          <input type="date" class="form-control" id="editBirthdate" value="${p.birth || ""}">
          <label for="editBirthdate">Birthdate</label>
        </div>
      </div>
      <div class="col-md-4">
        <div class="form-floating mb-3">
          <input type="text" class="form-control" id="editAddress" value="${p.address || ""}">
          <label for="editAddress">Address</label>
        </div>
      </div>
      <div class="col-md-4">
        <div class="form-floating mb-3">
          <select class="form-select" id="editGender">
            <option value="">Select Gender</option>
            <option ${p.gender === "Male" ? "selected" : ""}>Male</option>
            <option ${p.gender === "Female" ? "selected" : ""}>Female</option>
            <option ${p.gender === "Other" ? "selected" : ""}>Other</option>
          </select>
          <label for="editGender">Gender</label>
        </div>
      </div>
      <div class="col-md-4">
        <div class="form-floating mb-3">
          <select class="form-select" id="editBlood">
            <option value="">Blood Type</option>
            <option ${p.blood_type === "A+" ? "selected" : ""}>A+</option>
            <option ${p.blood_type === "A-" ? "selected" : ""}>A-</option>
            <option ${p.blood_type === "B+" ? "selected" : ""}>B+</option>
            <option ${p.blood_type === "B-" ? "selected" : ""}>B-</option>
            <option ${p.blood_type === "AB+" ? "selected" : ""}>AB+</option>
            <option ${p.blood_type === "AB-" ? "selected" : ""}>AB-</option>
            <option ${p.blood_type === "O+" ? "selected" : ""}>O+</option>
            <option ${p.blood_type === "O-" ? "selected" : ""}>O-</option>
          </select>
          <label for="editBlood">Blood Type</label>
        </div>
      </div>
    </div>

    <h6>Medical History</h6>
    <div class="form-floating mb-3">
      <textarea class="form-control" id="editAllergies" style="height: 80px">${allergies}</textarea>
      <label for="editAllergies">Allergies (comma-separated)</label>
    </div>
    <div class="form-floating mb-3">
      <textarea class="form-control" id="editIllnesses" style="height: 80px">${illnesses}</textarea>
      <label for="editIllnesses">Past Illnesses (comma-separated)</label>
    </div>
    <div class="form-floating mb-3">
      <textarea class="form-control" id="editSurgery" style="height: 80px">${surgery}</textarea>
      <label for="editSurgery">Surgery History (comma-separated)</label>
    </div>
    <div class="form-floating mb-3">
      <textarea class="form-control" id="editComplaint" style="height: 80px">${p.chief_complaint || ""}</textarea>
      <label for="editComplaint">Chief Complaint</label>
    </div>

    <h6>Vitals</h6>
    <div class="row mb-3">
      <div class="col-md-3">
        <div class="form-floating mb-3">
          <input type="text" class="form-control" id="editBP" value="${p.bp || ""}">
          <label for="editBP">Blood Pressure</label>
        </div>
      </div>
      <div class="col-md-3">
        <div class="form-floating mb-3">
          <input type="number" class="form-control" id="editHR" value="${p.hr || ""}">
          <label for="editHR">Heart Rate</label>
        </div>
      </div>
      <div class="col-md-3">
        <div class="form-floating mb-3">
          <input type="number" class="form-control" id="editRR" value="${p.rr || ""}">
          <label for="editRR">Respiratory Rate</label>
        </div>
      </div>
      <div class="col-md-3">
        <div class="form-floating mb-3">
          <input type="number" step="0.1" class="form-control" id="editTemp" value="${p.temperature || ""}">
          <label for="editTemp">Temperature °C</label>
        </div>
      </div>
      <div class="col-md-3">
        <div class="form-floating mb-3">
          <input type="number" class="form-control" id="editHeight" value="${p.height || ""}">
          <label for="editHeight">Height (cm)</label>
        </div>
      </div>
      <div class="col-md-3">
        <div class="form-floating mb-3">
          <input type="number" class="form-control" id="editWeight" value="${p.weight || ""}">
          <label for="editWeight">Weight (kg)</label>
        </div>
      </div>
      <div class="col-md-3">
        <div class="form-floating mb-3">
          <input type="text" class="form-control" id="editBMI" value="${p.bmi || ""}" readonly>
          <label for="editBMI">BMI</label>
        </div>
      </div>
    </div>

    <h6>Physical Examination</h6>
    <div class="form-floating mb-3">
      <textarea class="form-control" id="editExam" style="height: 100px">${p.physical_exam || ""}</textarea>
      <label for="editExam">Examination Notes</label>
    </div>

    <h6>Follow-up Date</h6>
    <div class="form-floating mb-3">
      <input type="date" class="form-control" id="editFollow" value="${p.follow_up_date || ""}">
      <label for="editFollow">Follow-up Date</label>
    </div>
  `;

  document.getElementById("viewForm").innerHTML = formHTML;

  document
    .getElementById("editHeight")
    .addEventListener("input", updateEditBMI);
  document
    .getElementById("editWeight")
    .addEventListener("input", updateEditBMI);

  new bootstrap.Modal(document.getElementById("viewModal")).show();
}

function updateEditBMI() {
  const h = parseFloat(document.getElementById("editHeight").value);
  const w = parseFloat(document.getElementById("editWeight").value);
  document.getElementById("editBMI").value = calculateBMI(h, w);
}

// ==================== SAVE / CREATE HANDLERS ====================
// NOTE: These are registered inside DOMContentLoaded (see bottom of file)

// ==================== CERTIFICATE FUNCTIONS ====================

async function showCertModal(patientId) {
  currentPatientId = patientId;
  // Fetch and cache patient data so new certificates can be pre-filled
  currentPatientData = await fetchSinglePatient(patientId);
  await loadCertificates(patientId);
  new bootstrap.Modal(document.getElementById("certModal")).show();
}

async function loadCertificates(patientId) {
  const container = document.getElementById("certListContainer");
  container.innerHTML = `<div class="text-center text-muted py-3"><i class="bi bi-hourglass-split me-2"></i>Loading...</div>`;

  try {
    const response = await fetch(
      `${API_URL}/forms?patient_id=${patientId}&form_type=certificate`,
    );
    const data = await response.json();

    if (data.success && data.data.length > 0) {
      container.innerHTML = data.data
        .map(
          (cert) => `
        <div class="card mb-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="mb-1">
                  <i class="bi bi-file-earmark-text me-2"></i>
                  Medical Certificate
                </h6>
                <small class="text-muted">
                  Date: ${formatDate(cert.form_date)}
                  <span class="ms-2">Created: ${formatDate(cert.created_at)}</span>
                </small>
              </div>
              <div class="btn-group">
                <button class="btn btn-sm btn-outline-primary" onclick="viewCertificate(${cert.id})">
                  <i class="bi bi-eye"></i> View
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deleteCertificate(${cert.id})">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `,
        )
        .join("");
    } else {
      container.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle me-2"></i>
          No certificates found for this patient.
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading certificates:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Failed to load certificates.
      </div>
    `;
  }
}

async function viewCertificate(certId) {
  try {
    const response = await fetch(`${API_URL}/forms/${certId}`);
    const result = await response.json();

    if (result.success) {
      openCertificateWindow(result.data);
    } else {
      alert("Failed to load certificate");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to load certificate");
  }
}

async function deleteCertificate(certId) {
  if (!confirm("Are you sure you want to delete this certificate?")) return;

  try {
    const response = await fetch(`${API_URL}/forms/${certId}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (result.success) {
      await loadCertificates(currentPatientId);
    } else {
      alert("Failed to delete certificate: " + result.error);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to delete certificate");
  }
}

function openCertificateWindow(certData = null, patientData = null) {
  const certWindow = window.open("", "_blank", "width=800,height=900");
  certWindow.document.write(getCertificateHTML(certData, patientData));
  certWindow.document.close();

  // FIX: Attach onclick directly after document.close() instead of waiting
  // for DOMContentLoaded (which has already fired by this point)
  const attachSaveHandler = () => {
    const saveBtn = certWindow.document.getElementById("saveCloseButton");
    if (saveBtn) {
      saveBtn.onclick = async () => {
        await saveCertificate(certWindow, certData);
      };
    }
  };

  // Use load event as fallback; if already loaded, attach immediately
  if (certWindow.document.readyState === "complete") {
    attachSaveHandler();
  } else {
    certWindow.addEventListener("load", attachSaveHandler);
  }
}

async function saveCertificate(certWindow, existingCertData) {
  const certDoc = certWindow.document;

  // FIX: Use safe querySelector with null checks instead of fragile index-based selectors
  const underlineInputs = certDoc.querySelectorAll(".underline");
  const underlineLongInputs = certDoc.querySelectorAll(".underline-long");
  const underlineShortInputs = certDoc.querySelectorAll(".underline-short");
  const fieldLines = certDoc.querySelectorAll(".field-line");

  const formData = {
    date: underlineInputs[0] ? underlineInputs[0].value : "",
    patientName: underlineLongInputs[0] ? underlineLongInputs[0].value : "",
    age: underlineShortInputs[0] ? underlineShortInputs[0].value : "",
    address: certDoc.querySelector(".underline-long.address")
      ? certDoc.querySelector(".underline-long.address").value
      : "",
    examinedDate: underlineInputs[1] ? underlineInputs[1].value : "",
    complaint: certDoc.querySelector(".underline-long.for")
      ? certDoc.querySelector(".underline-long.for").value
      : "",
    diagnosis: [
      fieldLines[0] ? fieldLines[0].value : "",
      fieldLines[1] ? fieldLines[1].value : "",
      fieldLines[2] ? fieldLines[2].value : "",
    ].filter(Boolean),
    recommendations: [
      fieldLines[3] ? fieldLines[3].value : "",
      fieldLines[4] ? fieldLines[4].value : "",
      fieldLines[5] ? fieldLines[5].value : "",
    ].filter(Boolean),
  };

  try {
    let response;

    if (existingCertData) {
      response = await fetch(`${API_URL}/forms/${existingCertData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_type: "certificate",
          form_date: formData.date || new Date().toISOString().split("T")[0],
          data: formData,
        }),
      });
    } else {
      response = await fetch(`${API_URL}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: currentPatientId,
          form_type: "certificate",
          form_date: formData.date || new Date().toISOString().split("T")[0],
          data: formData,
        }),
      });
    }

    const result = await response.json();

    if (result.success) {
      alert("Certificate saved successfully!");
      certWindow.close();
      await loadCertificates(currentPatientId);
    } else {
      alert("Error saving certificate: " + result.error);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to save certificate");
  }
}

function getCertificateHTML(certData = null, patientData = null) {
  const data = certData?.data || {};

  // Pre-fill from patient record only when creating a new certificate
  const isNew = !certData;
  const prefill = {
    patientName: isNew ? patientData?.name || "" : data.patientName || "",
    age: isNew ? (calculateAge(patientData?.birth) ?? "") : data.age || "",
    address: isNew ? patientData?.address || "" : data.address || "",
    date: isNew
      ? new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : data.date || "",
    examinedDate: data.examinedDate || "",
    complaint: data.complaint || "",
  };

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Medical Certificate - A5</title>
    <style>
      body {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        background: #f0f0f0;
      }
      .a5-page {
        width: 148mm;
        height: 210mm;
        background: white;
        border: 1px solid #ccc;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .header {
        flex: 0 0 15%;
        display: grid;
        grid-template-columns: 2fr 10fr;
        gap: 10px;
        padding: 10px;
        overflow: hidden;
        box-sizing: border-box;
        border-bottom: 2px solid #000000;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        align-items: stretch;
      }
      .header-logo {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        width: 100%;
      }
      .header-logo img {
        max-height: 100%;
        max-width: 100%;
        object-fit: contain;
      }
      .header-info {
        display: flex;
        flex-direction: column;
        justify-content: center;
        font-family: Arial, Helvetica, sans-serif;
        line-height: 1.5;
        height: 100%;
        text-align: center;
      }
      .header-doctor-name {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 5px;
        color: #131212;
      }
      .header-credentials {
        font-size: 13px;
        margin-bottom: 3px;
        color: #333;
      }
      .header-schedule {
        font-size: 13px;
        margin-top: 6px;
        color: #333;
        font-weight: 600;
      }
      .content {
        flex: 1;
        padding: 20px 25px;
        box-sizing: border-box;
        overflow: hidden;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11px;
        line-height: 1.8;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }
      .date-line {
        text-align: right;
        margin-bottom: 20px;
        font-size: 11px;
      }
      .cert-title {
        text-align: center;
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 20px;
        letter-spacing: 1px;
      }
      .cert-body {
        margin-bottom: 12px;
        line-height: 1.8;
      }
      .underline {
        display: inline-block;
        border: none;
        border-bottom: 1px solid #000;
        min-width: 120px;
        width: 120px;
        background: transparent;
        outline: none;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11px;
        padding: 0 2px;
        vertical-align: baseline;
        text-align: center;
      }
      .underline-long {
        display: inline-block;
        border: none;
        border-bottom: 1px solid #000;
        min-width: 180px;
        width: 180px;
        background: transparent;
        outline: none;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11px;
        padding: 0 2px;
        vertical-align: baseline;
        text-align: center;
      }
      .underline-long.for {
        width: 100% !important;
        text-align: left;
      }
      .underline-long.address {
        width: 100% !important;
        text-align: left;
      }
      .underline-short {
        display: inline-block;
        border: none;
        border-bottom: 1px solid #000;
        min-width: 25px;
        width: 25px;
        background: transparent;
        outline: none;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11px;
        padding: 0 2px;
        vertical-align: baseline;
        text-align: center;
      }
      .section-title {
        font-weight: bold;
        margin-top: 15px;
        margin-bottom: 8px;
      }
      .field-line {
        border: none;
        border-bottom: 1px solid #000;
        min-height: 18px;
        margin-bottom: 5px;
        width: 100%;
        background: transparent;
        outline: none;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 11px;
        padding: 2px 0;
        display: block;
      }
      .disclaimer {
        text-align: center;
        font-size: 9px;
        margin-top: 15px;
        font-style: italic;
      }
      .signature-section {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-top: 20px;
      }
      .left-sig {
        text-align: center;
        font-size: 10px;
      }
      .right-sig {
        text-align: center;
        font-size: 10px;
      }
      .doctor-name {
        font-weight: bold;
        margin-top: 5px;
      }
      .footer {
        flex: 0 0 7%;
        padding: 5px;
        text-align: center;
        overflow: hidden;
        background-color: #c9b06c;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .footer p {
        font-size: 12px;
        margin: 2px;
        color: white;
        font-family: Arial, Helvetica, sans-serif;
      }
      .action-buttons {
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 1000;
        display: flex;
        gap: 10px;
      }
      .btn {
        padding: 10px 20px;
        font-size: 14px;
        cursor: pointer;
        color: white;
        border: none;
        border-radius: 4px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        transition: background-color 0.3s;
      }
      #printButton { background-color: #4caf50; }
      #printButton:hover { background-color: #45a049; }
      #saveCloseButton { background-color: #2196f3; }
      #saveCloseButton:hover { background-color: #0b7dda; }
      @media print {
        body { background: white; margin: 0; padding: 0; }
        .action-buttons { display: none !important; }
        .a5-page {
          width: 148mm;
          height: 210mm;
          box-shadow: none;
          border: none;
          margin: 0;
          page-break-after: avoid;
        }
        @page { size: A5 portrait; margin: 0; }
        .header { border-bottom: 2px solid #000000 !important; }
        .footer { background-color: #c9b06c !important; }
        .underline, .follow-up-input { border-bottom: 1px solid #000 !important; background: transparent !important; }
      }
    </style>
  </head>
  <body>
    <div class="action-buttons">
      <button id="printButton" class="btn" onclick="window.print()">🖨️ Print</button>
      <button id="saveCloseButton" class="btn">💾 Save and Close</button>
    </div>

    <div class="a5-page">
      <div class="header">
        <div class="header-logo">
          <img src="image.png" alt="Logo" />
        </div>
        <div class="header-info">
          <div class="header-doctor-name">Irish Jasmine P. Dizon, MD, FPSO - HNS</div>
          <div class="header-credentials">Fellow, Philippine Society of Otolaryngology, Head and Neck Surgery</div>
          <div class="header-credentials">Fellow, Philippine Federation of Cosmetic Surgeons Inc.</div>
          <div class="header-schedule">Monday to Friday 5PM-8PM | Saturday 9AM-2PM | Sunday 9AM-12NN</div>
        </div>
      </div>

      <div class="content">
        <div>
          <div class="date-line">
            Date: <input type="text" class="underline" value="${prefill.date}" />
          </div>

          <div class="cert-title">MEDICAL CERTIFICATE</div>

          <div class="cert-body">
            <strong>To whom it may concern:</strong>
          </div>

          <div class="cert-body">
            This is to certify that
            <input type="text" class="underline-long" value="${prefill.patientName}" />,
            <input type="text" class="underline-short" value="${prefill.age}" /> years old presently
            residing at <input type="text" class="underline-long address" value="${prefill.address}" /> was
            examined and treated at my clinic on
            <input type="text" class="underline" value="${prefill.examinedDate}" /> for
            <input type="text" class="underline-long for" value="${prefill.complaint}" />
          </div>

          <div class="section-title">Diagnosis:</div>
          <input type="text" class="field-line" value="${data.diagnosis?.[0] || ""}" />
          <input type="text" class="field-line" value="${data.diagnosis?.[1] || ""}" />
          <input type="text" class="field-line" value="${data.diagnosis?.[2] || ""}" />

          <div class="section-title">Recommendation/s:</div>
          <input type="text" class="field-line" value="${data.recommendations?.[0] || ""}" />
          <input type="text" class="field-line" value="${data.recommendations?.[1] || ""}" />
          <input type="text" class="field-line" value="${data.recommendations?.[2] || ""}" />
        </div>

        <div>
          <div class="disclaimer">
            This certification is issued upon the request of the patient for whatever purpose<br />
            it may serve except medicolegal purpose
          </div>
          <div class="signature-section">
            <div class="left-sig">Not valid without<br /><strong>Dry seal</strong></div>
            <div class="right-sig">
              <div class="doctor-name">Dr. Irish Dizon M.D</div>
              License No: MED-000123
            </div>
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Unit K. No. 8 A. Mabini St. Brgy. Kapasigan, Pasig City | 0927 411 6708 |</p>
        <p>preclarodizonclinic@gmail.com</p>
      </div>
    </div>
  </body>
</html>`;
}

// ==================== PRESCRIPTION FUNCTIONS ====================

async function loadPrescriptions(patientId) {
  const container = document.getElementById("presListContainer");
  container.innerHTML = `<div class="text-center text-muted py-3"><i class="bi bi-hourglass-split me-2"></i>Loading...</div>`;

  try {
    const response = await fetch(
      `${API_URL}/forms?patient_id=${patientId}&form_type=prescription`,
    );
    const data = await response.json();

    if (data.success && data.data.length > 0) {
      container.innerHTML = data.data
        .map(
          (pres) => `
        <div class="card mb-2">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="mb-1">
                  <i class="bi bi-prescription2 me-2"></i>
                  Prescription
                </h6>
                <small class="text-muted">
                  Date: ${formatDate(pres.form_date)}
                  <span class="ms-2">Medicines: ${(pres.data?.rows || []).length}</span>
                  <span class="ms-2">Created: ${formatDate(pres.created_at)}</span>
                </small>
              </div>
              <div class="btn-group">
                <button class="btn btn-sm btn-outline-primary" onclick="viewPrescription(${pres.id})">
                  <i class="bi bi-eye"></i> View
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="deletePrescription(${pres.id})">
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `,
        )
        .join("");
    } else {
      container.innerHTML = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle me-2"></i>
          No prescriptions found for this patient.
        </div>
      `;
    }
  } catch (error) {
    console.error("Error loading prescriptions:", error);
    container.innerHTML = `
      <div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle me-2"></i>
        Failed to load prescriptions.
      </div>
    `;
  }
}

async function viewPrescription(presId) {
  try {
    const response = await fetch(`${API_URL}/forms/${presId}`);
    const result = await response.json();
    if (result.success) {
      openPrescriptionWindow(result.data);
    } else {
      alert("Failed to load prescription");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to load prescription");
  }
}

async function deletePrescription(presId) {
  if (!confirm("Are you sure you want to delete this prescription?")) return;
  try {
    const response = await fetch(`${API_URL}/forms/${presId}`, {
      method: "DELETE",
    });
    const result = await response.json();
    if (result.success) {
      await loadPrescriptions(currentPatientId);
    } else {
      alert("Failed to delete prescription: " + result.error);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to delete prescription");
  }
}

function openPrescriptionWindow(presData = null, patientData = null) {
  const presWindow = window.open("", "_blank", "width=820,height=950");
  presWindow.document.write(getPrescriptionHTML(presData, patientData));
  presWindow.document.close();

  const attachHandlers = () => {
    // Save button
    const saveBtn = presWindow.document.getElementById("saveCloseButton");
    if (saveBtn) {
      saveBtn.onclick = async () => {
        await savePrescription(presWindow, presData);
      };
    }
    // Add row button
    const addBtn = presWindow.document.getElementById("addRowButton");
    if (addBtn) {
      addBtn.onclick = () => {
        presWindow.addNewRow();
      };
    }
  };

  if (presWindow.document.readyState === "complete") {
    attachHandlers();
  } else {
    presWindow.addEventListener("load", attachHandlers);
  }
}

async function savePrescription(presWindow, existingPresData) {
  const presDoc = presWindow.document;

  // Collect patient info fields
  const nameInput = presDoc.querySelector(".patient-name-input");
  const ageInput = presDoc.querySelector(".patient-age-input");
  const sexInput = presDoc.querySelector(".patient-sex-input");
  const addrInput = presDoc.querySelector(".patient-addr-input");
  const dateInput = presDoc.querySelector(".patient-date-input");
  const followInput = presDoc.querySelector(".follow-up-input");

  // Collect all rows from the allRows array exposed on presWindow
  const rows = presWindow.allRows || [];

  const formData = {
    patientName: nameInput ? nameInput.value : "",
    age: ageInput ? ageInput.value : "",
    sex: sexInput ? sexInput.value : "",
    address: addrInput ? addrInput.value : "",
    date: dateInput ? dateInput.value : "",
    followUpDate: followInput ? followInput.value : "",
    rows: rows.map((r) => ({
      rowNumber: r.rowNumber,
      medicine: r.medicine,
      qty: r.qty,
      breakfastBefore: r.breakfastBefore,
      breakfastAfter: r.breakfastAfter,
      lunchBefore: r.lunchBefore,
      lunchAfter: r.lunchAfter,
      dinnerBefore: r.dinnerBefore,
      dinnerAfter: r.dinnerAfter,
      bedtime: r.bedtime,
      medicineNotes: r.medicineNotes,
      timeNotes: r.timeNotes,
    })),
  };

  try {
    let response;
    const formDate = formData.date
      ? new Date(formData.date).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    if (existingPresData) {
      response = await fetch(`${API_URL}/forms/${existingPresData.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_type: "prescription",
          form_date: formDate,
          data: formData,
        }),
      });
    } else {
      response = await fetch(`${API_URL}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: currentPatientId,
          form_type: "prescription",
          form_date: formDate,
          data: formData,
        }),
      });
    }

    const result = await response.json();
    if (result.success) {
      alert("Prescription saved successfully!");
      presWindow.close();
      await loadPrescriptions(currentPatientId);
    } else {
      alert("Error saving prescription: " + result.error);
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Failed to save prescription");
  }
}

function getPrescriptionHTML(presData = null, patientData = null) {
  const data = presData?.data || {};
  const isNew = !presData;

  // Pre-fill patient info on new prescriptions only
  const prefill = {
    name: isNew ? patientData?.name || "" : data.patientName || "",
    age: isNew ? (calculateAge(patientData?.birth) ?? "") : data.age || "",
    sex: isNew ? patientData?.gender || "" : data.sex || "",
    address: isNew ? patientData?.address || "" : data.address || "",
    date: isNew
      ? new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : data.date || "",
    followUpDate: data.followUpDate || "",
  };

  // Rows: either from saved data or 5 empty defaults
  const savedRows = data.rows && data.rows.length > 0 ? data.rows : [];
  const initialRows =
    savedRows.length > 0
      ? savedRows
      : Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          rowNumber: i + 1,
          medicine: "",
          qty: "",
          breakfastBefore: false,
          breakfastAfter: false,
          lunchBefore: false,
          lunchAfter: false,
          dinnerBefore: false,
          dinnerAfter: false,
          bedtime: false,
          medicineNotes: "",
          timeNotes: "",
        }));

  // Encode initial rows safely for injection into the script
  const initialRowsJSON = JSON.stringify(initialRows)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Medical Prescription - A5</title>
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      margin: 0;
      background: #f0f0f0;
      box-sizing: border-box;
    }
    .a5-page {
      width: 148mm;
      height: 210mm;
      background: white;
      border: 1px solid #ccc;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .header {
      flex: 0 0 15%;
      display: grid;
      grid-template-columns: 2fr 10fr;
      gap: 10px;
      padding: 10px;
      overflow: hidden;
      box-sizing: border-box;
      border-bottom: 2px solid #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      align-items: stretch;
    }
    .header-logo { display:flex; justify-content:center; align-items:center; height:100%; width:100%; }
    .header-logo img { max-height:100%; max-width:100%; object-fit:contain; }
    .header-info { display:flex; flex-direction:column; justify-content:center; font-family:Arial,Helvetica,sans-serif; line-height:1.5; height:100%; text-align:center; }
    .header-doctor-name { font-size:18px; font-weight:bold; margin-bottom:5px; color:#131212; }
    .header-credentials { font-size:13px; margin-bottom:3px; color:#333; }
    .header-schedule { font-size:13px; margin-top:6px; color:#333; font-weight:600; }
    .content { flex:1; padding:10px 15px; box-sizing:border-box; font-family:Arial,Helvetica,sans-serif; font-size:11px; display:flex; flex-direction:column; min-height:0; }
    .patient-info-section { flex:0 0 auto; min-height:50px; display:flex; flex-direction:column; justify-content:center; margin-bottom:10px; }
    .patient-info { display:grid; grid-template-columns:3fr 1fr 1fr; gap:8px; margin-bottom:5px; }
    .info-row-2 { display:grid; grid-template-columns:3fr 1fr; gap:8px; }
    .info-field { display:flex; align-items:center; }
    .field-label { font-weight:bold; margin-right:5px; font-size:11px; white-space:nowrap; }
    .underline { display:inline-block; border:none; border-bottom:1px solid #000; flex:1; background:transparent; outline:none; font-family:Arial,Helvetica,sans-serif; font-size:11px; padding:0 2px; min-height:16px; }
    .prescription-section { flex:1; display:flex; flex-direction:column; min-height:0; }
    .prescription-title { text-align:center; font-weight:bold; font-size:14px; margin-bottom:6px; letter-spacing:1px; flex:0 0 auto; }
    .prescription-table { width:100%; border-collapse:collapse; font-size:10px; table-layout:fixed; }
    .prescription-table thead { height:40px; }
    .prescription-table tbody tr { height:28px !important; max-height:28px !important; }
    .prescription-table tbody tr.notes-row { height:22px !important; max-height:22px !important; }
    .prescription-table th,.prescription-table td { border:1px solid #000; text-align:center; vertical-align:middle; padding:2px; overflow:hidden; height:inherit; }
    .prescription-table th { background-color:#f5f5f5; font-weight:bold; -webkit-print-color-adjust:exact; print-color-adjust:exact; height:40px; }
    .prescription-table tbody td { height:28px; max-height:28px; line-height:1.2; }
    .prescription-table tbody tr.notes-row td { height:32px; max-height:22px; line-height:1.1; vertical-align:top; }
    .row-number { width:3%; font-weight:bold; text-align:center; }
    .medicine-column { width:50%; text-align:left; }
    .qty-column { width:5%; }
    .time-column { width:17.75%; }
    .time-header { font-size:9px; line-height:1.2; }
    .time-header.bed { font-size:7px; padding:0; line-height:1.2; }
    .time-subheader { font-size:7px; font-weight:normal; display:block; }
    .medicine-header { display:flex; align-items:center; justify-content:start; background-color:white; height:35px; }
    .medicine-header img { max-height:28px; max-width:100%; object-fit:contain; }
    .medicine-input { width:100%; border:none; outline:none; background:transparent; font-family:Arial,Helvetica,sans-serif; font-size:10px; padding:1px 2px; height:24px; line-height:1.2; }
    .qty-input { width:100%; border:none; outline:none; background:transparent; text-align:center; font-family:Arial,Helvetica,sans-serif; font-size:10px; padding:1px 2px; height:24px; line-height:1.2; }
    .checkbox-container { display:flex; justify-content:center; align-items:center; height:100%; }
    .checkbox-container input[type="checkbox"] { width:12px; height:12px; margin:0; }
    .notes-row td { padding:1px 2px !important; font-size:8px; text-align:left; }
    .notes-input { width:100%; border:none; outline:none; background:transparent; font-family:Arial,Helvetica,sans-serif; font-size:8px; padding:1px 2px; resize:none; height:18px; line-height:1.1; overflow:hidden; }
    .medicine-notes { text-align:left; }
    .time-notes { text-align:center; font-size:7px; }
    .footer-section { flex:0 0 auto; min-height:50px; display:flex; flex-direction:column; justify-content:flex-end; margin-top:auto; padding-top:10px; }
    .follow-up-section { margin-bottom:8px; padding-top:5px; }
    .follow-up-label { font-weight:bold; margin-right:8px; font-size:11px; }
    .follow-up-input { border:none; border-bottom:1px solid #000; min-width:100px; background:transparent; outline:none; font-family:Arial,Helvetica,sans-serif; font-size:11px; padding:0 2px; }
    .signature-section { display:flex; justify-content:space-between; align-items:flex-end; }
    .left-sig { text-align:center; font-size:10px; padding:10px; }
    .right-sig { text-align:center; font-size:10px; line-height:1.7; padding:10px; }
    .doctor-name { font-weight:bold; margin-bottom:0; margin-top:5px; }
    .footer { flex:0 0 7%; padding:5px; text-align:center; overflow:hidden; background-color:#c9b06c; box-sizing:border-box; display:flex; flex-direction:column; justify-content:center; align-items:center; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .footer p { font-size:12px; margin:2px; color:white; font-family:Arial,Helvetica,sans-serif; }
    .action-buttons { position:fixed; top:10px; right:10px; z-index:1000; display:flex; gap:10px; }
    .btn { padding:10px 20px; font-size:14px; cursor:pointer; color:white; border:none; border-radius:4px; box-shadow:0 2px 5px rgba(0,0,0,0.2); transition:background-color 0.3s; }
    #printButton { background-color:#4caf50; }
    #printButton:hover { background-color:#45a049; }
    #addRowButton { background-color:#ff9800; }
    #addRowButton:hover { background-color:#e68900; }
    #saveCloseButton { background-color:#2196f3; }
    #saveCloseButton:hover { background-color:#0b7dda; }
    @media print {
      body { background:white; margin:0; padding:0; display:block; }
      .action-buttons,#addRowButton { display:none !important; }
      .a5-page { width:148mm; height:210mm; box-shadow:none; border:none; margin:0; page-break-after:always; page-break-inside:avoid; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .a5-page:last-child { page-break-after:auto; }
      @page { size:A5 portrait; margin:0; }
      .header { border-bottom:2px solid #000 !important; }
      .footer { background-color:#c9b06c !important; }
      .prescription-table th { background-color:#f5f5f5 !important; }
      .underline,.follow-up-input { border-bottom:1px solid #000 !important; background:transparent !important; }
      .medicine-input,.qty-input,.notes-input { border:none !important; background:transparent !important; }
    }
  </style>
</head>
<body>
  <div class="action-buttons">
    <button id="addRowButton" class="btn">➕ Add Row</button>
    <button id="printButton" class="btn" onclick="window.print()">🖨️ Print</button>
    <button id="saveCloseButton" class="btn">💾 Save and Close</button>
  </div>
  <div id="pages-container"></div>

  <script>
    let allRows = ${initialRowsJSON};
    const maxRowsPerPage = 5;

    // Ensure IDs are correct after load
    allRows = allRows.map((r, i) => ({ ...r, id: i + 1, rowNumber: i + 1 }));

    function createPage(pageNumber, isFirst) {
      return \`
        <div class="a5-page" id="page-\${pageNumber}">
          <div class="header">
            <div class="header-logo"><img src="image.png" alt="Logo" /></div>
            <div class="header-info">
              <div class="header-doctor-name">Irish Jasmine P. Dizon, MD, FPSO - HNS</div>
              <div class="header-credentials">Fellow, Philippine Society of Otolaryngology, Head and Neck Surgery</div>
              <div class="header-credentials">Fellow, Philippine Federation of Cosmetic Surgeons Inc.</div>
              <div class="header-schedule">Monday to Friday 5PM-8PM | Saturday 9AM-2PM | Sunday 9AM-12NN</div>
            </div>
          </div>
          <div class="content">
            <div class="patient-info-section">
              <div class="patient-info">
                <div class="info-field">
                  <span class="field-label">Name:</span>
                  <input type="text" class="underline \${isFirst ? 'patient-name-input' : ''}"
                         value="\${isFirst ? '${prefill.name.replace(/'/g, "\\'").replace(/"/g, "&quot;")}' : ''}"
                         \${!isFirst ? 'readonly tabindex="-1"' : ''} />
                </div>
                <div class="info-field">
                  <span class="field-label">Age:</span>
                  <input type="text" class="underline \${isFirst ? 'patient-age-input' : ''}"
                         value="\${isFirst ? '${prefill.age}' : ''}"
                         \${!isFirst ? 'readonly tabindex="-1"' : ''} />
                </div>
                <div class="info-field">
                  <span class="field-label">Sex:</span>
                  <input type="text" class="underline \${isFirst ? 'patient-sex-input' : ''}"
                         value="\${isFirst ? '${prefill.sex.replace(/'/g, "\\'").replace(/"/g, "&quot;")}' : ''}"
                         \${!isFirst ? 'readonly tabindex="-1"' : ''} />
                </div>
              </div>
              <div class="info-row-2">
                <div class="info-field">
                  <span class="field-label">Address:</span>
                  <input type="text" class="underline \${isFirst ? 'patient-addr-input' : ''}"
                         value="\${isFirst ? '${prefill.address.replace(/'/g, "\\'").replace(/"/g, "&quot;")}' : ''}"
                         \${!isFirst ? 'readonly tabindex="-1"' : ''} />
                </div>
                <div class="info-field">
                  <span class="field-label">Date:</span>
                  <input type="text" class="underline \${isFirst ? 'patient-date-input' : ''}"
                         value="\${isFirst ? '${prefill.date.replace(/'/g, "\\'").replace(/"/g, "&quot;")}' : ''}"
                         \${!isFirst ? 'readonly tabindex="-1"' : ''} />
                </div>
              </div>
            </div>
            <div class="prescription-section">
              <div class="prescription-title">PRESCRIPTION</div>
              <table class="prescription-table">
                <thead>
                  <tr>
                    <th class="row-number">#</th>
                    <th class="medicine-column">
                      <div class="medicine-header"><img src="1.png" alt="Logo" /></div>
                    </th>
                    <th class="qty-column">Qty</th>
                    <th colspan="2" class="time-header">Breakfast<span class="time-subheader">Before/After</span></th>
                    <th colspan="2" class="time-header">Lunch<span class="time-subheader">Before/After</span></th>
                    <th colspan="2" class="time-header">Dinner<span class="time-subheader">Before/After</span></th>
                    <th class="time-header bed">Bedtime<span class="time-subheader">Before</span></th>
                  </tr>
                </thead>
                <tbody id="table-body-\${pageNumber}"></tbody>
              </table>
            </div>
            <div class="footer-section">
              <div class="signature-section">
                <div class="left-sig">
                  <span class="follow-up-label">Follow-up Date:</span>
                  <input type="text" class="follow-up-input" value="${prefill.followUpDate.replace(/"/g, "&quot;")}" />
                </div>
                <div class="right-sig">
                  <div class="doctor-name">Dr. Irish Dizon M.D</div>
                  License No: MED-000123
                </div>
              </div>
            </div>
          </div>
          <div class="footer">
            <p>Unit K. No. 8 A. Mabini St. Brgy. Kapasigan, Pasig City | 0927 411 6708 |</p>
            <p>preclarodizonclinic@gmail.com</p>
          </div>
        </div>
      \`;
    }

    function createRowHtml(row) {
      const esc = (v) => String(v || "").replace(/"/g, "&quot;");
      return \`
        <tr>
          <td class="row-number">\${row.rowNumber}</td>
          <td class="medicine-column">
            <input type="text" class="medicine-input" value="\${esc(row.medicine)}"
                   onchange="updateRowData(\${row.id}, 'medicine', this.value)" />
          </td>
          <td class="qty-column">
            <input type="text" class="qty-input" value="\${esc(row.qty)}"
                   onchange="updateRowData(\${row.id}, 'qty', this.value)" />
          </td>
          <td class="time-column"><div class="checkbox-container">
            <input type="checkbox" \${row.breakfastBefore ? "checked" : ""}
                   onchange="updateRowData(\${row.id}, 'breakfastBefore', this.checked)" />
          </div></td>
          <td class="time-column"><div class="checkbox-container">
            <input type="checkbox" \${row.breakfastAfter ? "checked" : ""}
                   onchange="updateRowData(\${row.id}, 'breakfastAfter', this.checked)" />
          </div></td>
          <td class="time-column"><div class="checkbox-container">
            <input type="checkbox" \${row.lunchBefore ? "checked" : ""}
                   onchange="updateRowData(\${row.id}, 'lunchBefore', this.checked)" />
          </div></td>
          <td class="time-column"><div class="checkbox-container">
            <input type="checkbox" \${row.lunchAfter ? "checked" : ""}
                   onchange="updateRowData(\${row.id}, 'lunchAfter', this.checked)" />
          </div></td>
          <td class="time-column"><div class="checkbox-container">
            <input type="checkbox" \${row.dinnerBefore ? "checked" : ""}
                   onchange="updateRowData(\${row.id}, 'dinnerBefore', this.checked)" />
          </div></td>
          <td class="time-column"><div class="checkbox-container">
            <input type="checkbox" \${row.dinnerAfter ? "checked" : ""}
                   onchange="updateRowData(\${row.id}, 'dinnerAfter', this.checked)" />
          </div></td>
          <td class="time-column"><div class="checkbox-container">
            <input type="checkbox" \${row.bedtime ? "checked" : ""}
                   onchange="updateRowData(\${row.id}, 'bedtime', this.checked)" />
          </div></td>
        </tr>
        <tr class="notes-row">
          <td></td>
          <td colspan="2" class="medicine-notes">
            <textarea class="notes-input" rows="1" placeholder="Medicine notes..."
                      onchange="updateRowData(\${row.id}, 'medicineNotes', this.value)">\${esc(row.medicineNotes)}</textarea>
          </td>
          <td colspan="7" class="time-notes">
            <textarea class="notes-input" rows="1" placeholder="Dosage timing notes..."
                      onchange="updateRowData(\${row.id}, 'timeNotes', this.value)">\${esc(row.timeNotes)}</textarea>
          </td>
        </tr>
      \`;
    }

    function updateRowData(rowId, field, value) {
      const row = allRows.find((r) => r.id === rowId);
      if (row) row[field] = value;
    }

    function renderPages() {
      const container = document.getElementById("pages-container");
      container.innerHTML = "";
      const totalPages = Math.ceil(allRows.length / maxRowsPerPage);
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const startIndex = (pageNum - 1) * maxRowsPerPage;
        const pageRows = allRows.slice(startIndex, startIndex + maxRowsPerPage);
        pageRows.forEach((row, idx) => { row.rowNumber = startIndex + idx + 1; });
        container.insertAdjacentHTML("beforeend", createPage(pageNum, pageNum === 1));
        const tbody = document.getElementById(\`table-body-\${pageNum}\`);
        pageRows.forEach((row) => {
          tbody.insertAdjacentHTML("beforeend", createRowHtml(row));
        });
      }
    }

    function addNewRow() {
      const newId = allRows.length > 0 ? Math.max(...allRows.map((r) => r.id)) + 1 : 1;
      allRows.push({
        id: newId, rowNumber: allRows.length + 1,
        medicine: "", qty: "",
        breakfastBefore: false, breakfastAfter: false,
        lunchBefore: false, lunchAfter: false,
        dinnerBefore: false, dinnerAfter: false,
        bedtime: false, medicineNotes: "", timeNotes: "",
      });
      renderPages();
    }

    document.addEventListener("DOMContentLoaded", function () {
      renderPages();
    });
  </script>
</body>
</html>`;
}

// ==================== INIT ====================

// FIX: Single DOMContentLoaded that wires up the cert modal button
// and kicks off the initial data load — nothing runs before DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  updateSortIcons();
  fetchPatients();

  // ---- Save edited patient ----
  document
    .getElementById("savePatientBtn")
    .addEventListener("click", async () => {
      if (currentEditIndex === null) return;

      const height =
        parseFloat(document.getElementById("editHeight").value) || null;
      const weight =
        parseFloat(document.getElementById("editWeight").value) || null;
      const allergiesText = document
        .getElementById("editAllergies")
        .value.trim();
      const illnessesText = document
        .getElementById("editIllnesses")
        .value.trim();
      const surgeryText = document.getElementById("editSurgery").value.trim();

      const patientData = {
        name: document.getElementById("editName").value,
        phone: document.getElementById("editPhone").value,
        email: document.getElementById("editEmail").value || null,
        birth: document.getElementById("editBirthdate").value || null,
        address: document.getElementById("editAddress").value || null,
        gender: document.getElementById("editGender").value || null,
        blood_type: document.getElementById("editBlood").value || null,
        allergies: allergiesText
          ? allergiesText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        past_illnesses: illnessesText
          ? illnessesText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        surgery_history: surgeryText
          ? surgeryText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        chief_complaint: document.getElementById("editComplaint").value || null,
        bp: document.getElementById("editBP").value || null,
        hr: parseInt(document.getElementById("editHR").value) || null,
        rr: parseInt(document.getElementById("editRR").value) || null,
        temperature:
          parseFloat(document.getElementById("editTemp").value) || null,
        height,
        weight,
        bmi: calculateBMI(height, weight) || null,
        physical_exam: document.getElementById("editExam").value || null,
        follow_up_date: document.getElementById("editFollow").value || null,
      };

      const success = await updatePatient(currentEditIndex, patientData);
      if (success) {
        bootstrap.Modal.getInstance(
          document.getElementById("viewModal"),
        ).hide();
      }
    });

  // ---- Add new patient ----
  document
    .getElementById("addPatientBtn")
    .addEventListener("click", async () => {
      const height =
        parseFloat(document.getElementById("newHeight").value) || null;
      const weight =
        parseFloat(document.getElementById("newWeight").value) || null;
      const allergiesText = document
        .getElementById("newAllergies")
        .value.trim();
      const illnessesText = document
        .getElementById("newIllnesses")
        .value.trim();
      const surgeryText = document.getElementById("newSurgery").value.trim();

      const newPatient = {
        name: document.getElementById("newName").value,
        phone: document.getElementById("newPhone").value,
        email: document.getElementById("newEmail").value || null,
        birth: document.getElementById("newBirthdate").value || null,
        gender: document.getElementById("newGender").value || null,
        blood_type: document.getElementById("newBlood").value || null,
        allergies: allergiesText
          ? allergiesText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        past_illnesses: illnessesText
          ? illnessesText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        surgery_history: surgeryText
          ? surgeryText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
        bp: document.getElementById("newBP").value || null,
        hr: parseInt(document.getElementById("newHR").value) || null,
        rr: parseInt(document.getElementById("newRR").value) || null,
        temperature:
          parseFloat(document.getElementById("newTemp").value) || null,
        height,
        weight,
        bmi: calculateBMI(height, weight) || null,
        physical_exam: document.getElementById("newExam").value || null,
      };

      if (!newPatient.name || !newPatient.phone) {
        alert("Name and Phone are required fields");
        return;
      }

      const success = await createPatient(newPatient);
      if (success) {
        bootstrap.Modal.getInstance(
          document.getElementById("createModal"),
        ).hide();
        document
          .getElementById("createModal")
          .querySelectorAll("input, textarea, select")
          .forEach((el) => {
            if (el.id !== "newBMI") el.value = "";
          });
      }
    });

  // ---- BMI auto-calc for new patient form ----
  document.getElementById("newHeight").addEventListener("input", () => {
    document.getElementById("newBMI").value = calculateBMI(
      parseFloat(document.getElementById("newHeight").value) || 0,
      parseFloat(document.getElementById("newWeight").value) || 0,
    );
  });
  document.getElementById("newWeight").addEventListener("input", () => {
    document.getElementById("newBMI").value = calculateBMI(
      parseFloat(document.getElementById("newHeight").value) || 0,
      parseFloat(document.getElementById("newWeight").value) || 0,
    );
  });

  // ---- Filter listeners ----
  document.getElementById("searchName").addEventListener("input", applyFilters);
  [
    "filterCreated",
    "filterCreatedEnd",
    "filterFollowUp",
    "filterFollowUpEnd",
  ].forEach((id) => {
    document.getElementById(id).addEventListener("change", applyFilters);
  });
  document.getElementById("clearFilters").addEventListener("click", () => {
    document.getElementById("searchName").value = "";
    document.getElementById("filterCreated").value = "";
    document.getElementById("filterCreatedEnd").value = "";
    document.getElementById("filterFollowUp").value = "";
    document.getElementById("filterFollowUpEnd").value = "";
    filters = {
      search: "",
      created_from: "",
      created_to: "",
      follow_up_from: "",
      follow_up_to: "",
    };
    currentPage = 1;
    fetchPatients();
  });

  // ---- Certificate modal — wire up New Certificate button ----
  const certModalEl = document.getElementById("certModal");
  if (certModalEl) {
    certModalEl.addEventListener("shown.bs.modal", () => {
      const createBtn = document.getElementById("createNewCertBtn");
      if (createBtn) {
        createBtn.onclick = () =>
          openCertificateWindow(null, currentPatientData);
      }
    });
  }

  // ---- Prescription modal — wire up New Prescription button ----
  const presModalEl = document.getElementById("presModal");
  if (presModalEl) {
    presModalEl.addEventListener("shown.bs.modal", () => {
      const createBtn = document.getElementById("createNewPresBtn");
      if (createBtn) {
        createBtn.onclick = () =>
          openPrescriptionWindow(null, currentPatientData);
      }
    });
  }
});
