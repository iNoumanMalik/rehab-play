interface ComboDisplayProps {
  combo: number;
  multiplier: number;
}

export function ComboDisplay({ combo, multiplier }: ComboDisplayProps) {
  if (combo < 3) return null;

  return (
    <div className="absolute top-28 sm:top-32 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div className="px-4 py-1.5 rounded-full bg-black/55 border border-on-dark-accent/50 backdrop-blur-md shadow-1 text-lg sm:text-xl font-extrabold tabular-nums text-on-dark-accent animate-[bounceIn_0.3s_ease-out]">
        🔥 {combo}x Combo! ({multiplier}x Points)
      </div>
    </div>
  );
}
