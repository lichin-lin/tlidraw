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
import "react-cmdk/dist/cmdk.css";
import CommandPalette, { filterItems, getItemIndex } from "react-cmdk";
import { nanoid } from "nanoid";
import { useState, useEffect } from "react";

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
  const [page, setPage] = useState<"root" | "projects">("root");
  const [open, setOpen] = useState<boolean>(false);
  const [search, setSearch] = useState("");
  const editor = useEditor();

  /**
   * AI: handleSummarizer
   */
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

  /**
   * AI: handle text to image
   */
  const handleText2Image = async () => {
    const prompt = (
      editor.selectedShapes.filter((s) => s.type === "note") as TLNoteShape[]
    )
      .map((s) => s.props?.text)
      .join(",");

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const response = await fetch("/api/text2Image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: prompt }),
    });

    let prediction = await response.json();
    if (response.status !== 201) {
      console.log(prediction.detail);
      return;
    }
    let urls = [];
    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed"
    ) {
      await sleep(1000);
      const response = await fetch(`/api/text2Image/${prediction.id}`);
      prediction = await response.json();
      if (response.status !== 200) {
        console.log(prediction.detail);
        return;
      }
      console.log(prediction.logs);

      if (prediction.status === "succeeded") {
        console.log(prediction.output);
        urls = prediction.output;
      }
    }
    // get result + apply to canvas
    const blobs = await Promise.all(
      urls.map(async (url: string) => await (await fetch(url)).blob())
    );
    const files = blobs.map(
      (blob) => new File([blob], "tldrawFile", { type: blob.type })
    );
    editor.mark("paste");

    await editor.putExternalContent({
      type: "files",
      files,
      ignoreParent: false,
    });

    urls.forEach((url: string) => URL.revokeObjectURL(url));
  };
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.metaKey && e.key === "k") {
        e.preventDefault();
        e.stopPropagation();

        setOpen((currentValue) => {
          return !currentValue;
        });
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // https://heroicons.com/
  const filteredItems = filterItems(
    [
      {
        heading: "AI tryout",
        id: "ai",
        items: [
          {
            id: "summarizer",
            children: "Summarizer",
            icon: "SparklesIcon",
            closeOnSelect: true,
            onClick: () => {
              handleSummarizer();
            },
          },
          {
            id: "text2img",
            children: "Text to Tile Image",
            icon: "SparklesIcon",
            closeOnSelect: true,
            onClick: () => {
              handleText2Image();
            },
          },
        ],
      },
      // {
      //   heading: "Editing experience",
      //   id: "editor",
      //   items: [
      //     {
      //       id: "camera",
      //       children: "Cursor Camera",
      //       icon: "CameraIcon",
      //       closeOnSelect: true,
      //       onClick: () => {
      //         console.log("camera!");
      //       },
      //     },
      //   ],
      // },
    ],
    search
  );

  return (
    <>
      <CommandPalette
        onChangeSearch={setSearch}
        onChangeOpen={setOpen}
        search={search}
        isOpen={open}
        page={page}
      >
        <CommandPalette.Page id="root">
          {filteredItems.length ? (
            filteredItems.map((list) => (
              <CommandPalette.List key={list.id} heading={list.heading}>
                {list.items.map(({ id, ...rest }) => (
                  <CommandPalette.ListItem
                    key={id}
                    index={getItemIndex(filteredItems, id)}
                    {...rest}
                  />
                ))}
              </CommandPalette.List>
            ))
          ) : (
            <CommandPalette.FreeSearchAction />
          )}
        </CommandPalette.Page>
      </CommandPalette>
    </>
  );
};
