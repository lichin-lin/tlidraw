import {
  Canvas,
  ContextMenu,
  TldrawEditor,
  TldrawUi,
  defaultShapes,
  defaultTools,
  useEditor,
} from "@tldraw/tldraw";
import { useEffect } from "react";

export default function CustomUiExample() {
  return (
    <div className="tldraw__editor">
      <TldrawEditor shapes={defaultShapes} tools={defaultTools} autoFocus>
        <TldrawUi>
          <ContextMenu>
            <Canvas />
			{/* <CustomUi /> */}
          </ContextMenu>
        </TldrawUi>
      </TldrawEditor>
    </div>
  );
}

const CustomUi = () => {
	const editor = useEditor()

	useEffect(() => {
		const handleKeyUp = (e: KeyboardEvent) => {
			switch (e.key) {
				case 'Delete':
				case 'Backspace': {
					editor.deleteShapes()
				}
			}
		}

		window.addEventListener('keyup', handleKeyUp)
		return () => {
			window.removeEventListener('keyup', handleKeyUp)
		}
	})

	return (
		<div className="custom-layout">
			<div className="custom-toolbar">
				<button
					className="custom-button"
					data-isactive={editor.currentToolId === 'select'}
					onClick={() => editor.setSelectedTool('select')}
				>
					Select
				</button>
				<button
					className="custom-button"
					data-isactive={editor.currentToolId === 'draw'}
					onClick={() => editor.setSelectedTool('draw')}
				>
					Pencil
				</button>
				<button
					className="custom-button"
					data-isactive={editor.currentToolId === 'eraser'}
					onClick={() => editor.setSelectedTool('eraser')}
				>
					Eraser
				</button>
			</div>
		</div>
	)
}
