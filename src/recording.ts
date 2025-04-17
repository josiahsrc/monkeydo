import * as vscode from 'vscode';
import * as Diff from 'diff';
import { Snapshot } from './types';
import { debugLog, getContentBeforeChange } from './utility';

let snapshots: Snapshot[] = [];
let recording = false;

let currFile: string | null = null;
let currStartContent: string | null = null;
let currEndContent: string | null = null;

const takeSnapshot = (): Snapshot => {
  const oldContent = currStartContent ?? '';
  const newContent = currEndContent ?? '';
  const path = vscode.workspace.asRelativePath(currFile ?? '');

  const diff = Diff.createPatch(path, oldContent, newContent);

  return {
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

export const handleFileChange = (event: vscode.TextDocumentChangeEvent) => {
  if (!recording) {
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
    snapshots.push(takeSnapshot());
    startSnapshot(event);
  } else {
    debugLog("updating snapshot for", file);
    updateSnapshot(event);
  }
};

const flushSnapshot = () => {
  if (currFile && currStartContent !== currEndContent) {
    debugLog("flushing snapshot for", currFile);
    snapshots.push(takeSnapshot());
    currFile = null;
    currStartContent = null;
    currEndContent = null;
  }
};

export const getIsRecording = () => recording;

export const startRecording = () => {
  debugLog("start recording");
  recording = true;
  snapshots = [];
};

export const stopRecording = (): Snapshot[] => {
  debugLog("stop recording");
  flushSnapshot();
  recording = false;
  const res = snapshots;
  snapshots = [];
  return res;
};
