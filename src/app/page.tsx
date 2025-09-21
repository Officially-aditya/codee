// src/app/page.tsx
'use client';
import { Code2, Github, Globe, Users, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export default function HomePage() {
  const router = useRouter();
  const [roomId, setRoomId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const createRoom = async () => {
    setIsCreating(true);
    const newRoomId = uuidv4();
    // Add a small delay to show the loading state
    setTimeout(() => {
      router.push(`/room/${newRoomId}`);
    }, 500);
  };

  const joinRoom = async () => {
    if (roomId.trim()) {
      setIsJoining(true);
      setTimeout(() => {
        router.push(`/room/${roomId.trim()}`);
      }, 300);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <nav className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <Code2 className="h-8 w-8 text-blue-400" />
            <span className="text-xl font-bold text-white">CollabCode</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-gray-300 hover:text-white transition-colors">
              <Github className="h-5 w-5" />
            </button>
            <button className="text-gray-300 hover:text-white transition-colors">
              <Globe className="h-5 w-5" />
            </button>
          </div>
        </nav>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Code Together
              <span className="block text-blue-400">In Real-Time</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Collaborate on code with your team using Monaco Editor, 
              WebSockets, and CRDT technology. No setup required.
            </p>
            
            {/* Feature Pills */}
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              <span className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full text-sm">
                Real-time Sync
              </span>
              <span className="px-4 py-2 bg-green-500/20 text-green-300 rounded-full text-sm">
                VS Code Experience
              </span>
              <span className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                Multiple Languages
              </span>
              <span className="px-4 py-2 bg-yellow-500/20 text-yellow-300 rounded-full text-sm">
                Conflict-Free
              </span>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Create Room Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 hover:bg-gray-800/70 transition-all">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Create New Room</h3>
                <p className="text-gray-400 mb-6">
                  Start a new collaborative session and invite your team
                </p>
                <button
                  onClick={createRoom}
                  disabled={isCreating}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Create Room
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Join Room Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-8 hover:bg-gray-800/70 transition-all">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Join Existing Room</h3>
                <p className="text-gray-400 mb-6">
                  Enter a room ID to join your team&#39;s session
                </p>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter Room ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && joinRoom()}
                  />
                  <button
                    onClick={joinRoom}
                    disabled={!roomId.trim() || isJoining}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-6 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    {isJoining ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Joining...
                      </>
                    ) : (
                      <>
                        <Users className="w-4 h-4" />
                        Join Room
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-300 rounded-full text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              WebSocket server ready on localhost:1234
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
