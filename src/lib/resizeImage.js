const MAX_DIMENSION = 256;
const JPEG_QUALITY = 0.85;
const MAX_BYTES = 400_000;

export function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('File harus berupa gambar'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Gambar tidak valid'));
      img.onload = () => {
        try {
          const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          let quality = JPEG_QUALITY;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);

          while (dataUrl.length > MAX_BYTES * 1.37 && quality > 0.4) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          if (dataUrl.length > MAX_BYTES * 1.37) {
            reject(new Error('Gambar terlalu besar, pilih foto yang lebih kecil'));
            return;
          }

          resolve(dataUrl);
        } catch {
          reject(new Error('Gagal memproses gambar'));
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
