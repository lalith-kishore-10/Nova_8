import React from 'react';
import { File, Download, ExternalLink } from 'lucide-react';
import { getFileExtension, getLanguageFromExtension } from '../utils/github';

interface FileViewerProps {
  content: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
}

export function FileViewer({ content, fileName, filePath, fileUrl }: FileViewerProps) {
  const extension = getFileExtension(fileName);
  const language = getLanguageFromExtension(extension);
  
  const isTextFile = () => {
    const textExtensions = [
      'txt', 'md', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'scss', 'sass',
      'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'kt', 'swift',
      'xml', 'yaml', 'yml', 'sql', 'sh', 'bash', 'zsh', 'ps1', 'dockerfile',
      'makefile', 'r', 'scala', 'lua', 'perl', 'vim', 'gitignore', 'env'
    ];
    
    return textExtensions.includes(extension) || !extension;
  };

  const isImageFile = () => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'];
    return imageExtensions.includes(extension);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderContent = () => {
    if (isImageFile()) {
      return (
        <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
          <img 
            src={fileUrl} 
            alt={fileName}
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
              (e.target as HTMLImageElement).nextElementSibling!.classList.remove('hidden');
            }}
          />
          <div className="hidden text-gray-500">
            <File className="h-8 w-8 mx-auto mb-2" />
            <p>Unable to load image</p>
          </div>
        </div>
      );
    }

    if (isTextFile()) {
      return (
        <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap">
          <code className={`language-${language}`}>{content}</code>
        </pre>
      );
    }

    return (
      <div className="text-center py-8 text-gray-500">
        <File className="h-12 w-12 mx-auto mb-4" />
        <p className="text-lg font-medium">Binary file</p>
        <p className="text-sm">This file type cannot be displayed</p>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{fileName}</h2>
            <p className="text-sm text-gray-500">{filePath}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              View on GitHub
            </a>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-4">
        {renderContent()}
      </div>
    </div>
  );
}