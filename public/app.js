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
    'Insufficient Sample/Coagulation',
    'Disk Error',
    'Error',
    'Others'
];

let _supabase = null;
let currentFile = null;
let currentUser = null;
let cachedClinics = {};

// --- 3. INITIALIZATION ---

// Using 'load' instead of 'DOMContentLoaded' to ensure all external scripts (Supabase) are fully ready
window.addEventListener('load', async () => {
    console.log("🚀 App Initializing... v8-Auth (Window Load)");

    // A. Initialize Supabase (First Priority)
    try {
        if (!window.supabase) {
            console.error("❌ Supabase SDK NOT found on window.load");
            throw new Error("Supabase SDK missing");
        }
        _supabase = window.supabase.createClient(APP_SUPABASE_URL, APP_SUPABASE_ANON_KEY);
        console.log("✅ Supabase Connected (Safe Mode)");
    } catch (err) {
        console.error("Init Error:", err);
        alert("System Error: Database connection failed. Please refresh.");
        return;
    }

    // B. Check Session (Now safe to load data)
    checkSession();

    // C. Setup Listeners
    setupAuthListeners();
    setupAppListeners();

    // D. Load Clinic List
    loadClinics();
});

// --- 4. AUTHENTICATION LOGIC ---

// ========================================
// CLINICS LOADER
// ========================================

/**
 * Fetch clinic list from Supabase and populate the clinic datalists.
 * Setup input listeners for auto-filling serial number.
 */
async function loadClinics() {
    const list1 = document.getElementById('clinic-list');
    const list2 = document.getElementById('edit-clinic-list');
    if (!list1) return;

    try {
        const { data, error } = await _supabase
            .from('clinics')
            .select('clinic_name, machine_serial')
            .order('clinic_name', { ascending: true });

        if (error) throw error;
        
        cachedClinics = {};
        list1.innerHTML = '';
        if (list2) list2.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(clinic => {
                cachedClinics[clinic.clinic_name] = clinic.machine_serial;
                
                const opt1 = document.createElement('option');
                opt1.value = clinic.clinic_name;
                list1.appendChild(opt1);

                if (list2) {
                    const opt2 = document.createElement('option');
                    opt2.value = clinic.clinic_name;
                    list2.appendChild(opt2);
                }
            });
        }

        // Attach input listeners for auto-filling serials
        const attachAutoFill = (inputId, serialId) => {
            const input = document.getElementById(inputId);
            if (input) {
                // Use input event so it fills as soon as they select or type a match
                input.addEventListener('input', (e) => {
                    const val = e.target.value.trim();
                    const serialInput = document.getElementById(serialId);
                    if (serialInput && cachedClinics[val]) {
                        serialInput.value = cachedClinics[val];
                    }
                });
            }
        };

        attachAutoFill('clinic-name', 'machine-serial');
        attachAutoFill('edit-clinic', 'edit-machine-serial');

    } catch (err) {
        console.error('Failed to load clinics:', err);
    }
}

/**
 * Auto-saves a clinic if it is new or if its serial number was updated.
 */
async function saveClinicIfNeeded(clinicName, machineSerial) {
    if (!clinicName || !machineSerial) return;
    
    // Only save if it's not in cache or if the serial has changed
    if (!cachedClinics[clinicName] || cachedClinics[clinicName] !== machineSerial) {
        try {
            const { error } = await _supabase
                .from('clinics')
                .upsert([{ clinic_name: clinicName, machine_serial: machineSerial }], { onConflict: 'clinic_name' });
            
            if (!error) {
                // Update local cache and datalists to instantly reflect it
                if (!cachedClinics[clinicName]) {
                    const dl1 = document.getElementById('clinic-list');
                    if (dl1) {
                        const opt = document.createElement('option');
                        opt.value = clinicName;
                        dl1.appendChild(opt);
                    }
                    const dl2 = document.getElementById('edit-clinic-list');
                    if (dl2) {
                        const opt = document.createElement('option');
                        opt.value = clinicName;
                        dl2.appendChild(opt);
                    }
                }
                cachedClinics[clinicName] = machineSerial;
                console.log("Clinic auto-saved to database.");
            } else {
                console.warn("Failed to auto-save clinic to database:", error.message);
            }
        } catch (err) {
            console.error("Error auto-saving clinic:", err);
        }
    }
}



