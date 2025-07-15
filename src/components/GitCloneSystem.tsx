import React, { useState } from 'react';
import { GitBranch, Folder, FolderOpen, File, Search, Download, Code, Star, GitFork, Eye, AlertCircle } from 'lucide-react';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  size?: number;
  content?: string;
  children?: FileNode[];
  expanded?: boolean;
}

interface Repository {
  name: string;
  description: string;
  url: string;
  stars: number;
  forks: number;
  watchers: number;
  language: string;
  files: FileNode[];
}

// Mock repository data for demonstration
const mockRepository: Repository = {
  name: "awesome-project",
  description: "A beautiful React application with modern features",
  url: "https://github.com/user/awesome-project",
  stars: 1234,
  forks: 567,
  watchers: 89,
  language: "TypeScript",
  files: [
    {
      name: "src",
      type: "directory",
      path: "src",
      expanded: true,
      children: [
        {
          name: "components",
          type: "directory",
          path: "src/components",
          children: [
            {
              name: "App.tsx",
              type: "file",
              path: "src/components/App.tsx",
              size: 1234,
              content: `import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './Header';
import Home from './Home';
import About from './About';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;`
            },
            {
              name: "Header.tsx",
              type: "file",
              path: "src/components/Header.tsx",
              size: 892,
              content: `import React from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-gray-900">
            Awesome Project
          </Link>
          <div className="flex space-x-6">
            <Link to="/" className="text-gray-600 hover:text-gray-900">
              Home
            </Link>
            <Link to="/about" className="text-gray-600 hover:text-gray-900">
              About
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Header;`
            }
          ]
        },
        {
          name: "utils",
          type: "directory",
          path: "src/utils",
          children: [
            {
              name: "helpers.ts",
              type: "file",
              path: "src/utils/helpers.ts",
              size: 456,
              content: `export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};`
            }
          ]
        }
      ]
    },
    {
      name: "package.json",
      type: "file",
      path: "package.json",
      size: 2145,
      content: `{
  "name": "awesome-project",
  "version": "1.0.0",
  "description": "A beautiful React application with modern features",
  "main": "index.js",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.8.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.4.2"
  }
}`
    },
    {
      name: "README.md",
      type: "file",
      path: "README.md",
      size: 1678,
      content: `# Awesome Project

A beautiful React application with modern features and clean architecture.

## Features

- Modern React with TypeScript
- Responsive design
- Clean component architecture
- Routing with React Router
- Utility functions and helpers

## Getting Started

1. Clone the repository
2. Install dependencies: \`npm install\`
3. Start the development server: \`npm run dev\`

## Project Structure

\`\`\`
src/
├── components/
│   ├── App.tsx
│   └── Header.tsx
└── utils/
    └── helpers.ts
\`\`\`

## Contributing

Pull requests are welcome. For major changes, please open an issue first.

## License

MIT`
    }
  ]
};

export const GitCloneSystem: React.FC = () => {
  const [repoUrl, setRepoUrl] = useState('');
  const [repository, setRepository] = useState<Repository | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleCloneRepository = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real implementation, this would call a backend service
      // Since Git is not available in WebContainer, we'll show the limitation
      setError('Git is not available in this WebContainer environment. This demo shows the interface with mock data.');
      setRepository(mockRepository);
      setSelectedFile(mockRepository.files[0].children?.[0].children?.[0] || null);
    } catch (err) {
      setError('Failed to clone repository');
    } finally {
      setLoading(false);
    }
  };

  const toggleDirectory = (node: FileNode) => {
    if (node.type === 'directory') {
      node.expanded = !node.expanded;
      setRepository(prev => prev ? { ...prev } : null);
    }
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path} className={`ml-${level * 4}`}>
        <div
          className={`flex items-center space-x-2 px-3 py-1 rounded cursor-pointer hover:bg-gray-100 transition-colors ${
            selectedFile?.path === node.path ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
          }`}
          onClick={() => {
            if (node.type === 'directory') {
              toggleDirectory(node);
            } else {
              setSelectedFile(node);
            }
          }}
        >
          {node.type === 'directory' ? (
            node.expanded ? (
              <FolderOpen className="w-4 h-4 text-blue-500" />
            ) : (
              <Folder className="w-4 h-4 text-blue-500" />
            )
          ) : (
            <File className="w-4 h-4 text-gray-500" />
          )}
          <span className="text-sm font-medium">{node.name}</span>
          {node.type === 'file' && node.size && (
            <span className="text-xs text-gray-500 ml-auto">
              {(node.size / 1024).toFixed(1)} KB
            </span>
          )}
        </div>
        {node.type === 'directory' && node.expanded && node.children && (
          <div className="ml-4">
            {renderFileTree(node.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const getLanguageFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: { [key: string]: string } = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'css': 'css',
      'html': 'html',
      'json': 'json',
      'md': 'markdown',
      'xml': 'xml',
      'yaml': 'yaml',
      'yml': 'yaml'
    };
    return languageMap[ext || ''] || 'text';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center space-x-4 mb-6">
            <GitBranch className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Git Repository Cloner</h1>
          </div>
          
          <div className="flex space-x-4">
            <div className="flex-1">
              <input
                type="url"
                placeholder="Enter Git repository URL (e.g., https://github.com/user/repo)"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleCloneRepository()}
              />
            </div>
            <button
              onClick={handleCloneRepository}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Cloning...' : 'Clone Repository'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">{error}</span>
            </div>
          )}
        </div>
      </div>

      {repository && (
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-sm border mb-6">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{repository.name}</h2>
                  <p className="text-gray-600 mt-1">{repository.description}</p>
                </div>
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4" />
                    <span>{repository.stars}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <GitFork className="w-4 h-4" />
                    <span>{repository.forks}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span>{repository.watchers}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Code className="w-4 h-4" />
                    <span>{repository.language}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search files..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">File Tree</h3>
                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                    {renderFileTree(repository.files)}
                  </div>
                </div>

                <div className="lg:col-span-2">
                  {selectedFile ? (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {selectedFile.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-500">
                            {getLanguageFromExtension(selectedFile.name)}
                          </span>
                          <button className="flex items-center space-x-1 px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                            <Download className="w-4 h-4" />
                            <span className="text-sm">Download</span>
                          </button>
                        </div>
                      </div>
                      <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-sm text-gray-100">
                          <code>{selectedFile.content}</code>
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-8 text-center">
                      <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Select a file to view its contents</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};