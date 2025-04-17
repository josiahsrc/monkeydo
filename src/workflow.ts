import { Snapshot } from "./types";

type BuildWorkflowContentArgs = {
  snapshots: Snapshot[];
}

export const buildWorkflowContent = async ({ snapshots }: BuildWorkflowContentArgs): Promise<string | null> => {
  if (snapshots.length === 0) {
    return null;
  }

  return snapshots.map((e) => e.diff).join('\n');
};
