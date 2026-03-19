"use client";

import { useState, useMemo, useCallback, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Bookmark {
  id: string;
  title: string;
  url: string;
  folder: string;
  tags: string[];
  addedAt: number;
}

// ─── Bookmark HTML Parser ────────────────────────────────────────────────────

function parseBookmarksHtml(html: string): Bookmark[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const bookmarks: Bookmark[] = [];

  function walk(node: Element, folder: string) {
    for (const child of Array.from(node.children)) {
      if (child.tagName === "DT") {
        const h3 = child.querySelector(":scope > H3");
        if (h3) {
          const dl = child.querySelector(":scope > DL");
          if (dl) walk(dl, h3.textContent?.trim() || folder);
          continue;
        }
        const a = child.querySelector(":scope > A");
        if (a) {
          const url = a.getAttribute("HREF") || "";
          if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
            bookmarks.push({
              id: crypto.randomUUID(),
              title: a.textContent?.trim() || url,
              url,
              folder: folder || "Unsorted",
              tags: [],
              addedAt: Date.now(),
            });
          }
        }
      } else if (child.tagName === "DL") {
        walk(child, folder);
      }
    }
  }

  const dl = doc.querySelector("DL");
  if (dl) walk(dl, "");
  return bookmarks;
}

function parseUrlList(text: string): Bookmark[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("http://") || line.startsWith("https://"))
    .map((url) => ({
      id: crypto.randomUUID(),
      title: new URL(url).hostname.replace("www.", ""),
      url,
      folder: "Imported",
      tags: [],
      addedAt: Date.now(),
    }));
}

// ─── Export Helpers ──────────────────────────────────────────────────────────

