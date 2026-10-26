import { Router } from "express";
import { ensureAuth } from "../middleware/auth.js";
import { uploadSingle } from "../config/multer.js";
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

router.post("/upload", ensureAuth, uploadSingle, async (req, res) => {
    if (req.uploadError || !req.file) {
        const files = await listUnfiled(req.user.id);
        return res.status(400).render("upload", {
            files,
            error: req.uploadError || "Please choose a file.",
        });
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

router.get("/files/:id", ensureAuth, loadFile, async (req, res) => {
    const folders = await prisma.folder.findMany({
        where: { userId: req.user.id },
        orderBy: { name: "asc" },
    });
    res.render("file", { file: req.fileRecord, folders, error: null });
});

router.get("/files/:id/download", ensureAuth, loadFile, async (req, res) => {
    const url = await getDownloadUrl(req.fileRecord.storagePath, req.fileRecord.name);
    res.redirect(url);
});

router.post("/files/:id/delete", ensureAuth, loadFile, async (req, res) => {
    const file = req.fileRecord;

    // Bucket first: if this fails, the database row stays and you can retry.
    // Deleting a path that's already gone doesn't error, so retrying is safe.
    await removeFiles([file.storagePath]);
    await prisma.file.delete({ where: { id: file.id } });

    res.redirect(file.folderId ? `/folders/${file.folderId}` : "/upload");
});

router.post("/files/:id/move", ensureAuth, loadFile, async (req, res) => {
    const file = req.fileRecord;
    const raw = req.body.folderId;

    // An empty value means "no folder"
    let targetId = null;

    if (raw !== "") {
        const id = Number(raw);
        // The target must be a folder that belongs to this user
        const folder = Number.isInteger(id)
            ? await prisma.folder.findFirst({ where: { id, userId: req.user.id } })
            : null;

        if (!folder) {
            const folders = await prisma.folder.findMany({
                where: { userId: req.user.id },
                orderBy: { name: "asc" },
            });
            return res.status(400).render("file", {
                file,
                folders,
                error: "That folder doesn't exist.",
            });
        }
        targetId = folder.id;
    }

    await prisma.file.update({
        where: { id: file.id },
        data: { folderId: targetId },
    });

    res.redirect(`/files/${file.id}`);
});

export default router;