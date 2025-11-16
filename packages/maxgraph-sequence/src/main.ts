import './style.css';
import {
  Graph,
  InternalEvent,
  Point,
  type Cell,
  type CellStyle,
  type InternalMouseEvent,
} from '@maxgraph/core';

const BASE_FONT =
  'IBM Plex Sans, Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif';

type ParticipantType = 'participant' | 'actor';
type ArrowType =
  | '->'
  | '-->'
  | '->>'
  | '-->>'
  | '<<->>'
  | '<<-->>'
  | '-x'
  | '--x'
  | '-)'
  | '--))';

type NotePosition = 'left' | 'right' | 'over';
type BlockKind = 'loop' | 'opt' | 'break' | 'rect' | 'critical' | 'par' | 'alt';

interface Participant {
  id: string;
  displayName: string;
  type: ParticipantType;
  explicit: boolean;
  color?: string;
  x?: number;
}

interface MessageActivation {
  sender?: 'activate' | 'deactivate';
  receiver?: 'activate' | 'deactivate';
}

interface Message {
  id: string;
  from: string;
  to: string;
  arrow: ArrowType;
  text: string;
  activation?: MessageActivation;
  y?: number;
}

interface Note {
  id: string;
  targets: string[];
  position: NotePosition;
  text: string;
  messageIndex: number;
}

interface TimelineBlock {
  id: string;
  kind: BlockKind;
  label: string;
  fromMessage: number;
  toMessage: number;
  color?: string;
}

interface ParticipantBox {
  id: string;
  label: string;
  participants: string[];
  color?: string;
}

interface SequenceDiagramState {
  participants: Participant[];
  messages: Message[];
  notes: Note[];
  blocks: TimelineBlock[];
  boxes: ParticipantBox[];
  autonumber: boolean;
}

interface ArrowVisualMeta {
  label: string;
  description: string;
  style: Partial<CellStyle>;
  marker?: 'destroy';
}

interface ParticipantPosition {
  columnLeft: number;
  centerX: number;
}

interface ActivationSegment {
  participantId: string;
  level: number;
  startY: number;
  endY: number;
}

interface DestroyMarker {
  participantId: string;
  x: number;
  y: number;
  color: string;
}

type SelectionDescriptor =
  | { kind: 'participant'; id: string }
  | { kind: 'message'; id: string }
  | { kind: 'note'; id: string };

const ARROW_META: Record<ArrowType, ArrowVisualMeta> = {
  '->': {
    label: 'Solid',
    description: 'Synchronous call without arrow head',
    style: { endArrow: 'none' },
  },
  '-->': {
    label: 'Dashed',
    description: 'Synchronous dashed call (e.g. implied)',
    style: { endArrow: 'none', dashed: true },
  },
  '->>': {
    label: 'Solid + arrow',
    description: 'Standard synchronous call',
    style: { endArrow: 'classic' },
  },
  '-->>': {
    label: 'Dashed + arrow',
    description: 'Asynchronous response/delayed call',
    style: { endArrow: 'classic', dashed: true },
  },
  '<<->>': {
    label: 'Bidirectional',
    description: 'Signals that both endpoints receive context',
    style: { endArrow: 'classic', startArrow: 'classic' },
  },
  '<<-->>': {
    label: 'Bidirectional dashed',
    description: 'Bidirectional async channel',
    style: { endArrow: 'classic', startArrow: 'classic', dashed: true },
  },
  '-x': {
    label: 'Destroy',
    description: 'Marks the receiving lifeline as destroyed (solid)',
    style: { endArrow: 'classic', strokeColor: '#c62828' },
    marker: 'destroy',
  },
  '--x': {
    label: 'Destroy dashed',
    description: 'Marks the receiving lifeline as destroyed (dashed)',
    style: { endArrow: 'classic', strokeColor: '#c62828', dashed: true },
    marker: 'destroy',
  },
  '-)': {
    label: 'Async',
    description: 'Asynchronous open arrow head',
    style: { endArrow: 'open' },
  },
  '--))': {
    label: 'Async dashed',
    description: 'Dashed asynchronous arrow head',
    style: { endArrow: 'open', dashed: true },
  },
};

const ARROW_TYPES: ArrowType[] = Object.keys(ARROW_META) as ArrowType[];

const LAYOUT = {
  paddingX: 70,
  topPadding: 40,
  participantWidth: 160,
  participantHeight: 520,
  rowSpacing: 80,
  noteWidth: 220,
  bottomPadding: 140,
  minHeight: 640,
};

const PARTICIPANT_GAP = 90;
const MESSAGE_BASELINE = LAYOUT.topPadding + 160;

const defaultParticipantX = (index: number): number =>
  LAYOUT.paddingX + index * (LAYOUT.participantWidth + PARTICIPANT_GAP);

const defaultMessageY = (index: number): number =>
  MESSAGE_BASELINE + index * LAYOUT.rowSpacing;

type CanvasTool = 'select' | 'participant' | 'actor' | 'message';

type CellMetadata =
  | { kind: 'participant'; participantId: string }
  | {
      kind: 'message-anchor';
      messageId: string;
    }
  | { kind: 'message'; messageId: string }
  | { kind: 'note'; noteId: string }
  | { kind: 'block'; blockId: string };

let cellMetadata: WeakMap<Cell, CellMetadata> = new WeakMap();

type GraphMetrics = {
  graphHeight: number;
  workTop: number;
  workBottom: number;
};

let graphMetrics: GraphMetrics = {
  graphHeight: LAYOUT.minHeight,
  workTop: LAYOUT.topPadding,
  workBottom: LAYOUT.topPadding + LAYOUT.participantHeight,
};

let activeTool: CanvasTool = 'select';
let pendingConnection: { participantId: string } | null = null;
let interactionsInitialized = false;
let selectedEntity: SelectionDescriptor | null = null;

const DEFAULT_DIAGRAM: SequenceDiagramState = {
  participants: [
    {
      id: 'User',
      displayName: 'Web<br/>User',
      type: 'actor',
      explicit: true,
      color: '#FFE0B2',
      x: defaultParticipantX(0),
    },
    {
      id: 'EdgeAPI',
      displayName: 'Edge API',
      type: 'participant',
      explicit: true,
      color: '#E0F2F1',
      x: defaultParticipantX(1),
    },
    {
      id: 'Auth',
      displayName: 'Auth<br/>Service',
      type: 'participant',
      explicit: true,
      color: '#E8EAF6',
      x: defaultParticipantX(2),
    },
    {
      id: 'DB',
      displayName: 'Account DB',
      type: 'participant',
      explicit: true,
      color: '#FFFDE7',
      x: defaultParticipantX(3),
    },
  ],
  boxes: [
    {
      id: 'client-box',
      label: 'Client tier',
      participants: ['User', 'EdgeAPI'],
      color: 'rgba(3, 169, 244, 0.15)',
    },
  ],
  messages: [
    {
      id: 'm1',
      from: 'User',
      to: 'EdgeAPI',
      arrow: '->>',
      text: 'enter credentials',
      activation: { receiver: 'activate' },
      y: defaultMessageY(0),
    },
    {
      id: 'm2',
      from: 'EdgeAPI',
      to: 'Auth',
      arrow: '-->>',
      text: 'validate<br/>payload',
      activation: { receiver: 'activate' },
      y: defaultMessageY(1),
    },
    {
      id: 'm3',
      from: 'Auth',
      to: 'DB',
      arrow: '->>',
      text: 'SELECT user',
      activation: { receiver: 'activate' },
      y: defaultMessageY(2),
    },
    {
      id: 'm4',
      from: 'DB',
      to: 'Auth',
      arrow: '-->>',
      text: 'result set',
      activation: { sender: 'deactivate' },
      y: defaultMessageY(3),
    },
    {
      id: 'm5',
      from: 'Auth',
      to: 'EdgeAPI',
      arrow: '-)',
      text: 'issue token #35;',
      activation: { sender: 'deactivate', receiver: 'activate' },
      y: defaultMessageY(4),
    },
    {
      id: 'm6',
      from: 'EdgeAPI',
      to: 'User',
      arrow: '-->>',
      text: 'return session<br/>(+mirrorActors)',
      activation: { sender: 'deactivate', receiver: 'deactivate' },
      y: defaultMessageY(5),
    },
    {
      id: 'm7',
      from: 'EdgeAPI',
      to: 'EdgeAPI',
      arrow: '<<-->>',
      text: 'note self-check',
      y: defaultMessageY(6),
    },
    {
      id: 'm8',
      from: 'Auth',
      to: 'DB',
      arrow: '--x',
      text: 'destroy temp record',
      y: defaultMessageY(7),
    },
  ],
  notes: [
    {
      id: 'n1',
      targets: ['EdgeAPI', 'Auth'],
      position: 'over',
      text: 'Sequence numbering matches<br/>Mermaid autonumber',
      messageIndex: 1,
    },
    {
      id: 'n2',
      targets: ['User'],
      position: 'right',
      text: 'Participants drag along<br/>their lifeline (spec §2)',
      messageIndex: 0,
    },
  ],
  blocks: [
    {
      id: 'b1',
      kind: 'loop',
      label: 'Retry until success (max 3)',
      fromMessage: 1,
      toMessage: 4,
      color: '#FFFDE7',
    },
    {
      id: 'b2',
      kind: 'rect',
      label: 'Security boundary',
      fromMessage: 2,
      toMessage: 5,
      color: 'rgba(244, 143, 177, 0.25)',
    },
  ],
  autonumber: true,
};

