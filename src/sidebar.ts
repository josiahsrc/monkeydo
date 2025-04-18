import * as vscode from 'vscode';

export class Sidebar implements vscode.WebviewViewProvider {
  private _context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true
    };
    webviewView.webview.html = this.getHtmlForWebview();
    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'start') {
        await vscode.commands.executeCommand('monkeydo.startRecording');
      } else if (message.command === 'stop') {
        await vscode.commands.executeCommand('monkeydo.stopRecording');
      }
    });
  }

  getHtmlForWebview(): string {
    return `
      <style>
        .monkeydo-btn {
          display: block;
          width: 100%;
          margin: 8px 0;
          padding: 8px;
          font-size: 16px;
          background: #ffd600;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
      </style>
      <button class="monkeydo-btn" onclick="vscode.postMessage({ command: 'start' })">Start Recording</button>
      <button class="monkeydo-btn" onclick="vscode.postMessage({ command: 'stop' })">Stop Recording</button>
      <script>
        const vscode = acquireVsCodeApi();
        document.querySelectorAll('.monkeydo-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const command = e.target.textContent.toLowerCase().includes('start') ? 'start' : 'stop';
            vscode.postMessage({ command });
          });
        });
      </script>
    `;
  }
}