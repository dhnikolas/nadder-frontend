const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const buildIconsDir = path.join(__dirname, '..', 'build', 'icons');
const publicIconsDir = path.join(__dirname, '..', 'public', 'icons');
const pngPath = path.join(buildIconsDir, 'icon.png');

// Проверяем наличие PNG
if (!fs.existsSync(pngPath)) {
  console.error('PNG файл не найден. Сначала запустите: node scripts/create-icon-png.js');
  process.exit(1);
}

// Создаем папку для веб-иконок
if (!fs.existsSync(publicIconsDir)) {
  fs.mkdirSync(publicIconsDir, { recursive: true });
}

// Размеры для разных устройств
const sizes = [
  { size: 16, name: 'favicon-16x16.png' },
  { size: 32, name: 'favicon-32x32.png' },
  { size: 96, name: 'favicon-96x96.png' },
  { size: 192, name: 'android-chrome-192x192.png' },
  { size: 512, name: 'android-chrome-512x512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
];

console.log('Создаю веб-иконки...');

// Создаем все размеры
Promise.all(
  sizes.map(({ size, name }) => {
    const outputPath = path.join(publicIconsDir, name);
    return sharp(pngPath)
      .resize(size, size)
      .png()
      .toFile(outputPath)
      .then(() => {
        console.log(`✅ Создано: ${name} (${size}x${size})`);
      });
  })
)
  .then(() => {
    // Создаем favicon.ico (16x16 и 32x32)
    const favicon16 = path.join(publicIconsDir, 'favicon-16x16.png');
    const favicon32 = path.join(publicIconsDir, 'favicon-32x32.png');
    const faviconIco = path.join(__dirname, '..', 'public', 'favicon.ico');
    
    // Копируем 32x32 как favicon.ico (простое решение)
    return sharp(favicon32)
      .resize(32, 32)
      .png()
      .toFile(faviconIco)
      .then(() => {
        console.log('✅ Создано: favicon.ico');
        console.log('\n✅ Все веб-иконки созданы в public/icons/ и public/favicon.ico');
      });
  })
  .catch((err) => {
    console.error('Ошибка при создании веб-иконок:', err);
    process.exit(1);
  });

