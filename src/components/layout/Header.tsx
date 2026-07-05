interface HeaderProps {
  isCameraOn: boolean;
  videoReady: boolean;
  isReady: boolean;
  onToggleCamera: () => void;
}

export function Header({ isCameraOn, videoReady, isReady, onToggleCamera }: HeaderProps) {
  return (
    <header className="relative z-20 bg-[#070B1A]/80 backdrop-blur-xl border-b border-white/[0.08] sticky top-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="relative w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 rounded-xl sm:rounded-2xl animate-pulse opacity-60 blur-md" />
              <div className="relative w-full h-full bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl border border-white/20">
                <span className="text-xl sm:text-2xl">⚡</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-violet-200 via-purple-200 to-pink-200 bg-clip-text text-transparent tracking-tight">
                RehabPlay
              </h1>
              <p className="text-[10px] sm:text-xs text-white/60 font-semibold tracking-widest uppercase mt-0.5">
                Gamified Physiotherapy
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onToggleCamera}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full text-xs sm:text-sm font-bold border transition-all duration-300 shadow-md cursor-pointer focus-visible:ring-4 focus-visible:ring-violet-500/50 outline-none ${
                isCameraOn
                  ? 'bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border-violet-500/40 hover:border-violet-500/60'
                  : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border-rose-500/40 hover:border-rose-500/60'
              }`}
              aria-label={isCameraOn ? 'Turn camera off' : 'Turn camera on'}
            >
              {isCameraOn ? '📹 Camera On' : '📹 Camera Off'}
            </button>

            {isCameraOn && videoReady && (
              <span className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 bg-emerald-500/20 text-emerald-200 rounded-full text-xs sm:text-sm font-semibold border border-emerald-500/40 shadow-sm shadow-emerald-500/10">
                <span className="relative w-2.5 h-2.5">
                  <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />
                  <span className="relative block w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                </span>
                Camera Active
              </span>
            )}
            {isCameraOn && videoReady && !isReady && (
              <span className="hidden sm:flex items-center gap-2 px-3.5 py-2.5 bg-amber-500/20 text-amber-200 rounded-full text-xs sm:text-sm font-semibold border border-amber-500/40 shadow-sm shadow-amber-500/10 animate-pulse">
                <span className="w-2.5 h-2.5 bg-amber-400 rounded-full" />
                Loading Pose
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
