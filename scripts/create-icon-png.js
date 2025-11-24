const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const buildIconsDir = path.join(__dirname, '..', 'build', 'icons');
const assetsIconsDir = path.join(__dirname, '..', 'assets', 'icons');
const svgPath = path.join(buildIconsDir, 'icon.svg');
const pngPath = path.join(buildIconsDir, 'icon.png');

// Проверяем наличие SVG
if (!fs.existsSync(svgPath)) {
  console.error('SVG файл не найден. Сначала запустите: node scripts/generate-icon.js');
  process.exit(1);
}

// Конвертируем SVG в PNG 1024x1024
sharp(svgPath)
  .resize(1024, 1024)
  .png()
  .toFile(pngPath)
  .then(() => {
    console.log('✅ PNG иконка создана:', pngPath);
    // Копируем PNG в assets тоже
    if (!fs.existsSync(assetsIconsDir)) {
      fs.mkdirSync(assetsIconsDir, { recursive: true });
    }
    fs.copyFileSync(pngPath, path.join(assetsIconsDir, 'icon.png'));
    console.log('✅ PNG иконка скопирована в assets/icons/');
    console.log('Теперь создайте .icns файл: node scripts/create-icon-icns.js');
  })
  .catch((err) => {
    console.error('Ошибка при создании PNG:', err);
    process.exit(1);
  });

