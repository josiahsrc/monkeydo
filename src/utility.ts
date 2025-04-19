import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Document } from './types';

let channel: vscode.OutputChannel | null = null;

export const getContentBeforeChange = (event: vscode.TextDocumentChangeEvent): string => {
  const document = event.document;
  const changes = event.contentChanges;

  if (changes.length === 0) {
    return document.getText();
  }

  // Apply the changes to get the content after the change
  let currentContent = document.getText();
  for (const change of changes) {
    const before = currentContent.slice(0, change.rangeOffset);
    const after = currentContent.slice(change.rangeOffset + change.rangeLength);
    currentContent = before + change.text + after;
  }

  return currentContent;
};

export const debugLog = (...entries: unknown[]) => {
  if (!channel) {
    channel = vscode.window.createOutputChannel('MonkeyDo');
  }

  const fmt = (entry: unknown): string => {
    if (typeof entry === 'string') {
      return entry;
    } else if (typeof entry === 'object') {
      try {
        return JSON.stringify(entry, null, 2);
      } catch (e) {
        return `${entry}`;
      }
    } else {
      return `${entry}`;
    }
  }

  const joined = entries.map(fmt).join(' ');
  const msg = `[${new Date().toLocaleTimeString()}] ${joined}`;
  channel.appendLine(msg);
};

const getChatModel = async (): Promise<vscode.LanguageModelChat | null> => {
  const models = await vscode.lm.selectChatModels({
    vendor: 'copilot',
  });

  if (models.length === 0) {
    debugLog("No chat models found");
    return null;
  }

  const model = models[0];
  debugLog("Selected chat model:", model.id);
  return model;
};

export type ToolInput<Input> = { input: Input, name: string };

export class ChatBuilder {
  private messages: vscode.LanguageModelChatMessage[] = [];
  private model: vscode.LanguageModelChat;

  constructor(model: vscode.LanguageModelChat) {
    this.model = model;
  }

  static async create(): Promise<ChatBuilder | null> {
    const model = await getChatModel();
    if (!model) {
      debugLog("No chat models found");
      return null;
    }

    return new ChatBuilder(model);
  }

  clear(): this {
    debugLog("clearing chat messages");
    this.messages = [];
    return this;
  }

  push(message: string): this {
    this.messages.push(vscode.LanguageModelChatMessage.User(message.trim()));
    debugLog("pushing message", message);
    return this;
  }

  async ask(token?: vscode.CancellationToken): Promise<string> {
    debugLog("asking AI with", this.messages.length, "messages");
    const response = await this.model.sendRequest(this.messages, {}, token);

    let content = '';
    for await (const chunk of response.text) {
      content += chunk;
    }

    debugLog("AI response", content);
    this.messages.push(vscode.LanguageModelChatMessage.Assistant(content));

    return content;
  }

  async askWithTools<T>(args: {
    token?: vscode.CancellationToken;
    tools: vscode.LanguageModelChatTool[];
    handle: (args: ToolInput<T>) => Promise<void>;
  }): Promise<void> {
    debugLog("asking AI with tools", this.messages.length, "messages");
    const response = await this.model.sendRequest(this.messages, {
      tools: args.tools,
      toolMode: vscode.LanguageModelChatToolMode.Auto,
    }, args.token);

    for await (const part of response.stream) {
      if (!(part instanceof vscode.LanguageModelToolCallPart)) {
        continue;
      }

      await args.handle({
        input: part.input as T,
        name: part.name,
      });
    }
  }
}

export const getWorkspaceFolder = (): string | null => {
  const wsFolder = vscode.workspace.workspaceFolders?.[0];
  if (!wsFolder) {
    debugLog("No workspace folder found");
    return null;
  }

  return wsFolder.uri.fsPath;
};

export const getMonkeyDoFolder = (): string | null => {
  const wsFolder = getWorkspaceFolder();
  if (!wsFolder) {
    return null;
  }

  return path.join(wsFolder, '.monkeydo');
};

export const convertToWorkspaceRelativePath = (filePath: string): string => {
  const wsFolder = getWorkspaceFolder();
  if (!wsFolder) {
    return filePath;
  }

  const relativePath = path.relative(wsFolder, filePath);
  if (relativePath.startsWith('..')) {
    debugLog("File is outside the workspace folder:", filePath);
    return filePath;
  }

  return relativePath;
};

export const convertToAbsolutePath = (filePath: string): string => {
  const wsFolder = getWorkspaceFolder();
  if (!wsFolder) {
    return filePath;
  }

  const absolutePath = path.join(wsFolder, filePath);
  return absolutePath;
};

export const readDocumentsInFolder = (folder: string, opts: { extensions?: string[] } = {}): Document[] => {
  const { extensions } = opts;
  const extSet = new Set(extensions || []);

  if (!fs.existsSync(folder)) {
    debugLog("Folder does not exist:", folder);
    return [];
  }

  const files = fs.readdirSync(folder);

  const docs: Document[] = [];
  for (const file of files) {
    const filePath = path.join(folder, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile() && extSet.has(path.extname(file))) {
      const content = fs.readFileSync(filePath, 'utf-8');
      docs.push({ path: filePath, filename: file, content });
    }
  }

  return docs;
};

export const buildModelToolResult = (values: string[]): vscode.LanguageModelToolResult => {
  const parts = values.map((value) => new vscode.LanguageModelTextPart(value));
  return new vscode.LanguageModelToolResult(parts);
};

export const clipMaxLines = (text: string, maxLines: number): string => {
  const lines = text.split('\n');
  if (lines.length <= maxLines) {
    return text;
  }

  // Only return the first maxLines lines, no ellipsis
  return lines.slice(0, maxLines).join('\n');
};