const diagramState: SequenceDiagramState = deepCopy(DEFAULT_DIAGRAM);

const appRoot = document.querySelector<HTMLDivElement>('#app');

if (!appRoot) {
  throw new Error('Missing #app element');
}

appRoot.innerHTML = `
  <div class="sequence-app">
    <header class="sequence-header">
      <div>
        <h1>maxGraph Sequence Diagram Editor</h1>
        <p>
          Implements the requirements from <code>doc/sequence-spec.md</code>:
          explicit vs implicit participants, message arrow variants, notes,
          activation bars, grouping blocks, and Mermaid export.
        </p>
      </div>
      <div class="header-actions">
        <label class="checkbox">
          <input type="checkbox" id="autonumber-toggle" checked />
          <span>autonumber</span>
        </label>
        <button id="reset-diagram" type="button">Reset demo</button>
      </div>
    </header>
    <section class="sequence-main">
      <aside class="control-column">
        <section>
          <h2>Participants</h2>
          <form id="participant-form" class="form-grid">
            <label>
              Internal ID
              <input id="participant-id" required placeholder="e.g. API" />
            </label>
            <label>
              Display label (alias)
              <input id="participant-label" placeholder="Shown on lifeline" />
            </label>
            <label>
              Type
              <select id="participant-type">
                <option value="participant">participant</option>
                <option value="actor">actor</option>
              </select>
            </label>
            <label>
              Accent color
              <input id="participant-color" type="color" value="#e0f2f1" />
            </label>
            <label class="checkbox">
              <input type="checkbox" id="participant-explicit" checked />
              <span>Explicit definition</span>
            </label>
            <button type="submit">Add participant</button>
          </form>
          <div id="participant-list" class="data-list"></div>
        </section>
        <section>
          <h2>Messages</h2>
          <form id="message-form" class="form-grid">
            <label>
              From
              <select id="message-from" class="participant-select" required></select>
            </label>
            <label>
              To
              <select id="message-to" class="participant-select" required></select>
            </label>
            <label>
              Arrow
              <select id="message-arrow">
                ${ARROW_TYPES.map(
                  (arrow) => `<option value="${arrow}">${arrow}</option>`,
                ).join('')}
              </select>
            </label>
            <label>
              Message text
              <textarea
                id="message-text"
                rows="2"
                placeholder="Use &lt;br/&gt; for manual line breaks"
              ></textarea>
            </label>
            <div class="activation-grid">
              <label class="checkbox">
                <input type="checkbox" id="activate-sender" />
                <span>activate sender</span>
              </label>
              <label class="checkbox">
                <input type="checkbox" id="deactivate-sender" />
                <span>deactivate sender</span>
              </label>
              <label class="checkbox">
                <input type="checkbox" id="activate-receiver" />
                <span>activate receiver</span>
              </label>
              <label class="checkbox">
                <input type="checkbox" id="deactivate-receiver" />
                <span>deactivate receiver</span>
              </label>
            </div>
            <button type="submit">Add message</button>
          </form>
          <div id="message-list" class="data-list"></div>
        </section>
        <section>
          <h2>Notes & Blocks</h2>
          <form id="note-form" class="form-grid">
            <label>
              Position
              <select id="note-position">
                <option value="left">left of</option>
                <option value="right">right of</option>
                <option value="over">over</option>
              </select>
            </label>
            <label>
              Target IDs (comma separated)
              <input
                id="note-targets"
                placeholder="EdgeAPI,Auth"
                required
              />
            </label>
            <label>
              Message index
              <input id="note-index" type="number" min="0" value="0" />
            </label>
            <label>
              Text
              <textarea id="note-text" rows="2"></textarea>
            </label>
            <button type="submit">Add note</button>
          </form>
          <div id="note-list" class="data-list"></div>
          <form id="block-form" class="form-grid">
            <label>
              Block type
              <select id="block-kind">
                <option value="loop">loop</option>
                <option value="opt">opt</option>
                <option value="break">break</option>
                <option value="rect">rect</option>
                <option value="critical">critical</option>
                <option value="par">par</option>
                <option value="alt">alt</option>
              </select>
            </label>
            <label>
              Label
              <input id="block-label" placeholder="e.g. Retry" />
            </label>
            <label>
              From message #
              <input id="block-from" type="number" min="0" value="0" />
            </label>
            <label>
              To message #
              <input id="block-to" type="number" min="0" value="0" />
            </label>
            <label>
              Color / keyword
              <input
                id="block-color"
                placeholder="rgb(...) / keyword / rgba(...)"
              />
            </label>
            <button type="submit">Add block</button>
          </form>
          <div id="block-list" class="data-list"></div>
        </section>
      </aside>
      <section class="canvas-column">
        <div class="canvas-commands">
          <div class="tool-buttons">
            <button class="tool-button active" data-tool="select">Select</button>
            <button class="tool-button" data-tool="participant">Add Participant</button>
            <button class="tool-button" data-tool="actor">Add Actor</button>
            <button class="tool-button" data-tool="message">Draw Message</button>
          </div>
          <div id="tool-hint" class="tool-hint">
            Select, drag, or draw directly on the canvas.
          </div>
        </div>
        <div id="graph-container" class="graph-container"></div>
        <div class="legend-panel">
          <h3>Arrow legend</h3>
          <div id="arrow-legend" class="legend-grid"></div>
        </div>
        <div class="mermaid-panel">
          <div class="mermaid-panel__header">
            <h3>Generated Mermaid</h3>
            <button id="copy-mermaid" type="button">Copy</button>
          </div>
          <textarea id="mermaid-output" readonly></textarea>
        </div>
        <div class="property-panel" id="property-panel">
          <div class="property-panel__header">
            <h3>Properties</h3>
            <span id="property-entity-label">Nothing selected</span>
          </div>
          <div id="property-body">
            <p class="placeholder">Select a lifeline, message, or note on the canvas.</p>
          </div>
        </div>
      </section>
    </section>
  </div>
`;

const graphContainer = document.getElementById(
  'graph-container',
) as HTMLDivElement;
const graph = new Graph(graphContainer);

InternalEvent.disableContextMenu(graphContainer);
graph.setPanning(true);
graph.setHtmlLabels(true);
graph.setCellsEditable(false);
graph.setCellsMovable(true);
graph.setCellsResizable(false);
graph.setConnectable(false);
graph.setAllowDanglingEdges(false);
graph.setConnectableEdges(false);
graph.setAutoSizeCells(false);
graph.setCellsDisconnectable(false);

