export interface Repository<T, Id = number> {
  findById(id: Id): Promise<T | undefined>;
  list(): Promise<T[]>;
  create(value: T): Promise<T>;
  update(id: Id, value: Partial<T>): Promise<T | undefined>;
  delete(id: Id): Promise<boolean>;
}