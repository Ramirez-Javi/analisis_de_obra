import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);
const projectRoot = path.resolve(currentDir, "..");
const sourceSvg = path.join(projectRoot, "public", "favicon.svg");
const outputDir = path.join(projectRoot, "build");
const outputPng = path.join(outputDir, "tekoga.png");
const outputIco = path.join(outputDir, "tekoga.ico");

async function main() {
  await fs.access(sourceSvg);
  await fs.mkdir(outputDir, { recursive: true });

  const normalizedPngBuffer = await sharp(sourceSvg)
    .resize(512, 512, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await fs.writeFile(outputPng, normalizedPngBuffer);

  // Windows desktop shortcuts and executable metadata are most reliable with ICO.
  const icoBuffer = await pngToIco(normalizedPngBuffer);
  await fs.writeFile(outputIco, icoBuffer);
}

main().catch((error) => {
  console.error("[generate-win-icon]", error);
  process.exitCode = 1;
});
