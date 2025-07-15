export interface StackAnalysis {
  primaryLanguage: string;
  framework?: string;
  packageManager?: string;
  runtime?: string;
  database?: string[];
  dependencies: Dependency[];
  devDependencies: Dependency[];
  scripts: Record<string, string>;
  buildTool?: string;
  testFramework?: string;
  linting?: string[];
  styling?: string[];
}

export interface Dependency {
  name: string;
  version?: string;
  type: 'runtime' | 'dev' | 'peer';
  category: string;
}

export interface DockerConfig {
  baseImage: string;
  workdir: string;
  copyInstructions: string[];
  runInstructions: string[];
  exposePort: number;
  startCommand: string;
  buildStage?: string;
  environmentVars?: Record<string, string>;
}

export interface GeneratedFiles {
  dockerfile: string;
  dockerCompose?: string;
  dockerignore: string;
  readme: string;
}
</parameter>