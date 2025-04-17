import * as vscode from 'vscode';

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

  const joined = entries.map((e) => `${e}`).join(' ');
  const msg = `[${new Date().toLocaleTimeString()}] ${joined}`;
  channel.appendLine(msg);
};

export class ChatBuilder {
  private messages: vscode.LanguageModelChatMessage[] = [];
  private model: vscode.LanguageModelChat;

  constructor(model: vscode.LanguageModelChat) {
    this.model = model;
  }

  static async create(): Promise<ChatBuilder | null> {
    const models = await vscode.lm.selectChatModels({
      vendor: 'copilot'
    });

    if (models.length === 0) {
      debugLog("No chat models found");
      return null;
    }

    return new ChatBuilder(models[0]);
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

  async ask(): Promise<string> {
    debugLog("asking AI with", this.messages.length, "messages");
    const response = await this.model.sendRequest(this.messages);

    let content = '';
    for await (const chunk of response.text) {
      content += chunk;
    }

    debugLog("AI response", content);
    this.messages.push(vscode.LanguageModelChatMessage.Assistant(content));

    return content;
  }
}
