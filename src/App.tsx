import { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BucketList } from "@/components/BucketList";
import { FileBrowser } from "@/components/FileBrowser";
import { SettingsDialog } from "@/components/SettingsDialog";
import { s3 } from "@/hooks/useS3";
import type { BucketInfo, StoredCredentials } from "@/lib/types";

export default function App() {
  const [credentials, setCredentials] = useState<StoredCredentials | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [buckets, setBuckets] = useState<BucketInfo[]>([]);
  const [selectedBucket, setSelectedBucket] = useState<string | null>(null);
  const [bucketsLoading, setBucketsLoading] = useState(false);

  const loadBuckets = async () => {
    setBucketsLoading(true);
    try {
      const result = await s3.listBuckets();
      setBuckets(result);
      if (result.length > 0) {
        setSelectedBucket((prev) => prev ?? result[0].name);
      }
    } catch {
      setBuckets([]);
    } finally {
      setBucketsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const creds = await s3.getCredentials();
      if (creds) {
        setCredentials(creds);
        const loaded = await s3.loadCredentials();
        if (loaded) loadBuckets();
      } else {
        setSettingsOpen(true);
      }
    };
    init();
  }, []);

  const handleSettingsSaved = async () => {
    const creds = await s3.getCredentials();
    setCredentials(creds);
    loadBuckets();
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b shrink-0">
        <h1 className="text-sm font-semibold tracking-tight">S3 Explorer</h1>
        <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} title="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </header>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 border-r overflow-hidden">
          <BucketList
            buckets={buckets}
            selected={selectedBucket}
            onSelect={setSelectedBucket}
            loading={bucketsLoading}
          />
        </aside>

        {/* File browser */}
        <main className="flex-1 min-w-0">
          {selectedBucket ? (
            <FileBrowser key={selectedBucket} bucket={selectedBucket} />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              {credentials ? "Select a bucket to browse." : "Configure credentials to get started."}
            </div>
          )}
        </main>
      </div>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        initial={credentials}
        onSaved={handleSettingsSaved}
      />
    </div>
  );
}
