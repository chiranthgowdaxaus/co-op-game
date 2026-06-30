export interface LevelVector3 {
  x: number;
  y: number;
  z: number;
}

export interface LevelSize3 {
  x: number;
  y: number;
  z: number;
}

export interface LevelBox {
  position: LevelVector3;
  size: LevelSize3;
}

export interface LevelWall extends LevelBox {
  id: string;
}

export interface LevelDoorControls {
  pressurePlateIds?: string[];
  leverIds?: string[];
}

export interface LevelDoor extends LevelBox {
  id: string;
  closedY: number;
  openY: number;
  opensWith?: LevelDoorControls;
}

export interface LevelPressurePlate extends LevelBox {
  id: string;
}

export interface LevelPlatform extends LevelBox {
  id: string;
}

export interface LevelLever {
  id: string;
  position: LevelVector3;
  interactDistance: number;
  base: {
    size: LevelSize3;
  };
  stick: {
    size: LevelSize3;
  };
}

export interface LevelExit extends LevelBox {
  id: string;
  borderHeight: number;
  character?: "water" | "fire";
}

export type LevelHazardType = "water" | "lava" | "poison";

export interface LevelHazard extends LevelBox {
  id: string;
  type: LevelHazardType;
}

export type LevelGemType = "water" | "fire";

export interface LevelGem {
  id: string;
  type: LevelGemType;
  position: LevelVector3;
  radius: number;
  required: boolean;
}

export interface LevelDefinition {
  id: string;
  name: string;
  playerRadius: number;
  floor: LevelBox;
  playerBounds: LevelBox;
  playerSpawns: LevelVector3[];
  walls: LevelWall[];
  doors: LevelDoor[];
  pressurePlates: LevelPressurePlate[];
  platforms: LevelPlatform[];
  levers: LevelLever[];
  exits: LevelExit[];
  hazards: LevelHazard[];
  gems: LevelGem[];
}

export const LEVEL_1: LevelDefinition = {
  id: "level-1",
  name: "Cross-Lane Side-View Tutorial",
  playerRadius: 0.5,
  floor: {
    position: { x: 19, y: 0, z: 3 },
    size: { x: 42, y: 0, z: 2.4 },
  },
  playerBounds: {
    position: { x: 19, y: 0, z: 0 },
    size: { x: 42, y: 0, z: 8 },
  },
  playerSpawns: [
    { x: 0, y: 3, z: -3 },
    { x: 0, y: 0, z: 3 },
  ],
  walls: [],
  doors: [
    {
      id: "fire-gate",
      position: { x: 18, y: 4.5, z: -3 },
      size: { x: 0.5, y: 3, z: 2.2 },
      closedY: 4.5,
      openY: 7.5,
      opensWith: { pressurePlateIds: ["water-button"] },
    },
    {
      id: "water-gate",
      position: { x: 18, y: 1.5, z: 3 },
      size: { x: 0.5, y: 3, z: 2.2 },
      closedY: 1.5,
      openY: 4.5,
      opensWith: { leverIds: ["fire-lever"] },
    },
  ],
  pressurePlates: [
    {
      id: "water-button",
      position: { x: 8, y: 0.075, z: 3 },
      size: { x: 1.8, y: 0.15, z: 1.8 },
    },
  ],
  platforms: [
    {
      id: "top-lane-start",
      position: { x: 8.5, y: 2.75, z: -3 },
      size: { x: 20, y: 0.5, z: 2.4 },
    },
    {
      id: "top-lane-finish",
      position: { x: 28, y: 2.75, z: -3 },
      size: { x: 21, y: 0.5, z: 2.4 },
    },
    {
      id: "bottom-hop-step",
      position: { x: 13, y: 0.45, z: 3 },
      size: { x: 2.5, y: 0.9, z: 2.4 },
    },
  ],
  levers: [
    {
      id: "fire-lever",
      position: { x: 23, y: 3, z: -3 },
      interactDistance: 1.5,
      base: {
        size: { x: 0.7, y: 0.25, z: 0.7 },
      },
      stick: {
        size: { x: 0.15, y: 1.2, z: 0.15 },
      },
    },
  ],
  exits: [
    {
      id: "fire-exit",
      character: "fire",
      position: { x: 36, y: 3.04, z: -3 },
      size: { x: 2.5, y: 0.08, z: 2 },
      borderHeight: 0.12,
    },
    {
      id: "water-exit",
      character: "water",
      position: { x: 36, y: 0.04, z: 3 },
      size: { x: 2.5, y: 0.08, z: 2 },
      borderHeight: 0.12,
    },
  ],
  hazards: [
    {
      id: "fire-lane-lava",
      type: "lava",
      position: { x: 5, y: 3.035, z: -3 },
      size: { x: 2, y: 0.06, z: 1.8 },
    },
    {
      id: "fire-lane-poison",
      type: "poison",
      position: { x: 12, y: 3.035, z: -3 },
      size: { x: 1.4, y: 0.06, z: 1.8 },
    },
    {
      id: "water-lane-water",
      type: "water",
      position: { x: 5, y: 0.035, z: 3 },
      size: { x: 2, y: 0.06, z: 1.8 },
    },
    {
      id: "water-lane-poison",
      type: "poison",
      position: { x: 12, y: 0.035, z: 3 },
      size: { x: 1.4, y: 0.06, z: 1.8 },
    },
  ],
  gems: [
    {
      id: "fire-lane-gem",
      type: "fire",
      position: { x: 29, y: 3.65, z: -3 },
      radius: 0.35,
      required: true,
    },
    {
      id: "water-lane-gem",
      type: "water",
      position: { x: 29, y: 0.65, z: 3 },
      radius: 0.35,
      required: true,
    },
  ],
};

