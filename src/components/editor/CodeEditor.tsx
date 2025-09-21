// src/components/editor/CodeEditor.tsx
'use client';
import { EditorConfig, UserInfo } from '@/types';
import { Editor, OnMount } from '@monaco-editor/react';
import { Loader2 } from 'lucide-react';
import { editor } from 'monaco-editor';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MonacoBinding } from 'y-monaco';
import { WebsocketProvider } from 'y-websocket';
import * as Y from 'yjs';

interface CodeEditorProps {
  fileName: string;
  language: string;
  roomId: string;
  initialContent?: string;
  config?: EditorConfig;
  onContentChange?: (content: string) => void;
  userInfo: UserInfo;
}

export default function CodeEditor({
  fileName,
  language,
  roomId,
  initialContent = '// Welcome to the collaborative editor!\nconsole.log("Hello, World!");', // updated default
  config = {
    theme: 'vs-dark',
    fontSize: 14,
    wordWrap: 'on',
    minimap: true,
    lineNumbers: 'on'
  },
  onContentChange,
  userInfo
}: CodeEditorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false); // added

  // Refs for cleanup
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  const setupCollaboration = useCallback((monacoEditor: editor.IStandaloneCodeEditor) => {
    try {
      console.log('🤝 Setting up collaboration for room:', roomId);

      // Create Yjs document
      const ydoc = new Y.Doc();
      const yText = ydoc.getText(fileName);

      // Create WebSocket provider - connecting to your running server
      const provider = new WebsocketProvider(
        'ws://localhost:1234', // updated to match prompt
        roomId,
        ydoc
      );

      // Set user awareness info
      provider.awareness.setLocalStateField('user', {
        name: userInfo.name,
        color: userInfo.color,
        id: userInfo.id
      });

      // Create Monaco binding
      const binding = new MonacoBinding(
        yText,
        monacoEditor.getModel()!,
        new Set([monacoEditor]),
        provider.awareness
      );

      // Store refs for cleanup
      ydocRef.current = ydoc;
      providerRef.current = provider;
      bindingRef.current = binding;

      // Handle connection events
      provider.on('status', ({ status }: { status: string }) => {
        console.log(`📡 Connection status: ${status}`);
        setIsConnected(status === 'connected');
        if (status === 'connected') {
          setError(null);
        }
      });

      provider.on('connection-error', (event: Event) => {
        console.error('❌ Connection error:', event);
        setError('Failed to connect to collaboration server');
        setIsConnected(false);
      });

      // Set initial content if document is empty
      if (yText.length === 0 && initialContent) {
        yText.insert(0, initialContent);
      }

      // Add keyboard shortcut for running code
      monacoEditor.addCommand(
        // @ts-expect-error: window.monaco may not be typed correctly in this context
        window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.Enter,
        () => {
          window.dispatchEvent(new CustomEvent('runCode'));
        }
      );

    } catch (err) {
      console.error('🔥 Failed to setup collaboration:', err);
      setError('Failed to initialize collaborative editing');
    }
  }, [fileName, roomId, userInfo, initialContent]);

  const handleEditorMount: OnMount = useCallback((monacoEditor) => {
    console.log('🎯 Monaco Editor mounted');
    editorRef.current = monacoEditor;
    setIsLoading(false);

    // Setup collaborative editing
    setupCollaboration(monacoEditor);

    // Handle content changes
    const contentChangeDisposable = monacoEditor.onDidChangeModelContent(() => {
      const content = monacoEditor.getValue();
      onContentChange?.(content);
    });

    // Cleanup on unmount
    return () => {
      contentChangeDisposable.dispose();
    };
  }, [onContentChange, setupCollaboration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up collaboration resources');
      bindingRef.current?.destroy();
      providerRef.current?.destroy();
      ydocRef.current?.destroy();
    };
  }, []);


  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-red-400">
        <div className="text-center">
          <p className="text-lg font-medium">⚠️ {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reload Editor
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Connection status indicator */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        <div 
          className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
          title={isConnected ? 'Connected' : 'Disconnected'}
        />
        <span className="text-xs text-gray-400">
          {isConnected ? 'Connected' : 'Connecting...'}
        </span>
      </div>

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="flex items-center space-x-2 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading editor...</span>
          </div>
        </div>
      )}
      
      <Editor
        height="100%"
        language={language}
        theme={config.theme}
        onMount={handleEditorMount}
        loading={null} // We handle loading ourselves
        options={{
          fontSize: config.fontSize,
          wordWrap: config.wordWrap,
          minimap: { enabled: config.minimap },
          lineNumbers: config.lineNumbers,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true
          },
          // suggest: { enabled: true }, // removed invalid property
          quickSuggestions: true, // updated
          parameterHints: { enabled: true },
          hover: { enabled: true },
          contextmenu: true,
          mouseWheelZoom: true,
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          padding: { top: 16, bottom: 16 }
        }}
      />
    </div>
  );
}
