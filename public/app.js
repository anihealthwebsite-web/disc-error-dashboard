// Data & Config
const anomalyData = {
    "1": "Partial absence of reagent ball",
    "2": "Diluent not enough",
    "3": "Lyophilization reagent deterioration",
    "4": "Diluent deterioration failure",
    "5": "Abnormal liquid distribution",
    "6": "Reagent colorimetric hole unfilled",
    "7": "Sample/diluent mixing failure",
    "8": "Abnormal resolubility of reagent ball",
    "9": "Insufficient Sample",
    "10": "Disk Error"
};

const USERS = {
    'Admin_Primary': { pass: 'admin123', role: 'Admin', name: 'Primary Admin' },
    'User_Standard': { pass: 'user123', role: 'Standard', name: 'Standard User' }
};

// State
let reports = [];
let currentCompletingId = null;
let currentUser = null;
let currentReportImage = null;
let currentReportFile = null;
let realtimeSubscription = null;

// Load data from Supabase database
async function loadReports() {
    try {
        const data = await fetchReports();
        reports = data;
        renderWorklist();
    } catch (error) {
        console.error('Failed to load reports:', error);
        alert('Failed to load reports. Please refresh the page.');
    }
}

// Initialize real-time subscriptions for auto-refresh
function setupRealtimeSubscription() {
    realtimeSubscription = subscribeToReports((payload) => {
        console.log('Real-time update received:', payload.eventType);
        // Reload all reports when any change occurs
        loadReports();
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Test Supabase connection
    const connected = await testConnection();
    if (!connected) {
        alert('Warning: Could not connect to database. Please check your internet connection.');
    }

    // Load session from localStorage
    const savedUser = localStorage.getItem('disc_user_session');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        // Bypass login modal if session exists
        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('welcome-msg').textContent = `Welcome, ${currentUser.name} (${currentUser.role})`;
    } else {
        // Show Login Modal if no session
        document.getElementById('login-modal').classList.remove('hidden');
    }

    initAnomalyCheckboxes();
    setupEventListeners();
    updateClock();

    // Load data from database
    await loadReports();

    // Set up real-time subscriptions for auto-refresh
    setupRealtimeSubscription();
});

function setupEventListeners() {
    setInterval(updateClock, 1000);

    // Login Form
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // File Upload
    document.getElementById('disc-photo').addEventListener('change', handleFileUpload);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (realtimeSubscription) {
            unsubscribeFromReports(realtimeSubscription);
        }
    });

    // Report Submission
    document.getElementById('report-form').addEventListener('submit', handleReportSubmit);

    // Modal
    document.getElementById('cancel-modal').addEventListener('click', closeModal);
    document.getElementById('confirm-complete').addEventListener('click', confirmCompletion);

    // Export Modal
    document.getElementById('export-btn').addEventListener('click', openExportModal);
    document.getElementById('cancel-export').addEventListener('click', closeExportModal);
    document.getElementById('confirm-export').addEventListener('click', handleExport);
}

// --- Auth Functions --- //

async function handleLogin(e) {
    e.preventDefault();
    const userIn = document.getElementById('username').value;
    const passIn = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');
    const loginBtn = e.target.querySelector('button');

    // Show loading state
    loginBtn.disabled = true;
    loginBtn.textContent = 'Verifying...';

    try {
        // Verify with centralized database
        const userData = await verifyUser(userIn, passIn);

        currentUser = userData;

        // Persist session
        localStorage.setItem('disc_user_session', JSON.stringify(currentUser));

        // Update UI
        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('welcome-msg').textContent = `Welcome, ${currentUser.name} (${currentUser.role})`;

        // Clear Form
        e.target.reset();
        errorMsg.classList.add('hidden');

        // Load Data
        renderWorklist();
    } catch (error) {
        errorMsg.textContent = `Login failed: ${error.message}`;
        errorMsg.classList.remove('hidden');
    } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = 'Sign In';
    }
}

function handleLogout() {
    currentUser = null;
    // Clear session
    localStorage.removeItem('disc_user_session');

    document.getElementById('user-info').classList.add('hidden');
    document.getElementById('login-modal').classList.remove('hidden');
}

// --- Report Functions --- //

