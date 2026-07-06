# Retail Sales Assist

A premium mobile-first Progressive Web App (PWA) designed to streamline retail operations, sales tracking, and feedback capture.

## 📱 Features

* **PWA (Progressive Web App) Support:** Installable as a fullscreen app on both iOS (Safari) and Android (Chrome) with offline capability and custom launcher icons.
* **DSR Creation & Tracking:** Adaptable input fields based on the selected store. Computes total walk-ins, conversion rates (CVR %), GMB reviews rates, and projected revenue. Automatically generates a styled Excel-like preview table.
* **Take Snapshot:** Custom snapshot renderer using `html2canvas` to capture the DSR preview table as an image and download it for easy sharing.
* **Mid-Day Footfall Form:** Simple and sleek Google-Form emulation for manager reporting.
* **Google Sheets Syncing:** Connected backend writing reports directly to separate target Google Sheets via Google Apps Script web apps.
* **Objections Recorder & QA:** Audio recording for capturing customer pushback directly from the sales floor, plus an interactive Expert Q&A dashboard.
* **Analytics Panel:** Store-level KPI metrics, custom 7-day CVR bar chart, dynamic Price Suggestion Engine, and external Links Aggregator.

---

## 🛠️ Technology Stack

* **Build Tool:** Vite
* **Frontend:** HTML5, CSS3 (Vanilla Glassmorphism Theme), Vanilla JavaScript
* **Libraries:** `html2canvas` (for DSR Snapshot capture)
* **Backend:** Google Apps Script / Google Sheets API

---

## 💻 Local Development

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Run Dev Server:**
   ```bash
   npm run dev
   ```

3. **Production Build:**
   ```bash
   npm run build
   ```

---

## 🚀 Deployment to Render

To deploy this site on [Render](https://render.com) (Static Site service):

1. **Build Command:**
   ```bash
   npm run build
   ```

2. **Publish Directory:**
   ```bash
   dist
   ```

---

## 📲 How to Install as an App on Mobile

* **iOS (Safari):** Open the deployed URL in Safari, tap the **Share** button in the bottom menu, and select **"Add to Home Screen"**.
* **Android (Chrome):** Open the deployed URL in Chrome, tap the **three-dots menu** at the top right, and select **"Install App"** (or **"Add to Home Screen"**).
