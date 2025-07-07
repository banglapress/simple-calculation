// src/components/editor/LexicalEditor.tsx
"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { $generateNodesFromDOM } from "@lexical/html";
import { $getRoot, $insertNodes } from "lexical";
import { useEffect } from "react";

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

export default function LexicalEditor({
  onChange,
  initialHtml = "",
}: {
  onChange: (html: string) => void;
  initialHtml?: string;
}) {
  const initialConfig = {
    namespace: "BanglaEditor",
    theme: {},
    onError: (e: Error) => console.error("Lexical error:", e),
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <EditorInitializer html={initialHtml} />
      <RichTextPlugin
        contentEditable={
          <ContentEditable className="border p-2 min-h-[200px] rounded outline-none" />
        }
        placeholder={<div className="text-gray-400 p-2">এখানে লিখুন...</div>}
      />
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
