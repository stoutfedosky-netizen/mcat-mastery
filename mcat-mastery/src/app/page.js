"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "../lib/supabase";
import ExamInterface from "../components/ExamInterface";

const SECTIONS = [
  { id: "cp", name: "Chemical & Physical Foundations", abbr: "C/P", color: "#0891b2" },
  { id: "cars", name: "Critical Analysis & Reasoning", abbr: "CARS", color: "#7c3aed" },
  { id: "bb", name: "Biological & Biochemical Foundations", abbr: "B/B", color: "#059669" },
  { id: "ps", name: "Psychological, Social & Bio Foundations", abbr: "P/S", color: "#e11d48" },
];

function selectQuestions(allQuestions, count) {
  if (count >= allQuestions.length) return allQuestions;

  const groups = [];
  let current = [];
  for (const q of allQuestions) {
    if (q.passage) {
      if (current.length) groups.push(current);
      current = [q];
    } else if (q.use_prev_passage) {
      current.push(q);
    } else {
      if (current.length) groups.push(current);
      current = [q];
    }
  }
  if (current.length) groups.push(current);

  for (let i = groups.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [groups[i], groups[j]] = [groups[j], groups[i]];
  }

  const selected = [];
  for (const group of groups) {
    if (selected.length >= count) break;
    if (selected.length + group.length <= count) {
      selected.push(...group);
    }
  }

  selected.sort((a, b) => {
    if (a.batch !== b.batch) return (a.batch || "").localeCompare(b.batch || "");
    return (a.sort_order || 0) - (b.sort_order || 0);
  });

  return selected;
}

export default function Dashboard() {
  const [activeExam, setActiveExam] = useState(null);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSections, setSelectedSections] = useState([]);
  const [questionCount, setQuestionCount] = useState(20);
  const [timed, setTimed] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchCounts() {
      const { data, error } = await supabase
        .from("questions")
        .select("section_id");

      if (!error && data) {
        const c = {};
        data.forEach((q) => {
          c[q.section_id] = (c[q.section_id] || 0) + 1;
        });
        setCounts(c);
      }
      setLoading(false);
    }
    fetchCounts();
  }, []);

  const maxAvailable = selectedSections.reduce((sum, id) => sum + (counts[id] || 0), 0);

  const toggleSection = (id) => {
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const startTest = async () => {
    if (selectedSections.length === 0) return;

    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .in("section_id", selectedSections)
      .order("batch", { ascending: true })
      .order("sort_order", { ascending: true });

    if (error || !data || data.length === 0) {
      alert("No questions found for selected sections.");
      return;
    }

    const count = Math.min(questionCount, data.length);
    const selected = selectQuestions(data, count);

    const questions = selected.map((q) => ({
      id: q.id,
      passage: q.passage,
      usePrevPassage: q.use_prev_passage,
      stem: q.stem,
      choices: q.choices,
      correct: q.correct_answer,
      explanations: q.explanations,
      topic: q.topic,
      difficulty: q.difficulty,
    }));

    const sectionNames = selectedSections.map((id) => SECTIONS.find((s) => s.id === id));
    setActiveExam({
      questions,
      sectionName: sectionNames.map((s) => s.name).join(", "),
      sectionAbbr: sectionNames.map((s) => s.abbr).join("/"),
      sectionColor: sectionNames[0].color,
      timeLimit: timed ? questions.length * 95 : null,
      testMode: timed,
    });
  };

  if (activeExam) {
    return (
      <ExamInterface
        questions={activeExam.questions}
        sectionName={activeExam.sectionName}
        sectionAbbr={activeExam.sectionAbbr}
        sectionColor={activeExam.sectionColor}
        timeLimit={activeExam.timeLimit}
        testMode={activeExam.testMode}
        onComplete={(results) => {
          console.log("Exam completed:", results);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-exam">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight">
          MCAT <span className="text-cyan-600">Mastery</span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">Welcome back</span>
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500">
            U
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Test</h1>
        <p className="text-gray-500 mb-8">
          Select sections and configure your practice session.
        </p>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Subjects</h2>
          <div className="grid grid-cols-2 gap-3">
            {SECTIONS.map((sec) => {
              const checked = selectedSections.includes(sec.id);
              const sectionCount = counts[sec.id] || 0;
              return (
                <button
                  key={sec.id}
                  onClick={() => toggleSection(sec.id)}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                    checked
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                      checked ? "border-blue-500 bg-blue-500" : "border-gray-300"
                    }`}
                  >
                    {checked && (
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 16 16"
                        fill="none"
                        stroke="white"
                        strokeWidth="2.5"
                      >
                        <path d="M3 8l3.5 3.5L13 4" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-sm" style={{ color: sec.color }}>
                      {sec.abbr}
                    </div>
                    <div className="text-xs text-gray-600">{sec.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {loading ? "..." : `${sectionCount} questions`}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Number of Questions
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={questionCount}
                  min={1}
                  max={maxAvailable || 999}
                  onChange={(e) =>
                    setQuestionCount(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="w-24 px-3 py-2 border border-gray-300 rounded text-center font-mono text-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                {maxAvailable > 0 && (
                  <span className="text-sm text-gray-500">
                    of {maxAvailable} available
                  </span>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Test Settings</h3>
              <button
                onClick={() => setTimed((t) => !t)}
                className="flex items-center gap-3"
              >
                <div
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    timed ? "bg-blue-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      timed ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </div>
                <span className="text-sm font-medium text-gray-700">Timed</span>
              </button>
              <p className="text-xs text-gray-400 mt-2">
                {timed
                  ? "Countdown timer — section ends when time runs out"
                  : "Count-up timer for self-pacing (no auto-end)"}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={startTest}
          disabled={selectedSections.length === 0}
          className="w-full py-3.5 rounded-xl font-semibold text-white text-lg transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "#2b579a" }}
        >
          {timed ? "Start Test" : "Start Practice"}
        </button>
      </div>
    </div>
  );
}
