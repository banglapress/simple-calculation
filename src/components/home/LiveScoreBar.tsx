import Link from "next/link";
import { getLiveScore } from "@/lib/public-data";

export default async function LiveScoreBar() {
  const score = await getLiveScore();

  if (!score) return null;

  return (
    <div className="bg-black text-white text-center py-2 text-sm">
      🏆 {score.teamOne} {score.teamOneScore} - {score.teamTwoScore} {score.teamTwo} | 🕒 {score.matchStatus}
      {score.commentaryId && (
        <Link
          href={`/post/${score.commentaryId}`}
          className="underline ml-4"
        >
          পূর্ণ কমেন্টারি দেখুন
        </Link>
      )}
    </div>
  );
}
