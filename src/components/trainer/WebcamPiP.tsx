interface WebcamPiPProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  ready: boolean;
  error: string | null;
}

/** Small Zoom/Meet-style self-view in the corner — keeps the avatar as the focal point. */
export function WebcamPiP({ videoRef, ready, error }: WebcamPiPProps) {
  return (
    <div className="absolute top-1/2 -translate-y-1/2 right-5 w-36 sm:w-44 aspect-[4/3] rounded-2xl overflow-hidden border-2 border-white/15 shadow-2 bg-black/60 backdrop-blur-sm">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)', opacity: ready ? 1 : 0 }}
      />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-white/60 text-xs font-semibold text-center px-2">
          {error ?? 'Starting camera…'}
        </div>
      )}
      <div className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-full bg-black/50 text-[10px] font-bold text-white/85 tracking-wide">
        You
      </div>
    </div>
  );
}
