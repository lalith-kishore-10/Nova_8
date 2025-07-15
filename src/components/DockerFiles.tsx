import React, { useState } from 'react';
import { Download, Copy, Check, FileText, Package } from 'lucide-react';
import type { GeneratedFiles } from '../types/analysis';

interface DockerFilesProps {
  files: GeneratedFiles;
  repoName: string;
}

export function DockerFiles({ files, repoName }: DockerFilesProps) {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const copyToClipboard = async (content: string, fileName: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(fileName);
      setTimeout(() => setCopiedFile(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const downloadFile = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = () => {
    Object.entries(files).forEach(([key, content]) => {
      if (content) {
        const fileName = key === 'dockerCompose' ? 'docker-compose.yml' : 
                        key === 'dockerignore' ? '.dockerignore' :
                        key === 'readme' ? 'DOCKER_README.md' : 
                        'Dockerfile';
        downloadFile(content, fileName);
      }
    });
  };

  const FileCard = ({ 
    title, 
    fileName, 
    content, 
    icon: Icon 
  }: { 
    title: string; 
    fileName: string; 
    content: string; 
    icon: any;
  }) => (
    <div className="bg-white rounded-lg border">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center">
          <Icon className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <span className="ml-2 text-sm text-gray-500">({fileName})</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => copyToClipboard(content, fileName)}
            className="flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {copiedFile === fileName ? (
              <>
                <Check className="h-4 w-4 mr-1 text-green-600" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={() => downloadFile(content, fileName)}
            className="flex items-center px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </button>
        </div>
      </div>
      <div className="p-4">
        <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-sm font-mono whitespace-pre-wrap max-h-96">
          <code>{content}</code>
        </pre>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <Package className="h-6 w-6 text-green-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">Docker Configuration Generated</h2>
            </div>
            <p className="text-gray-600">
              Ready-to-use Docker files for <span className="font-semibold">{repoName}</span>
            </p>
          </div>
          <button
            onClick={downloadAll}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Download All
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <FileCard
          title="Dockerfile"
          fileName="Dockerfile"
          content={files.dockerfile}
          icon={FileText}
        />

        {files.dockerCompose && (
          <FileCard
            title="Docker Compose"
            fileName="docker-compose.yml"
            content={files.dockerCompose}
            icon={Package}
          />
        )}

        <FileCard
          title="Docker Ignore"
          fileName=".dockerignore"
          content={files.dockerignore}
          icon={FileText}
        />

        <FileCard
          title="Docker README"
          fileName="DOCKER_README.md"
          content={files.readme}
          icon={FileText}
        />
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Quick Start Instructions</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>1. Download all files to your project root directory</p>
          <p>2. Build the Docker image: <code className="bg-blue-100 px-1 rounded">docker build -t {repoName.toLowerCase()} .</code></p>
          <p>3. Run the container: <code className="bg-blue-100 px-1 rounded">docker run -p 3000:3000 {repoName.toLowerCase()}</code></p>
          <p>4. Or use Docker Compose: <code className="bg-blue-100 px-1 rounded">docker-compose up</code></p>
        </div>
      </div>
    </div>
  );
}