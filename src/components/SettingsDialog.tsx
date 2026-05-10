import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { s3 } from "@/hooks/useS3";
import type { StoredCredentials } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: StoredCredentials | null;
  onSaved: () => void;
}

export function SettingsDialog({ open, onOpenChange, initial, onSaved }: Props) {
  const [accessKey, setAccessKey] = useState(initial?.access_key ?? "");
  const [secretKey, setSecretKey] = useState(initial?.secret_key ?? "");
  const [region, setRegion] = useState(initial?.region ?? "us-east-1");
  const [endpoint, setEndpoint] = useState(initial?.endpoint ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!accessKey || !secretKey || !region) {
      setError("Access Key, Secret Key, and Region are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await s3.saveCredentials({
        access_key: accessKey,
        secret_key: secretKey,
        region,
        endpoint: endpoint.trim() || undefined,
      });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>AWS Credentials</DialogTitle>
          <DialogDescription>Configure your AWS access credentials.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="access-key">Access Key ID</Label>
            <Input
              id="access-key"
              placeholder="AKIAIOSFODNN7EXAMPLE"
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secret-key">Secret Access Key</Label>
            <Input
              id="secret-key"
              type="password"
              placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="region">Region</Label>
            <Input
              id="region"
              placeholder="us-east-1"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="endpoint">
              Custom Endpoint <span className="text-muted-foreground">(optional — for MinIO, LocalStack)</span>
            </Label>
            <Input
              id="endpoint"
              placeholder="http://localhost:9000"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? "Connecting…" : "Save & Connect"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
