import React from 'react';

/**
 * Parses inline markdown: **bold**, *italic*, `code`
 * Rendered purely as React nodes (no innerHTML, zero XSS surface).
 */
function renderInline(text) {
  if (!text) return null;
  // Match tokens: `code`, **bold**, *italic*
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, index) => {
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="rounded bg-[#202020] px-1.5 py-0.5 font-mono text-[11px] text-forge border border-[#292D34]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-[#F5F5F5]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={index} className="italic text-[#A3A3A3]">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

/**
 * Pure React Markdown renderer for AI reviews and structured content.
 * Guarantees untrusted AI model outputs are safely rendered without raw HTML execution.
 */
export function MarkdownRenderer({ content, className = '' }) {
  if (!content || typeof content !== 'string') return null;

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced Code Block
    if (line.trim().startsWith('```')) {
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre
          key={`code-${i}`}
          className="my-2.5 overflow-x-auto rounded-lg border border-[#292D34] bg-[#111111] p-3 font-mono text-xs text-[#F5F5F5]"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      i++;
      continue;
    }

    // Markdown Table Detection (| col | col |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines = [line];
      let j = i + 1;
      while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
        tableLines.push(lines[j]);
        j++;
      }
      if (tableLines.length >= 2 && tableLines[1].includes('-')) {
        const headerCols = tableLines[0]
          .split('|')
          .slice(1, -1)
          .map(c => c.trim());
        const bodyRows = tableLines.slice(2).map(rowLine =>
          rowLine
            .split('|')
            .slice(1, -1)
            .map(c => c.trim())
        );

        elements.push(
          <div key={`table-${i}`} className="my-2.5 overflow-x-auto rounded-lg border border-[#292D34]">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#292D34] bg-[#111111] text-[#737373]">
                <tr>
                  {headerCols.map((col, idx) => (
                    <th key={idx} className="px-3 py-2 font-semibold">
                      {renderInline(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292D34]/50 bg-[#181818]">
                {bodyRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-[#202020] transition-colors">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className="px-3 py-2 text-[#A3A3A3]">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        i = j;
        continue;
      }
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h5 key={`h3-${i}`} className="mt-3 mb-1 font-display text-xs font-bold uppercase tracking-wider text-forge">
          {renderInline(line.slice(4))}
        </h5>
      );
      i++;
      continue;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h4 key={`h2-${i}`} className="mt-3 mb-1.5 font-display text-sm font-bold text-[#F5F5F5]">
          {renderInline(line.slice(3))}
        </h4>
      );
      i++;
      continue;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h3 key={`h1-${i}`} className="mt-3.5 mb-2 font-display text-base font-bold text-[#F5F5F5]">
          {renderInline(line.slice(2))}
        </h3>
      );
      i++;
      continue;
    }

    // Bullet Lists (- or *)
    if (/^\s*[-*]\s+/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-2 list-disc pl-5 space-y-1 text-xs text-[#A3A3A3]">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered Lists (1. 2.)
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-2 list-decimal pl-5 space-y-1 text-xs text-[#A3A3A3]">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Blockquotes (> )
    if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-2 rounded-r border-l-2 border-forge bg-[#111111] py-1.5 px-3 text-xs italic text-[#A3A3A3]"
        >
          {renderInline(line.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Empty Lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // Regular Paragraph
    elements.push(
      <p key={`p-${i}`} className="my-1.5 text-xs leading-relaxed text-[#A3A3A3]">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}

