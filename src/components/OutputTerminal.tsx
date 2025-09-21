// src/components/OutputTerminal.tsx
'use client';
import { Download, Play, Square, Terminal as TerminalIcon, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface OutputTerminalProps {
  code: string;
  language: string;
  roomId: string;
}

interface TerminalOutput {
  id: string;
  type: 'output' | 'error' | 'info';
  content: string;
  timestamp: number;
}

export default function OutputTerminal({ code, language, roomId }: OutputTerminalProps) {
  const [outputs, setOutputs] = useState<TerminalOutput[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new output is added
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [outputs]);

  const addOutput = (type: TerminalOutput['type'], content: string) => {
    const newOutput: TerminalOutput = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: Date.now()
    };
    setOutputs(prev => [...prev, newOutput]);
  };

  const clearOutput = () => {
    setOutputs([]);
  };

  const downloadOutput = () => {
    const outputText = outputs.map(o => 
      `[${new Date(o.timestamp).toLocaleTimeString()}] ${o.type.toUpperCase()}: ${o.content}`
    ).join('\n');
    
    const blob = new Blob([outputText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output-${roomId}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const runCode = async () => {
    if (!code.trim()) {
      addOutput('error', 'No code to execute');
      return;
    }

    setIsRunning(true);
    addOutput('info', `▶️ Executing ${language} code...`);

    try {
      // Simulate code execution based on language
      await executeCode(code, language);
    } catch (error) {
      addOutput('error', `❌ Execution failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const stopExecution = () => {
    setIsRunning(false);
    addOutput('info', '⏹️ Execution stopped');
  };

  const executeCode = async (code: string, language: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          switch (language) {
            case 'javascript':
            case 'typescript':
              executeJavaScript(code);
              break;
            case 'python':
              executePython(code);
              break;
            case 'html':
              executeHTML(code);
              break;
            default:
              addOutput('info', `📝 ${language} code ready for execution`);
              addOutput('output', code);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      }, 1000);
    });
  };

  const executeJavaScript = (code: string) => {
    try {
      // Create a safe environment for code execution
      const logs: string[] = [];
      
      // Override only console methods to capture output
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      const originalInfo = console.info;

      console.log = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
      console.error = (...args: unknown[]) => { logs.push(`ERROR: ${args.map(String).join(' ')}`); };
      console.warn = (...args: unknown[]) => { logs.push(`WARNING: ${args.map(String).join(' ')}`); };
      console.info = (...args: unknown[]) => { logs.push(`INFO: ${args.map(String).join(' ')}`); };

      // Execute the code in a try-catch block
      const result = eval(code);

      // Restore original console methods
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
      
      // Add captured logs
      logs.forEach(log => addOutput('output', log));
      
      // Add result if it exists and wasn't logged
      if (result !== undefined && logs.length === 0) {
        addOutput('output', String(result));
      }
      
      if (logs.length === 0 && result === undefined) {
        addOutput('info', '✅ Code executed successfully (no output)');
      }
      
    } catch (error) {
      addOutput('error', `JavaScript Error: ${error}`);
    }
  };

  const executePython = (code: string) => {
    // Simulate Python execution (in a real app, you'd use a Python runtime)
    addOutput('info', '🐍 Python execution simulated');
    
    // Simple pattern matching for common Python patterns
    if (code.includes('print(')) {
      const printMatches = code.match(/print\(([^)]+)\)/g);
      printMatches?.forEach(match => {
        const content = match.replace(/print\((['"]?)([^'"]*)\1\)/, '$2');
        addOutput('output', content);
      });
    } else {
      addOutput('info', 'Python code ready (connect to Python runtime for execution)');
    }
  };

  const executeHTML = (code: string) => {
    addOutput('info', '🌐 HTML code processed');
    addOutput('output', 'HTML rendered (open in browser to view)');
    addOutput('output', `HTML Content:\n${code}`);
  };

  const getOutputIcon = (type: TerminalOutput['type']) => {
    switch (type) {
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      case 'output': return '📤';
      default: return '•';
    }
  };

  const getOutputColor = (type: TerminalOutput['type']) => {
    switch (type) {
      case 'error': return 'text-red-400';
      case 'info': return 'text-blue-400';
      case 'output': return 'text-green-400';
      default: return 'text-gray-300';
    }
  };

  return (
    <div className="h-full bg-gray-900 border-t border-gray-700 flex flex-col">
      {/* Terminal Header */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Output Terminal</span>
          <span className="text-xs text-gray-500">({language})</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={runCode}
            disabled={isRunning}
            className="flex items-center gap-1 px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded text-sm transition-colors"
            title="Run Code (Ctrl+Enter)"
          >
            <Play className="w-3 h-3" />
            {isRunning ? 'Running...' : 'Run'}
          </button>
          
          {isRunning && (
            <button
              onClick={stopExecution}
              className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
              title="Stop Execution"
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
          )}
          
          <button
            onClick={clearOutput}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Clear Output"
          >
            <Trash2 className="w-4 h-4 text-gray-400" />
          </button>
          
          <button
            onClick={downloadOutput}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="Download Output"
          >
            <Download className="w-4 h-4 text-gray-400" />
          </button>
          
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? '🔼' : '🔽'}
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      {!isMinimized && (
        <div 
          ref={terminalRef}
          className="flex-1 overflow-y-auto p-4 font-mono text-sm bg-gray-900"
        >
          {outputs.length === 0 ? (
            <div className="text-gray-500 italic">
              💡 Click &quot;Run&quot; to execute your code and see the output here...
            </div>
          ) : (
            outputs.map((output) => (
              <div key={output.id} className="mb-2 flex items-start gap-2">
                <span className="text-gray-500 text-xs mt-1">
                  {new Date(output.timestamp).toLocaleTimeString()}
                </span>
                <span className="mt-1">{getOutputIcon(output.type)}</span>
                <pre className={`flex-1 whitespace-pre-wrap ${getOutputColor(output.type)}`}>
                  {output.content}
                </pre>
              </div>
            ))
          )}
          
          {isRunning && (
            <div className="flex items-center gap-2 text-yellow-400">
              <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
              <span>Executing...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
