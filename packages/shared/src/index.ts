export interface MovementInput {
  x: number;
  z: number;
  jump: boolean;
}

export type PlayerCharacter = "water" | "fire";

export type PlayerCharacterState = PlayerCharacter | "";

export interface CharacterSelection {
  character: PlayerCharacter;
}

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  velocityY: number;
  grounded: boolean;
  character: PlayerCharacterState;
}

export interface RoomState {
  currentLevelId: string;
  players: Map<string, PlayerState>;
  collectedGems: Map<string, boolean>;
  hazardStates: Map<string, boolean>;
  pressurePlateStates: Map<string, boolean>;
  leverStates: Map<string, boolean>;
  doorStates: Map<string, boolean>;
  plateActive: boolean;
  leverActive: boolean;
  doorOpen: boolean;
  playersAtExit: number;
  exitBlocked: boolean;
  levelComplete: boolean;
  allLevelsComplete: boolean;
}

export * from "./levels.js";
export * from "./levelValidation.js";
