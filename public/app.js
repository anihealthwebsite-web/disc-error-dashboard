// ==========================================
// FORCE OVERWRITE: VISUAL RESTORATION v8 (AUTH)
// ==========================================

// --- 1. CONFIG (Hybrid: Vercel Env + Localhost Fallback) ---
const getEnv = (key, fallback) => {
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return process.env[key];
        }
    } catch (e) { /* ignore ref errors */ }
    return fallback;
};

const APP_SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://izhoebtdmbfsvlmwjfah.supabase.co');
const APP_SUPABASE_ANON_KEY = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6aG9lYnRkbWJmc3ZsbXdqZmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNjgxMTYsImV4cCI6MjA4Mzg0NDExNn0.uFfE_0fQQrmx7JoF4fky6K50BJSrV7PocdOVo5k1rNk');

// --- 2. AUTHENTICATION CONFIG ---
const CREDENTIALS = {
    'Admin': 'adminanihealth123',
    'User': 'useranihealth123'
};

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

let _supabase = null;
let currentFile = null;
let currentUser = null;

// --- 3. INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 App Initializing... v8-Auth");

    // A. Check Session
    checkSession();

    // B. Setup Listeners
    setupAuthListeners();
    setupAppListeners(); // Formerly setupListeners

    // C. Initialize Supabase (Always init for simplicity)
    try {
        if (!window.supabase) throw new Error("Supabase SDK missing");
        _supabase = window.supabase.createClient(APP_SUPABASE_URL, APP_SUPABASE_ANON_KEY);
        console.log("✅ Supabase Connected (Safe Mode)");
    } catch (err) {
        console.error("Init Error:", err);
    }
});

// --- 4. AUTHENTICATION LOGIC ---

// --- 4. AUTHENTICATION LOGIC ---

function checkSession() {
    try {
        const sessionUser = localStorage.getItem('bio_user');
        const sessionRole = localStorage.getItem('bio_role');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

        // Check legacy or new keys
        if (sessionUser && (sessionRole || isLoggedIn)) {
            currentUser = { username: sessionUser, role: sessionRole || 'User' };
            showDashboard();
        } else {
            showLogin();
        }
    } catch (e) {
        console.error("Session check failed", e);
        showLogin();
    }
}

function showLogin() {
    const loginScreen = document.getElementById('login-screen');
    const dashboard = document.getElementById('dashboard-container');

    if (loginScreen) {
        loginScreen.style.display = 'flex'; // Ensure flex for centering
        loginScreen.classList.remove('hidden');
    }
    if (dashboard) {
        dashboard.style.display = 'none';
        dashboard.classList.add('hidden');
    }
}

function showDashboard() {
    const loginScreen = document.getElementById('login-screen');
    const dashboard = document.getElementById('dashboard-container');

    if (loginScreen) {
        loginScreen.style.display = 'none';
        loginScreen.classList.add('hidden');
    }
    if (dashboard) {
        dashboard.style.display = 'block'; // Ensure block
        dashboard.classList.remove('hidden');
    }

    // Update Header
    const msg = document.getElementById('welcome-msg');
    if (msg && currentUser) msg.textContent = `Welcome, ${currentUser.username} (${currentUser.role})`;

    // Load Data
    startClock();
    renderCheckboxes();
    loadWorklist();
}

function handleLogin(e) {
    if (e) e.preventDefault(); // Just in case

    const userIn = document.getElementById('username').value.trim();
    const passIn = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('login-error');

    console.log("Attempting Login:", userIn);

    if (CREDENTIALS[userIn] && CREDENTIALS[userIn] === passIn) {
        console.log("Credentials match");
        // Success
        currentUser = { username: userIn, role: userIn === 'Admin' ? 'Admin' : 'User' };

        localStorage.setItem('bio_user', userIn);
        localStorage.setItem('bio_role', currentUser.role);
        localStorage.setItem('isLoggedIn', 'true');

        if (errorMsg) errorMsg.classList.add('hidden');
        showDashboard();
    } else {
        console.warn("Credentials mismatch");
        if (errorMsg) {
            errorMsg.classList.remove('hidden');
            errorMsg.classList.add('shake');
            setTimeout(() => errorMsg.classList.remove('shake'), 500);
        }
    }
}

