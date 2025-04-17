import * as vscode from 'vscode';
import * as Diff from 'diff';
import { Snapshot } from './types';
import { getContentBeforeChange } from './utility';

let snapshots: Snapshot[] = [];
let recording = false;

let currFile: string | null = null;
let currInitialContent: string | null = null;

export const getIsRecording = () => recording;

export const startRecording = () => {
  console.log("start recording");
  recording = true;
  snapshots = [];
};

export const stopRecording = (): Snapshot[] => {
  console.log("stop recording");
  recording = false;
  const res = snapshots;
  snapshots = [];
  return res;
};

const finishSnapshot = (event: vscode.TextDocumentChangeEvent): Snapshot => {
  const newContent = event.document.getText();
  const oldContent = currInitialContent ?? '';
  const relativePath = vscode.workspace.asRelativePath(currFile ?? '');

  const diff = Diff.createPatch(relativePath, oldContent, newContent);
  return {
    file: relativePath,
    diff: diff,
  };
};

const startSnapshot = (event: vscode.TextDocumentChangeEvent) => {
  const beforeChange = getContentBeforeChange(event);
  const file = event.document.uri.fsPath;

  currFile = file;
  currInitialContent = beforeChange;
};

export const handleFileChange = (event: vscode.TextDocumentChangeEvent) => {
  if (!recording) {
    return;
  }

  const file = event.document.uri.fsPath;
  if (file !== currFile) {
    snapshots.push(finishSnapshot(event));
    snapshots.push({
      file: vscode.workspace.asRelativePath(file),
      diff: '',
    });
    snapshots.push({
      file: vscode.workspace.asRelativePath(file),
      diff: '',
    });
    snapshots.push({
      file: vscode.workspace.asRelativePath(file),
      diff: '',
    });
    snapshots.push({
      file: vscode.workspace.asRelativePath(file),
      diff: '',
    });

    startSnapshot(event);
  }
};
