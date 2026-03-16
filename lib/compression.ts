export async function compressImage(file: File, targetSizeMB: number = 1): Promise<File> {
    if (!file.type.startsWith('image/')) {
        return file;
    }

    if (file.size <= targetSizeMB * 1024 * 1024) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            let quality = 0.9;
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');

            if (!ctx) {
                reject(new Error("Canvas context unavailable"));
                return;
            }

            // Initial dimensions
            let width = img.width;
            let height = img.height;

            // Resize if too massive (e.g. > 4K) to help compression
            const MAX_DIMENSION = 1920;
            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                    height = Math.round((height * MAX_DIMENSION) / width);
                    width = MAX_DIMENSION;
                } else {
                    width = Math.round((width * MAX_DIMENSION) / height);
                    height = MAX_DIMENSION;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, width, height);

            const attemptCompression = (q: number) => {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error("Compression failed"));
                            return;
                        }

                        if (blob.size <= targetSizeMB * 1024 * 1024 || q <= 0.1) {
                            const compressedFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            resolve(compressedFile);
                        } else {
                            // Try again with lower quality
                            attemptCompression(q - 0.1);
                        }
                    },
                    'image/jpeg',
                    q
                );
            };

            attemptCompression(quality);
        };

        img.onerror = (err) => reject(err);
        img.src = url;
    });
}
