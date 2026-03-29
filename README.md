# STABILITY OS v1

<div align="center">

**A behavioral regulation operating system that replaces chaos with stability**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-purple.svg)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.1-green.svg)](https://capacitorjs.com/)

</div>

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Core Principle](#-core-principle)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Setup](#environment-setup)
  - [Running the App](#running-the-app)
- [Building for Production](#-building-for-production)
- [Mobile Development](#-mobile-development)
- [Project Structure](#-project-structure)
- [Tech Stack](#-tech-stack)
- [How It Works](#-how-it-works)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**STABILITY OS** is not a productivity tracker, habit streak app, or mood logger. It's a **daily operating system** that detects your mental-behavioral state at any given time and delivers the appropriate environment, task sequence, or protocol to maintain stability.

The app is designed to **intercept behavioral failure points** — especially the vulnerable 4–7 PM transition window — with pre-programmed environment responses that replace oscillation (chaos → guilt → spike → collapse) with a stable execution loop.

### What This App IS:
- ✅ A state-aware daily execution engine
- ✅ A rule compliance tracker (4 core rules)
- ✅ An urge interruption protocol
- ✅ A failure containment and re-entry system
- ✅ A weekly self-calibration loop
- ✅ An identity reinforcement layer (execution count, not streaks)

### What This App IS NOT:
- ❌ Not a streak counter (streaks create shame on failure)
- ❌ Not a dopamine reward system (no badges, confetti, or points)
- ❌ Not a notification spammer (the system is calm and firm)
- ❌ Not a mood tracker (only execution count matters)

---

## 🧠 Core Principle

```
Environment > State > Action > Identity
```

Most behavioral failures happen not from lack of motivation but from **unstructured transitions**. STABILITY OS controls the environment to create stable behavioral loops.

### The Two Loops:

**OLD LOOP (Chaos):**
```
Fatigue → Bed → Screen → Relapse → Guilt → Night spike → Sleep late
```

**NEW LOOP (Stability):**
```
Fatigue → Movement → Business → Controlled reward → Sleep early → Stable morning
```

---

## ✨ Key Features

### 🕐 **5-State Time Machine**
The app runs on a time-based state machine. You're always in exactly ONE of five states:
1. **Morning Activation** (8:15–9:00 AM) - Boot sequence with checklist
2. **External Demand** (9:00 AM–4:00 PM) - College/work hours, minimal interference
3. **Vulnerable Transition** (4:00–5:00 PM) - 6-step mandatory reset sequence
4. **Controlled Output** (5:00–9:45 PM) - Deep work + controlled reward windows
5. **Shutdown Protocol** (9:45 PM+) - Hard close, wind-down mode

### 🔒 **Smart Lock System**
- Social media locked until morning checklist complete
- Social media locked during 4 PM reset sequence
- Adult content blocked at network level (DNS filtering)
- All features locked during shutdown mode

### 📊 **Offline-First Sync Engine**
- Uses Dexie (IndexedDB) for local-first data storage
- Syncs with Supabase backend when online
- Zero-latency UI - works completely offline
- Background sync on reconnection

### 🚨 **Behavioral Protocols**
- **Urge Overlay**: 3-step interruption protocol when urges hit
- **Failure Recovery**: Containment system with 24h cooldown
- **Sleep Mode**: Enforced shutdown with limited functionality

### 📱 **Cross-Platform**
- Web application (React + Vite)
- Android app (Capacitor)
- iOS ready (requires Xcode setup)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│           React UI Layer                    │
│  (Views, Components, Overlays)              │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│       State Management (Zustand)            │
│  - App State (tabs, overlays, modes)        │
│  - Auth State (user, profile, onboarding)   │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│    Business Logic Layer                     │
│  - TimeEngine (state detection)             │
│  - SyncEngine (data synchronization)        │
│  - NotificationEngine (local notifications) │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│         Data Layer                          │
│  - Dexie (IndexedDB - offline storage)      │
│  - Supabase (PostgreSQL - cloud backend)    │
└─────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** (comes with Node.js)
- **Git** - [Download](https://git-scm.com/)

For mobile development:
- **Android Studio** (for Android) - [Download](https://developer.android.com/studio)
- **Xcode** (for iOS, macOS only) - [Download](https://developer.apple.com/xcode/)

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/yourusername/stability-os.git
cd stability-os
```

2. **Install dependencies:**

```bash
npm install
```

### Environment Setup

1. **Create environment file:**

```bash
# Copy the example environment file
cp .env.example .env.local
```

2. **Configure Supabase:**

You need a Supabase project for backend functionality. Get your credentials at [supabase.com](https://supabase.com):

```env
# .env.local
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Database Setup:**

The app uses the following Supabase tables:
- `users` - User authentication data
- `user_profiles` - Extended user profile information
- `time_blocks` - Daily execution blocks and checklists
- `rule_violations` - Compliance tracking
- `urge_logs` - Urge protocol tracking
- `failure_logs` - Failure recovery tracking
- `weekly_closures` - Weekly review data

*See [Database Schema Documentation](docs/database-schema.md) for complete schema* (if available)

### Running the App

**Development server (web):**

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

**Preview production build:**

```bash
npm run build
npm run preview
```

---

## 📦 Building for Production

**Build for web:**

```bash
npm run build
```

The production files will be in the `dist/` directory.

---

## 📱 Mobile Development

This project uses **Capacitor** to deploy to iOS and Android.

### Android Setup

1. **Build the web app:**

```bash
npm run build
```

2. **Sync with Capacitor:**

```bash
npx cap sync android
```

3. **Open in Android Studio:**

```bash
npx cap open android
```

4. **Run on device/emulator** from Android Studio

### iOS Setup

1. **Build the web app:**

```bash
npm run build
```

2. **Sync with Capacitor:**

```bash
npx cap sync ios
```

3. **Open in Xcode:**

```bash
npx cap open ios
```

4. **Run on device/simulator** from Xcode

### Installing Capacitor (if needed)

```bash
# Run the provided batch script (Windows)
install_cap.bat

# Or manually install
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add android
npx cap add ios
```

---

## 📂 Project Structure

```
stability-os/
├── src/
│   ├── components/          # React components
│   │   ├── layout/         # PhoneFrame and layout components
│   │   ├── logic/          # TimeEngine, business logic components
│   │   ├── ui/             # Reusable UI components
│   │   └── views/          # Full-screen views (Home, Auth, Settings, etc.)
│   ├── hooks/              # Custom React hooks
│   │   ├── useNotifications.js
│   │   └── useSyncEngine.js
│   ├── lib/                # Utilities and libraries
│   │   └── db.js           # Dexie database configuration
│   ├── store/              # Zustand state management
│   │   ├── useAppStore.js  # App-level state
│   │   └── useAuthStore.js # Authentication state
│   ├── App.jsx             # Root application component
│   ├── main.jsx            # Application entry point
│   └── index.css           # Global styles (Tailwind)
├── android/                # Android Capacitor project
├── dist/                   # Production build output
├── public/                 # Static assets
├── capacitor.config.json   # Capacitor configuration
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind CSS configuration
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18.3** - UI library
- **Vite 6.0** - Build tool and dev server
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Lucide React** - Icon library

### State Management
- **Zustand 5.0** - Lightweight state management
- **Dexie 4.3** - IndexedDB wrapper for offline storage
- **dexie-react-hooks** - React hooks for Dexie

### Backend & Sync
- **Supabase** - PostgreSQL backend, authentication, real-time sync
- **@supabase/supabase-js** - JavaScript client

### Mobile
- **Capacitor 8.1** - Cross-platform native runtime
- **@capacitor/android** - Android platform
- **@capacitor/local-notifications** - Native notifications

### Dev Tools
- **ESLint** - JavaScript linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixes

---

## 🎮 How It Works

### State Detection
The **TimeEngine** component runs continuously and detects which of the 5 states you're in based on device time:

```javascript
// Simplified logic
if (time >= 8:15 && time < 9:00) → STATE 1: Morning Activation
if (time >= 9:00 && time < 16:00) → STATE 2: External Demand
if (time >= 16:00 && time < 17:00) → STATE 3: Vulnerable Transition
if (time >= 17:00 && time < 21:45) → STATE 4: Controlled Output
if (time >= 21:45) → STATE 5: Shutdown Protocol
```

### Lock Logic
Certain actions are locked until conditions are met:

- **Morning**: Social media locked until 5/5 checklist items complete
- **4 PM Reset**: Social media locked until all 6 steps complete (including 30-min business block)
- **Shutdown**: All features except wind-down checklist locked

### Offline-First Sync
1. **First login**: App syncs data from Supabase → Dexie
2. **Subsequent logins**: App loads from Dexie immediately (instant UI)
3. **Background sync**: Syncs with Supabase silently in background
4. **Offline mode**: App works fully offline, queues changes for next sync

### Behavioral Protocols

**Urge Protocol** (when user hits "I'm feeling an urge"):
1. Acknowledge the urge (no shame)
2. 5-minute timer + physical reset (water, pushups, walk)
3. Re-orient to current block task

**Failure Recovery** (after a rule violation):
1. 24-hour cooldown period
2. Reflection journal entry
3. No shame messaging - just data logging
4. Return to normal execution next day

---

## 🤝 Contributing

We welcome contributions! STABILITY OS is built to help people create stable behavioral loops, and your input can make it better.

### How to Contribute

1. **Fork the repository**

2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes:**
   - Follow existing code style
   - Add comments for complex logic
   - Test thoroughly

4. **Commit your changes:**
   ```bash
   git commit -m "feat: add your feature description"
   ```
   
   Use conventional commits:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding or updating tests
   - `chore:` - Maintenance tasks

5. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request:**
   - Describe what you changed and why
   - Reference any related issues
   - Include screenshots for UI changes

### Development Guidelines

- **Code Style**: Follow the existing patterns in the codebase
- **Component Structure**: Use functional components with hooks
- **State Management**: Use Zustand stores for shared state
- **Styling**: Use Tailwind CSS utility classes
- **Comments**: Add `@intent` comments for complex components (see existing examples)
- **Testing**: Test on both web and mobile (if possible)

### Areas We Need Help

- 🎨 **UI/UX Design**: Improving the interface while maintaining the "calm and firm" aesthetic
- 📱 **iOS Testing**: We need iOS testers and developers
- 🌍 **Localization**: Translating the app to other languages
- 📚 **Documentation**: Improving docs, tutorials, setup guides
- 🐛 **Bug Fixes**: Check the [Issues](https://github.com/yourusername/stability-os/issues) page
- ✨ **New Features**: Propose new protocols or state detection improvements

### Code of Conduct

- Be respectful and constructive
- Focus on the problem, not the person
- Assume good intent
- This app is about stability, not perfection - bring that energy to your contributions

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

Copyright © 2026 Priyanshu Thakare

---

## 🙏 Acknowledgments

- Built with the principle: **Environment > State > Action > Identity**
- Inspired by behavioral psychology and systems thinking
- Designed for people who want to replace chaos with stable execution

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/stability-os/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/stability-os/discussions)

---

<div align="center">

**Built to replace oscillation with stability.**

⭐ Star this repo if it helps you build stable behavioral loops!

</div>