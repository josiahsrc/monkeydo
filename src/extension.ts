// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE = path.join(vscode.workspace.workspaceFolders?.[0].uri.fsPath || '', 'monkeydo-actions.log');

function logAction(action: string) {
  // Prevent logging actions on the log file itself
  if (action.includes('monkeydo-actions.log')) {
    return;
  }
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${action}\n`;
  fs.appendFile(LOG_FILE, entry, err => {
    if (err) {
      console.error('Failed to write action log:', err);
    }
  });
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "monkeydo" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  const disposable = vscode.commands.registerCommand('monkeydo.helloWorld', () => {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    vscode.window.showInformationMessage('Hello World from Monkey Do!');
  });

  context.subscriptions.push(disposable);

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

  // Listen for text document changes (captures per-keystroke edits as grouped by VS Code)
  const textChangeDisposable = vscode.workspace.onDidChangeTextDocument(event => {
    const file = event.document.uri.fsPath;
    if (file.endsWith('monkeydo-actions.log')) { return; } // Ignore log file
    for (const change of event.contentChanges) {
      const changeType = change.text.length === 0 ? 'deletion' : (change.rangeLength === 0 ? 'insertion' : 'edit');
      logAction(`Text ${changeType} in ${file} at [${change.range.start.line},${change.range.start.character}] - [${change.range.end.line},${change.range.end.character}]: '${change.text.replace(/\n/g, '\\n')}'`);
    }
  });
  context.subscriptions.push(textChangeDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
