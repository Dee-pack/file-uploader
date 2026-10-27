# File Uploader

A stripped-down personal storage app (think a small Google Drive). Users sign up, organize files into folders, upload and download them, and share a folder through a link that expires.

**Check it out:** https://file-uploader-qau0.onrender.com

> The demo runs on a free instance that sleeps when idle, so the first load after a quiet period can take up to a minute.

## Features

- **Authentication:** sign up, log in, and log out with Passport (local strategy). Passwords are hashed with bcrypt, and sessions are stored in PostgreSQL through the Prisma session store.
- **Folders:** create, rename, and delete folders. Deleting a folder also removes its files from storage.
- **File uploads:** upload files directly or into a folder, using drag and drop or the file picker.
- **File details and download:** each file has a page with its name, size, type, and upload time, plus a download button that serves the original filename.
- **Move and delete files:** move a file between folders (or out of one) and delete files individually.
- **Cloud storage:** files live in a private Supabase Storage bucket. The database stores each file's storage path, and downloads use short-lived signed URLs.
- **Validation:** an allow-list of file types, a 10 MB size limit, and a content check that compares a file's real bytes to its extension, so a renamed file is rejected.
- **Shareable folder links (extra credit):** share a folder with a link that lasts 1, 3, 7, 10, or 30 days. Anyone with the link can view and download the folder's files without an account, and the owner can revoke a link at any time.
- **Responsive design:** works on phones and desktops, follows the system light or dark theme, and shows times in the visitor's own time zone.

## Tech stack

- Node.js and Express 5
- EJS templates with plain CSS and a little client-side JavaScript
- Passport (`passport-local`), `express-session`, and `@quixo3/prisma-session-store`
- Prisma 7 with PostgreSQL
- Multer (memory storage) and `file-type` for upload handling and content checks
- Supabase Storage for file storage
- `express-validator` and `bcryptjs`
- Deployed on Render, with the production database on Supabase Postgres

## Getting started locally

### Prerequisites

- Node.js 20.11 or newer
- A PostgreSQL database (local or hosted)
- A free [Supabase](https://supabase.com/) project with a **private** Storage bucket named `uploads`

### Setup

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/Dee-pack/file-uploader.git
   cd file-uploader
   npm install
   ```

2. Create a `.env` file in the project root:

   ```
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/file_uploader"
   SESSION_SECRET=a_long_random_string
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_SECRET_KEY=your_supabase_secret_key
   SUPABASE_BUCKET=uploads
   ```

   Generate a session secret with `openssl rand -hex 64`.

3. Create the database tables and the Prisma client:

   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

   The app runs at http://localhost:3000.

### Environment variables

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `SESSION_SECRET` | Long random string used to sign session cookies |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SECRET_KEY` | Supabase secret (server-side) key. Never expose it in browser code. |
| `SUPABASE_BUCKET` | Name of the private storage bucket (`uploads`) |
| `NODE_ENV` | Set to `production` when deployed so cookies are marked secure |
| `PORT` | Optional. Defaults to 3000. |

## Project structure

```
app.js               Express app, session and Passport setup
config/
  passport.js        Local strategy and session serialization
  multer.js          Upload handling and validation
lib/
  prisma.js          Shared Prisma client
  supabase.js        Supabase client
  storage.js         Upload, signed URL, and delete helpers
  upload-rules.js    Allowed file types and size limit
  format.js          Human-readable file sizes
middleware/
  auth.js            Route guard for logged-in users
routes/
  auth.js            Sign up, log in, log out
  files.js           Upload, details, download, move, delete
  folders.js         Folder CRUD, uploads into folders, share links
  share.js           Public share pages (no login required)
prisma/              Schema and migrations
views/               EJS templates and partials
public/              CSS and client-side JavaScript
```

## Security notes

- Every file and folder query is scoped to the logged-in user, and other users' resources return a "not found" response.
- Uploads are checked on the server by extension, size, and actual file contents. The stored content type comes from that verified check, not from the browser.
- Files are stored under generated UUID names, so user-supplied filenames never decide where a file lands.
- The storage bucket is private. Downloads use signed URLs that expire after 60 seconds.
- Share links use random UUIDs, expiry is checked on every request (including downloads), and each download is limited to files inside the shared folder.

## Deployment

The app is deployed on Render from this repository.

- **Build command:** `npm install && npx prisma generate && npx prisma migrate deploy`
- **Start command:** `npm start`
- **Database:** Supabase Postgres, connected through the session pooler connection string
- **Environment variables:** the table above, with `NODE_ENV=production`

Every push to `main` redeploys the app and applies any new migrations.

## Possible improvements

- Rate limiting on the login route
- Security headers with `helmet`
- Cleaning up expired share links automatically
- Nested folders
- Per-user storage quotas
