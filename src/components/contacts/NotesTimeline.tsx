import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Send, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface QuickNote {
  id: string;
  text: string;
  author_id: string;
  author_name: string;
  created_at: string;
}

interface NotesTimelineProps {
  contactId: string;
  quickNotes: QuickNote[];
}

export function NotesTimeline({ contactId, quickNotes }: NotesTimelineProps) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string } | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .maybeSingle();
        
        setCurrentUser({
          id: user.id,
          name: profile?.full_name || user.email?.split('@')[0] || 'Utilizador',
        });
      }
    };
    getUser();
  }, []);

  const handleAddNote = useCallback(async () => {
    if (!newNote.trim() || !currentUser) {
      return;
    }

    setIsSaving(true);
    try {
      const newNoteObj: QuickNote = {
        id: crypto.randomUUID(),
        text: newNote.trim(),
        author_id: currentUser.id,
        author_name: currentUser.name,
        created_at: new Date().toISOString(),
      };

      const updatedNotes = [newNoteObj, ...quickNotes];
      
      const { error } = await supabase
        .from('contacts')
        .update({ quick_notes: updatedNotes as any })
        .eq('id', contactId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['contact', contactId] });
      toast({ title: "Nota adicionada" });
      setNewNote("");
    } catch (error) {
      console.error('Erro ao adicionar nota:', error);
      toast({ title: "Erro ao adicionar nota", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [newNote, currentUser, quickNotes, contactId, queryClient]);

  // Auto-save after 2 seconds of inactivity
  useEffect(() => {
    if (!newNote.trim()) return;

    const timer = setTimeout(() => {
      handleAddNote();
    }, 2000);

    return () => clearTimeout(timer);
  }, [newNote]); // Only trigger on note change, not on handleAddNote

  const getInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "d MMM yyyy 'às' HH:mm", { locale: pt });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Timeline de Notas</h3>

      {/* Add Note Input */}
      <div className="space-y-2">
        <Textarea
          placeholder="Adicionar nota..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          rows={2}
          className="text-sm resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            {isSaving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                A guardar...
              </>
            ) : newNote.trim() ? (
              <>
                <Clock className="h-3 w-3" />
                Auto-guardar em 2s
              </>
            ) : null}
          </span>
          {newNote.trim() && (
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={isSaving}
              className="h-7"
            >
              {isSaving ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Send className="h-3 w-3 mr-1" />
                  Enviar
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Notes List */}
      {quickNotes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          Sem notas. Adicione notas para manter um histórico de interações.
        </p>
      ) : (
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {quickNotes.map((note) => (
              <div
                key={note.id}
                className="p-3 rounded-lg bg-muted/50 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {getInitials(note.author_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium">
                      {note.author_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-2">
                      {formatDate(note.created_at)}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {note.text}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
