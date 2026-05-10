import { useCallback, useEffect, useRef, useState } from "react";
import {
  Folder,
  File,
  Download,
  ChevronRight,
  Home,
  Loader2,
  Upload,
  FolderUp,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog } from "@/components/ui/alert-dialog";
import { cn, formatBytes } from "@/lib/utils";
import { s3 } from "@/hooks/useS3";
import type { S3Item } from "@/lib/types";
import { save, open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";

interface PendingUpload {
  localPath: string;
  key: string;
}

interface Props {
  bucket: string;
}

export function FileBrowser({ bucket }: Props) {
  const [prefix, setPrefix] = useState("");
  const [items, setItems] = useState<S3Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [mutating, setMutating] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [renamingKey, setRenamingKey] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deletingItem, setDeletingItem] = useState<S3Item | null>(null);
  const [conflictState, setConflictState] = useState<{ pending: PendingUpload[] } | null>(null);
  const pendingUploadsRef = useRef<PendingUpload[]>([]);
  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPrefix("");
  }, [bucket]);

  const refreshListing = useCallback(() => {
    setLoading(true);
    setError(null);
    s3.listObjects(bucket, prefix)
      .then(setItems)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [bucket, prefix]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    s3.listObjects(bucket, prefix)
      .then((result) => { if (!cancelled) setItems(result); })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    setConflictState(null);
    pendingUploadsRef.current = [];
    return () => { cancelled = true; };
  }, [bucket, prefix]);

  useEffect(() => {
    if (renamingKey && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingKey]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        const { type } = event.payload;
        if (type === "enter" || type === "over") {
          setIsDragOver(true);
        } else if (type === "leave") {
          setIsDragOver(false);
        } else if (type === "drop") {
          setIsDragOver(false);
          const paths = (event.payload as { type: "drop"; paths: string[] }).paths;
          handleDroppedPaths(paths);
        }
      })
      .then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucket, prefix]);

  const breadcrumbs = prefix ? prefix.split("/").filter(Boolean) : [];

  const navigateTo = (parts: string[]) => {
    setPrefix(parts.length > 0 ? parts.join("/") + "/" : "");
  };

  // ── Download ────────────────────────────────────────────────────────────────

  const handleDownload = async (item: S3Item) => {
    const savePath = await save({ defaultPath: item.name });
    if (!savePath) return;
    setDownloading(item.key);
    try {
      await s3.downloadFile(bucket, item.key, savePath);
    } catch (e) {
      setError(`Download failed: ${e}`);
    } finally {
      setDownloading(null);
    }
  };

  // ── Upload ──────────────────────────────────────────────────────────────────

  const executeUploads = async (uploads: PendingUpload[]) => {
    for (const u of uploads) {
      try {
        await s3.uploadFile(bucket, u.key, u.localPath);
      } catch (e) {
        setError(`Upload failed for ${u.key.split("/").pop()}: ${e}`);
        return;
      }
    }
    refreshListing();
  };

  const processFileUploads = async (localPaths: string[]) => {
    const uploads: PendingUpload[] = localPaths.map((p) => ({
      localPath: p,
      key: prefix + p.split("/").pop()!,
    }));
    const conflicts: PendingUpload[] = [];
    for (const u of uploads) {
      try {
        if (await s3.objectExists(bucket, u.key)) conflicts.push(u);
      } catch {
        // treat check failure as no conflict
      }
    }
    if (conflicts.length > 0) {
      pendingUploadsRef.current = uploads;
      setConflictState({ pending: conflicts });
      return;
    }
    await executeUploads(uploads);
  };

  const handleUploadFiles = async () => {
    const selected = await open({ multiple: true });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    await processFileUploads(paths);
  };

  const handleUploadFolder = async () => {
    const selected = await open({ directory: true });
    if (!selected || Array.isArray(selected)) return;
    const dirName = selected.split("/").pop()!;
    const targetPrefix = prefix + dirName + "/";
    setMutating("__folder_upload__");
    try {
      await s3.uploadFolder(bucket, targetPrefix, selected);
      refreshListing();
    } catch (e) {
      setError(`Folder upload failed: ${e}`);
    } finally {
      setMutating(null);
    }
  };

  const handleConflictResolution = async (action: "overwrite" | "skip" | "cancel") => {
    if (action === "cancel" || !conflictState) {
      setConflictState(null);
      pendingUploadsRef.current = [];
      return;
    }
    let uploads = pendingUploadsRef.current;
    if (action === "skip") {
      const conflictKeys = new Set(conflictState.pending.map((c) => c.key));
      uploads = uploads.filter((u) => !conflictKeys.has(u.key));
    }
    setConflictState(null);
    pendingUploadsRef.current = [];
    await executeUploads(uploads);
  };

  // ── Drag-drop ───────────────────────────────────────────────────────────────

  const handleDroppedPaths = async (paths: string[]) => {
    for (const p of paths) {
      try {
        const isDir = await s3.isDirectory(p);
        if (isDir) {
          const dirName = p.split("/").pop()!;
          await s3.uploadFolder(bucket, prefix + dirName + "/", p);
        } else {
          await processFileUploads([p]);
        }
      } catch (e) {
        setError(`Upload failed: ${e}`);
      }
    }
    refreshListing();
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!deletingItem) return;
    const item = deletingItem;
    setDeletingItem(null);
    setMutating(item.key);
    try {
      if (item.is_folder) {
        await s3.deleteFolder(bucket, item.key);
      } else {
        await s3.deleteObject(bucket, item.key);
      }
      refreshListing();
    } catch (e) {
      setError(`Delete failed: ${e}`);
    } finally {
      setMutating(null);
    }
  };

  // ── Rename ──────────────────────────────────────────────────────────────────

  const commitRename = async (item: S3Item) => {
    const newName = renameValue.trim();
    setRenamingKey(null);
    if (!newName || newName === item.name) return;
    setMutating(item.key);
    try {
      const parentPrefix = item.key.slice(0, item.key.lastIndexOf(item.name));
      if (item.is_folder) {
        await s3.renameFolder(bucket, item.key, parentPrefix + newName + "/");
      } else {
        await s3.renameObject(bucket, item.key, parentPrefix + newName);
      }
      refreshListing();
    } catch (e) {
      setError(`Rename failed: ${e}`);
    } finally {
      setMutating(null);
    }
  };

  const isFolderUploading = mutating === "__folder_upload__";

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-1.5 border-b">
        <Button variant="outline" size="sm" onClick={handleUploadFiles} disabled={isFolderUploading}>
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Upload Files
        </Button>
        <Button variant="outline" size="sm" onClick={handleUploadFolder} disabled={isFolderUploading}>
          <FolderUp className="h-3.5 w-3.5 mr-1.5" />
          Upload Folder
        </Button>
        <Button variant="ghost" size="icon" onClick={refreshListing} disabled={loading || isFolderUploading} title="Reload">
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </Button>
        {isFolderUploading && (
          <div className="flex items-center gap-1.5 ml-auto text-muted-foreground text-xs">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Uploading…
          </div>
        )}
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-4 py-2 border-b text-sm">
        <button
          onClick={() => navigateTo([])}
          className="flex items-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
        </button>
        {breadcrumbs.map((part, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            <button
              onClick={() => navigateTo(breadcrumbs.slice(0, i + 1))}
              className={cn(
                "hover:text-foreground transition-colors",
                i === breadcrumbs.length - 1 ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              {part}
            </button>
          </span>
        ))}
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto relative">
        {isDragOver && (
          <div className="absolute inset-0 z-10 bg-primary/10 border-2 border-dashed border-primary rounded flex items-center justify-center pointer-events-none">
            <span className="text-sm font-medium text-primary">Drop files or folders to upload</span>
          </div>
        )}
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading…</span>
          </div>
        )}
        {error && (
          <div className="px-4 py-4 text-sm text-destructive">{error}</div>
        )}
        {!loading && !error && items.length === 0 && (
          <div className="px-4 py-12 text-sm text-muted-foreground text-center">
            This folder is empty.
          </div>
        )}
        {!loading && items.map((item) => (
          <div
            key={item.key}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 hover:bg-accent/50 group transition-colors",
              item.is_folder && renamingKey !== item.key && "cursor-pointer"
            )}
            onClick={() => {
              if (renamingKey === item.key) return;
              if (item.is_folder) navigateTo([...breadcrumbs, item.name]);
            }}
          >
            {item.is_folder ? (
              <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <File className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}

            {renamingKey === item.key ? (
              <Input
                ref={renameInputRef}
                className="h-6 py-0 text-sm flex-1"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(item);
                  if (e.key === "Escape") setRenamingKey(null);
                }}
                onBlur={() => commitRename(item)}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="flex-1 text-sm truncate">{item.name}</span>
            )}

            {!item.is_folder && item.size != null && renamingKey !== item.key && (
              <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                {formatBytes(item.size)}
              </span>
            )}
            {!item.is_folder && item.last_modified && renamingKey !== item.key && (
              <span className="text-xs text-muted-foreground w-36 text-right shrink-0 hidden md:block">
                {new Date(Number(item.last_modified)).toLocaleDateString()}
              </span>
            )}

            {renamingKey !== item.key && (
              <div className="flex items-center opacity-0 group-hover:opacity-100 shrink-0">
                {!item.is_folder && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); handleDownload(item); }}
                    disabled={downloading === item.key || mutating === item.key}
                    title="Download"
                  >
                    {downloading === item.key ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenamingKey(item.key);
                    setRenameValue(item.name);
                  }}
                  disabled={mutating === item.key}
                  title="Rename"
                >
                  {mutating === item.key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Pencil className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); setDeletingItem(item); }}
                  disabled={mutating === item.key}
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog
        open={deletingItem !== null}
        title={`Delete ${deletingItem?.is_folder ? "folder" : "file"}?`}
        description={
          deletingItem?.is_folder
            ? `"${deletingItem.name}" and all its contents will be permanently deleted.`
            : `"${deletingItem?.name}" will be permanently deleted.`
        }
        actions={[
          { label: "Cancel", variant: "outline", onClick: () => setDeletingItem(null) },
          { label: "Delete", variant: "destructive", onClick: confirmDelete },
        ]}
      />

      {/* Conflict resolution dialog */}
      <AlertDialog
        open={conflictState !== null}
        title="File conflict"
        description={
          conflictState
            ? `${conflictState.pending.length} file${conflictState.pending.length > 1 ? "s" : ""} already exist${conflictState.pending.length === 1 ? "s" : ""}. What would you like to do?`
            : ""
        }
        actions={[
          { label: "Cancel", variant: "outline", onClick: () => handleConflictResolution("cancel") },
          { label: "Skip existing", variant: "outline", onClick: () => handleConflictResolution("skip") },
          { label: "Overwrite", variant: "destructive", onClick: () => handleConflictResolution("overwrite") },
        ]}
      />
    </div>
  );
}
