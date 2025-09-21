// src/components/UserPresence.tsx
'use client';
import { UserInfo } from '@/types';
import { Users, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

interface UserPresenceProps {
  roomId: string;
  userInfo: UserInfo;
}

export default function UserPresence({ roomId, userInfo }: UserPresenceProps) {
  const [connectedUsers, setConnectedUsers] = useState<Map<number, UserInfo>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log('🔄 Setting up user presence for room:', roomId);
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider('ws://localhost:1234', roomId, ydoc);

    // Set local user information
    provider.awareness.setLocalStateField('user', userInfo);

    // Handle awareness changes
    const handleAwarenessChange = () => {
      const users = new Map<number, UserInfo>();
      provider.awareness.getStates().forEach((state, clientId) => {
        if (state.user) {
          users.set(clientId, state.user as UserInfo);
        }
      });
      setConnectedUsers(users);
      console.log('👥 Connected users:', users.size);
    };

    // Handle connection status
    const handleStatus = ({ status }: { status: string }) => {
      setIsConnected(status === 'connected');
      console.log('📡 Presence connection status:', status);
    };

    provider.awareness.on('change', handleAwarenessChange);
    provider.on('status', handleStatus);

    handleAwarenessChange();

    return () => {
      console.log('🧹 Cleaning up user presence');
      provider.awareness.off('change', handleAwarenessChange);
      provider.destroy();
      ydoc.destroy();
    };
  }, [roomId, userInfo]);

  const UserAvatar = ({ user, isCurrentUser = false }: { user: UserInfo; isCurrentUser?: boolean }) => (
    <div 
      className="relative group"
      title={`${user.name}${isCurrentUser ? ' (You)' : ''}`}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium border-2 border-gray-600"
        style={{ backgroundColor: user.color }}
      >
        {user.name.charAt(0).toUpperCase()}
      </div>
      {isCurrentUser && (
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-gray-800" />
      )}
    </div>
  );

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 border-b border-gray-700">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          {isConnected ? (
            <Wifi className="w-4 h-4 text-green-500" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-500" />
          )}
          <span className="text-sm text-gray-400">
            {isConnected ? 'Connected' : 'Connecting...'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <Users className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-400">
          {connectedUsers.size} online
        </span>
        
        <div className="flex -space-x-2">
          {Array.from(connectedUsers.values()).slice(0, 5).map((user) => (
            <UserAvatar 
              key={user.id} 
              user={user} 
              isCurrentUser={user.id === userInfo.id}
            />
          ))}
          {connectedUsers.size > 5 && (
            <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-xs text-gray-300 border-2 border-gray-600">
              +{connectedUsers.size - 5}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
