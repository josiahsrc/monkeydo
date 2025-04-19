import * as vscode from 'vscode';
import { SubscriptionLike } from 'rxjs';
import { watchIsRecording, watchSnapshots, getIsRecording, getSnapshots, watchIsProcessing, getIsProcessing } from './state';

export class SidebarView implements vscode.WebviewViewProvider {
  private _context: vscode.ExtensionContext;
  private _view?: vscode.WebviewView;
  private _recordingSubscription?: SubscriptionLike;
  private _snapshotsSubscription?: SubscriptionLike;
  private _processingSubscription?: SubscriptionLike;

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
    this._processingSubscription = watchIsProcessing().subscribe(() => {
      this.updateWebview();
    });

    webviewView.onDidDispose(() => {
      this._recordingSubscription?.unsubscribe();
      this._snapshotsSubscription?.unsubscribe();
      this._processingSubscription?.unsubscribe();
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
    const isProcessing = getIsProcessing();

    let headerHtml = '';
    if (isProcessing) {
      headerHtml = `
        <div class="monkeydo-loading">
          <span class="monkeydo-spinner"></span> Processing...
        </div>
      `;
    } else if (isRecording) {
      headerHtml = `
        <button class="monkeydo-btn" id="monkeydo-action-btn">
          Finish Recording
        </button>
      `;
    } else {
      headerHtml = `
        <button class="monkeydo-btn" id="monkeydo-action-btn">
          Start Recording
        </button>
      `;
    }

    let summaryHtml = '';
    if (isRecording && snapshots.length > 0) {
      summaryHtml = `
        <div class="monkeydo-summary-list">
          ${[...snapshots].reverse().map(s => {
        if (s.type === 'fileDiff') {
          const diffLines = s.diff.split('\n').slice(0, 6).map(l =>
            `<div class='monkeydo-diff-line'>${l.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`
          ).join('');
          return `<div class='monkeydo-summary-item'><span class='monkeydo-filename'>${s.file}</span>${diffLines}</div>`;
        } else if (s.type === 'fileAction') {
          return `<div class='monkeydo-summary-item'>
            <span class='monkeydo-filename'>${s.action.charAt(0).toUpperCase() + s.action.slice(1)} ${s.file}</span>
            ${s.oldFile ? `<div class='monkeydo-diff-line'>Old file: ${s.oldFile}</div>` : ''}
          </div>`;
        } else if (s.type === 'terminalCommand') {
          return `<div class='monkeydo-summary-item'>
            <span class='monkeydo-filename'>Terminal Command${s.cwd ? ` (in ${s.cwd})` : ''}</span>
            <div class='monkeydo-diff-line'>${s.command.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
          </div>`;
        }
        return '';
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
      }

      .monkeydo-btn {
        display: block;
        width: 100%;
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

      .monkeydo-header {
        position: sticky;
        top: 0;
        background-color: var(--vscode-sideBar-background);
        z-index: 10;
        padding: 10px 0;
      }

      .monkeydo-summary-list {
        max-height: 100%;
        overflow-x: hidden;
        overflow-y: auto;
        margin-top: 12px;
        margin-bottom: 12px;
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

      .monkeydo-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px;
        color: var(--vscode-descriptionForeground);
        font-size: var(--vscode-font-size);
      }

      .monkeydo-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid var(--vscode-descriptionForeground);
        border-top: 2px solid transparent;
        border-radius: 50%;
        display: inline-block;
        animation: monkeydo-spin 1s linear infinite;
      }

      @keyframes monkeydo-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      </style>

      <div class="monkeydo-header">
        ${headerHtml}
      </div>

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
