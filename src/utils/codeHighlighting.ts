export const getLanguageFromExtension = (filename: string): string => {
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
    'scss': 'scss',
    'sass': 'sass',
    'html': 'html',
    'htm': 'html',
    'json': 'json',
    'md': 'markdown',
    'markdown': 'markdown',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'php': 'php',
    'rb': 'ruby',
    'go': 'go',
    'rs': 'rust',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'sql': 'sql',
    'r': 'r',
    'swift': 'swift',
    'kt': 'kotlin',
    'scala': 'scala',
    'clj': 'clojure',
    'hs': 'haskell',
    'elm': 'elm',
    'vue': 'vue',
    'svelte': 'svelte'
  };
  return languageMap[ext || ''] || 'text';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
};