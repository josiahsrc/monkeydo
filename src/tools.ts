import * as vscode from 'vscode';
import * as fs from 'fs';
import { buildModelToolResult, ChatBuilder, clipMaxLines, convertToAbsolutePath, convertToWorkspaceRelativePath, debugLog, getMonkeyDoFolder, readDocumentsInFolder } from './utility';

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
      chat.push('Which workflow file should the user use to accomplish this task?');
      for (const doc of docs) {
        chat.push(`
          Workflow file: ${convertToWorkspaceRelativePath(doc.path)}
          Content:
          ${clipMaxLines(doc.content, 2)}
        `);
      }

      const filepaths = docs.map(doc => convertToWorkspaceRelativePath(doc.path));
      chat.push('Output the path of the file you want to use. Your options are:');
      chat.push(`\`\`\`json\n${JSON.stringify(filepaths, null, 2)}\n\`\`\``);

      let fileToUse: string | null = null;
      await chat.askWithTools({
        token,
        tools: [
          {
            name: 'choose_file',
            description: 'Return the path of the workspace file that best satisfies the user request.',
            inputSchema: {
              type: 'object',
              properties: {
                filePath: {
                  type: 'string',
                  description: 'The path to the file that should be used',
                  default: ''
                }
              },
              required: ['filePath']
            }
          },
        ],
        handle: async ({ input, name }) => {
          if (name !== 'choose_file') {
            debugLog("FindWorkflowTool: Unknown tool name", name);
            return;
          }

          const value = input as { filePath: string };
          if (!value.filePath) {
            debugLog("FindWorkflowTool: No file path found in the input");
            return;
          }

          fileToUse = convertToAbsolutePath(value.filePath);
          debugLog("FindWorkflowTool: Handler called with file path", value.filePath);
        },
      });

      debugLog("FindWorkflowTool: File to use:", fileToUse);
      if (!fileToUse) {
        debugLog("FindWorkflowTool: No file to use found");
        resolve(buildModelToolResult(["Error: No workflow file found that would satisfy the user's request. The user must record a workflow."]));
        return;
      }

      let fileContent: string | null = null;
      try {
        fileContent = fs.readFileSync(fileToUse, 'utf-8');
      } catch (err) {
        debugLog("FindWorkflowTool: Error reading file", fileToUse, err);
        resolve(buildModelToolResult([`Error: Could not read the workflow file in ${fileToUse}.`]));
        return;
      }

      if (!fileContent) {
        debugLog("FindWorkflowTool: No content found in the file", fileToUse);
        resolve(buildModelToolResult([`Error: The workflow file in ${fileToUse} is empty.`]));
        return;
      }

      debugLog("FindWorkflowTool read file:", clipMaxLines(fileContent, 2));
      resolve(buildModelToolResult([
        "Use this workflow to accomplish the task:",
        `\`\`\`markdown`,
        fileContent,
        `\`\`\``,
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
