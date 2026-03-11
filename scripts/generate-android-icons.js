/**
 * Generates Android launcher icons from assets/icon.png
 * Run: node scripts/generate-android-icons.js
 */
const fs = require('fs');
const path = require('path');

const sizes = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

const resDir = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const sourceIcon = path.join(__dirname, '..', 'assets', 'icon.png');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Sharp not found. Run: npm install sharp --save-dev');
    process.exit(1);
  }

  if (!fs.existsSync(sourceIcon)) {
    console.error('Source icon not found:', sourceIcon);
    process.exit(1);
  }

  for (const { folder, size } of sizes) {
    const dir = path.join(resDir, folder);
    fs.mkdirSync(dir, { recursive: true });
    const outLauncher = path.join(dir, 'ic_launcher.png');
    const outRound = path.join(dir, 'ic_launcher_round.png');
    await sharp(sourceIcon)
      .resize(size, size)
      .png()
      .toFile(outLauncher);
    await sharp(sourceIcon)
      .resize(size, size)
      .png()
      .toFile(outRound);
    console.log(`Created ${folder}: ic_launcher.png, ic_launcher_round.png (${size}x${size})`);
  }

  // ic_launcher_foreground for adaptive icons (mipmap + drawable)
  for (const { folder, size } of sizes) {
    const mipDir = path.join(resDir, folder);
    const outForeground = path.join(mipDir, 'ic_launcher_foreground.png');
    await sharp(sourceIcon).resize(size, size).png().toFile(outForeground);
    console.log(`Created ${folder}: ic_launcher_foreground.png (${size}x${size})`);
  }
  const drawableFolders = [
    { folder: 'drawable-mdpi', size: 48 },
    { folder: 'drawable-hdpi', size: 72 },
    { folder: 'drawable-xhdpi', size: 96 },
    { folder: 'drawable-xxhdpi', size: 144 },
    { folder: 'drawable-xxxhdpi', size: 192 },
  ];
  for (const { folder, size } of drawableFolders) {
    const dir = path.join(resDir, folder);
    fs.mkdirSync(dir, { recursive: true });
    const outForeground = path.join(dir, 'ic_launcher_foreground.png');
    await sharp(sourceIcon).resize(size, size).png().toFile(outForeground);
    console.log(`Created ${folder}: ic_launcher_foreground.png (${size}x${size})`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
