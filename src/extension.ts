// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as Diff from 'diff';

const logs: string[] = [];
let recording = false;

let currentFile: string | undefined = undefined;
let beforeContent: string | undefined = undefined;
let afterContent: string | undefined = undefined;

async function getFileContent(filePath: string): Promise<string> {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

async function handleFileSwitch(newFile: string | undefined) {
  if (currentFile && beforeContent !== undefined) {
    // Get after content
    afterContent = await getFileContent(currentFile);
    if (beforeContent !== afterContent) {
      const diff = Diff.createPatch(currentFile, beforeContent, afterContent);
      logAction(`Diff for ${currentFile}:\n${diff}`);
    }
  }
  currentFile = newFile;
  beforeContent = newFile ? await getFileContent(newFile) : undefined;
  afterContent = undefined;
}

function logAction(action: string) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${action}\n`;
  logs.push(entry);
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  console.log('MonkeyDo extension is now active!');

  context.subscriptions.push(vscode.commands.registerCommand('monkeydo.startRecording', () => {
    recording = true;
    vscode.window.showInformationMessage('MonkeyDo recording started!');
  }));

  context.subscriptions.push(vscode.commands.registerCommand('monkeydo.stopRecording', async () => {
    recording = false;
    // On stop, flush last file diff
    await handleFileSwitch(undefined);
    vscode.window.showInformationMessage('Monkey Do recording stopped!');
    if (logs.length > 0) {
      const saveUri = await vscode.window.showSaveDialog({
        title: 'Save Monkey Do action log',
        defaultUri: vscode.Uri.file(path.join((vscode.workspace.workspaceFolders?.[0].uri.fsPath || ''), `monkeydo-actions-${Date.now()}.log`)),
        filters: { 'Log Files': ['log'], 'All Files': ['*'] }
      });
      if (saveUri) {
        fs.writeFileSync(saveUri.fsPath, logs.join(''));
        vscode.window.showInformationMessage('Monkey Do action log saved.');
      }
    }
  }));

  // File system watcher for all files in the workspace
  const watcher = vscode.workspace.createFileSystemWatcher('**/*');
  watcher.onDidCreate(uri => logAction(`File created: ${uri.fsPath}`));
  watcher.onDidChange(uri => logAction(`File changed: ${uri.fsPath}`));
  watcher.onDidDelete(uri => logAction(`File deleted: ${uri.fsPath}`));
  context.subscriptions.push(watcher);

  // Listen to terminal commands (shell integration)
  if (vscode.window.onDidChangeTerminalShellIntegration) {
    vscode.window.onDidChangeTerminalShellIntegration((e: any) => {
      if (e.shellIntegration && e.shellIntegration.commands) {
        for (const cmd of e.shellIntegration.commands) {
          logAction(`Terminal command: ${cmd.commandLine.value}`);
        }
      }
    });
  }

  vscode.window.onDidChangeActiveTextEditor(async (editor) => {
    if (!recording) {
      return;
    }

    const newFile = editor?.document.uri.fsPath;
    if (newFile !== currentFile) {
      await handleFileSwitch(newFile);
    }
  });

  context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(async (event) => {
    if (!recording) {
      return;
    }

    const file = event.document.uri.fsPath;
    if (file !== currentFile) {
      await handleFileSwitch(file);
    }
  }));
}

// This method is called when your extension is deactivated
export function deactivate() { }
