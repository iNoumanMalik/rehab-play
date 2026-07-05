interface ComboDisplayProps {
  combo: number;
  multiplier: number;
}

export function ComboDisplay({ combo, multiplier }: ComboDisplayProps) {
  if (combo < 3) return null;

  const colors = ['#FF6B6B', '#FFD740', '#69F0AE', '#40C4FF', '#E040FB'];
  const color = colors[Math.min(multiplier - 1, colors.length - 1)];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
      <div
        className="text-2xl sm:text-3xl font-extrabold tabular-nums drop-shadow-lg animate-[bounceIn_0.3s_ease-out]"
        style={{ color }}
      >
        🔥 {combo}x Combo! ({multiplier}x Points)
      </div>
    </div>
  );
}
