export interface ActivityEvent {
  name: string;
  actorId?: number;
  requestId?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
}

export interface ActivityTracker {
  track(event: ActivityEvent): Promise<void>;
}

export class NoopActivityTracker implements ActivityTracker {
  async track(_event: ActivityEvent): Promise<void> {}
}