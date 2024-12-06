import { Client, PrivateKey } from '@hiveio/dhive';
import { StreamMetadata } from '../types';

interface HiveStreamPost {
  author: string;
  permlink: string;
  title: string;
  body: string;
  json_metadata: string;
  parent_author: string;
  parent_permlink: string;
}

interface ExtendedStreamMetadata extends StreamMetadata {
  status?: 'online' | 'offline';
}

export class HiveClient {
  private client: Client;
  private streamTag: string;
  private retryAttempts: number;
  private retryDelay: number;
  private postingKey: PrivateKey;

  constructor(postingKeyString: string) {
    this.client = new Client([
      'https://api.hive.blog',
      'https://api.hivekings.com',
      'https://anyx.io',
      'https://api.openhive.network'
    ], {
      timeout: 10000,
      failoverThreshold: 3,
      consoleOnFailover: true
    });

    this.postingKey = PrivateKey.from(postingKeyString);
    this.streamTag = 'vimm-stream';
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  async postMetadata(streamId: string, metadata: ExtendedStreamMetadata): Promise<boolean> {
    const retryOperation = async (operation: () => Promise<any>, attempts: number): Promise<any> => {
      try {
        return await operation();
      } catch (error) {
        if (attempts <= 1) throw error;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return retryOperation(operation, attempts - 1);
      }
    };

    try {
      const post: HiveStreamPost = this.createStreamPost(streamId, metadata);
      
      await retryOperation(async () => {
        await this.client.broadcast.comment(post, this.postingKey);
      }, this.retryAttempts);

      return true;
    } catch (error) {
      console.error('Error posting stream metadata to Hive:', error);
      return false;
    }
  }

  async getMetadata(streamId: string): Promise<StreamMetadata | null> {
    try {
      const permlink = this.generatePermlink(streamId);
      const content = await this.client.database.call('get_content', [
        'vimm', 
        permlink
      ]);

      if (!content || !content.json_metadata) {
        return null;
      }

      const metadata = JSON.parse(content.json_metadata);
      return this.validateAndTransformMetadata(metadata);
    } catch (error) {
      console.error('Error fetching stream metadata from Hive:', error);
      return null;
    }
  }

  async deleteMetadata(streamId: string): Promise<boolean> {
    try {
      const permlink = this.generatePermlink(streamId);
      
      // In Hive, we can't actually delete content, so we update it to indicate the stream is offline
      const offlineMetadata: StreamMetadata = {
        title: '[OFFLINE] Stream Ended',
        hiveUsername: 'vimm',
        timestamp: Date.now(),
        status: 'offline'
      };

      return await this.postMetadata(streamId, offlineMetadata);
    } catch (error) {
      console.error('Error marking stream as offline on Hive:', error);
      return false;
    }
  }

  async getStreamHistory(username: string, limit: number = 10): Promise<StreamMetadata[]> {
    try {
      const posts = await this.client.database.getDiscussions('blog', {
        tag: username,
        limit: limit
      });

      return posts
        .filter(post => {
          try {
            const metadata = JSON.parse(post.json_metadata);
            return metadata.tags?.includes(this.streamTag);
          } catch {
            return false;
          }
        })
        .map(post => {
          const metadata = JSON.parse(post.json_metadata);
          return this.validateAndTransformMetadata(metadata);
        })
        .filter((metadata): metadata is StreamMetadata => metadata !== null);
    } catch (error) {
      console.error('Error fetching stream history:', error);
      return [];
    }
  }

  private createStreamPost(streamId: string, metadata: StreamMetadata): HiveStreamPost {
    const permlink = this.generatePermlink(streamId);
    const title = metadata.title || 'Live Stream';
    
    // Create stream announcement body
    const body = this.generateStreamBody(metadata);

    // Prepare json_metadata
    const jsonMetadata = {
      ...metadata,
      app: 'vimm/1.0',
      tags: [...(metadata.tags || []), this.streamTag],
      streamId
    };

    return {
      author: 'vimm',
      permlink,
      title,
      body,
      json_metadata: JSON.stringify(jsonMetadata),
      parent_author: '',
      parent_permlink: this.streamTag
    };
  }

  private generatePermlink(streamId: string): string {
    return `stream-${streamId}-${Date.now()}`.toLowerCase();
  }

  private generateStreamBody(metadata: StreamMetadata): string {
    return `
# ${metadata.title}

${metadata.description || 'Live stream on VIMM'}

**Streamer:** @${metadata.hiveUsername}
**Started:** ${new Date(metadata.timestamp).toUTCString()}

${metadata.category ? `**Category:** ${metadata.category}` : ''}
${metadata.tags?.length ? `**Tags:** ${metadata.tags.join(', ')}` : ''}

Watch live at: https://vimm.tv/${metadata.hiveUsername}
    `.trim();
  }

  private validateAndTransformMetadata(metadata: any): StreamMetadata | null {
    if (!metadata || typeof metadata !== 'object') return null;

    // Required fields
    if (!metadata.title || !metadata.hiveUsername || !metadata.timestamp) {
      return null;
    }

    return {
      title: metadata.title,
      description: metadata.description,
      tags: Array.isArray(metadata.tags) ? metadata.tags : [],
      category: metadata.category,
      hiveUsername: metadata.hiveUsername,
      timestamp: metadata.timestamp,
      status: metadata.status
    };
  }
}