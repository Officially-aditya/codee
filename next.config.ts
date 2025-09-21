import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: __dirname,
  trailingSlash: false,
  poweredByHeader: false,

  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: [
            'typescript', 'javascript', 'python', 'java', 
            'cpp', 'csharp', 'go', 'rust', 'php', 'ruby',
            'css', 'html', 'json', 'yaml', 'markdown', 'sql'
          ],
          features: [
            'find','format','codeAction','codelens','comment',
            'contextmenu','clipboard','suggest','parameterHints',
            'hover','documentSymbols','folding','links',
            'colorPicker','gotoLine','gotoSymbol','quickOutline',
            'rename','wordHighlighter','bracketMatching',
            'caretOperations','multicursor','smartSelect',
            'toggleHighContrast','inspectTokens'
          ]
        })
      );
    }

    return config;
  },

  transpilePackages: ['monaco-editor'],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
        ],
      },
    ];
  },
};

export default nextConfig;
