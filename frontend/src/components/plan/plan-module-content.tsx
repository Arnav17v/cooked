"use client";

import type { ReactNode } from "react";

function inlineFormat(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="plan-note-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s\-:|]+\|/.test(line.trim()) && line.includes("-");
}

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function renderTable(lines: string[], startKey: number): { node: ReactNode; consumed: number } {
  const headerCells = parseTableRow(lines[0]);
  const bodyLines = lines.slice(2);
  return {
    node: (
      <div key={startKey} className="plan-note-table-wrap">
        <table className="plan-note-table">
          <thead>
            <tr>
              {headerCells.map((cell, i) => (
                <th key={i}>{inlineFormat(cell)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyLines.map((row, ri) => {
              const cells = parseTableRow(row);
              return (
                <tr key={ri}>
                  {cells.map((cell, ci) => (
                    <td key={ci}>{inlineFormat(cell)}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    ),
    consumed: 2 + bodyLines.length,
  };
}

function renderNoteLine(line: string, key: number): ReactNode {
  const trimmed = line.trimEnd();
  if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) {
    return (
      <h3 key={key} className="plan-note-h1">
        {inlineFormat(trimmed.slice(2))}
      </h3>
    );
  }
  if (trimmed.startsWith("## ")) {
    return (
      <h4 key={key} className="plan-note-h2">
        {inlineFormat(trimmed.slice(3))}
      </h4>
    );
  }
  if (trimmed.startsWith("### ")) {
    return (
      <h5 key={key} className="plan-note-h3">
        {inlineFormat(trimmed.slice(4))}
      </h5>
    );
  }
  if (trimmed.startsWith("- ")) {
    return (
      <p key={key} className="plan-note-bullet">
        {inlineFormat(trimmed.slice(2))}
      </p>
    );
  }
  const ordered = trimmed.match(/^(\d+)\.\s+(.*)$/);
  if (ordered) {
    return (
      <p key={key} className="plan-note-ordered">
        <span className="plan-note-ordered-num">{ordered[1]}.</span>
        {inlineFormat(ordered[2])}
      </p>
    );
  }
  const quote = trimmed.match(/^>\s*(.*)$/);
  if (quote) {
    return (
      <blockquote key={key} className="plan-note-admonition">
        {inlineFormat(quote[1])}
      </blockquote>
    );
  }
  if (trimmed.startsWith("```")) {
    return null;
  }
  if (!trimmed) {
    return <div key={key} className="plan-note-spacer" aria-hidden />;
  }
  return (
    <p key={key} className="plan-note-line">
      {inlineFormat(trimmed)}
    </p>
  );
}

export function PlanModuleContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      i += 1;
      elements.push(
        <pre key={key++} className="plan-note-pre">
          <code>{codeLines.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    if (trimmed.includes("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const tableLines = [lines[i]];
      let j = i + 1;
      while (j < lines.length && lines[j].trim().includes("|")) {
        tableLines.push(lines[j]);
        j += 1;
      }
      const { node, consumed } = renderTable(tableLines, key++);
      elements.push(node);
      i += consumed;
      continue;
    }

    const rendered = renderNoteLine(line, key++);
    if (rendered) elements.push(rendered);
    i += 1;
  }

  return <div className="plan-module-content plan-module-content--rich">{elements}</div>;
}

export function moduleKindLabel(kind: string): string {
  if (kind === "task") return "Task";
  if (kind === "quiz") return "Quiz";
  return "Notes";
}
