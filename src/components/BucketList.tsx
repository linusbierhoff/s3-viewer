import { Database } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BucketInfo } from "@/lib/types";

interface Props {
  buckets: BucketInfo[];
  selected: string | null;
  onSelect: (name: string) => void;
  loading: boolean;
}

export function BucketList({ buckets, selected, onSelect, loading }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b">
        Buckets
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="px-3 py-4 text-sm text-muted-foreground">Loading…</div>
        )}
        {!loading && buckets.length === 0 && (
          <div className="px-3 py-4 text-sm text-muted-foreground">No buckets found.</div>
        )}
        {buckets.map((b) => (
          <button
            key={b.name}
            onClick={() => onSelect(b.name)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors",
              selected === b.name && "bg-accent font-medium"
            )}
          >
            <Database className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{b.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
