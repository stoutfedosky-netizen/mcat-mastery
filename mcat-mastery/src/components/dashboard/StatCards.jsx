export default function StatCards({ stats }) {
  const cards = [
    {
      label: "Questions Done",
      value: stats.questionsCompleted,
      accent: "bg-blue-500",
      ring: "ring-blue-100",
    },
    {
      label: "Accuracy",
      value: stats.questionsCompleted > 0 ? `${stats.overallAccuracy}%` : "--",
      accent: "bg-emerald-500",
      ring: "ring-emerald-100",
    },
    {
      label: "Study Streak",
      value: stats.studyStreak > 0 ? `${stats.studyStreak}d` : "--",
      accent: "bg-amber-500",
      ring: "ring-amber-100",
    },
    {
      label: "Weakest Area",
      value: stats.weakestSection || "--",
      accent: "bg-rose-500",
      ring: "ring-rose-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-2 h-8 rounded-full ${card.accent}`} />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {card.label}
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-900 pl-5">{card.value}</div>
        </div>
      ))}
    </div>
  );
}
