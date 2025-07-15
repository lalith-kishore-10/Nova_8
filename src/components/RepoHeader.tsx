import React from 'react';
import { Github, Star, GitFork, ArrowLeft } from 'lucide-react';
import type { GitHubRepo } from '../types/github';

interface RepoHeaderProps {
  repo: GitHubRepo;
  onBack: () => void;
}

export function RepoHeader({ repo, onBack }: RepoHeaderProps) {
  return (
    <div className="bg-white border-b p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="flex items-center px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </button>
          
          <div className="flex items-center space-x-2">
            <Github className="h-6 w-6 text-gray-700" />
            <h1 className="text-xl font-bold text-gray-900">{repo.full_name}</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <Star className="h-4 w-4" />
            <span>{repo.stargazers_count.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center space-x-1 text-sm text-gray-600">
            <GitFork className="h-4 w-4" />
            <span>{repo.forks_count.toLocaleString()}</span>
          </div>
          
          {repo.language && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
              {repo.language}
            </span>
          )}
        </div>
      </div>
      
      {repo.description && (
        <p className="mt-2 text-gray-600">{repo.description}</p>
      )}
    </div>
  );
}