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
let reportIdCounter = 1;
let currentCompletingId = null;
let currentUser = null;
let currentReportImage = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Show Login Modal on Load
    document.getElementById('login-modal').classList.remove('hidden');

    initAnomalyCheckboxes();
    setupEventListeners();
    updateClock();
});

function setupEventListeners() {
    setInterval(updateClock, 1000);

    // Login Form
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // File Upload
    document.getElementById('disc-photo').addEventListener('change', handleFileUpload);

    // Report Submission
    document.getElementById('report-form').addEventListener('submit', handleReportSubmit);

    // Modal
    document.getElementById('cancel-modal').addEventListener('click', closeModal);
    document.getElementById('confirm-complete').addEventListener('click', confirmCompletion);
}

// --- Auth Functions --- //

function handleLogin(e) {
    e.preventDefault();
    const userIn = document.getElementById('username').value;
    const passIn = document.getElementById('password').value;
    const errorMsg = document.getElementById('login-error');

    if (USERS[userIn] && USERS[userIn].pass === passIn) {
        currentUser = { username: userIn, ...USERS[userIn] };

        // Update UI
        document.getElementById('login-modal').classList.add('hidden');
        document.getElementById('user-info').classList.remove('hidden');
        document.getElementById('welcome-msg').textContent = `Welcome, ${currentUser.name} (${currentUser.role})`;

        // Clear Form
        e.target.reset();
        errorMsg.classList.add('hidden');

        // Load Data
        renderWorklist();
    } else {
        errorMsg.classList.remove('hidden');
    }
}

function handleLogout() {
    currentUser = null;
    document.getElementById('user-info').classList.add('hidden');
    document.getElementById('login-modal').classList.remove('hidden');
}

// --- Report Functions --- //

function handleReportSubmit(e) {
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

    const newReport = {
        id: reportIdCounter++,
        clinic,
        sales,
        discType,
        lotNumber,
        expiryDate,
        errorDate,
        reportDate,
        anomalies: selectedAnomalies,
        status: 'Pending',
        doNumber: null,
        releaseDate: null,
        approvedBy: null,
        approvedAt: null,
        image: currentReportImage
    };

    reports.unshift(newReport);
    renderWorklist();
    e.target.reset();
    document.getElementById('file-label').textContent = "Choose File...";
    document.getElementById('image-preview').classList.add('hidden');
    currentReportImage = null;

    // Reset Default Date
    document.getElementById('report-date').valueAsDate = new Date();
    document.getElementById('error-date').value = '';
    document.getElementById('disc-type').value = '';
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
                    <span class="status-completed">DO: ${report.doNumber}</span><br>
                    <span class="release-info">Released: ${report.releaseDate}</span><br>
                    <span style="font-size: 0.75rem; color: #94a3b8;">Approved by ${report.approvedBy}</span>
                </div>`;
        }

        // Expanded Card Info
        card.innerHTML = `
            <div class="report-header">
                <div>
                    <span class="clinic-name">${report.clinic}</span><br>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">${report.discType}</span>
                </div>
                <div style="text-align: right;">
                    <span class="report-date">Reported: ${report.reportDate}</span><br>
                    <span class="report-date">Error: ${report.errorDate}</span>
                </div>
            </div>
            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                Lot: ${report.lotNumber} | Exp: ${report.expiryDate}
            </div>
            ${report.image ? `<div class="report-image-thumb"><img src="${report.image}" alt="Defect" onclick="window.openWithImage(this.src)"></div>` : ''}
            <div class="report-anomalies">
                ${anomaliesHtml}
            </div>
            <div class="report-footer">
                <span class="sales-name">Sales: ${report.sales}</span>
                ${actionButton}
            </div>
        `;
        listContainer.appendChild(card);
    });
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

function confirmCompletion() {
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

    const report = reports.find(r => r.id === currentCompletingId);
    if (report) {
        report.status = 'Completed';
        report.releaseDate = releaseDate;
        report.doNumber = doNumber;
        report.approvedBy = currentUser.username;
        report.approvedAt = new Date();
        renderWorklist();
    }

    closeModal();
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
        document.getElementById('file-label').textContent = file.name;
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
