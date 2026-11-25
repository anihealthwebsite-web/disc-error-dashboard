/**
 * =========================================================================
 * BioChem Analyzer Monitor - Google Sheets Backend & Image Host
 * =========================================================================
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any code in the editor and paste this entire file.
 * 4. Click Save (disk icon).
 * 5. Run the "setupSheet" function once to initialize columns and formatting.
 * 6. Click Deploy > New deployment.
 *    - Select type: Web app
 *    - Description: BioChem Backend API
 *    - Execute as: Me (your Google account)
 *    - Who has access: Anyone
 * 7. Click Deploy, authorize permissions, and copy the Web App URL.
 * 8. Paste that URL into public/app.js as GOOGLE_SCRIPT_URL.
 */

const SHEET_NAME_REPORTS = "Reports";
const SHEET_NAME_CLINICS = "Clinics";
const FOLDER_NAME = "BioChem Disc Error Uploads";

/**
 * One-time setup to create sheets, headers, and column formatting
 */
function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Setup Reports Sheet
  let reportSheet = ss.getSheetByName(SHEET_NAME_REPORTS);
  if (!reportSheet) {
    reportSheet = ss.insertSheet(SHEET_NAME_REPORTS);
  }

  const reportHeaders = [
    "ID",
    "Timestamp",
    "Status",
    "Hospital / Clinic",
    "Machine Serial",
    "Claim Type",
    "Product Line",
    "Instrument Model",
    "Claim Item (Disc Type)",
    "Reagent LOT",
    "Disc Expiry Date",
    "Date of Error",
    "Date Reported",
    "Anomalies / Defects",
    "Salesperson",
    "Photo (In-Cell)",
    "Photo Drive Link",
    "DO Number",
    "Release Date"
  ];

  if (reportSheet.getLastRow() === 0) {
    reportSheet.appendRow(reportHeaders);
    const headerRange = reportSheet.getRange(1, 1, 1, reportHeaders.length);
    headerRange.setBackground("#1e293b");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
    headerRange.setHorizontalAlignment("center");
    reportSheet.setFrozenRows(1);

    // Set column widths for readability
    reportSheet.setColumnWidth(1, 120); // ID
    reportSheet.setColumnWidth(2, 140); // Timestamp
    reportSheet.setColumnWidth(3, 100); // Status
    reportSheet.setColumnWidth(4, 180); // Hospital / Clinic
    reportSheet.setColumnWidth(5, 140); // Machine Serial
    reportSheet.setColumnWidth(6, 120); // Claim Type
    reportSheet.setColumnWidth(7, 130); // Product Line
    reportSheet.setColumnWidth(8, 140); // Instrument Model
    reportSheet.setColumnWidth(9, 180); // Claim Item
    reportSheet.setColumnWidth(10, 110); // LOT
    reportSheet.setColumnWidth(11, 110); // Expiry
    reportSheet.setColumnWidth(12, 110); // Error Date
    reportSheet.setColumnWidth(13, 110); // Report Date
    reportSheet.setColumnWidth(14, 220); // Anomalies
    reportSheet.setColumnWidth(15, 120); // Salesperson
    reportSheet.setColumnWidth(16, 120); // Photo In-Cell
    reportSheet.setColumnWidth(17, 200); // Drive Link
    reportSheet.setColumnWidth(18, 120); // DO Number
    reportSheet.setColumnWidth(19, 110); // Release Date
  }

  // 2. Setup Clinics Sheet
  let clinicSheet = ss.getSheetByName(SHEET_NAME_CLINICS);
  if (!clinicSheet) {
    clinicSheet = ss.insertSheet(SHEET_NAME_CLINICS);
  }

  const clinicHeaders = ["Clinic Name", "Machine Serial", "Last Updated"];
  if (clinicSheet.getLastRow() === 0) {
    clinicSheet.appendRow(clinicHeaders);
    const cHeader = clinicSheet.getRange(1, 1, 1, clinicHeaders.length);
    cHeader.setBackground("#334155");
    cHeader.setFontColor("#ffffff");
    cHeader.setFontWeight("bold");
    clinicSheet.setFrozenRows(1);
    clinicSheet.setColumnWidth(1, 200);
    clinicSheet.setColumnWidth(2, 160);
    clinicSheet.setColumnWidth(3, 140);
  }

  Logger.log("Setup completed successfully!");
}

/**
 * Helper to get or create the Drive upload folder
 */
function getOrCreateFolder() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  const folder = DriveApp.createFolder(FOLDER_NAME);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return folder;
}

