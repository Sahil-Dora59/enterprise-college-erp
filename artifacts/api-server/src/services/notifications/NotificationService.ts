export interface NotificationMessage {
  recipientId: number;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationService {
  send(message: NotificationMessage): Promise<void>;
}

export class NoopNotificationService implements NotificationService {
  async send(_message: NotificationMessage): Promise<void> {}
}