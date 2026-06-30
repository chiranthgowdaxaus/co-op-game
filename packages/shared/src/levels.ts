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

export interface LevelDoor extends LevelBox {
  id: string;
  closedY: number;
  openY: number;
}

export interface LevelPressurePlate extends LevelBox {
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
  levers: LevelLever[];
  exits: LevelExit[];
  hazards: LevelHazard[];
  gems: LevelGem[];
}

export const LEVEL_1: LevelDefinition = {
  id: "level-1",
  name: "Tutorial Pressure Lever",
  playerRadius: 0.5,
  floor: {
    position: { x: 0, y: 0, z: 0 },
    size: { x: 20, y: 0, z: 20 },
  },
  playerBounds: {
    position: { x: 0, y: 0, z: 0 },
    size: { x: 18, y: 0, z: 18 },
  },
  playerSpawns: [
    { x: -2, y: 0, z: 0 },
    { x: 2, y: 0, z: 0 },
  ],
  walls: [
    {
      id: "left-door-wall",
      position: { x: -6, y: 1.5, z: 3 },
      size: { x: 6, y: 3, z: 0.5 },
    },
    {
      id: "right-door-wall",
      position: { x: 6, y: 1.5, z: 3 },
      size: { x: 6, y: 3, z: 0.5 },
    },
  ],
  doors: [
    {
      id: "main-door",
      position: { x: 0, y: 1.5, z: 3 },
      size: { x: 6, y: 3, z: 0.5 },
      closedY: 1.5,
      openY: 4.5,
    },
  ],
  pressurePlates: [
    {
      id: "main-plate",
      position: { x: 0, y: 0.075, z: 0 },
      size: { x: 1.8, y: 0.15, z: 1.8 },
    },
  ],
  levers: [
    {
      id: "main-lever",
      position: { x: 3, y: 0, z: 5 },
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
      id: "main-exit",
      position: { x: 0, y: 0.04, z: 7 },
      size: { x: 4, y: 0.08, z: 3 },
      borderHeight: 0.12,
    },
  ],
  hazards: [
    {
      id: "water-pool",
      type: "water",
      position: { x: -3, y: 0.035, z: 5 },
      size: { x: 1.8, y: 0.06, z: 1.8 },
    },
    {
      id: "lava-pool",
      type: "lava",
      position: { x: 3, y: 0.035, z: 6.5 },
      size: { x: 1.8, y: 0.06, z: 1.8 },
    },
    {
      id: "poison-pool",
      type: "poison",
      position: { x: 0, y: 0.035, z: -3 },
      size: { x: 1.8, y: 0.06, z: 1.4 },
    },
  ],
  gems: [
    {
      id: "water-gem-1",
      type: "water",
      position: { x: -4, y: 0.47, z: -1.8 },
      radius: 0.35,
      required: true,
    },
    {
      id: "fire-gem-1",
      type: "fire",
      position: { x: 4, y: 0.47, z: 4.5 },
      radius: 0.35,
      required: true,
    },
  ],
};

export const LEVEL_2: LevelDefinition = {
  ...LEVEL_1,
  id: "level-2",
  name: "Level 2 Placeholder",
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
