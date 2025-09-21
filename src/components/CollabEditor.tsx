// src/app/room/[roomId]/page.tsx
'use client';
import { Editor } from '@monaco-editor/react';
import { Copy, Download, ExternalLink, Home, Play, Share2, Terminal, Users } from 'lucide-react';
import type { editor } from 'monaco-editor';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { MonacoBinding } from 'y-monaco';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

// Proper Monaco Editor types
type IStandaloneCodeEditor = editor.IStandaloneCodeEditor;
type ITextModel = editor.ITextModel;

export interface CollabEditorProps {
  roomId: string;
  language?: string;
  initialContent?: string;
  userInfo?: {
    id: string;
    name: string;
    color?: string;
  };
}

declare global {
  interface Window {
    MonacoEnvironment?: {
      getWorker: (moduleId: string, label: string) => Worker;
    };
  }
}

if (typeof window !== 'undefined') {
  window.MonacoEnvironment = {
    getWorker: (_moduleId: string, label: string) => {
      const workerPath = (() => {
        switch (label) {
          case 'json':
            return '/monaco/json.worker.js';
          case 'css':
          case 'scss':
          case 'less':
            return '/monaco/css.worker.js';
          case 'html':
          case 'handlebars':
          case 'razor':
            return '/monaco/html.worker.js';
          case 'typescript':
          case 'javascript':
            return '/monaco/ts.worker.js';
          default:
            return '/monaco/editor.worker.js';
        }
      })();

      return new Worker(new URL(workerPath, import.meta.url), { type: 'module' });
    }
  };
}