async function handleReportSubmit(e) {
    e.preventDefault();
    if (!currentUser) return;

    // Collect Data
    const clinic = document.getElementById('clinic-name').value;
    const sales = document.getElementById('sales-person').value;
    const discType = document.getElementById('disc-type').value;
    const lotNumber = document.getElementById('lot-number').value;
    const expiryDate = document.getElementById('disc-expiry').value;
    const errorDate = document.getElementById('error-date').value;
    const reportDate = document.getElementById('report-date').value;

    // Validate Disc Type (Select)
    if (!discType) {
        alert("Please select a Disc Type.");
        return;
    }

    const selectedAnomalies = Array.from(document.querySelectorAll('input[name="anomalies"]:checked'))
        .map(cb => `Anomaly ${cb.value}`);

    if (selectedAnomalies.length === 0) {
        alert("Please select at least one anomaly.");
        return;
    }

    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Uploading...';
    submitBtn.disabled = true;

    try {
        // Upload image to Supabase Storage if one was selected
        let imageUrl = null;
        if (currentReportFile) {
            imageUrl = await uploadImage(currentReportFile);
        }

        // Create report object for database
        const newReport = {
            clinic: clinic,
            sales_person: sales,
            disc_type: discType,
            lot_number: lotNumber,
            expiry_date: expiryDate,
            error_date: errorDate,
            report_date: reportDate,
            anomalies: selectedAnomalies,
            status: 'Pending',
            image_url: imageUrl
        };

        // Save to Supabase database
        await createReport(newReport);

        // Reset form
        e.target.reset();
        document.getElementById('file-label').textContent = "Choose File...";
        document.getElementById('image-preview').classList.add('hidden');
        currentReportImage = null;
        currentReportFile = null;

        // Reset Default Date
        document.getElementById('report-date').valueAsDate = new Date();
        document.getElementById('error-date').value = '';
        document.getElementById('disc-type').value = '';

        // Reports will auto-refresh via real-time subscription
        alert('Report submitted successfully!');
    } catch (error) {
        console.error('Error submitting report:', error);
        alert('Failed to submit report. Please try again.');
    } finally {
        // Restore button state
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function renderWorklist() {
    const listContainer = document.getElementById('report-list');
    const activeCount = document.getElementById('active-count');

    listContainer.innerHTML = '';

    const activeReports = reports.filter(r => r.status === 'Pending');
    activeCount.textContent = `${activeReports.length} Active`;

    if (reports.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No active reports</div>';
        return;
    }

    reports.forEach(report => {
        const card = document.createElement('div');
        card.className = `report-card ${report.status === 'Completed' ? 'completed' : ''}`;

        const anomaliesHtml = report.anomalies.map(a => `<span class="anomaly-tag">${a}</span>`).join('');

        // RBAC Logic for Action Button
        let actionButton = '';
        if (report.status === 'Pending') {
            if (currentUser && currentUser.role === 'Admin') {
                actionButton = `<button class="status-btn" onclick="openCompletionModal(${report.id})">Mark as Done</button>`;
            } else {
                actionButton = `<span class="sales-name">Status: Pending Approval</span>`;
            }
        } else {
            actionButton = `
                <div style="text-align: right;">
                    <span class="status-completed">DO: ${report.do_number || report.doNumber}</span><br>
                    <span class="release-info">Released: ${report.release_date || report.releaseDate}</span><br>
                    <span style="font-size: 0.75rem; color: #94a3b8;">Approved by ${report.approved_by || report.approvedBy}</span>
                </div>`;
        }

        // Expanded Card Info (support both snake_case and camelCase for database fields)
        const clinic = report.clinic || report.clinic_name;
        const discType = report.disc_type || report.discType;
        const lotNumber = report.lot_number || report.lotNumber;
        const expiryDate = report.expiry_date || report.expiryDate;
        const errorDate = report.error_date || report.errorDate;
        const reportDate = report.report_date || report.reportDate;
        const salesPerson = report.sales_person || report.sales;
        const imageUrl = report.image_url || report.image;

        card.innerHTML = `
            <div class="report-header">
                <div>
                    <span class="clinic-name">${clinic}</span><br>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">${discType}</span>
                </div>
                <div style="text-align: right;">
                    <span class="report-date">Reported: ${reportDate}</span><br>
                    <span class="report-date">Error: ${errorDate}</span>
                </div>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                Lot: ${lotNumber} | Exp: ${expiryDate}
            </div>
            ${imageUrl ? `<div class="report-image-thumb"><img src="${imageUrl}" alt="Defect" onclick="window.openWithImage(this.src)"></div>` : ''}
            <div class="report-anomalies">
                ${anomaliesHtml}
            </div>
            <div class="report-footer">
                <span class="sales-name">Sales: ${salesPerson}</span>
                ${actionButton}
            </div>
        `;
        listContainer.appendChild(card);
    });
}


// --- Export Functions --- //

function openExportModal() {
    if (reports.length === 0) {
        alert("No reports to export.");
        return;
    }
    document.getElementById('export-modal').classList.remove('hidden');
}

function closeExportModal() {
    document.getElementById('export-modal').classList.add('hidden');
}

function handleExport() {
    const format = document.querySelector('input[name="export-format"]:checked').value;
    const filter = document.querySelector('input[name="export-filter"]:checked').value;

    // Filter data based on selection
    let dataToExport = reports;
    if (filter === 'completed') {
        dataToExport = reports.filter(r => r.status === 'Completed');
        if (dataToExport.length === 0) {
            alert("No completed records to export.");
            closeExportModal();
            return;
        }
    }

    // Export based on format
    if (format === 'xlsx') {
        exportToExcel(dataToExport);
    } else {
        exportToCSV(dataToExport);
    }

    closeExportModal();
}

function exportToCSV(data) {
    // CSV Header - Exact column order as specified
    const headers = [
        "Clinic Name",
        "Test Item",
        "Date of Test",
        "Abnormality"
    ];

    // CSV Rows - Map to specified columns
    const rows = data.map(r => [
        `"${r.clinic}"`,                           // Column A: Clinic Name
        `"${r.discType}"`,                         // Column B: Test Item (Type of Disc)
        r.errorDate,                                // Column C: Date of Test (Date of Error)
        `"${formatAnomalies(r.anomalies)}"`        // Column D: Abnormality (multi-select)
    ]);

    // Combine
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // Create Download Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Disc_Reports_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function exportToExcel(data) {
    // Prepare data with exact column order
    const exportData = data.map(r => ({
        "Clinic Name": r.clinic,                    // Column A
        "Test Item": r.discType,                    // Column B
        "Date of Test": r.errorDate,                // Column C
        "Abnormality": formatAnomalies(r.anomalies) // Column D
    }));

    // Create worksheet from JSON
    const ws = XLSX.utils.json_to_sheet(exportData, {
        header: ["Clinic Name", "Test Item", "Date of Test", "Abnormality"]
    });

    // Set column widths for better readability
    ws['!cols'] = [
        { wch: 25 }, // Clinic Name
        { wch: 35 }, // Test Item
        { wch: 15 }, // Date of Test
        { wch: 50 }  // Abnormality
    ];

    // Create workbook and add worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Disc Reports");

    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `Disc_Reports_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function formatAnomalies(anomalies) {
    // Convert anomaly codes to readable format
    return anomalies.map(a => {
        const num = a.replace('Anomaly ', '');
        if (anomalyData[num]) {
            return `${a}: ${anomalyData[num]}`;
        }
        return a;
    }).join('; ');
}

// --- Completion Helpers --- //

window.openWithImage = (src) => {
    const w = window.open("");
    w.document.write(`<img src="${src}" style="max-width: 100%; height: auto;">`);
};

window.openWithImage = (src) => {
    const w = window.open("");
    w.document.write(`<img src="${src}" style="max-width: 100%; height: auto;">`);
};

window.openCompletionModal = (id) => {
    currentCompletingId = id;
    document.getElementById('completion-modal').classList.remove('hidden');
    document.getElementById('release-date').valueAsDate = new Date();
    document.getElementById('do-number').value = ''; // Reset
    // Reset Error State
    const errorMsg = document.getElementById('completion-error');
    if (errorMsg) errorMsg.classList.add('hidden');
};

function closeModal() {
    document.getElementById('completion-modal').classList.add('hidden');
    currentCompletingId = null;
}

async function confirmCompletion() {
    if (!currentCompletingId || !currentUser || currentUser.role !== 'Admin') return;

    const releaseDate = document.getElementById('release-date').value;
    const doNumber = document.getElementById('do-number').value;
    const errorMsg = document.getElementById('completion-error');

    if (!releaseDate || !doNumber) {
        if (errorMsg) errorMsg.classList.remove('hidden');
        return;
    }

    // Hide error if valid
    if (errorMsg) errorMsg.classList.add('hidden');

    try {

        // Update in database
        await updateReport(currentCompletingId, {
            status: 'Completed',
            release_date: releaseDate,
            do_number: doNumber,
            approved_by: currentUser.username,
            approved_at: new Date().toISOString()
        });

        // Reports will auto-refresh via real-time subscription
        closeModal();
    } catch (error) {
        console.error('Error completing report:', error);
        alert('Failed to update report. Please try again.');
    }
}

// --- Utils --- //

function initAnomalyCheckboxes() {
    const container = document.getElementById('anomaly-checkboxes');
    Object.keys(anomalyData).forEach(key => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';

        // Custom label logic: Standard format for 1-8, Value only for 9-10
        let labelText = `Disk anomaly ${key}: ${anomalyData[key]}`;
        if (key === "9" || key === "10") {
            labelText = anomalyData[key];
        }

        div.innerHTML = `
            <input type="checkbox" id="anomaly-${key}" value="${key}" name="anomalies">
            <label for="anomaly-${key}">${labelText}</label>
        `;
        container.appendChild(div);
    });
}

function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            e.target.value = '';
            return;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            e.target.value = '';
            return;
        }

        document.getElementById('file-label').textContent = file.name;
        currentReportFile = file; // Store file object for upload

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.getElementById('image-preview');
            img.innerHTML = `<img src="${e.target.result}" alt="Disc Preview">`;
            img.classList.remove('hidden');
            currentReportImage = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function updateClock() {
    const now = new Date();
    const clock = document.getElementById('clock');
    if (clock) clock.textContent = now.toLocaleTimeString();
}
