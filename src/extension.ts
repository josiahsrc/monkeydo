import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { handleFileChange, startRecording, stopRecording } from './recording';
import { buildWorkflowDocument } from './workflow';
import { debugLog } from './utility';
import { SidebarView } from './views';
import { setIsProcessing } from './state';
import { GetTutorialTool } from './tools';

export function activate(context: vscode.ExtensionContext) {
  debugLog('MonkeyDo extension is now active!');

  context.subscriptions.push(vscode.lm.registerTool("monkeydo-getTutorial", new GetTutorialTool()));
  context.subscriptions.push(vscode.window.registerWebviewViewProvider('monkeydoView', new SidebarView(context)));

  context.subscriptions.push(vscode.commands.registerCommand('monkeydo.startRecording', () => {
    startRecording();
    vscode.window.showInformationMessage('MonkeyDo recording started!');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('monkeydo.stopRecording', async () => {
    setIsProcessing(true);
    const snapshots = stopRecording();
    const document = await buildWorkflowDocument({ snapshots }).finally(() => setIsProcessing(false));
    if (!document) {
      vscode.window.showInformationMessage('No changes recorded.');
      return;
    }

    vscode.window.showInformationMessage('Monkey Do recording stopped!');
    const saveUri = await vscode.window.showSaveDialog({
      title: 'Save Monkey Do action log',
      defaultUri: vscode.Uri.file(path.join((vscode.workspace.workspaceFolders?.[0].uri.fsPath || ''), document.filename)),
      filters: { 'Markdown Files': ['md'], 'All Files': ['*'] }
    });
    if (saveUri) {
      fs.writeFileSync(saveUri.fsPath, document.content);
      vscode.window.showInformationMessage('Monkey Do action log saved.');
    }
  }));

  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (event) => {
    handleFileChange(event);
  }));

}

export function deactivate() { }
