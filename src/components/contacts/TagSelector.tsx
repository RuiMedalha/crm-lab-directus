import { useState } from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useContactTags, type ContactTag } from "@/hooks/useContactTags";
import { cn } from "@/lib/utils";

interface TagSelectorProps {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

export function TagSelector({ selectedTags, onChange, disabled }: TagSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: availableTags, isLoading } = useContactTags();

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      onChange(selectedTags.filter(t => t !== tagName));
    } else {
      onChange([...selectedTags, tagName]);
    }
  };

  const removeTag = (tagName: string) => {
    onChange(selectedTags.filter(t => t !== tagName));
  };

  const getTagDetails = (tagName: string): ContactTag | undefined => {
    return availableTags?.find(t => t.name === tagName);
  };

  return (
    <div className="space-y-2">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map(tagName => {
            const tag = getTagDetails(tagName);
            return (
              <Badge
                key={tagName}
                variant="secondary"
                className="gap-1 pr-1"
                style={{ backgroundColor: tag?.color + "20", color: tag?.color }}
              >
                {tag?.icon && <span>{tag.icon}</span>}
                {tagName}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeTag(tagName)}
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            );
          })}
        </div>
      )}

      {/* Tag Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            disabled={disabled || isLoading}
          >
            {selectedTags.length === 0 ? "Selecionar tags..." : `${selectedTags.length} tag(s) selecionada(s)`}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Procurar tags..." />
            <CommandList>
              <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
              <CommandGroup>
                {availableTags?.map(tag => (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => toggleTag(tag.name)}
                    className="gap-2"
                  >
                    <div
                      className={cn(
                        "flex h-4 w-4 items-center justify-center rounded-sm border",
                        selectedTags.includes(tag.name)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "border-muted-foreground"
                      )}
                    >
                      {selectedTags.includes(tag.name) && <Check className="h-3 w-3" />}
                    </div>
                    {tag.icon && <span>{tag.icon}</span>}
                    <span className="flex-1">{tag.name}</span>
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: tag.color }}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}