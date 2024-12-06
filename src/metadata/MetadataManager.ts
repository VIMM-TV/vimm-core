import { StreamMetadata } from '../types';
import { HiveClient } from './HiveClient';

export class MetadataManager {
  private hiveClient: HiveClient;
  private metadata: Map<string, StreamMetadata>;

  constructor() {
    this.hiveClient = new HiveClient(process.env.HIVE_POSTING_KEY || '');
    this.metadata = new Map();
  }

  async updateStreamMetadata(streamId: string, metadata: StreamMetadata): Promise<void> {
    this.metadata.set(streamId, metadata);
    await this.hiveClient.postMetadata(streamId, metadata);
  }

  async getStreamMetadata(streamId: string): Promise<StreamMetadata | undefined> {
    return this.metadata.get(streamId);
  }

  async deleteStreamMetadata(streamId: string): Promise<void> {
    this.metadata.delete(streamId);
    await this.hiveClient.deleteMetadata(streamId);
  }

  async syncWithHive(streamId: string): Promise<void> {
    const metadata = await this.hiveClient.getMetadata(streamId);
    if (metadata) {
      this.metadata.set(streamId, metadata);
    }
  }
}