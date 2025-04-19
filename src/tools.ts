import * as vscode from 'vscode';
import { debugLog } from './utility';

type GetTutorialToolArgs = {
  task: string;
}

export class GetTutorialTool implements vscode.LanguageModelTool<GetTutorialToolArgs> {
  invoke(
    options: vscode.LanguageModelToolInvocationOptions<GetTutorialToolArgs>,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.LanguageModelToolResult> {
    debugLog("GetTutorialTool invoked with options:", JSON.stringify(options.input));
    throw new Error('Method not implemented.');
  }

  prepareInvocation?(
    options: vscode.LanguageModelToolInvocationPrepareOptions<GetTutorialToolArgs>,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
    debugLog("GetTutorialTool prepareInvocation with options:", JSON.stringify(options));
    throw new Error('Method not implemented.');
  }
}
