/**
 * 生成 MeowAlert PWA icons
 * 執行: node scripts/generate-icons.mjs
 */

import sharp from "sharp";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, "../public");

// 主要 icon SVG (有安全邊距，適合 standard icon)
const iconSvg = (size) => {
  const pad = size * 0.08;
  const bg = size;
  const faceR = size * 0.32;
  const cx = size / 2;
  const cy = size * 0.56;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <!-- 橘色圓角背景 -->
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#FF8C42"/>

  <!-- 左耳 -->
  <polygon points="${cx - faceR * 0.85},${cy - faceR * 0.65}
             ${cx - faceR * 0.42},${cy - faceR * 1.38}
             ${cx - faceR * 0.05},${cy - faceR * 0.72}"
    fill="white"/>
  <!-- 左耳內 -->
  <polygon points="${cx - faceR * 0.76},${cy - faceR * 0.68}
             ${cx - faceR * 0.43},${cy - faceR * 1.22}
             ${cx - faceR * 0.12},${cy - faceR * 0.74}"
    fill="#FF8C42"/>

  <!-- 右耳 -->
  <polygon points="${cx + faceR * 0.05},${cy - faceR * 0.72}
             ${cx + faceR * 0.42},${cy - faceR * 1.38}
             ${cx + faceR * 0.85},${cy - faceR * 0.65}"
    fill="white"/>
  <!-- 右耳內 -->
  <polygon points="${cx + faceR * 0.12},${cy - faceR * 0.74}
             ${cx + faceR * 0.43},${cy - faceR * 1.22}
             ${cx + faceR * 0.76},${cy - faceR * 0.68}"
    fill="#FF8C42"/>

  <!-- 臉 -->
  <circle cx="${cx}" cy="${cy}" r="${faceR}" fill="white"/>

  <!-- 左眼 -->
  <ellipse cx="${cx - faceR * 0.38}" cy="${cy - faceR * 0.12}"
    rx="${faceR * 0.14}" ry="${faceR * 0.17}" fill="#2D2D2D"/>
  <circle cx="${cx - faceR * 0.33}" cy="${cy - faceR * 0.18}"
    r="${faceR * 0.05}" fill="white"/>

  <!-- 右眼 -->
  <ellipse cx="${cx + faceR * 0.38}" cy="${cy - faceR * 0.12}"
    rx="${faceR * 0.14}" ry="${faceR * 0.17}" fill="#2D2D2D"/>
  <circle cx="${cx + faceR * 0.43}" cy="${cy - faceR * 0.18}"
    r="${faceR * 0.05}" fill="white"/>

  <!-- 鼻子 -->
  <ellipse cx="${cx}" cy="${cy + faceR * 0.16}"
    rx="${faceR * 0.1}" ry="${faceR * 0.07}" fill="#FF6B6B"/>

  <!-- 嘴 -->
  <path d="M ${cx - faceR * 0.18} ${cy + faceR * 0.28}
           Q ${cx} ${cy + faceR * 0.42}
             ${cx + faceR * 0.18} ${cy + faceR * 0.28}"
    stroke="#2D2D2D" stroke-width="${faceR * 0.05}"
    fill="none" stroke-linecap="round"/>

  <!-- 左鬍鬚 -->
  <line x1="${cx - faceR * 0.9}" y1="${cy + faceR * 0.13}"
        x2="${cx - faceR * 0.14}" y2="${cy + faceR * 0.18}"
    stroke="#BBBBBB" stroke-width="${faceR * 0.045}" stroke-linecap="round"/>
  <line x1="${cx - faceR * 0.9}" y1="${cy + faceR * 0.28}"
        x2="${cx - faceR * 0.14}" y2="${cy + faceR * 0.23}"
    stroke="#BBBBBB" stroke-width="${faceR * 0.045}" stroke-linecap="round"/>

  <!-- 右鬍鬚 -->
  <line x1="${cx + faceR * 0.14}" y1="${cy + faceR * 0.18}"
        x2="${cx + faceR * 0.9}" y2="${cy + faceR * 0.13}"
    stroke="#BBBBBB" stroke-width="${faceR * 0.045}" stroke-linecap="round"/>
  <line x1="${cx + faceR * 0.14}" y1="${cy + faceR * 0.23}"
        x2="${cx + faceR * 0.9}" y2="${cy + faceR * 0.28}"
    stroke="#BBBBBB" stroke-width="${faceR * 0.045}" stroke-linecap="round"/>
</svg>`;
};

// Maskable icon SVG (貓臉填滿到邊緣，safe zone 是中央 80%)
const maskableSvg = (size) => {
  const cx = size / 2;
  const cy = size * 0.54;
  const faceR = size * 0.38;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#FF8C42"/>

  <!-- 左耳 -->
  <polygon points="${cx - faceR * 0.85},${cy - faceR * 0.65}
             ${cx - faceR * 0.42},${cy - faceR * 1.38}
             ${cx - faceR * 0.05},${cy - faceR * 0.72}"
    fill="white"/>
  <polygon points="${cx - faceR * 0.76},${cy - faceR * 0.68}
             ${cx - faceR * 0.43},${cy - faceR * 1.22}
             ${cx - faceR * 0.12},${cy - faceR * 0.74}"
    fill="#FF8C42"/>

  <!-- 右耳 -->
  <polygon points="${cx + faceR * 0.05},${cy - faceR * 0.72}
             ${cx + faceR * 0.42},${cy - faceR * 1.38}
             ${cx + faceR * 0.85},${cy - faceR * 0.65}"
    fill="white"/>
  <polygon points="${cx + faceR * 0.12},${cy - faceR * 0.74}
             ${cx + faceR * 0.43},${cy - faceR * 1.22}
             ${cx + faceR * 0.76},${cy - faceR * 0.68}"
    fill="#FF8C42"/>

  <circle cx="${cx}" cy="${cy}" r="${faceR}" fill="white"/>

  <ellipse cx="${cx - faceR * 0.38}" cy="${cy - faceR * 0.12}"
    rx="${faceR * 0.14}" ry="${faceR * 0.17}" fill="#2D2D2D"/>
  <circle cx="${cx - faceR * 0.33}" cy="${cy - faceR * 0.18}"
    r="${faceR * 0.05}" fill="white"/>

  <ellipse cx="${cx + faceR * 0.38}" cy="${cy - faceR * 0.12}"
    rx="${faceR * 0.14}" ry="${faceR * 0.17}" fill="#2D2D2D"/>
  <circle cx="${cx + faceR * 0.43}" cy="${cy - faceR * 0.18}"
    r="${faceR * 0.05}" fill="white"/>

  <ellipse cx="${cx}" cy="${cy + faceR * 0.16}"
    rx="${faceR * 0.1}" ry="${faceR * 0.07}" fill="#FF6B6B"/>

  <path d="M ${cx - faceR * 0.18} ${cy + faceR * 0.28}
           Q ${cx} ${cy + faceR * 0.42}
             ${cx + faceR * 0.18} ${cy + faceR * 0.28}"
    stroke="#2D2D2D" stroke-width="${faceR * 0.05}"
    fill="none" stroke-linecap="round"/>

  <line x1="${cx - faceR * 0.9}" y1="${cy + faceR * 0.13}"
        x2="${cx - faceR * 0.14}" y2="${cy + faceR * 0.18}"
    stroke="#BBBBBB" stroke-width="${faceR * 0.045}" stroke-linecap="round"/>
  <line x1="${cx - faceR * 0.9}" y1="${cy + faceR * 0.28}"
        x2="${cx - faceR * 0.14}" y2="${cy + faceR * 0.23}"
    stroke="#BBBBBB" stroke-width="${faceR * 0.045}" stroke-linecap="round"/>
  <line x1="${cx + faceR * 0.14}" y1="${cy + faceR * 0.18}"
        x2="${cx + faceR * 0.9}" y2="${cy + faceR * 0.13}"
    stroke="#BBBBBB" stroke-width="${faceR * 0.045}" stroke-linecap="round"/>
  <line x1="${cx + faceR * 0.14}" y1="${cy + faceR * 0.23}"
        x2="${cx + faceR * 0.9}" y2="${cy + faceR * 0.28}"
    stroke="#BBBBBB" stroke-width="${faceR * 0.045}" stroke-linecap="round"/>
</svg>`;
};

