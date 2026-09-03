const fs = require('fs');
const path = require('path');

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// 0. Limpiar archivos .tsx viejos que causen conflicto
const oldAppPage = path.join(__dirname, 'app', 'page.tsx');
if (fs.existsSync(oldAppPage)) {
  fs.copyFileSync(oldAppPage, path.join(__dirname, 'old_inventory_app_page.bak'));
  fs.unlinkSync(oldAppPage);
}
const oldTsxBackup = path.join(__dirname, 'old_inventory_app_page.tsx');
if (fs.existsSync(oldTsxBackup)) {
  fs.unlinkSync(oldTsxBackup);
}

// 1. Copiar app/ de NUEVA TIENDA a la raiz app/
const srcApp = path.join(__dirname, 'NUEVA TIENDA', 'app');
const destApp = path.join(__dirname, 'app');
if (fs.existsSync(srcApp)) {
  copyDirRecursive(srcApp, destApp);
  console.log('Carpeta app/ sincronizada a la raiz exitosamente.');
}

// 2. Copiar public/ de NUEVA TIENDA a la raiz public/
const srcPublic = path.join(__dirname, 'NUEVA TIENDA', 'public');
const destPublic = path.join(__dirname, 'public');
if (fs.existsSync(srcPublic)) {
  copyDirRecursive(srcPublic, destPublic);
  console.log('Carpeta public/ sincronizada a la raiz exitosamente.');
}

// 3. Copiar componentes, stores, types, lib
const folders = ['components', 'stores', 'types', 'lib'];
for (const folder of folders) {
  const srcF = path.join(__dirname, 'NUEVA TIENDA', folder);
  const destF = path.join(__dirname, folder);
  if (fs.existsSync(srcF)) {
    copyDirRecursive(srcF, destF);
    console.log(`Carpeta ${folder}/ sincronizada a la raiz.`);
  }
}

console.log('¡Sincronización total a la raíz completada!');
