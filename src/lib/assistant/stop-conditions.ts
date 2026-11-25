/**
 * Stop streaming right after a step that already wrote prose AND emitted one
 * or more successful `navigate` cards. Checking the latest step (rather than
 * only `steps[0]`) prevents models from repeating their entire answer in step 3
 * after doing a data-lookup in step 1 and prose + `navigate` in step 2.
 */
export function shouldStopAfterNavigate({
  steps,
}: {
  steps: ReadonlyArray<{
    text: string;
    toolCalls: ReadonlyArray<{ toolName: string }>;
    toolResults: ReadonlyArray<{ output?: unknown }>;
  }>;
}): boolean {
  const last = steps[steps.length - 1];
  if (!last || last.text.trim().length === 0) return false;
  return (
    last.toolCalls.length > 0 &&
    last.toolCalls.every((c) => c.toolName === "navigate") &&
    last.toolResults.length > 0 &&
    last.toolResults.every(
      (r) => (r.output as { ok?: boolean } | undefined)?.ok === true,
    )
  );
}
