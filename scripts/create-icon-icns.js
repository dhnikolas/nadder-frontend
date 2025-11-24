const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const buildIconsDir = path.join(__dirname, '..', 'build', 'icons');
const assetsIconsDir = path.join(__dirname, '..', 'assets', 'icons');
const pngPath = path.join(buildIconsDir, 'icon.png');

// Проверяем наличие PNG
if (!fs.existsSync(pngPath)) {
  console.error('PNG файл не найден. Сначала запустите: node scripts/create-icon-png.js');
  process.exit(1);
}

// Создаем iconset
const iconsetDir = path.join(buildIconsDir, 'icon.iconset');
if (!fs.existsSync(iconsetDir)) {
  fs.mkdirSync(iconsetDir, { recursive: true });
}

console.log('Создаю иконки разных размеров...');

// Создаем иконки разных размеров
const sizes = [
  { size: 16, name: 'icon_16x16.png' },
  { size: 32, name: 'icon_16x16@2x.png' },
  { size: 32, name: 'icon_32x32.png' },
  { size: 64, name: 'icon_32x32@2x.png' },
  { size: 128, name: 'icon_128x128.png' },
  { size: 256, name: 'icon_128x128@2x.png' },
  { size: 256, name: 'icon_256x256.png' },
  { size: 512, name: 'icon_256x256@2x.png' },
  { size: 512, name: 'icon_512x512.png' },
  { size: 1024, name: 'icon_512x512@2x.png' },
];

sizes.forEach(({ size, name }) => {
  try {
    execSync(`sips -z ${size} ${size} "${pngPath}" --out "${path.join(iconsetDir, name)}"`, { stdio: 'ignore' });
  } catch (error) {
    console.error(`Ошибка при создании ${name}:`, error.message);
  }
});

// Создаем .icns файл
const icnsPath = path.join(buildIconsDir, 'icon.icns');
try {
  execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`, { stdio: 'inherit' });
  console.log('✅ .icns файл создан:', icnsPath);
  
  // Копируем в assets
  if (!fs.existsSync(assetsIconsDir)) {
    fs.mkdirSync(assetsIconsDir, { recursive: true });
  }
  fs.copyFileSync(icnsPath, path.join(assetsIconsDir, 'icon.icns'));
  console.log('✅ .icns файл скопирован в assets/icons/');
} catch (error) {
  console.error('Ошибка при создании .icns:', error.message);
  process.exit(1);
}