const defaultVertex = graph.getStylesheet().getDefaultVertexStyle();
defaultVertex.fontFamily = BASE_FONT;
defaultVertex.fontSize = 14;
defaultVertex.rounded = true;
defaultVertex.strokeColor = '#90A4AE';
defaultVertex.fillColor = '#ECEFF1';

const defaultEdge = graph.getStylesheet().getDefaultEdgeStyle();
defaultEdge.fontFamily = BASE_FONT;
defaultEdge.fontSize = 13;
defaultEdge.strokeColor = '#37474F';
defaultEdge.rounded = true;

graph.isCellMovable = (cell) => {
  const meta = cellMetadata.get(cell);
  if (!meta) {
    return false;
  }
  return meta.kind === 'participant' || meta.kind === 'message-anchor';
};

const participantForm = document.getElementById(
  'participant-form',
) as HTMLFormElement;
const messageForm = document.getElementById(
  'message-form',
) as HTMLFormElement;
const noteForm = document.getElementById('note-form') as HTMLFormElement;
const blockForm = document.getElementById('block-form') as HTMLFormElement;
const messageArrowSelect = document.getElementById(
  'message-arrow',
) as HTMLSelectElement;

const participantList = document.getElementById(
  'participant-list',
) as HTMLDivElement;
const messageList = document.getElementById('message-list') as HTMLDivElement;
const noteList = document.getElementById('note-list') as HTMLDivElement;
const blockList = document.getElementById('block-list') as HTMLDivElement;
const arrowLegend = document.getElementById('arrow-legend') as HTMLDivElement;
const mermaidOutput = document.getElementById(
  'mermaid-output',
) as HTMLTextAreaElement;
const autonumberToggle = document.getElementById(
  'autonumber-toggle',
) as HTMLInputElement;
const noteIndexInput = document.getElementById('note-index') as HTMLInputElement;
const blockFromInput = document.getElementById('block-from') as HTMLInputElement;
const blockToInput = document.getElementById('block-to') as HTMLInputElement;
const copyButton = document.getElementById('copy-mermaid') as HTMLButtonElement;
const propertyPanel = document.getElementById(
  'property-panel',
) as HTMLDivElement;
const propertyEntityLabel = document.getElementById(
  'property-entity-label',
) as HTMLSpanElement;
const propertyBody = document.getElementById('property-body') as HTMLDivElement;

const toolButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('.tool-button'),
);
toolButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const tool = (button.dataset.tool as CanvasTool) ?? 'select';
    setActiveTool(tool);
  });
});
updateToolHint();

document.getElementById('reset-diagram')?.addEventListener('click', () => {
  Object.assign(
    diagramState,
    deepCopy(DEFAULT_DIAGRAM) as SequenceDiagramState,
  );
  rerender();
});

initializeGraphInteractions();

participantForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const idInput = document.getElementById('participant-id') as HTMLInputElement;
  const labelInput = document.getElementById(
    'participant-label',
  ) as HTMLInputElement;
  const typeInput = document.getElementById(
    'participant-type',
  ) as HTMLSelectElement;
  const colorInput = document.getElementById(
    'participant-color',
  ) as HTMLInputElement;
  const explicitInput = document.getElementById(
    'participant-explicit',
  ) as HTMLInputElement;

  const id = idInput.value.trim();
  if (!id) {
    return;
  }

  if (diagramState.participants.some((p) => p.id === id)) {
    alert(`Participant "${id}" already exists.`);
    return;
  }

  const nextX = clampParticipantX(getNextParticipantX());

  diagramState.participants.push({
    id,
    displayName: labelInput.value.trim() || id,
    type: (typeInput.value as ParticipantType) ?? 'participant',
    explicit: explicitInput.checked,
    color: colorInput.value,
    x: nextX,
  });

  idInput.value = '';
  labelInput.value = '';
  explicitInput.checked = true;
  setSelectedEntity({ kind: 'participant', id });
  rerender();
});

messageForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const fromSelect = document.getElementById(
    'message-from',
  ) as HTMLSelectElement;
  const toSelect = document.getElementById('message-to') as HTMLSelectElement;
  const arrowSelect = document.getElementById(
    'message-arrow',
  ) as HTMLSelectElement;
  const textArea = document.getElementById('message-text') as HTMLTextAreaElement;
  const activateSender = document.getElementById(
    'activate-sender',
  ) as HTMLInputElement;
  const deactivateSender = document.getElementById(
    'deactivate-sender',
  ) as HTMLInputElement;
  const activateReceiver = document.getElementById(
    'activate-receiver',
  ) as HTMLInputElement;
  const deactivateReceiver = document.getElementById(
    'deactivate-receiver',
  ) as HTMLInputElement;

  if (!fromSelect.value || !toSelect.value) {
    alert('Pick both sender and receiver.');
    return;
  }

  if (fromSelect.value === toSelect.value && arrowSelect.value === '-x') {
    alert('Use a different participant for destroy messages.');
    return;
  }

  const activation: MessageActivation = {};
  if (activateSender.checked) activation.sender = 'activate';
  if (deactivateSender.checked) activation.sender = 'deactivate';
  if (activateReceiver.checked) activation.receiver = 'activate';
  if (deactivateReceiver.checked) activation.receiver = 'deactivate';
  const defaultY = clampMessageY(defaultMessageY(diagramState.messages.length));

  const messageId = createId('msg');
  diagramState.messages.push({
    id: messageId,
    from: fromSelect.value,
    to: toSelect.value,
    arrow: arrowSelect.value as ArrowType,
    text: textArea.value.trim(),
    activation:
      Object.keys(activation).length > 0 ? (activation as MessageActivation) : undefined,
    y: defaultY,
  });

  textArea.value = '';
  activateSender.checked = false;
  deactivateSender.checked = false;
  activateReceiver.checked = false;
  deactivateReceiver.checked = false;
  noteIndexInput.value = `${diagramState.messages.length - 1}`;
  blockToInput.value = `${diagramState.messages.length - 1}`;
  setSelectedEntity({ kind: 'message', id: messageId });
  rerender();
});

noteForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const positionSelect = document.getElementById(
    'note-position',
  ) as HTMLSelectElement;
  const targetsInput = document.getElementById(
    'note-targets',
  ) as HTMLInputElement;
  const textArea = document.getElementById('note-text') as HTMLTextAreaElement;

  const targets = targetsInput.value
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!targets.length) {
    alert('Provide at least one participant ID.');
    return;
  }

  const index = clampIndex(
    Number(noteIndexInput.value),
    diagramState.messages.length,
  );

  const noteId = createId('note');
  diagramState.notes.push({
    id: noteId,
    targets,
    position: positionSelect.value as NotePosition,
    text: textArea.value.trim(),
    messageIndex: index,
  });

  textArea.value = '';
  setSelectedEntity({ kind: 'note', id: noteId });
  rerender();
});

blockForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const kindSelect = document.getElementById('block-kind') as HTMLSelectElement;
  const labelInput = document.getElementById('block-label') as HTMLInputElement;
  const colorInput = document.getElementById('block-color') as HTMLInputElement;

  const from = clampIndex(
    Number(blockFromInput.value),
    diagramState.messages.length,
  );
  const to = clampIndex(
    Number(blockToInput.value),
    diagramState.messages.length,
  );

  if (from > to) {
    alert('The start index must be less than or equal to the end index.');
    return;
  }

  diagramState.blocks.push({
    id: createId('block'),
    kind: kindSelect.value as BlockKind,
    label: labelInput.value.trim() || kindSelect.value,
    fromMessage: from,
    toMessage: to,
    color: colorInput.value.trim() || undefined,
  });

  rerender();
});

