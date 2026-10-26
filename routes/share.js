import { Router } from "express";
import { getDownloadUrl } from "../lib/storage.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

// Runs on EVERY share request, including downloads: link must exist and not be expired
async function loadShare(req, res, next) {
    const share = await prisma.share.findUnique({
        where: { id: req.params.shareId },
        include: { folder: true },
    });

    if (!share || share.expiresAt <= new Date()) {
        return res.status(404).render("share-unavailable");
    }

    res.set("X-Robots-Tag", "noindex, nofollow"); // keep links out of search engines
    req.share = share;
    next();
}

router.get("/share/:shareId", loadShare, async (req, res) => {
    const files = await prisma.file.findMany({
        where: { folderId: req.share.folderId },
        orderBy: { name: "asc" },
    });
    res.render("share", { share: req.share, files });
});

router.get("/share/:shareId/files/:fileId/download", loadShare, async (req, res) => {
    const fileId = Number(req.params.fileId);
    if (!Number.isInteger(fileId)) return res.status(404).send("File not found");

    // The file must live in the SHARED folder, not just exist
    const file = await prisma.file.findFirst({
        where: { id: fileId, folderId: req.share.folderId },
    });
    if (!file) return res.status(404).send("File not found");

    const url = await getDownloadUrl(file.storagePath, file.name);
    res.redirect(url);
});

export default router;