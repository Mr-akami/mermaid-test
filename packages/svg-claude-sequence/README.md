# SVG Sequence Diagram Editor

A GUI-based sequence diagram editor built with SVG that supports Mermaid syntax export.

## Features

- **Interactive Canvas**: Create and edit sequence diagrams using a visual interface
- **Participant Management**: Add participants and actors with drag-and-drop positioning
- **Message Creation**: Create messages between participants with various arrow types
- **Control Structures**: Support for loop, alt, opt, par, critical, break, and rect blocks
- **Notes**: Add notes to participants
- **Property Panel**: Edit element properties through a dedicated panel
- **Mermaid Export**: Export diagrams to Mermaid syntax

## Getting Started

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm run dev
```

Open http://localhost:5176/ in your browser.

### Build

```bash
pnpm run build
```

## Usage

### Toolbar

The toolbar at the top left contains the following tools:

- **Select** (↖️): Select and move elements (ESC to activate)
- **Participant** (📦): Add a participant box
- **Actor** (🧑): Add an actor (stick figure)
- **Message** (→): Create messages between lifelines (click source, then target)
- **Note** (📝): Add notes to participants
- **Loop** (🔁): Add a loop control structure (drag to select area)
- **Alt** (🔀): Add an alternative control structure
- **Opt** (❓): Add an optional control structure
- **Par** (⫴): Add a parallel control structure
- **Rect** (▭): Add a highlight rectangle

### Creating a Sequence Diagram

1. **Add Participants/Actors**:
   - Click the Participant or Actor button
   - Click on the canvas where you want to place it
   - Edit its label in the property panel

2. **Create Messages**:
   - Click the Message button
   - Click on the source lifeline (dashed line below a participant)
   - Click on the target lifeline
   - Edit message text and arrow type in the property panel

3. **Add Notes**:
   - Click the Note button
   - Click on a lifeline
   - Edit note text in the property panel

4. **Add Control Structures**:
   - Click a control structure button (Loop, Alt, etc.)
   - Drag to select the area you want to encompass
   - Edit the label in the property panel

5. **Move Elements**:
   - Press ESC or click the Select button
   - Click and drag participants to reposition them
   - Click and drag messages to change their vertical position

6. **Edit Properties**:
   - Click on any element to select it
   - Use the property panel on the right to edit its properties
   - Click "Apply Changes" to save

7. **Delete Elements**:
   - Select an element
   - Press Delete or Backspace
   - Or use the Delete button in the property panel

### Exporting to Mermaid

1. Click "Export to Mermaid" to view the Mermaid syntax
2. Click "Copy Mermaid to Clipboard" to copy the syntax

The exported Mermaid code can be used in any Mermaid-compatible tool.

## Arrow Types

The editor supports all Mermaid arrow types:

- `->`: Solid line, no arrowhead
- `-->`: Dashed line, no arrowhead
- `->>`: Solid line, arrowhead
- `-->>`: Dashed line, arrowhead
- `<<->>`: Solid line, both ends
- `<<-->>`: Dashed line, both ends
- `-x`: Solid line, × at end (destruction)
- `--x`: Dashed line, × at end
- `-)`: Solid line, open arrowhead (async)
- `--)`: Dashed line, open arrowhead (async)

## Keyboard Shortcuts

- **ESC**: Switch to select mode
- **Delete/Backspace**: Delete selected element

## Architecture

The editor is organized into several modules:

- **model/**: Data model and state management
  - `types.ts`: Type definitions
  - `DiagramModel.ts`: Main model with CRUD operations

- **renderer/**: SVG rendering
  - `SVGRenderer.ts`: Renders diagram elements to SVG

- **interaction/**: User interaction handling
  - `InteractionHandler.ts`: Handles mouse events and modes

- **ui/**: User interface components
  - `Toolbar.ts`: Tool selection toolbar
  - `PropertyPanel.ts`: Element property editor
  - `ExportPanel.ts`: Mermaid export functionality

- **export/**: Export functionality
  - `MermaidExporter.ts`: Converts diagram to Mermaid syntax

## License

MIT
