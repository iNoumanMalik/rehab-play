import { createBrowserRouter } from 'react-router-dom';
import App from './App';
import { LandingPage } from './pages/LandingPage';
import { PlayChrome } from './pages/PlayChrome';
import { ProgressPage } from './pages/ProgressPage';

/**
 * App is the persistent layout route: it owns the camera stream, MediaPipe
 * pose loop, and session state, none of which may unmount on navigation (see
 * Stage.tsx / usePoseEngine). Routing only swaps the page chrome rendered in
 * its <Outlet/> — the landing gallery vs. the in-session stats panel.
 */
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'play/:gameId', element: <PlayChrome /> },
      { path: 'progress', element: <ProgressPage /> },
    ],
  },
]);
