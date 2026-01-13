// ==========================================
// FORCE OVERWRITE: VISUAL RESTORATION v6
// ==========================================

// --- 1. CONFIG (Hardcoded for Safety) ---
// Removing process.env checks to prevent vanilla JS crashes
const SUPABASE_URL = 'https://izhoebtdmbfsvlmwjfah.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6aG9lYnRkbWJmc3ZsbXdqZmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNjgxMTYsImV4cCI6MjA4Mzg0NDExNn0.uFfE_0fQQrmx7JoF4fky6K50BJSrV7PocdOVo5k1rNk';

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
    console.log("🚀 App Initializing... v6-Restore");

    // A. Visual Restoration (Clock & Header)
    startClock();
    const statusEl = document.querySelector('.status-indicator');
    const msgEl = document.getElementById('welcome-msg');

    if (statusEl) statusEl.classList.add('online');
    // Match the screenshot text
    if (msgEl) msgEl.textContent = "Welcome, Primary Admin (Admin)";

    // B. Initialize Supabase
    try {
        if (!window.supabase) throw new Error("Supabase SDK missing");
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("✅ Supabase Connected");
    } catch (err) {
        console.error("Init Error:", err);
        // Don't alert immediately to avoid blocking UI if it's just a glitch
    }

    // C. Render Inputs
    renderCheckboxes();

    // D. Setup Listeners
    setupListeners();

    // E. Data Load
    await loadWorklist();
    setInterval(loadWorklist, 5000); // Poll every 5s
});

// --- 3. UI RENDERING ---

function startClock() {
    const update = () => {
        const clock = document.getElementById('clock');
        if (clock) {
            // Match screenshot format: HH:MM:SS
            const now = new Date();
            clock.textContent = now.toLocaleTimeString('en-US', { hour12: false });
        }
    };
    update();
    setInterval(update, 1000);
}

function renderCheckboxes() {
    const container = document.getElementById('anomaly-checkboxes');
    if (!container) return;

    container.innerHTML = '';

    ANOMALY_OPTIONS.forEach((fullText, index) => {
        const id = `anomaly-${index}`;
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.style.marginBottom = "5px"; // Helper spacing

        div.innerHTML = `
            <input type="checkbox" id="${id}" value="${fullText}" name="anomalies">
            <label for="${id}" style="margin-left: 8px; color: #fff;">${fullText}</label>
        `;
        container.appendChild(div);
    });
}

function setupListeners() {
    // 1. Image Upload - Robustness Fix
    const fileInput = document.getElementById('disc-photo');
    if (fileInput) {
        // Remove old listeners
        const newHelper = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newHelper, fileInput);

        newHelper.addEventListener('change', (e) => {
            handleImageChange(e);
        });
    }

    // 2. Submit
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

        // Label
        const label = document.getElementById('file-label');
        if (label) label.textContent = file.name;

        // Preview
        const preview = document.getElementById('image-preview');
        if (preview) {
            const url = URL.createObjectURL(file);
            // Restore visual style from memory/inference
            preview.innerHTML = `
                <div style="margin-top: 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; overflow: hidden;">
                    <img src="${url}" style="width: 100%; display: block; max-height: 200px; object-fit: cover;">
                </div>`;
            preview.classList.remove('hidden');
        }
    } catch (err) {
        console.error("Preview Crash:", err);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.textContent;
    btn.textContent = "Processing...";
    btn.disabled = true;

    try {
        // Collect Data
        const clinicName = document.getElementById('clinic-name').value;
        const staffName = document.getElementById('sales-person').value;
        const discType = document.getElementById('disc-type').value;
        const lotNumber = document.getElementById('lot-number').value;
        const expiryDate = document.getElementById('disc-expiry').value;
        const errorDate = document.getElementById('error-date').value;
        const reportDate = document.getElementById('report-date').value;

        const abnormalities = Array.from(document.querySelectorAll('input[name="anomalies"]:checked'))
            .map(cb => cb.value);

        // Validation
        if (!clinicName || !discType || abnormalities.length === 0) {
            alert("Missing required fields (Clinic, Disc Type, or Anomalies).");
            throw new Error("Validation Failed");
        }

        // Upload Image
        let imageUrl = null;
        if (currentFile) {
            imageUrl = await uploadImage(currentFile);
        }

        // Payload
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

        // Insert
        const { error } = await supabase
            .from('report')
            .insert([payload]);

        if (error) throw error;

        // Success
        alert("Report Submitted Successfully!");
        e.target.reset();
        resetUI();

        // Immediate Fetch
        loadWorklist();

    } catch (err) {
        console.error("Submit Failed:", err);
        if (err.message !== "Validation Failed") {
            alert("Error: " + err.message);
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

// --- 5. BACKEND OPS ---

async function uploadImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_v6.${fileExt}`;
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
        const activeCount = data.filter(d => d.status === 'Pending').length;
        badge.textContent = `${activeCount} Active`;
    }

    if (data.length === 0) {
        list.innerHTML = '<div class="empty-state">No reports found</div>';
        return;
    }

    list.innerHTML = data.map(item => {
        // Parse Anomalies to badges "Anomaly X"
        const anomalyBadges = (item.abnormalities || []).map(text => {
            const match = text.match(/Disk anomaly (\d+)/);
            if (match) {
                return `<span class="anomaly-tag">Anomaly ${match[1]}</span>`;
            }
            // Use full text if not a standard anomaly, but truncate if long?
            return `<span class="anomaly-tag">${text.replace('Disk anomaly ', '')}</span>`;
        }).join('');

        // Restore Thumbnail Visuals
        const imageThumb = item.image_url
            ? `<div class="report-image-thumb" onclick="window.open('${item.image_url}', '_blank')">
                 <img src="${item.image_url}" alt="Evidence">
               </div>`
            : '';

        return `
        <div class="report-card ${item.status === 'Completed' ? 'completed' : ''}">
            <div class="report-header">
                <span class="clinic-name">${item.clinic_name || 'Unknown Clinic'}</span>
                <div style="text-align:right">
                    <div class="report-date">Reported: ${item.report_date}</div>
                    <div class="report-date">Error: ${item.error_date}</div>
                </div>
            </div>
            
            <div style="margin-bottom: 5px; font-weight: 500;">
                ${item.disc_type} <br>
                <span style="font-size:0.8em; opacity:0.8">Lot: ${item.lot_number} | Exp: ${item.expiry_date}</span>
            </div>

            ${imageThumb}

            <div class="report-anomalies">
                ${anomalyBadges}
            </div>

            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; align-items: center;">
                <span class="sales-name">${item.staff_name || ''}</span>
            </div>
        </div>
        `;
    }).join('');
}
