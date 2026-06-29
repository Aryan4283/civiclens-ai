# CivicLens.ai - Hyperlocal Problem Solver 🌍

![Landing Page](./screenshots/01-landing-page.png)

CivicLens.ai is an intelligent, multi-agent platform that empowers citizens to report community issues while using AI to enforce government accountability, assign SLA deadlines, and verify issue resolution. 

## 🚀 Live Demo
- **Frontend (Citizen App):** [https://civiclens-ca27d.web.app](https://civiclens-ca27d.web.app)
- **Backend (AI Engine):** [https://civiclens-api-249711436990.asia-south1.run.app](https://civiclens-api-249711436990.asia-south1.run.app)

## 🔑 Demo Credentials
*(Feel free to use this account to bypass registration and explore the platform immediately)*
- **Email:** demo@civiclens.ai
- **Password:** CivicLens2026

---

## 🎯 The Vision
Most civic reporting apps act as a "black hole" where complaints disappear. CivicLens fixes the broken loop between citizens and the government by introducing **AI-enforced accountability, crowdsourced verification, and gamified engagement.**

## ✨ Key Features

### 1. Multi-Modal AI Reporting
Citizens can upload a photo of a pothole, leak, or hazard. Our **Observer Agent** (powered by Gemini) performs Computer Vision analysis and uses True Function Calling to extract structured data: categorizing the issue, scoring its severity (1-5), and generating a detailed description.

![AI Analysis](./screenshots/07-report-analysis.png)

### 2. AI-Enforced SLAs (Service Level Agreements)
Instead of just classifying an issue, our **Router Agent** cross-references a municipal rulebook to autonomously determine jurisdiction, assign a legally-binding deadline (e.g., 24 hours for a severe water leak), and route it to the correct government department.

![Issue Detail & SLA](./screenshots/09-issue-detail.png)

### 3. Mega-Issue Clustering
If 50 people report the same pothole, it doesn't create 50 spam tickets. Our geolocation algorithm clusters them into one high-priority "Mega-Issue," proving massive public impact.

### 4. Community Verification & Gamification
Citizens earn "Civic Points" for reporting issues, verifying other people's reports, and getting issues resolved. This builds a trustworthy, decentralized ledger of civic truth.

![Citizen Dashboard](./screenshots/11-citizen-dashboard.png)

### 5. AI Quality Assurance (Resolution Proof)
Government contractors cannot simply close a ticket. They must upload a photo of the completed repair. The AI acts as an impartial Quality Assurance inspector, comparing the original issue to the repair photo before the ticket can be officially closed.

### 6. Authority Dashboard & Predictive Insights
Government officials have access to an AI Action Queue (Kanban board) to manage SLAs, a Department Scorecard for impact tracking, and a "Civic Oracle" that provides predictive analytics to forecast recurring infrastructure failures.

---

## 🏗️ Architecture & Technologies

**Frontend:**
- React.js (Vite)
- Tailwind CSS (Glassmorphism UI)
- Firebase Hosting

**Backend:**
- Node.js, Express & Node-Cron (Autonomous Background Jobs)
- Google Cloud Run (Dockerized)
- Firebase Firestore (NoSQL, Real-time Base64 Media Storage)
- Firebase Authentication

**Google Technologies Utilized:**
- **Google Gen AI SDK (Gemini):** Powered by `gemini-3.5-flash` for high-speed multi-modal vision, true function calling, and multilingual text processing. Includes a **Custom AI Fallback Mesh** to `gemini-3.1-flash-lite` for rate-limit resilience and 100% uptime.
- **Google Maps API:** For geolocation pinning and reverse geocoding.
- **Google Cloud Run & Firebase:** Serverless, auto-scaling deployment.

---

## 💻 Local Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Aryan4283/civiclens-ai.git
   cd civiclens-ai
   ```

2. **Setup Frontend:**
   ```bash
   cd client
   npm install
   # Create a .env file with your Firebase and Google Maps keys
   npm run dev
   ```

3. **Setup Backend:**
   ```bash
   cd ../server
   npm install
   # Create a .env file with your GEMINI_API_KEY and Firebase Admin credentials
   npm run dev
   ```
