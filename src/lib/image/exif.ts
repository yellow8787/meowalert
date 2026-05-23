export interface ExifData {
  takenAt: Date | null;
  gpsLat: number | null;
  gpsLng: number | null;
}

export async function readExif(file: File): Promise<ExifData> {
  try {
    const exifr = (await import("exifr")).default;
    const result = await exifr.parse(file, {
      tiff: false,
      xmp: false,
      icc: false,
      iptc: false,
      gps: true,
      exif: true,
    });
    return {
      takenAt: result?.DateTimeOriginal ?? result?.DateTime ?? null,
      gpsLat: result?.latitude ?? null,
      gpsLng: result?.longitude ?? null,
    };
  } catch {
    return { takenAt: null, gpsLat: null, gpsLng: null };
  }
}
