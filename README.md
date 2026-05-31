# 🧠 MindSweep

> **Dump your thoughts. AI handles the rest.**

MindSweep is a React Native mobile app that turns chaotic brain dumps into organised, actionable task lists — powered by Groq AI. Speak or type whatever's on your mind and watch it instantly become a structured to-do list.

---

## 🤔 The Problem

You have 20 things running through your head at once. Opening a task app and entering them one-by-one breaks your flow. You end up either forgetting half of them or spending more time organising than doing.

**MindSweep solves this** by letting you dump everything in one go — voice or text — and letting AI do the sorting, prioritising, and labelling automatically.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎤 **Voice Input** | Speak your thoughts — Groq Whisper transcribes in real time |
| 🤖 **AI Extraction** | LLaMA 3.3 70B identifies tasks, priorities, and due dates automatically |
| 📋 **Smart Task List** | Filter by status, sort by priority / due date / created date |
| 🔍 **Search** | Instant search across all your tasks by name |
| 💾 **Local Persistence** | All data stored on-device via AsyncStorage — works offline |
| 👤 **User Personalisation** | Name, avatar initials, and stats on your profile |
| 🌙 **Dark Mode** | Deep navy design system, easy on the eyes |
| ✏️ **Inline Editing** | Edit tasks directly from the expanded card |
| 📤 **Export** | Export all tasks as JSON or CSV via the share sheet |
| 🎬 **Animations** | Smooth transitions, mic waveform visualiser, spring interactions |

---

## 🛠 Tech Stack

```
Frontend      React Native · Expo SDK 54 · Expo Router
AI            Groq API — LLaMA 3.3 70B (extraction) · Whisper large v3 (speech-to-text)
Storage       AsyncStorage (on-device, offline-first)
Navigation    Expo Router (file-based, tab + stack)
State         React Hooks (useState · useEffect · useMemo · useCallback)
Animations    React Native Reanimated 4
Styling       React Native StyleSheet (custom design system)
Build         Expo EAS Build (cloud Android/iOS builds)
```

---

## 🏗 Architecture

### Component Structure

```
app/
├── (tabs)/
│   ├── index.tsx       ← HomeScreen  (brain dump + voice input)
│   ├── tasks.tsx       ← TaskList    (filter · sort · search · edit)
│   └── settings.tsx    ← Settings    (preferences · data · about)
├── profile.tsx         ← Profile     (stats · edit name · export · delete)
├── onboarding.tsx      ← Onboarding  (first-launch name capture)
└── _layout.tsx         ← Root layout (splash · auth check · navigation)
```

### Services

```
services/
├── groqService.ts      ← Groq API calls (task extraction + audio transcription)
├── storageService.ts   ← AsyncStorage CRUD for tasks
└── userService.ts      ← AsyncStorage for user name + initials helper
```

### Data Flow

```
User speaks / types
       ↓
groqService.extractTasksFromGroq()
       ↓  (LLaMA 3.3 70B via Groq API)
ExtractedTask[] { title, priority, dueDate }
       ↓
storageService.saveTasks()   ←→   AsyncStorage
       ↓
TaskList renders with filter / sort / search
```

### Voice Flow

```
Tap mic → expo-av records audio (.m4a)
       ↓
groqService.transcribeAudio()
       ↓  (Whisper large v3 via Groq API)
Transcript text → injected into brain dump input
```

---

## 🚀 Running Locally

### Prerequisites

