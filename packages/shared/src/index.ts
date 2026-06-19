export interface MovementInput {
  x: number;
  z: number;
}

export type PlayerColor = "blue" | "orange";

export interface PlayerState {
  x: number;
  z: number;
  color: PlayerColor;
}

export interface RoomState {
  players: Map<string, PlayerState>;
  plateActive: boolean;
  leverActive: boolean;
  doorOpen: boolean;
  playersAtExit: number;
  levelComplete: boolean;
}
