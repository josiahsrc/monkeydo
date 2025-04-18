import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { handleFileChange, startRecording, stopRecording } from './recording';
import { buildWorkflowContent } from './workflow';
import { debugLog } from './utility';
import { Sidebar } from './sidebar';

export function activate(context: vscode.ExtensionContext) {
  debugLog('MonkeyDo extension is now active!');

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('monkeydoView', new Sidebar(context))
  );

  context.subscriptions.push(vscode.commands.registerCommand('monkeydo.startRecording', () => {
    startRecording();
    vscode.window.showInformationMessage('MonkeyDo recording started!');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('monkeydo.stopRecording', async () => {
    const snapshots = stopRecording();
    const content = await buildWorkflowContent({ snapshots });
    if (!content) {
      vscode.window.showInformationMessage('No changes recorded.');
      return;
    }

    vscode.window.showInformationMessage('Monkey Do recording stopped!');
    const saveUri = await vscode.window.showSaveDialog({
      title: 'Save Monkey Do action log',
      defaultUri: vscode.Uri.file(path.join((vscode.workspace.workspaceFolders?.[0].uri.fsPath || ''), `monkeydo-actions-${Date.now()}.md`)),
      filters: { 'Markdown Files': ['md'], 'All Files': ['*'] }
    });
    if (saveUri) {
      fs.writeFileSync(saveUri.fsPath, content);
      vscode.window.showInformationMessage('Monkey Do action log saved.');
    }
  }));

  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (event) => {
    handleFileChange(event);
  }));
}

export function deactivate() { }