export const LEVEL_2: LevelDefinition = {
  id: "level-2",
  name: "Side View Lane Prototype",
  playerRadius: 0.5,
  floor: {
    position: { x: 17.5, y: 0, z: 3 },
    size: { x: 39, y: 0, z: 2.4 },
  },
  playerBounds: {
    position: { x: 17.5, y: 0, z: 0 },
    size: { x: 39, y: 0, z: 8 },
  },
  playerSpawns: [
    { x: 0, y: 3, z: -3 },
    { x: 0, y: 0, z: 3 },
  ],
  walls: [],
  doors: [
    {
      id: "top-lane-door",
      position: { x: 18, y: 4.5, z: -3 },
      size: { x: 0.5, y: 3, z: 2.2 },
      closedY: 4.5,
      openY: 7.5,
    },
    {
      id: "bottom-lane-door",
      position: { x: 18, y: 1.5, z: 3 },
      size: { x: 0.5, y: 3, z: 2.2 },
      closedY: 1.5,
      openY: 4.5,
    },
  ],
  pressurePlates: [
    {
      id: "bottom-lane-plate",
      position: { x: 6, y: 0.075, z: 3 },
      size: { x: 1.8, y: 0.15, z: 1.8 },
    },
  ],
  platforms: [
    {
      id: "top-lane-start",
      position: { x: 7.5, y: 2.75, z: -3 },
      size: { x: 17, y: 0.5, z: 2.4 },
    },
    {
      id: "top-lane-finish",
      position: { x: 27, y: 2.75, z: -3 },
      size: { x: 18, y: 0.5, z: 2.4 },
    },
    {
      id: "top-lane-step",
      position: { x: 11, y: 3.5, z: -3 },
      size: { x: 3, y: 1, z: 2.4 },
    },
    {
      id: "bottom-lane-step",
      position: { x: 11, y: 0.5, z: 3 },
      size: { x: 3, y: 1, z: 2.4 },
    },
  ],
  levers: [
    {
      id: "top-lane-lever",
      position: { x: 23, y: 3, z: -3 },
      interactDistance: 1.5,
      base: {
        size: { x: 0.7, y: 0.25, z: 0.7 },
      },
      stick: {
        size: { x: 0.15, y: 1.2, z: 0.15 },
      },
    },
  ],
  exits: [
    {
      id: "top-lane-exit",
      position: { x: 34, y: 3.04, z: -3 },
      size: { x: 2.5, y: 0.08, z: 2 },
      borderHeight: 0.12,
    },
    {
      id: "bottom-lane-exit",
      position: { x: 34, y: 0.04, z: 3 },
      size: { x: 2.5, y: 0.08, z: 2 },
      borderHeight: 0.12,
    },
  ],
  hazards: [
    {
      id: "top-lane-lava",
      type: "lava",
      position: { x: 13.5, y: 3.035, z: -3 },
      size: { x: 2, y: 0.06, z: 1.8 },
    },
    {
      id: "bottom-lane-water",
      type: "water",
      position: { x: 13.5, y: 0.035, z: 3 },
      size: { x: 2, y: 0.06, z: 1.8 },
    },
    {
      id: "bottom-lane-poison",
      type: "poison",
      position: { x: 27, y: 0.035, z: 3 },
      size: { x: 1.8, y: 0.06, z: 1.8 },
    },
  ],
  gems: [
    {
      id: "fire-lane-gem",
      type: "fire",
      position: { x: 12.5, y: 4.35, z: -3 },
      radius: 0.35,
      required: true,
    },
    {
      id: "water-lane-gem",
      type: "water",
      position: { x: 12.5, y: 1.35, z: 3 },
      radius: 0.35,
      required: true,
    },
  ],
};

export const LEVELS: LevelDefinition[] = [LEVEL_1, LEVEL_2];

export const FIRST_LEVEL_ID = LEVELS[0].id;

export const LEVEL_REGISTRY: Record<string, LevelDefinition> = Object.fromEntries(
  LEVELS.map((level) => [level.id, level]),
);

export function getLevelDefinition(levelId: string) {
  return LEVEL_REGISTRY[levelId] ?? LEVEL_1;
}

export function getNextLevelId(levelId: string) {
  const index = LEVELS.findIndex((level) => level.id === levelId);
  return index >= 0 ? LEVELS[index + 1]?.id ?? null : null;
}
