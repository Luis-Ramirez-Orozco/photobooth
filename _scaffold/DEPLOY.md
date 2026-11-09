# Deploy checklist
1. `git init`, commit, create the GitHub repo, push `main`; Settings > Pages > deploy from `main` / root.
2. After editing `assets/*.js` or `*.css`, bump the `?v=N` query on those tags (iPhone/iPad Safari caches them).
3. Custom domain: run `~/.claude/skills/site-kickoff/scripts/urls.sh <folder>` to list every place the site URL appears, replace them all, add a `CNAME` file, then submit `sitemap.xml` in Search Console.
4. Test on the real phone and iPad with `serve-phone.sh` before announcing.
