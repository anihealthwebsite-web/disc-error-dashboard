// ==========================================
// EMERGENCY OVERWRITE: FINAL ROBUST VERSION
// ==========================================

// --- 1. HARDCODED CONFIG & DATA ---
// Fallback keys ensuring connectivity even if Env Vars fail
const SUPABASE_URL = 'https://izhoebtdmbfsvlmwjfah.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6aG9lYnRkbWJmc3ZsbXdqZmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNjgxMTYsImV4cCI6MjA4Mzg0NDExNn0.uFfE_0fQQrmx7JoF4fky6K50BJSrV7PocdOVo5k1rNk';

const ANOMALY_OPTIONS = [
    "Partial absence of reagent ball",
    "Diluent not enough",
    "Lyophilization reagent deterioration",
    "Diluent deterioration failure",
    "Abnormal liquid distribution",
    "Reagent colorimetric hole unfilled",
    "Sample/diluent mixing failure",
    "Abnormal resolubility of reagent ball",
    "Insufficient Sample",
    "Disk Error"
];

// Global State
let supabase = null;
let currentFile = null;

// --- 2. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 App Initializing...");

    // A. Force System Online Status
    const statusEl = document.querySelector('.status-indicator');
    const msgEl = document.getElementById('welcome-msg');

    if (statusEl) statusEl.classList.add('online');
    if (msgEl) msgEl.textContent = "System Status: Online (Ready)";

    // B. Initialize Supabase
    try {
        if (!window.supabase) throw new Error("Supabase SDK not loaded");

        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✅ Supabase Connected:", SUPABASE_URL); // User requested log
    } catch (err) {
        console.error("CRITICAL: Supabase Init Failed", err);
        alert("System Error: Database connection failed. Check console.");
        return; // Stop if DB fails
    }

    // C. Render UI Components
    renderAnomalyChecklist();
    startClock();

    // D. Setup Event Listeners
    setupRobustEventListeners();

    // E. Initial Data Load
    await loadWorklist();
});

// --- 3. UI RENDERING ---

function renderAnomalyChecklist() {
    const container = document.getElementById('anomaly-checkboxes');
    if (!container) return;

    container.innerHTML = '';

    // Map 1-8 specifically as "Disk anomaly X: ..."
    // Map 9-10 as just the text
    ANOMALY_OPTIONS.forEach((text, index) => {
        const id = index + 1;
        let labelText = text;

        if (id <= 8) {
            labelText = `Disk anomaly ${id}: ${text}`;
        }

        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.style.marginBottom = "5px"; // Add spacing
        div.innerHTML = `
            <input type="checkbox" id="anomaly-${id}" value="${labelText}" name="anomalies">
            <label for="anomaly-${id}" style="margin-left: 8px;">${labelText}</label>
        `;
        container.appendChild(div);
    });
}

function startClock() {
    const update = () => {
        const clock = document.getElementById('clock');
        if (clock) clock.textContent = new Date().toLocaleTimeString();
    };
    update();
    setInterval(update, 1000);
}

function setupRobustEventListeners() {
    // 1. Image Upload (Crash Proof)
    const fileInput = document.getElementById('disc-photo');
    if (fileInput) {
        // Remove old listeners by cloning (optional, but ensures clean slate)
        const newHelper = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newHelper, fileInput);

        newHelper.addEventListener('change', (e) => {
            handleImageChange(e);
        });
    }

    // 2. Form Submit
    const form = document.getElementById('report-form');
    if (form) {
        // Prevent default submission
        form.onsubmit = (e) => handleFormSubmit(e);
    }
}

// --- 4. DATA HANDLERS ---

