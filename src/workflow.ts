import { setProgress } from "./state";
import { Snapshot } from "./types";
import { ChatBuilder, debugLog } from './utility';

type BuildWorkflowDocumentArgs = {
  snapshots: Snapshot[];
}

type BuildWorkflowDocumentResult = {
  content: string;
  filename: string;
}

export const buildWorkflowDocument = async ({ snapshots }: BuildWorkflowDocumentArgs): Promise<BuildWorkflowDocumentResult | null> => {
  if (snapshots.length === 0) {
    return null;
  }

  const chat = await ChatBuilder.create();
  if (!chat) {
    return null;
  }

  chat.push(`
You are learning how things are done at your new job. Your task
is to summarize diffs in a way that would help you accomplish similar
tasks in the future. You are not a code reviewer, so you should not
focus on code quality or correctness. You should focus on the
intent of the change and how it was accomplished. Your answers
are short and to the point.
  `);

  const sections: string[] = [];
  for (let i = 0; i < snapshots.length; i++) {
    const snapshot = snapshots[i];
    setProgress(i / snapshots.length);

    debugLog("asking why the user changed this", snapshot);
    if (snapshot.type === 'fileDiff') {
      chat.push(`
        Why did the user change this file next?
        File: ${snapshot.file}
        Diff:
        ${snapshot.diff}
      `);
    } else if (snapshot.type === 'terminalCommand') {
      chat.push(`
        Why did the user run this command next?
        Command: ${snapshot.command}
        CWD: ${snapshot.cwd ?? ''}
      `);
    } else {
      chat.push(`
        Why did the user ${snapshot.action} this file next?
        File: ${snapshot.file}
        Old file: ${snapshot.oldFile ?? ''}
      `);
    }

    const reasonForChange = await chat.ask();
    if (!reasonForChange) {
      return null;
    }

    if (snapshot.type === 'fileDiff') {
      sections.push(`
## ${snapshot.file}

${reasonForChange}

\`\`\`diff
${snapshot.diff}
\`\`\`
`);
    } else if (snapshot.type === 'terminalCommand') {
      sections.push(`
## Terminal Command

${reasonForChange}

\`\`\`
${snapshot.command}
\`\`\`
`);
    } else {
      sections.push(`
## ${snapshot.action.charAt(0).toUpperCase() + snapshot.action.slice(1)} ${snapshot.file}

${reasonForChange}
`);
    }
  }

  const summary = await chat.push(`In summary, what did all these changes accomplish? Why did they do all this? Your answer should be in the form of a single paragraph.`).ask();
  debugLog("purpose", summary);
  if (!summary) {
    return null;
  }

  const document = `
${summary}

## How they did it

${sections.join('\n---\n')}
  `;

  const content = document.trim();

  const nameBuilder = await ChatBuilder.create();
  if (!nameBuilder) {
    return null;
  }

  nameBuilder.push(`
    What would be a good name for this document? Use the markdown file form. E.g. how_to_do_something.md. Make sure to label the file as "how to do x"

    ${summary}
  `);

  let suggestedName = '';
  await nameBuilder.askWithTools({
    token: undefined,
    tools: [
      {
        name: 'file_name',
        description: 'Return the name of the file that best satisfies the user request.',
        inputSchema: {
          type: 'object',
          properties: {
            fileName: {
              type: 'string',
              description: 'Your recommendation of a name for the file that should be used',
              default: ''
            }
          },
          required: ['fileName']
        }
      },
    ],
    handle: async ({ input, name }) => {
      if (name !== 'file_name') {
        debugLog("BuildWorkflow: Unknown tool name", name);
        return;
      }

      const value = input as { fileName: string };
      if (!value.fileName) {
        debugLog("BuildWorkflow: No file name found in the input");
        return;
      }

      suggestedName = value.fileName;
      debugLog("BuildWorkflow: Handler called with file name", value.fileName);
    },
  });

  const fallbackFileName = `monkeydo-actions-${Date.now()}.md`;
  const filename: string = suggestedName?.trim() || fallbackFileName;

  setProgress(1);
  return {
    content,
    filename,
  };
};
