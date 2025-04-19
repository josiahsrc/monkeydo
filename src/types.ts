export type FileDiffSnapshot = {
  type: 'fileDiff';
  file: string;
  diff: string;
}

export type FileActionSnapshot = {
  type: 'fileAction';
  action: 'create' | 'delete' | 'rename';
  file: string;
  oldFile?: string;
}

export type TerminalCommandSnapshot = {
  type: 'terminalCommand';
  command: string;
  cwd?: string;
}

export type Snapshot = FileDiffSnapshot | FileActionSnapshot | TerminalCommandSnapshot;

export type Document = {
  path: string;
  filename: string;
  content: string;
}
