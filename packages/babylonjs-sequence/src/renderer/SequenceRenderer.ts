import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, Color4 } from '@babylonjs/core';
import { AdvancedDynamicTexture } from '@babylonjs/gui';
import type { SequenceDiagram } from '../models/types';
import { ParticipantRenderer } from './ParticipantRenderer';
import { MessageRenderer } from './MessageRenderer';
import { NoteRenderer } from './NoteRenderer';
import { ControlRenderer } from './ControlRenderer';

export class SequenceRenderer {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private guiTexture: AdvancedDynamicTexture;

  private diagram: SequenceDiagram;

  private participantRenderer: ParticipantRenderer;
  private messageRenderer: MessageRenderer;
  private noteRenderer: NoteRenderer;
  private controlRenderer: ControlRenderer;

  constructor(canvas: HTMLCanvasElement, diagram: SequenceDiagram) {
    this.diagram = diagram;

    // Initialize engine
    this.engine = new Engine(canvas, true);

    // Create scene
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(1, 1, 1, 1);

    // Setup camera
    this.camera = new ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 3,
      100,
      new Vector3(0, 0, 0),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 10;
    this.camera.upperRadiusLimit = 500;

    // Add light
    const light = new HemisphericLight('light', new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.9;

    // Create GUI texture
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, this.scene);

    // Initialize renderers
    this.participantRenderer = new ParticipantRenderer(this.scene, this.guiTexture);
    this.messageRenderer = new MessageRenderer(this.scene, this.guiTexture);
    this.noteRenderer = new NoteRenderer(this.scene, this.guiTexture);
    this.controlRenderer = new ControlRenderer(this.scene, this.guiTexture);

    // Handle window resize
    window.addEventListener('resize', () => {
      this.engine.resize();
    });

    // Render loop
    this.engine.runRenderLoop(() => {
      this.scene.render();
    });
  }

  public render(): void {
    this.clear();

    const participantSpacing = 20;
    const lineHeight = 5;
    let currentY = 0;

    // Render participants
    const participantPositions = this.participantRenderer.renderParticipants(
      this.diagram.participants,
      participantSpacing
    );

    currentY = -10;

    // Render diagram elements
    for (const element of this.diagram.elements) {
      switch (element.type) {
        case 'message':
          this.messageRenderer.renderMessage(
            element.data,
            participantPositions,
            currentY
          );
          currentY -= lineHeight;
          break;

        case 'note':
          this.noteRenderer.renderNote(
            element.data,
            participantPositions,
            currentY
          );
          currentY -= lineHeight;
          break;

        case 'control':
          const height = this.controlRenderer.renderControl(
            element.data,
            participantPositions,
            currentY
          );
          currentY -= height + 2;
          break;

        case 'activation':
          // Handled by message renderer
          break;

        case 'create':
        case 'destroy':
          // Handled by participant renderer
          break;
      }
    }

    // Adjust camera target
    this.camera.setTarget(new Vector3(0, currentY / 2, 0));
  }

  public updateDiagram(diagram: SequenceDiagram): void {
    this.diagram = diagram;
    this.render();
  }

  private clear(): void {
    // Clear all rendered elements
    this.participantRenderer.clear();
    this.messageRenderer.clear();
    this.noteRenderer.clear();
    this.controlRenderer.clear();
  }

  public dispose(): void {
    this.scene.dispose();
    this.engine.dispose();
  }
}
