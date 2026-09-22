import Navbar from "@/components/layout/Navbar";
import BreakingNews from "@/components/layout/BreakingNews";
import LiveScoreBar from "@/components/home/LiveScoreBar";
import Footer from "@/components/layout/Footer";
import LeadCard from "@/components/home/LeadCard";
import SecondLeadCard from "@/components/home/SecondLeadCard";
import CategorySection from "@/components/home/CategorySection";
import {
  getHomeCategoryPosts,
  getHomePlacementPosts,
} from "@/lib/public-data";

export const revalidate = 60;

export default async function HomePage() {
  const [
    placementPosts,
    footballPosts,
    cricketPosts,
    hockeyPosts,
    athleticsPosts,
    otherSportsPosts,
    sportsTechPosts,
    sportsCulturePosts,
  ] = await Promise.all([
    getHomePlacementPosts(),
    getHomeCategoryPosts("football"),
    getHomeCategoryPosts("cricket"),
    getHomeCategoryPosts("hockey"),
    getHomeCategoryPosts("athletics"),
    getHomeCategoryPosts("othersports"),
    getHomeCategoryPosts("sports-tech"),
    getHomeCategoryPosts("sports-culture"),
  ]);

  const leadPost =
    placementPosts.find((post) => post.placement === "LEAD") || null;
  const secondLeadPost =
    placementPosts.find((post) => post.placement === "SECOND_LEAD") || null;

  const editorsPick =
    placementPosts.find((post) => post.placement === "EDITORS_PICK") || null;
  const trending =
    placementPosts.find((post) => post.placement === "TRENDING") || null;

  return (
    <>
      <Navbar />
      <BreakingNews />
      <LiveScoreBar />

      <main className="max-w-7xl mx-auto p-4 space-y-10">
        <div className="grid md:grid-cols-12 gap-6">
          <div className="md:col-span-7 space-y-6">
            {leadPost && <LeadCard post={leadPost} />}
            <div className="w-full h-[75px] bg-gray-200 rounded-xl flex items-center justify-center text-sm text-gray-600">
              Advertisement
            </div>
          </div>

          {secondLeadPost && (
            <div className="md:col-span-5">
              <SecondLeadCard post={secondLeadPost} />
            </div>
          )}
        </div>

        <CategorySection
          slug="football"
          title="⚽ ফুটবল"
          posts={footballPosts}
          sidebarPost={editorsPick}
        />
        <CategorySection
          slug="cricket"
          title="🏏 ক্রিকেট"
          posts={cricketPosts}
          sidebarPost={trending}
        />
        <CategorySection
          slug="hockey"
          title="🏑 হকি"
          posts={hockeyPosts}
        />
        <CategorySection
          slug="athletics"
          title="🏃 অ্যাথলেটিক্স"
          posts={athleticsPosts}
        />
        <CategorySection
          slug="othersports"
          title="🎾 অন্যান্য খেলা"
          posts={otherSportsPosts}
        />
        <CategorySection
          slug="sports-tech"
          title="💼 খেলার প্রযুক্তি ও বাণিজ্য"
          posts={sportsTechPosts}
        />
        <CategorySection
          slug="sports-culture"
          title="🎭 খেলার জীবন ও সংস্কৃতি"
          posts={sportsCulturePosts}
        />
      </main>

      <Footer />
    </>
  );
}
