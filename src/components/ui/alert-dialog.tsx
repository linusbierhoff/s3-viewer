import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AlertDialogAction {
  label: string;
  variant?: "default" | "outline" | "ghost" | "destructive";
  onClick: () => void;
}

interface AlertDialogProps {
  open: boolean;
  title: string;
  description?: string;
  actions: AlertDialogAction[];
}

export function AlertDialog({ open, title, description, actions }: AlertDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative z-10 bg-background rounded-lg border p-6 shadow-lg w-full max-w-sm">
        <h2 className="text-lg font-semibold leading-none tracking-tight mb-2">{title}</h2>
        {description && (
          <p className="text-sm text-muted-foreground mb-5">{description}</p>
        )}
        <div className="flex justify-end gap-2 flex-wrap">
          {actions.map((action) => (
            <Button
              key={action.label}
              variant={action.variant === "destructive" ? "outline" : (action.variant ?? "outline")}
              className={cn(
                action.variant === "destructive" &&
                  "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              )}
              size="sm"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
