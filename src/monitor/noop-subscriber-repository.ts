import { ResourceId, SubscriberRepository } from '@dialectlabs/monitor';

export class NoopSubscriberRepository implements SubscriberRepository {
  findAll(): Promise<ResourceId[]> {
    return Promise.resolve([]);
  }

  findByResourceId(): Promise<ResourceId | null> {
    return null;
  }

  subscribe(): any {
    return;
  }
}
