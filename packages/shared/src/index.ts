export interface MovementInput {
  x: number;
  z: number;
}

export type PlayerCharacter = "water" | "fire";

export interface JoinOptions {
  character: PlayerCharacter;
}

export interface PlayerState {
  x: number;
  z: number;
  character: PlayerCharacter;
}

export interface RoomState {
  players: Map<string, PlayerState>;
  plateActive: boolean;
  leverActive: boolean;
  doorOpen: boolean;
  playersAtExit: number;
  levelComplete: boolean;
}
