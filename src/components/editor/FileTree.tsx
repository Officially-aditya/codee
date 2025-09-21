// src/components/editor/FileTree.tsx
'use client';
import { FileNode } from '@/types';
import {
    ChevronDown,
    ChevronRight,
    File,
    Folder,
    FolderOpen,
    Plus
} from 'lucide-react';
import React, { useCallback, useState } from 'react';

interface FileTreeProps {
  onFileSelect: (filePath: string, language: string) => void;
  selectedFile?: string;
}

export default function FileTree({ onFileSelect, selectedFile }: FileTreeProps) {
  // Sample file structure
  const [fileTree] = useState<FileNode[]>([
    {
      id: 'src',
      name: 'src',
      type: 'folder',
      path: '/src',
      children: [
        {
          id: 'main-ts',
          name: 'main.ts',
          type: 'file',
          path: '/src/main.ts',
          content: '// Welcome to the collaborative editor!\nconsole.log("Hello, World!");',
          language: 'typescript',
          lastModified: Date.now(),
          createdAt: Date.now()
        },
        {
          id: 'utils-ts',
          name: 'utils.ts',
          type: 'file',
          path: '/src/utils.ts',
          content: '// Utility functions\nexport const greeting = (name: string) => `Hello, ${name}!`;',
          language: 'typescript',
          lastModified: Date.now(),
          createdAt: Date.now()
        },
        {
          id: 'components',
          name: 'components',
          type: 'folder',
          path: '/src/components',
          children: [
            {
              id: 'app-tsx',
              name: 'App.tsx',
              type: 'file',
              path: '/src/components/App.tsx',
              content: 'import React from "react";\n\nfunction App() {\n  return <div>Hello React!</div>;\n}\n\nexport default App;',
              language: 'typescript',
              lastModified: Date.now(),
              createdAt: Date.now()
            }
          ],
          lastModified: Date.now(),
          createdAt: Date.now()
        }
      ],
      lastModified: Date.now(),
      createdAt: Date.now()
    }
  ]);

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(['/src', '/src/components'])
  );

  const getLanguageFromExtension = useCallback((filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'xml': 'xml',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'shell'
    };
    return ext && languageMap[ext] ? languageMap[ext] : 'plaintext';
  }, []);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  }, []);

  const handleFileClick = useCallback((node: FileNode) => {
    if (node.type === 'file') {
      onFileSelect(node.path, getLanguageFromExtension(node.name));
    } else {
      toggleFolder(node.path);
    }
  }, [onFileSelect, getLanguageFromExtension, toggleFolder]);

  const FileIcon = ({ node, isExpanded }: { node: FileNode; isExpanded?: boolean }) => {
    if (node.type === 'folder') {
      return isExpanded ? (
        <FolderOpen className="w-4 h-4 text-blue-400" />
      ) : (
        <Folder className="w-4 h-4 text-blue-400" />
      );
    }
    return <File className="w-4 h-4 text-gray-400" />;
  };

  const renderFileNode = (node: FileNode, level: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile === node.path;
    
    return (
      <div key={node.id} className="select-none">
        <div
          className={`
            flex items-center gap-1 px-2 py-1 hover:bg-gray-700 cursor-pointer group text-sm
            ${isSelected ? 'bg-blue-600 hover:bg-blue-700' : ''}
          `}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => handleFileClick(node)}
        >
          {node.type === 'folder' && (
            <button onClick={(e) => { e.stopPropagation(); toggleFolder(node.path); }}>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>
          )}
          
          <FileIcon node={node} isExpanded={isExpanded} />
          
          <span className="flex-1 text-gray-300 truncate">
            {node.name}
          </span>
        </div>

        {node.type === 'folder' && isExpanded && node.children && (
          <div>
            {node.children.map(child => renderFileNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">Files</h3>
        <button
          className="p-1 hover:bg-gray-700 rounded"
          title="New File"
        >
          <Plus className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-auto py-2">
        {fileTree.map(node => renderFileNode(node))}
      </div>
    </div>
  );
}