function exportAsHtml(bookmarks: Bookmark[]): string {
  const folders = new Map<string, Bookmark[]>();
  for (const b of bookmarks) {
    if (!folders.has(b.folder)) folders.set(b.folder, []);
    folders.get(b.folder)!.push(b);
  }
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>\n`;
  for (const [folder, items] of folders) {
    html += `  <DT><H3>${folder}</H3>\n  <DL><p>\n`;
    for (const b of items) {
      html += `    <DT><A HREF="${b.url}">${b.title}</A>\n`;
    }
    html += `  </DL><p>\n`;
  }
  html += `</DL><p>`;
  return html;
}

function exportAsJson(bookmarks: Bookmark[]): string {
  return JSON.stringify(bookmarks, null, 2);
}

function exportAsMarkdown(bookmarks: Bookmark[]): string {
  const folders = new Map<string, Bookmark[]>();
  for (const b of bookmarks) {
    if (!folders.has(b.folder)) folders.set(b.folder, []);
    folders.get(b.folder)!.push(b);
  }
  let md = "# Bookmarks\n\n";
  for (const [folder, items] of folders) {
    md += `## ${folder}\n\n`;
    for (const b of items) {
      md += `- [${b.title}](${b.url})`;
      if (b.tags.length > 0) md += ` — ${b.tags.map((t) => `\`${t}\``).join(" ")}`;
      md += "\n";
    }
    md += "\n";
  }
  return md;
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Icons (inline SVGs) ────────────────────────────────────────────────────

function IconBookmark({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
    </svg>
  );
}

function IconSearch({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function IconFolder({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function IconTag({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

function IconWarning({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function IconX({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconPlus({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function IconUpload({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function IconDownload({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function IconTrash({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

function IconGithub({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BookmarkForge() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [search, setSearch] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [tagInput, setTagInput] = useState<{ id: string; value: string } | null>(null);
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Derived data ────────────────────────────────────────────────────────

  const duplicateUrls = useMemo(() => {
    const urlCount = new Map<string, number>();
    for (const b of bookmarks) {
      const normalized = b.url.replace(/\/+$/, "").toLowerCase();
      urlCount.set(normalized, (urlCount.get(normalized) || 0) + 1);
    }
    const dupes = new Set<string>();
    for (const [url, count] of urlCount) {
      if (count > 1) dupes.add(url);
    }
    return dupes;
  }, [bookmarks]);

  const folders = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookmarks) {
      map.set(b.folder, (map.get(b.folder) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [bookmarks]);

  const allTags = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bookmarks) {
      for (const t of b.tags) {
        map.set(t, (map.get(t) || 0) + 1);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [bookmarks]);

  const filtered = useMemo(() => {
    let result = bookmarks;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          b.folder.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (selectedFolder) {
      result = result.filter((b) => b.folder === selectedFolder);
    }
    if (selectedTag) {
      result = result.filter((b) => b.tags.includes(selectedTag));
    }
    if (showDuplicatesOnly) {
      result = result.filter((b) =>
        duplicateUrls.has(b.url.replace(/\/+$/, "").toLowerCase())
      );
    }
    return result;
  }, [bookmarks, search, selectedFolder, selectedTag, showDuplicatesOnly, duplicateUrls]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseBookmarksHtml(text);
      setBookmarks((prev) => [...prev, ...parsed]);
      setShowImportModal(false);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handlePasteImport = useCallback(() => {
    const parsed = parseUrlList(pasteText);
    setBookmarks((prev) => [...prev, ...parsed]);
    setPasteText("");
    setPasteMode(false);
    setShowImportModal(false);
  }, [pasteText]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseBookmarksHtml(text);
      setBookmarks((prev) => [...prev, ...parsed]);
    };
    reader.readAsText(file);
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const addTag = useCallback((id: string, tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed) return;
    setBookmarks((prev) =>
      prev.map((b) =>
        b.id === id && !b.tags.includes(trimmed)
          ? { ...b, tags: [...b.tags, trimmed] }
          : b
      )
    );
  }, []);

  const removeTag = useCallback((id: string, tag: string) => {
    setBookmarks((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, tags: b.tags.filter((t) => t !== tag) } : b
      )
    );
  }, []);

  const removeDuplicates = useCallback(() => {
    const seen = new Set<string>();
    setBookmarks((prev) =>
      prev.filter((b) => {
        const normalized = b.url.replace(/\/+$/, "").toLowerCase();
        if (seen.has(normalized)) return false;
        seen.add(normalized);
        return true;
      })
    );
  }, []);

  const handleExport = useCallback(
    (format: "html" | "json" | "md") => {
      const data = filtered.length > 0 ? filtered : bookmarks;
      switch (format) {
        case "html":
          downloadFile(exportAsHtml(data), "bookmarks.html", "text/html");
          break;
        case "json":
          downloadFile(exportAsJson(data), "bookmarks.json", "application/json");
          break;
        case "md":
          downloadFile(exportAsMarkdown(data), "bookmarks.md", "text/markdown");
          break;
      }
      setShowExportMenu(false);
    },
    [filtered, bookmarks]
  );

  const isDuplicate = useCallback(
    (b: Bookmark) => duplicateUrls.has(b.url.replace(/\/+$/, "").toLowerCase()),
    [duplicateUrls]
  );

  const truncateUrl = (url: string, max = 50) => {
    try {
      const u = new URL(url);
      const display = u.hostname + u.pathname;
      return display.length > max ? display.slice(0, max) + "..." : display;
    } catch {
      return url.length > max ? url.slice(0, max) + "..." : url;
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Header */}
      <header className="border-b border-neutral-800 bg-[#0a0a0a]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <IconBookmark className="w-6 h-6 text-indigo-400" />
            <h1 className="text-xl font-bold tracking-tight text-white">BookmarkForge</h1>
          </div>
          <a
            href="https://github.com/maxilylm/su-bookmarkforge"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-400 hover:text-white transition-colors"
            aria-label="GitHub repository"
          >
            <IconGithub />
          </a>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b border-neutral-800 bg-[#0e0e0e]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <IconUpload className="w-4 h-4" />
            Import
          </button>

          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              disabled={bookmarks.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <IconDownload className="w-4 h-4" />
              Export
            </button>
            {showExportMenu && (
              <div className="absolute top-full mt-1 left-0 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl py-1 z-20 min-w-[160px]">
                <button
                  onClick={() => handleExport("html")}
                  className="w-full text-left px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700 transition-colors"
                >
                  HTML (re-importable)
                </button>
                <button
                  onClick={() => handleExport("json")}
                  className="w-full text-left px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700 transition-colors"
                >
                  JSON
                </button>
                <button
                  onClick={() => handleExport("md")}
                  className="w-full text-left px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700 transition-colors"
                >
                  Markdown
                </button>
              </div>
            )}
          </div>

          {duplicateUrls.size > 0 && (
            <button
              onClick={removeDuplicates}
              className="flex items-center gap-2 px-4 py-2 bg-amber-900/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/50 rounded-lg text-sm font-medium transition-colors"
            >
              <IconTrash className="w-4 h-4" />
              Remove {duplicateUrls.size} duplicate{duplicateUrls.size > 1 ? "s" : ""}
            </button>
          )}

          <div className="flex-1 min-w-[200px] relative">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="text"
              placeholder="Search bookmarks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-700 rounded-lg text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      {bookmarks.length > 0 && (
        <div className="border-b border-neutral-800 bg-[#0c0c0c]">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-6 text-xs text-neutral-400">
            <span>
              <strong className="text-neutral-200">{bookmarks.length}</strong> bookmarks
            </span>
            <span>
              <strong className="text-neutral-200">{folders.length}</strong> folders
            </span>
            <span>
              <strong className="text-neutral-200">{allTags.length}</strong> tags
            </span>
            {duplicateUrls.size > 0 && (
              <button
                onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                className={`flex items-center gap-1 transition-colors ${
                  showDuplicatesOnly
                    ? "text-amber-400"
                    : "text-amber-500/70 hover:text-amber-400"
                }`}
              >
                <IconWarning className="w-3.5 h-3.5" />
                <strong>{duplicateUrls.size}</strong> duplicate URL{duplicateUrls.size > 1 ? "s" : ""}
                {showDuplicatesOnly && " (filtered)"}
              </button>
            )}
            {(selectedFolder || selectedTag || showDuplicatesOnly) && (
              <button
                onClick={() => {
                  setSelectedFolder(null);
                  setSelectedTag(null);
                  setShowDuplicatesOnly(false);
                }}
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Clear filters
              </button>
            )}
            {filtered.length !== bookmarks.length && (
              <span className="ml-auto text-neutral-500">
                Showing {filtered.length} of {bookmarks.length}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        {bookmarks.length > 0 && (
          <aside className="w-56 shrink-0 border-r border-neutral-800 p-4 overflow-y-auto max-h-[calc(100vh-160px)] sticky top-[57px]">
            {/* Folders */}
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
              Folders
            </h3>
            <ul className="space-y-0.5 mb-6">
              {folders.map(([name, count]) => (
                <li key={name}>
                  <button
                    onClick={() =>
                      setSelectedFolder(selectedFolder === name ? null : name)
                    }
                    className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                      selectedFolder === name
                        ? "bg-indigo-600/20 text-indigo-300"
                        : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
                    }`}
                  >
                    <IconFolder />
                    <span className="truncate flex-1">{name}</span>
                    <span className="text-xs text-neutral-600">{count}</span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Tags */}
            {allTags.length > 0 && (
              <>
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map(([tag, count]) => (
                    <button
                      key={tag}
                      onClick={() =>
                        setSelectedTag(selectedTag === tag ? null : tag)
                      }
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                        selectedTag === tag
                          ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40"
                          : "bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-700"
                      }`}
                    >
                      {tag}
                      <span className="text-neutral-600">{count}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </aside>
        )}

        {/* Bookmark list */}
        <main className="flex-1 p-4">
          {bookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="w-16 h-16 rounded-2xl bg-neutral-800 flex items-center justify-center mb-4">
                <IconBookmark className="w-8 h-8 text-neutral-600" />
              </div>
              <h2 className="text-lg font-semibold text-neutral-300 mb-2">
                No bookmarks yet
              </h2>
              <p className="text-sm text-neutral-500 max-w-md mb-6">
                Import your bookmarks from Chrome or Firefox (HTML export), or
                paste a list of URLs to get started.
              </p>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <IconUpload className="w-4 h-4" />
                Import Bookmarks
              </button>
              <p className="text-xs text-neutral-600 mt-4">
                Or drag &amp; drop a bookmarks HTML file anywhere
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[40vh] text-center">
              <p className="text-neutral-500">No bookmarks match your filters.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((b) => (
                <div
                  key={b.id}
                  className={`group flex items-start gap-3 p-3 rounded-lg border transition-colors animate-fade-in ${
                    isDuplicate(b)
                      ? "border-amber-800/40 bg-amber-950/20 hover:bg-amber-950/30"
                      : "border-neutral-800 bg-neutral-900/50 hover:bg-neutral-800/50"
                  }`}
                >
                  {/* Favicon placeholder */}
                  <div className="w-8 h-8 rounded-md bg-neutral-800 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-neutral-500">
                      {b.title.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-neutral-200 hover:text-indigo-400 transition-colors truncate"
                      >
                        {b.title}
                      </a>
                      {isDuplicate(b) && (
                        <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-amber-900/40 text-amber-400 rounded text-xs">
                          <IconWarning className="w-3 h-3" />
                          Duplicate
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-500 truncate mt-0.5">
                      {truncateUrl(b.url, 70)}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-neutral-800 text-neutral-400 rounded text-xs">
                        <IconFolder className="w-3 h-3" />
                        {b.folder}
                      </span>
                      {b.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-900/30 text-indigo-300 border border-indigo-800/30 rounded-full text-xs"
                        >
                          <IconTag className="w-3 h-3" />
                          {tag}
                          <button
                            onClick={() => removeTag(b.id, tag)}
                            className="hover:text-red-400 transition-colors"
                            aria-label={`Remove tag ${tag}`}
                          >
                            <IconX className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {tagInput?.id === b.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            addTag(b.id, tagInput.value);
                            setTagInput(null);
                          }}
                          className="inline-flex"
                        >
                          <input
                            autoFocus
                            type="text"
                            value={tagInput.value}
                            onChange={(e) =>
                              setTagInput({ id: b.id, value: e.target.value })
                            }
                            onBlur={() => {
                              if (tagInput.value.trim()) addTag(b.id, tagInput.value);
                              setTagInput(null);
                            }}
                            placeholder="tag name"
                            className="w-20 px-2 py-0.5 bg-neutral-800 border border-neutral-600 rounded text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500"
                          />
                        </form>
                      ) : (
                        <button
                          onClick={() => setTagInput({ id: b.id, value: "" })}
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-neutral-600 hover:text-neutral-400 rounded text-xs transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <IconPlus className="w-3 h-3" />
                          tag
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => removeBookmark(b.id)}
                    className="shrink-0 p-1.5 text-neutral-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Remove bookmark"
                  >
                    <IconTrash />
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowImportModal(false);
          }}
        >
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <h2 className="text-lg font-semibold text-neutral-200">
                Import Bookmarks
              </h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setPasteMode(false);
                  setPasteText("");
                }}
                className="text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                <IconX className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              {!pasteMode ? (
                <div className="space-y-4">
                  <div
                    className="border-2 border-dashed border-neutral-700 hover:border-indigo-500 rounded-xl p-8 text-center cursor-pointer transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <IconUpload className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                    <p className="text-sm text-neutral-300 font-medium">
                      Click to upload or drag &amp; drop
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      Chrome or Firefox bookmarks HTML export
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".html,.htm"
                      onChange={handleFileImport}
                      className="hidden"
                    />
                  </div>
                  <div className="text-center">
                    <button
                      onClick={() => setPasteMode(true)}
                      className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Or paste URLs manually
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-neutral-400">
                    Paste one URL per line:
                  </p>
                  <textarea
                    autoFocus
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={"https://example.com\nhttps://another-site.org"}
                    rows={8}
                    className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-indigo-500 resize-none font-mono"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setPasteMode(false);
                        setPasteText("");
                      }}
                      className="text-sm text-neutral-400 hover:text-neutral-200 transition-colors"
                    >
                      Back to file upload
                    </button>
                    <button
                      onClick={handlePasteImport}
                      disabled={!pasteText.trim()}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Import URLs
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click-away for export menu */}
      {showExportMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowExportMenu(false)}
        />
      )}
    </div>
  );
}