/**
 * Handle GET requests - read reports or clinics
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getReports";
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "getClinics") {
      const sheet = ss.getSheetByName(SHEET_NAME_CLINICS);
      if (!sheet || sheet.getLastRow() <= 1) {
        return createJsonResponse({ success: true, data: [] });
      }
      const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
      const clinics = data
        .filter(row => row[0])
        .map(row => ({
          clinic_name: String(row[0]).trim(),
          machine_serial: String(row[1] || '').trim()
        }));
      return createJsonResponse({ success: true, data: clinics });
    }

    // Default: getReports
    const sheet = ss.getSheetByName(SHEET_NAME_REPORTS);
    if (!sheet || sheet.getLastRow() <= 1) {
      return createJsonResponse({ success: true, data: [] });
    }

    const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 19).getValues();
    const reports = rows
      .filter(row => row[0]) // Filter rows with valid ID
      .map(row => {
        let abnormalities = [];
        if (row[13]) {
          abnormalities = String(row[13]).split('; ').map(s => s.trim()).filter(Boolean);
        }

        return {
          id: String(row[0]),
          created_at: row[1] instanceof Date ? row[1].toISOString() : String(row[1] || ''),
          status: String(row[2] || 'Pending'),
          clinic_name: String(row[3] || ''),
          machine_serial: String(row[4] || ''),
          claim_type: String(row[5] || ''),
          product_line: String(row[6] || ''),
          instrument_model: String(row[7] || ''),
          disc_type: String(row[8] || ''),
          lot_number: String(row[9] || ''),
          expiry_date: formatDateValue(row[10]),
          error_date: formatDateValue(row[11]),
          report_date: formatDateValue(row[12]),
          abnormalities: abnormalities,
          staff_name: String(row[14] || ''),
          image_url: String(row[16] || ''), // Drive direct links
          do_number: String(row[17] || ''),
          release_date: formatDateValue(row[18])
        };
      })
      .reverse(); // Newest first

    return createJsonResponse({ success: true, data: reports });

  } catch (err) {
    return createJsonResponse({ success: false, error: err.message });
  }
}

/**
 * Handle POST requests - create report, update report, save clinic
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ success: false, error: "Empty request body" });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action || "createReport";
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "createReport") {
      return handleCreateReport(ss, payload);
    } else if (action === "updateReport") {
      return handleUpdateReport(ss, payload);
    } else if (action === "saveClinic") {
      return handleSaveClinic(ss, payload);
    }

    return createJsonResponse({ success: false, error: "Unknown action: " + action });

  } catch (err) {
    return createJsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Creates a report, saves uploaded images to Drive, and embeds the image directly into cell
 */