function checkSession() {
    try {
        const sessionUser = localStorage.getItem('bio_user');
        const sessionRole = localStorage.getItem('bio_role');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

        console.log("Checking Session:", { sessionUser, sessionRole, isLoggedIn });

        // Check legacy or new keys
        if (sessionUser && (sessionRole || isLoggedIn)) {
            console.log("Session Valid. Restoring User:", sessionUser);
            currentUser = { username: sessionUser, role: sessionRole || 'User' };
            showDashboard();
        } else {
            console.log("No valid session. Showing Login.");
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
        // Force layout recalculation to prevent display issues
        setTimeout(() => {
            dashboard.style.opacity = '1';
        }, 10);
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
        if (fullText === 'Others') {
            container.innerHTML += `
                <div class="checkbox-item" style="margin-bottom: 5px;">
                    <input type="checkbox" id="${id}" value="Others" name="anomalies">
                    <label for="${id}" style="margin-left: 8px; color: #fff;">Others</label>
                </div>
                <input type="text" id="anomaly-others-text" placeholder="Please specify the problem" style="margin-top: 10px; display: none;">
            `;
        } else {
            container.innerHTML += `
                <div class="checkbox-item" style="margin-bottom: 5px;">
                    <input type="checkbox" id="${id}" value="${fullText}" name="anomalies">
                    <label for="${id}" style="margin-left: 8px; color: #fff;">${fullText}</label>
                </div>
            `;
        }
    });

    const cb = document.querySelector('input[value="Others"][name="anomalies"]');
    const txt = document.getElementById('anomaly-others-text');
    if (cb && txt) {
        cb.addEventListener('change', () => {
            if (cb.checked) {
                txt.style.display = 'block';
                txt.required = true;
            } else {
                txt.style.display = 'none';
                txt.required = false;
                txt.value = '';
            }
        });
    }
}

