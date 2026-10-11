# Deploy to Vercel (Hobby)

1. Push to GitHub: create an empty repo, then `git remote add origin <url> && git push -u origin main`.
2. Vercel dashboard -> Add New -> Project -> import the repo. Framework preset: Next.js (auto). Deploy.
3. Project -> Storage -> Create -> Blob. Choose **Private** access (the app uses `access: "private"`; a public store will fail) and connect it to the project, all environments. This adds `BLOB_READ_WRITE_TOKEN`.
4. Redeploy (Deployments -> latest -> Redeploy) so the token is picked up.
5. Test: open the site, drop a small `.docx`, then a PDF over 5 MB (exercises multipart upload). Expect Copy/Download buttons.
   Verify cleanup: Storage -> your Blob store should show no leftover files.
   Also test an `.png` (rejected) and a scanned PDF (empty-result warning).

Notes
- Anyone with the site URL can use it (no login). Add Vercel Deployment Protection (Settings -> Deployment Protection) if it should stay private.
- Python function limit: 300 s (`vercel.json`), bundle must stay under 500 MB uncompressed.
