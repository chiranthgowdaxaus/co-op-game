import type { LevelDefinition } from "./levels.js";

// Template only. Copy this into levels.ts, rename ids, tune positions, then add
// the finished level to LEVELS. This file is not registered as gameplay.
export const SIDE_VIEW_LEVEL_TEMPLATE: LevelDefinition = {
  id: "side-view-template",
  name: "Side View Template",
  playerRadius: 0.5,
  floor: {
    position: { x: 10, y: 0, z: 3 },
    size: { x: 24, y: 0, z: 2.4 },
  },
  playerBounds: {
    position: { x: 10, y: 0, z: 0 },
    size: { x: 24, y: 0, z: 8 },
  },
  playerSpawns: [
    { x: 0, y: 3, z: -3 },
    { x: 0, y: 0, z: 3 },
  ],
  walls: [
    {
      id: "template-blocker",
      position: { x: 8, y: 1, z: 3 },
      size: { x: 0.5, y: 2, z: 2.2 },
    },
  ],
  doors: [
    {
      id: "template-door",
      position: { x: 14, y: 1.5, z: 3 },
      size: { x: 0.5, y: 3, z: 2.2 },
      closedY: 1.5,
      openY: 4.5,
    },
  ],
  pressurePlates: [
    {
      id: "template-plate",
      position: { x: 5, y: 0.075, z: 3 },
      size: { x: 1.8, y: 0.15, z: 1.8 },
    },
  ],
  platforms: [
    {
      id: "template-top-lane",
      position: { x: 10, y: 2.75, z: -3 },
      size: { x: 18, y: 0.5, z: 2.4 },
    },
    {
      id: "template-bottom-step",
      position: { x: 8, y: 0.5, z: 3 },
      size: { x: 3, y: 1, z: 2.4 },
    },
  ],
  levers: [
    {
      id: "template-lever",
      position: { x: 16, y: 0, z: 3 },
      interactDistance: 1.5,
      base: {
        size: { x: 0.7, y: 0.25, z: 0.7 },
      },
      stick: {
        size: { x: 0.15, y: 1.2, z: 0.15 },
      },
    },
  ],
  hazards: [
    {
      id: "template-lava",
      type: "lava",
      position: { x: 7, y: 3.035, z: -3 },
      size: { x: 2, y: 0.06, z: 1.8 },
    },
    {
      id: "template-water",
      type: "water",
      position: { x: 7, y: 0.035, z: 3 },
      size: { x: 2, y: 0.06, z: 1.8 },
    },
  ],
  gems: [
    {
      id: "template-fire-gem",
      type: "fire",
      position: { x: 6, y: 3.6, z: -3 },
      radius: 0.35,
      required: true,
    },
    {
      id: "template-water-gem",
      type: "water",
      position: { x: 6, y: 0.6, z: 3 },
      radius: 0.35,
      required: true,
    },
  ],
  exits: [
    {
      id: "template-top-exit",
      position: { x: 20, y: 3.04, z: -3 },
      size: { x: 2.5, y: 0.08, z: 2 },
      borderHeight: 0.12,
    },
    {
      id: "template-bottom-exit",
      position: { x: 20, y: 0.04, z: 3 },
      size: { x: 2.5, y: 0.08, z: 2 },
      borderHeight: 0.12,
    },
  ],
};
