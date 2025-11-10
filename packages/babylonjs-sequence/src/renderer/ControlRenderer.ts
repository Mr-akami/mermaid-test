import { Scene, MeshBuilder, Vector3, Mesh, StandardMaterial, Color3 } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Rectangle } from '@babylonjs/gui';
import type { ControlStructure } from '../models/types';
import { ControlType } from '../models/types';

export class ControlRenderer {
  private scene: Scene;
  private guiTexture: AdvancedDynamicTexture;
  private meshes: Mesh[] = [];

  constructor(scene: Scene, guiTexture: AdvancedDynamicTexture) {
    this.scene = scene;
    this.guiTexture = guiTexture;
  }

  public renderControl(
    control: ControlStructure,
    participantPositions: Map<string, number>,
    startY: number
  ): number {
    const positions = Array.from(participantPositions.values());
    const minX = Math.min(...positions) - 2;
    const maxX = Math.max(...positions) + 2;
    const width = maxX - minX;

    let currentY = startY;
    const branchHeight = 8;
    const totalHeight = control.branches.length * branchHeight;

    // Render background box
    this.renderControlBox(
      control,
      (minX + maxX) / 2,
      currentY - totalHeight / 2,
      width,
      totalHeight
    );

    // Render label
    if (control.label) {
      this.addControlLabel(control.type, control.label, minX, currentY);
    }

    return totalHeight;
  }

  private renderControlBox(
    control: ControlStructure,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const box = MeshBuilder.CreatePlane(
      `control-${control.id}`,
      { width, height },
      this.scene
    );
    box.position = new Vector3(x, y, -0.5);

    const material = new StandardMaterial(`control-mat-${control.id}`, this.scene);

    if (control.type === ControlType.RECT) {
      const color = this.parseColor(control.color || 'rgba(200, 200, 200, 0.3)');
      material.diffuseColor = color;
      material.alpha = 0.3;
    } else {
      material.diffuseColor = new Color3(0.95, 0.95, 0.95);
      material.alpha = 0.5;
    }

    box.material = material;

    // Border
    const border = this.createBorder(width, height);
    border.position = new Vector3(x, y, -0.4);

    this.meshes.push(box, border);
  }

  private createBorder(width: number, height: number): Mesh {
    const points = [
      new Vector3(-width / 2, height / 2, 0),
      new Vector3(width / 2, height / 2, 0),
      new Vector3(width / 2, -height / 2, 0),
      new Vector3(-width / 2, -height / 2, 0),
      new Vector3(-width / 2, height / 2, 0),
    ];

    const border = MeshBuilder.CreateLines(`border-${Date.now()}`, { points }, this.scene);

    const material = new StandardMaterial(`border-mat-${Date.now()}`, this.scene);
    material.emissiveColor = new Color3(0.5, 0.5, 0.5);

    return border;
  }

  private parseColor(colorStr: string): Color3 {
    if (colorStr.startsWith('rgb')) {
      const match = colorStr.match(/\d+/g);
      if (match && match.length >= 3) {
        return new Color3(
          parseInt(match[0]) / 255,
          parseInt(match[1]) / 255,
          parseInt(match[2]) / 255
        );
      }
    }
    return new Color3(0.8, 0.8, 0.8);
  }

  private addControlLabel(type: ControlType, label: string, _x: number, _y: number): void {
    const text = new TextBlock();
    text.text = `${type}: ${label}`;
    text.color = 'black';
    text.fontSize = 14;
    text.fontWeight = 'bold';

    const rect = new Rectangle();
    rect.width = '200px';
    rect.height = '30px';
    rect.thickness = 0;
    rect.background = 'rgba(255, 255, 255, 0.8)';
    rect.addControl(text);

    this.guiTexture.addControl(rect);
  }

  public clear(): void {
    this.meshes.forEach(mesh => mesh.dispose());
    this.meshes = [];
  }
}
