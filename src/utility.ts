import * as vscode from 'vscode';

let channel: vscode.OutputChannel | null = null;

export const getContentBeforeChange = (event: vscode.TextDocumentChangeEvent): string => {
  const document = event.document;
  const changes = event.contentChanges;

  if (changes.length === 0) {
    return document.getText();
  }

  // Apply the changes to get the content after the change
  let currentContent = document.getText();
  for (const change of changes) {
    const before = currentContent.slice(0, change.rangeOffset);
    const after = currentContent.slice(change.rangeOffset + change.rangeLength);
    currentContent = before + change.text + after;
  }

  return currentContent;
};

export const debugLog = (...entries: unknown[]) => {
  if (!channel) {
    channel = vscode.window.createOutputChannel('MonkeyDo');
  }

  const joined = entries.map((e) => `${e}`).join(' ');
  const msg = `[${new Date().toLocaleTimeString()}] ${joined}`;
  channel.appendLine(msg);
};
