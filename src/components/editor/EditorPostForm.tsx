// src/components/editor/EditorPostForm.tsx

"use client";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import Image from "next/image";

const LexicalEditor = dynamic(
  () => import("@/components/editor/LexicalEditor"),
  { ssr: false }
);

interface Category {
  id: number;
  name: string;
  slug: string;
  subcategories: Subcategory[];
}

interface Subcategory {
  id: number;
  name: string;
  slug: string;
}

interface Reporter {
  id: string;
  name: string;
}

interface Post {
  title: string;
  content: string;
  tags?: string;
  authorId?: string;
  status: string;
  featureImage?: string;
  galleryImages?: string | null;
  placement: string;
  isBreaking?: boolean;
  facebookCaption?: string | null;
  facebookImageUrl?: string | null;
  facebookImagePrompt?: string | null;
  facebookAutoPost?: boolean;
  facebookStatus?: string;
  facebookError?: string | null;
  deskStory?: {
    id: string;
    titleHint: string;
    status: string;
    sourceCount: number;
    relevanceScore: number | null;
    relevanceReason: string | null;
    warning: string | null;
    sources: Array<{
      title: string;
      url: string;
      feed?: { name: string } | null;
    }>;
  } | null;
  categories?: Category[];
  subcategories?: Subcategory[];
}

