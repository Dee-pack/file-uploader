// Show times in the visitor's own time zone
document.querySelectorAll("time.local-time").forEach((el) => {
    const d = new Date(el.getAttribute("datetime"));
    if (!isNaN(d)) {
        el.textContent = d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
    }
});

// Confirm dialogs via data-confirm (keeps filenames out of inline scripts)
document.addEventListener("submit", (e) => {
    const msg = e.target.dataset?.confirm;
    if (msg && !confirm(msg)) e.preventDefault();
});

// File pickers: drag highlight, selected name, quick client-side checks.
// This is a convenience only; the server still enforces every rule.
document.querySelectorAll("input[type=file][data-max-bytes]").forEach((input) => {
    const zone = input.closest(".dropzone");
    const label = zone.querySelector("[data-file-label]");
    const error = input.closest("form").querySelector("[data-file-error]");
    const original = label.textContent;
    const allowed = input.accept.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const max = Number(input.dataset.maxBytes);

    ["dragenter", "dragover"].forEach((ev) =>
        input.addEventListener(ev, () => zone.classList.add("is-over"))
    );
    ["dragleave", "drop", "change"].forEach((ev) =>
        input.addEventListener(ev, () => zone.classList.remove("is-over"))
    );

    input.addEventListener("change", () => {
        const file = input.files[0];
        error.hidden = true;
        if (!file) { label.textContent = original; return; }

        const ext = "." + file.name.split(".").pop().toLowerCase();
        let problem = "";
        if (allowed.length && !allowed.includes(ext)) problem = "That file type isn't allowed.";
        else if (file.size > max) problem = `That file is too large (max ${Math.round(max / 1024 / 1024)} MB).`;

        if (problem) {
            input.value = "";
            label.textContent = original;
            error.textContent = problem;
            error.hidden = false;
            return;
        }
        label.textContent = `${file.name} (${Math.max(1, Math.round(file.size / 1024))} KB)`;
    });
});

// Disable the upload button while a file is sending
document.querySelectorAll("form[data-upload]").forEach((form) => {
    form.addEventListener("submit", (e) => {
        if (e.defaultPrevented) return;
        const btn = form.querySelector("button");
        btn.disabled = true;
        btn.textContent = "Uploading…";
    });
});
window.addEventListener("pageshow", (e) => { if (e.persisted) location.reload(); });

// Copy share links
document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
        const input = document.querySelector(btn.dataset.copy);
        try {
            await navigator.clipboard.writeText(input.value);
            btn.textContent = "Copied!";
        } catch {
            input.select();
            btn.textContent = "Press Ctrl+C";
        }
        setTimeout(() => (btn.textContent = "Copy"), 1500);
    });
});