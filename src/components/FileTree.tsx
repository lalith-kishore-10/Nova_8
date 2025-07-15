import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, File, Folder, Search, X } from 'lucide-react';
import type { GitHubTreeItem } from '../types/github';

interface FileTreeProps {
  files: GitHubTreeItem[];
  onFileSelect: (file: GitHubTreeItem) => void;
  selectedFile: GitHubTreeItem | null;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children: TreeNode[];
  item?: GitHubTreeItem;
}

export function FileTree({ files, onFileSelect, selectedFile }: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));
  const [searchTerm, setSearchTerm] = useState('');

  const tree = useMemo(() => {
    const root: TreeNode = { name: '', path: '', type: 'folder', children: [] };
    
    files.forEach(file => {
      const parts = file.path.split('/');
      let current = root;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLast = i === parts.length - 1;
        const currentPath = parts.slice(0, i + 1).join('/');
        
        let child = current.children.find(c => c.name === part);
        
        if (!child) {
          child = {
            name: part,
            path: currentPath,
            type: isLast ? (file.type === 'blob' ? 'file' : 'folder') : 'folder',
            children: [],
            item: isLast ? file : undefined
          };
          current.children.push(child);
        }
        
        current = child;
      }
    });
    
    // Sort folders first, then files
    const sortChildren = (node: TreeNode) => {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      
      node.children.forEach(sortChildren);
    };
    
    sortChildren(root);
    return root;
  }, [files]);

  const filteredTree = useMemo(() => {
    if (!searchTerm) return tree;
    
    const filterNode = (node: TreeNode): TreeNode | null => {
      const matchesSearch = node.name.toLowerCase().includes(searchTerm.toLowerCase());
      const filteredChildren = node.children.map(filterNode).filter(Boolean) as TreeNode[];
      
      if (matchesSearch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      
      return null;
    };
    
    return filterNode(tree) || { name: '', path: '', type: 'folder', children: [] };
  }, [tree, searchTerm]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const renderNode = (node: TreeNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile?.path === node.path;
    
    return (
      <div key={node.path}>
        <div
          className={`flex items-center py-1 px-2 cursor-pointer hover:bg-gray-100 ${
            isSelected ? 'bg-blue-100 text-blue-700' : ''
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'folder') {
              toggleFolder(node.path);
            } else if (node.item) {
              onFileSelect(node.item);
            }
          }}
        >
          {node.type === 'folder' && (
            <span className="mr-1">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
          )}
          
          <span className="mr-2">
            {node.type === 'folder' ? (
              <Folder className="h-4 w-4 text-blue-600" />
            ) : (
              <File className="h-4 w-4 text-gray-600" />
            )}
          </span>
          
          <span className="truncate text-sm">{node.name}</span>
        </div>
        
        {node.type === 'folder' && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search files..."
            className="w-full pl-9 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto">
        {filteredTree.children.length > 0 ? (
          filteredTree.children.map(child => renderNode(child))
        ) : (
          <div className="p-4 text-center text-gray-500">
            {searchTerm ? 'No files found matching your search.' : 'No files found.'}
          </div>
        )}
      </div>
    </div>
  );
}