function parseGallery(value?: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export default function EditorPostForm({ postId }: { postId: string }) {
  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<Post | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [reporters, setReporters] = useState<Reporter[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<number[]>(
    []
  );
  const [featureImageBusy, setFeatureImageBusy] = useState(false);
  const [aiImageBusy, setAiImageBusy] = useState(false);
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [aiGeneratedImageUrl, setAiGeneratedImageUrl] = useState<string | null>(null);
  const [featureImageFile, setFeatureImageFile] = useState<File | null>(null);
  const [featureImagePreview, setFeatureImagePreview] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [cardPreviewVersion, setCardPreviewVersion] = useState(() => Date.now());

  useEffect(() => {
    async function fetchData() {
      const [postRes, catRes, reporterRes] = await Promise.all([
        axios.get("/api/editor/posts/" + postId),
        axios.get("/api/admin/categories"),
        axios.get("/api/admin/reporters"),
      ]);

      const postData: Post = postRes.data;

      setPost(postData);
      setGalleryImages(parseGallery(postData.galleryImages));
      setSelectedCategories(postData.categories?.map((c) => c.id) || []);
      setSelectedSubcategories(postData.subcategories?.map((s) => s.id) || []);
      setCategories(catRes.data);
      setSubcategories(
        catRes.data.flatMap((c: Category) => c.subcategories)
      );
      setReporters(reporterRes.data);
      setLoading(false);
    }

    fetchData().catch((error) => {
      console.error(error);
      setMessage("❌ পোস্টের তথ্য লোড করা যায়নি");
      setLoading(false);
    });
  }, [postId]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(body || "Image upload failed");
    }

    const data = (await response.json()) as { url?: string };
    const url = String(data.url || "").trim();

    if (!url) {
      throw new Error("Image upload response-এ URL পাওয়া যায়নি");
    }

    return url;
  };

  const makeFacebookCard = async (sourceUrl: string) => {
    if (!post) throw new Error("পোস্ট পাওয়া যায়নি");
    if (!sourceUrl.trim()) throw new Error("Feature Image পাওয়া যায়নি");

    const response = await fetch(
      "/api/facebook/card/" +
        postId +
        "?sourceImage=" +
        encodeURIComponent(sourceUrl) +
        "&preview=" +
        Date.now(),
      {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      }
    );

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      throw new Error(
        message || "Facebook Photo Card তৈরি করা যায়নি"
      );
    }

    const blob = await response.blob();

    if (!blob.size) {
      throw new Error("Facebook Photo Card-এর image bytes পাওয়া যায়নি");
    }

    return new File([blob], "khelatv-facebook-card.png", {
      type: blob.type || "image/png",
    });
  };

  const generateAIImage = async () => {
    if (!post) return;

    setAiImageBusy(true);
    setMessage("⏳ AI দিয়ে ছবি তৈরি হচ্ছে...");

    try {
      const response = await axios.post(
        "/api/editor/posts/" + postId + "/facebook-image",
        {
          prompt: aiImagePrompt.trim() || undefined,
        }
      );

      const generatedUrl = String(response.data?.imageUrl || "").trim();
      if (!generatedUrl) {
        throw new Error("AI image URL পাওয়া যায়নি");
      }

      setAiGeneratedImageUrl(generatedUrl);
      setPost({
        ...post,
        facebookImagePrompt:
          response.data?.prompt || aiImagePrompt.trim() || null,
        facebookStatus: "NONE",
        facebookError: null,
      });

      setMessage(
        "✅ AI ছবি তৈরি হয়েছে। নিচের preview দেখে চাইলে Article Cover হিসেবে ব্যবহার করুন।"
      );
    } catch (error) {
      const msg = axios.isAxiosError(error)
        ? error.response?.data?.message ||
          error.response?.data?.error ||
          "AI image তৈরি করা যায়নি"
        : error instanceof Error
          ? error.message
          : "AI image তৈরি করা যায়নি";

      setMessage("❌ " + msg);
    } finally {
      setAiImageBusy(false);
    }
  };

  const useAIImageAsFeature = async () => {
    if (!post || !aiGeneratedImageUrl) return;

    const currentPost = post;

    setAiImageBusy(true);
    setMessage("⏳ AI ছবিটি Article Cover এবং Facebook Card-এর জন্য প্রস্তুত করা হচ্ছে...");

    try {
      const response = await axios.post(
        "/api/editor/posts/" + postId + "/use-facebook-image",
        { imageUrl: aiGeneratedImageUrl }
      );

      const imageUrl = String(response.data?.post?.featureImage || "").trim();
      if (!imageUrl) {
        throw new Error("AI image-টি Article Cover হিসেবে save করা যায়নি");
      }

      const cardFile = await makeFacebookCard(imageUrl);
      const cardUrl = await uploadFile(cardFile);

      const saveResponse = await axios.put("/api/editor/posts/" + postId, {
        title: currentPost.title,
        content: currentPost.content,
        tags: currentPost.tags,
        isBreaking: currentPost.isBreaking,
        authorId: currentPost.authorId,
        status: currentPost.status,
        featureImage: imageUrl,
        facebookImageUrl: cardUrl,
        galleryImages: parseGallery(currentPost.galleryImages),
        placement: currentPost.placement,
        categoryIds: selectedCategories,
        subcategoryIds: selectedSubcategories,
        facebookCaption: currentPost.facebookCaption || "",
        facebookAutoPost: Boolean(currentPost.facebookAutoPost),
      });

      const saved = saveResponse.data?.post;

      setPost({
        ...currentPost,
        featureImage: String(saved?.featureImage || imageUrl),
        facebookImageUrl: String(saved?.facebookImageUrl || cardUrl),
        facebookImagePrompt: currentPost.facebookImagePrompt,
        facebookStatus: "READY",
        facebookError: null,
      });

      setAiGeneratedImageUrl(null);
      setCardPreviewVersion(Date.now());

      try {
        const captionResponse = await axios.post(
          "/api/editor/posts/" + postId + "/facebook-caption"
        );
        setPost((current) =>
          current
            ? { ...current, facebookCaption: captionResponse.data.caption }
            : current
        );
        setMessage(
          "✅ AI ছবি Article Cover হয়েছে, Facebook Photo Card তৈরি হয়েছে এবং Facebook Caption তৈরি হয়েছে।"
        );
      } catch {
        setMessage(
          "✅ AI ছবি Article Cover হয়েছে এবং Facebook Photo Card তৈরি হয়েছে। Caption তৈরি করা যায়নি।"
        );
      }
    } catch (error) {
      const msg = axios.isAxiosError(error)
        ? error.response?.data?.message ||
          error.response?.data?.error ||
          "AI image ব্যবহার করা যায়নি"
        : error instanceof Error
          ? error.message
          : "AI image ব্যবহার করা যায়নি";

      setMessage("❌ " + msg);
    } finally {
      setAiImageBusy(false);
    }
  };

  const handleFeatureImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) {
      setFeatureImageFile(null);
      setFeatureImagePreview(null);
      e.target.value = "";
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setFeatureImageFile(file);
    setFeatureImagePreview(previewUrl);
    setMessage(
      "ছবি বাছাই করা হয়েছে। এখন “এই ছবি ব্যবহার করুন” চাপুন।"
    );
    e.target.value = "";
  };

  const useSelectedFeatureImage = async () => {
    if (!featureImageFile || !post) return;

    const currentPost = post;

    setFeatureImageBusy(true);
    setMessage("");

    try {
      const url = await uploadFile(featureImageFile);

      setMessage("⏳ Unicode বাংলা Facebook Card তৈরি হচ্ছে...");
      const cardFile = await makeFacebookCard(url);
      const cardUrl = await uploadFile(cardFile);

      const response = await axios.put("/api/editor/posts/" + postId, {
        title: currentPost.title,
        content: currentPost.content,
        tags: currentPost.tags,
        isBreaking: currentPost.isBreaking,
        authorId: currentPost.authorId,
        status: currentPost.status,
        featureImage: url,
        facebookImageUrl: cardUrl,
        galleryImages: parseGallery(currentPost.galleryImages),
        placement: currentPost.placement,
        categoryIds: selectedCategories,
        subcategoryIds: selectedSubcategories,
        facebookCaption: currentPost.facebookCaption || "",
        facebookAutoPost: Boolean(currentPost.facebookAutoPost),
      });

      const saved = response.data?.post;
      const savedFeatureImage = String(saved?.featureImage || url).trim();

      setPost({
        ...currentPost,
        featureImage: savedFeatureImage,
        facebookImageUrl: saved?.facebookImageUrl || cardUrl,
        facebookStatus: saved?.facebookStatus || "READY",
        facebookError: null,
      });

      setFeatureImageFile(null);
      if (featureImagePreview) {
        URL.revokeObjectURL(featureImagePreview);
      }
      setFeatureImagePreview(null);
      setCardPreviewVersion(Date.now());

      try {
        const captionResponse = await axios.post(
          "/api/editor/posts/" + postId + "/facebook-caption"
        );
        setPost((current) =>
          current
            ? { ...current, facebookCaption: captionResponse.data.caption }
            : current
        );
        setMessage(
          "✅ ছবি Article Cover হয়েছে, Unicode বাংলা Facebook Card তৈরি হয়েছে এবং Facebook Caption তৈরি হয়েছে।"
        );
      } catch {
        setMessage(
          "✅ ছবি Article Cover হয়েছে এবং Unicode বাংলা Facebook Card তৈরি হয়েছে। Caption তৈরি করা যায়নি।"
        );
      }
    } catch (error) {
      setMessage(
        "❌ " +
          (axios.isAxiosError(error)
            ? error.response?.data?.message ||
              error.response?.data?.error ||
              "ছবিটি ব্যবহার করা যায়নি"
            : error instanceof Error
              ? error.message
              : "ছবিটি ব্যবহার করা যায়নি")
      );
    } finally {
      setFeatureImageBusy(false);
    }
  };

  const regenerateFacebookCard = async () => {
    if (!post) return;

    const currentPost = post;
    const featureImage = currentPost.featureImage;

    if (!featureImage) return;

    setFeatureImageBusy(true);
    setMessage("⏳ বর্তমান Feature Image দিয়ে Unicode বাংলা Card তৈরি হচ্ছে...");

    try {
      const cardFile = await makeFacebookCard(featureImage);
      const cardUrl = await uploadFile(cardFile);

      await axios.put("/api/editor/posts/" + postId, {
        title: currentPost.title,
        content: currentPost.content,
        tags: currentPost.tags,
        isBreaking: currentPost.isBreaking,
        authorId: currentPost.authorId,
        status: currentPost.status,
        featureImage: currentPost.featureImage,
        facebookImageUrl: cardUrl,
        galleryImages: parseGallery(currentPost.galleryImages),
        placement: currentPost.placement,
        categoryIds: selectedCategories,
        subcategoryIds: selectedSubcategories,
        facebookCaption: currentPost.facebookCaption || "",
        facebookAutoPost: Boolean(currentPost.facebookAutoPost),
      });

      setPost({
        ...currentPost,
        facebookImageUrl: cardUrl,
        facebookStatus: "READY",
        facebookError: null,
      });
      setCardPreviewVersion(Date.now());
      setMessage("✅ Unicode বাংলা Facebook Card নতুন করে তৈরি হয়েছে।");
    } catch (error) {
      setMessage(
        "❌ " +
          (error instanceof Error
            ? error.message
            : "Facebook Card তৈরি করা যায়নি")
      );
    } finally {
      setFeatureImageBusy(false);
    }
  };

  const handleGalleryUpload = async () => {
    if (!galleryFiles.length) return galleryImages;

    const uploaded = await Promise.all(
      galleryFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Gallery image upload failed");

        const data = await res.json();
        return data.url as string;
      })
    );

    return [...galleryImages, ...uploaded].slice(0, 20);
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages((current) =>
      current.filter((_, imageIndex) => imageIndex !== index)
    );
  };

  const publishToFacebook = async () => {
    if (!post) return;

    try {
      setMessage("⏳ Facebook Photo Card তৈরি করে Page-এ প্রকাশ করা হচ্ছে...");
      const response = await axios.post(
        "/api/editor/posts/" + postId + "/facebook"
      );
      setPost({
        ...post,
        facebookStatus: response.data.published ? "PUBLISHED" : "FAILED",
        facebookError: response.data.error || null,
      });

      if (response.data.published) {
        setMessage(
          "✅ Facebook-এ প্রকাশ হয়েছে" +
            (response.data.pageName ? " — " + response.data.pageName : "")
        );
      } else {
        setMessage(
          "❌ Facebook-এ প্রকাশ হয়নি: " +
            (response.data.error || "অজানা সমস্যা")
        );
      }
    } catch (error) {
      setMessage(
        "❌ " +
          (axios.isAxiosError(error)
            ? error.response?.data?.error ||
              error.response?.data?.message ||
              "Facebook publish failed"
            : "Facebook publish failed")
      );
    }
  };

  const handleUpdate = async (e: FormEvent) => {
    e.preventDefault();
    if (!post) return;

    const currentPost = post;

    setSaving(true);
    setMessage("");

    try {
      const [uploadedImage, uploadedGallery] = await Promise.all([
        currentPost.featureImage || "",
        handleGalleryUpload(),
      ]);

      const saveResponse = await axios.put("/api/editor/posts/" + postId, {
        title: currentPost.title,
        content: currentPost.content,
        tags: currentPost.tags,
        isBreaking: currentPost.isBreaking,
        authorId: currentPost.authorId,
        status: currentPost.status,
        featureImage: uploadedImage,
        galleryImages: uploadedGallery,
        placement: currentPost.placement,
        categoryIds: selectedCategories,
        subcategoryIds: selectedSubcategories,
        facebookCaption: currentPost.facebookCaption || "",
        facebookAutoPost: Boolean(currentPost.facebookAutoPost),
      });

      setGalleryImages(uploadedGallery);
      setGalleryFiles([]);
      if (saveResponse.data?.post) {
        setPost((current) =>
          current
            ? {
                ...current,
                featureImage: saveResponse.data.post.featureImage,
                facebookImageUrl: saveResponse.data.post.facebookImageUrl,
                facebookStatus: saveResponse.data.post.facebookStatus,
                facebookError: saveResponse.data.post.facebookError,
              }
            : current
        );
      }
      setCardPreviewVersion(Date.now());
      const facebookResult = saveResponse.data?.facebook;
      if (facebookResult?.published) {
        setMessage("✅ পোস্ট আপডেট হয়েছে এবং Facebook-এ প্রকাশ হয়েছে");
      } else if (facebookResult?.attempted && facebookResult?.error) {
        setMessage("✅ পোস্ট আপডেট হয়েছে · ❌ Facebook: " + facebookResult.error);
        setPost((current) =>
          current
            ? {
                ...current,
                facebookStatus: "FAILED",
                facebookError: facebookResult.error,
              }
            : current
        );
      } else {
        setMessage("✅ পোস্ট আপডেট হয়েছে");
      }
    } catch (error) {
      const responseMessage = axios.isAxiosError(error)
        ? error.response?.data?.message
        : null;
      setMessage("❌ " + (responseMessage || "পোস্ট আপডেট করা যায়নি"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !post) return <p>⏳ লোড হচ্ছে...</p>;

  return (
    <form onSubmit={handleUpdate} className="space-y-5">
      <div className="grid xl:grid-cols-[minmax(0,1fr)_390px] gap-6 items-start">
        <main className="min-w-0 space-y-5">
          <section className="rounded-xl border bg-white shadow-sm">
            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Article
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    মূল সংবাদ এখানেই লিখুন ও সম্পাদনা করুন।
                  </p>
                </div>
                <span
                  className={
                    "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold " +
                    (post.status === "PUBLISHED"
                      ? "bg-green-100 text-green-700"
                      : post.status === "PENDING"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-700")
                  }
                >
                  {post.status}
                </span>
              </div>

              <input
                type="text"
                value={post.title}
                onChange={(e) => setPost({ ...post, title: e.target.value })}
                className="w-full border-0 border-b border-slate-200 px-1 pb-4 text-3xl font-bold outline-none focus:border-blue-500"
                placeholder="শিরোনাম"
              />

              <div className="mt-5">
                <LexicalEditor
                  initialHtml={post.content}
                  onChange={(val) => setPost({ ...post, content: val })}
                />
              </div>

              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-500 mb-2">
                  ট্যাগ
                </label>
                <input
                  type="text"
                  value={post.tags || ""}
                  onChange={(e) => setPost({ ...post, tags: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2.5 outline-none focus:border-blue-500"
                  placeholder="ট্যাগ (কমা দিয়ে)"
                />
              </div>
            </div>
          </section>

          {post.deskStory && (
            <details className="rounded-xl border bg-purple-50 shadow-sm" open>
              <summary className="cursor-pointer px-5 py-4 font-semibold">
                🤖 AI Newsroom Research
                <span className="ml-2 text-xs font-normal text-slate-500">
                  {post.deskStory.sourceCount} source · Relevance{" "}
                  {post.deskStory.relevanceScore ?? "—"}/100
                </span>
              </summary>

              <div className="border-t px-5 py-4 space-y-3">
                <p className="text-sm">
                  <strong>Story:</strong> {post.deskStory.titleHint}
                </p>

                {post.deskStory.warning && (
                  <p className="text-sm text-orange-700">
                    {post.deskStory.warning}
                  </p>
                )}

                {post.deskStory.sources?.length > 0 && (
                  <div className="grid md:grid-cols-2 gap-2">
                    {post.deskStory.sources.map((source) => (
                      <a
                        key={source.url}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate rounded-lg border bg-white px-3 py-2 text-xs text-blue-700 hover:bg-blue-50"
                      >
                        {(source.feed?.name ? source.feed.name + " — " : "") +
                          (source.title || source.url)}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </details>
          )}

          <details className="rounded-xl border bg-white shadow-sm" open>
            <summary className="cursor-pointer px-5 py-4 font-semibold">
              🖼️ Article-এর ভিতরের ছবি
              <span className="ml-2 text-xs font-normal text-slate-500">
                {galleryImages.length}/20
              </span>
            </summary>

            <div className="border-t p-5 space-y-4">
              {galleryImages.length > 0 && (
                <div className="grid sm:grid-cols-3 gap-3">
                  {galleryImages.map((src, index) => (
                    <div
                      key={src + index}
                      className="relative border rounded-lg p-1 bg-white"
                    >
                      <Image
                        src={src}
                        alt={"Gallery " + (index + 1)}
                        width={300}
                        height={200}
                        className="w-full aspect-video object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(index)}
                        className="absolute top-2 right-2 bg-black/70 text-white rounded px-2 py-1 text-xs"
                      >
                        ✕ মুছুন
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setGalleryFiles(Array.from(e.target.files || []).slice(0, 20))
                }
              />

              {galleryFiles.length > 0 && (
                <p className="text-xs text-blue-700">
                  নতুন {galleryFiles.length}টি ছবি save করার সময় upload হবে।
                </p>
              )}
            </div>
          </details>
        </main>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
          <section className="rounded-xl border bg-white shadow-sm p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">🚀 প্রকাশনা</p>
                <p className="text-xs text-slate-500 mt-1">
                  Status, save এবং Facebook publish।
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500">
                {post.facebookStatus || "NONE"}
              </span>
            </div>

            <select
              value={post.status}
              onChange={(e) => setPost({ ...post, status: e.target.value })}
              className="w-full border rounded-lg px-3 py-2.5 mt-4"
            >
              <option value="DRAFT">Draft</option>
              <option value="PENDING">Pending</option>
              <option value="PUBLISHED">Published</option>
            </select>

            <label className="inline-flex items-center gap-2 mt-3 text-sm">
              <input
                type="checkbox"
                checked={Boolean(post.isBreaking)}
                onChange={(e) =>
                  setPost({ ...post, isBreaking: e.target.checked })
                }
              />
              🛑 ব্রেকিং নিউজ
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full mt-4 bg-blue-600 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-semibold"
            >
              {saving ? "💾 সংরক্ষণ হচ্ছে..." : "💾 আপডেট / সংরক্ষণ করুন"}
            </button>

            <button
              type="button"
              onClick={publishToFacebook}
              disabled={
                post.status !== "PUBLISHED" ||
                post.facebookStatus === "PUBLISHED"
              }
              className="w-full mt-2 bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium"
            >
              {post.facebookStatus === "PUBLISHED"
                ? "✅ Facebook-এ প্রকাশিত"
                : "📘 Facebook-এ এখনই প্রকাশ করুন"}
            </button>

            <label className="flex items-start gap-2 mt-3 text-xs">
              <input
                type="checkbox"
                checked={Boolean(post.facebookAutoPost)}
                onChange={(e) =>
                  setPost({ ...post, facebookAutoPost: e.target.checked })
                }
                className="mt-0.5"
              />
              <span>Article Publish হলে Facebook-এ auto-post</span>
            </label>

            {post.status !== "PUBLISHED" && (
              <p className="text-xs text-orange-700 mt-2">
                Manual Facebook publish-এর আগে Article Publish করুন।
              </p>
            )}
          </section>

          <details className="rounded-xl border bg-white shadow-sm" open>
            <summary className="cursor-pointer px-4 py-3 font-semibold">
              ⚙️ Article Settings
            </summary>

            <div className="border-t p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">
                  Reporter
                </label>
                <select
                  value={post.authorId || ""}
                  onChange={(e) =>
                    setPost({ ...post, authorId: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2.5"
                >
                  <option value="">-- রিপোর্টার নির্বাচন করুন --</option>
                  {reporters.map((rep) => (
                    <option key={rep.id} value={rep.id}>
                      {rep.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="block text-xs font-semibold text-slate-500 mb-2">
                  Category
                </p>
                <div className="space-y-1.5">
                  {categories.map((cat) => (
                    <label key={cat.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        value={cat.id}
                        checked={selectedCategories.includes(cat.id)}
                        onChange={(e) => {
                          const id = parseInt(e.target.value);
                          setSelectedCategories((prev) =>
                            prev.includes(id)
                              ? prev.filter((x) => x !== id)
                              : [...prev, id]
                          );
                        }}
                      />
                      {cat.name}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <p className="block text-xs font-semibold text-slate-500 mb-2">
                  Subcategory
                </p>
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {subcategories.map((sub) => (
                    <label
                      key={sub.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        value={sub.id}
                        checked={selectedSubcategories.includes(sub.id)}
                        onChange={(e) => {
                          const id = parseInt(e.target.value);
                          setSelectedSubcategories((prev) =>
                            prev.includes(id)
                              ? prev.filter((x) => x !== id)
                              : [...prev, id]
                          );
                        }}
                      />
                      {sub.name}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-2">
                  Placement
                </label>
                <select
                  value={post.placement || "NONE"}
                  onChange={(e) =>
                    setPost({ ...post, placement: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2.5"
                >
                  <option value="NONE">🟤 সাধারণ</option>
                  <option value="LEAD">🔴 লিড</option>
                  <option value="SECOND_LEAD">🟠 সেকেন্ড লিড</option>
                  <option value="EDITORS_PICK">⭐ সম্পাদকের পছন্দ</option>
                  <option value="TRENDING">🔥 ট্রেন্ডিং</option>
                </select>
              </div>
            </div>
          </details>

          <details className="rounded-xl border bg-white shadow-sm" open>
            <summary className="cursor-pointer px-4 py-3 font-semibold">
              📷 Feature Image
            </summary>

            <div className="border-t p-4 space-y-4">
              <label className="block bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm text-center cursor-pointer">
                🖼️ ছবি বাছাই করুন
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={featureImageBusy}
                  onChange={handleFeatureImageChange}
                />
              </label>

              {featureImagePreview ? (
                <div className="space-y-3">
                  <img
                    src={featureImagePreview}
                    alt="Selected feature image preview"
                    className="w-full max-h-[360px] object-contain rounded-lg border bg-slate-50"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={useSelectedFeatureImage}
                      disabled={featureImageBusy}
                      className="bg-green-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium"
                    >
                      {featureImageBusy ? "⏳ হচ্ছে..." : "✅ ব্যবহার করুন"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (featureImagePreview) {
                          URL.revokeObjectURL(featureImagePreview);
                        }
                        setFeatureImageFile(null);
                        setFeatureImagePreview(null);
                        setMessage("");
                      }}
                      disabled={featureImageBusy}
                      className="border px-3 py-2 rounded-lg text-sm"
                    >
                      ✕ বাতিল
                    </button>
                  </div>
                </div>
              ) : post.featureImage ? (
                <img
                  src={post.featureImage}
                  alt="Current Feature Image"
                  className="w-full aspect-[4/5] object-cover rounded-lg border"
                />
              ) : (
                <p className="text-xs text-slate-500">
                  এখনো Feature Image দেওয়া হয়নি।
                </p>
              )}
            </div>
          </details>

          <details className="rounded-xl border bg-white shadow-sm" open>
            <summary className="cursor-pointer px-4 py-3 font-semibold">
              🤖 AI Image
            </summary>

            <div className="border-t p-4 space-y-3">
              <p className="text-xs text-slate-500">
                নিজের prompt দিন বা খালি রাখলে Article-এর বিষয় দেখে AI prompt তৈরি করবে।
              </p>

              <textarea
                value={aiImagePrompt}
                onChange={(e) => setAiImagePrompt(e.target.value)}
                className="w-full min-h-24 border rounded-lg p-3 text-sm"
                placeholder="AI image prompt..."
                disabled={aiImageBusy}
              />

              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await axios.post(
                      "/api/editor/posts/" + postId + "/facebook-image-prompt",
                      {
                        title: post.title,
                        content: post.content,
                        tags: post.tags || "",
                        category:
                          categories.find((category) =>
                            selectedCategories.includes(category.id)
                          )?.name || "",
                      }
                    );
                    setAiImagePrompt(String(response.data?.prompt || ""));
                    setMessage("✅ Article text থেকে AI image prompt তৈরি হয়েছে। Prompt চাইলে এডিট করে নিন।");
                  } catch (error) {
                    setMessage(
                      "❌ " +
                        (axios.isAxiosError(error)
                          ? error.response?.data?.message || "AI image prompt তৈরি করা যায়নি"
                          : "AI image prompt তৈরি করা যায়নি")
                    );
                  }
                }}
                disabled={aiImageBusy}
                className="w-full border bg-white px-3 py-2.5 rounded-lg text-sm"
              >
                🧠 Article থেকে Prompt তৈরি করুন
              </button>

              <button
                type="button"
                onClick={generateAIImage}
                disabled={aiImageBusy}
                className="w-full bg-purple-700 disabled:opacity-50 text-white px-3 py-2.5 rounded-lg text-sm font-medium"
              >
                {aiImageBusy ? "⏳ AI ছবি তৈরি হচ্ছে..." : "✨ AI ছবি তৈরি করুন"}
              </button>

              {aiGeneratedImageUrl && (
                <div className="rounded-lg border overflow-hidden bg-slate-50">
                  <img
                    src={aiGeneratedImageUrl}
                    alt="AI generated"
                    className="w-full aspect-[4/5] object-cover"
                  />
                  {post.facebookImagePrompt && (
                    <p className="p-2 text-[11px] text-slate-500">
                      {post.facebookImagePrompt}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={useAIImageAsFeature}
                    disabled={aiImageBusy}
                    className="w-full bg-green-700 disabled:opacity-50 text-white px-3 py-2.5 text-sm font-medium"
                  >
                    ✅ এই AI ছবি Article Cover করুন
                  </button>
                </div>
              )}
            </div>
          </details>

          <details className="rounded-xl border bg-white shadow-sm">
            <summary className="cursor-pointer px-4 py-3 font-semibold">
              📘 Facebook
              <span className="ml-2 text-xs font-normal text-slate-500">
                {post.facebookStatus || "NONE"}
              </span>
            </summary>

            <div className="border-t p-4 space-y-4">
              {post.featureImage ? (
                <div className="rounded-lg border overflow-hidden bg-slate-50">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
                    <span className="text-xs font-medium">Photo Card</span>
                    <button
                      type="button"
                      onClick={regenerateFacebookCard}
                      disabled={featureImageBusy}
                      className="border px-2.5 py-1.5 rounded text-xs"
                    >
                      🔄 রিফ্রেশ
                    </button>
                  </div>
                  <img
                    src={
                      (post.facebookImageUrl ||
                        "/api/facebook/card/" + postId) +
                      "?preview=" +
                      cardPreviewVersion
                    }
                    alt="Facebook Photo Card"
                    className="w-full aspect-[4/5] object-cover"
                  />
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  আগে Feature Image সেট করুন।
                </p>
              )}

              <textarea
                value={post.facebookCaption || ""}
                onChange={(e) =>
                  setPost({ ...post, facebookCaption: e.target.value })
                }
                className="w-full min-h-28 border rounded-lg p-3 text-sm"
                placeholder="Facebook caption"
              />

              <button
                type="button"
                onClick={async () => {
                  try {
                    const response = await axios.post(
                      "/api/editor/posts/" + postId + "/facebook-caption"
                    );
                    setPost({ ...post, facebookCaption: response.data.caption });
                    setMessage("✅ Facebook caption তৈরি হয়েছে");
                  } catch (error) {
                    setMessage(
                      "❌ " +
                        (axios.isAxiosError(error)
                          ? error.response?.data?.message ||
                            "Facebook caption তৈরি করা যায়নি"
                          : "Facebook caption তৈরি করা যায়নি")
                    );
                  }
                }}
                className="w-full border bg-white px-3 py-2 rounded-lg text-sm"
              >
                ✨ Caption তৈরি করুন
              </button>

              {post.facebookError && (
                <p className="text-xs text-red-600">{post.facebookError}</p>
              )}
            </div>
          </details>
        </aside>
      </div>

      {message && (
        <div
          className={
            "rounded-lg border px-4 py-3 text-sm " +
            (message.startsWith("❌")
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-green-200 bg-green-50 text-green-700")
          }
        >
          {message}
        </div>
      )}
    </form>
  );
}
