import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";

export const uploadDir = path.join(import.meta.dirname, "..", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${crypto.randomUUID()}${ext}`);
    },
});

export const upload = multer({ storage });