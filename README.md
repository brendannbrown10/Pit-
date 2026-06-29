# The Pit Archive

A small, publishable website for cataloguing metal memorabilia and live shots.
The public can browse the wall; only you (the curator) can add, edit, or delete pieces.

- **Astro** — the fast static site visitors see
- **Supabase** — database (entries), photo storage, and your login
- **Cloudinary** — optional, for fancier image optimization later (not needed to launch)

You'll go from zip to live website in roughly half an hour, most of it clicking
around dashboards rather than coding.

---

## What you need (all free)

- [Node.js](https://nodejs.org) 18 or newer (`node -v` to check)
- A free [Supabase](https://supabase.com) account
- A free [GitHub](https://github.com) account
- A free host — [Cloudflare Pages](https://pages.cloudflare.com), Netlify, or Vercel

---

## Step 1 — Set up Supabase (the backend)

1. Create a new project at supabase.com. Pick a strong database password and a
   region near you (e.g. West US). Wait ~2 minutes for it to spin up.
2. In the left sidebar open **SQL Editor → New query**. Open the file
   `supabase-setup.sql` from this project, copy the whole thing in, and click
   **Run**. This creates the `entries` table, the `photos` storage bucket, and
   the security rules that let the public read but only you write.
3. Create your curator login: **Authentication → Users → Add user**. Enter your
   email and a password, and check **Auto Confirm User** so you can log in right away.
4. Grab your keys: **Project Settings → API**. You want the **Project URL** and the
   **anon / public** key. (The anon key is meant to be public — your data is
   protected by the security rules from step 2, not by hiding the key.)

## Step 2 — Run it on your computer

```bash
npm install
cp .env.example .env
```

Open `.env` and paste in the two values from step 1.4:

```
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
```

Then start it:

```bash
npm run dev
```

Visit **http://localhost:4321** for the public wall and
**http://localhost:4321/admin** to log in and pin up your first piece.
Add one, then refresh the home page — it's really saved this time.

## Step 3 — Put it on GitHub

```bash
git init
git add .
git commit -m "The Pit Archive"
```

Make a new empty repo on GitHub (no README, since you have one), then:

```bash
git remote add origin https://github.com/YOUR-USERNAME/pit-archive.git
git branch -M main
git push -u origin main
```

Your `.env` stays private — `.gitignore` keeps it off GitHub.

## Step 4 — Publish it

Using **Cloudflare Pages** (Netlify and Vercel are nearly identical):

1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**,
   and pick your `pit-archive` repo.
2. Build settings — framework preset **Astro**:
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add the same two environment variables (`PUBLIC_SUPABASE_URL` and
   `PUBLIC_SUPABASE_ANON_KEY`) under the build settings before deploying.
4. Deploy. You'll get a public URL like `pit-archive.pages.dev`. Share that.

From now on, every `git push` redeploys automatically. And because the gallery
reads live from Supabase, **adding a new piece from `/admin` shows up instantly
for visitors — no rebuild needed.**

---

## Adding entries from your phone

Once it's live, just visit `your-site.pages.dev/admin` on your phone, log in, and
the upload form uses your camera roll. Photos are resized in the browser before
upload, so it's quick even on a venue's terrible wifi.

## Optional: Cloudinary later

You don't need it to launch — Supabase Storage already serves your photos. If you
later want automatic format conversion (WebP/AVIF), on-the-fly thumbnails, or
heavier galleries, swap the upload in `src/components/Admin.jsx` to push to
Cloudinary and store that URL in `image_url` instead. The rest of the app doesn't
change, since it only ever reads `image_url`.

## Make it yours

- Masthead text: `src/pages/index.astro` and `src/layouts/Base.astro`
- Colors and type: the `:root` block at the top of `src/styles/global.css`
- New fields (e.g. a "rarity" rating): add a column in Supabase, then a field in
  the form in `Admin.jsx` and a line in the detail view in `Gallery.jsx`

## If something breaks

- **"Connect Supabase" notice won't go away** — your `.env` values are missing or
  the dev server wasn't restarted after editing `.env`.
- **Can log in but saving fails** — re-run `supabase-setup.sql`; the storage rules
  probably didn't apply.
- **Photos don't show** — confirm the `photos` bucket is marked **public** in
  Supabase Storage.
