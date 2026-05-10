import { useEffect, useState } from "react";
import { Folder, File, Download, ChevronRight, Home, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatBytes } from "@/lib/utils";
import { s3 } from "@/hooks/useS3";
import type { S3Item } from "@/lib/types";
import { save } from "@tauri-apps/plugin-dialog";

interface Props {
  bucket: string;
}

export function FileBrowser({ bucket }: Props) {
  const [prefix, setPrefix] = useState("");
  const [items, setItems] = useState<S3Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    setPrefix("");
  }, [bucket]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    s3.listObjects(bucket, prefix)
      .then((result) => { if (!cancelled) setItems(result); })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [bucket, prefix]);

  const breadcrumbs = prefix ? prefix.split("/").filter(Boolean) : [];

  const navigateTo = (parts: string[]) => {
    setPrefix(parts.length > 0 ? parts.join("/") + "/" : "");
  };

  const handleDownload = async (item: S3Item) => {
    const filename = item.name;
    const savePath = await save({ defaultPath: filename });
    if (!savePath) return;
    setDownloading(item.key);
    try {
      await s3.downloadFile(bucket, item.key, savePath);
    } catch (e) {
      alert(`Download failed: ${e}`);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
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
      <div className="flex-1 overflow-y-auto">
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
          <div className="px-4 py-12 text-sm text-muted-foreground text-center">This folder is empty.</div>
        )}
        {!loading && items.map((item) => (
          <div
            key={item.key}
            className={cn(
              "flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 hover:bg-accent/50 group transition-colors",
              item.is_folder && "cursor-pointer"
            )}
            onClick={() => item.is_folder && navigateTo([...breadcrumbs, item.name])}
          >
            {item.is_folder ? (
              <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <File className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <span className="flex-1 text-sm truncate">{item.name}</span>
            {!item.is_folder && item.size != null && (
              <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
                {formatBytes(item.size)}
              </span>
            )}
            {!item.is_folder && item.last_modified && (
              <span className="text-xs text-muted-foreground w-36 text-right shrink-0 hidden md:block">
                {new Date(Number(item.last_modified)).toLocaleDateString()}
              </span>
            )}
            {!item.is_folder && (
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 shrink-0"
                onClick={(e) => { e.stopPropagation(); handleDownload(item); }}
                disabled={downloading === item.key}
                title="Download"
              >
                {downloading === item.key ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
