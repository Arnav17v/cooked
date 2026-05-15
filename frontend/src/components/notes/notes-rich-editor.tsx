"use client";

import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import DOMPurify, { type Config } from "dompurify";
import {
  Bold,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link2,
  List,
  Redo2,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";

export const NOTES_HTML_PURIFY: Config = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "strike",
    "s",
    "h1",
    "h2",
    "h3",
    "h4",
    "ul",
    "ol",
    "li",
    "code",
    "pre",
    "blockquote",
    "a",
    "mark",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
};

export function sanitizeNotesHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return String(DOMPurify.sanitize(html, NOTES_HTML_PURIFY));
}

function escapeHtmlText(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escape HTML, then `==highlight==` → `<mark>`, `**bold**` → `<strong>`. */
function lineWithRichInlinesToHtml(line: string): string {
  const esc = escapeHtmlText(line);
  return esc
    .replace(/==([^=\n]+)==/g, "<mark>$1</mark>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
}

/** Plain notes → HTML: blank lines → empty `<p>`, `##` / `###` line headings, body lines → `<p>`. */
export function plainNotesToHtml(text: string): string {
  const lines = text.split(/\r?\n/);
  const chunks: string[] = [];
  for (const line of lines) {
    if (line === "") {
      chunks.push("<p><br></p>");
      continue;
    }
    const h2m = line.match(/^##\s+(.+)$/);
    if (h2m) {
      chunks.push(`<h2>${lineWithRichInlinesToHtml(h2m[1].trim())}</h2>`);
      continue;
    }
    const h3m = line.match(/^###\s+(.+)$/);
    if (h3m) {
      chunks.push(`<h3>${lineWithRichInlinesToHtml(h3m[1].trim())}</h3>`);
      continue;
    }
    chunks.push(`<p>${lineWithRichInlinesToHtml(line)}</p>`);
  }
  return chunks.join("");
}

export function contentLooksLikeNotesHtml(s: string): boolean {
  const t = s.trim();
  if (!t || !t.startsWith("<")) return false;
  return /<\s*(p|h[1-6]|div|ul|ol|blockquote|pre|mark)\b/i.test(t);
}

export function notesContentToEditorHtml(content: string): string {
  const t = content.trim();
  if (!t) return "<p></p>";
  if (contentLooksLikeNotesHtml(content)) return sanitizeNotesHtml(content);
  return plainNotesToHtml(content);
}

function normalizeLooseHtml(h: string): string {
  return h.replace(/\s+/g, " ").trim();
}

export function NotesRichHtmlDisplay({ html }: { html: string }) {
  const [safe, setSafe] = useState("");

  useEffect(() => {
    setSafe(sanitizeNotesHtml(html));
  }, [html]);

  if (!safe) {
    return <div className="min-h-[1em] text-lc-muted" aria-hidden />;
  }

  return (
    <div
      className="notes-rich-html min-w-0 text-[14px] leading-relaxed text-lc-text [&_a]:text-lc-orange [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-lc-divider [&_blockquote]:pl-3 [&_blockquote]:text-lc-muted [&_code]:rounded [&_code]:bg-lc-elevated [&_code]:px-1 [&_code]:text-[13px] [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-lc-text [&_h3]:mb-1.5 [&_h3]:mt-3 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-lc-text [&_h4]:mb-1 [&_h4]:mt-2 [&_h4]:text-[15px] [&_h4]:font-semibold [&_li]:my-0.5 [&_mark]:rounded-sm [&_mark]:bg-lc-orange/25 [&_mark]:px-0.5 [&_mark]:text-lc-text [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1.5 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-lc-elevated [&_pre]:p-3 [&_pre]:text-[13px] [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}

function ToolbarButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded border text-lc-text transition-transform duration-100 ease-out hover:-translate-y-px hover:border-lc-orange/50 hover:bg-lc-elevated ${
        active ? "border-lc-orange/60 bg-lc-orange/10" : "border-lc-border bg-transparent"
      }`}
    >
      {children}
    </button>
  );
}

export type NotesRichEditorHandle = {
  /** Persist current HTML (same as editor blur). No-op if the editor is not ready. */
  commit: () => void;
};

export const NotesRichEditor = forwardRef<
  NotesRichEditorHandle,
  {
    value: string;
    onBlurCommitted: (html: string) => void;
    /** `drawer` uses a taller scroll area for bottom-sheet layouts. */
    variant?: "inline" | "drawer";
  }
>(function NotesRichEditor({ value, onBlurCommitted, variant = "inline" }, ref) {
  const [, setToolbarTick] = useState(0);
  const onBlurRef = useRef(onBlurCommitted);
  onBlurRef.current = onBlurCommitted;

  const editorBodyClass =
    variant === "drawer"
      ? "focus:outline-none min-h-[18rem] max-h-[min(62dvh,720px)] overflow-y-auto px-0 py-1 text-[14px] leading-relaxed text-lc-text"
      : "focus:outline-none min-h-[14rem] max-h-[70vh] overflow-y-auto px-0 py-1 text-[14px] leading-relaxed text-lc-text";

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: "notes-term-highlight rounded-sm bg-lc-orange/25 px-0.5",
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-lc-orange underline underline-offset-2",
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      Placeholder.configure({ placeholder: "Edit your notes…" }),
    ],
    editorProps: {
      attributes: {
        class: editorBodyClass,
      },
    },
    onBlur: ({ editor: ed }) => {
      onBlurRef.current(sanitizeNotesHtml(ed.getHTML()));
    },
  }, [editorBodyClass]);

  useImperativeHandle(
    ref,
    () => ({
      commit() {
        if (!editor) return;
        onBlurRef.current(sanitizeNotesHtml(editor.getHTML()));
      },
    }),
    [editor],
  );

  useEffect(() => {
    if (!editor) return;
    const html = notesContentToEditorHtml(value);
    const cur = editor.getHTML();
    if (normalizeLooseHtml(cur) === normalizeLooseHtml(html)) return;
    editor.commands.setContent(html, false);
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    const bump = () => setToolbarTick((t) => t + 1);
    editor.on("selectionUpdate", bump);
    editor.on("transaction", bump);
    return () => {
      editor.off("selectionUpdate", bump);
      editor.off("transaction", bump);
    };
  }, [editor]);

  if (!editor) {
    return <div className="min-h-[14rem] rounded border border-lc-border border-dashed bg-lc-elevated/30" aria-busy />;
  }

  return (
    <div className="notes-rich-editor [&_mark]:rounded-sm [&_mark]:bg-lc-orange/25 [&_mark]:px-0.5">
      <div className="mb-2 flex flex-wrap gap-1 border-b border-lc-divider pb-2">
        <ToolbarButton
          title="Highlight"
          active={editor.isActive("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          title="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          title="Heading"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          title="Smaller heading"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton
          title="Link"
          active={editor.isActive("link")}
          onClick={() => {
            const prev = editor.getAttributes("link").href as string | undefined;
            const next = typeof window !== "undefined" ? window.prompt("Link URL", prev ?? "https://") : null;
            if (next === null) return;
            const trimmed = next.trim();
            if (trimmed === "") {
              editor.chain().focus().unsetLink().run();
              return;
            }
            editor.chain().focus().setLink({ href: trimmed }).run();
          }}
        >
          <Link2 className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" strokeWidth={2} />
        </ToolbarButton>
        <ToolbarButton title="Body text" onClick={() => editor.chain().focus().setParagraph().run()}>
          <span className="text-[11px] font-mono font-semibold">P</span>
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
});

NotesRichEditor.displayName = "NotesRichEditor";
