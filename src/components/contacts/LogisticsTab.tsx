import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, ExternalLink, Truck, Calendar, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TrackingInfo {
  id: string;
  tracking_code: string;
  carrier: string;
  status: string;
  tracking_url: string;
  created_at: string;
  updated_at: string;
  deal_title?: string;
}

interface LogisticsTabProps {
  contactId: string;
}

export function LogisticsTab({ contactId }: LogisticsTabProps) {
  const [trackingItems, setTrackingItems] = useState<TrackingInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrackingInfo();
  }, [contactId]);

  const fetchTrackingInfo = async () => {
    setLoading(true);
    try {
      // Buscar deals do contacto que têm informação de rastreio nas notas
      // O n8n pode injetar tracking info via external_documents ou notes
      const { data: deals, error } = await supabase
        .from('deals')
        .select('id, title, source, created_at, updated_at')
        .eq('customer_id', contactId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Buscar documentos externos que podem ter tracking info
      const { data: docs } = await supabase
        .from('external_documents')
        .select('*')
        .eq('customer_id', contactId)
        .eq('doc_type', 'tracking')
        .order('created_at', { ascending: false });

      // Simular dados de tracking (o n8n vai popular isto)
      const mockTracking: TrackingInfo[] = [];
      
      if (docs && docs.length > 0) {
        docs.forEach((doc) => {
          // Parse tracking info from doc_number format: "CARRIER:TRACKING_CODE:STATUS"
          const parts = doc.doc_number.split(':');
          if (parts.length >= 2) {
            mockTracking.push({
              id: doc.id,
              tracking_code: parts[1] || doc.doc_number,
              carrier: parts[0] || 'Transportadora',
              status: parts[2] || 'Em trânsito',
              tracking_url: doc.pdf_link || '',
              created_at: doc.created_at || '',
              updated_at: doc.created_at || '',
              deal_title: undefined,
            });
          }
        });
      }

      setTrackingItems(mockTracking);
    } catch (error) {
      console.error('Erro ao carregar logística:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('entregue') || statusLower.includes('delivered')) {
      return 'bg-success text-success-foreground';
    }
    if (statusLower.includes('trânsito') || statusLower.includes('transit')) {
      return 'bg-warning text-warning-foreground';
    }
    if (statusLower.includes('pendente') || statusLower.includes('pending')) {
      return 'bg-muted text-muted-foreground';
    }
    return 'bg-primary text-primary-foreground';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (trackingItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">
          Sem envios registados
        </h3>
        <p className="text-sm text-muted-foreground">
          Os links de rastreio serão exibidos aqui quando injetados pelo n8n
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchTrackingInfo}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Envios ({trackingItems.length})
        </h3>
        <Button variant="ghost" size="sm" onClick={fetchTrackingInfo}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {trackingItems.map((item) => (
          <Card key={item.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Truck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-medium">{item.tracking_code}</span>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.carrier}
                      {item.deal_title && ` • ${item.deal_title}`}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
                
                {item.tracking_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={item.tracking_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Rastrear
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}