participantList.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const action = target.dataset.action;
  const id = target.dataset.id;
  if (!action || !id) return;

  if (action === 'remove') {
    removeParticipant(id);
  } else if (action === 'toggle-type') {
    toggleParticipantType(id);
  } else if (action === 'toggle-explicit') {
    toggleParticipantExplicit(id);
  }
});

messageList.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.dataset.action !== 'remove') return;
  const id = target.dataset.id;
  if (!id) return;
  diagramState.messages = diagramState.messages.filter((msg) => msg.id !== id);
  clampMessageIndexes();
  rerender();
});

noteList.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.dataset.action !== 'remove') return;
  const id = target.dataset.id;
  if (!id) return;
  diagramState.notes = diagramState.notes.filter((note) => note.id !== id);
  rerender();
});

blockList.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.dataset.action !== 'remove') return;
  const id = target.dataset.id;
  if (!id) return;
  diagramState.blocks = diagramState.blocks.filter((block) => block.id !== id);
  rerender();
});

autonumberToggle.addEventListener('change', () => {
  diagramState.autonumber = autonumberToggle.checked;
  rerender();
});

copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(mermaidOutput.value);
    copyButton.textContent = 'Copied!';
    setTimeout(() => {
      copyButton.textContent = 'Copy';
    }, 1500);
  } catch (error) {
    console.error(error);
    alert('Clipboard access was denied.');
  }
});

function rerender(): void {
  updateParticipantSelectors();
  renderParticipantList();
  renderMessageList();
  renderNoteList();
  renderBlockList();
  renderArrowLegend();
  renderGraph(graph, diagramState, graphContainer);
  updateMermaidOutput();
  updateNumericBounds();
  validateSelection();
  renderPropertyPanel();
}

function updateNumericBounds(): void {
  const maxIndex = Math.max(diagramState.messages.length - 1, 0);
  noteIndexInput.max = `${maxIndex}`;
  noteIndexInput.value = clampIndex(
    Number(noteIndexInput.value),
    diagramState.messages.length,
  ).toString();
  blockFromInput.max = `${maxIndex}`;
  blockToInput.max = `${maxIndex}`;
}

function updateParticipantSelectors(): void {
  const selects = document.querySelectorAll<HTMLSelectElement>(
    '.participant-select',
  );

  const optionMarkup = diagramState.participants
    .map(
      (participant) =>
        `<option value="${participant.id}">${participant.displayName || participant.id}</option>`,
    )
    .join('');

  selects.forEach((select) => {
    const previousValue = select.value;
    select.innerHTML = `<option value="" disabled ${
      previousValue ? '' : 'selected'
    }>Select…</option>${optionMarkup}`;
    if (diagramState.participants.some((p) => p.id === previousValue)) {
      select.value = previousValue;
    }
  });
}

