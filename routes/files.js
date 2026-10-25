import { Router } from "express";
import { ensureAuth } from "../middleware/auth.js";
import { upload } from "../config/multer.js";
import { uploadFile, getDownloadUrl, removeFiles } from "../lib/storage.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

async function listUnfiled(userId) {
    return prisma.file.findMany({
        where: { userId },
        orderBy: { uploadedAt: "desc" },
    });
}

router.get("/upload", ensureAuth, async (req, res) => {
    res.render("upload", { files: await listUnfiled(req.user.id), error: null });
});

router.post("/upload", ensureAuth, upload.single("file"), async (req, res) => {
    if (!req.file) {
        const files = await listUnfiled(req.user.id);
        return res.status(400).render("upload", { files, error: "Please choose a file." });
    }

    const storagePath = await uploadFile(req.user.id, req.file);

    try {
        await prisma.file.create({
            data: {
                name: req.file.originalname,
                storagePath,
                mimeType: req.file.mimetype,
                size: req.file.size,
                userId: req.user.id,
            },
        });
    } catch (err) {
        await removeFiles([storagePath]); // don't leave an orphan in the bucket
        throw err;
    }

    res.redirect("/upload");
});

// Loads the file only if it belongs to the logged-in user
async function loadFile(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(404).send("File not found");

    const file = await prisma.file.findFirst({
        where: { id, userId: req.user.id },
        include: { folder: true },
    });
    if (!file) return res.status(404).send("File not found");

    req.fileRecord = file;
    next();
}

router.get("/files/:id", ensureAuth, loadFile, (req, res) => {
    res.render("file", { file: req.fileRecord });
});

router.get("/files/:id/download", ensureAuth, loadFile, async (req, res) => {
    const url = await getDownloadUrl(req.fileRecord.storagePath, req.fileRecord.name);
    res.redirect(url);
});

export default router;