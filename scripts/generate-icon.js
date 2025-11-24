const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Создаем простую SVG иконку с буквой N на синем фоне
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Синий фон -->
  <rect width="1024" height="1024" fill="#3B82F6" rx="180"/>
  
  <!-- Белая буква N -->
  <text 
    x="512" 
    y="512" 
    font-family="Arial, sans-serif" 
    font-size="700" 
    font-weight="bold" 
    fill="white" 
    text-anchor="middle" 
    dominant-baseline="central"
    alignment-baseline="central"
  >N</text>
</svg>`;

// Сохраняем SVG в оба места
const buildIconsDir = path.join(__dirname, '..', 'build', 'icons');
const assetsIconsDir = path.join(__dirname, '..', 'assets', 'icons');

[buildIconsDir, assetsIconsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const svgPath = path.join(buildIconsDir, 'icon.svg');
fs.writeFileSync(svgPath, svgIcon);
console.log('✅ SVG иконка создана:', svgPath);

// Пытаемся создать PNG используя create-icon-png.js
try {
  execSync('node scripts/create-icon-png.js', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  // После создания PNG создаем веб-иконки
  console.log('\nСоздаю веб-иконки...');
  execSync('node scripts/create-web-icons.js', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
} catch (error) {
  console.log('\n⚠️  Не удалось автоматически создать иконки. Запустите вручную:');
  console.log('   node scripts/create-icon-png.js');
  console.log('   node scripts/create-web-icons.js');
}

