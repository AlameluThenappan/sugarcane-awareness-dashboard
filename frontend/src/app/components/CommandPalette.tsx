import { useEffect, useState } from "react";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty,
  CommandGroup, CommandItem,
} from "./ui/command";
import { PAGES, PageId } from "./Sidebar";
import { getAnalyticsRaw, AnalyticsRow } from "../lib/api";

export function CommandPalette({
  open,
  onOpenChange,
  onNavigate,
  onSelectFarmer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigate: (id: PageId) => void;
  onSelectFarmer: (surveyId: number) => void;
}) {
  const [farmers, setFarmers] = useState<AnalyticsRow[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || farmers.length) return;
    getAnalyticsRaw().then(setFarmers).catch(() => {});
  }, [open, farmers.length]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const matchedFarmers = query.trim()
    ? farmers
        .filter((f) => f.name?.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 6)
    : [];

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search pages & farmers"
      description="Search for a page or farmer"
    >
      <CommandInput
        placeholder="Search pages & farmers..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Pages">
          {PAGES.map((page) => (
            <CommandItem
              key={page.id}
              value={page.label}
              onSelect={() => {
                onNavigate(page.id);
                onOpenChange(false);
              }}
            >
              {page.icon}
              <span>{page.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {matchedFarmers.length > 0 && (
          <CommandGroup heading="Farmers">
            {matchedFarmers.map((f) => (
              <CommandItem
                key={f.surveyId}
                value={`farmer-${f.surveyId}-${f.name}`}
                onSelect={() => {
                  onSelectFarmer(f.surveyId);
                  onOpenChange(false);
                }}
              >
                <span>{f.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{f.village}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
