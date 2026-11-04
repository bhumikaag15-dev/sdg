import type { Resource } from "../types";
import { supabase } from "./supabase";

const edgeFunctionUrl = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-resources`
  : "";

export async function searchResources(topic: string): Promise<Resource[]> {
  const cleanTopic = topic.trim();
  if (!cleanTopic) return [];

  // Use Supabase Edge Function for YouTube API so the API key is never placed in frontend code.
  if (supabase && edgeFunctionUrl) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY,
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {})
        },
        body: JSON.stringify({ topic: cleanTopic })
      });
      if (response.ok) {
        const data = await response.json();
        const videos: Resource[] = (data.videos ?? []).map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          url: item.url,
          source: item.channelTitle || "YouTube",
          kind: "video",
          thumbnail: item.thumbnail
        }));
        return [...videos, ...await searchBooks(cleanTopic)];
      }
    } catch (error) {
      console.warn("Video API unavailable; showing book results and search links.", error);
    }
  }

  return [
    ...await searchBooks(cleanTopic),
    {
      id: `yt-search-${encodeURIComponent(cleanTopic)}`,
      title: `Search YouTube for “${cleanTopic}”`,
      description: "Opens YouTube search. Check the creator and verify important information against official sources.",
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanTopic)}`,
      source: "YouTube search",
      kind: "video"
    }
  ];
}

async function searchBooks(topic: string): Promise<Resource[]> {
  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(topic)}&maxResults=6&printType=books`);
    if (!response.ok) throw new Error("Google Books request failed");
    const data = await response.json();
    return (data.items ?? []).map((item: any) => {
      const info = item.volumeInfo ?? {};
      const access = item.accessInfo ?? {};
      return {
        id: item.id,
        title: info.title || "Untitled book",
        description: info.description || "Book listing; availability and access vary.",
        url: access.webReaderLink || info.previewLink || info.infoLink || `https://books.google.com/books?q=${encodeURIComponent(topic)}`,
        source: (info.authors ?? []).join(", ") || "Google Books",
        kind: "book" as const
      };
    });
  } catch (error) {
    console.warn("Google Books search failed.", error);
    return [{
      id: `books-search-${encodeURIComponent(topic)}`,
      title: `Search Google Books for “${topic}”`,
      description: "Book discovery link. Check whether the book is free, preview-only, borrowable, or paid.",
      url: `https://books.google.com/books?q=${encodeURIComponent(topic)}`,
      source: "Google Books",
      kind: "book"
    }];
  }
}

export async function searchOpenLibrary(topic: string): Promise<Resource[]> {
  try {
    const response = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(topic)}&limit=5`);
    if (!response.ok) throw new Error("Open Library request failed");
    const data = await response.json();
    return (data.docs ?? []).map((item: any, index: number) => ({
      id: `ol-${item.key || index}`,
      title: item.title || "Untitled book",
      description: `Author: ${(item.author_name ?? ["Unknown author"]).slice(0, 3).join(", ")}. Read/borrow availability varies.`,
      url: item.key ? `https://openlibrary.org${item.key}` : `https://openlibrary.org/search?q=${encodeURIComponent(topic)}`,
      source: "Open Library",
      kind: "book" as const
    }));
  } catch {
    return [{
      id: `ol-search-${encodeURIComponent(topic)}`,
      title: `Search Open Library for “${topic}”`,
      description: "Find catalog records and check whether a readable or borrowable copy is available.",
      url: `https://openlibrary.org/search?q=${encodeURIComponent(topic)}`,
      source: "Open Library",
      kind: "book"
    }];
  }
}
