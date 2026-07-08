"use client";
import { AppProvider, useApp } from "../../context/AppContext";
import AppShell from "../../components/layout/AppShell";
import ExamInterface from "../../components/ExamInterface";

function AppFrame({ children }) {
  const {
    authLoading,
    activeExam,
    saveResults,
    buildMissedSession,
    exitExam,
  } = useApp();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  if (activeExam) {
    return (
      <ExamInterface
        questions={activeExam.questions}
        sectionName={activeExam.sectionName}
        sectionAbbr={activeExam.sectionAbbr}
        sectionColor={activeExam.sectionColor}
        timeLimit={activeExam.timeLimit}
        testMode={activeExam.testMode}
        initialAnswers={activeExam.savedAnswers || null}
        startInReview={activeExam.reviewMode || false}
        onComplete={
          activeExam.reviewMode
            ? null
            : (results) => {
                saveResults(results);
              }
        }
        onReattemptMissed={
          activeExam.reviewMode
            ? null
            : (missedIds, sessionAnswers) => buildMissedSession(missedIds, sessionAnswers, false)
        }
        onReviewMissed={
          activeExam.reviewMode
            ? null
            : (missedIds, sessionAnswers) => buildMissedSession(missedIds, sessionAnswers, true)
        }
        onExit={exitExam}
      />
    );
  }

  return <AppShell>{children}</AppShell>;
}

export default function AppLayout({ children }) {
  return (
    <AppProvider>
      <AppFrame>{children}</AppFrame>
    </AppProvider>
  );
}
