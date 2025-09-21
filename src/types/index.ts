// src/types/index.ts
export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  content?: string;
  language?: string;
  children?: FileNode[];
  lastModified: number;
  createdAt: number;
}

export interface UserInfo {
  id: string;
  name: string;
  email?: string;
  color: string;
  cursor?: {
    line: number;
    column: number;
  };
}

export interface CollaborationState {
  users: Map<string, UserInfo>;
  isConnected: boolean;
  roomId: string;
}

export interface FileOperation {
  type: 'create' | 'update' | 'delete' | 'rename';
  path: string;
  content?: string;
  newPath?: string;
  timestamp: number;
  userId: string;
}

export interface EditorConfig {
  theme: 'vs-light' | 'vs-dark' | 'hc-black';
  fontSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
  minimap: boolean;
  lineNumbers: 'on' | 'off' | 'relative' | 'interval';
}

export interface WebSocketMessage {
  type: 'file-operation' | 'user-join' | 'user-leave' | 'cursor-update';
  data: unknown;
  userId: string;
  timestamp: number;
}

