/**
 * Returns JSON text that is safe as the content of a `<script type="application/json">` element and parses to the same
 * value. In valid JSON, `<` occurs only inside a string, where its escape is equivalent, so escaping it means that the
 * content can neither close the element nor open a comment.
 */
export function embedJson(json: string): string {
  return json.replaceAll('<', String.raw`\u003c`);
}
