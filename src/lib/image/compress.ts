"use client";

export interface CompressedImage {
  file: File;
  dataUrl: string;
}

function isHeic(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif")
  );
}

export async function compressImage(input: File): Promise<CompressedImage> {
  let file = input;

  if (isHeic(input)) {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({ blob: input, toType: "image/jpeg", quality: 0.9 });
    const blob = Array.isArray(result) ? result[0] : result;
    file = new File(
      [blob],
      input.name.replace(/\.(heic|heif)$/i, ".jpg"),
      { type: "image/jpeg" }
    );
  }

  const imageCompression = (await import("browser-image-compression")).default;
  const compressed = await imageCompression(file, {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 1200,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.85,
  });

  const compressedFile = new File([compressed], file.name, { type: "image/jpeg" });

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(compressedFile);
  });

  return { file: compressedFile, dataUrl };
}
