export interface SettingsService {
  get<T>(key: string, fallback: T): Promise<T>;
  set<T>(key: string, value: T): Promise<void>;
}

export class InMemorySettingsService implements SettingsService {
  private readonly values = new Map<string, unknown>();

  async get<T>(key: string, fallback: T): Promise<T> {
    return (this.values.get(key) as T | undefined) ?? fallback;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.values.set(key, value);
  }
}