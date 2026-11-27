/**
 * SheetDB API Client for BioChem Analyzer Monitor
 * Uses SheetDB.io as a REST API layer over Google Sheets
 * Images are uploaded to Supabase Storage; URLs stored in Sheet
 */

// Default SheetDB API URL (can be overridden via Host Settings)
let SHEETDB_API_URL = localStorage.getItem('GOOGLE_SCRIPT_URL') || 'https://sheetdb.io/api/v1/6i5sxhqezg5tq';

/**
 * Configure or update the SheetDB API URL
 */
function setGoogleScriptUrl(url) {
    SHEETDB_API_URL = (url || '').trim();
    if (SHEETDB_API_URL) {
        localStorage.setItem('GOOGLE_SCRIPT_URL', SHEETDB_API_URL);
    } else {
        localStorage.removeItem('GOOGLE_SCRIPT_URL');
    }
}

/**
 * Check if SheetDB backend is configured
 */
function isGoogleSheetsConfigured() {
    return Boolean(SHEETDB_API_URL && (
        SHEETDB_API_URL.includes('sheetdb.io') ||
        SHEETDB_API_URL.startsWith('https://script.google.com')
    ));
}

// ========================================
// REPORTS
// ========================================

/**
 * Fetch all reports from Google Sheets via SheetDB
 */
