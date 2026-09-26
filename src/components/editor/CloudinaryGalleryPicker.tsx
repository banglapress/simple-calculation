"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";

export interface CloudinaryGalleryAsset {
  id: string;
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
  createdAt: string;
}

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  onSelect: (asset: CloudinaryGalleryAsset) => void | Promise<void>;
}

function formatBytes(bytes: number) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function CloudinaryGalleryPicker({
  open,
  title,
  onClose,
  onSelect,
}: Props) {
  const [assets, setAssets] = useState<CloudinaryGalleryAsset[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setQuery("");
    setError("");
    setAssets([]);
    setNextCursor(null);

    let cancelled = false;

    async function loadInitial() {
      setLoading(true);

      try {
        const response = await fetch("/api/editor/cloudinary-gallery?limit=48", {
          cache: "no-store",
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "Cloudinary Gallery লোড করা যায়নি");
        }

        if (!cancelled) {
          setAssets(Array.isArray(data.assets) ? data.assets : []);
          setNextCursor(data.nextCursor || null);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Cloudinary Gallery লোড করা যায়নি"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitial();

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const searchGallery = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setAssets([]);
    setNextCursor(null);

    try {
      const response = await fetch(
        "/api/editor/cloudinary-gallery?limit=48&q=" +
          encodeURIComponent(query.trim()),
        { cache: "no-store" }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Cloudinary Gallery search failed");
      }

      setAssets(Array.isArray(data.assets) ? data.assets : []);
      setNextCursor(data.nextCursor || null);
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Cloudinary Gallery search failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!nextCursor || loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/editor/cloudinary-gallery?limit=48&q=" +
          encodeURIComponent(query.trim()) +
          "&cursor=" +
          encodeURIComponent(nextCursor),
        { cache: "no-store" }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "আরও ছবি লোড করা যায়নি");
      }

      setAssets((current) => [
        ...current,
        ...(Array.isArray(data.assets) ? data.assets : []),
      ]);
      setNextCursor(data.nextCursor || null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "আরও ছবি লোড করা যায়নি"
      );
    } finally {
      setLoading(false);
    }
  };

  const selectAsset = async (asset: CloudinaryGalleryAsset) => {
    if (selectingId || uploading) return;

    setSelectingId(asset.id);

    try {
      await onSelect(asset);
    } catch (selectError) {
      setError(
        selectError instanceof Error
          ? selectError.message
          : "ছবিটি ব্যবহার করা যায়নি"
      );
    } finally {
      setSelectingId(null);
    }
  };

  const uploadNewImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "নতুন ছবি upload করা যায়নি");
      }

      const url = String(data.url || "").trim();

      if (!url) {
        throw new Error("Upload-এর পর Cloudinary URL পাওয়া যায়নি");
      }

      await onSelect({
        id: url,
        url,
        publicId: "",
        width: 0,
        height: 0,
        bytes: file.size,
        format: file.type.replace(/^image\//, ""),
        createdAt: new Date().toISOString(),
      });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "নতুন ছবি upload করা যায়নি"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 p-3 sm:p-6">
      <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div>
            <h2 className="font-semibold text-slate-900">{title}</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              আগে Cloudinary-তে থাকা ছবি খুঁজুন; না থাকলে এখান থেকেই নতুন ছবি upload করুন।
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading || uploading || Boolean(selectingId)}
            className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="border-b p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <form onSubmit={searchGallery} className="flex min-w-0 flex-1 gap-2">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                placeholder="নাম দিয়ে খুঁজুন — যেমন: shakib, messi, stadium"
              />
              <button
                type="submit"
                disabled={loading}
                className="shrink-0 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                🔎 খুঁজুন
              </button>
            </form>

            <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700">
              {uploading ? "⏳ Upload হচ্ছে..." : "⬆️ নতুন ছবি upload করুন"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={uploadNewImage}
                disabled={uploading || Boolean(selectingId)}
              />
            </label>
          </div>

          {error && (
            <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {loading && assets.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              ⏳ Cloudinary Gallery লোড হচ্ছে...
            </div>
          ) : assets.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-500">
              এই খোঁজে কোনো ছবি পাওয়া যায়নি। উপরের “নতুন ছবি upload করুন” থেকে ছবি যোগ করুন।
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => selectAsset(asset)}
                    disabled={Boolean(selectingId) || uploading}
                    className="group overflow-hidden rounded-xl border bg-white text-left hover:border-blue-500 hover:shadow-md disabled:opacity-60"
                  >
                    <div className="relative aspect-square bg-slate-100">
                      <Image
                        src={asset.url}
                        alt={asset.publicId || "Cloudinary image"}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="p-2">
                      <p className="truncate text-xs font-medium text-slate-700">
                        {asset.publicId || "Cloudinary image"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {[asset.width && asset.height ? asset.width + "×" + asset.height : "", formatBytes(asset.bytes)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {selectingId === asset.id && (
                        <p className="mt-1 text-[11px] font-medium text-blue-600">
                          ⏳ ব্যবহার হচ্ছে...
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {nextCursor && (
                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loading || uploading || Boolean(selectingId)}
                    className="rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-50"
                  >
                    {loading ? "⏳ লোড হচ্ছে..." : "আরও ছবি দেখুন"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
