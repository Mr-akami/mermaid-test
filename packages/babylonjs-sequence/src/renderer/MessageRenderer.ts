import { Scene, MeshBuilder, Vector3, Mesh, StandardMaterial, Color3 } from '@babylonjs/core';
import { AdvancedDynamicTexture, TextBlock, Rectangle } from '@babylonjs/gui';
import type { Message, ArrowType } from '../models/types';

export class MessageRenderer {
  private scene: Scene;
  private guiTexture: AdvancedDynamicTexture;
  private meshes: Mesh[] = [];

  constructor(scene: Scene, guiTexture: AdvancedDynamicTexture) {
    this.scene = scene;
    this.guiTexture = guiTexture;
  }

  public renderMessage(
    message: Message,
    participantPositions: Map<string, number>,
    y: number
  ): void {
    const fromX = participantPositions.get(message.sender);
    const toX = participantPositions.get(message.receiver);

    if (fromX === undefined || toX === undefined) {
      console.warn(`Invalid participant reference in message: ${message.id}`);
      return;
    }

    this.renderArrow(fromX, toX, y, message.arrowType);

    if (message.text) {
      this.addMessageLabel(message.text, (fromX + toX) / 2, y);
    }
  }

  private renderArrow(
    fromX: number,
    toX: number,
    y: number,
    arrowType: ArrowType
  ): void {
    const isDashed = arrowType.includes('--');
    const direction = toX - fromX;
    const sign = Math.sign(direction);

    // Main line
    if (isDashed) {
      this.renderDashedLine(fromX, toX, y);
    } else {
      this.renderSolidLine(fromX, toX, y);
    }

    // Arrow head
    if (arrowType.includes('>>')) {
      this.renderArrowHead(toX, y, sign, 'solid');
    } else if (arrowType.includes(')')) {
      this.renderArrowHead(toX, y, sign, 'open');
    } else if (arrowType.includes('x') || arrowType.includes('X')) {
      this.renderXMark(toX, y);
    }

    // Both ends arrow
    if (arrowType.includes('<<')) {
      this.renderArrowHead(fromX, y, -sign, 'solid');
    }
  }

  private renderSolidLine(fromX: number, toX: number, y: number): void {
    const line = MeshBuilder.CreateLines(
      `line-${Date.now()}`,
      {
        points: [new Vector3(fromX, y, 0), new Vector3(toX, y, 0)],
      },
      this.scene
    );

    const material = new StandardMaterial(`line-mat-${Date.now()}`, this.scene);
    material.emissiveColor = new Color3(0, 0, 0);

    this.meshes.push(line);
  }

  private renderDashedLine(fromX: number, toX: number, y: number): void {
    const dashLength = 0.5;
    const gapLength = 0.3;
    const totalLength = Math.abs(toX - fromX);
    const direction = Math.sign(toX - fromX);

    let currentX = fromX;
    while (Math.abs(currentX - fromX) < totalLength) {
      const endX = Math.min(currentX + direction * dashLength, toX);
      const line = MeshBuilder.CreateLines(
        `dash-${Date.now()}-${currentX}`,
        {
          points: [new Vector3(currentX, y, 0), new Vector3(endX, y, 0)],
        },
        this.scene
      );

      const material = new StandardMaterial(`dash-mat-${Date.now()}`, this.scene);
      material.emissiveColor = new Color3(0, 0, 0);

      this.meshes.push(line);
      currentX = endX + direction * gapLength;
    }
  }

  private renderArrowHead(x: number, y: number, direction: number, _type: 'solid' | 'open'): void {
    const size = 0.5;
    const points = [
      new Vector3(x, y, 0),
      new Vector3(x - direction * size, y + size * 0.5, 0),
      new Vector3(x - direction * size, y - size * 0.5, 0),
      new Vector3(x, y, 0),
    ];

    const arrowHead = MeshBuilder.CreateLines(`arrow-${Date.now()}`, { points }, this.scene);

    const material = new StandardMaterial(`arrow-mat-${Date.now()}`, this.scene);
    material.emissiveColor = new Color3(0, 0, 0);

    this.meshes.push(arrowHead);
  }

  private renderXMark(x: number, y: number): void {
    const size = 0.4;
    const line1 = MeshBuilder.CreateLines(
      `x-${Date.now()}-1`,
      {
        points: [
          new Vector3(x - size, y - size, 0),
          new Vector3(x + size, y + size, 0),
        ],
      },
      this.scene
    );

    const line2 = MeshBuilder.CreateLines(
      `x-${Date.now()}-2`,
      {
        points: [
          new Vector3(x - size, y + size, 0),
          new Vector3(x + size, y - size, 0),
        ],
      },
      this.scene
    );

    const material = new StandardMaterial(`x-mat-${Date.now()}`, this.scene);
    material.emissiveColor = new Color3(0.8, 0, 0);

    this.meshes.push(line1, line2);
  }

  private addMessageLabel(text: string, _x: number, _y: number): void {
    const label = new TextBlock();
    label.text = text;
    label.color = 'black';
    label.fontSize = 14;

    const rect = new Rectangle();
    rect.width = '200px';
    rect.height = '25px';
    rect.thickness = 0;
    rect.background = 'white';
    rect.addControl(label);

    this.guiTexture.addControl(rect);
  }

  public clear(): void {
    this.meshes.forEach(mesh => mesh.dispose());
    this.meshes = [];
  }
}