async function fetchReportsFromSheets() {
    if (!isGoogleSheetsConfigured()) return [];

    try {
        const response = await fetch(`${SHEETDB_API_URL}?sheet=Reports&sort_by=created_at&sort_order=desc`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const rows = await response.json();

        // Convert SheetDB flat rows into the format the app expects
        return (rows || []).map(row => {
            let abnormalities = [];
            if (row.abnormalities) {
                abnormalities = String(row.abnormalities).split('; ').map(s => s.trim()).filter(Boolean);
            }

            return {
                process_no: row.process_no || row['Process No.'] || '',
                id: row.id || '',
                created_at: row.created_at || '',
                status: row.status || 'Pending',
                clinic_name: row.clinic_name || '',
                machine_serial: row.machine_serial || '',
                claim_type: row.claim_type || '',
                product_line: row.product_line || '',
                instrument_model: row.instrument_model || '',
                disc_type: row.disc_type || '',
                lot_number: row.lot_number || '',
                expiry_date: row.expiry_date || '',
                error_date: row.error_date || '',
                report_date: row.report_date || '',
                abnormalities: abnormalities,
                abnormal_parameter: row.abnormal_parameter || '',
                claimed_quantity: row.claimed_quantity || 1,
                staff_name: row.staff_name || '',
                image_url: row.image_url || '',
                do_number: row.do_number || '',
                release_date: row.release_date || ''
            };
        });
    } catch (err) {
        console.error('Error fetching reports from SheetDB:', err);
        throw err;
    }
}

/**
 * Create a new report in Google Sheets via SheetDB
 * Images should already be uploaded to Supabase; imageUrl is the resulting URL string
 */
async function createReportInSheets(reportData, imageUrl) {
    if (!isGoogleSheetsConfigured()) throw new Error('SheetDB not configured');

    const id = 'REP-' + Date.now();
    const timestamp = new Date().toISOString();

    // Auto-increment Process No. by 1 based on existing reports
    let nextProcessNo = 1;
    try {
        const existing = await fetchReportsFromSheets();
        if (existing && existing.length > 0) {
            const maxNo = existing.reduce((max, r) => {
                const n = parseInt(r.process_no, 10);
                return !isNaN(n) && n > max ? n : max;
            }, 0);
            nextProcessNo = maxNo > 0 ? maxNo + 1 : existing.length + 1;
        }
    } catch (e) {
        console.warn('Could not determine max process_no, defaulting to 1:', e);
    }

    const anomaliesStr = Array.isArray(reportData.abnormalities)
        ? reportData.abnormalities.join('; ')
        : (reportData.abnormalities || '');

    const firstUrl = (imageUrl || '').split(',')[0].trim();
    const isImage = firstUrl && !/\.(pdf|doc|docx|txt|csv|xlsx)$/i.test(firstUrl);

    const sheetRow = {
        process_no: nextProcessNo,
        id: id,
        created_at: timestamp,
        status: reportData.status || 'Pending',
        clinic_name: reportData.clinic_name || '',
        machine_serial: reportData.machine_serial || '',
        claim_type: reportData.claim_type || '',
        product_line: reportData.product_line || '',
        instrument_model: reportData.instrument_model || '',
        disc_type: reportData.disc_type || '',
        lot_number: reportData.lot_number || '',
        expiry_date: reportData.expiry_date || '',
        error_date: reportData.error_date || '',
        report_date: reportData.report_date || '',
        abnormalities: anomaliesStr,
        abnormal_parameter: reportData.abnormal_parameter || '',
        claimed_quantity: reportData.claimed_quantity || 1,
        staff_name: reportData.staff_name || '',
        image_url: imageUrl || '',
        image_preview: isImage ? `=IMAGE("${firstUrl}")` : '',
        do_number: reportData.do_number || '',
        release_date: reportData.release_date || ''
    };

    const response = await fetch(`${SHEETDB_API_URL}?sheet=Reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: [sheetRow] })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`SheetDB POST failed (${response.status}): ${text}`);
    }

    const result = await response.json();
    return { success: true, id: id, image_url: imageUrl };
}

/**
 * Update an existing report in Google Sheets via SheetDB
 * Updates the row where column 'id' matches reportId
 */
async function updateReportInSheets(reportId, updates) {
    if (!isGoogleSheetsConfigured()) throw new Error('SheetDB not configured');

    // Convert abnormalities array to semicolon-separated string
    const patchData = { ...updates };
    if (Array.isArray(patchData.abnormalities)) {
        patchData.abnormalities = patchData.abnormalities.join('; ');
    }

    const response = await fetch(`${SHEETDB_API_URL}/id/${encodeURIComponent(reportId)}?sheet=Reports`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: patchData })
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`SheetDB PATCH failed (${response.status}): ${text}`);
    }

    return await response.json();
}

/**
 * Delete a report from Google Sheets via SheetDB by ID
 */
async function deleteReportInSheets(reportId) {
    if (!isGoogleSheetsConfigured()) throw new Error('SheetDB not configured');

    const response = await fetch(`${SHEETDB_API_URL}/id/${encodeURIComponent(reportId)}?sheet=Reports`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`SheetDB DELETE failed (${response.status}): ${text}`);
    }

    return await response.json();
}

// ========================================
// CLINICS
// ========================================

let clinicsSheetKeys = { nameKey: 'clinic_name', serialKey: 'machine_serial' };

/**
 * Fetch clinics from the Clinics sheet via SheetDB
 */
async function fetchClinicsFromSheets() {
    if (!isGoogleSheetsConfigured()) return [];

    try {
        const response = await fetch(`${SHEETDB_API_URL}?sheet=Clinics`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const rows = await response.json();

        if (Array.isArray(rows) && rows.length > 0) {
            const first = rows[0];
            if ('Clinic Name' in first || 'Serial Number' in first) {
                clinicsSheetKeys = {
                    nameKey: 'Clinic Name' in first ? 'Clinic Name' : 'clinic_name',
                    serialKey: 'Serial Number' in first ? 'Serial Number' : 'machine_serial'
                };
            }
        }

        return (rows || []).map(row => ({
            clinic_name: (row.clinic_name || row['Clinic Name'] || '').trim(),
            machine_serial: (row.machine_serial || row['Serial Number'] || row.serial_number || '').trim()
        })).filter(c => c.clinic_name);
    } catch (err) {
        console.error('Error fetching clinics from SheetDB:', err);
        return [];
    }
}

/**
 * Save a clinic to the Clinics sheet via SheetDB
 */
async function saveClinicToSheets(clinicName, machineSerial) {
    if (!clinicName || !isGoogleSheetsConfigured()) return;

    try {
        // Check if clinic already exists
        const existing = await fetchClinicsFromSheets();
        const found = existing.find(c => c.clinic_name.toLowerCase() === clinicName.toLowerCase());

        if (found) {
            // Update serial if changed
            if (machineSerial && found.machine_serial !== machineSerial) {
                await fetch(`${SHEETDB_API_URL}/${encodeURIComponent(clinicsSheetKeys.nameKey)}/${encodeURIComponent(clinicName)}?sheet=Clinics`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: { [clinicsSheetKeys.serialKey]: machineSerial } })
                });
            }
        } else {
            // Create new clinic
            await fetch(`${SHEETDB_API_URL}?sheet=Clinics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: [{
                        [clinicsSheetKeys.nameKey]: clinicName,
                        [clinicsSheetKeys.serialKey]: machineSerial || ''
                    }]
                })
            });
        }
    } catch (err) {
        console.warn('Could not auto-save clinic to SheetDB:', err);
    }
}
