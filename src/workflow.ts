import { Snapshot } from "./types";
import { invokeAI } from './utility';

type BuildWorkflowContentArgs = {
  snapshots: Snapshot[];
}

export const buildWorkflowContent = async ({ snapshots }: BuildWorkflowContentArgs): Promise<string | null> => {
  if (snapshots.length === 0) {
    return null;
  }

  const diffText = snapshots.map((e) => e.diff).join('\n');
  const prompt = `Summarize the following code diff:\n\n${diffText}`;

  const response = invokeAI(prompt);
  if (!response) {
    return null;
  }

  return response;
};
