// src/components/home/LiveScoreBar.tsx

"use client";

import { useEffect, useState } from "react";

type LiveScore = {
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  status: string;
  commentaryId?: string;
};

export default function LiveScoreBar() {
  const [score, setScore] = useState<LiveScore | null>(null);

  useEffect(() => {
    fetch("/api/public/livescore")
      .then((res) => res.json())
      .then((data: LiveScore) => setScore(data));
  }, []);

  if (!score) return null;

  return (
    <div className="bg-black text-white text-center py-2 text-sm">
      🏆 {score.teamA} {score.scoreA} - {score.scoreB} {score.teamB} | 🕒 {score.status}{" "}
      {score.commentaryId && (
        <a href={`/post/${score.commentaryId}`} className="underline ml-4">
          পূর্ণ কমেন্টারি দেখুন
        </a>
      )}
    </div>
  );
}
