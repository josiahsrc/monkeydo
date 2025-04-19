import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { handleFileChange, handleTerminalExecutionEnd, handleTerminalExecutionStart, startRecording, stopRecording } from './recording';
import { buildWorkflowDocument } from './workflow';
import { debugLog, getMonkeyDoFolder } from './utility';
import { SidebarView } from './views';
import { setIsProcessing } from './state';
import { FindWorkflowTool } from './tools';

export function activate(context: vscode.ExtensionContext) {
  debugLog('MonkeyDo extension is now active!');

  context.subscriptions.push(vscode.lm.registerTool("monkeydo-findWorkflow", new FindWorkflowTool()));
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

    const folder = getMonkeyDoFolder();
    if (!folder) {
      vscode.window.showErrorMessage('No workflow files found in the .monkeydo folder');
      return;
    }

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }

    vscode.window.showInformationMessage('Monkey Do recording stopped!');
    const saveUri = await vscode.window.showSaveDialog({
      title: 'Save Monkey Do action log',
      defaultUri: vscode.Uri.file(path.join(folder, document.filename)),
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

  context.subscriptions.push(vscode.window.onDidStartTerminalShellExecution(async (event) => {
    handleTerminalExecutionStart(event);
  }));

  context.subscriptions.push(vscode.window.onDidEndTerminalShellExecution(async (event) => {
    handleTerminalExecutionEnd(event);
  }));
}

export function deactivate() { }
