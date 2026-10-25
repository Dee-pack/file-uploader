import { Router } from "express";
import { body, validationResult } from "express-validator";
import { ensureAuth } from "../middleware/auth.js";
import { upload } from "../config/multer.js";
import { uploadFile, removeFiles } from "../lib/storage.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
router.use(ensureAuth);

const nameRule = body("name")
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Folder name must be 1 to 50 characters.");

// Loads the folder only if it belongs to the logged-in user
async function loadFolder(req, res, next) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return res.status(404).send("Folder not found");

    const folder = await prisma.folder.findFirst({
        where: { id, userId: req.user.id },
    });
    if (!folder) return res.status(404).send("Folder not found");

    req.folder = folder;
    next();
}

async function renderFolders(req, res, errors = [], status = 200) {
    const folders = await prisma.folder.findMany({
        where: { userId: req.user.id },
        orderBy: { name: "asc" },
        include: { _count: { select: { files: true } } },
    });
    res.status(status).render("folders", { folders, errors });
}

async function renderFolder(req, res, errors = [], status = 200) {
    const files = await prisma.file.findMany({
        where: { folderId: req.folder.id, userId: req.user.id },
        orderBy: { uploadedAt: "desc" },
    });
    res.status(status).render("folder", { folder: req.folder, files, errors });
}

// Create
router.get("/folders", (req, res) => renderFolders(req, res));

router.post("/folders", nameRule, async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) return renderFolders(req, res, result.array(), 400);

    const exists = await prisma.folder.findUnique({
        where: { userId_name: { userId: req.user.id, name: req.body.name } },
    });
    if (exists) {
        return renderFolders(req, res, [{ msg: "You already have a folder with that name." }], 400);
    }

    await prisma.folder.create({
        data: { name: req.body.name, userId: req.user.id },
    });
    res.redirect("/folders");
});

// Read
router.get("/folders/:id", loadFolder, (req, res) => renderFolder(req, res));

// Update (rename)
router.post("/folders/:id/rename", loadFolder, nameRule, async (req, res) => {
    const result = validationResult(req);
    if (!result.isEmpty()) return renderFolder(req, res, result.array(), 400);

    const clash = await prisma.folder.findFirst({
        where: {
            userId: req.user.id,
            name: req.body.name,
            NOT: { id: req.folder.id },
        },
    });
    if (clash) {
        return renderFolder(req, res, [{ msg: "You already have a folder with that name." }], 400);
    }

    await prisma.folder.update({
        where: { id: req.folder.id },
        data: { name: req.body.name },
    });
    res.redirect(`/folders/${req.folder.id}`);
});

// Delete
router.post("/folders/:id/delete", loadFolder, async (req, res) => {
    const files = await prisma.file.findMany({
        where: { folderId: req.folder.id, userId: req.user.id },
        select: { storagePath: true },
    });

    // Remove from the bucket first; if that fails, the folder stays and you can retry
    await removeFiles(files.map((f) => f.storagePath));

    await prisma.folder.delete({ where: { id: req.folder.id } });
    res.redirect("/folders");
});

// Upload into a folder: ownership is checked BEFORE multer saves anything
router.post("/folders/:id/upload", loadFolder, upload.single("file"), async (req, res) => {
    if (!req.file) return renderFolder(req, res, [{ msg: "Please choose a file." }], 400);

    const storagePath = await uploadFile(req.user.id, req.file);

    try {
        await prisma.file.create({
            data: {
                name: req.file.originalname,
                storagePath,
                mimeType: req.file.mimetype,
                size: req.file.size,
                userId: req.user.id,
                folderId: req.folder.id,
            },
        });
    } catch (err) {
        await removeFiles([storagePath]);
        throw err;
    }

    res.redirect(`/folders/${req.folder.id}`);
});

export default router;