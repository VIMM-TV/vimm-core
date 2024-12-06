declare module 'node-media-server' {
  import { EventEmitter } from 'events';
  
  interface NodeMediaServerConfig {
    rtmp?: {
      port: number;
      chunk_size?: number;
      gop_cache?: boolean;
      ping?: number;
      ping_timeout?: number;
    };
    http?: {
      port: number;
      allow_origin?: string;
    };
    trans?: {
      ffmpeg: string;
      tasks: any[];
    };
  }

  class NodeMediaServer extends EventEmitter {
    constructor(config: NodeMediaServerConfig);
    run(): void;
    stop(): void;
    refuse(id: string): void;
    on(event: 'prePublish', listener: (id: string, streamPath: string, args: any) => void): this;
    on(event: 'donePublish', listener: (id: string, streamPath: string) => void): this;
    on(event: string, listener: Function): this;
  }

  export = NodeMediaServer;
}