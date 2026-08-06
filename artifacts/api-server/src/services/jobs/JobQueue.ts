export interface Job<T = unknown> {
  name: string;
  payload: T;
  runAt?: Date;
}

export interface JobQueue {
  enqueue<T>(job: Job<T>): Promise<void>;
}

export class NoopJobQueue implements JobQueue {
  async enqueue<T>(_job: Job<T>): Promise<void> {}
}