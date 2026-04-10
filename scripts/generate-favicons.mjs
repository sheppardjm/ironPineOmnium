import sharp from 'sharp';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

const SVG_PATH = './public/logo.svg';

if (!existsSync(SVG_PATH)) {
  console.error(`Logo SVG not found at ${SVG_PATH}`);
  process.exit(1);
}

// Generate apple-touch-icon.png (180x180)
await sharp(SVG_PATH, { density: 300 })
  .resize(180, 180)
  .png()
  .toFile('./public/apple-touch-icon.png');

console.log('Created: public/apple-touch-icon.png (180x180)');

// Generate favicon.ico using ImageMagick
execSync(
  'magick -density 300 -background none ./public/logo.svg ' +
  '-define icon:auto-resize=32,16 ./public/favicon.ico'
);

console.log('Created: public/favicon.ico (32x32 + 16x16)');
console.log('Done. Verify output visually before committing.');
