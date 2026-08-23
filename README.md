# BookmarkForge

> Import a browser bookmark export, clean it up, and get it back out in the format you need.

**[Live demo](https://bookmarkforge-mlx.vercel.app)**

Browser bookmark exports are a flat wall of HTML with years of duplicates and dead weight in them, and no browser gives you a decent way to audit that file. BookmarkForge parses the Netscape-format HTML that Chrome and Firefox produce (or a plain pasted list of URLs), rebuilds the folder tree, and shows every bookmark in a searchable, filterable list. It flags duplicate URLs by normalized comparison so you can strip them in one click, lets you attach your own tags, and exports the result as HTML, JSON, or Markdown. Everything runs in the browser — the file is parsed with `DOMParser` and never uploaded.

## Features

- Import bookmarks by file picker or drag-and-drop from a Chrome/Firefox HTML export, preserving the original folder structure
- Paste a raw list of URLs as an alternative import path
- Duplicate detection across the whole set, with a one-click "remove duplicates" action
- Filter by folder, by tag, by free-text search, or by duplicates-only
- Add and remove custom tags on individual bookmarks
- Export to Netscape HTML, JSON, or Markdown — exporting the current filtered view when a filter is active

## Stack

- Next.js 16 (App Router) with React 19, TypeScript, and Tailwind CSS v4
- No backend, no database, no external APIs — all parsing and export happens client-side

## Running locally

```bash
npm install
npm run dev
```

---

Part of a series of 90 small web apps. [Browse them all](https://lorenzoylosada.vercel.app).
