import { SettingsMenu } from '../ui/SettingsMenu';
import { Badge } from '../ui/primitives/Badge';
import { useSettings } from '../../hooks/useSettings';

interface HeaderProps {
  isCameraOn: boolean;
  videoReady: boolean;
  isReady: boolean;
  onToggleCamera: () => void;
}

export function Header({ isCameraOn, videoReady, isReady, onToggleCamera }: HeaderProps) {
  const [{ reducedMotion }] = useSettings();
  return (
    <header className="relative z-20 bg-bg/80 backdrop-blur-xl border-b border-border sticky top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0">
              <div className={`absolute inset-0 bg-accent rounded-xl sm:rounded-2xl opacity-40 blur-md ${reducedMotion ? '' : 'animate-pulse'}`} />
              <div className="relative w-full h-full bg-accent rounded-xl sm:rounded-2xl flex items-center justify-center shadow-1">
                <span className="text-xl sm:text-2xl">⚡</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-text font-display tracking-tight">
                RehabPlay
              </h1>
              <p className="text-[10px] sm:text-xs text-muted font-semibold tracking-widest uppercase mt-0.5">
                Gamified Physiotherapy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleCamera}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full text-xs sm:text-sm font-bold border transition-all duration-[var(--dur-base)] shadow-1 cursor-pointer focus-visible:ring-4 focus-visible:ring-[var(--color-focus-ring)]/40 outline-none ${
                isCameraOn
                  ? 'bg-accent/15 hover:bg-accent/25 text-accent-text border-accent/30 hover:border-accent/50'
                  : 'bg-danger/15 hover:bg-danger/25 text-danger border-danger/30 hover:border-danger/50'
              }`}
              aria-label={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
            >
              {isCameraOn ? '📹 Camera On' : '📹 Camera Off'}
            </button>

            {isCameraOn && videoReady && (
              <span className="hidden sm:inline-flex">
                <Badge tone="success">
                  <span className="relative w-2.5 h-2.5">
                    <span className="absolute inset-0 bg-success rounded-full animate-ping opacity-75" />
                    <span className="relative block w-2.5 h-2.5 bg-success rounded-full" />
                  </span>
                  Camera Active
                </Badge>
              </span>
            )}
            {isCameraOn && videoReady && !isReady && (
              <span className="hidden sm:inline-flex animate-pulse">
                <Badge tone="warning">
                  <span className="w-2.5 h-2.5 bg-warning rounded-full" />
                  Loading Pose
                </Badge>
              </span>
            )}
            <SettingsMenu />
          </div>
        </div>
      </div>
    </header>
  );
}
