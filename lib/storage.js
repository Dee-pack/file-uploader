import path from "node:path";
import crypto from "node:crypto";
import { supabase, BUCKET } from "./supabase.js";

export async function uploadFile(userId, file) {
    // Keep only safe characters from the extension; the rest of the name is a UUID
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, "");
    const storagePath = `${userId}/${crypto.randomUUID()}${ext}`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });

    if (error) {
        console.error("Supabase upload error:", error.message, error.originalError?.cause ?? error.cause);
        throw new Error(`Storage upload failed: ${error.message}`);
    }
    return storagePath;
}

export async function getDownloadUrl(storagePath, downloadName) {
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, 60, { download: downloadName });

    if (error) throw new Error(`Could not create download link: ${error.message}`);
    return data.signedUrl;
}

export async function removeFiles(storagePaths) {
    if (storagePaths.length === 0) return;
    const { error } = await supabase.storage.from(BUCKET).remove(storagePaths);
    if (error) throw new Error(`Storage delete failed: ${error.message}`);
}