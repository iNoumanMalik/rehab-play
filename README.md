# RehabPlay

Gamified physiotherapy platform using real-time motion tracking! Transform boring exercises into fun games.

## Features

- **Real-time Motion Tracking**: Uses MediaPipe Pose to track your body movements
- **3 Interactive Games**:
  - 🦋 Butterfly Catch - Improve hand-eye coordination
  - 🍎 Fruit Reach - Increase range of motion
  - 💪 Arm Raise Exercise - Build strength with repetition counting
- **Beautiful UI**: Modern, responsive design with glass-morphism effects
- **Accessible**: WCAG 2.1 compliant with proper ARIA labels
- **Cross-Platform**: Works on desktop and mobile browsers

## Tech Stack

- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- MediaPipe Tasks Vision (pose tracking)
- HTML5 Canvas (game rendering)

## Getting Started

### Prerequisites

- Node.js >= 18
- npm or yarn

### Installation

1. Clone the repo:
```bash
git clone <your-repo-url>
cd rehab-play
```

2. Install dependencies:
```bash
npm install
```

3. Run development server:
```bash
npm run dev
```

4. Open your browser at [http://localhost:5173](http://localhost:5173)
5. Allow webcam access when prompted!

### Building for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/
│   └── Webcam.tsx         # Webcam component
├── games/
│   ├── ButterflyCatch.tsx # Butterfly Catch game
│   ├── FruitReach.tsx     # Fruit Reach game
│   └── ArmRaiseExercise.tsx # Arm Raise game
├── hooks/
│   └── usePoseTracking.ts # Custom hook for pose tracking
├── types/
│   └── index.ts           # TypeScript type definitions
├── utils/
│   └── webcamManager.ts   # Singleton for managing webcam stream
├── App.tsx                # Main app component
├── main.tsx               # App entry point
└── index.css              # Global styles (Tailwind directives)
```

## How to Use

1. When you open the app, allow webcam permissions
2. Wait for motion tracking to initialize
3. Click on any game to start playing!
4. Follow the game instructions
5. Click "Stop Game" to return to the menu

## Future Enhancements

- Progress tracking dashboard
- Therapist monitoring portal
- AI-based exercise assessment
- More games!
- Mobile app support

## License

MIT
