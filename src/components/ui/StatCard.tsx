interface StatCardProps {
  value: string | number;
  label: string;
  gradient: string;
  border: string;
  textColor: string;
  id?: string;
}

export function StatCard({ value, label, gradient, border, textColor, id }: StatCardProps) {
  return (
    <div className={`bg-gradient-to-br ${gradient} border ${border} rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center backdrop-blur-md shadow-lg shadow-black/20`}>
      <div
        id={id}
        className={`text-3xl sm:text-4xl lg:text-5xl font-extrabold ${textColor} mb-1 sm:mb-2 tabular-nums tracking-tight`}
        aria-live="polite"
      >
        {value}
      </div>
      <div className="text-[10px] sm:text-xs text-white/60 font-bold uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}