async function generate() {
  const tasks = [
    { name: "icon-192.png",        svg: iconSvg(192),     size: 192 },
    { name: "icon-512.png",        svg: iconSvg(512),     size: 512 },
    { name: "icon-maskable.png",   svg: maskableSvg(512), size: 512 },
    { name: "apple-touch-icon.png",svg: iconSvg(180),     size: 180 },
    { name: "icon-96.png",         svg: iconSvg(96),      size: 96  },
    // 32px 版本用於 favicon
    { name: "favicon-32.png",      svg: iconSvg(32),      size: 32  },
  ];

  for (const { name, svg, size } of tasks) {
    const outPath = join(publicDir, name);
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outPath);
    console.log(`✓ ${name} (${size}x${size})`);
  }

  // 從 32px PNG 建立最小合規 ICO (只含一個 32x32 image)
  const png32 = await sharp(Buffer.from(iconSvg(32))).png().toBuffer();
  const ico = buildIco(png32);
  writeFileSync(join(publicDir, "favicon.ico"), ico);
  console.log("✓ favicon.ico (32x32)");

  console.log("\n所有 icons 生成完成！");
}

/** 建立最小合規 ICO 檔案 (單一 32x32 PNG image) */
function buildIco(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // type: ICO
  header.writeUInt16LE(1, 4);      // image count: 1

  const entry = Buffer.alloc(16);
  entry.writeUInt8(32, 0);         // width
  entry.writeUInt8(32, 1);         // height
  entry.writeUInt8(0, 2);          // color count
  entry.writeUInt8(0, 3);          // reserved
  entry.writeUInt16LE(1, 4);       // color planes
  entry.writeUInt16LE(32, 6);      // bits per pixel
  entry.writeUInt32LE(pngBuffer.length, 8);  // image size
  entry.writeUInt32LE(6 + 16, 12); // offset to image data

  return Buffer.concat([header, entry, pngBuffer]);
}

generate().catch(console.error);
