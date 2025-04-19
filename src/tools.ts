import * as vscode from 'vscode';
import { buildModelToolResult, ChatBuilder, clipMaxLines, convertToWorkspaceRelativePath, debugLog, getMonkeyDoFolder, readDocumentsInFolder } from './utility';

type FindWorkflowToolArgs = {
  task: string;
}

export class FindWorkflowTool implements vscode.LanguageModelTool<FindWorkflowToolArgs> {
  invoke(
    options: vscode.LanguageModelToolInvocationOptions<FindWorkflowToolArgs>,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.LanguageModelToolResult> {
    debugLog("FindWorkflowTool invoked with options:", JSON.stringify(options.input));
    return new Promise(async (resolve) => {
      const folder = getMonkeyDoFolder();
      if (!folder) {
        debugLog("FindWorkflowTool: No monkeydo folder found");
        resolve(buildModelToolResult(['Error: No workflows found in the .monkeydo folder. The user must let the monkey see before the monkey can do. Use the MonkeyDo sidebar UI to create a workflow.']));
        return;
      }

      const chat = await ChatBuilder.create();
      if (!chat) {
        debugLog("FindWorkflowTool: No chat model found");
        resolve(buildModelToolResult(['Error: The monkey does not have any models to work with.']));
        return;
      }

      const docs = readDocumentsInFolder(folder, { extensions: ['.md'] });
      if (docs.length === 0) {
        debugLog("FindWorkflowTool: No workflow markdown files found");
        resolve(buildModelToolResult(['Error: No workflows found in the .monkeydo folder. The user must let the monkey see before the monkey can do. Use the MonkeyDo sidebar UI to create a workflow.']));
        return;
      }

      if (token.isCancellationRequested) {
        resolve(buildModelToolResult(['Error: The user cancelled the request.']));
        return;
      }

      chat.push(`The user wants to accomplish the following task: ${options.input.task}`);
      chat.push('Which workflow file should the user use to accomplish this task? Output the name of the workflow file you would use and why.');
      for (const doc of docs) {
        chat.push(`
          Workflow file: ${convertToWorkspaceRelativePath(doc.path)}
          Content:
          ${clipMaxLines(doc.content, 5)}
        `);
      }

      const result = await chat.ask(token);
      if (!result) {
        resolve(buildModelToolResult(['Error: The monkey does not have any models to work with.']));
        return;
      }

      debugLog("FindWorkflowTool result:", result);
      resolve(buildModelToolResult([
        result,
        "Add this workflow to your context and get to work",
      ]));
    });
  }

  prepareInvocation?(
    options: vscode.LanguageModelToolInvocationPrepareOptions<FindWorkflowToolArgs>,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.PreparedToolInvocation> {
    return {};
  }
}
