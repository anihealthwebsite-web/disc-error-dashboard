/**
 * Google Sheets API Client for BioChem Analyzer Monitor
 * Connects frontend directly to Google Apps Script Web App
 */

// Configuration: Replace with your deployed Google Apps Script Web App URL
let GOOGLE_SCRIPT_URL = localStorage.getItem('GOOGLE_SCRIPT_URL') || '';

/**
 * Configure or update the Google Apps Script Web App URL
 */
function setGoogleScriptUrl(url) {
    GOOGLE_SCRIPT_URL = (url || '').trim();
    if (GOOGLE_SCRIPT_URL) {
        localStorage.setItem('GOOGLE_SCRIPT_URL', GOOGLE_SCRIPT_URL);
    } else {
        localStorage.removeItem('GOOGLE_SCRIPT_URL');
    }
}

/**
 * Check if Google Sheets backend is configured
 */
function isGoogleSheetsConfigured() {
    return Boolean(GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.startsWith('https://script.google.com'));
}

/**
 * Helper to convert browser File objects to Base64 payloads
 */
async function filesToBase64Payload(fileList) {
    if (!fileList || fileList.length === 0) return [];
    
    const promises = Array.from(fileList).map(file => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                const base64 = result.indexOf(',') > -1 ? result.split(',')[1] : result;
                resolve({
                    name: file.name,
                    type: file.type || 'image/jpeg',
                    base64: base64
                });
            };
            reader.onerror = err => reject(err);
            reader.readAsDataURL(file);
        });
    });

    return Promise.all(promises);
}

/**
 * Safe fetch helper for Google Apps Script POST requests
 * Sends as text/plain to avoid CORS preflight OPTIONS blocking
 */
async function postToSheetsApi(payload) {
    if (!isGoogleSheetsConfigured()) {
        throw new Error('Google Script URL is not configured. Please set GOOGLE_SCRIPT_URL in settings or app.js.');
    }

    const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: Failed to communicate with Google Sheets.`);
    }

    const result = await response.json();
    if (!result.success) {
        throw new Error(result.error || 'Google Sheets backend encountered an error.');
    }

    return result;
}

/**
 * Fetch all reports from Google Sheets
 */
async function fetchReportsFromSheets() {
    if (!isGoogleSheetsConfigured()) return [];

    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=getReports&t=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        const result = await response.json();
        return result.success ? (result.data || []) : [];
    } catch (err) {
        console.error('Error fetching reports from Google Sheets:', err);
        throw err;
    }
}

/**
 * Fetch clinics for autocomplete from Google Sheets
 */
async function fetchClinicsFromSheets() {
    if (!isGoogleSheetsConfigured()) return [];

    try {
        const url = `${GOOGLE_SCRIPT_URL}?action=getClinics&t=${Date.now()}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
        const result = await response.json();
        return result.success ? (result.data || []) : [];
    } catch (err) {
        console.error('Error fetching clinics from Google Sheets:', err);
        return [];
    }
}

/**
 * Create a new report in Google Sheets with embedded in-cell photos
 */
async function createReportInSheets(reportData, files) {
    const encodedFiles = await filesToBase64Payload(files);
    const payload = {
        action: 'createReport',
        data: reportData,
        files: encodedFiles
    };

    return await postToSheetsApi(payload);
}

/**
 * Update an existing report in Google Sheets (edit or mark complete)
 */
async function updateReportInSheets(reportId, updates) {
    const payload = {
        action: 'updateReport',
        id: reportId,
        updates: updates
    };

    return await postToSheetsApi(payload);
}

/**
 * Save clinic to Clinics sheet
 */
async function saveClinicToSheets(clinicName, machineSerial) {
    if (!clinicName) return;
    try {
        const payload = {
            action: 'saveClinic',
            clinic_name: clinicName,
            machine_serial: machineSerial
        };
        await postToSheetsApi(payload);
    } catch (err) {
        console.warn('Could not auto-save clinic to Google Sheets:', err);
    }
}
