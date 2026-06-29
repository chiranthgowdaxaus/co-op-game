export interface LevelPoint {
  x: number;
  z: number;
}

export interface LevelRect extends LevelPoint {
  width: number;
  depth: number;
}

export interface LevelBox extends LevelRect {
  height: number;
}

export interface LevelDoor extends LevelBox {
  id: string;
  closedY: number;
  openY: number;
}

export interface LevelWall extends LevelBox {
  id: string;
}

export interface LevelPressurePlate extends LevelBox {
  id: string;
}

export interface LevelLever extends LevelPoint {
  id: string;
  interactDistance: number;
  base: {
    width: number;
    height: number;
    depth: number;
  };
  stick: {
    width: number;
    height: number;
    depth: number;
  };
}

export interface LevelExit extends LevelBox {
  id: string;
  borderHeight: number;
}

export type LevelHazardType = "water" | "lava" | "poison";

export interface LevelHazard {
  id: string;
  type: LevelHazardType;
  position: LevelPoint;
  size: {
    width: number;
    depth: number;
  };
}

export type LevelGemType = "water" | "fire";

export interface LevelGem {
  id: string;
  type: LevelGemType;
  position: LevelPoint;
  radius: number;
  required: boolean;
}

export interface LevelDefinition {
  id: string;
  name: string;
  playerRadius: number;
  floor: LevelRect;
  playerBounds: LevelRect;
  playerSpawns: LevelPoint[];
  walls: LevelWall[];
  doors: LevelDoor[];
  pressurePlates: LevelPressurePlate[];
  levers: LevelLever[];
  exits: LevelExit[];
  hazards: LevelHazard[];
  gems: LevelGem[];
}

export const TUTORIAL_LEVEL: LevelDefinition = {
  id: "tutorial-pressure-lever",
  name: "Tutorial Pressure Lever",
  playerRadius: 0.5,
  floor: { x: 0, z: 0, width: 20, depth: 20 },
  playerBounds: { x: 0, z: 0, width: 18, depth: 18 },
  playerSpawns: [
    { x: -2, z: 0 },
    { x: 2, z: 0 },
  ],
  walls: [
    { id: "left-door-wall", x: -6, z: 3, width: 6, height: 3, depth: 0.5 },
    { id: "right-door-wall", x: 6, z: 3, width: 6, height: 3, depth: 0.5 },
  ],
  doors: [
    {
      id: "main-door",
      x: 0,
      z: 3,
      width: 6,
      height: 3,
      depth: 0.5,
      closedY: 1.5,
      openY: 4.5,
    },
  ],
  pressurePlates: [
    { id: "main-pressure-plate", x: 0, z: 0, width: 1.8, height: 0.15, depth: 1.8 },
  ],
  levers: [
    {
      id: "main-lever",
      x: 3,
      z: 5,
      interactDistance: 1.5,
      base: { width: 0.7, height: 0.25, depth: 0.7 },
      stick: { width: 0.15, height: 1.2, depth: 0.15 },
    },
  ],
  exits: [
    {
      id: "main-exit",
      x: 0,
      z: 7,
      width: 4,
      height: 0.08,
      depth: 3,
      borderHeight: 0.12,
    },
  ],
  hazards: [
    {
      id: "water-pool",
      type: "water",
      position: { x: -3, z: 5 },
      size: { width: 1.8, depth: 1.8 },
    },
    {
      id: "lava-pool",
      type: "lava",
      position: { x: 3, z: 6.5 },
      size: { width: 1.8, depth: 1.8 },
    },
    {
      id: "poison-pool",
      type: "poison",
      position: { x: 0, z: -3 },
      size: { width: 1.8, depth: 1.4 },
    },
  ],
  gems: [
    {
      id: "water-gem",
      type: "water",
      position: { x: -4, z: -1.8 },
      radius: 0.35,
      required: true,
    },
    {
      id: "fire-gem",
      type: "fire",
      position: { x: 4, z: 4.5 },
      radius: 0.35,
      required: true,
    },
  ],
};