function handleCreateReport(ss, payload) {
  let sheet = ss.getSheetByName(SHEET_NAME_REPORTS);
  if (!sheet) {
    setupSheet();
    sheet = ss.getSheetByName(SHEET_NAME_REPORTS);
  }

  const d = payload.data || {};
  const files = payload.files || [];
  const id = "REP-" + Date.now();
  const timestamp = new Date();

  // Save files to Drive and get image URLs
  const folder = getOrCreateFolder();
  const directUrls = [];
  const driveLinks = [];
  let primaryImageDirectUrl = "";

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    try {
      const decodedBytes = Utilities.base64Decode(f.base64);
      const blob = Utilities.newBlob(decodedBytes, f.type || "image/jpeg", f.name || `photo_${Date.now()}_${i}.jpg`);
      const driveFile = folder.createFile(blob);
      driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      const fileId = driveFile.getId();
      // Fast Google Drive direct image CDN link (works with in-cell image)
      const directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
      const viewLink = `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;

      directUrls.push(directUrl);
      driveLinks.push(viewLink);

      if (!primaryImageDirectUrl && (f.type || '').startsWith('image/')) {
        primaryImageDirectUrl = directUrl;
      }
    } catch (uploadErr) {
      Logger.log("Upload error for file " + f.name + ": " + uploadErr);
    }
  }

  const anomaliesStr = Array.isArray(d.abnormalities) ? d.abnormalities.join('; ') : (d.abnormalities || '');
  const driveLinksStr = driveLinks.join(', ');

  const newRow = [
    id,
    timestamp,
    d.status || "Pending",
    d.clinic_name || "",
    d.machine_serial || "",
    d.claim_type || "",
    d.product_line || "",
    d.instrument_model || "",
    d.disc_type || "",
    d.lot_number || "",
    d.expiry_date || "",
    d.error_date || "",
    d.report_date || "",
    anomaliesStr,
    d.staff_name || "",
    "", // Column 16: Photo In-Cell (populated below)
    driveLinksStr, // Column 17: Clickable Drive link(s)
    d.do_number || "",
    d.release_date || ""
  ];

  sheet.appendRow(newRow);
  const rowIdx = sheet.getLastRow();

  // Insert image directly into cell 16 (Column P)
  if (primaryImageDirectUrl) {
    try {
      const cellImage = SpreadsheetApp.newCellImage()
        .setSourceUrl(primaryImageDirectUrl)
        .setAltTextTitle("Disc Error Evidence")
        .build();
      sheet.getRange(rowIdx, 16).setValue(cellImage);
      sheet.setRowHeight(rowIdx, 80); // Expand row so thumbnail is clear
    } catch (imgErr) {
      // Fallback to formula
      sheet.getRange(rowIdx, 16).setFormula(`=IMAGE("${primaryImageDirectUrl}", 1)`);
      sheet.setRowHeight(rowIdx, 80);
    }
  }

  // Also auto-save clinic if clinic_name is provided
  if (d.clinic_name) {
    handleSaveClinic(ss, { clinic_name: d.clinic_name, machine_serial: d.machine_serial });
  }

  return createJsonResponse({
    success: true,
    message: "Report saved successfully",
    id: id,
    image_url: driveLinksStr
  });
}

/**
 * Updates an existing report by ID
 */
function handleUpdateReport(ss, payload) {
  const sheet = ss.getSheetByName(SHEET_NAME_REPORTS);
  if (!sheet) {
    return createJsonResponse({ success: false, error: "Reports sheet not found" });
  }

  const targetId = String(payload.id);
  const updates = payload.updates || {};
  const data = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 1), 1).getValues();

  let targetRow = -1;
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === targetId) {
      targetRow = i + 2;
      break;
    }
  }

  if (targetRow === -1) {
    return createJsonResponse({ success: false, error: "Report with ID " + targetId + " not found" });
  }

  if (updates.status !== undefined) sheet.getRange(targetRow, 3).setValue(updates.status);
  if (updates.clinic_name !== undefined) sheet.getRange(targetRow, 4).setValue(updates.clinic_name);
  if (updates.machine_serial !== undefined) sheet.getRange(targetRow, 5).setValue(updates.machine_serial);
  if (updates.claim_type !== undefined) sheet.getRange(targetRow, 6).setValue(updates.claim_type);
  if (updates.product_line !== undefined) sheet.getRange(targetRow, 7).setValue(updates.product_line);
  if (updates.instrument_model !== undefined) sheet.getRange(targetRow, 8).setValue(updates.instrument_model);
  if (updates.disc_type !== undefined) sheet.getRange(targetRow, 9).setValue(updates.disc_type);
  if (updates.lot_number !== undefined) sheet.getRange(targetRow, 10).setValue(updates.lot_number);
  if (updates.expiry_date !== undefined) sheet.getRange(targetRow, 11).setValue(updates.expiry_date);
  if (updates.error_date !== undefined) sheet.getRange(targetRow, 12).setValue(updates.error_date);
  if (updates.report_date !== undefined) sheet.getRange(targetRow, 13).setValue(updates.report_date);
  if (updates.abnormalities !== undefined) {
    const val = Array.isArray(updates.abnormalities) ? updates.abnormalities.join('; ') : updates.abnormalities;
    sheet.getRange(targetRow, 14).setValue(val);
  }
  if (updates.staff_name !== undefined) sheet.getRange(targetRow, 15).setValue(updates.staff_name);
  if (updates.do_number !== undefined) sheet.getRange(targetRow, 18).setValue(updates.do_number);
  if (updates.release_date !== undefined) sheet.getRange(targetRow, 19).setValue(updates.release_date);

  return createJsonResponse({ success: true, message: "Report updated successfully" });
}

/**
 * Saves a clinic to the Clinics sheet if not already present
 */
function handleSaveClinic(ss, payload) {
  let clinicSheet = ss.getSheetByName(SHEET_NAME_CLINICS);
  if (!clinicSheet) {
    setupSheet();
    clinicSheet = ss.getSheetByName(SHEET_NAME_CLINICS);
  }

  const name = String(payload.clinic_name || '').trim();
  const serial = String(payload.machine_serial || '').trim();
  if (!name) return createJsonResponse({ success: false, error: "Empty clinic name" });

  const numRows = clinicSheet.getLastRow();
  if (numRows > 1) {
    const existing = clinicSheet.getRange(2, 1, numRows - 1, 2).getValues();
    for (let i = 0; i < existing.length; i++) {
      if (String(existing[i][0]).toLowerCase() === name.toLowerCase()) {
        if (serial && !existing[i][1]) {
          clinicSheet.getRange(i + 2, 2).setValue(serial);
          clinicSheet.getRange(i + 2, 3).setValue(new Date());
        }
        return createJsonResponse({ success: true, message: "Clinic already exists" });
      }
    }
  }

  clinicSheet.appendRow([name, serial, new Date()]);
  return createJsonResponse({ success: true, message: "Clinic added" });
}

/**
 * Helper to format date cells safely
 */
function formatDateValue(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || "GMT+8", "yyyy-MM-dd");
  }
  return String(val);
}

/**
 * JSON Response helper with CORS
 */
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
