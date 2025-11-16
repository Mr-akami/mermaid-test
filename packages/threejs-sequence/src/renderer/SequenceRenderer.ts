import * as THREE from 'three';
import { DiagramModel } from '../model/DiagramModel';
import { LayoutEngine, type DiagramLayout, type ParticipantLayout, type MessageLayout, type NoteLayout } from './LayoutEngine';
import type { ArrowType } from '../model/types';

/**
 * SequenceRenderer renders the sequence diagram using Three.js
 */
export class SequenceRenderer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private layoutEngine: LayoutEngine;
  private model: DiagramModel;
  private container: HTMLElement;
  private layout: DiagramLayout | null = null;

  // Visual elements
  private participantMeshes: Map<string, THREE.Group> = new Map();
  private messageMeshes: THREE.Group[] = [];
  private noteMeshes: THREE.Group[] = [];
  private lifelineMeshes: Map<string, THREE.Line> = new Map();

  constructor(container: HTMLElement, model: DiagramModel) {
    this.container = container;
    this.model = model;
    this.layoutEngine = new LayoutEngine();

    // Setup scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);

    // Setup camera
    this.camera = new THREE.OrthographicCamera(
      0, container.clientWidth,
      0, container.clientHeight,
      0.1, 1000
    );
    this.camera.position.z = 10;

    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);

    // Listen for model changes
    this.model.onChange(() => this.render());

    // Handle window resize
    window.addEventListener('resize', () => this.onResize());

    // Initial render
    this.render();
  }

  /**
   * Render the diagram
   */
  render(): void {
    // Clear previous elements
    this.clearScene();

    // Calculate layout
    const diagram = this.model.getDiagram();
    const orderedParticipants = this.model.getOrderedParticipants();
    this.layout = this.layoutEngine.calculateLayout(diagram, orderedParticipants);

    // Update camera to fit diagram
    this.updateCamera();

    // Render elements
    this.renderParticipants(this.layout.participants);
    this.renderLifelines(this.layout.participants, this.layout.height);
    this.renderMessages(this.layout.messages);
    this.renderNotes(this.layout.notes);

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Clear all visual elements from scene
   */
  private clearScene(): void {
    this.participantMeshes.forEach(mesh => this.scene.remove(mesh));
    this.participantMeshes.clear();

    this.messageMeshes.forEach(mesh => this.scene.remove(mesh));
    this.messageMeshes = [];

    this.noteMeshes.forEach(mesh => this.scene.remove(mesh));
    this.noteMeshes = [];

    this.lifelineMeshes.forEach(line => this.scene.remove(line));
    this.lifelineMeshes.clear();
  }

  /**
   * Update camera to fit diagram
   */
  private updateCamera(): void {
    if (!this.layout) return;

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    // Calculate scale to fit diagram
    const scaleX = width / this.layout.width;
    const scaleY = height / this.layout.height;
    const scale = Math.min(scaleX, scaleY, 1);

    // Update camera
    this.camera.left = 0;
    this.camera.right = width / scale;
    this.camera.top = height / scale;
    this.camera.bottom = 0;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Render participants
   */
  private renderParticipants(participants: ParticipantLayout[]): void {
    participants.forEach(layout => {
      const group = new THREE.Group();

      // Create box
      const boxGeometry = new THREE.PlaneGeometry(layout.width, layout.height);
      const boxMaterial = new THREE.MeshBasicMaterial({
        color: layout.participant.type === 'actor' ? 0xe8f5e9 : 0xe3f2fd,
        side: THREE.DoubleSide
      });
      const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);

      // Create border
      const borderGeometry = new THREE.EdgesGeometry(boxGeometry);
      const borderMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
      const border = new THREE.LineSegments(borderGeometry, borderMaterial);

      boxMesh.add(border);
      group.add(boxMesh);

      // Create text (using canvas texture)
      const text = this.createTextSprite(
        layout.participant.label || layout.participant.id,
        14,
        layout.width
      );
      group.add(text);

      // Position group
      group.position.set(
        layout.x + layout.width / 2,
        layout.y + layout.height / 2,
        0
      );

      // Add to scene and map
      this.scene.add(group);
      this.participantMeshes.set(layout.participant.id, group);
    });
  }

  /**
   * Render lifelines
   */
  private renderLifelines(participants: ParticipantLayout[], height: number): void {
    participants.forEach(layout => {
      const startY = layout.y + layout.height;
      const endY = height - 50;

      const points = [
        new THREE.Vector3(layout.x + layout.width / 2, startY, -0.1),
        new THREE.Vector3(layout.x + layout.width / 2, endY, -0.1)
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineDashedMaterial({
        color: 0x666666,
        linewidth: 1,
        dashSize: 5,
        gapSize: 3
      });

      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();

      this.scene.add(line);
      this.lifelineMeshes.set(layout.participant.id, line);
    });
  }

  /**
   * Render messages
   */
  private renderMessages(messages: MessageLayout[]): void {
    messages.forEach(layout => {
      const group = new THREE.Group();

      // Create arrow line
      const points = [
        new THREE.Vector3(layout.fromX, layout.y, 0),
        new THREE.Vector3(layout.toX, layout.y, 0)
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = this.getMessageLineMaterial(layout.message.arrow);
      const line = new THREE.Line(geometry, material);

      if (material instanceof THREE.LineDashedMaterial) {
        line.computeLineDistances();
      }

      group.add(line);

      // Create arrowhead
      const arrowhead = this.createArrowhead(layout.message.arrow, layout.fromX, layout.toX, layout.y);
      if (arrowhead) {
        group.add(arrowhead);
      }

      // Create message text
      if (layout.message.text) {
        const text = this.createTextSprite(
          layout.message.text,
          12,
          Math.abs(layout.toX - layout.fromX)
        );
        text.position.set(
          (layout.fromX + layout.toX) / 2,
          layout.y + 8,
          0.1
        );
        group.add(text);
      }

      this.scene.add(group);
      this.messageMeshes.push(group);
    });
  }

  /**
   * Render notes
   */
  private renderNotes(notes: NoteLayout[]): void {
    notes.forEach(layout => {
      const group = new THREE.Group();

      // Create note box
      const boxGeometry = new THREE.PlaneGeometry(layout.width, layout.height);
      const boxMaterial = new THREE.MeshBasicMaterial({
        color: 0xfffde7,
        side: THREE.DoubleSide
      });
      const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);

      // Create border
      const borderGeometry = new THREE.EdgesGeometry(boxGeometry);
      const borderMaterial = new THREE.LineBasicMaterial({ color: 0xf57f17, linewidth: 2 });
      const border = new THREE.LineSegments(borderGeometry, borderMaterial);

      boxMesh.add(border);
      group.add(boxMesh);

      // Create text
      const text = this.createTextSprite(layout.note.text, 12, layout.width - 10);
      group.add(text);

      // Position group
      group.position.set(
        layout.x + layout.width / 2,
        layout.y + layout.height / 2,
        0.2
      );

      this.scene.add(group);
      this.noteMeshes.push(group);
    });
  }

  /**
   * Get line material based on arrow type
   */
  private getMessageLineMaterial(arrow: ArrowType): THREE.LineBasicMaterial | THREE.LineDashedMaterial {
    const isDashed = arrow.includes('--');
    const color = 0x000000;

    if (isDashed) {
      return new THREE.LineDashedMaterial({
        color,
        linewidth: 2,
        dashSize: 5,
        gapSize: 3
      });
    } else {
      return new THREE.LineBasicMaterial({
        color,
        linewidth: 2
      });
    }
  }

  /**
   * Create arrowhead based on arrow type
   */
  private createArrowhead(arrow: ArrowType, fromX: number, toX: number, y: number): THREE.Mesh | THREE.Group | null {
    const direction = toX > fromX ? 1 : -1;
    const size = 8;

    // Determine arrowhead type
    let shape: THREE.Shape | null = null;

    if (arrow.includes('>>') || arrow === '->>' || arrow === '-->>' || arrow.includes('<<->>')) {
      // Filled arrowhead
      shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(-size, size / 2);
      shape.lineTo(-size, -size / 2);
      shape.closePath();
    } else if (arrow.includes('-x') || arrow.includes('--x')) {
      // X mark
      // Create an X using lines instead
      return this.createXMark(toX, y, size);
    } else if (arrow.includes('-)')  || arrow.includes('--))')) {
      // Open arrowhead (async)
      shape = new THREE.Shape();
      shape.moveTo(-size, size / 2);
      shape.lineTo(0, 0);
      shape.lineTo(-size, -size / 2);
    }

    if (!shape) return null;

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(toX, y, 0);
    mesh.rotation.z = direction > 0 ? 0 : Math.PI;

    return mesh;
  }

  /**
   * Create X mark for deletion messages
   */
  private createXMark(x: number, y: number, size: number): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 });

    // Line 1
    const points1 = [
      new THREE.Vector3(-size / 2, -size / 2, 0),
      new THREE.Vector3(size / 2, size / 2, 0)
    ];
    const geometry1 = new THREE.BufferGeometry().setFromPoints(points1);
    const line1 = new THREE.Line(geometry1, material);

    // Line 2
    const points2 = [
      new THREE.Vector3(-size / 2, size / 2, 0),
      new THREE.Vector3(size / 2, -size / 2, 0)
    ];
    const geometry2 = new THREE.BufferGeometry().setFromPoints(points2);
    const line2 = new THREE.Line(geometry2, material);

    group.add(line1);
    group.add(line2);
    group.position.set(x, y, 0);

    return group;
  }

  /**
   * Create text sprite using canvas
   */
  private createTextSprite(text: string, fontSize: number, maxWidth: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    // Set canvas size
    canvas.width = 512;
    canvas.height = 128;

    // Configure text
    context.font = `${fontSize}px Arial`;
    context.fillStyle = '#000000';
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Handle line breaks
    const lines = text.split('<br/>');
    const lineHeight = fontSize * 1.2;
    const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, index) => {
      context.fillText(line, canvas.width / 2, startY + index * lineHeight, canvas.width - 20);
    });

    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    // Scale sprite to match text
    const aspect = canvas.width / canvas.height;
    sprite.scale.set(maxWidth, maxWidth / aspect, 1);

    return sprite;
  }

  /**
   * Handle window resize
   */
  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.renderer.setSize(width, height);
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Get renderer DOM element
   */
  getElement(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    window.removeEventListener('resize', () => this.onResize());
    this.renderer.dispose();
    this.clearScene();
  }
}
