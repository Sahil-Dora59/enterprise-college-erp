export interface SearchQuery {
  query: string;
  entity?: string;
  limit?: number;
}

export interface SearchResult {
  entity: string;
  id: string;
  title: string;
  metadata?: Record<string, unknown>;
}

export interface SearchService {
  search(query: SearchQuery): Promise<SearchResult[]>;
}

export class EmptySearchService implements SearchService {
  async search(_query: SearchQuery): Promise<SearchResult[]> {
    return [];
  }
}