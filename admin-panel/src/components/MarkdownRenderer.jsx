import React from 'react';

/**
 * Complete, secure Markdown Renderer for Legal Policies, Terms & System Documentation
 * Converts standard Markdown into semantic HTML with elegant, responsive typography.
 */
export function parseMarkdownToHtml(markdownText) {
  if (!markdownText || typeof markdownText !== 'string') {
    return '<p class="md-empty">No content provided.</p>';
  }

  // 1. Normalize line endings & protect against XSS
  let text = markdownText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Horizontal Rules (---, ***, ___)
  text = text.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr class="md-hr" />');

  // 3. Headings (# H1 to #### H4)
  text = text.replace(/^####\s+(.*$)/gm, '<h4 class="md-h4">$1</h4>');
  text = text.replace(/^###\s+(.*$)/gm, '<h3 class="md-h3">$1</h3>');
  text = text.replace(/^##\s+(.*$)/gm, '<h2 class="md-h2">$1</h2>');
  text = text.replace(/^#\s+(.*$)/gm, '<h1 class="md-h1">$1</h1>');

  // 4. Blockquotes (> Quote)
  text = text.replace(/^>\s+(.*$)/gm, '<blockquote class="md-blockquote">$1</blockquote>');

  // 5. Bold & Italic
  text = text.replace(/\*\*\*(.*?)\*\*\*/gm, '<strong><em>$1</em></strong>');
  text = text.replace(/\*\*(.*?)\*\*/gm, '<strong class="md-bold">$1</strong>');
  text = text.replace(/__(.*?)__/gm, '<strong class="md-bold">$1</strong>');
  text = text.replace(/\*(.*?)\*/gm, '<em>$1</em>');
  text = text.replace(/_(.*?)_/gm, '<em>$1</em>');

  // 6. Strikethrough (~~text~~)
  text = text.replace(/~~(.*?)~~/gm, '<del>$1</del>');

  // 7. Inline Code (`code`)
  text = text.replace(/`([^`]+)`/gm, '<code class="md-inline-code">$1</code>');

  // 8. Hyperlinks [Text](URL)
  text = text.replace(
    /\[(.*?)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/gm,
    '<a href="$2" class="md-link" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // 9. Unordered Lists (* or - )
  text = text.replace(/^[\*\-]\s+(.*$)/gm, '<li class="md-list-item">$1</li>');

  // Group consecutive <li> into a single <ul>
  text = text.replace(/(<li class="md-list-item">.*<\/li>\n?)+/gm, (match) => {
    return `<ul class="md-list">\n${match}</ul>\n`;
  });

  // 10. Ordered Lists (1. )
  text = text.replace(/^\d+\.\s+(.*$)/gm, '<li class="md-ordered-item">$1</li>');
  text = text.replace(/(<li class="md-ordered-item">.*<\/li>\n?)+/gm, (match) => {
    return `<ol class="md-ordered-list">\n${match}</ol>\n`;
  });

  // 11. Paragraphs
  const paragraphs = text.split(/\n\n+/);
  const formattedParagraphs = paragraphs.map((block) => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    // Skip wrapping if it's already a block element
    if (
      trimmed.startsWith('<h1') ||
      trimmed.startsWith('<h2') ||
      trimmed.startsWith('<h3') ||
      trimmed.startsWith('<h4') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<ol') ||
      trimmed.startsWith('<blockquote') ||
      trimmed.startsWith('<hr')
    ) {
      return trimmed;
    }
    // Replace single line breaks inside a paragraph with <br />
    const withBreaks = trimmed.replace(/\n/g, '<br />');
    return `<p class="md-p">${withBreaks}</p>`;
  });

  return formattedParagraphs.filter(Boolean).join('\n\n');
}

export default function MarkdownRenderer({ content, className = '' }) {
  const html = React.useMemo(() => parseMarkdownToHtml(content), [content]);

  return (
    <div
      className={`markdown-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
