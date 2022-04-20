import { ResourceId, SubscriberRepository } from '@dialectlabs/monitor';

export class NoopSubscriberRepository implements SubscriberRepository {
  findAll(): Promise<ResourceId[]> {
    return Promise.resolve([]);
  }

  findByResourceId(): Promise<ResourceId | null> {
    return Promise.resolve(null);
  }

  subscribe(): any {
    return;
  }
}
