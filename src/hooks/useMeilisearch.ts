import { useState, useCallback } from 'react';

export interface MeilisearchSettings {
  meilisearch_host?: string;
  meilisearch_api_key?: string;
  meilisearch_index?: string;
}

export interface MeilisearchProduct {
  id: string;
  name: string;
  title?: string;
  sku: string;
  price: number;
  cost?: number;
  description?: string;
  content?: string;
  category?: string;
  image_url?: string;
  featured_media_url?: string;
  media_url?: string;
  link?: string;
}

const MEILISEARCH_STORAGE_KEY = "hotelequip_meilisearch_settings";

export function getMeilisearchSettings(): MeilisearchSettings {
  const stored = localStorage.getItem(MEILISEARCH_STORAGE_KEY);
  return stored ? JSON.parse(stored) : { meilisearch_index: "products_stage" };
}

export function saveMeilisearchSettings(settings: MeilisearchSettings) {
  localStorage.setItem(MEILISEARCH_STORAGE_KEY, JSON.stringify(settings));
}

export function useMeilisearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<MeilisearchProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string): Promise<MeilisearchProduct[]> => {
    if (!query.trim()) {
      setResults([]);
      return [];
    }

    const settings = getMeilisearchSettings();
    
    if (!settings.meilisearch_host) {
      setError("Meilisearch não configurado. Configure nas Definições.");
      return [];
    }

    setIsSearching(true);
    setError(null);

    try {
      const indexName = settings.meilisearch_index || "products_stage";
      const url = `${settings.meilisearch_host}/indexes/${indexName}/search`;
      
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (settings.meilisearch_api_key) {
        headers["Authorization"] = `Bearer ${settings.meilisearch_api_key}`;
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          q: query,
          limit: 20,
          attributesToRetrieve: ["id", "name", "title", "sku", "price", "cost", "description", "content", "category", "image_url", "featured_media_url", "media_url", "link"],
        }),
      });

      if (!response.ok) {
        throw new Error(`Meilisearch error: ${response.status}`);
      }

      const data = await response.json();
      const products: MeilisearchProduct[] = data.hits || [];
      
      setResults(products);
      return products;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro na pesquisa";
      setError(errorMessage);
      console.error("Meilisearch search error:", err);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    search,
    results,
    isSearching,
    error,
    clearResults,
  };
}
