# CivicLens.ai - Project Description


## Problem Statement Selected
**Community Hero - Hyperlocal Problem Solver**
Communities frequently face infrastructure issues such as potholes, water leakages, damaged streetlights, and waste management concerns. Currently, reporting these issues is highly fragmented, difficult to track, and acts as a "black hole" where complaints disappear without any accountability or transparency.

## Solution Overview
**CivicLens.ai** is a multi-agent AI platform designed to fix the broken loop between citizens and the government. Our solution goes beyond simple reporting by introducing **AI-enforced accountability, crowdsourced verification, and gamified community engagement.** 

**Strategic Decisions & The Government Aspect:**
The core innovation of CivicLens is enforcing government accountability. We realized that simply categorizing an issue isn't enough. We built a RAG-powered Service Level Agreement (SLA) Engine. When an issue is reported, the AI cross-references local municipal rulebooks to assign a strict resolution deadline and route it to the exact responsible authority. If the deadline is missed, the system automatically escalates the issue up the chain of command. Furthermore, government workers cannot arbitrarily close tickets; they must upload a photo of the completed repair, which our AI Quality Assurance agent analyzes to verify the work was actually done.

**Overcoming Bureaucratic Constraints (API-Ready Design):**
Recognizing the legal and bureaucratic impossibility of directly integrating with legacy government IT systems during a hackathon, we built CivicLens to be modular and "API-Ready." We created a simulated Authority Dashboard (the "Oracle") to demonstrate how government officials would receive AI-processed data. The moment a city grants API access, our AI router simply swaps its database write for a POST request to their native grievance system—requiring zero changes to our AI logic.

