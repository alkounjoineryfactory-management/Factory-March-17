"use server";

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function uploadFile(formData: FormData) {
    const file = formData.get("file") as File;
    if (!file) {
        throw new Error("No file uploaded");
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const timestamp = Date.now();
    // Keep original extension if present, otherwise default to bin
    const parts = file.name.split('.');
    const ext = parts.length > 1 ? parts.pop() : 'bin';
    const nameWithoutExt = parts.join('.');
    const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `${timestamp}-${cleanName}.${ext}`;

    // Ensure upload directory exists
    const uploadDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true });
    }

    const path = join(uploadDir, filename);
    await writeFile(path, buffer);

    return `/uploads/${filename}`;
}
