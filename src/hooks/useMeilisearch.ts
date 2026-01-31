import { useState, useCallback } from 'react';
import { directusRequest } from "@/integrations/directus/client";

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
  // Extra (depends on index schema) - helps resolve images
  images?: any;
  image?: any;
  featured_media?: any;
  featured_media_id?: any;
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

  const shouldUseDirectusProxy = (settings: MeilisearchSettings) => {
    const host = (settings.meilisearch_host || "").trim();
    if (!host) return true; // allow proxy mode without exposing host/api key to browser
    // If user configured localhost/127.0.0.1, the browser can't reach it on their own machine.
    if (host.includes("127.0.0.1") || host.includes("localhost")) return true;
    // Allow an explicit "directus" pseudo-host
    if (host.startsWith("directus://") || host === "directus") return true;
    return false;
  };

  async function searchViaDirectusProxy(query: string): Promise<MeilisearchProduct[]> {
    const res = await directusRequest<{ data?: MeilisearchProduct[]; hits?: MeilisearchProduct[] }>(
      "/product-search",
      {
        method: "POST",
        body: JSON.stringify({ q: query, limit: 20 }),
      }
    );
    const products = (res?.data || res?.hits || []) as MeilisearchProduct[];
    setResults(products);
    return products;
  }

  const search = useCallback(async (query: string): Promise<MeilisearchProduct[]> => {
    if (!query.trim()) {
      setResults([]);
      return [];
    }

    const settings = getMeilisearchSettings();

    setIsSearching(true);
    setError(null);

    try {
      if (shouldUseDirectusProxy(settings)) {
        return await searchViaDirectusProxy(query);
      }

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
          attributesToRetrieve: [
            "id",
            "name",
            "title",
            "sku",
            "price",
            "cost",
            "description",
            "content",
            "category",
            "image_url",
            "featured_media_url",
            "media_url",
            "link",
            // common variants used by Woo-based indexes
            "images",
            "image",
            "featured_media",
            "featured_media_id",
            "thumbnail",
            "thumb",
            "imageId",
            "mediaId",
          ],
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
      // If direct Meilisearch call failed (CORS/network), try Directus proxy as fallback.
      const settings2 = getMeilisearchSettings();
      if (!shouldUseDirectusProxy(settings2)) {
        try {
          return await searchViaDirectusProxy(query);
        } catch {
          // fallthrough to show original error
        }
      }
      setError(
        errorMessage.includes("Failed to fetch")
          ? "Não consegui aceder ao Meilisearch no browser (CORS/host). Usa o proxy via Directus ou mete o Meilisearch com URL pública e CORS."
          : errorMessage
      );
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