interface WebSocketStatus {
  status: 'connecting' | 'connected' | 'disconnected';
}

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.roomId as string;
  
  const [copied, setCopied] = useState(false);
  const [fullUrl, setFullUrl] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [connectedUsers, setConnectedUsers] = useState(1);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    '🚀 CollabCode Terminal Ready',
    `📁 Room: ${roomId?.slice(0, 8)}...`,
    '💡 Run your code to see output here',
    ''
  ]);
  
  // Use proper Monaco Editor types
  const editorRef = useRef<IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);

  // Set full URL for sharing
  useEffect(() => {
    if (typeof window !== 'undefined' && roomId) {
      setFullUrl(window.location.href);
      setTerminalOutput(prev => prev.map((line, i) => 
        i === 1 ? `📁 Room: ${roomId.slice(0, 8)}...` : line
      ));
    }
  }, [roomId]);

  // Initialize collaborative editing - FIXED Monaco types
  useEffect(() => {
    if (!roomId || !editorRef.current || !monacoRef.current) return;

    // Create Y.js document and WebSocket provider
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider( 'wss://766cfbad6687.ngrok-free.app', roomId, ydoc);
    const ytext = ydoc.getText('monaco');

    // Store refs for cleanup
    ydocRef.current = ydoc;
    providerRef.current = provider;

    // Create Monaco binding with proper types - FIXED
    const binding = new MonacoBinding(
      ytext,
      editorRef.current.getModel() as ITextModel,
      new Set([editorRef.current]), // This is now properly typed
      provider.awareness
    );
    bindingRef.current = binding;

    // Connection status listeners
    provider.on('status', (event: WebSocketStatus) => {
      console.log('WebSocket status:', event.status);
      setConnectionStatus(event.status);
      setTerminalOutput(prev => [...prev, `🔗 WebSocket: ${event.status}`]);
    });

    // User awareness
    provider.awareness.on('change', () => {
      const states = Array.from(provider.awareness.getStates().values());
      setConnectedUsers(states.length);
    });

    // Cleanup
    return () => {
      binding.destroy();
      provider.destroy();
      ydoc.destroy();
    };
  }, [roomId]);

  // Copy functions
  const copyRoomUrl = async (): Promise<void> => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy URL');
    }
  };

  const copyRoomId = async (): Promise<void> => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy room ID');
    }
  };

  const shareRoom = async (): Promise<void> => {
    if (!roomId || !fullUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Collaborative Code Editor',
          text: `Join my coding session! Room ID: ${roomId}`,
          url: fullUrl,
        });
      } catch {
        copyRoomUrl();
      }
    } else {
      copyRoomUrl();
    }
  };

  // Run code function
  const runCode = (): void => {
    if (editorRef.current) {
      const code: string = editorRef.current.getValue();
      const timestamp: string = new Date().toLocaleTimeString();
      const codeLines: string[] = code.split('\n');
      const previewLines: string[] = codeLines.slice(0, 3).map((line: string) => `  ${line}`);
      
      const newOutput: string[] = [
        ``,
        `⚡ Running ${language} code at ${timestamp}`,
        `${'─'.repeat(50)}`,
        `// Code executed:`,
        ...previewLines,
        codeLines.length > 3 ? '  ...' : '',
        ``,
        `✅ Code execution complete`,
        `💡 Connect a runtime to see actual output`,
        ``
      ];
      
      setTerminalOutput((prev: string[]) => [...prev, ...newOutput]);
      
      // Auto-scroll terminal to bottom
      setTimeout(() => {
        const terminal = document.getElementById('terminal-output');
        if (terminal) {
          terminal.scrollTop = terminal.scrollHeight;
        }
      }, 100);
    }
  };

  // Download code
  const downloadCode = (): void => {
    if (editorRef.current) {
      const code = editorRef.current.getValue();
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `room-${roomId.slice(0, 8)}.${getFileExtension(language)}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Get file extension
  const getFileExtension = (lang: string): string => {
    const extensions: { [key: string]: string } = {
      typescript: 'ts', javascript: 'js', python: 'py', java: 'java',
      cpp: 'cpp', csharp: 'cs', go: 'go', rust: 'rs', php: 'php',
      ruby: 'rb', css: 'css', html: 'html', json: 'json',
      yaml: 'yaml', markdown: 'md', sql: 'sql'
    };
    return extensions[lang] || 'txt';
  };

  // Clear terminal
  const clearTerminal = (): void => {
    setTerminalOutput([
      '🚀 CollabCode Terminal Ready',
      `📁 Room: ${roomId?.slice(0, 8)}...`,
      '💡 Run your code to see output here',
      ''
    ]);
  };

  // Monaco editor options
  const editorOptions: editor.IStandaloneEditorConstructionOptions = {
    theme: 'vs-dark',
    fontSize: 14,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    tabSize: 2,
    wordWrap: 'on',
    lineNumbers: 'on',
    renderWhitespace: 'selection',
    cursorBlinking: 'blink',
    multiCursorModifier: 'ctrlCmd',
    formatOnPaste: true,
    formatOnType: true,
  };

  if (!roomId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
            >
              <Home className="w-4 h-4" />
              <span className="text-sm">Home</span>
            </button>
            
            <div className="h-4 w-px bg-gray-600"></div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Room:</span>
              <code className="bg-gray-700 px-2 py-1 rounded text-blue-300 font-mono text-xs">
                {roomId.slice(0, 8)}...
              </code>
            </div>

            <div className="h-4 w-px bg-gray-600"></div>

            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-red-500'
              }`}></div>
              <span className="text-xs text-gray-400 capitalize">{connectionStatus}</span>
            </div>

            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-gray-400" />
              <span className="text-xs text-gray-400">{connectedUsers}</span>
            </div>
          </div>

          {/* Center - Language Selector */}
          <div className="flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-gray-700 text-white px-3 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="csharp">C#</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
              <option value="php">PHP</option>
              <option value="ruby">Ruby</option>
              <option value="css">CSS</option>
              <option value="html">HTML</option>
              <option value="json">JSON</option>
              <option value="yaml">YAML</option>
              <option value="markdown">Markdown</option>
              <option value="sql">SQL</option>
            </select>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <button
              onClick={runCode}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Run Code"
            >
              <Play className="w-4 h-4 text-green-400 hover:text-green-300" />
            </button>
            
            <button
              onClick={() => setShowTerminal(!showTerminal)}
              className={`p-2 hover:bg-gray-700 rounded transition-colors ${showTerminal ? 'text-blue-400' : 'text-gray-400'}`}
              title="Toggle Terminal"
            >
              <Terminal className="w-4 h-4" />
            </button>
            
            <button
              onClick={downloadCode}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Download Code"
            >
              <Download className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
            
            <div className="h-4 w-px bg-gray-600"></div>
            
            <button
              onClick={copyRoomId}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Copy Room ID"
            >
              <Copy className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
            
            <button
              onClick={copyRoomUrl}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Copy Room URL"
            >
              <ExternalLink className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
            
            <button
              onClick={shareRoom}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
              title="Share Room"
            >
              <Share2 className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
          </div>
        </div>

        {/* Copy notification */}
        {copied && (
          <div className="absolute top-16 right-4 bg-green-600 text-white px-3 py-1 rounded-md text-sm z-50 animate-fade-in-out">
            ✓ Copied to clipboard!
          </div>
        )}
      </div>

      {/* Main Content Area - Editor + Terminal */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Monaco Editor */}
        <div className={`flex-1 ${showTerminal ? 'min-h-0' : ''}`}>
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            defaultValue={`// Welcome to CollabCode Room: ${roomId}
// Start collaborating in real-time!

${language === 'typescript' ? `interface User {
  id: string;
  name: string;
  isOnline: boolean;
}

const welcomeMessage: string = "Happy coding together!";
console.log(welcomeMessage);

function greetTeam(members: User[]): void {
  members.forEach(user => {
    if (user.isOnline) {
      console.log(\`Hello \${user.name}! 👋\`);
    }
  });
}` :
language === 'javascript' ? `// JavaScript collaborative editing
const roomId = "${roomId}";
console.log("Welcome to room:", roomId);

function startCoding() {
  return "Let's build something amazing!";
}

// Real-time collaboration features
const collaborativeFeatures = [
  "Live cursor tracking",
  "Instant code sync", 
  "Multi-user editing",
  "Conflict-free merging"
];

console.log("Features:", collaborativeFeatures);` :
language === 'python' ? `# Python collaborative editing
room_id = "${roomId}"
print(f"Welcome to room: {room_id}")

def start_coding():
    return "Let's build something amazing!"

# Real-time collaboration
features = [
    "Live cursor tracking",
    "Instant code sync", 
    "Multi-user editing",
    "Conflict-free merging"
]

for feature in features:
    print(f"✨ {feature}")` :
language === 'java' ? `// Java collaborative editing
public class CollabRoom {
    private String roomId = "${roomId}";
    
    public static void main(String[] args) {
        System.out.println("Welcome to collaborative coding!");
        
        CollabRoom room = new CollabRoom();
        room.startCollaboration();
    }
    
    public void startCollaboration() {
        System.out.println("Room ID: " + this.roomId);
        System.out.println("Ready for real-time coding!");
    }
}` :
`// Welcome to collaborative coding!
// Room: ${roomId}
// Language: ${language}

// Start typing your code here...
// Multiple users can edit simultaneously!

console.log("Real-time collaboration is active!");`}
            `}
            options={editorOptions}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              monacoRef.current = monaco;
              
              editor.focus();
              
              // Custom theme
              monaco.editor.defineTheme('collab-dark', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                  { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
                  { token: 'keyword', foreground: '569CD6' },
                  { token: 'string', foreground: 'CE9178' },
                  { token: 'number', foreground: 'B5CEA8' },
                ],
                colors: {
                  'editor.background': '#1F2937',
                  'editor.lineHighlightBackground': '#374151',
                  'editorCursor.foreground': '#60A5FA',
                  'editor.selectionBackground': '#3B82F640',
                }
              });
              
              monaco.editor.setTheme('collab-dark');
            }}
          />
        </div>

        {/* Terminal Panel */}
        {showTerminal && (
          <div className="h-64 bg-gray-800 border-t border-gray-700 flex flex-col flex-shrink-0">
            {/* Terminal Header */}
            <div className="bg-gray-700 px-4 py-2 flex items-center justify-between border-b border-gray-600">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">Terminal</span>
              </div>
              <button
                onClick={clearTerminal}
                className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 hover:bg-gray-600 rounded"
              >
                Clear
              </button>
            </div>
            
            {/* Terminal Output */}
            <div 
              id="terminal-output"
              className="flex-1 p-4 font-mono text-sm overflow-y-auto terminal-output"
            >
              {terminalOutput.map((line, index) => (
                <div key={index} className="mb-1">
                  {line || '\u00A0'}
                </div>
              ))}
              <div className="flex items-center">
                <span className="text-green-400">→</span>
                <span className="ml-2 text-gray-400">Ready for code execution...</span>
                <span className="ml-1 animate-pulse">▋</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
