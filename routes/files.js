import { Router } from "express";
import { ensureAuth } from "../middleware/auth.js";
import { upload } from "../config/multer.js";
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

export default router;