import * as vscode from 'vscode';
import { watchIsRecording, getIsRecording, getSnapshots, watchSnapshots } from './recording';
import { SubscriptionLike } from 'rxjs';

export class Sidebar implements vscode.WebviewViewProvider {
  private _context: vscode.ExtensionContext;
  private _view?: vscode.WebviewView;
  private _recordingSubscription?: SubscriptionLike;
  private _snapshotsSubscription?: SubscriptionLike;

  constructor(context: vscode.ExtensionContext) {
    this._context = context;
  }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true
    };

    this.updateWebview();
    this._recordingSubscription = watchIsRecording().subscribe(() => {
      this.updateWebview();
    });
    this._snapshotsSubscription = watchSnapshots().subscribe(() => {
      this.updateWebview();
    });

    webviewView.onDidDispose(() => {
      this._recordingSubscription?.unsubscribe();
      this._snapshotsSubscription?.unsubscribe();
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
    const snapshots = getSnapshots();

    let summaryHtml = '';
    if (isRecording && snapshots.length > 0) {
      summaryHtml = `
        <div class="monkeydo-summary-list">
          ${[...snapshots].reverse().map(s => {
        const diffLines = s.diff.split('\n').slice(0, 6).map(l =>
          `<div class='monkeydo-diff-line'>${l.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
        ).join('');
        return `<div class='monkeydo-summary-item'><span class='monkeydo-filename'>${s.file}</span>${diffLines}</div>`;
      }).join('')}
        </div>
      `;
    }

    return `
      <style>
        :root {
          color-scheme: light dark;
        }

        body {
          color: var(--vscode-foreground);
          background-color: var(--vscode-sideBar-background);
          font-family: var(--vscode-font-family);
          font-size: var(--vscode-font-size);
          margin: 0;
          padding: 10px;
        }

        .monkeydo-btn {
          display: block;
          width: 100%;
          margin: 8px 0;
          padding: 8px;
          font-size: var(--vscode-font-size);
          font-family: var(--vscode-font-family);
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .monkeydo-btn:hover {
          background: var(--vscode-button-hoverBackground);
        }

        .monkeydo-summary-list {
          max-height: 100%;
          overflow-y: auto;
          margin-top: 12px;
          background: var(--vscode-editor-background);
          border-radius: 6px;
          padding: 8px;
        }

        .monkeydo-summary-item {
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--vscode-editorWidget-border);
        }

        .monkeydo-summary-item:last-child {
          border-bottom: none;
        }

        .monkeydo-filename {
          font-weight: bold;
          color: var(--vscode-textLink-foreground);
          display: block;
          margin-bottom: 2px;
        }

        .monkeydo-diff-line {
          font-family: var(--vscode-editor-font-family, monospace);
          font-size: var(--vscode-editor-font-size, 13px);
          white-space: pre;
          color: var(--vscode-editor-foreground);
        }
      </style>

      <button class="monkeydo-btn" id="monkeydo-action-btn">
        ${isRecording ? 'Finish Recording' : 'Start Recording'}
      </button>

      ${summaryHtml}

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
