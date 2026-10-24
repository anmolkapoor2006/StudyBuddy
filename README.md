<div align="center">

# 🎯 StudyBuddy

### The Ultimate Developer Learning Ecosystem & Coding Practice Tracker

*Transform YouTube playlists into structured learning workspaces, master DSA roadmaps, and sync your coding judge submissions in real time.*

<br/>

[![React 19](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Manifest V3](https://img.shields.io/badge/Chrome_Extension-Manifest_V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)

</div>

---

## 🚀 Overview

**StudyBuddy** solves the fragmented developer learning journey. Instead of jumping across YouTube tabs, external judge portals, and spreadsheets, StudyBuddy unifies everything into a distraction-free, high-performance command center:

1. **Course & Video Workspace**: Turn any public YouTube playlist into a full interactive course with auto-resuming video progress and timestamp-anchored notes.
2. **Curated DSA & CP Roadmaps**: Master Striver's SDE 180, Striver's A2Z DSA, NeetCode 150, SQL 75, and Codeforces Rating Ladders (800–1600+).
3. **Companion Browser Extension**: Automatically detect and sync accepted solutions from **LeetCode**, **Codeforces**, and **GeeksforGeeks** with live streak updates and floating in-page solved badges.
4. **Core CS Prephub**: Study Operating Systems, DBMS, Computer Networks, and SQL with syllabus explorers and interactive progress tracking.
5. **Analytics & Heatmap**: GitHub-style activity heatmaps, daily streak tracking, and problem completion metrics.

---

## ⚡ Key Highlights

### 📺 1. Distraction-Free Video Workspace
* **YouTube Playlist Import**: Paste any public playlist URL or ID to resolve metadata, duration, thumbnails, and complete lesson sequences.
* **Timestamp Notes**: Jot down notes linked to exact video moments (e.g., `04:15`). Clicking any note seeks playback instantly to that timestamp.
* **Smart Auto-Resume**: The "Continue Learning" button returns you directly to your exact course, video, and second where you left off.
* **Playlist Sync**: Re-sync with YouTube to pull newly added videos while preserving all existing progress and notes.

### 🧩 2. DSA Roadmaps & Competitive Programming Hub
* **Built-in Master Sheets**:
  * 🏆 **Striver's SDE 180**: 33 modules covering core interview patterns mapped directly to LeetCode.
  * 🌐 **Striver's A2Z DSA**: Comprehensive foundational to advanced interview roadmap.
  * 🎯 **NeetCode 150**: The top 150 interview patterns with problem classifications.
  * 📊 **SQL 75 Practical**: 12 modules covering joins, aggregations, window functions, and complex querying.
  * ⚔️ **Codeforces Rating Ladder**: 269 classic problems categorized from 800 to 1600+ rating with accepted C++ solutions.
* **Direct CSV / Sheet Import**: Import and organize custom problem lists with instant fuzzy database matching.
* **Multi-Filter Explorer**: Search by title, filter by difficulty (Easy, Medium, Hard), and track status (Solved, Starred, Pending).

### 🔌 3. StudyBuddy Companion Extension (Manifest V3)
> **POV: His Helper** — Zero-friction, real-time submission tracking across coding judges.

* **Real-Time Judge Detection**: Automatically detects `Accepted` verdicts on **LeetCode**, **Codeforces**, and **GeeksforGeeks** and syncs them to your profile.
* **Dual-Platform Historical Backfill**:
  * **LeetCode**: 1-click bulk import of your full solved history via session integration.
  * **Codeforces**: 1-click import of all accepted contest submissions via Codeforces' official public API.
* **In-Page Floating Badges**: Displays `StudyBuddy Solved ✓` right on problem pages with SPA route tracking (`pushState`/`popstate`).
* **Write-Only JWT Security**: The authentication token is masked and protected—never exposed in the DOM or inspectable, with clipboard blocking (`copy`, `cut`, `drag`, `select`).
* **Environment Presets**: One-click toggling between `Local Dev` (`http://localhost:5000/api`) and `Live / Cloudflare Pages`.

### 📚 4. Core CS Prephub
* Comprehensive subject roadmaps for **Operating Systems**, **DBMS**, **Computer Networks**, and **SQL**.
* Curated interview questions, reference links, and module progress tracking.

### 📊 5. Streak & Activity Analytics
* **GitHub-Style Contribution Heatmap**: Visualizes daily coding and study duration.
* **Dynamic Streaks**: Calculates current and all-time highest streaks with daily activity triggers.

---

## 🏗️ Architecture

```mermaid
flowchart TD
    User([👤 Developer])

    subgraph FE ["🎨 Frontend — Cloudflare Pages (React 19 + Vite)"]
        direction TB
        UI1["Distraction-Free Video Player"]
        UI2["DSA Roadmaps & Sheet Explorer"]
        UI3["Timestamp Notes & Study Logs"]
        UI4["Prephub Core CS Modules"]
        UI5["Heatmap & Streak Dashboard"]
    end

    subgraph EXT ["⚡ Companion Extension (Manifest V3)"]
        direction TB
        EX1["Live Verdict Observer (LC / CF / GFG)"]
        EX2["Floating In-Page Solved Badge"]
        EX3["Historical Batch Sync (LC & CF)"]
        EX4["Write-Only Token Vault"]
    end

    subgraph BE ["⚙️ Backend API (Node.js + Express)"]
        direction TB
        API1["JWT Authentication & RBAC"]
        API2["Practice & Batch Sync Engine"]
        API3["Playlist & Progress Controller"]
        API4["Daily Activity & Streak Tracker"]
    end

    subgraph DB ["🗄️ Database (MongoDB Atlas)"]
        direction TB
        D1["Users & Public Handles"]
        D2["UserCodingProgress & Solved Keys"]
        D3["Playlists, Videos & Timestamp Notes"]
        D4["DailyActivity & Streaks"]
    end

    subgraph EXT_APIS ["🌐 External Services"]
        direction TB
        E1["YouTube Data API v3"]
        E2["LeetCode API"]
        E3["Codeforces Public API"]
    end

    User -->|Interacts| FE
    User -->|Codes on LC / CF / GFG| EXT
    EXT -->|REST API (CORS Bypass)| BE
    FE <===>|REST API / Bearer Auth| BE
    BE <---> DB
    BE <---> EXT_APIS
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS v4, React Router DOM v7, Lucide Icons, Axios, React Hot Toast |
| **Extension** | Vanilla JS, Chrome Extensions Manifest V3, Webpack/Build-Free, Elevated Host Permissions |
| **Backend** | Node.js, Express.js, Mongoose ODM, JWT, bcryptjs, CORS |
| **Database** | MongoDB Atlas (M0 / Free Tier Compatible) |
| **Deployment** | Cloudflare Pages (Frontend SPA), Render / Koyeb (Backend Node.js) |
| **External APIs** | YouTube Data API v3, Codeforces Public API, LeetCode Session API |

---

## 📂 Project Structure

```text
StudyBuddy/
├── client/                     # Frontend Application (React 19 + Vite)
│   ├── public/                 # Static assets & _headers (Cloudflare production caching)
│   ├── src/
│   │   ├── components/         # Modular UI components (TopBar, Sidebar, Modals, Heatmap)
│   │   ├── context/            # Global Auth & Theme context providers
│   │   ├── hooks/              # Custom React hooks (useSettings, etc.)
│   │   ├── pages/              # Dashboard, Practice, Prephub, YouTubeHub, Settings
│   │   └── api/                # Axios API instance with token interceptors
│   └── package.json
│
├── extension/                  # Companion Browser Extension (Manifest V3)
│   ├── icons/                  # Official flame monogram brand icons (16, 32, 48, 128)
│   ├── manifest.json           # MV3 extension configuration & host permissions
│   ├── popup.html / popup.js   # Obsidian popup controller & Option B platform switcher
│   ├── background.js           # Service worker handling batch sync & CORS bypass
│   ├── content.js              # In-page submission listener & floating solved badge
│   └── README.md               # Extension installation & developer guide
│
├── server/                     # Backend API Server (Node.js + Express)
│   ├── controllers/            # Practice, Playlist, Auth, Settings, Streak controllers
│   ├── models/                 # Mongoose schemas (User, UserCodingProgress, DailyActivity)
│   ├── routes/                 # Express route definitions
│   ├── services/               # LeetCode service, YouTube API integration
│   ├── data/                   # Embedded catalogs (Codeforces ladder, Striver, NeetCode)
│   └── server.js               # Application entrypoint
│
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started Locally

### Prerequisites
* **Node.js** (v18.x or later)
* **npm** (v9.x or later)
* **MongoDB** (Local instance or MongoDB Atlas cluster URI)
* **YouTube Data API v3 Key** (from Google Cloud Console)

### 1. Clone the Repository
```bash
git clone https://github.com/anmolkapoor2006/StudyBuddy.git
cd StudyBuddy
```

### 2. Configure Backend Environment
Create a `.env` file inside `server/`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/studybuddy?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key
YOUTUBE_API_KEY=your_google_youtube_api_key
```

### 3. Configure Frontend Environment
Create a `.env` file inside `client/`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Start the Application
Open two terminal windows:

**Terminal 1 — Backend API:**
```bash
cd server
npm install
npm run dev
```

**Terminal 2 — Frontend Client:**
```bash
cd client
npm install
npm run dev
```

Open **`http://localhost:5173`** in your browser!

---

## 🔌 Installing the Extension

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked** and select the **`StudyBuddy/extension`** directory.
4. Pin the extension to your toolbar, open StudyBuddy in a tab, and click **Auto-Detect Token from Open Tab**!

---

## 🌐 Cloudflare Pages Deployment (Frontend)

StudyBuddy is optimized for **Cloudflare Pages** with native Single Page Application (SPA) routing:

1. In Cloudflare Dashboard, go to **Workers & Pages** ➔ **Create application** ➔ **Pages** ➔ **Connect to Git**.
2. Select repository: `anmolkapoor2006/StudyBuddy`.
3. Configure build settings:
   * **Framework preset**: `Vite`
   * **Root directory**: `client`
   * **Build command**: `npm run build`
   * **Build output directory**: `dist`
4. Add Environment Variable:
   * `VITE_API_URL`: `https://your-backend-api-url.com/api`
5. Click **Save and Deploy**!

---

## 📜 License & Author

Developed by **Anmol Kapoor**. Distributed under the **MIT License**.