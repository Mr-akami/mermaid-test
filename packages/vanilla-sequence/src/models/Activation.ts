export class Activation {
  id: string;
  participantId: string;
  startOrder: number; // どのメッセージの後に開始するか
  endOrder: number;   // どのメッセージの後に終了するか
  nestLevel: number;  // ネストレベル（同じparticipantの中での深さ）

  constructor(participantId: string, startOrder: number, endOrder: number, nestLevel: number = 0) {
    this.id = `activation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.participantId = participantId;
    this.startOrder = startOrder;
    this.endOrder = endOrder;
    this.nestLevel = nestLevel;
  }
}
