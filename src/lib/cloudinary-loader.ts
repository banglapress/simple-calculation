type CloudinaryLoaderProps = {
  src: string;
  width: number;
  quality?: number;
};

export default function cloudinaryLoader({
  src,
  width,
  quality,
}: CloudinaryLoaderProps) {
  if (!src || !src.includes("res.cloudinary.com")) {
    return src;
  }

  try {
    const url = new URL(src);
    const segments = url.pathname.split("/");
    const uploadIndex = segments.indexOf("upload");

    if (uploadIndex === -1) return src;

    segments.splice(
      uploadIndex + 1,
      0,
      `f_auto,q_${quality ?? 75},w_${width}`
    );

    url.pathname = segments.join("/");
    return url.toString();
  } catch {
    return src;
  }
}
