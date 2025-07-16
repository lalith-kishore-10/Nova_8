import React, { useState } from 'react';
import { Search, Github, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { parseGitHubUrl, checkGitHubApiStatus } from '../utils/github';

interface RepoInputProps {
  onSubmit: (owner: string, repo: string) => void;
  loading: boolean;
  error: string | null;
}

export function RepoInput({ onSubmit, loading, error }: RepoInputProps) {
  const [url, setUrl] = useState('');
  const [isValidUrl, setIsValidUrl] = useState(true);
  const [isCheckingApi, setIsCheckingApi] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ status: string; message: string } | null>(null);

  const checkApiStatus = async () => {
    setIsCheckingApi(true);
    try {
      const status = await checkGitHubApiStatus();
      setApiStatus(status);
    } catch (error) {
      setApiStatus({
        status: 'error',
        message: 'Failed to check GitHub API status'
      });
    } finally {
      setIsCheckingApi(false);
    }
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) return;

    const parsed = parseGitHubUrl(url);
    
    if (!parsed.isValid) {
      setIsValidUrl(false);
      return;
    }

    setIsValidUrl(true);
    onSubmit(parsed.owner, parsed.repo);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    
    if (value.trim()) {
      const parsed = parseGitHubUrl(value);
      setIsValidUrl(parsed.isValid);
    } else {
      setIsValidUrl(true);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Github className="h-12 w-12 text-gray-700 mr-3" />
          <h1 className="text-4xl font-bold text-gray-900">Repository Explorer</h1>
        </div>
        <p className="text-gray-600 text-lg">Enter a GitHub repository URL to explore its files</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={url}
            onChange={handleInputChange}
            placeholder="https://github.com/owner/repository or owner/repository"
            className={`w-full pl-10 pr-4 py-3 text-lg border-2 rounded-lg focus:outline-none transition-colors ${
              isValidUrl
                ? 'border-gray-300 focus:border-blue-500'
                : 'border-red-300 focus:border-red-500'
            }`}
            disabled={loading}
          />
        </div>

        {!isValidUrl && (
          <div className="flex items-center text-red-600 text-sm">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>Please enter a valid GitHub repository URL</span>
          </div>
        )}

        {error && (
          <div className="flex items-center text-red-600 text-sm">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !url.trim() || !isValidUrl}
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
        >
          {loading ? 'Loading...' : 'Explore Repository'}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-center">
        <button
          onClick={checkApiStatus}
          disabled={isCheckingApi}
          className="flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          {isCheckingApi ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
          ) : apiStatus?.status === 'ok' ? (
            <Wifi className="h-4 w-4 mr-2 text-green-600" />
          ) : apiStatus?.status === 'error' ? (
            <WifiOff className="h-4 w-4 mr-2 text-red-600" />
          ) : (
            <Wifi className="h-4 w-4 mr-2" />
          )}
          {isCheckingApi ? 'Checking...' : 'Check GitHub API Status'}
        </button>
      </div>

      {apiStatus && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${
          apiStatus.status === 'ok' 
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center">
            {apiStatus.status === 'ok' ? (
              <Wifi className="h-4 w-4 mr-2" />
            ) : (
              <WifiOff className="h-4 w-4 mr-2" />
            )}
            {apiStatus.message}
          </div>
        </div>
      )}
      <div className="mt-8 text-center text-gray-500 text-sm">
        <p>Supports formats:</p>
        <p className="mt-2">
          <code className="bg-gray-100 px-2 py-1 rounded">https://github.com/owner/repo</code>
          <span className="mx-2">•</span>
          <code className="bg-gray-100 px-2 py-1 rounded">owner/repo</code>
        </p>
      </div>
    </div>
  );
}