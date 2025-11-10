import { Scene, MeshBuilder, StandardMaterial, Color3, Vector3, Mesh } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Rectangle } from '@babylonjs/gui';
import type { Participant } from '../models/types';
import { ParticipantType } from '../models/types';

export class ParticipantRenderer {
  private scene: Scene;
  private guiTexture: AdvancedDynamicTexture;
  private meshes: Mesh[] = [];

  constructor(scene: Scene, guiTexture: AdvancedDynamicTexture) {
    this.scene = scene;
    this.guiTexture = guiTexture;
  }

  public renderParticipants(
    participants: Participant[],
    spacing: number
  ): Map<string, number> {
    const positions = new Map<string, number>();
    const totalWidth = (participants.length - 1) * spacing;
    const startX = -totalWidth / 2;

    participants.forEach((participant, index) => {
      const x = startX + index * spacing;
      positions.set(participant.id, x);

      this.renderParticipant(participant, x, 0);
    });

    return positions;
  }

  private renderParticipant(participant: Participant, x: number, y: number): void {
    if (participant.type === ParticipantType.PARTICIPANT) {
      this.renderParticipantBox(participant, x, y);
    } else {
      this.renderActor(participant, x, y);
    }

    // Render lifeline
    this.renderLifeline(x, y - 2);
  }

  private renderParticipantBox(participant: Participant, x: number, y: number): void {
    const box = MeshBuilder.CreateBox(
      `participant-${participant.id}`,
      { width: 8, height: 3, depth: 0.5 },
      this.scene
    );
    box.position = new Vector3(x, y, 0);

    const material = new StandardMaterial(`mat-${participant.id}`, this.scene);
    material.diffuseColor = new Color3(0.9, 0.9, 1);
    material.specularColor = new Color3(0.2, 0.2, 0.2);
    box.material = material;

    this.meshes.push(box);

    // Add label
    this.addLabel(participant.label || participant.id, x, y);
  }

  private renderActor(participant: Participant, x: number, y: number): void {
    // Head
    const head = MeshBuilder.CreateSphere(
      `actor-head-${participant.id}`,
      { diameter: 1.5 },
      this.scene
    );
    head.position = new Vector3(x, y + 1, 0);

    // Body (cylinder)
    const body = MeshBuilder.CreateCylinder(
      `actor-body-${participant.id}`,
      { height: 3, diameter: 0.3 },
      this.scene
    );
    body.position = new Vector3(x, y - 1, 0);

    const material = new StandardMaterial(`mat-${participant.id}`, this.scene);
    material.diffuseColor = new Color3(0.9, 0.9, 1);
    material.specularColor = new Color3(0.2, 0.2, 0.2);

    head.material = material;
    body.material = material;

    this.meshes.push(head, body);

    // Add label
    this.addLabel(participant.label || participant.id, x, y - 3);
  }

  private renderLifeline(x: number, startY: number): void {
    const lifeline = MeshBuilder.CreateLines(
      `lifeline-${x}`,
      {
        points: [
          new Vector3(x, startY, 0),
          new Vector3(x, startY - 100, 0),
        ],
      },
      this.scene
    );

    const material = new StandardMaterial(`lifeline-mat-${x}`, this.scene);
    material.emissiveColor = new Color3(0.7, 0.7, 0.7);

    this.meshes.push(lifeline);
  }

  private addLabel(text: string, _x: number, _y: number): void {
    const label = new TextBlock();
    label.text = text;
    label.color = 'black';
    label.fontSize = 16;
    label.fontWeight = 'bold';

    // Position in screen space
    const rect = new Rectangle();
    rect.width = '120px';
    rect.height = '30px';
    rect.thickness = 0;
    rect.addControl(label);

    this.guiTexture.addControl(rect);

    // Link to world position
    rect.linkWithMesh(this.meshes[this.meshes.length - 1]);
    rect.linkOffsetY = -50;
  }

  public clear(): void {
    this.meshes.forEach(mesh => mesh.dispose());
    this.meshes = [];
  }
}
