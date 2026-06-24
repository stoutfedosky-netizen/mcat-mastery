export default function ReviewQueue({ missedCount, flaggedCount, onReviewMissed }) {
  const empty = missedCount === 0 && flaggedCount === 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 mb-4">Review Queue</h3>

      {empty ? (
        <p className="text-sm text-gray-400">
          Complete some practice to build your review queue.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-50/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800">Missed</div>
                <div className="text-xs text-gray-500">{missedCount} to review</div>
              </div>
            </div>
            {missedCount > 0 && onReviewMissed && (
              <button
                onClick={onReviewMissed}
                className="text-xs font-semibold text-red-600 hover:text-red-800 px-3 py-1 rounded-md hover:bg-red-100 transition-colors"
              >
                Practice
              </button>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-4 h-4 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                  />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-800">Flagged</div>
                <div className="text-xs text-gray-500">{flaggedCount} flagged</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