function renderParticipantList(): void {
  if (!diagramState.participants.length) {
    participantList.innerHTML =
      '<p class="placeholder">Add a participant to start.</p>';
    return;
  }

  participantList.innerHTML = diagramState.participants
    .map((participant) => {
      const typeLabel = participant.type === 'actor' ? 'Actor' : 'Participant';
      const explicitLabel = participant.explicit ? 'explicit' : 'implicit';
      return `
        <div class="list-item">
          <div>
            <strong>${participant.id}</strong>
            <div class="list-item__meta">${typeLabel} • ${explicitLabel}</div>
            <div class="list-item__description">${participant.displayName}</div>
          </div>
          <div class="list-item__actions">
            <button data-action="toggle-type" data-id="${participant.id}">
              Toggle type
            </button>
            <button data-action="toggle-explicit" data-id="${participant.id}">
              Toggle explicit
            </button>
            <button data-action="remove" data-id="${participant.id}">
              Remove
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderMessageList(): void {
  if (!diagramState.messages.length) {
    messageList.innerHTML =
      '<p class="placeholder">Messages will appear here.</p>';
    return;
  }

  messageList.innerHTML = diagramState.messages
    .map((message, index) => {
      const activationHints: string[] = [];
      if (message.activation?.sender) {
        activationHints.push(`sender ${message.activation.sender}`);
      }
      if (message.activation?.receiver) {
        activationHints.push(`receiver ${message.activation.receiver}`);
      }
      const hintText = activationHints.length
        ? `<span class="chip">${activationHints.join(', ')}</span>`
        : '';
      return `
        <div class="list-item">
          <div>
            <strong>${diagramState.autonumber ? `${index + 1}. ` : ''}${message.from} ${message.arrow} ${message.to
        }</strong>
            <div class="list-item__description">${message.text || '(no text)'}</div>
            ${hintText}
          </div>
          <div class="list-item__actions">
            <button data-action="remove" data-id="${message.id}">
              Remove
            </button>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderNoteList(): void {
  if (!diagramState.notes.length) {
    noteList.innerHTML = '<p class="placeholder">No notes yet.</p>';
    return;
  }
  noteList.innerHTML = diagramState.notes
    .map(
      (note) => `
        <div class="list-item">
          <div>
            <strong>${note.position} ${note.targets.join(', ')}</strong>
            <div class="list-item__description">${note.text}</div>
            <span class="chip">message #${note.messageIndex}</span>
          </div>
          <div class="list-item__actions">
            <button data-action="remove" data-id="${note.id}">Remove</button>
          </div>
        </div>
      `,
    )
    .join('');
}

function renderBlockList(): void {
  if (!diagramState.blocks.length) {
    blockList.innerHTML =
      '<p class="placeholder">Add loop/rect/break blocks as needed.</p>';
    return;
  }

  blockList.innerHTML = diagramState.blocks
    .map(
      (block) => `
        <div class="list-item">
          <div>
            <strong>${block.kind} (${block.fromMessage} → ${block.toMessage})</strong>
            <div class="list-item__description">${block.label}</div>
            ${block.color ? `<span class="chip">${block.color}</span>` : ''}
          </div>
          <div class="list-item__actions">
            <button data-action="remove" data-id="${block.id}">Remove</button>
          </div>
        </div>
      `,
    )
    .join('');
}

function renderArrowLegend(): void {
  arrowLegend.innerHTML = ARROW_TYPES.map((arrow) => {
    const meta = ARROW_META[arrow];
    return `
      <div class="legend-item">
        <strong>${arrow}</strong>
        <div>${meta.label}</div>
        <small>${meta.description}</small>
      </div>
    `;
  }).join('');
}


function renderGraph(
  graphInstance: Graph,
  diagram: SequenceDiagramState,
  container: HTMLElement,
): void {
  const parent = graphInstance.getDefaultParent();
  cellMetadata = new WeakMap();

  diagram.messages.forEach((message, index) => {
    if (typeof message.y !== 'number' || Number.isNaN(message.y)) {
      message.y = defaultMessageY(index);
    }
  });

  if (!diagram.participants.length) {
    graphInstance.batchUpdate(() => {
      const existing = graphInstance.getChildCells(parent, true, true);
      if (existing.length) {
        graphInstance.removeCells(existing, true);
      }
    });
    return;
  }

  const maxMessageY =
    diagram.messages.reduce(
      (max, message) => Math.max(max, message.y ?? MESSAGE_BASELINE),
      MESSAGE_BASELINE,
    ) || MESSAGE_BASELINE;

  const graphHeight = Math.max(LAYOUT.minHeight, maxMessageY + LAYOUT.bottomPadding);
  graphMetrics = {
    graphHeight,
    workTop: LAYOUT.topPadding,
    workBottom: graphHeight - LAYOUT.bottomPadding / 2,
  };
  container.style.minHeight = `${graphHeight + 160}px`;

  const participantPositions = new Map<string, ParticipantPosition>();
  diagram.participants.forEach((participant, index) => {
    if (participant.x == null || Number.isNaN(participant.x)) {
      participant.x = defaultParticipantX(index);
    }
    participant.x = clampParticipantX(participant.x);
    participantPositions.set(participant.id, {
      columnLeft: participant.x,
      centerX: participant.x + LAYOUT.participantWidth / 2,
    });
  });

  const activationSegments: ActivationSegment[] = [];
  const destroyMarkers: DestroyMarker[] = [];
  const activationStack = new Map<string, ActivationSegment[]>();

  graphInstance.batchUpdate(() => {
    const existing = graphInstance.getChildCells(parent, true, true);
    if (existing.length) {
      graphInstance.removeCells(existing, true);
    }

    const blockBackgrounds = drawTimelineBlocks(
      graphInstance,
      parent,
      diagram,
      participantPositions,
    );
    blockBackgrounds.forEach((cell) => graphInstance.orderCells(true, [cell]));

    drawParticipantBoxes(
      graphInstance,
      parent,
      diagram,
      participantPositions,
      graphMetrics.workBottom,
    );

    diagram.participants.forEach((participant) => {
      const position = participantPositions.get(participant.id);
      if (!position) return;
      const participantCell = graphInstance.insertVertex({
        parent,
        value: buildParticipantNode(participant),
        position: [position.columnLeft, graphMetrics.workTop],
        size: [
          LAYOUT.participantWidth,
          graphMetrics.workBottom - graphMetrics.workTop,
        ],
        style: {
          fillColor: 'transparent',
          strokeColor: 'transparent',
          align: 'left',
          verticalAlign: 'top',
        },
      });
      participantCell.setConnectable(false);
      cellMetadata.set(participantCell, {
        kind: 'participant',
        participantId: participant.id,
      });
    });

    const orderedMessages = diagram.messages.map((message, index) => {
      const y = clampMessageY(message.y ?? defaultMessageY(index));
      if (message.activation?.sender === 'activate') {
        activationSegments.push(
          openActivation(activationStack, message.from, y - 12),
        );
      }
      if (message.activation?.receiver === 'activate') {
        activationSegments.push(
          openActivation(activationStack, message.to, y - 12),
        );
      }
      if (message.activation?.sender === 'deactivate') {
        closeActivation(activationStack, message.from, y + 20);
      }
      if (message.activation?.receiver === 'deactivate') {
        closeActivation(activationStack, message.to, y + 20);
      }

      if (ARROW_META[message.arrow]?.marker === 'destroy') {
        const target = participantPositions.get(message.to);
        if (target) {
          destroyMarkers.push({
            participantId: message.to,
            x: target.centerX,
            y,
            color: ARROW_META[message.arrow].style.strokeColor || '#c62828',
          });
        }
      }

      return { message, y };
    });

    activationStack.forEach((stack) => {
      stack.forEach((segment) => {
        segment.endY = graphMetrics.workBottom;
      });
    });

    activationSegments.forEach((segment) => {
      const position = participantPositions.get(segment.participantId);
      if (!position) return;
      const width = 16;
      const x = position.centerX - width / 2 + segment.level * 12;
      const height = Math.max(18, segment.endY - segment.startY);
      const bar = graphInstance.insertVertex({
        parent,
        value: '',
        position: [x, segment.startY],
        size: [width, height],
        style: {
          fillColor: 'rgba(25, 118, 210, 0.18)',
          strokeColor: '#1976d2',
          rounded: true,
        },
      });
      bar.setConnectable(false);
    });

    orderedMessages.forEach(({ message, y }, index) => {
      const from = participantPositions.get(message.from);
      const to = participantPositions.get(message.to);
      if (!from || !to) return;

      const sourceAnchor = createAnchor(
        graphInstance,
        parent,
        from.centerX,
        y,
        message.id,
      );
      const targetAnchor = createAnchor(
        graphInstance,
        parent,
        to.centerX,
        y,
        message.id,
      );

      const meta = ARROW_META[message.arrow];
      const edge = graphInstance.insertEdge({
        parent,
        source: sourceAnchor,
        target: targetAnchor,
        value: buildMessageLabel(message, index, diagram.autonumber),
        style: {
          strokeWidth: 2,
          fontColor: '#263238',
          ...meta.style,
        },
      });

      edge.setConnectable(false);
      cellMetadata.set(edge, { kind: 'message', messageId: message.id });

      const geometry = edge.geometry?.clone();
      if (geometry) {
        geometry.points =
          message.from === message.to
            ? [
                new Point(from.centerX + 80, y - LAYOUT.rowSpacing / 3),
                new Point(from.centerX + 80, y + LAYOUT.rowSpacing / 3),
              ]
            : [new Point((from.centerX + to.centerX) / 2, y)];
        edge.geometry = geometry;
      }
    });

    destroyMarkers.forEach((marker) => {
      const cell = graphInstance.insertVertex({
        parent,
        value: '<strong>✕</strong>',
        position: [marker.x - 10, marker.y - 10],
        size: [20, 20],
        style: {
          fillColor: '#fff',
          strokeColor: marker.color,
          fontColor: marker.color,
          rounded: true,
          fontSize: 14,
        },
      });
      cell.setConnectable(false);
    });

    diagram.notes.forEach((note) => {
      const y = getMessageY(diagram, note.messageIndex) - 30;
      const targets = note.targets
        .map((id) => participantPositions.get(id))
        .filter(Boolean) as ParticipantPosition[];

      if (!targets.length) return;

      const minX = Math.min(...targets.map((pos) => pos.centerX));
      const maxX = Math.max(...targets.map((pos) => pos.centerX));

      const noteWidth =
        note.position === 'over'
          ? Math.max(200, maxX - minX + LAYOUT.participantWidth / 2)
          : LAYOUT.noteWidth;

      const baseX =
        note.position === 'left'
          ? minX - noteWidth - 24
          : note.position === 'right'
          ? maxX + 24
          : minX - 0.5 * noteWidth;

      const noteCell = graphInstance.insertVertex({
        parent,
        value: `<div class="note-label">${formatRichText(note.text)}</div>`,
        position: [baseX, y],
        size: [noteWidth, 80],
        style: {
          fillColor: '#FFF8E1',
          strokeColor: '#FFB300',
          fontColor: '#5D4037',
          rounded: true,
          align: 'left',
          verticalAlign: 'top',
        },
      });
      noteCell.setConnectable(false);
      cellMetadata.set(noteCell, { kind: 'note', noteId: note.id });
      graphInstance.orderCells(false, [noteCell]);
    });
  });
}
function drawParticipantBoxes(
  graphInstance: Graph,
  parent: Cell | null,
  diagram: SequenceDiagramState,
  positions: Map<string, ParticipantPosition>,
  bottomY: number,
): void {
  diagram.boxes.forEach((box) => {
    const columns = box.participants
      .map((id) => positions.get(id))
      .filter(Boolean) as ParticipantPosition[];
    if (!columns.length) return;

    const leftMost = Math.min(...columns.map((pos) => pos.columnLeft));
    const rightMost = Math.max(
      ...columns.map((pos) => pos.columnLeft + LAYOUT.participantWidth),
    );

    const cell = graphInstance.insertVertex({
      parent,
      value: `<div class="box-label">${escapeHtml(box.label)}</div>`,
      position: [leftMost - 16, LAYOUT.topPadding - 20],
      size: [rightMost - leftMost + 32, bottomY - LAYOUT.topPadding + 40],
      style: {
        fillColor: box.color || 'rgba(129, 199, 132, 0.2)',
        strokeColor: '#66BB6A',
        dashed: true,
        align: 'left',
        verticalAlign: 'top',
        fontColor: '#2E7D32',
      },
    });
    cell.setConnectable(false);
    graphInstance.orderCells(true, [cell]);
  });
}


function drawTimelineBlocks(
  graphInstance: Graph,
  parent: Cell | null,
  diagram: SequenceDiagramState,
  positions: Map<string, ParticipantPosition>,
): Cell[] {
  const blocks: Cell[] = [];
  const columns = Array.from(positions.values());
  if (!columns.length) {
    return blocks;
  }

  const minX = Math.min(...columns.map((pos) => pos.columnLeft));
  const maxX = Math.max(
    ...columns.map((pos) => pos.columnLeft + LAYOUT.participantWidth),
  );

  diagram.blocks.forEach((block) => {
    if (!diagram.messages.length) return;
    const topY = getMessageY(diagram, block.fromMessage) - 40;
    const bottomY = getMessageY(diagram, block.toMessage) + 40;

    const blockCell = graphInstance.insertVertex({
      parent,
      value:
        block.kind === 'rect'
          ? `<div class="block-label">${escapeHtml(block.label)}</div>`
          : `<div class="block-label">${block.kind.toUpperCase()}: ${escapeHtml(
              block.label,
            )}</div>`,
      position: [minX - 40, topY],
      size: [maxX - minX + 80, bottomY - topY + 80],
      style: {
        fillColor:
          block.kind === 'rect'
            ? block.color || 'rgba(255, 241, 118, 0.4)'
            : 'transparent',
        strokeColor:
          block.kind === 'rect'
            ? block.color || '#FDD835'
            : block.color || '#AB47BC',
        dashed: block.kind !== 'rect',
        align: 'left',
        verticalAlign: 'top',
        fontColor: '#37474F',
      },
    });
    blockCell.setConnectable(false);
    blocks.push(blockCell);
  });
  return blocks;
}
function buildParticipantNode(participant: Participant): string {
  const typeLabel = participant.type === 'actor' ? 'Actor' : 'Participant';
  return `
    <div class="participant-node">
      <div class="participant-node__header" style="border-color: ${
        participant.color || '#607D8B'
      }; background: ${participant.color || 'rgba(255,255,255,0.95)'};">
        <div class="participant-node__name">${formatRichText(
          participant.displayName || participant.id,
        )}</div>
        <div class="participant-node__meta">${typeLabel} · ${participant.id}</div>
      </div>
      <div class="participant-node__lifeline"></div>
    </div>
  `;
}

function buildMessageLabel(
  message: Message,
  index: number,
  autonumber: boolean,
): string {
  const prefix = autonumber ? `<span class="edge-number">${index + 1}.</span>` : '';
  const body = message.text
    ? `<span class="edge-text">${formatRichText(message.text)}</span>`
    : '';
  return `<div class="edge-label">${prefix}${body}</div>`;
}

function formatRichText(value: string): string {
  const escaped = escapeHtml(value);
  return escaped
    .replace(/&lt;br\s*\/?&gt;/gi, '<br/>')
    .replace(/\r?\n/g, '<br/>')
    .replace(/&amp;#(\d+);/g, '&#$1;')
    .replace(/&amp;([a-zA-Z]+);/g, '&$1;');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createAnchor(
  graphInstance: Graph,
  parent: Cell | null,
  x: number,
  y: number,
  messageId: string,
): Cell {
  const anchor = graphInstance.insertVertex({
    parent,
    value: '',
    position: [x - 5, y - 5],
    size: [10, 10],
    style: {
      fillColor: '#ffffff',
      strokeColor: '#1d4ed8',
      strokeWidth: 1.4,
      shape: 'ellipse',
      perimeter: undefined,
    },
  });
  anchor.setConnectable(false);
  cellMetadata.set(anchor, { kind: 'message-anchor', messageId });
  return anchor;
}

function openActivation(
  stack: Map<string, ActivationSegment[]>,
  participantId: string,
  startY: number,
): ActivationSegment {
  const segments = stack.get(participantId) ?? [];
  const segment: ActivationSegment = {
    participantId,
    level: segments.length,
    startY,
    endY: startY + 30,
  };
  segments.push(segment);
  stack.set(participantId, segments);
  return segment;
}

function closeActivation(
  stack: Map<string, ActivationSegment[]>,
  participantId: string,
  endY: number,
): void {
  const segments = stack.get(participantId);
  if (!segments?.length) return;
  const segment = segments.pop()!;
  segment.endY = endY;
}

function toggleParticipantType(id: string): void {
  const participant = diagramState.participants.find((p) => p.id === id);
  if (!participant) return;
  participant.type = participant.type === 'actor' ? 'participant' : 'actor';
  rerender();
}

function toggleParticipantExplicit(id: string): void {
  const participant = diagramState.participants.find((p) => p.id === id);
  if (!participant) return;
  participant.explicit = !participant.explicit;
  rerender();
}

function removeParticipant(id: string): void {
  diagramState.participants = diagramState.participants.filter(
    (participant) => participant.id !== id,
  );
  diagramState.messages = diagramState.messages.filter(
    (message) => message.from !== id && message.to !== id,
  );
  diagramState.notes = diagramState.notes
    .map((note) => ({
      ...note,
      targets: note.targets.filter((target) => target !== id),
    }))
    .filter((note) => note.targets.length);
  diagramState.boxes = diagramState.boxes
    .map((box) => ({
      ...box,
      participants: box.participants.filter((target) => target !== id),
    }))
    .filter((box) => box.participants.length);
  clampMessageIndexes();
  rerender();
}

function initializeGraphInteractions(): void {
  if (interactionsInitialized) return;
  interactionsInitialized = true;

  graph.addListener(InternalEvent.CELLS_MOVED, (_sender: Graph, evt: any) => {
    handleCellsMoved(evt);
  });
  graph.addListener(InternalEvent.CLICK, (_sender: Graph, evt: any) => {
    handleGraphClick(evt);
  });
}

function handleCellsMoved(event: any): void {
  const cells = (event?.getProperty?.('cells') as Cell[]) ?? [];
  let changed = false;

  cells.forEach((cell) => {
    const meta = cellMetadata.get(cell);
    if (!meta) return;
    const geometry = cell.getGeometry();
    if (!geometry) return;

    if (meta.kind === 'participant' && meta.participantId) {
      const participant = diagramState.participants.find(
        (p) => p.id === meta.participantId,
      );
      if (!participant) return;
      const nextX = clampParticipantX(geometry.x);
      if (participant.x !== nextX) {
        participant.x = nextX;
        changed = true;
      }
    } else if (meta.kind === 'message-anchor' && meta.messageId) {
      const message = diagramState.messages.find((m) => m.id === meta.messageId);
      if (!message) return;
      const nextY = clampMessageY(geometry.y + geometry.height / 2);
      if (message.y !== nextY) {
        message.y = nextY;
        changed = true;
      }
    }
  });

  if (changed) {
    rerender();
  }
}

function handleGraphClick(event: any): void {
  const mouseEvent = event?.getProperty?.('event') as InternalMouseEvent | undefined;
  const cell = event?.getProperty?.('cell') as Cell | null;
  const meta = cell ? cellMetadata.get(cell) : null;
  if (!mouseEvent) return;

  if (activeTool === 'participant' || activeTool === 'actor') {
    if (cell) return;
    const dropX = clampParticipantX(
      mouseEvent.getGraphX() - LAYOUT.participantWidth / 2,
    );
    addParticipantAt(
      activeTool === 'actor' ? 'actor' : 'participant',
      dropX,
    );
    return;
  }

  if (activeTool === 'message') {
    if (meta?.kind === 'participant' && meta.participantId) {
      if (!pendingConnection) {
        pendingConnection = { participantId: meta.participantId };
        updateToolHint(`Select target for message from ${meta.participantId}`);
      } else {
        const messageId = addMessageFromInteraction(
          pendingConnection.participantId,
          meta.participantId,
          clampMessageY(mouseEvent.getGraphY()),
        );
        pendingConnection = null;
        updateToolHint();
        setSelectedEntity({ kind: 'message', id: messageId });
      }
      rerender();
    } else {
      pendingConnection = null;
      updateToolHint();
    }
    return;
  }

  pendingConnection = null;
  updateToolHint();
  selectFromMetadata(meta);
}

function clampMessageIndexes(): void {
  const maxIndex = Math.max(diagramState.messages.length - 1, 0);
  diagramState.notes.forEach((note) => {
    note.messageIndex = clampIndex(note.messageIndex, diagramState.messages.length);
  });
  diagramState.blocks.forEach((block) => {
    block.fromMessage = clampIndex(block.fromMessage, diagramState.messages.length);
    block.toMessage = clampIndex(block.toMessage, diagramState.messages.length);
    if (block.fromMessage > block.toMessage) {
      block.fromMessage = Math.max(block.toMessage - 1, 0);
    }
  });
  blockFromInput.max = `${maxIndex}`;
  blockToInput.max = `${maxIndex}`;
}

function clampIndex(index: number, total: number): number {
  if (!Number.isFinite(index) || total <= 0) {
    return 0;
  }
  return Math.min(Math.max(index, 0), Math.max(total - 1, 0));
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function deepCopy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function updateMermaidOutput(): void {
  mermaidOutput.value = generateMermaid(diagramState);
}

function generateMermaid(diagram: SequenceDiagramState): string {
  const lines: string[] = ['sequenceDiagram'];
  if (diagram.autonumber) {
    lines.push('  autonumber');
  }

  const orderedParticipants = [
    ...diagram.participants.filter((participant) => participant.explicit),
    ...diagram.participants.filter((participant) => !participant.explicit),
  ];

  orderedParticipants.forEach((participant) => {
    const role = participant.type === 'actor' ? 'actor' : 'participant';
    const alias =
      participant.displayName && participant.displayName !== participant.id
        ? ` as ${participant.displayName}`
        : '';
    lines.push(`  ${role} ${participant.id}${alias}`);
  });

  const blockStarts = new Map<number, TimelineBlock[]>();
  const blockEnds = new Map<number, TimelineBlock[]>();

  diagram.blocks.forEach((block) => {
    const start = blockStarts.get(block.fromMessage) ?? [];
    start.push(block);
    blockStarts.set(block.fromMessage, start);

    const end = blockEnds.get(block.toMessage) ?? [];
    end.push(block);
    blockEnds.set(block.toMessage, end);
  });

  diagram.messages.forEach((message, index) => {
    blockStarts.get(index)?.forEach((block) => {
      lines.push(`  ${serializeBlockStart(block)}`);
      if (block.kind === 'rect' && block.label) {
        lines.push(`  %% ${block.label}`);
      }
    });

    const text = message.text ? `: ${message.text}` : '';
    lines.push(`  ${message.from}${message.arrow}${message.to}${text}`);

    if (message.activation?.sender === 'activate') {
      lines.push(`  activate ${message.from}`);
    }
    if (message.activation?.sender === 'deactivate') {
      lines.push(`  deactivate ${message.from}`);
    }
    if (message.activation?.receiver === 'activate') {
      lines.push(`  activate ${message.to}`);
    }
    if (message.activation?.receiver === 'deactivate') {
      lines.push(`  deactivate ${message.to}`);
    }

    blockEnds
      .get(index)
      ?.slice()
      .reverse()
      .forEach(() => lines.push('  end'));
  });

  diagram.notes.forEach((note) => {
    const sentinel =
      note.position === 'over'
        ? 'over'
        : `${note.position === 'left' ? 'left' : 'right'} of`;
    const text = note.text ? `: ${note.text}` : '';
    lines.push(`  Note ${sentinel} ${note.targets.join(',')}${text}`);
  });

  return lines.join('\n');
}

function serializeBlockStart(block: TimelineBlock): string {
  if (block.kind === 'rect') {
    return `rect ${block.color || '#ECEFF1'}`;
  }
  return `${block.kind} ${block.label}`;
}

function addParticipantAt(type: ParticipantType, x: number): void {
  const id = suggestParticipantId(type);
  diagramState.participants.push({
    id,
    displayName: id,
    type,
    explicit: true,
    color: type === 'actor' ? '#FFE0B2' : '#E0F2F1',
    x: clampParticipantX(x),
  });
  pendingConnection = null;
  setSelectedEntity({ kind: 'participant', id });
  rerender();
}

function addMessageFromInteraction(
  fromId: string,
  toId: string,
  y: number,
): string {
  const arrow =
    (messageArrowSelect?.value as ArrowType | undefined) ?? ('->>' as ArrowType);
  const messageId = createId('msg');
  diagramState.messages.push({
    id: messageId,
    from: fromId,
    to: toId,
    arrow,
    text: '',
    y,
  });
  noteIndexInput.value = `${diagramState.messages.length - 1}`;
  blockToInput.value = `${diagramState.messages.length - 1}`;
  clampMessageIndexes();
  return messageId;
}

function getNextParticipantX(): number {
  if (!diagramState.participants.length) {
    return defaultParticipantX(0);
  }
  const maxX = Math.max(
    ...diagramState.participants.map((p, index) =>
      p.x == null ? defaultParticipantX(index) : p.x,
    ),
  );
  return maxX + LAYOUT.participantWidth + PARTICIPANT_GAP;
}

function clampParticipantX(value: number): number {
  const containerWidth = graphContainer?.clientWidth || 1200;
  const min = LAYOUT.paddingX / 2;
  const max = Math.max(min, containerWidth - LAYOUT.participantWidth - min);
  return Math.min(Math.max(value, min), max);
}

function clampMessageY(value: number): number {
  const min = graphMetrics.workTop + 60;
  const max = Math.max(min + 40, graphMetrics.workBottom - 40);
  return Math.min(Math.max(value, min), max);
}

function getMessageY(diagram: SequenceDiagramState, index: number): number {
  const entry = diagram.messages[index];
  if (!entry) {
    return clampMessageY(defaultMessageY(index));
  }
  if (typeof entry.y !== 'number' || Number.isNaN(entry.y)) {
    entry.y = defaultMessageY(index);
  }
  return clampMessageY(entry.y);
}

function setActiveTool(tool: CanvasTool): void {
  activeTool = tool;
  pendingConnection = null;
  document
    .querySelectorAll<HTMLButtonElement>('.tool-button')
    .forEach((button) => {
      button.classList.toggle(
        'active',
        (button.dataset.tool as CanvasTool | undefined) === tool,
      );
    });
  updateToolHint();
}

function updateToolHint(custom?: string): void {
  const hintElement = document.getElementById('tool-hint');
  if (!hintElement) return;

  if (custom) {
    hintElement.textContent = custom;
    return;
  }

  const hints: Record<CanvasTool, string> = {
    select: 'Select tool: drag participants or message handles to adjust layout.',
    participant: 'Click empty space to place a participant lifeline.',
    actor: 'Click empty space to place an actor lifeline.',
    message:
      pendingConnection == null
        ? 'Click a lifeline to start a message, then click a target lifeline.'
        : `Select the target lifeline for ${pendingConnection.participantId}.`,
  };

  hintElement.textContent = hints[activeTool] ?? '';
}

function suggestParticipantId(type: ParticipantType): string {
  const base = type === 'actor' ? 'Actor' : 'Participant';
  let counter = 1;
  while (
    diagramState.participants.some((participant) => participant.id === `${base}${counter}`)
  ) {
    counter += 1;
  }
  return `${base}${counter}`;
}

function setSelectedEntity(entity: SelectionDescriptor | null): void {
  selectedEntity = entity;
  renderPropertyPanel();
}

function selectFromMetadata(meta?: CellMetadata): void {
  if (!meta) {
    setSelectedEntity(null);
    return;
  }
  if (meta.kind === 'participant') {
    setSelectedEntity({ kind: 'participant', id: meta.participantId });
  } else if (meta.kind === 'message-anchor' || meta.kind === 'message') {
    setSelectedEntity({ kind: 'message', id: meta.messageId });
  } else if (meta.kind === 'note') {
    setSelectedEntity({ kind: 'note', id: meta.noteId });
  } else {
    setSelectedEntity(null);
  }
}

function validateSelection(): void {
  if (!selectedEntity) return;
  const exists =
    (selectedEntity.kind === 'participant' &&
      diagramState.participants.some((p) => p.id === selectedEntity.id)) ||
    (selectedEntity.kind === 'message' &&
      diagramState.messages.some((m) => m.id === selectedEntity.id)) ||
    (selectedEntity.kind === 'note' &&
      diagramState.notes.some((note) => note.id === selectedEntity.id));
  if (!exists) {
    selectedEntity = null;
  }
}

function renderPropertyPanel(): void {
  if (!propertyBody || !propertyEntityLabel) return;
  if (!selectedEntity) {
    propertyEntityLabel.textContent = 'Nothing selected';
    propertyBody.innerHTML =
      '<p class="placeholder">Select a lifeline, message, or note on the canvas.</p>';
    return;
  }

  if (selectedEntity.kind === 'participant') {
    const participant = diagramState.participants.find(
      (p) => p.id === selectedEntity.id,
    );
    if (!participant) {
      propertyEntityLabel.textContent = 'Nothing selected';
      propertyBody.innerHTML =
        '<p class="placeholder">Select a lifeline, message, or note on the canvas.</p>';
      return;
    }
    propertyEntityLabel.textContent = `Participant · ${participant.id}`;
    propertyBody.innerHTML = `
      <form>
        <label>
          Display label
          <input id="prop-participant-label" />
        </label>
        <div class="inline-fields">
          <label>
            Type
            <select id="prop-participant-type">
              <option value="participant" ${
                participant.type === 'participant' ? 'selected' : ''
              }>participant</option>
              <option value="actor" ${
                participant.type === 'actor' ? 'selected' : ''
              }>actor</option>
            </select>
          </label>
          <label>
            Accent color
            <input type="color" id="prop-participant-color" value="${
              participant.color || '#ECEFF1'
            }" />
          </label>
        </div>
        <label class="checkbox">
          <input type="checkbox" id="prop-participant-explicit" ${
            participant.explicit ? 'checked' : ''
          } />
          Explicit definition
        </label>
      </form>
    `;
    const labelInput = propertyBody.querySelector<HTMLInputElement>(
      '#prop-participant-label',
    );
    const typeSelect = propertyBody.querySelector<HTMLSelectElement>(
      '#prop-participant-type',
    );
    const colorInput = propertyBody.querySelector<HTMLInputElement>(
      '#prop-participant-color',
    );
    const explicitInput = propertyBody.querySelector<HTMLInputElement>(
      '#prop-participant-explicit',
    );

    if (labelInput) {
      labelInput.value = participant.displayName || participant.id;
    }
    if (colorInput && participant.color) {
      colorInput.value = participant.color;
    }
    if (explicitInput) {
      explicitInput.checked = participant.explicit;
    }

    labelInput?.addEventListener('input', () => {
      participant.displayName = labelInput.value.trim() || participant.id;
      rerender();
    });
    typeSelect?.addEventListener('change', () => {
      participant.type = (typeSelect.value as ParticipantType) ?? 'participant';
      rerender();
    });
    colorInput?.addEventListener('input', () => {
      participant.color = colorInput.value;
      rerender();
    });
    explicitInput?.addEventListener('change', () => {
      participant.explicit = explicitInput.checked;
      rerender();
    });
    return;
  }

  if (selectedEntity.kind === 'message') {
    const message = diagramState.messages.find(
      (m) => m.id === selectedEntity.id,
    );
    if (!message) {
      propertyEntityLabel.textContent = 'Nothing selected';
      propertyBody.innerHTML =
        '<p class="placeholder">Select a lifeline, message, or note on the canvas.</p>';
      return;
    }
    propertyEntityLabel.textContent = `Message · ${message.id}`;
    propertyBody.innerHTML = `
      <form>
        <label>
          From
          <select id="prop-message-from">
            ${buildParticipantOptions(message.from)}
          </select>
        </label>
        <label>
          To
          <select id="prop-message-to">
            ${buildParticipantOptions(message.to)}
          </select>
        </label>
        <label>
          Arrow style
          <select id="prop-message-arrow">
            ${ARROW_TYPES.map(
              (arrow) =>
                `<option value="${arrow}" ${
                  arrow === message.arrow ? 'selected' : ''
                }>${arrow}</option>`,
            ).join('')}
          </select>
        </label>
        <label>
          Message text
          <textarea id="prop-message-text" rows="3"></textarea>
        </label>
      </form>
    `;
    const fromSelect = propertyBody.querySelector<HTMLSelectElement>(
      '#prop-message-from',
    );
    const toSelect = propertyBody.querySelector<HTMLSelectElement>(
      '#prop-message-to',
    );
    const arrowSelect = propertyBody.querySelector<HTMLSelectElement>(
      '#prop-message-arrow',
    );
    const textArea = propertyBody.querySelector<HTMLTextAreaElement>(
      '#prop-message-text',
    );

    if (textArea) {
      textArea.value = message.text || '';
    }

    fromSelect?.addEventListener('change', () => {
      message.from = fromSelect.value;
      rerender();
    });
    toSelect?.addEventListener('change', () => {
      message.to = toSelect.value;
      rerender();
    });
    arrowSelect?.addEventListener('change', () => {
      message.arrow = arrowSelect.value as ArrowType;
      rerender();
    });
    textArea?.addEventListener('input', () => {
      message.text = textArea.value;
      rerender();
    });
    return;
  }

  if (selectedEntity.kind === 'note') {
    const note = diagramState.notes.find((n) => n.id === selectedEntity.id);
    if (!note) {
      propertyEntityLabel.textContent = 'Nothing selected';
      propertyBody.innerHTML =
        '<p class="placeholder">Select a lifeline, message, or note on the canvas.</p>';
      return;
    }
    propertyEntityLabel.textContent = `Note · ${note.id}`;
    propertyBody.innerHTML = `
      <form>
        <label>
          Position
          <select id="prop-note-position">
            <option value="left" ${note.position === 'left' ? 'selected' : ''}>left of</option>
            <option value="right" ${note.position === 'right' ? 'selected' : ''}>right of</option>
            <option value="over" ${note.position === 'over' ? 'selected' : ''}>over</option>
          </select>
        </label>
        <label>
          Targets (comma separated)
          <input id="prop-note-targets" />
        </label>
        <label>
          Message index
          <input id="prop-note-index" type="number" min="0" max="${
            Math.max(diagramState.messages.length - 1, 0)
          }" value="${note.messageIndex}" />
        </label>
        <label>
          Text
          <textarea id="prop-note-text" rows="3"></textarea>
        </label>
      </form>
    `;
    const positionSelect = propertyBody.querySelector<HTMLSelectElement>(
      '#prop-note-position',
    );
    const targetsInput = propertyBody.querySelector<HTMLInputElement>(
      '#prop-note-targets',
    );
    const indexInput = propertyBody.querySelector<HTMLInputElement>(
      '#prop-note-index',
    );
    const textArea = propertyBody.querySelector<HTMLTextAreaElement>(
      '#prop-note-text',
    );

    if (targetsInput) {
      targetsInput.value = note.targets.join(', ');
    }
    if (indexInput) {
      indexInput.value = `${note.messageIndex}`;
    }
    if (textArea) {
      textArea.value = note.text;
    }

    positionSelect?.addEventListener('change', () => {
      note.position = positionSelect.value as NotePosition;
      rerender();
    });
    targetsInput?.addEventListener('input', () => {
      note.targets = targetsInput.value
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      rerender();
    });
    indexInput?.addEventListener('input', () => {
      const value = Number(indexInput.value);
      note.messageIndex = clampIndex(value, diagramState.messages.length);
      rerender();
    });
    textArea?.addEventListener('input', () => {
      note.text = textArea.value;
      rerender();
    });
    return;
  }
}

function buildParticipantOptions(selectedId?: string): string {
  if (!diagramState.participants.length) {
    return '<option value="" disabled>No participants</option>';
  }
  return diagramState.participants
    .map((participant) => {
      const display = participant.displayName || participant.id;
      const selected = participant.id === selectedId ? 'selected' : '';
      return `<option value="${participant.id}" ${selected}>${display}</option>`;
    })
    .join('');
}

rerender();
