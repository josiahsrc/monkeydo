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

export const invokeAI = async (prompt: string): Promise<string | null> => {
  const models = await vscode.lm.selectChatModels({
    vendor: 'copilot'
  });

  debugLog("selected models", models);
  if (models.length === 0) {
    return null;
  }

  const model = models[0];
  const messages = [vscode.LanguageModelChatMessage.User(prompt)];
  const response = await model.sendRequest(messages);

  let content = '';
  for await (const chunk of response.text) {
    content += chunk;
  }

  debugLog("AI response", content);
  return content;
};