function setupAppListeners() {
    // 1. Image Upload
    const fileInput = document.getElementById('disc-photo');
    if (fileInput) {
        const newHelper = fileInput.cloneNode(true);
        fileInput.parentNode.replaceChild(newHelper, fileInput);
        newHelper.addEventListener('change', handleImageChange);
    }

    // 1b. Immunoassay toggle
    const discTypeSelect = document.getElementById('disc-type');
    if (discTypeSelect) {
        discTypeSelect.addEventListener('change', (e) => {
            const extraInput = document.getElementById('immunoassay-name');
            if (e.target.value === 'Immunoassay') {
                extraInput.style.display = 'block';
                extraInput.required = true;
            } else {
                extraInput.style.display = 'none';
                extraInput.required = false;
                extraInput.value = '';
            }
        });
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
        const files = e.target.files;
        if (!files || files.length === 0) return;

        currentFile = Array.from(files);
        const label = document.getElementById('file-label');
        if (label) label.textContent = currentFile.length === 1 ? currentFile[0].name : `${currentFile.length} files selected`;

        const preview = document.getElementById('image-preview');
        if (preview) {
            preview.innerHTML = '';
            currentFile.forEach(file => {
                if (file.type.startsWith('image/')) {
                    const url = URL.createObjectURL(file);
                    preview.innerHTML += `
                        <div style="margin-top: 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; overflow: hidden; display: inline-block; width: 100px; height: 100px; margin-right: 10px;">
                            <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">
                        </div>`;
                } else {
                    preview.innerHTML += `
                        <div style="margin-top: 10px; padding: 10px; border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; display: inline-block; margin-right: 10px; font-size: 0.8rem;">
                            📄 ${file.name}
                        </div>`;
                }
            });
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
        const machineSerial = document.getElementById('machine-serial').value;
        const claimType = document.getElementById('claim-type').value;
        const productLine = document.getElementById('product-line').value;
        const instrumentModel = document.getElementById('instrument-model').value;
        let discType = document.getElementById('disc-type').value;
        if (discType === 'Immunoassay') {
            const immunoName = document.getElementById('immunoassay-name').value;
            if (immunoName) {
                discType = `Immunoassay - ${immunoName}`;
            }
        }
        const lotNumber = document.getElementById('lot-number').value;
        const expiryDate = document.getElementById('disc-expiry').value;
        const errorDate = document.getElementById('error-date').value;
        const reportDate = document.getElementById('report-date').value;

        let abnormalities = Array.from(document.querySelectorAll('input[name="anomalies"]:checked'))
            .filter(cb => cb.value !== 'Others')
            .map(cb => cb.value);

        const cbOthers = document.querySelector('input[value="Others"][name="anomalies"]');
        const txtOthers = document.getElementById('anomaly-others-text');
        if (cbOthers && cbOthers.checked && txtOthers && txtOthers.value.trim() !== '') {
            abnormalities.push(txtOthers.value.trim());
        }

        if (!clinicName || !discType || abnormalities.length === 0) {
            alert("Missing required fields (Clinic, Disc Type, or Anomalies/Problem description).");
            throw new Error("Validation Failed");
        }

        let imageUrl = null;
        if (currentFile && currentFile.length > 0) {
            imageUrl = await uploadMultipleFiles(currentFile);
        }

        const payload = {
            claim_type: claimType,
            product_line: productLine,
            instrument_model: instrumentModel,
            clinic_name: clinicName,
            machine_serial: machineSerial,
            disc_type: discType,
            lot_number: lotNumber,
            expiry_date: expiryDate,
            error_date: errorDate,
            report_date: reportDate,
            abnormalities: abnormalities,
            staff_name: staffName,
            image_url: imageUrl,
            status: 'Pending'
        };

        const { error } = await _supabase
            .from('report') // Singular
            .insert([payload]);

        if (error) throw error;

        // Auto-save the clinic & serial for future dropdown use
        await saveClinicIfNeeded(clinicName, machineSerial);

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

        // Format Data — columns match the target Excel layout
        const rows = data.map(item => ({
            "Claim Type":             item.claim_type || '',
            "Hospital Name":          item.clinic_name || '',
            "City":                   '',
            "Product Line":           item.product_line || '',
            "Instrument Model":       item.instrument_model || '',
            "Instrument Serial No.":  item.machine_serial || cachedClinics[item.clinic_name] || '',
            "Claim Item":             item.disc_type || '',
            "Reagent LOT":            item.lot_number || '',
            "Claimed Cause":          (item.abnormalities || []).join(", "),
            "Attachment":             '',
            "Claimed Quantity (pcs)": '',
            "Test Date":              item.error_date || '',
            "Sample ID":              '',
            "Abnormal Parameter":     (item.abnormalities || []).join(", "),
            "Salesperson":            item.staff_name || '',
            "Image URL":              item.image_url || ''
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
    if (label) label.textContent = "Choose File(s)...";
    const immunoName = document.getElementById('immunoassay-name');
    if (immunoName) {
        immunoName.value = '';
        immunoName.style.display = 'none';
        immunoName.required = false;
    }

    const cbs = document.querySelectorAll('input[name="anomalies"]:checked');
    cbs.forEach(cb => cb.checked = false);
    
    const txt = document.getElementById('anomaly-others-text');
    if (txt) {
        txt.value = '';
        txt.style.display = 'none';
        txt.required = false;
    }

    const preview = document.getElementById('image-preview');
    if (preview) {
        preview.innerHTML = '';
        preview.classList.add('hidden');
    }
    document.getElementById('report-date').valueAsDate = new Date();
}

// --- 7. BACKEND OPS ---

async function uploadMultipleFiles(files) {
    const urls = [];
    for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.floor(Math.random()*1000)}.${fileExt}`;
        const filePath = `disc-photos/${fileName}`;

        const { error } = await _supabase.storage
            .from('disc-images')
            .upload(filePath, file);

        if (error) throw error;

        const { data } = _supabase.storage
            .from('disc-images')
            .getPublicUrl(filePath);

        urls.push(data.publicUrl);
    }
    return urls.join(',');
}

async function loadWorklist() {
    const list = document.getElementById('report-list');

    if (!_supabase) {
        console.warn("⚠️ Supabase Client NOT ready during loadWorklist call.");
        if (list) list.innerHTML = '<div class="empty-state" style="color:red">Database not connected</div>';
        return;
    }

    // Show Loading
    if (list) {
        list.innerHTML = `
            <div class="empty-state">
                <div style="margin-bottom:10px">⏳</div>
                Loading reports...
            </div>`;
    }

    const { data, error } = await _supabase
        .from('report')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Fetch Error:", error);
        if (list) list.innerHTML = `<div class="empty-state" style="color:red">Error: ${error.message}</div>`;
        return;
    }

    if (data) {
        allReports = data; // Cache for edit
        applyWorklistFilter(); // Filter and render
    }
}

// Expose to window for the onchange attribute in HTML
window.applyWorklistFilter = function () {
    const filterValue = document.querySelector('input[name="wl-filter"]:checked').value;

    // UI Feedback for Toggle
    const lblActive = document.getElementById('lbl-active');
    const lblCompleted = document.getElementById('lbl-completed');

    if (filterValue === 'active') {
        lblActive.style.background = 'rgba(255,255,255,0.2)';
        lblActive.style.fontWeight = '600';
        lblCompleted.style.background = 'transparent';
        lblCompleted.style.fontWeight = '400';
    } else {
        lblActive.style.background = 'transparent';
        lblActive.style.fontWeight = '400';
        lblCompleted.style.background = 'rgba(255,255,255,0.2)';
        lblCompleted.style.fontWeight = '600';
    }

    // Filter Logic
    let filteredData = [];
    if (filterValue === 'active') {
        filteredData = allReports.filter(r => r.status === 'Pending');
    } else {
        filteredData = allReports.filter(r => r.status === 'Completed');
    }

    renderList(filteredData);
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
            ? item.image_url.split(',').map(url => {
                const isDoc = /\.(pdf|doc|docx|txt|csv|xlsx)$/i.test(url);
                if(isDoc) {
                    return `<a href="${url}" target="_blank" style="display:inline-block; margin-top:5px; margin-right:5px; padding:4px 8px; background:rgba(255,255,255,0.1); border-radius:4px; font-size:0.8rem; text-decoration:none; color:#fff;">📄 View Document</a>`;
                } else {
                    return `<div class="report-image-thumb" onclick="window.open('${url}', '_blank')" style="display:inline-block; margin-top:5px; margin-right:5px; width:60px; height:60px; overflow:hidden; border-radius:4px; cursor:pointer;">
                                 <img src="${url}" alt="Evidence" style="width:100%; height:100%; object-fit:cover;">
                               </div>`;
                }
              }).join('')
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
                <span style="font-size:0.8em; opacity:0.8">Serial: ${item.machine_serial || cachedClinics[item.clinic_name] || 'N/A'} | Lot: ${item.lot_number} | Exp: ${item.expiry_date}</span>
            </div>

            <div style="display:flex; flex-wrap:wrap; margin-bottom:10px;">
                ${imageThumb}
            </div>

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
    setVal('edit-machine-serial', editingReport.machine_serial);
    let dt = editingReport.disc_type;
    let immunoName = "";
    if (dt && dt.startsWith('Immunoassay - ')) {
        immunoName = dt.replace('Immunoassay - ', '');
        dt = 'Immunoassay';
    } else if (dt === 'Immunoassay') {
        immunoName = "";
    }
    
    setVal('edit-disc-type', dt);
    
    const editImmunoInput = document.getElementById('edit-immunoassay-name');
    if (dt === 'Immunoassay') {
        editImmunoInput.style.display = 'block';
        editImmunoInput.value = immunoName;
        editImmunoInput.required = true;
    } else {
        editImmunoInput.style.display = 'none';
        editImmunoInput.value = '';
        editImmunoInput.required = false;
    }

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
            
            if (fullText === 'Others') {
                const otherAnomalies = existingAnomalies.filter(a => !ANOMALY_OPTIONS.includes(a) || a === 'Others');
                const hasOthers = otherAnomalies.length > 0;
                const valText = hasOthers ? (otherAnomalies.join(', ') === 'Others' ? '' : otherAnomalies.join(', ')) : '';

                container.innerHTML += `
                    <div class="checkbox-item" style="margin-bottom: 5px;">
                        <input type="checkbox" id="${checkId}" value="Others" name="edit-anomalies" ${hasOthers ? 'checked' : ''}>
                        <label for="${checkId}" style="margin-left: 8px; color: #fff;">Others</label>
                    </div>
                    <input type="text" id="edit-anomaly-others-text" placeholder="Please specify the problem" style="margin-top: 10px; display: ${hasOthers ? 'block' : 'none'};" value="${valText}" ${hasOthers ? 'required' : ''}>
                `;
            } else {
                const isChecked = existingAnomalies.includes(fullText) ? 'checked' : '';
                container.innerHTML += `
                    <div class="checkbox-item" style="margin-bottom: 5px;">
                        <input type="checkbox" id="${checkId}" value="${fullText}" name="edit-anomalies" ${isChecked}>
                        <label for="${checkId}" style="margin-left:8px; color:#fff;">${fullText}</label>
                    </div>
                `;
            }
        });

        const cb = document.querySelector('input[value="Others"][name="edit-anomalies"]');
        const txt = document.getElementById('edit-anomaly-others-text');
        if (cb && txt) {
            cb.addEventListener('change', () => {
                if (cb.checked) {
                    txt.style.display = 'block';
                    txt.required = true;
                } else {
                    txt.style.display = 'none';
                    txt.required = false;
                    txt.value = '';
                }
            });
        }
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
    const editDiscTypeSelect = document.getElementById('edit-disc-type');

    if (editDiscTypeSelect) {
        editDiscTypeSelect.addEventListener('change', (e) => {
            const extraInput = document.getElementById('edit-immunoassay-name');
            if (e.target.value === 'Immunoassay') {
                extraInput.style.display = 'block';
                extraInput.required = true;
            } else {
                extraInput.style.display = 'none';
                extraInput.required = false;
                extraInput.value = '';
            }
        });
    }

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

            let abnormalities = Array.from(document.querySelectorAll('input[name="edit-anomalies"]:checked'))
                .filter(cb => cb.value !== 'Others')
                .map(cb => cb.value);
            
            const editCbOthers = document.querySelector('input[value="Others"][name="edit-anomalies"]');
            const editTxtOthers = document.getElementById('edit-anomaly-others-text');
            if (editCbOthers && editCbOthers.checked && editTxtOthers && editTxtOthers.value.trim() !== '') {
                abnormalities.push(editTxtOthers.value.trim());
            }

            if (abnormalities.length === 0) {
                alert("Please specify the problem under Anomalies.");
                btn.textContent = originalText;
                btn.disabled = false;
                return;
            }

            const payload = {
                clinic_name: document.getElementById('edit-clinic').value,
                staff_name: document.getElementById('edit-staff').value,
                machine_serial: document.getElementById('edit-machine-serial').value,
                disc_type: document.getElementById('edit-disc-type').value === 'Immunoassay' 
                            ? (document.getElementById('edit-immunoassay-name').value ? `Immunoassay - ${document.getElementById('edit-immunoassay-name').value}` : 'Immunoassay')
                            : document.getElementById('edit-disc-type').value,
                lot_number: document.getElementById('edit-lot').value,
                expiry_date: document.getElementById('edit-expiry').value,
                error_date: document.getElementById('edit-error-date').value,
                report_date: document.getElementById('edit-report-date').value,
                // Optional fields: send null if empty
                do_number: getVal('edit-do-number'),
                release_date: getVal('edit-release-date'),
                abnormalities: abnormalities
            };

            console.log("Update Payload:", payload);

            try {
                const { error } = await _supabase.from('report').update(payload).eq('id', editingReport.id);
                if (error) throw error;

                // Auto-save the clinic & serial for future dropdown use
                await saveClinicIfNeeded(payload.clinic_name, payload.machine_serial);

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
