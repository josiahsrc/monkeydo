import * as vscode from 'vscode';
import { watchIsRecording, getIsRecording } from './recording';

export class Sidebar implements vscode.WebviewViewProvider {
  private _context: vscode.ExtensionContext;
  private _view?: vscode.WebviewView;
  private _recordingSubscription?: { unsubscribe(): void };

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true
    };

    this.updateWebview();
    this._recordingSubscription = watchIsRecording().subscribe(isRecording => {
      this.updateWebview();
    });

    webviewView.onDidDispose(() => {
      this._recordingSubscription?.unsubscribe();
    });

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'start') {
        await vscode.commands.executeCommand('monkeydo.startRecording');
      } else if (message.command === 'stop') {
        await vscode.commands.executeCommand('monkeydo.stopRecording');
      }
    });
  }

  private updateWebview() {
    if (this._view) {
      this._view.webview.html = this.getHtmlForWebview();
    }
  }

  private getHtmlForWebview(): string {
    const isRecording = getIsRecording();

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
      <button class="monkeydo-btn" id="monkeydo-action-btn">
        ${isRecording ? 'Finish Recording' : 'Start Recording'}
      </button>
      <script>
        const vscode = acquireVsCodeApi();
        let isRecording = ${isRecording};
        const btn = document.getElementById('monkeydo-action-btn');
        btn.addEventListener('click', () => {
          vscode.postMessage({ command: isRecording ? 'stop' : 'start' });
        });
      </script>
    `;
  }
}