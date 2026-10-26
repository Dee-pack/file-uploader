import path from "node:path";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import { MAX_FILE_SIZE, RULES, ALLOWED_LABEL } from "../lib/upload-rules.js";

const maxMb = MAX_FILE_SIZE / 1024 / 1024;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE, files: 1 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).slice(1).toLowerCase();
        if (!RULES[ext]) {
            req.uploadError = `That file type isn't allowed. Allowed types: ${ALLOWED_LABEL}.`;
            return cb(null, false);
        }
        cb(null, true);
    },
}).single("file");

// Returns an error message, or null if the file's real contents match its extension
async function checkContent(file) {
    if (file.size === 0) return "That file is empty.";

    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    const rule = RULES[ext];

    if (rule.kind === "binary") {
        const detected = await fileTypeFromBuffer(file.buffer);
        if (!detected || detected.mime !== rule.mime) {
            return `That file doesn't look like a real .${ext} file.`;
        }
    } else {
        // Plain-text types: real text files never contain null bytes
        if (file.buffer.subarray(0, 8192).includes(0)) {
            return `That file doesn't look like a real .${ext} file.`;
        }
    }

    // From here on, store the type WE verified, not the one the browser claimed
    file.mimetype = rule.mime;
    return null;
}

// Use in place of upload.single("file"). On a problem it sets req.uploadError
// (and leaves req.file undefined) instead of throwing, so routes can re-render.
export function uploadSingle(req, res, next) {
    upload(req, res, async (err) => {
        if (err) {
            if (err instanceof multer.MulterError) {
                req.uploadError =
                    err.code === "LIMIT_FILE_SIZE"
                        ? `That file is too large. The maximum size is ${maxMb} MB.`
                        : "Upload failed. Please choose a single file and try again.";
                return next();
            }
            return next(err);
        }

        if (req.uploadError || !req.file) return next();

        try {
            const problem = await checkContent(req.file);
            if (problem) {
                req.uploadError = problem;
                req.file = undefined;
            }
            next();
        } catch (e) {
            next(e);
        }
    });
}