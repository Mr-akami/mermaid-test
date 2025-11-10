import * as THREE from 'three';
import type { DiagramModel } from '../model/DiagramModel';
import type { SelectedElement } from '../ui/PropertyPanel';

export interface InteractionHandlerOptions {
  camera: THREE.OrthographicCamera;
  scene: THREE.Scene;
  canvas: HTMLCanvasElement;
  model: DiagramModel;
  onSelect?: (element: SelectedElement) => void;
}

/**
 * InteractionHandler manages mouse interactions with the diagram
 */
export class InteractionHandler {
  private camera: THREE.OrthographicCamera;
  private scene: THREE.Scene;
  private canvas: HTMLCanvasElement;
  private model: DiagramModel;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private onSelect?: (element: SelectedElement) => void;

  constructor(options: InteractionHandlerOptions) {
    this.camera = options.camera;
    this.scene = options.scene;
    this.canvas = options.canvas;
    this.model = options.model;
    this.onSelect = options.onSelect;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('click', (event) => this.onClick(event));
    this.canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
  }

  private updateMousePosition(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onClick(event: MouseEvent): void {
    this.updateMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      const object = intersects[0].object;
      this.handleObjectClick(object);
    } else {
      // Deselect
      if (this.onSelect) {
        this.onSelect(null);
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    // Change cursor on hover
    if (intersects.length > 0) {
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  private handleObjectClick(object: THREE.Object3D): void {
    // Try to find parent group and identify element
    let current: THREE.Object3D | null = object;

    while (current) {
      if (current.userData.elementType) {
        this.selectElement(current.userData);
        return;
      }
      current = current.parent;
    }
  }

  private selectElement(userData: any): void {
    if (!this.onSelect) return;

    switch (userData.elementType) {
      case 'participant':
        {
          const participants = this.model.getParticipants();
          const participant = participants.find(p => p.id === userData.id);
          if (participant) {
            this.onSelect({ type: 'participant', data: participant });
          }
        }
        break;

      case 'message':
        {
          const statements = this.model.getStatements();
          const index = userData.index;
          const message = statements[index];
          if (message && 'sender' in message) {
            this.onSelect({ type: 'message', data: message as any, index });
          }
        }
        break;

      case 'note':
        {
          const statements = this.model.getStatements();
          const index = userData.index;
          const note = statements[index];
          if (note && 'position' in note) {
            this.onSelect({ type: 'note', data: note as any, index });
          }
        }
        break;
    }
  }

  dispose(): void {
    this.canvas.removeEventListener('click', (event) => this.onClick(event));
    this.canvas.removeEventListener('mousemove', (event) => this.onMouseMove(event));
  }
}
