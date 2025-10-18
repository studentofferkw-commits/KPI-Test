<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# KPI Management App

This application allows for KPI data entry and management, powered by Gemini for AI-driven features.

**Live Demo:** [https://studentofferkw-commits.github.io/KPI-Test/](https://studentofferkw-commits.github.io/KPI-Test/)

---

## Development & Deployment

### Running Locally

**Prerequisites:** Node.js

1.  **Install Dependencies:**
    ```
    npm install
    ```

2.  **Set Environment Variables:**
    Create a file named `.env` in the root of the project and add your API keys:
    ```
    GEMINI_API_KEY=your_gemini_api_key_here
    FIREBASE_API_KEY=your_firebase_api_key_here
    ```

3.  **Run the App:**
    ```
    npm run dev
    ```

### Deployment (GitHub Pages)

This project is configured to deploy automatically to GitHub Pages.

1.  **GitHub Secrets:** For the deployment to work, you must add the following secrets in your GitHub repository's settings (`Settings` > `Secrets and variables` > `Actions`):
    *   `FIREBASE_API_KEY`: Your Firebase project's API key.
    *   `GEMINI_API_KEY`: Your Gemini API key.

2.  **Manual Deployment:** To trigger a deployment manually, run:
    ```
    npm run deploy
    ```
