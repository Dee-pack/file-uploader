import { Router } from "express";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import passport from "../config/passport.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const signUpRules = [
    body("email").trim().isEmail().withMessage("Enter a valid email.").normalizeEmail(),
    body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters."),
    body("confirmPassword")
        .custom((value, { req }) => value === req.body.password)
        .withMessage("Passwords do not match."),
];

router.get("/sign-up", (req, res) => {
    res.render("sign-up", { errors: [], email: "" });
});

router.post("/sign-up", signUpRules, async (req, res) => {
    const result = validationResult(req);
    const { email, password } = req.body;

    if (!result.isEmpty()) {
        return res.status(400).render("sign-up", { errors: result.array(), email });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return res.status(400).render("sign-up", {
            errors: [{ msg: "That email is already registered." }],
            email,
        });
    }

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { email, password: hashed } });
    res.redirect("/login");
});

router.get("/login", (req, res) => {
    const errors = (req.session.messages || []).map((msg) => ({ msg }));
    req.session.messages = [];
    res.render("login", { errors });
});

router.post(
    "/login",
    passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/login",
        failureMessage: true,
    })
);

router.post("/logout", (req, res, next) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect("/");
    });
});

export default router;