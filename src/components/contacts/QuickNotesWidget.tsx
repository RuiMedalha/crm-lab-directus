import { useState, useRef, KeyboardEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, StickyNote, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QuickNote {
  id: string;
  text: string;
  created_at: string;
}

interface QuickNotesWidgetProps {
  contactId: string;
  quickNotes: QuickNote[];
  onNoteAdded: (newNotes: QuickNote[]) => void;
}

export function QuickNotesWidget({ contactId, quickNotes, onNoteAdded }: QuickNotesWidgetProps) {
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    if (!noteText.trim()) return;

    setSaving(true);
    try {
      const newNote: QuickNote = {
        id: `note-${Date.now()}`,
        text: noteText.trim(),
        created_at: new Date().toISOString(),
      };

      const updatedNotes = [newNote, ...quickNotes];

      const { error } = await supabase
        .from("contacts")
        .update({ quick_notes: JSON.parse(JSON.stringify(updatedNotes)) })
        .eq("id", contactId);

      if (error) throw error;

      onNoteAdded(updatedNotes);
      setNoteText("");
      toast({ title: "Nota guardada" });

      // Manter foco no input
      setTimeout(() => inputRef.current?.focus(), 0);
    } catch (error) {
      console.error("Erro ao guardar nota:", error);
      toast({ title: "Erro ao guardar nota", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <StickyNote className="h-4 w-4" />
          Notas Rápidas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Input para nova nota */}
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Escreve uma nota e pressiona Enter..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
            className="flex-1"
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={saving || !noteText.trim()}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Lista de notas recentes */}
        <ScrollArea className="h-40">
          {quickNotes.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Sem notas rápidas
            </p>
          ) : (
            <div className="space-y-2">
              {quickNotes.slice(0, 10).map((note) => (
                <div
                  key={note.id}
                  className="p-2 rounded-lg bg-muted/50 text-sm"
                >
                  <p className="text-foreground">{note.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(note.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
