import "dotenv/config";
import path from "node:path";
import express from "express";
import session from "express-session";
import { PrismaSessionStore } from "@quixo3/prisma-session-store";
import { prisma } from "./lib/prisma.js";
import passport from "./config/passport.js";
import authRouter from "./routes/auth.js";
import filesRouter from "./routes/files.js";
import foldersRouter from "./routes/folders.js";
import { formatBytes } from "./lib/format.js";
import { RULES, MAX_FILE_SIZE } from "./lib/upload-rules.js";
import shareRouter from "./routes/share.js";

const app = express();
app.locals.formatBytes = formatBytes;
app.locals.uploadHint = `Allowed: ${Object.keys(RULES).map((e) => "." + e).join(", ")}. Max ${MAX_FILE_SIZE / 1024 / 1024} MB.`;
app.locals.uploadAccept = Object.keys(RULES).map((e) => "." + e).join(",");
app.locals.maxBytes = MAX_FILE_SIZE;

app.set("view engine", "ejs");
app.set("views", path.join(import.meta.dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(import.meta.dirname, "public")));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
    store: new PrismaSessionStore(prisma, {
      checkPeriod: 2 * 60 * 1000,
      dbRecordIdIsSessionId: true,
      dbRecordIdFunction: undefined,
    }),
  })
);

app.use(passport.session());

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  next();
});

app.use(authRouter);
app.use(filesRouter);
app.use(shareRouter);
app.use(foldersRouter)

app.get("/", (req, res) => {
  res.render("index");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));