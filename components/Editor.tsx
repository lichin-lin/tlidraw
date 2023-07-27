import {
  Canvas,
  ContextMenu,
  createTLStore,
  TLArrowShape,
  TLAssetId,
  TLFrameShape,
  TLImageShape,
  TLNoteShape,
  TLShape,
  TLShapeId,
  TldrawEditor,
  TldrawUi,
  defaultShapes,
  defaultTools,
  getSvgAsImage,
  useEditor,
  useToasts,
  Tldraw,
} from "@tldraw/tldraw";
import { throttle } from "@tldraw/utils";
import "react-cmdk/dist/cmdk.css";
import imglyRemoveBackground, { Config } from "@imgly/background-removal";
import CommandPalette, { filterItems, getItemIndex } from "react-cmdk";
import { Joystick } from "react-joystick-component";
import { nanoid } from "nanoid";
import { useState, useEffect, useLayoutEffect } from "react";

type JoystickDirection = "FORWARD" | "RIGHT" | "LEFT" | "BACKWARD";
type JoystickStatus = "move" | "stop" | "start";

export interface IJoystickUpdateEvent {
  type: JoystickStatus;
  x: number | null;
  y: number | null;
  direction: JoystickDirection | null;
  distance: number; // Percentile 0-100% of joystick
}

// metric helper
const calculateDegree = (cx: number, cy: number, px: number, py: number) => {
  // Calculate the difference in coordinates
  var dx = px - cx;
  var dy = py - cy;

  // Calculate the angle in radians
  var rad = Math.atan2(dy, dx);

  // Convert the angle to degrees
  var deg = rad * (180 / Math.PI);

  // Adjust the angle to be between 0 and 360
  if (deg < 0) {
    deg = 360 + deg;
  }

  return deg;
};

function rotatePoint(
  cx: number,
  cy: number,
  angle: number,
  px: number,
  py: number
) {
  var rad = angle * (Math.PI / 180); // Convert to radians
  var cosAngle = Math.cos(rad);
  var sinAngle = Math.sin(rad);

  //Translate point back to origin
  px -= cx;
  py -= cy;

  // Perform rotation
  var nx = cosAngle * px - sinAngle * py;
  var ny = sinAngle * px + cosAngle * py;

  // Translate point back:
  px = nx + cx;
  py = ny + cy;

  return [px, py];
}

const PERSISTENCE_KEY = "tldraw";

export default function CustomUiExample() {
  const [store] = useState(() => createTLStore({ shapes: defaultShapes }));
  const [loadingState, setLoadingState] = useState<
    | { status: "loading" }
    | { status: "ready" }
    | { status: "error"; error: string }
  >({
    status: "loading",
  });
  useLayoutEffect(() => {
    setLoadingState({ status: "loading" });

    // Get persisted data from local storage
    const persistedSnapshot = localStorage.getItem(PERSISTENCE_KEY);
    console.log(persistedSnapshot);

    if (persistedSnapshot) {
      try {
        const snapshot = JSON.parse(persistedSnapshot);
        store.loadSnapshot(snapshot);
        setLoadingState({ status: "ready" });
      } catch (error: any) {
        setLoadingState({ status: "error", error: error.message }); // Something went wrong
      }
    } else {
      setLoadingState({ status: "ready" }); // Nothing persisted, continue with the empty store
    }

    // Each time the store changes, run the (debounced) persist function
    const cleanupFn = store.listen(
      throttle(() => {
        const snapshot = store.getSnapshot();
        localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(snapshot));
      }, 500)
    );

    return () => {
      cleanupFn();
    };
  }, [store]);

  if (loadingState.status === "loading") {
    return (
      <div className="tldraw__editor">
        <h2>Loading...</h2>
      </div>
    );
  }

  if (loadingState.status === "error") {
    return (
      <div className="tldraw__editor">
        <h2>Error!</h2>
        <p>{loadingState.error}</p>
      </div>
    );
  }

  return (
    <div className="tldraw__editor">
      <Tldraw store={store} autoFocus hideUi={true}>
        <TldrawUi>
          <ContextMenu>
            <Canvas />
            <CustomUi />
          </ContextMenu>
        </TldrawUi>
      </Tldraw>
    </div>
  );
}