## 🚀 Live Links & Demo Access
- **Live App:** [https://civiclens-ca27d.web.app](https://civiclens-ca27d.web.app)
- **GitHub Repository:** [https://github.com/Aryan4283/civiclens-ai](https://github.com/Aryan4283/civiclens-ai)
- **Demo Account:** Use the following credentials to bypass registration and instantly test the platform.
  - **Email:** demo@civiclens.ai
  - **Password:** CivicLens2026

## Key Features & Visual Journey

**1. Seamless Citizen Onboarding**
Citizens are welcomed by a modern, accessible interface that immediately drives action.
![Landing Page](./screenshots/01-landing-page.png)
![Home Feed](./screenshots/02-home-feed.png)
![Register](./screenshots/03-register.png)
![Login](./screenshots/04-login.png)

**2. Mega-Issue Clustering (The Feed)**
To prevent spamming the government, if 50 people report the same pothole, our geolocation algorithm merges them into a single "Mega-Issue," proving massive public impact instead of creating 50 duplicate tickets.
![Mega-Issue Clustering](./screenshots/05-issue-cards.png)

**3. Multi-Modal Vision & Multilingual Input**
Users upload a photo of the issue. Our Observer Agent uses Gemini to automatically extract the category, assess the severity (1-5), and generate a detailed hazard description. Additionally, we support multilingual text input — citizens can describe issues in Hindi, Marathi, or any regional language, and the AI translates automatically.
![Report Upload](./screenshots/06-report-upload.png)
![AI Analysis](./screenshots/07-report-analysis.png)
![Report Confirmed](./screenshots/08-report-confirmed.png)

**4. The SLA Engine & Citizen Chatbot**
Every issue is given a strict AI-calculated deadline based on severity. The issue detail page also features a contextual chatbot where citizens can ask questions about the SLA, and Gemini answers using the issue's real-time metadata.
![Issue Detail & SLA](./screenshots/09-issue-detail.png)
![Citizen Chatbot](./screenshots/10-issue-complaint.png)

**5. Gamification (Civic Points)**
To combat apathy, citizens earn points and climb the leaderboard by reporting issues and physically verifying other people's reports, building a decentralized ledger of civic truth.
![Citizen Dashboard](./screenshots/11-citizen-dashboard.png)

**6. AI Quality Assurance (Resolution Proof)**
When an authority claims to have fixed an issue, they upload a photo. The AI acts as an impartial inspector, comparing the original issue to the repair photo to prevent fraudulent ticket closures.
![Fix Proof Upload](./screenshots/12-fix-proof.png)
![AI Before/After Comparison](./screenshots/13-before-after.png)

**7. The Authority Dashboard (The Command Center & Oracle)**
We built a comprehensive, AI-powered command center for government officials to manage city infrastructure efficiently. Instead of relying on manual data entry, the dashboard provides predictive analytics and real-time SLA tracking.

- **Unified Navigation Experience:** The platform features an integrated navigation system, allowing seamless switching between the citizen-facing home feed and the dedicated "Authority Portal" to ensure a frictionless demonstration of the platform.
  ![Unified Navigation](./screenshots/14_logged_in.png)

- **AI Action Queue & Kanban Board:** A real-time, status-based Kanban board with dropdown controls that tracks incoming issues. The system automatically prioritizes tickets based on their AI-assigned severity score and SLA deadlines, ensuring critical emergencies never slip through the cracks.
  ![Action Queue](./screenshots/15-action-queue.png)
  ![Kanban Board](./screenshots/19-kanban.png)

- **Department Scorecard (Impact Dashboard):** A transparency tool that tracks the overall resolution rate, average SLA compliance, and civic points. This enforces accountability by showing exactly how fast authorities respond to citizen complaints.
  ![Department Scorecard](./screenshots/16-scorecard.png)

- **The Civic Oracle (AI Predictive Reports):** A powerful AI report generator exclusively for government officials. By generating predictive reports, the Oracle analyzes city-wide data to detect recurring issues (e.g., repeating water leaks in the same ward) and forecasts future infrastructure failures, shifting the government from being *reactive* to *preventative*.
  ![Civic Oracle Dashboard](./screenshots/17-oracle.png)
  ![Predictive City Report](./screenshots/18-city-report.png)

## Technologies Used
- **Frontend:** React.js, Vite, Tailwind CSS (Glassmorphism design system)
- **Backend:** Node.js, Express, Node-Cron (Autonomous Background Jobs)
- **Database:** Firebase Firestore (NoSQL, Real-time Base64 Media Storage)
- **Authentication:** Firebase Auth
- **Containerization:** Docker

## Google Technologies Utilized
- **Google Gen AI SDK (Gemini):** This is the core intelligence of the platform. We utilized `gemini-3.5-flash` to power five distinct agents:
  - **Observer Agent:** Utilizes True Function Calling (Structured JSON outputs) to perform Computer Vision analysis on multi-modal image and video-based issue reporting, and process multilingual text input — citizens can describe issues in Hindi, Marathi, or any regional language; AI translates and extracts structured data automatically.
  - **Router Agent:** Utilizes RAG (Retrieval-Augmented Generation) to analyze synthetic municipal policy documents (`sla_document.md`) to autonomously determine jurisdiction and assign legally-binding SLA deadlines.
  - **Escalator Agent:** An autonomous background cron-job agent that runs two passes on the database every 6 hours: (1) a **Geolocation Deduplication Pass** using the Haversine formula to mathematically cluster duplicate reports within 100 meters into a single Mega-Issue, and (2) a **3-Level SLA Escalation Pass** that generates increasingly severe legal documents — Level 1: Formal Complaint Letter, Level 2: RTI (Right to Information) Application Draft, Level 3: Media & NGO Alert Press Release — when SLA deadlines are breached.
  - **Synthesizer Agent (Civic Oracle):** Uses `gemini-3.5-flash` (the Pro model) to analyze city-wide data and generate a structured City Infrastructure Health Report with a live City Health Score, trending issues, investment priorities, and a journalistic weekly bulletin.
  - **QA Agent:** Performs comparative visual analysis between "before" and "after" photos.
  - **Citizen Chatbot:** A contextual in-app assistant on every issue detail page, powered by Gemini, that answers citizen questions about their specific SLA deadline and issue status using real-time metadata.
- **Department Scorecard AI:** The Authority Dashboard's scorecard mathematically calculates a performance grade per department (60% resolution rate + 40% SLA compliance), then passes this to Gemini to generate an AI commentary with specific, actionable improvement recommendations.
- **Custom AI Fallback Mesh:** We built a custom SDK wrapper around the Google Gen AI SDK that intercepts any rate-limit or API error and silently waterfalls through a chain of 4 Gemini model versions (`gemini-3.5-flash` → `gemini-3-flash` → `gemini-2.5-flash` → `gemini-3.1-flash-lite`), ensuring 100% uptime during evaluation with zero user-visible errors.
- **Google Cloud Run:** The entire Node.js AI backend is containerized with Docker and deployed to Cloud Run for scalable, serverless execution.
- **Firebase Hosting:** Delivers the React frontend via Google's global CDN.
- **Google Maps API:** Used for high-accuracy geolocation pinning, reverse geocoding, and mapping issue clusters across the city.
