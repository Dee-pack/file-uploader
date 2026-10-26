export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// extension -> the MIME type we accept and trust for it
export const RULES = {
    jpg: { mime: "image/jpeg", kind: "binary" },
    jpeg: { mime: "image/jpeg", kind: "binary" },
    png: { mime: "image/png", kind: "binary" },
    gif: { mime: "image/gif", kind: "binary" },
    webp: { mime: "image/webp", kind: "binary" },
    pdf: { mime: "application/pdf", kind: "binary" },
    docx: {
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        kind: "binary",
    },
    txt: { mime: "text/plain", kind: "text" },
    md: { mime: "text/markdown", kind: "text" },
    csv: { mime: "text/csv", kind: "text" },
};

export const ALLOWED_LABEL = Object.keys(RULES)
    .map((ext) => `.${ext}`)
    .join(", ");