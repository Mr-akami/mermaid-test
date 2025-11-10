# Three.js Sequence Diagram Editor

A GUI-based sequence diagram editor built with Three.js that supports Mermaid syntax.

## Features

- **Visual Editing**: Create and edit sequence diagrams using an intuitive GUI
- **Mermaid Support**: Full support for Mermaid sequenceDiagram syntax
- **Interactive Canvas**: Three.js-powered rendering for smooth 3D visualization
- **Real-time Preview**: See your diagram update as you edit
- **Export**: Generate Mermaid syntax from your diagram

## Supported Elements

Based on the Mermaid Sequence Diagram specification:

### Participants
- **Participant**: Rectangular lifeline box
- **Actor**: Human icon representation
- Aliases and multi-line names support

### Messages
- 10 arrow types:
  - `->`: solid line, no arrowhead
  - `-->`: dashed line, no arrowhead
  - `->>`: solid line, arrowhead
  - `-->>`: dashed line, arrowhead
  - `<<->>`: solid line, both ends
  - `<<-->>`: dashed line, both ends
  - `-x`: solid line, × at end (deletion/error)
  - `--x`: dashed line, × at end
  - `-)`: solid line, open arrowhead (async)
  - `--)`: dashed line, open arrowhead (async)

### Notes
- Position: left, right, or over participants
- Multi-line support with `<br/>`

### Control Structures
- **Loop**: Repetitive sequences
- **Alt**: Alternative paths
- **Opt**: Optional sequences
- **Par**: Parallel execution
- **Critical**: Critical regions
- **Break**: Break sequences

### Additional Features
- Auto-numbering
- Participant grouping (Box)
- Background highlighting (Rect)
- Actor links
- Activation/Deactivation

## Getting Started

### Installation

```bash
pnpm install
```

### Development

Start the development server on port 50003:

```bash
pnpm dev
```

Open [http://localhost:50003](http://localhost:50003) in your browser.

### Build

Build for production:

```bash
pnpm build
```

## Usage

### User Interface

The editor consists of:
- **Icon Toolbar** (top): Click icons to select tools
- **Canvas** (center): Draw and edit diagram elements
- **Property Panel** (right): Edit selected element properties
- **Output Panel** (bottom): View exported Mermaid code

### Adding Participants

1. Click the **📦 Participant** or **🧑 Actor** icon in the toolbar
2. Click anywhere on the canvas to place the participant
3. Enter the participant ID and optional label in the dialog
4. The participant appears on the canvas

### Moving Participants

1. Click the **🖱️ Select** tool
2. Click and drag any participant to reposition it

### Adding Messages (Edges)

1. Click a message type icon: **→ Solid**, **⇢ Dashed**, **↷ Async**, or **✕ Delete**
2. Click on the first participant's lifeline (the vertical dashed line)
3. Click on the second participant's lifeline
4. Enter message text (optional)
5. The message arrow appears between the lifelines

### Moving Messages

1. Select the **🖱️ Select** tool
2. Click and drag a message arrow up or down to reorder it

### Adding Notes

1. Click the **📝 Note** icon
2. Select the participant, position (left/right/over), and enter text

### Creating Control Structures

1. Click the **⬚ Rectangle** selection tool
2. Drag a rectangle around the area you want to enclose
3. Choose the control structure type (loop, alt, opt, etc.)
4. Enter the required parameters

Alternatively, use **🔁 Loop** or **🔀 Alt** icons to add structures directly.

### Editing Elements

1. Click on any element in the diagram to select it
2. The property panel on the right shows editable properties
3. Modify properties and see changes in real-time

### Exporting

Click **Export Mermaid** to:
- Generate Mermaid syntax
- Copy code to clipboard
- Display code in the output panel at the bottom

## Keyboard and Mouse Controls

- **Left Click**: Select and place elements
- **Click + Drag**: Move participants or messages
- **Escape**: Cancel current operation and return to Select mode

## Architecture

### Data Model (`src/model/`)
- `types.ts`: TypeScript type definitions for diagram elements
- `DiagramModel.ts`: Core data model with change notifications
- `MermaidExporter.ts`: Exports diagram to Mermaid syntax

### Renderer (`src/renderer/`)
- `Canvas2DRenderer.ts`: Canvas 2D API rendering engine
- `LayoutEngine.ts`: Calculates positions for all diagram elements (legacy)

### UI (`src/ui/`)
- `IconToolbar.ts`: Icon-based toolbar with mode selection
- `PropertyPanel.ts`: Right panel for editing element properties

### Interactions (`src/interactions/`)
- `Canvas2DInteractionHandler.ts`: Mouse interaction, drag & drop, and element placement

## Key Features

### Interactive Canvas Operations

1. **Click-to-Place**: Click toolbar icons then click canvas to add elements
2. **Drag & Drop**: Move participants and messages by dragging
3. **Lifeline-to-Lifeline Messages**: Click source lifeline, then target lifeline
4. **Rectangle Selection**: Select areas to create control structures
5. **Real-time Rendering**: See changes immediately as you edit

### Supported Operations

- ✅ Add/remove/edit participants and actors
- ✅ Drag participants to reposition
- ✅ Click lifelines to create messages
- ✅ Drag messages vertically to reorder
- ✅ Add notes with positioning
- ✅ Create control structures (loop, alt, opt, etc.)
- ✅ Export to Mermaid syntax
- ✅ Auto-numbering toggle

## Specification

This implementation follows the Mermaid Sequence Diagram specification defined in `/doc/sequence-spec.md`, with enhanced interactive GUI operations as specified in the "操作性" section.

## Technology Stack

- **Canvas 2D API**: Fast, native 2D rendering
- **TypeScript**: Type-safe development
- **Vite**: Fast development and build tool

## License

MIT
