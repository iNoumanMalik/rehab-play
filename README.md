# RehabPlay

**RehabPlay** is a gamified physiotherapy platform that uses real-time motion tracking to transform traditional rehabilitation exercises into engaging and interactive games.

By combining **React**, **MediaPipe Pose**, and **HTML5 Canvas**, RehabPlay allows users to perform physiotherapy exercises while interacting with games based on their body movements.

## Features

* **Real-Time Motion Tracking**
  Uses MediaPipe Pose to detect and track body movements through the device's webcam.

* **Interactive Physiotherapy Games**

  * 🦋 **Butterfly Catch** – Improves hand-eye coordination and upper-body movement.
  * 🍎 **Fruit Reach** – Encourages arm extension and helps improve range of motion.
  * 💪 **Arm Raise Exercise** – Supports arm strengthening through guided movement and repetition counting.

* **Modern User Interface**
  Features a responsive and visually appealing interface with modern glassmorphism effects.

* **Accessibility Focused**
  Designed with accessibility in mind, including appropriate ARIA labels and WCAG 2.1 considerations.

* **Cross-Platform Support**
  Runs directly in modern desktop and mobile web browsers without requiring a separate application.

## Tech Stack

* **Frontend:** React 19 + TypeScript
* **Build Tool:** Vite
* **Styling:** Tailwind CSS
* **Motion Tracking:** MediaPipe Tasks Vision
* **Game Rendering:** HTML5 Canvas

## Getting Started

### Prerequisites

Make sure you have the following installed:

* Node.js 18 or higher
* npm or Yarn
* A device with a working webcam/camera

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd rehab-play
```

2. Install the project dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
```

4. Open the application in your browser:

```text
http://localhost:5173
```

5. Allow webcam access when prompted.

## Building for Production

To create an optimized production build, run:

```bash
npm run build
```

## Project Structure

```text
src/
├── components/
│   └── Webcam.tsx
│
├── games/
│   ├── ButterflyCatch.tsx
│   ├── FruitReach.tsx
│   └── ArmRaiseExercise.tsx
│
├── hooks/
│   └── usePoseTracking.ts
│
├── types/
│   └── index.ts
│
├── utils/
│   └── webcamManager.ts
│
├── App.tsx
├── main.tsx
└── index.css
```

## Main Components

* **Webcam.tsx** – Handles webcam access and video display.
* **ButterflyCatch.tsx** – Implements the Butterfly Catch rehabilitation game.
* **FruitReach.tsx** – Implements the Fruit Reach movement exercise.
* **ArmRaiseExercise.tsx** – Provides arm-raising exercises with repetition tracking.
* **usePoseTracking.ts** – Custom React hook responsible for real-time pose detection.
* **webcamManager.ts** – Manages the webcam stream through a centralized utility.
* **App.tsx** – Controls the main application flow and game selection.

## How It Works

1. The user opens RehabPlay and grants webcam permission.
2. The webcam captures the user's movements.
3. MediaPipe Pose detects important body landmarks in real time.
4. The detected movements are passed to the selected game.
5. The game responds to the user's movements and provides interactive feedback.
6. Users complete rehabilitation exercises through movement-based gameplay.

## How to Use

1. Launch the RehabPlay application.
2. Allow webcam access when prompted.
3. Wait for motion tracking to initialize.
4. Select one of the available physiotherapy games.
5. Read the instructions displayed on the screen.
6. Perform the required movements in front of the camera.
7. Follow the game's feedback and exercise objectives.
8. Click **Stop Game** to return to the main menu.

## Future Enhancements

* Progress tracking dashboard
* Therapist monitoring portal
* AI-based exercise assessment
* Advanced movement and posture analysis
* Additional physiotherapy games
* Personalized rehabilitation programs
* Exercise history and performance analytics
* Mobile application support

## License

This project is licensed under the **MIT License**.
