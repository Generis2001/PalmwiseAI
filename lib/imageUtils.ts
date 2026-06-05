// Compress a palm photo to ≤512px JPEG for sending to OpenAI Vision
export async function compressPalmImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 512;
      let { width, height } = img;

      if (width > MAX || height > MAX) {
        if (width > height) {
          height = Math.round((height * MAX) / width);
          width = MAX;
        } else {
          width = Math.round((width * MAX) / height);
          height = MAX;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas not supported"));

      ctx.drawImage(img, 0, 0, width, height);
      // data URL → strip prefix → pure base64
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      resolve(dataUrl.replace(/^data:image\/jpeg;base64,/, ""));
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}
