/**
 * Remark plugin: converts [N] patterns in text to citation links.
 * Example: "Liverpool won 3-1 [1]" → "Liverpool won 3-1 <a href="#citation-1">1</a>"
 * The `a` component in markdown-text.tsx renders these as styled badges.
 */

import { visit } from 'unist-util-visit';
import type { Root, Text, Link, PhrasingContent } from 'mdast';

const CITATION_REGEX = /\[(\d+)\]/g;

export function remarkCitations() {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: any) => {
      if (index === undefined || !parent) return;
      if (!CITATION_REGEX.test(node.value)) return;

      // Reset regex state
      CITATION_REGEX.lastIndex = 0;

      const children: PhrasingContent[] = [];
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = CITATION_REGEX.exec(node.value)) !== null) {
        // Text before citation
        if (match.index > lastIndex) {
          children.push({ type: 'text', value: node.value.slice(lastIndex, match.index) });
        }

        // Citation as link node → rendered by custom `a` component
        const citationLink: Link = {
          type: 'link',
          url: `#citation-${match[1]}`,
          children: [{ type: 'text', value: match[1] }],
        };
        children.push(citationLink);

        lastIndex = match.index + match[0].length;
      }

      // Remaining text
      if (lastIndex < node.value.length) {
        children.push({ type: 'text', value: node.value.slice(lastIndex) });
      }

      // Replace original text node with new children
      parent.children.splice(index, 1, ...children);
    });
  };
}