- Node.js 18+
- npm or yarn
- [Expo Go](https://expo.dev/go) app on your phone
- A free [Groq API key](https://console.groq.com)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/your-username/MindSweep.git
cd MindSweep

# 2. Install dependencies
npm install

# 3. Create your environment file
echo 'EXPO_PUBLIC_GROQ_API_KEY=your_groq_key_here' > .env

# 4. Start the dev server
npx expo start --clear

# 5. Scan the QR code with Expo Go (Android) or Camera (iOS)
```

> **Note:** The splash screen and custom app icon only appear in native builds, not in Expo Go.

---

## 📱 How to Use

### First Launch
On first open, MindSweep asks for your name. This personalises your greeting, avatar initials, and profile stats.

### HomeScreen — Capture
1. Type your thoughts freely in the brain dump box, **or**
2. Tap the 🎤 mic button and speak — it transcribes automatically
3. Tap **Sweep It** — AI extracts tasks with titles, priorities, and due dates
4. Tasks are saved and you're taken to your task list

### TaskList — Organise
- **Filter** by All / Incomplete / Completed
- **Sort** by Status, Priority, Due Date, or Created On
- **Search** by task name
- **Tap a card** to expand details — edit inline or delete
- **Check the checkbox** to mark complete (turns green)

### Profile — Your Stats
- View total tasks, completion rate, top priority
- Edit your display name
- Export all tasks as JSON or CSV
- Delete profile to start fresh

### Settings
- View AI model info
- Clear all tasks
- Share suggestions / feedback

---

## 📁 Project Structure

```
MindSweep/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx       # Tab bar configuration
│   │   ├── index.tsx         # HomeScreen
│   │   ├── tasks.tsx         # TaskList
│   │   └── settings.tsx      # Settings
│   ├── _layout.tsx           # Root stack + splash + onboarding check
│   ├── onboarding.tsx        # First-launch name screen
│   └── profile.tsx           # Profile + stats + export
├── services/
│   ├── groqService.ts        # Groq API (LLaMA + Whisper)
│   ├── storageService.ts     # AsyncStorage task CRUD
│   └── userService.ts        # User name storage + initials
├── constants/
│   ├── colors.ts             # Design system colour palette
│   └── prompts.ts            # LLaMA system prompt for extraction
├── assets/
│   └── images/               # App icon, splash, adaptive icons
├── app.json                  # Expo config (permissions, splash, icons)
├── eas.json                  # EAS Build profiles
└── .env                      # EXPO_PUBLIC_GROQ_API_KEY (not committed)
```

---

## 💡 Key Learnings

- **React Native & Expo** — building production-quality mobile apps with file-based routing and managed workflow
- **Groq AI integration** — using LLaMA for structured extraction and Whisper for real-time speech-to-text, both via a single API key
- **AI-assisted development** — built entirely with Claude Code (Anthropic) as the coding assistant, exploring vibe coding as a development workflow
- **Offline-first design** — persisting all data locally with AsyncStorage so the app works without internet (except for AI features)
- **Mobile UX patterns** — LayoutAnimation, Reanimated spring physics, keyboard handling, haptic feedback, tab transitions
- **EAS Build** — cloud-native Android builds without needing a local Android SDK
- **Design systems** — building and maintaining a consistent colour palette, typography scale, and component library across screens

---

## 🔮 Future Improvements

- [ ] **Cloud sync** — user auth + backend so tasks sync across devices
- [ ] **Push notifications** — reminders for tasks with due dates
- [ ] **Recurring tasks** — daily / weekly task templates
- [ ] **Habit tracking** — streaks and completion history
- [ ] **Widgets** — quick capture from the Android/iOS home screen
- [ ] **Web version** — Next.js companion app
- [ ] **Shared lists** — collaborate on task lists with others
- [ ] **Advanced AI** — automatic scheduling, dependency detection, time estimates

---

## 🔑 API & Tools

| Service | Usage | Cost |
|---|---|---|
| [Groq](https://console.groq.com) | LLaMA 3.3 70B + Whisper large v3 | Free tier |
| [Expo](https://expo.dev) | Framework + EAS Build | Free tier |
| [EAS Build](https://expo.dev/eas) | Cloud Android/iOS builds | Free tier |

---

## 🏗 Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Log in to Expo
eas login

# Configure EAS (first time only)
eas build:configure

# Add your Groq API key as a build secret
eas secret:create --scope project --name EXPO_PUBLIC_GROQ_API_KEY --value your_key_here

# Build Android APK (preview)
eas build --platform android --profile preview
```

The finished APK can be installed directly on any Android device. iOS requires an Apple Developer account.

---

## 📸 Screenshots

> *Add screenshots here — Home, TaskList, Profile, Onboarding*

| Home | Tasks | Profile | Settings |
|---|---|---|---|
| *(screenshot)* | *(screenshot)* | *(screenshot)* | *(screenshot)* |

---

## 👤 Contact & Feedback

**Author:** Shivang Rai
**Built:** June 2026
**Feedback:** [mail2me.shivang@gmail.com](mailto:mail2me.shivang@gmail.com)

---

<p align="center">
  Built with 🧠 + <a href="https://groq.com">Groq AI</a> + <a href="https://expo.dev">Expo</a>
  <br/>
  <em>Vibe coded with <a href="https://claude.ai">Claude Code</a></em>
</p>
