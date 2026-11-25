# BioChem Analyzer Monitor — Disc Error Reporting

A modern web dashboard for veterinary clinics and sales staff to report and track biochemistry analyzer disc errors. Hosted with **Google Sheets** as the database backend, with photos embedded as **in-cell images** directly in the spreadsheet.

## 🚀 Features

- **Secure Login** – Admin and User roles with different permissions
- **Submit Reports** – Detailed forms for disc errors (clinic, disc type, lot#, anomalies, photos)
- **Google Sheets Backend** – All reports are stored in a Google Sheet with in-cell image thumbnails
- **Photo Upload** – Photos are uploaded to Google Drive and inserted as in-cell images in the sheet
- **Worklist** – Real-time view of pending and completed reports
- **Admin Tools** – Edit reports, add DO numbers, mark as completed
- **Export** – Download reports as Excel/CSV

## 🛠️ Setup

### 1. Deploy the Google Apps Script Backend

1. Open [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Click **Extensions > Apps Script**
3. Delete any code and paste the contents of [`google-apps-script/Code.gs`](google-apps-script/Code.gs)
4. Click **Save**, then run the `setupSheet` function once to initialize headers
5. Click **Deploy > New deployment**
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Click **Deploy**, authorize permissions, and **copy the Web App URL**

### 2. Run the Dashboard

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Connect to Your Google Sheet

1. Log in to the dashboard
2. Click the **📊 Host Settings** button in the header
3. Paste your Google Apps Script Web App URL
4. Click **Test Connection** to verify, then **Save & Connect**

## 🔑 Login Credentials

| Role    | Username | Password           | Permissions                           |
|---------|----------|--------------------|---------------------------------------|
| Admin   | Admin    | adminanihealth123  | Submit, Edit, Mark Complete           |
| User    | User     | useranihealth123   | Submit only                           |

## 📁 Project Structure

```
├── index.js                   # Express server
├── package.json
├── vercel.json                # Vercel deployment config
├── google-apps-script/
│   └── Code.gs                # Google Apps Script backend (paste into Sheet)
├── public/
│   ├── index.html             # Main dashboard page
│   ├── style.css              # Glassmorphism UI styles
│   ├── app.js                 # Dashboard logic (supports Google Sheets + Supabase)
│   └── sheets-client.js       # Google Sheets API client
└── README.md
```

## 📊 How In-Cell Images Work

When you upload a photo with a report:
1. The photo is base64-encoded in the browser
2. Sent to the Google Apps Script backend
3. The backend saves it to Google Drive (in a "BioChem Disc Error Uploads" folder)
4. The image is embedded **directly in the spreadsheet cell** using `CellImage` or `=IMAGE()` formula
5. A clickable Drive link is also stored in the adjacent column

## 🌐 Deployment

This project is configured for **Vercel** deployment. Connect the GitHub repo to Vercel for automatic deployments.

## 📝 License

MIT