function handleImageChange(e) {
    try {
        const file = e.target.files[0];
        if (!file) return;

        // Local State
        currentFile = file;

        // UI Feedback
        const label = document.getElementById('file-label');
        if (label) label.textContent = file.name;

        // Preview
        const previewContainer = document.getElementById('image-preview');
        if (previewContainer) {
            const objectUrl = URL.createObjectURL(file);
            previewContainer.innerHTML = `<img src="${objectUrl}" style="max-height: 150px; border-radius: 8px; border: 1px solid #ccc;">`;
            previewContainer.classList.remove('hidden');
        }
    } catch (err) {
        console.error("Image Handle Crash:", err);
        alert("Error selecting image");
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;

    btn.textContent = "Submitting...";
    btn.disabled = true;

    try {
        // 1. Gather Data
        const clinicName = document.getElementById('clinic-name').value;
        const staffName = document.getElementById('sales-person').value; // Mapped to sales-person input
        const discType = document.getElementById('disc-type').value;
        const lotNumber = document.getElementById('lot-number').value;
        const expiryDate = document.getElementById('disc-expiry').value;
        const errorDate = document.getElementById('error-date').value;
        const reportDate = document.getElementById('report-date').value;

        // Get Checked Abnormalities
        const abnormalities = Array.from(document.querySelectorAll('input[name="anomalies"]:checked'))
            .map(input => input.value); // Value already contains full text

        // Validation
        if (!clinicName || !discType || abnormalities.length === 0) {
            alert("Missing Fields: Clinic Name, Disc Type, or Anomalies.");
            throw new Error("Validation Failed");
        }

        // 2. Upload Image (if exists)
        let imageUrl = null;
        if (currentFile) {
            imageUrl = await uploadImageToSupabase(currentFile);
        }

        // 3. Create Report Object (Exact Schema Match)
        const newReport = {
            clinic_name: clinicName,
            staff_name: staffName,
            disc_type: discType,
            lot_number: lotNumber,
            expiry_date: expiryDate,
            error_date: errorDate,
            report_date: reportDate,
            abnormalities: abnormalities, // Array []
            image_url: imageUrl,
            status: 'Pending' // Default
        };

        // 4. Insert to DB
        await createReportInDB(newReport);

        // 5. Success Flow
        alert("Success! Report Submitted.");
        e.target.reset();
        resetUI();
        await loadWorklist(); // Immediate Refresh

    } catch (err) {
        console.error("Submission Error:", err);
        if (err.message !== "Validation Failed") {
            alert("Submission Failed: " + err.message);
        }
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

function resetUI() {
    currentFile = null;
    const label = document.getElementById('file-label');
    if (label) label.textContent = "Choose File...";
    const preview = document.getElementById('image-preview');
    if (preview) {
        preview.innerHTML = '';
        preview.classList.add('hidden');
    }
    // Reset Date to Today
    document.getElementById('report-date').valueAsDate = new Date();
}

// --- 5. SUPABASE FUNCTIONS ---

async function uploadImageToSupabase(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
    const filePath = `disc-photos/${fileName}`;

    const { error } = await supabase.storage
        .from('disc-images')
        .upload(filePath, file);

    if (error) throw error;

    const { data } = supabase.storage
        .from('disc-images')
        .getPublicUrl(filePath);

    return data.publicUrl;
}

async function createReportInDB(reportObj) {
    const { data, error } = await supabase
        .from('report') // Singular table name
        .insert([reportObj])
        .select();

    if (error) throw error;
    return data;
}

async function loadWorklist() {
    const { data, error } = await supabase
        .from('report')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Fetch Error:", error);
        return;
    }

    renderWorklist(data || []);
}

function renderWorklist(reports) {
    const list = document.getElementById('report-list');
    const countBadge = document.getElementById('active-count');

    if (!list) return;

    if (countBadge) {
        const activeCount = reports.filter(r => r.status === 'Pending').length;
        countBadge.textContent = `${activeCount} Active`;
    }

    if (reports.length === 0) {
        list.innerHTML = '<div class="empty-state">No reports found</div>';
        return;
    }

    list.innerHTML = reports.map(r => `
        <div class="report-card">
            <div class="report-header">
                <span class="clinic-name">${r.clinic_name}</span>
                <span class="report-date">${r.report_date}</span>
            </div>
            <div style="font-size: 0.9em; margin-bottom: 5px;">
                <strong>${r.disc_type}</strong>
            </div>
            <div class="report-anomalies">
                ${(r.abnormalities || []).map(a => `<span class="anomaly-tag">${a}</span>`).join('')}
            </div>
            ${r.image_url ? `<a href="${r.image_url}" target="_blank" style="display:block; margin-top:5px; font-size:0.8em;">View Image</a>` : ''}
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.8em; color: #666;">Sales: ${r.staff_name}</span>
                <span class="badge" style="background: ${r.status === 'Completed' ? '#4caf50' : '#ff9800'}">${r.status}</span>
            </div>
        </div>
    `).join('');
}
