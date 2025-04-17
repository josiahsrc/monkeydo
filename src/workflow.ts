import { Snapshot } from "./types";
import { ChatBuilder, debugLog } from './utility';

type BuildWorkflowContentArgs = {
  snapshots: Snapshot[];
}

export const buildWorkflowContent = async ({ snapshots }: BuildWorkflowContentArgs): Promise<string | null> => {
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
intent of the change and how it was accomplished.
  `);

  const sections: string[] = [];
  for (const snapshot of snapshots) {
    debugLog("asking why the user changed this", snapshot.file);
    chat.push(`
Why did they make these changes next?
File: ${snapshot.file}
Diff:
${snapshot.diff}
    `);

    const reasonForChange = await chat.ask();
    if (!reasonForChange) {
      return null;
    }

    sections.push(`
## ${snapshot.file}

${reasonForChange}

\`\`\`diff
${snapshot.diff}
\`\`\`
    `);
  }

  const summary = await chat.push(`In summary, what did all these changes accomplish? Why did they do all this?`).ask();
  debugLog("purpose", summary);
  if (!summary) {
    return null;
  }

  const document = `
${summary}

## How they did it

${sections.join('\n---\n')}
  `;

  return document.trim();
};
