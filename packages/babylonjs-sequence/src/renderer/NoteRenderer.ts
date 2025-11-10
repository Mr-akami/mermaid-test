import { Scene, MeshBuilder, Vector3, Mesh, StandardMaterial, Color3 } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Rectangle } from '@babylonjs/gui';
import type { Note } from '../models/types';
import { NotePosition } from '../models/types';

export class NoteRenderer {
  private scene: Scene;
  private guiTexture: AdvancedDynamicTexture;
  private meshes: Mesh[] = [];

  constructor(scene: Scene, guiTexture: AdvancedDynamicTexture) {
    this.scene = scene;
    this.guiTexture = guiTexture;
  }

  public renderNote(
    note: Note,
    participantPositions: Map<string, number>,
    y: number
  ): void {
    let x: number;
    let width = 6;

    if (note.position === NotePosition.OVER && note.participants.length === 2) {
      const x1 = participantPositions.get(note.participants[0]);
      const x2 = participantPositions.get(note.participants[1]);
      if (x1 === undefined || x2 === undefined) {
        console.warn(`Invalid participant reference in note: ${note.id}`);
        return;
      }
      x = (x1 + x2) / 2;
      width = Math.abs(x2 - x1) + 4;
    } else {
      const participantX = participantPositions.get(note.participants[0]);
      if (participantX === undefined) {
        console.warn(`Invalid participant reference in note: ${note.id}`);
        return;
      }

      if (note.position === NotePosition.LEFT) {
        x = participantX - 5;
      } else if (note.position === NotePosition.RIGHT) {
        x = participantX + 5;
      } else {
        x = participantX;
      }
    }

    this.renderNoteBox(note, x, y, width);
  }

  private renderNoteBox(note: Note, x: number, y: number, width: number): void {
    const height = 2.5;

    // Create note box
    const box = MeshBuilder.CreateBox(
      `note-${note.id}`,
      { width, height, depth: 0.5 },
      this.scene
    );
    box.position = new Vector3(x, y, 0);

    const material = new StandardMaterial(`note-mat-${note.id}`, this.scene);
    material.diffuseColor = new Color3(1, 1, 0.8);
    material.specularColor = new Color3(0.1, 0.1, 0.1);
    box.material = material;

    this.meshes.push(box);

    // Add text
    this.addNoteLabel(note.text, x, y);
  }

  private addNoteLabel(text: string, _x: number, _y: number): void {
    const label = new TextBlock();
    label.text = text;
    label.color = 'black';
    label.fontSize = 13;
    label.textWrapping = true;

    const rect = new Rectangle();
    rect.width = '180px';
    rect.height = '60px';
    rect.thickness = 0;
    rect.addControl(label);

    this.guiTexture.addControl(rect);
  }

  public clear(): void {
    this.meshes.forEach(mesh => mesh.dispose());
    this.meshes = [];
  }
}
