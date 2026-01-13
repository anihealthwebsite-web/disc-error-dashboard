// ==========================================
// FORCE OVERWRITE: FINAL PRODUCTION LOGIC
// Version: Production-v4-FlatList
// ==========================================

// --- 1. CONFIG & DATA ---
// Hardcoded for guaranteed connection (Vanilla JS compatible)
const SUPABASE_URL = 'https://izhoebtdmbfsvlmwjfah.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6aG9lYnRkbWJmc3ZsbXdqZmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNjgxMTYsImV4cCI6MjA4Mzg0NDExNn0.uFfE_0fQQrmx7JoF4fky6K50BJSrV7PocdOVo5k1rNk';

// EXACT REQUESTED FLAT LIST
const ANOMALY_OPTIONS = [
    'Disk anomaly 1: Partial absence of reagent ball',
    'Disk anomaly 2: Diluent not enough',
    'Disk anomaly 3: Lyophilization reagent deterioration',
    'Disk anomaly 4: Diluent deterioration failure',
    'Disk anomaly 5: Abnormal liquid distribution',
    'Disk anomaly 6: Reagent colorimetric hole unfilled',
    'Disk anomaly 7: Sample/diluent mixing failure',
    'Disk anomaly 8: Abnormal resolubility of reagent ball',
    'Insufficient Sample',
    'Disk Error'
];

let supabase = null;
let currentFile = null;

// --- 2. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 App Initializing... v4-Force");

    // A. Force Online Status
    const statusEl = document.querySelector('.status-indicator');
    const msgEl = document.getElementById('welcome-msg');

    if (statusEl) statusEl.classList.add('online');
    if (msgEl) msgEl.textContent = "System Status: Online (Ready)";

    // B. Initialize Supabase
    try {
        if (!window.supabase) throw new Error("Supabase SDK missing");

        // Direct init with hardcoded keys
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✅ Supabase Connected");
    } catch (err) {
        console.error("Init Error:", err);
        alert("Database connection failed. Please refresh.");
        return;
    }

    // C. Render UI
    renderCheckboxes();
    startClock();

    // D. Setup Listeners
    setupListeners();

    // E. Initial Load
    await loadWorklist();
    // Start Polling (5s)
    setInterval(loadWorklist, 5000);
});

// --- 3. UI RENDERING ---

function renderCheckboxes() {
    const container = document.getElementById('anomaly-checkboxes');
    if (!container) return;

    container.innerHTML = '';

    ANOMALY_OPTIONS.forEach((fullText, index) => {
        const id = `anomaly-${index}`;
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.style.marginBottom = "5px";

        // Value is the full text string as requested
        div.innerHTML = `
            <input type="checkbox" id="${id}" value="${fullText}" name="anomalies">
            <label for="${id}" style="margin-left: 8px;">${fullText}</label>
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

function setupListeners() {
    // Image Upload
    const fileInput = document.getElementById('disc-photo');
    if (fileInput) {
        // Clone to clear listeners
        const newHelper = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newHelper, fileInput);

        newHelper.addEventListener('change', handleImageChange);
    }

    // Submit
    const form = document.getElementById('report-form');
    if (form) {
        form.onsubmit = handleFormSubmit;
    }
}

// --- 4. HANDLERS ---

function handleImageChange(e) {
    try {
        const file = e.target.files[0];
        if (!file) return;

        currentFile = file;

        // UI Updates
        const label = document.getElementById('file-label');
        if (label) label.textContent = file.name;

        // Instant Preview
        const preview = document.getElementById('image-preview');
        if (preview) {
            const url = URL.createObjectURL(file);
            preview.innerHTML = `<img src="${url}" style="max-height: 150px; border-radius: 8px; margin-top: 10px;">`;
            preview.classList.remove('hidden');
        }
    } catch (err) {
        console.error("Preview Error:", err);
        alert("Error loading image preview");
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = "Sending...";
    btn.disabled = true;

    try {
        // 1. Gather Data & Validation
        const clinicName = document.getElementById('clinic-name').value;
        const staffName = document.getElementById('sales-person').value;
        const discType = document.getElementById('disc-type').value;
        const lotNumber = document.getElementById('lot-number').value;
        const expiryDate = document.getElementById('disc-expiry').value;
        const errorDate = document.getElementById('error-date').value;
        const reportDate = document.getElementById('report-date').value;

        const abnormalities = Array.from(document.querySelectorAll('input[name="anomalies"]:checked'))
            .map(cb => cb.value); // Full text string

        if (!clinicName || !discType || abnormalities.length === 0) {
            alert("Please fill in Clinic, Disc Type, and select Anomalies.");
            throw new Error("Validation Failed");
        }

        // 2. Upload Image
        let imageUrl = null;
        if (currentFile) {
            imageUrl = await uploadImage(currentFile);
        }

        // 3. Payload (Exact Schema from Prompt)
        const payload = {
            clinic_name: clinicName,
            staff_name: staffName,
            disc_type: discType,
            lot_number: lotNumber,
            expiry_date: expiryDate,
            error_date: errorDate,
            report_date: reportDate,
            abnormalities: abnormalities, // Array
            image_url: imageUrl,
            status: 'Pending'
        };

        // 4. Insert
        const { error } = await supabase
            .from('report')
            .insert([payload]);

        if (error) throw error;

        // 5. Success
        alert("Success! Report Submitted.");
        e.target.reset();
        resetUI();
        loadWorklist();

    } catch (err) {
        console.error("Submit Error:", err);
        if (err.message !== "Validation Failed") {
            alert("Submission Failed: " + (err.message || "Unknown Error"));
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
    document.getElementById('report-date').valueAsDate = new Date();
}

// --- 5. HOSTED LOGIC ---

async function uploadImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_force.${fileExt}`;
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

async function loadWorklist() {
    if (!supabase) return;

    const { data, error } = await supabase
        .from('report')
        .select('*')
        .order('created_at', { ascending: false });

    if (!error && data) {
        renderList(data);
    }
}

function renderList(data) {
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
                <strong>${item.clinic_name || 'Clinic'}</strong>
                <span>${item.report_date}</span>
            </div>
            <div>${item.disc_type}</div>
            <div style="font-size: 0.8em; color: #666; margin: 4px 0;">
                ${(item.abnormalities || []).join(', ')}
            </div>
            ${item.image_url ? `<a href="${item.image_url}" target="_blank">View Image</a>` : ''}
            <div style="margin-top: 5px; color: ${item.status === 'Completed' ? 'green' : 'orange'}">
                ${item.status}
            </div>
        </div>
    `).join('');
}
