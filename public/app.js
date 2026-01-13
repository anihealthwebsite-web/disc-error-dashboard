// ==========================================
// EMERGENCY OVERWRITE: ROBUST APP LOGIC
// Version: Production-Critical-v3
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

// --- 2. INITIALIZATION (Immediate & Robust) ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 App Initializing... v3");

    // A. status UI Force
    const welcomeMsg = document.getElementById('welcome-msg');
    const statusIndicator = document.querySelector('.status-indicator');
    if (welcomeMsg) welcomeMsg.textContent = "System Status: Online (Ready)";
    if (statusIndicator) statusIndicator.classList.add('online');

    // B. Initialize Supabase
    try {
        if (!window.supabase) {
            throw new Error("Supabase Library not loaded! Check index.html");
        }

        // Use hardcoded keys for guaranteed access in this vanilla setup
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✅ Supabase Client Ready");
    } catch (err) {
        console.error("Supabase Init Error:", err);
        alert('Critical Error: Supabase library not loaded. Please refresh.');
        return;
    }

    // C. Render Lists Immediately
    renderAnomalies();
    startClock();

    // D. Setup Event Listeners
    setupEvents();

    // E. Start Polling Worklist (5s)
    loadWorklist(); // Initial load
    setInterval(loadWorklist, 5000);
});

// --- 3. UI RENDERING ---
function renderAnomalies() {
    const container = document.getElementById('anomaly-checkboxes');
    if (!container) return;

    container.innerHTML = '';
    ANOMALY_OPTIONS.forEach((text, index) => {
        const id = index + 1;
        let labelText = id <= 8 ? `Disk anomaly ${id}: ${text}` : text;

        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.style.marginBottom = "5px";
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

function setupEvents() {
    // File Input - Simple & Crash Proof
    const fileInput = document.getElementById('disc-photo');
    if (fileInput) {
        // Clone to clear old listeners
        const newHelper = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newHelper, fileInput);

        newHelper.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Safe Preview using Blob URL
            currentFile = file;
            const fileLabel = document.getElementById('file-label');
            if (fileLabel) fileLabel.textContent = file.name;

            const preview = document.getElementById('image-preview');
            if (preview) {
                const url = URL.createObjectURL(file);
                preview.innerHTML = `<img src="${url}" style="max-height: 100px; margin-top: 10px; border-radius: 4px;">`;
                preview.classList.remove('hidden');
            }
        });
    }

    // Submit Handler
    const form = document.getElementById('report-form');
    if (form) {
        form.onsubmit = (e) => handleReportSubmit(e); // Override default
    }

    // Refresh Button (if exists) or Export
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.addEventListener('click', () => alert("Export feature pending update"));
}

// --- 4. CORE FUNCTIONS (Local & Explicit) ---

async function uploadImage(file) {
    if (!supabase) throw new Error("Supabase disconnected");

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
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

async function createReport(dataPayload) {
    if (!supabase) throw new Error("Supabase disconnected");

    // Insert into 'report' table as requested
    const { data, error } = await supabase
        .from('report') // Singular 'report'
        .insert([dataPayload])
        .select()
        .single();

    if (error) throw error;
    return data;
}

async function handleReportSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = "Sending...";
    btn.disabled = true;

    try {
        // Collect Data
        const clinicName = document.getElementById('clinic-name').value;
        const staffName = document.getElementById('sales-person').value; // Using existing input ID
        const discType = document.getElementById('disc-type').value;
        const lotNumber = document.getElementById('lot-number').value;
        const expiryDate = document.getElementById('disc-expiry').value;
        const errorDate = document.getElementById('error-date').value;
        const reportDate = document.getElementById('report-date').value;

        // Anomaly Collection
        const abnormalities = Array.from(document.querySelectorAll('input[name="anomalies"]:checked'))
            .map(cb => cb.value); // Already contains full text from checkbox value

        if (!clinicName || !discType || abnormalities.length === 0) {
            alert("Please fill in Clinic, Disc Type, and at least one Anomaly.");
            throw new Error("Validation Failed");
        }

        // Upload Image
        let imageUrl = null;
        if (currentFile) {
            imageUrl = await uploadImage(currentFile);
        }

        // Payload (New Schema)
        const payload = {
            clinic_name: clinicName,
            staff_name: staffName,
            disc_type: discType,
            lot_number: lotNumber,
            expiry_date: expiryDate,
            error_date: errorDate,
            report_date: reportDate,
            abnormalities: abnormalities, // Array of strings
            image_url: imageUrl,
            status: 'Pending'
        };

        await createReport(payload);

        // Success
        alert("Success! Report Submitted.");
        e.target.reset();
        currentFile = null;
        const preview = document.getElementById('image-preview');
        if (preview) {
            preview.innerHTML = '';
            preview.classList.add('hidden');
        }
        document.getElementById('file-label').textContent = "Choose File...";
        // Reset Date
        document.getElementById('report-date').valueAsDate = new Date();

        loadWorklist(); // Immediate Refresh

    } catch (err) {
        console.error(err);
        if (err.message !== "Validation Failed") {
            alert(`Error: ${err.message || JSON.stringify(err)}`);
        }
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// --- 5. WORKLIST POLLING ---
async function loadWorklist() {
    if (!supabase) return;

    // Fetch from 'report' table
    const { data, error } = await supabase
        .from('report')
        .select('*')
        .order('created_at', { ascending: false });

    if (!error && data) {
        renderWorklistUI(data);
    } else if (error) {
        console.error("Worklist Load Error:", error);
    }
}

function renderWorklistUI(data) {
    const list = document.getElementById('report-list');
    const badge = document.getElementById('active-count');
    if (!list) return;

    if (badge) {
        const active = data.filter(d => d.status === 'Pending').length;
        badge.textContent = `${active} Active`;
    }

    if (data.length === 0) {
        list.innerHTML = '<div class="empty-state">No reports found</div>';
        return;
    }

    list.innerHTML = data.map(item => `
        <div class="report-card">
            <div class="report-header">
                <strong>${item.clinic_name || 'Unknown Clinic'}</strong>
                <span>${item.report_date}</span>
            </div>
            <div>${item.disc_type}</div>
            <div style="font-size: 0.8em; color: gray;">
                ${(item.abnormalities || []).join(', ')}
            </div>
            ${item.image_url ? `<a href="${item.image_url}" target="_blank">View Image</a>` : ''}
            <div style="margin-top: 5px; font-weight: bold; color: ${item.status === 'Completed' ? 'green' : 'orange'}">
                ${item.status}
            </div>
        </div>
    `).join('');
}
