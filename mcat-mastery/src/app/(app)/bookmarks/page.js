"use client";
import { useRouter } from "next/navigation";
import { useApp } from "../../../context/AppContext";
import { SECTIONS } from "../../../lib/examData";

export default function BookmarksPage() {
  const router = useRouter();
  const {
    flaggedQuestionIds,
    setSelectedSections,
    setStatusFilter,
    setSelectedMode,
  } = useApp();

  const practiceFlagged = () => {
    setSelectedSections(SECTIONS.map((s) => s.id));
    setStatusFilter("flagged");
    setSelectedMode("practice");
    router.push("/practice");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bookmarks</h1>
        <p className="text-gray-500 mt-1">
          Questions you flagged during practice sessions.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>

        {flaggedQuestionIds.size === 0 ? (
          <>
            <h3 className="font-semibold text-gray-900 mb-1">No bookmarks yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Flag questions during a practice session and they'll appear here so
              you can revisit them later.
            </p>
          </>
        ) : (
          <>
            <h3 className="font-semibold text-gray-900 mb-1">
              {flaggedQuestionIds.size} flagged question
              {flaggedQuestionIds.size === 1 ? "" : "s"}
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-5">
              Start a practice session made up of only your flagged questions.
            </p>
            <button
              onClick={practiceFlagged}
              className="px-6 py-2.5 rounded-lg font-semibold text-white text-sm transition-all hover:opacity-90"
              style={{ background: "#1a3a5c" }}
            >
              Practice Flagged Questions
            </button>
          </>
        )}
      </div>
    </div>
  );
}
