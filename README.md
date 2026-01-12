# BioChem Analyzer Monitor & Disc Error Reporting

Welcome to the **BioChem Analyzer Monitor**! This is a simple, modern web dashboard designed to help clinics and sales staff report and track errors with biochemistry analyzer discs.

## 🚀 What is this?

This application allows users to:
1.  **Log In**: Secure access for staff and admins.
2.  **Submit Reports**: detailed forms for reporting disc errors, including:
    *   Clinic & Salesperson details
    *   Disc Type & Lot Number
    *   Specific Anomalies (e.g., "Partial absence of reagent ball")
    *   Photos of the defective disc
3.  **Track Status**: A real-time worklist showing pending reports.
4.  **Admin Tools**: Administrators can review reports, add "Delivery Order (DO)" numbers, and mark them as completed.

## 🛠️ Prerequisites

Before you start, make sure you have **Node.js** installed on your computer.
- [Download Node.js](https://nodejs.org/) (LTS version recommended)

## 📥 Installation

1.  **Clone the repository** (download the files):
    ```bash
    git clone https://github.com/zylazine/discclaiming.git
    cd discclaiming
    ```

2.  **Install dependencies**:
    This project uses a small server implementation. Run this command to install the necessary tools:
    ```bash
    npm install
    ```

## ▶️ How to Run

1.  Start the application server:
    ```bash
    npm start
    ```
    *(You should see a message saying "Server running at http://localhost:3000/")*

2.  Open your web browser and visit:
    **[http://localhost:3000](http://localhost:3000)**

## 🔑 Login Credentials (For Testing)

The system currently uses a mock login system. You can use these credentials to test the features:

| Role | Username | Password | Features |
| :--- | :--- | :--- | :--- |
| **Admin** | `Admin_Primary` | `admin123` | Can submit reports AND mark them as "Completed" |
| **User** | `User_Standard` | `user123` | Can only submit reports |

## 📁 Project Structure

*   **`server.js`**: The simple backend server that runs the app.
*   **`public/`**: Contains the code for the website you see in the browser.
    *   `index.html`: The main page structure.
    *   `style.css`: All the styling and "glassmorphism" visual effects.
    *   `app.js`: The logic for handling forms, logins, and updating the list.

## 🤝 Contributing

Feel free to open issues or submit changes if you find any bugs!
