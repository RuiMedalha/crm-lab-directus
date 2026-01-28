import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

function normalizeTag(raw: string) {
  return String(raw || "")
    .trim()
    .replace(/\s+/g, " ");
}

function unique(arr: string[]) {
  const set = new Set(arr.filter(Boolean));
  return Array.from(set);
}

const TAGS_STORAGE_KEY = "crm_contact_tags_v1";

function loadKnownTags(): string[] {
  try {
    const raw = localStorage.getItem(TAGS_STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(list) ? list.map(normalizeTag).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveKnownTags(tags: string[]) {
  try {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(unique(tags.map(normalizeTag))));
  } catch {
    // ignore
  }
}

export function TagSelector({
  value,
  onChange,
  placeholder = "Selecionar tags…",
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const selected = useMemo(() => unique((value || []).map(normalizeTag)).filter(Boolean), [value]);
  const [open, setOpen] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    setKnown(loadKnownTags());
  }, []);

  const all = useMemo(() => {
    const merged = unique([...known, ...selected]);
    return merged.sort((a, b) => a.localeCompare(b, "pt"));
  }, [known, selected]);

  const canCreate = useMemo(() => {
    const t = normalizeTag(q);
    if (!t) return false;
    return !all.some((x) => x.toLowerCase() === t.toLowerCase());
  }, [q, all]);

  const toggle = (tag: string) => {
    const t = normalizeTag(tag);
    if (!t) return;
    const isOn = selected.some((x) => x.toLowerCase() === t.toLowerCase());
    const next = isOn ? selected.filter((x) => x.toLowerCase() !== t.toLowerCase()) : [...selected, t];
    onChange(next);
    // persist in known tags
    const nextKnown = unique([...known, t]);
    setKnown(nextKnown);
    saveKnownTags(nextKnown);
  };

  const createTag = () => {
    const t = normalizeTag(q);
    if (!t) return;
    toggle(t);
    setQ("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selected.length ? (
          selected.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1">
              {t}
              <button
                type="button"
                className="ml-1 hover:opacity-80"
                onClick={() => toggle(t)}
                title="Remover"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))
        ) : (
          <div className="text-xs text-muted-foreground">{placeholder}</div>
        )}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" type="button" className="w-full justify-between">
            <span className="truncate">{selected.length ? "Editar tags" : placeholder}</span>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Pesquisar ou criar tag…"
              value={q}
              onValueChange={setQ}
            />
            <CommandList>
              <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
              <CommandGroup heading="Tags">
                {all.map((t) => {
                  const isOn = selected.some((x) => x.toLowerCase() === t.toLowerCase());
                  return (
                    <CommandItem key={t} value={t} onSelect={() => toggle(t)}>
                      <Check className={cn("mr-2 h-4 w-4", isOn ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{t}</span>
                    </CommandItem>
                  );
                })}
                {canCreate ? (
                  <CommandItem value={`__create__${q}`} onSelect={createTag}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar “{normalizeTag(q)}”
                  </CommandItem>
                ) : null}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

