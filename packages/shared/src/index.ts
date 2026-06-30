export interface MovementInput {
  x: number;
  z: number;
}

export type PlayerCharacter = "water" | "fire";

export type PlayerCharacterState = PlayerCharacter | "";

export interface CharacterSelection {
  character: PlayerCharacter;
}

export interface PlayerState {
  x: number;
  z: number;
  character: PlayerCharacterState;
}

export interface RoomState {
  currentLevelId: string;
  players: Map<string, PlayerState>;
  collectedGems: Map<string, boolean>;
  hazardStates: Map<string, boolean>;
  plateActive: boolean;
  leverActive: boolean;
  doorOpen: boolean;
  playersAtExit: number;
  exitBlocked: boolean;
  levelComplete: boolean;
  allLevelsComplete: boolean;
}

export * from "./levels.js";
