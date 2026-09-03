const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Copiar banner PC
const pcSrc = path.join(__dirname, 'bannerpc.jfif');
if (fs.existsSync(pcSrc)) {
  fs.copyFileSync(pcSrc, path.join(publicDir, 'bannerpc.jfif'));
  fs.copyFileSync(pcSrc, path.join(publicDir, 'bannerpc.jpg'));
  fs.copyFileSync(pcSrc, path.join(publicDir, 'bannerpc.png'));
}

// 2. Copiar banner Móvil
const movileSrc = path.join(__dirname, 'bannermovile.jfif');
if (fs.existsSync(movileSrc)) {
  fs.copyFileSync(movileSrc, path.join(publicDir, 'bannermovile.jfif'));
  fs.copyFileSync(movileSrc, path.join(publicDir, 'bannermovile.jpg'));
  fs.copyFileSync(movileSrc, path.join(publicDir, 'bannermobile.jpg'));
  fs.copyFileSync(movileSrc, path.join(publicDir, 'bannermovile.png'));
  fs.copyFileSync(movileSrc, path.join(publicDir, 'bannermobile.png'));
}

// 3. Copiar Logos y Assets de Marca desde el inventario original
const parentPublic = path.join(__dirname, '..', 'public');
if (fs.existsSync(parentPublic)) {
  const files = fs.readdirSync(parentPublic);
  for (const file of files) {
    const src = path.join(parentPublic, file);
    const dest = path.join(publicDir, file);
    if (fs.statSync(src).isFile()) {
      fs.copyFileSync(src, dest);
    }
  }
}

// Sincronizar Logotipo.png si está en public/ hacia parent
const localLogoPng = path.join(publicDir, 'Logotipo.png');
if (fs.existsSync(localLogoPng) && fs.existsSync(parentPublic)) {
  fs.copyFileSync(localLogoPng, path.join(parentPublic, 'Logotipo.png'));
}
console.log('Todos los assets y logos sincronizados en public/ correctamente.');
