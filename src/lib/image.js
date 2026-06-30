// Resize an image file down to a max edge and return a JPEG Blob.
// Keeps uploads small so storage stays well within the free tier and
// the public gallery loads fast.
export function resizeToBlob(file, max = 1100, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file did not look like an image."));
      img.onload = () => {
        let { width: w, height: h } = img;
        if (w > h && w > max) {
          h = Math.round((h * max) / w);
          w = max;
        } else if (h >= w && h > max) {
          w = Math.round((w * max) / h);
          h = max;
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Could not process that image."))),
          "image/jpeg",
          quality
        );
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
