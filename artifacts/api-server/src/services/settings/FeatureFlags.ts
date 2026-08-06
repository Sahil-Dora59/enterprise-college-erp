export interface FeatureFlagContext {
  userId?: number;
  role?: string;
}

export interface FeatureFlags {
  enabled(name: string, context?: FeatureFlagContext): boolean;
}

export class EnvironmentFeatureFlags implements FeatureFlags {
  constructor(private readonly values: Record<string, boolean> = {}) {}

  enabled(name: string, _context?: FeatureFlagContext): boolean {
    return this.values[name] ?? false;
  }
}