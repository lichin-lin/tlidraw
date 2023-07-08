import {
  Canvas,
  ContextMenu,
  TLNoteShape,
  TLShapeId,
  TldrawEditor,
  TldrawUi,
  defaultShapes,
  defaultTools,
  useEditor,
} from "@tldraw/tldraw";
import { nanoid } from "nanoid";

export default function CustomUiExample() {
  return (
    <div className="tldraw__editor">
      <TldrawEditor shapes={defaultShapes} tools={defaultTools} autoFocus>
        <TldrawUi>
          <ContextMenu>
            <Canvas />
            <CustomUi />
          </ContextMenu>
        </TldrawUi>
      </TldrawEditor>
    </div>
  );
}

const CustomUi = () => {
  const editor = useEditor();
  const handleSummarizer = async () => {
    // set loading status = true

    // create prompt
    const prompt = (
      editor.selectedShapes.filter((s) => s.type === "note") as TLNoteShape[]
    )
      .map((s) => s.props?.text)
      .join("\n ---- \n");
    const bound = editor.selectionBounds;
    const newPos = bound
      ? [bound.x + bound.w + 200, bound.y + bound.h / 2]
      : [200, 200];

    // generate new sticky + content
    const id = `shape:${nanoid()}` as TLShapeId;
    editor.createShapes([
      {
        id: id,
        type: "note",
        x: newPos[0],
        y: newPos[1],
        props: {
          text: "🤖 AI is reading the notes...",
          size: "s",
          font: "mono",
          color: "grey",
          align: "middle",
        },
      },
    ]);
    // fly to
    editor.select(id);
    editor.zoomToSelection({ duration: 1000 });

    // AI
    const response = await fetch("/api/summarizer", {
      method: "POST",
      body: JSON.stringify({
        prompt,
      }),
    });
    const res = await response.json();
    if (res.data.choices) {
      editor.updateShapes([
        {
          id: id,
          type: "note",
          props: {
            text: `Summarized by AI 🌿\n${res?.data?.choices[0]?.message?.content}`,
            align: "start",
          },
        },
      ]);
      editor.zoomToSelection({ duration: 500 });
      editor.selectNone();
    }
  };
  return (
    <div className="custom-layout">
      <div className="custom-toolbar">
        <button
          className="custom-button"
          data-isactive={editor.currentToolId === "select"}
          onClick={() => handleSummarizer()}
        >
          AI Summarizer
        </button>
      </div>
    </div>
  );
};
