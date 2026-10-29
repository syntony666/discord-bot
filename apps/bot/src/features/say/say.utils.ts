/** Slash-command option inputs can't carry real newlines — `\n` sequences become line breaks. */
export function unescapeNewlines(input: string): string {
  return input.replace(/\\n/g, '\n');
}
