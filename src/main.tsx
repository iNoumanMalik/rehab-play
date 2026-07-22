import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router.tsx'
import { settingsStore } from './core/services/SettingsStore'

// Stamp theme/accessibility attributes before the first paint so there's no
// flash of the wrong theme/contrast/text-size on load. App.tsx keeps these in
// sync reactively for the rest of the session.
function applyRootAttributes(): void {
  const s = settingsStore.get();
  const root = document.documentElement;
  root.dataset.theme = s.theme;
  root.dataset.contrast = s.highContrast ? 'high' : 'normal';
  root.dataset.textSize = s.textSize;
  root.dataset.dyslexia = String(s.dyslexiaFont);
  root.classList.toggle('reduce-motion', s.reducedMotion);
}
applyRootAttributes();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
