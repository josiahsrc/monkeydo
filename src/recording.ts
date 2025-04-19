import * as Diff from 'diff';
import * as vscode from 'vscode';
import { clearSnapshots, getIsRecording, getSnapshots, pushSnapshot, setIsRecording } from './state';
import { FileActionSnapshot, Snapshot } from './types';
import { debugLog, getContentBeforeChange } from './utility';

let currFile: string | null = null;
let currStartContent: string | null = null;
let currEndContent: string | null = null;
let isCommandRunning = false;

const takeSnapshot = (): Snapshot => {
  const oldContent = currStartContent ?? '';
  const newContent = currEndContent ?? '';
  const path = vscode.workspace.asRelativePath(currFile ?? '');

  const diff = Diff.createPatch(path, oldContent, newContent);

  return {
    type: 'fileDiff',
    file: path,
    diff: diff,
  };
};

const startSnapshot = (event: vscode.TextDocumentChangeEvent) => {
  currFile = event.document.uri.fsPath;
  currStartContent = getContentBeforeChange(event);
  currEndContent = event.document.getText();
};

const updateSnapshot = (event: vscode.TextDocumentChangeEvent) => {
  currEndContent = event.document.getText();
};

const flushSnapshot = () => {
  if (currFile && currStartContent !== currEndContent) {
    debugLog("flushing snapshot for", currFile);
    pushSnapshot(takeSnapshot());
    currFile = null;
    currStartContent = null;
    currEndContent = null;
  }
};

export const handleFileChange = (event: vscode.TextDocumentChangeEvent) => {
  if (!getIsRecording()) {
    return;
  }

  if (isCommandRunning) {
    debugLog("command is running, skipping file changes to ignore generated code");
    return;
  }

  // Only handle real file documents
  if (event.document.uri.scheme !== 'file') {
    return;
  }

  const file = event.document.uri.fsPath;
  if (!currFile) {
    debugLog("started editing first file", file);
    startSnapshot(event);
  } else if (file !== currFile) {
    debugLog("file changed to", file, "from", currFile);
    pushSnapshot(takeSnapshot());
    startSnapshot(event);
  } else {
    updateSnapshot(event);
  }
};

export const handleTerminalExecutionStart = (event: vscode.TerminalShellExecutionStartEvent) => {
  isCommandRunning = true;
  if (!getIsRecording()) {
    return;
  }

  debugLog("command started", event.execution.commandLine.value);
  flushSnapshot();
};

export const handleTerminalExecutionEnd = (event: vscode.TerminalShellExecutionEndEvent) => {
  isCommandRunning = false;
  if (!getIsRecording()) {
    return;
  }

  debugLog("command ended", event.execution.commandLine.value);
  pushSnapshot({
    type: 'terminalCommand',
    command: event.execution.commandLine.value,
    cwd: event.execution.cwd?.path,
  });
};

export const handleFileAction = (args: Omit<FileActionSnapshot, 'type'>) => {
  if (!getIsRecording()) {
    return;
  }

  debugLog("file action", args.action, args.file);
  flushSnapshot();
  pushSnapshot({
    type: 'fileAction',
    ...args,
  });
};

export const startRecording = () => {
  debugLog("start recording");
  setIsRecording(true);
  clearSnapshots();
};

export const stopRecording = (): Snapshot[] => {
  debugLog("stop recording");
  flushSnapshot();
  setIsRecording(false);
  const res = getSnapshots();
  clearSnapshots();
  return res;
};
