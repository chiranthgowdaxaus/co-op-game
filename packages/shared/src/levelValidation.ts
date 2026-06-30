import type {
  LevelBox,
  LevelDefinition,
  LevelGemType,
  LevelHazardType,
  LevelLever,
} from "./levels.js";

const HAZARD_TYPES: LevelHazardType[] = ["water", "lava", "poison"];
const GEM_TYPES: LevelGemType[] = ["water", "fire"];

export function assertValidLevels(levels: LevelDefinition[]) {
  const errors = validateLevels(levels);
  if (errors.length > 0) {
    throw new Error(`Invalid level data:\n${errors.map((error) => `- ${error}`).join("\n")}`);
  }
}

export function validateLevels(levels: LevelDefinition[]) {
  const errors: string[] = [];
  const levelIds = new Set<string>();

  if (!Array.isArray(levels) || levels.length === 0) {
    return ["LEVELS must contain at least one level."];
  }

  levels.forEach((level, index) => {
    if (!isNonEmptyString(level.id)) {
      errors.push(`LEVELS[${index}] is missing a valid id.`);
      return;
    }

    if (levelIds.has(level.id)) {
      errors.push(`Duplicate level id "${level.id}".`);
    }
    levelIds.add(level.id);

    errors.push(...validateLevel(level));
  });

  return errors;
}

export function validateLevel(level: LevelDefinition) {
  const errors: string[] = [];
  const objectIds = new Set<string>();
  const label = level.id || "unknown-level";
  const playerSpawns = readArray(`${label}.playerSpawns`, level.playerSpawns, errors);
  const walls = readArray(`${label}.walls`, level.walls, errors);
  const doors = readArray(`${label}.doors`, level.doors, errors);
  const pressurePlates = readArray(`${label}.pressurePlates`, level.pressurePlates, errors);
  const platforms = readArray(`${label}.platforms`, level.platforms, errors);
  const levers = readArray(`${label}.levers`, level.levers, errors);
  const exits = readArray(`${label}.exits`, level.exits, errors);
  const hazards = readArray(`${label}.hazards`, level.hazards, errors);
  const gems = readArray(`${label}.gems`, level.gems, errors);

  if (!isNonEmptyString(level.name)) errors.push(`${label}: name is required.`);
  if (!isPositive(level.playerRadius)) {
    errors.push(`${label}: playerRadius must be a positive number.`);
  }

  validateBox(`${label}.floor`, level.floor, errors, { allowZeroY: true });
  validateBox(`${label}.playerBounds`, level.playerBounds, errors, {
    allowZeroY: true,
  });

  if (playerSpawns.length < 2) {
    errors.push(`${label}: fire and water playerSpawns are required.`);
  } else {
    playerSpawns.forEach((spawn, index) => {
      validateVector(`${label}.playerSpawns[${index}]`, spawn, errors);
      validateWithinBounds(`${label}.playerSpawns[${index}]`, spawn, level, errors);
    });
  }

  walls.forEach((wall) => {
    validateObjectId(label, "wall", wall.id, objectIds, errors);
    validateBox(`${label}.walls.${wall.id}`, wall, errors);
  });

  doors.forEach((door) => {
    validateObjectId(label, "door", door.id, objectIds, errors);
    validateBox(`${label}.doors.${door.id}`, door, errors);
    validateNumber(`${label}.doors.${door.id}.closedY`, door.closedY, errors);
    validateNumber(`${label}.doors.${door.id}.openY`, door.openY, errors);
  });

  pressurePlates.forEach((plate) => {
    validateObjectId(label, "pressurePlate", plate.id, objectIds, errors);
    validateBox(`${label}.pressurePlates.${plate.id}`, plate, errors);
  });

  platforms.forEach((platform) => {
    validateObjectId(label, "platform", platform.id, objectIds, errors);
    validateBox(`${label}.platforms.${platform.id}`, platform, errors);
  });

  levers.forEach((lever) => validateLever(label, lever, objectIds, errors));

  if (exits.length === 0) {
    errors.push(`${label}: at least one exit is required.`);
  }
  exits.forEach((exit) => {
    validateObjectId(label, "exit", exit.id, objectIds, errors);
    validateBox(`${label}.exits.${exit.id}`, exit, errors);
    validateNumber(`${label}.exits.${exit.id}.borderHeight`, exit.borderHeight, errors);
    validateWithinBounds(`${label}.exits.${exit.id}.position`, exit.position, level, errors);
  });

  hazards.forEach((hazard) => {
    validateObjectId(label, "hazard", hazard.id, objectIds, errors);
    validateBox(`${label}.hazards.${hazard.id}`, hazard, errors);
    if (!HAZARD_TYPES.includes(hazard.type)) {
      errors.push(`${label}.hazards.${hazard.id}.type must be water, lava, or poison.`);
    }
  });

  gems.forEach((gem) => {
    validateObjectId(label, "gem", gem.id, objectIds, errors);
    validateVector(`${label}.gems.${gem.id}.position`, gem.position, errors);
    validateNumber(`${label}.gems.${gem.id}.radius`, gem.radius, errors);
    if (!isPositive(gem.radius)) errors.push(`${label}.gems.${gem.id}.radius must be positive.`);
    if (!GEM_TYPES.includes(gem.type)) {
      errors.push(`${label}.gems.${gem.id}.type must be water or fire.`);
    }
    if (typeof gem.required !== "boolean") {
      errors.push(`${label}.gems.${gem.id}.required must be boolean.`);
    }
    if (gem.required) {
      validateWithinBounds(`${label}.gems.${gem.id}.position`, gem.position, level, errors);
    }
  });

  return errors;
}