function handleLogout() {
    localStorage.clear(); // Wipe everything
    window.location.reload();
}

function setupAuthListeners() {
    // Changed to Button Click to prevent form reload issues
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }

    // Keep Enter key support
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleLogin(e);
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
}

// --- 5. UI RENDERING ---

function startClock() {
    const update = () => {
        const clock = document.getElementById('clock');
        if (clock) {
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
        div.style.marginBottom = "5px";

        div.innerHTML = `
            <input type="checkbox" id="${id}" value="${fullText}" name="anomalies">
            <label for="${id}" style="margin-left: 8px; color: #fff;">${fullText}</label>
        `;
        container.appendChild(div);
    });
}

function setupAppListeners() {
    // 1. Image Upload
    const fileInput = document.getElementById('disc-photo');
    if (fileInput) {
        const newHelper = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newHelper, fileInput);
        newHelper.addEventListener('change', handleImageChange);
    }

    // 2. Submit
    const form = document.getElementById('report-form');
    if (form) {
        form.onsubmit = handleFormSubmit;
    }

    // 3. Export
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', handleExport);
    }
}

// --- 6. HANDLERS ---

function handleImageChange(e) {
    try {
        const file = e.target.files[0];
        if (!file) return;

        currentFile = file;
        const label = document.getElementById('file-label');
        if (label) label.textContent = file.name;

        const preview = document.getElementById('image-preview');
        if (preview) {
            const url = URL.createObjectURL(file);
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
        const clinicName = document.getElementById('clinic-name').value;
        const staffName = document.getElementById('sales-person').value;
        const discType = document.getElementById('disc-type').value;
        const lotNumber = document.getElementById('lot-number').value;
        const expiryDate = document.getElementById('disc-expiry').value;
        const errorDate = document.getElementById('error-date').value;
        const reportDate = document.getElementById('report-date').value;

        const abnormalities = Array.from(document.querySelectorAll('input[name="anomalies"]:checked'))
            .map(cb => cb.value);

        if (!clinicName || !discType || abnormalities.length === 0) {
            alert("Missing required fields (Clinic, Disc Type, or Anomalies).");
            throw new Error("Validation Failed");
        }

        let imageUrl = null;
        if (currentFile) {
            imageUrl = await uploadImage(currentFile);
        }

        const payload = {
            clinic_name: clinicName,
            staff_name: staffName,
            disc_type: discType,
            lot_number: lotNumber,
            expiry_date: expiryDate,
            error_date: errorDate,
            report_date: reportDate,
            abnormalities: abnormalities,
            image_url: imageUrl,
            status: 'Pending'
        };

        const { error } = await _supabase
            .from('report') // Singular
            .insert([payload]);

        if (error) throw error;

        alert("Report Submitted Successfully!");
        e.target.reset();
        resetUI();
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

async function handleExport() {
    const btn = document.getElementById('export-btn');
    const originalText = btn.textContent;
    btn.textContent = "Exporting...";
    btn.disabled = true;

    try {
        const { data, error } = await _supabase
            .from('report')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            alert("No data to export.");
            return;
        }

        // Format Data
        const rows = data.map(item => ({
            "Clinic Name": item.clinic_name,
            "Staff": item.staff_name,
            "Disc Type": item.disc_type,
            "Lot Number": item.lot_number,
            "Expiry Date": item.expiry_date,
            "Error Date": item.error_date,
            "Date Reported": item.report_date,
            "Abnormalities": (item.abnormalities || []).join(", "),
            "Image URL": item.image_url,
            "Status": item.status
        }));

        // Generate Filename: BioChem_Reports_YYYY-MM-DD.csv
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `BioChem_Reports_${dateStr}.csv`;

        // Create Workbook & Download
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reports");
        XLSX.writeFile(wb, filename);

    } catch (err) {
        console.error("Export Failed:", err);
        alert("Failed to export data: " + err.message);
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

// --- 7. BACKEND OPS ---

async function uploadImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_v6.${fileExt}`;
    const filePath = `disc-photos/${fileName}`;

    const { error } = await _supabase.storage
        .from('disc-images')
        .upload(filePath, file);

    if (error) throw error;

    const { data } = _supabase.storage
        .from('disc-images')
        .getPublicUrl(filePath);

    return data.publicUrl;
}

async function loadWorklist() {
    if (!_supabase) return;

    const { data, error } = await _supabase
        .from('report')
        .select('*')
        .order('created_at', { ascending: false });

    if (!error && data) {
        allReports = data; // Cache for edit
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
        const anomalyBadges = (item.abnormalities || []).map(text => {
            const match = text.match(/Disk anomaly (\d+)/);
            if (match) {
                return `<span class="anomaly-tag">Anomaly ${match[1]}</span>`;
            }
            return `<span class="anomaly-tag">${text.replace('Disk anomaly ', '')}</span>`;
        }).join('');

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
                 <div style="display:flex; gap:0.5rem;">
                     ${currentUser && currentUser.role === 'Admin'
                ? `<button class="btn-icon" title="Edit Report" onclick="handleEdit('${item.id}')">✏️</button>`
                : ''}
                     ${item.status !== 'Completed'
                ? `<button class="status-btn" onclick="openCompletionModal('${item.id}')">Mark Complete</button>`
                : `<span class="status-completed" style="font-size:0.8em; font-weight:bold;">Completed</span>`
            }
                 </div>
            </div>

            ${item.status === 'Completed' ? `
            <div class="completion-info">
                <div><strong>DO #:</strong> ${item.do_number || 'N/A'}</div>
                <div><strong>Released:</strong> ${item.release_date ? new Date(item.release_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</div>
            </div>` : ''}
        </div>
        `;
    }).join('');
}

// --- 8. COMPLETION & EDIT FLOW ---
let selectedReportId = null;
let editingReport = null;
let allReports = [];

// Expose to window for inline onclick (backup) or external calls
window.handleEdit = function (id) {
    console.log("Edit requested for ID:", id);
    const item = allReports.find(r => r.id == id);

    if (!item) {
        console.error("Report not found:", id);
        return;
    }

    // Role Verification
    if (!currentUser || currentUser.role !== 'Admin') {
        alert("Unauthorized: Only Admins can edit reports.");
        return;
    }

    // Set State
    editingReport = item;
    console.log("Editing Report State Set:", editingReport);

    // Render/Show Modal
    renderEditModal();
}

function renderEditModal() {
    if (!editingReport) return;

    const modal = document.getElementById('edit-modal');
    if (!modal) {
        console.error("Edit Modal DOM element missing!");
        return;
    }

    // Populate Fields (Sync)
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('edit-clinic', editingReport.clinic_name);
    setVal('edit-staff', editingReport.staff_name);
    setVal('edit-disc-type', editingReport.disc_type);
    setVal('edit-lot', editingReport.lot_number);
    setVal('edit-expiry', editingReport.expiry_date);
    setVal('edit-error-date', editingReport.error_date);
    setVal('edit-report-date', editingReport.report_date);
    setVal('edit-do-number', editingReport.do_number);
    setVal('edit-release-date', editingReport.release_date);

    // Anomalies
    const container = document.getElementById('edit-anomaly-checkboxes');
    if (container) {
        container.innerHTML = '';
        const existingAnomalies = editingReport.abnormalities || [];

        ANOMALY_OPTIONS.forEach((fullText, index) => {
            const checkId = `edit-anomaly-${index}`;
            const isChecked = existingAnomalies.includes(fullText) ? 'checked' : '';
            const div = document.createElement('div');
            div.className = 'checkbox-item';
            div.innerHTML = `
                <input type="checkbox" id="${checkId}" value="${fullText}" name="edit-anomalies" ${isChecked}>
                <label for="${checkId}" style="margin-left:8px; color:#fff;">${fullText}</label>
            `;
            container.appendChild(div);
        });
    }

    // Show Protocol
    modal.classList.remove('hidden');
    modal.style.display = 'flex'; // Force flex
    modal.style.zIndex = '3000'; // High Z-Index
}

window.openCompletionModal = function (id) {
    selectedReportId = id;
    const modal = document.getElementById('completion-modal');
    if (modal) modal.classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    // Edit Modal Listeners
    const cancelEdit = document.getElementById('cancel-edit');
    const editForm = document.getElementById('edit-form');

    // Close Handler
    if (cancelEdit) {
        cancelEdit.addEventListener('click', () => {
            const modal = document.getElementById('edit-modal');
            if (modal) {
                modal.classList.add('hidden');
                modal.style.display = 'none';
            }
            editingReport = null;
        });
    }

    // Update Handler
    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Submitting Update for:", editingReport);

            if (!editingReport) {
                alert("No report selected for editing.");
                return;
            }

            // Role Check again
            if (currentUser.role !== 'Admin') {
                alert("Unauthorized action.");
                return;
            }

            const btn = editForm.querySelector('button[type="submit"]');
            const originalText = btn.textContent;
            btn.textContent = "Saving...";
            btn.disabled = true;

            // Helper: Convert empty strings to null for optional fields
            const getVal = (id) => {
                const val = document.getElementById(id).value;
                return val.trim() === '' ? null : val;
            };

            const payload = {
                clinic_name: document.getElementById('edit-clinic').value,
                staff_name: document.getElementById('edit-staff').value,
                disc_type: document.getElementById('edit-disc-type').value,
                lot_number: document.getElementById('edit-lot').value,
                expiry_date: document.getElementById('edit-expiry').value,
                error_date: document.getElementById('edit-error-date').value,
                report_date: document.getElementById('edit-report-date').value,
                // Optional fields: send null if empty
                do_number: getVal('edit-do-number'),
                release_date: getVal('edit-release-date'),
                abnormalities: Array.from(document.querySelectorAll('input[name="edit-anomalies"]:checked')).map(cb => cb.value)
            };

            console.log("Update Payload:", payload);

            try {
                const { error } = await _supabase.from('report').update(payload).eq('id', editingReport.id);
                if (error) throw error;

                // Success
                const modal = document.getElementById('edit-modal');
                if (modal) {
                    modal.classList.add('hidden');
                    modal.style.display = 'none';
                }
                editingReport = null;

                alert("Report updated successfully!");

                // Clear and reload list to prevent "duplication" ghosts
                document.getElementById('report-list').innerHTML = '<div class="loading">Refreshing...</div>';
                allReports = [];
                await loadWorklist();

            } catch (err) {
                console.error("Update failed:", err);
                alert("Update failed: " + err.message);
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        });
    }

    // Completion Modal Listeners
    const cancelBtn = document.getElementById('cancel-modal');
    const confirmBtn = document.getElementById('confirm-complete');
    const modal = document.getElementById('completion-modal');

    if (cancelBtn && modal) {
        cancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
            selectedReportId = null;
        });
    }

    if (confirmBtn && modal) {
        confirmBtn.addEventListener('click', async () => {
            if (!selectedReportId) return;

            const doNum = document.getElementById('do-number').value;
            const releaseDate = document.getElementById('release-date').value;

            if (!doNum || !releaseDate) {
                alert("Please enter DO Number and Release Date");
                return;
            }

            confirmBtn.textContent = "Updating...";
            confirmBtn.disabled = true;

            try {
                const { error } = await _supabase
                    .from('report')
                    .update({
                        status: 'Completed',
                        do_number: doNum,
                        release_date: releaseDate
                    })
                    .eq('id', selectedReportId);

                if (error) throw error;

                modal.classList.add('hidden');
                document.getElementById('do-number').value = '';
                document.getElementById('release-date').value = '';
                loadWorklist();

            } catch (err) {
                console.error("Update Failed:", err);
                alert("Failed to update status");
            } finally {
                confirmBtn.textContent = "Confirm & Archive";
                confirmBtn.disabled = false;
            }
        });
    }
});