const CustomUi = () => {
  const [page, setPage] = useState<"root" | "projects">("root");
  const [open, setOpen] = useState<boolean>(false);
  const [showJoystick, setShowJoystick] = useState<boolean>(false);
  const [crayonEffect, setCrayonEffect] = useState<boolean>(false);
  const [joystickStatus, setJoystickStatus] = useState<JoystickStatus>("stop");
  const [shapeData, setShapeData] = useState<any>([]);
  const [linkedListMode, setLinkedListMode] = useState<boolean>(false);
  const [search, setSearch] = useState("");
  const editor = useEditor();
  const { addToast } = useToasts();

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const blobToBase64 = (blob: Blob) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    return new Promise((resolve) => {
      reader.onloadend = () => {
        resolve(reader.result);
      };
    });
  };
  const pasteImageUrlsToCanvas = async (urls: string[]) => {
    // get result + apply to canvas
    const blobs = await Promise.all(
      urls.map(async (url: string) => await (await fetch(url)).blob())
    );
    const files = blobs.map(
      (blob) => new File([blob], "tldrawFile", { type: blob.type })
    );
    editor.selectNone();
    editor.mark("paste");
    await editor.putExternalContent({
      type: "files",
      files,
      ignoreParent: false,
    });

    urls.forEach((url: string) => URL.revokeObjectURL(url));
  };
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
   * AI: remove bg
   */
  const handleRemoveBg = async () => {
    // process start
    let start = Date.now();
    const image = editor.selectedShapes.filter(
      (s) => s.type === "image"
    ) as TLImageShape[];
    if (!image) return;
    const asset = editor.getAssetById(image[0].props.assetId as TLAssetId);
    const assetData = asset?.props.src as string;

    const config: Config = {
      fetchArgs: {},
      debug: true,
      // publicPath: "https://cdn.glitch.me/58816696-88a1-460f-851a-243a2c7022e5/",
      proxyToWorker: true,
      model: "small",
      progress: (key, current, total) => {
        console.log(`Downloading ${key}: ${current} of ${total}`);
      },
    };

    imglyRemoveBackground(assetData, config).then(async (blob: Blob) => {
      // The result is a blob encoded as PNG. It can be converted to an URL to be used as HTMLImage.src
      const url = URL.createObjectURL(blob);
      const urls = [url];
      await pasteImageUrlsToCanvas(urls);
      // process end
      let timeTaken = Date.now() - start;
      console.log(`timeTaken for removebg: ${timeTaken}`);
    });
  };
  /**
   * AI: handle doodle to image
   */
  const handleDoodle2Image = async () => {
    const frame = editor.selectedShapes.filter(
      (s) => s.type === "frame"
    )?.[0] as TLFrameShape;
    if (!frame) return;

    // prompt
    const prompt = frame.props.name;

    // turn frame and its content into base64 image by using editor api
    const svg = await editor.getSvg([frame.id], {
      scale: 1,
      background: editor.instanceState.exportBackground,
    });
    if (!svg) throw new Error("Could not construct SVG.");
    const image = await getSvgAsImage(svg, {
      type: "png",
      quality: 1,
      scale: 2,
    });
    if (!image) {
      addToast({
        id: "export-fail",
        title: "Ooops, something went wrong!",
        description: `We can't handle the doodle to image task...`,
      });
      return;
    }
    const dataURL = await blobToBase64(image); // URL.createObjectURL(image);

    const response = await fetch("/api/doodle2Image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        image: dataURL,
      }),
    });

    let prediction = await response.json();
    if (response.status !== 201) {
      console.log(prediction.detail);
      return;
    }
    let urls = [] as string[];
    editor.selectNone();
    while (
      prediction.status !== "succeeded" &&
      prediction.status !== "failed"
    ) {
      await sleep(1000);
      const response = await fetch(`/api/doodle2Image/${prediction.id}`);
      prediction = await response.json();
      if (response.status !== 200) {
        console.log(prediction.detail);
        return;
      }
      console.log(prediction.logs);

      if (prediction.status === "succeeded") {
        // console.log(prediction.output);
        urls = [prediction.output[1]];
      }
      await pasteImageUrlsToCanvas(urls);
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
      await pasteImageUrlsToCanvas(urls);
    }
  };

  /**
   * Editing experience: joystick
   */
  const handleJoystickMove = (event: IJoystickUpdateEvent) => {
    setJoystickStatus(event.type);
    // @ts-ignore
    const deg = calculateDegree(0, 0, event.x, event.y);
    if (
      editor.selectedShapes.length === 1 &&
      editor.selectedShapes[0].type === "note"
    ) {
      const target = editor.selectedShapes[0];
      shapesMoveDegreeBaseOn(target, -1 * deg, shapeData);
    }
  };
  const shapesMoveDegreeBaseOn = (
    target: TLShape,
    degree: number,
    shapes: TLShape[]
  ) => {
    for (let shape of shapes) {
      if (shape) {
        const result = rotatePoint(
          target.x,
          target.y,
          degree,
          shape.x,
          shape.y
        );
        editor.updateShapes([
          {
            id: shape.id,
            type: "note",
            x: result[0],
            y: result[1],
          },
        ]);
      }
    }
  };
  const getIntersection = () => {
    const arrows = editor.selectedShapes.filter(
      (s) =>
        s.type === "arrow" &&
        // @ts-ignore
        s.props.start && s.props.start.type === "binding" && s.props.end.type === "binding"
    ) as TLArrowShape[];

    if (arrows.length) {
      const pathData = arrows.map((a) => {
        const domID = a.id;
        return document
          .getElementById(domID)
          ?.children[1]?.getAttribute("d") as string;
      });
    }
  };
  const setBeautifulArrowCurve = () => {
    const arrows = editor.selectedShapes.filter(
      (s) =>
        s.type === "arrow" &&
        // @ts-ignore
        s.props.start && s.props.start.type === "binding" && s.props.end.type === "binding"
    ) as TLArrowShape[];
    if (arrows.length) {
      const _arrows = arrows
        .map((a) => ({
          ...a,
          dis:
            // @ts-ignore
            (editor?.getShapeById(a.props.start?.boundShapeId)?.y - editor?.getShapeById(a.props.end?.boundShapeId)?.y) **
              2 || 0,
        }))
        .sort((a, b) => a.dis - b.dis)
        .map(({ dis, ...a }, index) => ({
          ...a,
          props: {
            ...a.props,
            bend: (100 * index) / arrows.length,
            start: {
              ...a.props.start,
              normalizedAnchor: {
                x: 0.5,
                y: 0.5,
              },
            },
            end: {
              ...a.props.end,
              normalizedAnchor: {
                x: 0.5,
                y: 0.5,
              },
            },
          },
        }));
      // and give curve level
      editor.updateShapes(_arrows);
    }
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
            children: "Notes Summarizer",
            icon: "SparklesIcon",
            closeOnSelect: true,
            onClick: () => {
              handleSummarizer();
            },
          },
          // {
          //   id: "text2img",
          //   children: "Notes to Tile Image",
          //   icon: "SparklesIcon",
          //   closeOnSelect: true,
          //   onClick: () => {
          //     handleText2Image();
          //   },
          // },
          {
            id: "doodle2img",
            children: "Doodle to Image",
            icon: "SparklesIcon",
            closeOnSelect: true,
            onClick: () => {
              handleDoodle2Image();
            },
          },
          {
            id: "removebg",
            children: "Remove background",
            icon: "SparklesIcon",
            closeOnSelect: true,
            onClick: () => {
              handleRemoveBg();
            },
          },
        ],
      },
      {
        heading: "Editing experience",
        id: "editor",
        items: [
          // {
          //   id: "camera",
          //   children: "Cursor Camera",
          //   icon: "CameraIcon",
          //   closeOnSelect: true,
          //   onClick: () => {
          //     console.log("camera!");
          //   },
          // },
          {
            id: "linkedlist",
            children: "Linked List selection",
            icon: "LinkIcon",
            closeOnSelect: true,
            onClick: () => {
              setLinkedListMode(!linkedListMode);
            },
          },
          {
            id: "joystick",
            children: "Joystick control",
            icon: "CursorArrowRippleIcon",
            closeOnSelect: true,
            onClick: () => {
              setShowJoystick(!showJoystick);
              // moveDegree(20);
            },
          },
          {
            id: "crayon",
            children: "Crayon effect (for Doodle)",
            icon: "PencilIcon",
            closeOnSelect: true,
            onClick: () => {
              setCrayonEffect(!crayonEffect);
            },
          },
          {
            id: "arrow-intersection",
            children: "Arrow - Find Intersection",
            icon: "ArrowRightIcon",
            closeOnSelect: true,
            onClick: () => {
              getIntersection();
            },
          },
          {
            id: "arrow",
            children: "Arrow - Beautiful curve",
            icon: "ArrowRightIcon",
            closeOnSelect: true,
            onClick: () => {
              setBeautifulArrowCurve();
            },
          },
        ],
      },
    ],
    search
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (showJoystick) {
        if (joystickStatus !== "stop") return;
        if (
          editor.selectedShapes.length === 1 &&
          editor.selectedShapes[0].type === "note"
        ) {
          // find all notes
          const target = editor.selectedShapes[0];
          // console.log(target);

          const shapeData = editor.shapesArray
            .filter(
              (s) =>
                s.type === "arrow" &&
                // @ts-ignore
                (s.props.start.boundShapeId === target.id ||
                  // @ts-ignore
                  s.props.end.boundShapeId === target.id)
            )
            .map((a) =>
              // @ts-ignore
              [a.props.start.boundShapeId, a.props.end.boundShapeId].find(
                (id) => id !== target.id
              )
            )
            .map((id) => editor.getShapeById(id))
            .map((shape) => ({
              id: shape?.id,
              x: shape?.x,
              y: shape?.y,
              // @ts-ignore
              degFromCenter: calculateDegree(
                target.x,
                target.y,
                // @ts-ignore
                shape.x,
                // @ts-ignore
                shape.y
              ),
            }));
          setShapeData(shapeData);
          // calc the degree for each one of them
        }
      }
    }, 1000 / 60);
    return () => {
      clearInterval(interval);
    };
  }, [editor, joystickStatus]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (linkedListMode) {
        if (
          editor.selectedShapes.length === 1 &&
          editor.selectedShapes[0].type === "note"
        ) {
          let list = [] as TLShapeId[];
          const arrows = editor.shapesArray.filter((s) => s.type === "arrow");

          // WIP: use a set() to avoid circule
          const dfs = (shapeID: TLShapeId) => {
            if (list.find((s) => s === shapeID)) return;
            list.push(shapeID);
            const nextLevelShapeID = arrows
              .filter(
                (arrow) =>
                  // @ts-ignore
                  arrow.props.start.boundShapeId === shapeID &&
                  // @ts-ignore
                  arrow.props.end.boundShapeId !== null
              )
              // @ts-ignore
              .map((a) => a.props.end.boundShapeId) as TLShapeId[];

            for (let n of nextLevelShapeID) {
              dfs(n);
            }
          };
          dfs(editor.selectedShapes[0].id);
          editor.select(...list);
        }
      }
    }, 1000 / 60);

    return () => {
      clearInterval(interval);
    };
  }, [editor, linkedListMode]);
  return (
    <>
      {/* Sketch effect */}
      {crayonEffect && (
        <svg style={{ width: 0, height: 0, position: "absolute" }}>
          <defs>
            <filter
              x="0%"
              y="0%"
              width="100%"
              height="100%"
              filterUnits="objectBoundingBox"
              id="pencilTexture"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.5"
                numOctaves="5"
                stitchTiles="stitch"
                result="f1"
              ></feTurbulence>
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0, 0 0 0 0 0, 0 0 0 0 0, 0 0 0 -1.5 1.5"
                result="f2"
              ></feColorMatrix>
              <feComposite
                operator="in"
                in2="f2b"
                in="SourceGraphic"
                result="f3"
              ></feComposite>
              <feTurbulence
                type="fractalNoise"
                baseFrequency="1.2"
                numOctaves="3"
                result="noise"
              ></feTurbulence>
              <feDisplacementMap
                xChannelSelector="R"
                yChannelSelector="G"
                scale="2.5"
                in="f3"
                result="f4"
              ></feDisplacementMap>
            </filter>
          </defs>
        </svg>
      )}
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
      {showJoystick && (
        <div
          id="joystick-wrapper"
          style={{
            position: "absolute",
            right: 64,
            bottom: 64,
            zIndex: 9999,
          }}
        >
          <Joystick
            size={100}
            sticky={false}
            baseColor="rgb(237, 240, 242)"
            stickColor="rgb(255, 255, 255)"
            // @ts-ignore
            move={handleJoystickMove}
            stop={() => setJoystickStatus("stop")}
          ></Joystick>
        </div>
      )}
    </>
  );
};
