// server/websocket-server.ts
import { createServer } from 'http';
import ngrok from 'ngrok';
import { WebSocket, WebSocketServer } from 'ws';
import * as Y from 'yjs';

interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
  userId?: string;
  roomId?: string;
  doc?: Y.Doc;
}

interface RoomData {
  doc: Y.Doc;
  clients: Set<ExtendedWebSocket>;
}

class CollaborativeServer {
  private wss: WebSocketServer;
  private server: ReturnType<typeof createServer>;
  private rooms: Map<string, RoomData> = new Map();
  private port: number;

  constructor(port: number = 1234) {
    this.port = port;
    this.server = createServer();
    this.wss = new WebSocketServer({ server: this.server });
    this.setupWebSocketHandlers();
    this.startHeartbeat();
    
    this.server.listen(this.port, async () => {
      console.log(`🚀 WebSocket server running on ws://localhost:${this.port}`);

      // 🔗 Start ngrok tunnel
      try {
        const url = await ngrok.connect({
          addr: this.port,
          proto: 'http', // use 'tcp' if needed
        });
        console.log(`🌍 Public URL (use for clients): ${url.replace(/^http/, 'ws')}`);
      } catch (err) {
        console.error('❌ Failed to start ngrok tunnel:', err);
      }
    });
  }

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws: ExtendedWebSocket, request) => {
      console.log('🔗 New client connected');
      
      ws.isAlive = true;
      
      // Extract room ID from URL
      const url = request.url ? new URL(request.url, 'http://localhost') : null;
      const roomId = url?.searchParams.get('room') || 'default';
      
      ws.roomId = roomId;
      this.joinRoom(ws, roomId);

      // Handle pong messages for heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle client messages
      ws.on('message', (data: Buffer) => {
        this.handleMessage(ws, data);
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log('🔌 Client disconnected');
        if (ws.roomId) {
          this.leaveRoom(ws, ws.roomId);
        }
      });

      ws.on('error', (error) => {
        console.error('🔥 WebSocket error:', error);
      });
    });
  }

  private joinRoom(ws: ExtendedWebSocket, roomId: string): void {
    if (!this.rooms.has(roomId)) {
      const doc = new Y.Doc();
      this.rooms.set(roomId, {
        doc,
        clients: new Set()
      });
      console.log(`📄 Created new room: ${roomId}`);
    }
    
    const room = this.rooms.get(roomId)!;
    room.clients.add(ws);
    ws.doc = room.doc;
    
    // Send current document state to the new client
    const encoder = Y.encodeStateAsUpdate(room.doc);
    if (encoder.length > 0) {
      ws.send(this.createMessage('sync-update', encoder));
    }
    
    console.log(`👥 Client joined room: ${roomId} (${room.clients.size} clients)`);
  }

  private leaveRoom(ws: ExtendedWebSocket, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.clients.delete(ws);
      console.log(`👋 Client left room: ${roomId} (${room.clients.size} clients)`);
      
      if (room.clients.size === 0) {
        this.rooms.delete(roomId);
        console.log(`🗑️ Empty room deleted: ${roomId}`);
      }
    }
  }

  private handleMessage(ws: ExtendedWebSocket, data: Buffer): void {
    try {
      const message = this.parseMessage(data);
      
      switch (message.type) {
        case 'sync-update':
          if (message.data instanceof Uint8Array) {
            this.handleSyncUpdate(ws, message.data);
          }
          break;
          
        case 'sync-request':
          this.handleSyncRequest(ws);
          break;
          
        case 'awareness-update':
          if (message.data instanceof Uint8Array) {
            this.handleAwarenessUpdate(ws, message.data);
          }
          break;
          
        case 'custom-message':
          this.handleCustomMessage(ws, message.data);
          break;
          
        default:
          console.warn('⚠️ Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
    }
  }

  private handleSyncUpdate(ws: ExtendedWebSocket, update: Uint8Array): void {
    if (!ws.doc || !ws.roomId) return;
    
    const room = this.rooms.get(ws.roomId);
    if (!room) return;

    Y.applyUpdate(room.doc, update);
    
    room.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(this.createMessage('sync-update', update));
      }
    });
  }

  private handleSyncRequest(ws: ExtendedWebSocket): void {
    if (!ws.doc) return;
    
    const stateVector = Y.encodeStateVector(ws.doc);
    ws.send(this.createMessage('sync-response', stateVector));
  }

  private handleAwarenessUpdate(ws: ExtendedWebSocket, update: Uint8Array): void {
    if (!ws.roomId) return;
    
    const room = this.rooms.get(ws.roomId);
    if (!room) return;

    room.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(this.createMessage('awareness-update', update));
      }
    });
  }

  private handleCustomMessage(ws: ExtendedWebSocket, data: unknown): void {
    if (!ws.roomId) return;
    
    const room = this.rooms.get(ws.roomId);
    if (!room) return;

    room.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(this.createMessage('custom-message', data));
      }
    });
  }

  private createMessage(type: string, data: unknown): Buffer {
    const message = {
      type,
      data: data instanceof Uint8Array ? Array.from(data) : data,
      timestamp: Date.now()
    };
    return Buffer.from(JSON.stringify(message));
  }

  private parseMessage(
    data: Buffer
  ): { type: string; data: Uint8Array | object | string | number | null } {
    const message = JSON.parse(data.toString());
    if (Array.isArray(message.data)) {
      message.data = new Uint8Array(message.data);
    }
    return message;
  }

  private startHeartbeat(): void {
    setInterval(() => {
      this.wss.clients.forEach((ws: ExtendedWebSocket) => {
        if (!ws.isAlive) {
          console.log('💀 Terminating dead connection');
          ws.terminate();
          return;
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  public getRoomStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.rooms.forEach((room, roomId) => {
      stats[roomId] = room.clients.size;
    });
    return stats;
  }
}

let server: CollaborativeServer | undefined;

if (import.meta.url === `file://${process.argv[1]}`) {
  server = new CollaborativeServer(1234);

  setInterval(() => {
    if (server) {
      const stats = server.getRoomStats();
      if (Object.keys(stats).length > 0) {
        console.log('📊 Room stats:', stats);
      }
    }
  }, 60000);
}

export default CollaborativeServer;
