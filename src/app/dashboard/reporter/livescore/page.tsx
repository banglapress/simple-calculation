// src/app/dashboard/reporter/livescore/page.tsx

"use client";

import { useState, useEffect, FormEvent } from "react";
import axios from "axios";

type Post = {
  id: string;
  title: string;
};

export default function LiveScorePage() {
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);
  const [status, setStatus] = useState("LIVE");
  const [commentaryId, setCommentaryId] = useState("");
  const [message, setMessage] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    axios.get("/api/reporter/posts").then((res) => setPosts(res.data));
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    await axios.post("/api/reporter/livescore", {
      teamA,
      teamB,
      scoreA,
      scoreB,
      status,
      commentaryId,
    });

    setMessage("✅ Live score updated!");
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">⚽ লাইভ স্কোর আপডেট</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={teamA}
          onChange={(e) => setTeamA(e.target.value)}
          className="w-full border p-2"
          placeholder="Team A"
          required
        />
        <input
          value={teamB}
          onChange={(e) => setTeamB(e.target.value)}
          className="w-full border p-2"
          placeholder="Team B"
          required
        />
        <input
          type="number"
          value={scoreA}
          onChange={(e) => setScoreA(Number(e.target.value))}
          className="w-full border p-2"
          placeholder="Score A"
          required
        />
        <input
          type="number"
          value={scoreB}
          onChange={(e) => setScoreB(Number(e.target.value))}
          className="w-full border p-2"
          placeholder="Score B"
          required
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border p-2"
        >
          <option value="LIVE">🔴 Live</option>
          <option value="HT">⏸️ Half Time</option>
          <option value="FT">✅ Full Time</option>
        </select>

        <select
          value={commentaryId}
          onChange={(e) => setCommentaryId(e.target.value)}
          className="w-full border p-2"
        >
          <option value="">-- সংযুক্ত পোস্ট (কমেন্টারি) --</option>
          {posts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>

        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          📝 আপডেট
        </button>

        {message && <p className="text-green-600 mt-2">{message}</p>}
      </form>
    </div>
  );
}