function readArray<T>(path: string, value: T[], errors: string[]) {
  if (!Array.isArray(value)) {
    errors.push(`${path} must be an array.`);
    return [] as T[];
  }

  return value;
}

function validateLever(
  levelId: string,
  lever: LevelLever,
  ids: Set<string>,
  errors: string[],
) {
  validateObjectId(levelId, "lever", lever.id, ids, errors);
  validateVector(`${levelId}.levers.${lever.id}.position`, lever.position, errors);
  validateNumber(`${levelId}.levers.${lever.id}.interactDistance`, lever.interactDistance, errors);
  if (!isPositive(lever.interactDistance)) {
    errors.push(`${levelId}.levers.${lever.id}.interactDistance must be positive.`);
  }
  validateSize(`${levelId}.levers.${lever.id}.base.size`, lever.base.size, errors);
  validateSize(`${levelId}.levers.${lever.id}.stick.size`, lever.stick.size, errors);
}

function validateObjectId(
  levelId: string,
  type: string,
  id: string,
  ids: Set<string>,
  errors: string[],
) {
  if (!isNonEmptyString(id)) {
    errors.push(`${levelId}: ${type} is missing a valid id.`);
    return;
  }

  if (ids.has(id)) errors.push(`${levelId}: duplicate object id "${id}".`);
  ids.add(id);
}

function validateBox(
  path: string,
  box: LevelBox,
  errors: string[],
  options: { allowZeroY?: boolean } = {},
) {
  if (!box) {
    errors.push(`${path} is required.`);
    return;
  }

  validateVector(`${path}.position`, box.position, errors);
  validateSize(`${path}.size`, box.size, errors, options);
}

function validateVector(
  path: string,
  vector: { x: number; y: number; z: number },
  errors: string[],
) {
  if (!vector) {
    errors.push(`${path} is required.`);
    return;
  }

  validateNumber(`${path}.x`, vector.x, errors);
  validateNumber(`${path}.y`, vector.y, errors);
  validateNumber(`${path}.z`, vector.z, errors);
}

function validateSize(
  path: string,
  size: { x: number; y: number; z: number },
  errors: string[],
  options: { allowZeroY?: boolean } = {},
) {
  if (!size) {
    errors.push(`${path} is required.`);
    return;
  }

  validateNumber(`${path}.x`, size.x, errors);
  validateNumber(`${path}.y`, size.y, errors);
  validateNumber(`${path}.z`, size.z, errors);
  if (!isPositive(size.x)) errors.push(`${path}.x must be positive.`);
  if (options.allowZeroY ? size.y < 0 : !isPositive(size.y)) {
    errors.push(`${path}.y must be ${options.allowZeroY ? "zero or positive" : "positive"}.`);
  }
  if (!isPositive(size.z)) errors.push(`${path}.z must be positive.`);
}

function validateWithinBounds(
  path: string,
  position: { x: number; z: number },
  level: LevelDefinition,
  errors: string[],
) {
  const bounds = level.playerBounds;
  if (!bounds?.position || !bounds?.size) return;

  const minX = bounds.position.x - bounds.size.x / 2;
  const maxX = bounds.position.x + bounds.size.x / 2;
  const minZ = bounds.position.z - bounds.size.z / 2;
  const maxZ = bounds.position.z + bounds.size.z / 2;

  if (position.x < minX || position.x > maxX || position.z < minZ || position.z > maxZ) {
    errors.push(`${path} should be inside playerBounds.`);
  }
}

function validateNumber(path: string, value: number, errors: string[]) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    errors.push(`${path} must be a finite number.`);
  }
}

function isPositive(value: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
