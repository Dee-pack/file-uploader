import path from "node:path";
import { Router } from "express";
import { ensureAuth } from "../middleware/auth.js";
import { upload, uploadDir } from "../config/multer.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/upload", ensureAuth, async (req, res) => {
    const files = await prisma.file.findMany({
        where: { userId: req.user.id },
        orderBy: { uploadedAt: "desc" },
    });
    res.render("upload", { files, error: null });
});

router.post("/upload", ensureAuth, upload.single("file"), async (req, res) => {
    if (!req.file) {
        const files = await prisma.file.findMany({
            where: { userId: req.user.id },
            orderBy: { uploadedAt: "desc" },
        });
        return res.status(400).render("upload", { files, error: "Please choose a file." });
    }

    await prisma.file.create({
        data: {
            name: req.file.originalname,
            storedName: req.file.filename,
            mimeType: req.file.mimetype,
            size: req.file.size,
            userId: req.user.id,
        },
    });

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

    req.file = file;
    next();
}

router.get("/files/:id", ensureAuth, loadFile, (req, res) => {
    res.render("file", { file: req.file });
});

router.get("/files/:id/download", ensureAuth, loadFile, (req, res, next) => {
    const filePath = path.join(uploadDir, req.file.storedName);

    // The second argument sets the download name to the original filename
    res.download(filePath, req.file.name, (err) => {
        if (err && !res.headersSent) {
            return err.code === "ENOENT" ? res.status(404).send("File missing from storage") : next(err);
        }
    });
});

export default router;