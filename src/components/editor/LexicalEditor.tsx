// src/components/editor/LexicalEditor.tsx
"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateNodesFromDOM } from "@lexical/html";
import {
  $getRoot,
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_ELEMENT_COMMAND,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from "lexical";
import { useEffect, useState } from "react";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { DecoratorNode, type NodeKey } from "lexical";
import type { JSX } from "react";

export class ArticleImageNode extends DecoratorNode<JSX.Element> {
  __src: string;

  static getType(): string {
    return "article-image";
  }

  static clone(node: ArticleImageNode): ArticleImageNode {
    return new ArticleImageNode(node.__src, node.__key);
  }

  static importDOM() {
    return {
      img: () => ({
        conversion: (element: HTMLElement) => {
          const src = element.getAttribute("src");
          return src ? { node: new ArticleImageNode(src) } : null;
        },
        priority: 1,
      }),
    };
  }

  static importJSON(serializedNode: {
    type: string;
    version: number;
    src: string;
  }): ArticleImageNode {
    return new ArticleImageNode(serializedNode.src);
  }

  constructor(src: string, key?: NodeKey) {
    super(key);
    this.__src = src;
  }

  exportJSON() {
    return {
      type: "article-image",
      version: 1,
      src: this.__src,
    };
  }

  exportDOM() {
    const element = document.createElement("img");
    element.setAttribute("src", this.__src);
    element.setAttribute("alt", "");
    element.setAttribute("class", "my-6 w-full rounded-lg");
    return { element };
  }

  createDOM() {
    const wrapper = document.createElement("div");
    wrapper.className = "my-6";
    return wrapper;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return (
      <img
        src={this.__src}
        alt=""
        className="my-6 w-full rounded-lg"
      />
    );
  }
}

export function $createArticleImageNode(src: string) {
  return new ArticleImageNode(src);
}



function EditorInitializer({ html }: { html: string }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!html) return;

    editor.update(() => {
      const parser = new DOMParser();
      const dom = parser.parseFromString(html, "text/html");
      const nodes = $generateNodesFromDOM(editor, dom);
      const root = $getRoot();
      root.clear();
      root.selectEnd();
      $insertNodes(nodes);
    });
  }, [html, editor]);

  return null;
}

function ToolbarButton({
  label,
  title,
  onClick,
  disabled = false,
}: {
  label: string;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="min-w-9 h-9 px-2 rounded-md border border-transparent hover:border-slate-300 hover:bg-slate-100 disabled:opacity-40 text-sm font-medium"
    >
      {label}
    </button>
  );
}

function InsertImagePlugin({
  imageUrl,
  onImageInserted,
}: {
  imageUrl?: string | null;
  onImageInserted?: () => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!imageUrl) return;

    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertNodes([$createArticleImageNode(imageUrl)]);
      }
    });

    onImageInserted?.();
  }, [editor, imageUrl, onImageInserted]);

  return null;
}


function EditorToolbar() {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    const unregisterUndo = editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    const unregisterRedo = editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      COMMAND_PRIORITY_LOW
    );

    return () => {
      unregisterUndo();
      unregisterRedo();
    };
  }, [editor]);

  const format = (type: "bold" | "italic" | "underline" | "strikethrough" | "code") => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, type);
  };

  const align = (type: "left" | "center" | "right" | "justify") => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, type);
  };

  return (
    <div className="flex flex-wrap items-center gap-1 border-b bg-slate-50 px-2 py-2">
      <ToolbarButton
        label="↶"
        title="Undo"
        disabled={!canUndo}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
      />
      <ToolbarButton
        label="↷"
        title="Redo"
        disabled={!canRedo}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
      />

      <span className="mx-1 h-6 w-px bg-slate-300" />

      <ToolbarButton label="B" title="Bold" onClick={() => format("bold")} />
      <ToolbarButton label="I" title="Italic" onClick={() => format("italic")} />
      <ToolbarButton label="U" title="Underline" onClick={() => format("underline")} />
      <ToolbarButton label="S" title="Strikethrough" onClick={() => format("strikethrough")} />
      <ToolbarButton label="</>" title="Inline code" onClick={() => format("code")} />

      <span className="mx-1 h-6 w-px bg-slate-300" />

      <ToolbarButton label="≡" title="বামে align" onClick={() => align("left")} />
      <ToolbarButton label="☰" title="মাঝে align" onClick={() => align("center")} />
      <ToolbarButton label="≣" title="ডানে align" onClick={() => align("right")} />
      <ToolbarButton label="☷" title="Justify" onClick={() => align("justify")} />
    </div>
  );
}

export default function LexicalEditor({
  onChange,
  initialHtml = "",
  insertImageUrl,
  onImageInserted,
}: {
  onChange: (html: string) => void;
  initialHtml?: string;
  insertImageUrl?: string | null;
  onImageInserted?: () => void;
}) {
  const initialConfig = {
    namespace: "BanglaEditor",
    theme: {},
    onError: (e: Error) => console.error("Lexical error:", e),
    nodes: [ArticleImageNode],
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <EditorInitializer html={initialHtml} />
      <InsertImagePlugin imageUrl={insertImageUrl} onImageInserted={onImageInserted} />

      <div className="overflow-hidden rounded-xl border bg-white">
        <EditorToolbar />

        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable className="min-h-[560px] px-6 py-5 outline-none text-[18px] leading-8" />
            }
            placeholder={
              <div className="pointer-events-none absolute left-6 top-5 text-slate-400">
                এখানে মূল সংবাদ লিখুন...
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />

          <div className="border-t bg-slate-50 px-4 py-2 text-xs text-slate-500">
            Markdown নয়—সরাসরি formatted article text লিখুন। Toolbar থেকে টেক্সট format ও alignment ব্যবহার করতে পারবেন।
          </div>
        </div>
      </div>

      <HistoryPlugin />

      <OnChangePlugin
        onChange={(editorState, editor) => {
          editorState.read(() => {
            const html = editor.getRootElement()?.innerHTML || "";
            onChange(html);
          });
        }}
      />
    </LexicalComposer>
  );
}
