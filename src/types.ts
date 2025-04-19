export type FileDiffSnapshot = {
  type: 'fileDiff';
  file: string;
  diff: string;
}

export type TerminalCommandSnapshot = {
  type: 'terminalCommand';
  command: string;
  cwd?: string;
}

export type Snapshot = FileDiffSnapshot | TerminalCommandSnapshot;

export type Document = {
  path: string;
  filename: string;
  content: string;
}
