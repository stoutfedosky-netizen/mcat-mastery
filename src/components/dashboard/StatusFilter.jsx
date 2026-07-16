const FILTERS = [
  { id: "all", label: "All" },
  { id: "unseen", label: "Unseen" },
  { id: "incorrect", label: "Incorrect" },
  { id: "flagged", label: "Flagged" },
];

export default function StatusFilter({
  statusFilter,
  onSelect,
  counts = {},
}) {
  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-3 text-sm">
        Question Status
      </h3>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = statusFilter === f.id;
          const count = counts[f.id];
          const hasCount = count !== undefined && count !== null;
          return (
            <button
              key={f.id}
              onClick={() => onSelect(f.id)}
              className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all border ${
                active
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              {f.label}
              {hasCount && (
                <span
                  className={`ml-1.5 text-xs ${
                    active ? "text-blue-500" : "text-gray-400"
                  }`}
                >
                  ({count})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
