export interface StoredFile {
  key: string;
  contentType: string;
  sizeBytes: number;
}

export interface FileStorage {
  put(key: string, content: Uint8Array, contentType: string): Promise<StoredFile>;
  get(key: string): Promise<Uint8Array | undefined>;
  delete(key: string): Promise<boolean>;
}