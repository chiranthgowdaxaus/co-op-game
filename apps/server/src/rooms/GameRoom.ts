import { MapSchema, Schema, type } from "@colyseus/schema";
import { Client, Room } from "colyseus";
import type {
  CharacterSelection,
  LevelBox,
  LevelGem,
  LevelHazard,
  MovementInput,
  PlayerCharacter,
  PlayerCharacterState,
} from "@coop/shared";
import { FIRST_LEVEL_ID, getLevelDefinition, getNextLevelId } from "@coop/shared";

const ROOM_CODES = "$room_codes";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const TICK_MS = 50;
const MOVE_SPEED = 4;
const GRAVITY = 14;
const JUMP_SPEED = 5.4;
const GROUND_EPSILON = 0.05;
const FALL_RESPAWN_Y = -6;
const COLLISION_MARGIN = 0.01;

class PlayerSchema extends Schema {
  @type("float32") x = 0;
  @type("float32") y = 0;
  @type("float32") z = 0;
  @type("float32") velocityY = 0;
  @type("boolean") grounded = true;
  @type("uint8") spawnIndex = 0;
  @type("string") character: PlayerCharacterState = "";
}

class GameStateSchema extends Schema {
  @type("string") currentLevelId = FIRST_LEVEL_ID;
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type({ map: "boolean" }) collectedGems = new MapSchema<boolean>();
  @type({ map: "boolean" }) hazardStates = new MapSchema<boolean>();
  @type("boolean") plateActive = false;
  @type("boolean") leverActive = false;
  @type("boolean") doorOpen = false;
  @type("uint8") playersAtExit = 0;
  @type("boolean") exitBlocked = false;
  @type("boolean") levelComplete = false;
  @type("boolean") allLevelsComplete = false;
}

export class GameRoom extends Room<{ state: GameStateSchema }> {
  maxClients = 2;

  private readonly inputs = new Map<string, MovementInput>();

  private get level() {
    return getLevelDefinition(this.state.currentLevelId);
  }

  async onCreate() {
    this.roomId = await this.generateRoomCode();
    this.setState(new GameStateSchema());
    this.resetLevel(FIRST_LEVEL_ID);

    this.onMessage("input", (client, message: unknown) => {
      this.inputs.set(client.sessionId, this.sanitizeInput(message));
    });

    this.onMessage("selectCharacter", (client, message: unknown) => {
      const player = this.state.players.get(client.sessionId);
      const character = this.getSelectedCharacter(message);

      if (!player || player.character) return;
      if (!character) {
        client.send("selectionError", "Choose Water or Fire");
        return;
      }
      if (this.isCharacterTaken(character)) {
        client.send("selectionError", `${this.characterName(character)} is already taken`);
        return;
      }

      player.character = character;
    });

    this.onMessage("interact", (client) => {
      if (!this.gameReady()) return;

      const player = this.state.players.get(client.sessionId);
      if (
        player &&
        this.level.levers.some(
          (lever) =>
            Math.hypot(
              player.x - lever.position.x,
              player.z - lever.position.z,
            ) <=
            lever.interactDistance,
        )
      ) {
        const wasDoorOpen = this.state.doorOpen;
        this.state.leverActive = !this.state.leverActive;
        this.updateDoorOpen();
        if (wasDoorOpen && !this.state.doorOpen) {
          this.pushPlayersOutOfDoor();
        }
      }
    });

    this.onMessage("restart", () => {
      this.resetLevel();
    });

    this.onMessage("nextLevel", () => {
      if (!this.state.levelComplete) return;

      const nextLevelId = getNextLevelId(this.state.currentLevelId);
      if (!nextLevelId) {
        this.state.allLevelsComplete = true;
        return;
      }

      this.resetLevel(nextLevelId);
    });

    this.setSimulationInterval((deltaTime) => this.updatePlayers(deltaTime), TICK_MS);
  }

  onJoin(client: Client) {
    const player = new PlayerSchema();
    player.spawnIndex = this.state.players.size;
    const spawn = this.spawnFor(player);
    player.x = spawn.x;
    player.y = spawn.y;
    player.z = spawn.z;
    player.velocityY = 0;
    player.grounded = true;
    this.state.players.set(client.sessionId, player);
    this.inputs.set(client.sessionId, { x: 0, z: 0, jump: false });
  }

  onLeave(client: Client) {
    this.inputs.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
  }

  async onDispose() {
    await this.presence.srem(ROOM_CODES, this.roomId);
  }

  private resetLevel(levelId = this.state.currentLevelId) {
    this.state.currentLevelId = levelId;
    this.state.collectedGems.clear();
    this.state.hazardStates.clear();
    this.level.gems.forEach((gem) => this.state.collectedGems.set(gem.id, false));
    this.level.hazards.forEach((hazard) =>
      this.state.hazardStates.set(hazard.id, true),
    );
    this.state.plateActive = false;
    this.state.leverActive = false;
    this.state.doorOpen = false;
    this.state.playersAtExit = 0;
    this.state.exitBlocked = false;
    this.state.levelComplete = false;
    this.state.allLevelsComplete = false;

    this.state.players.forEach((player, sessionId) => {
      const spawn = this.spawnFor(player);
      player.x = spawn.x;
      player.y = spawn.y;
      player.z = spawn.z;
      player.velocityY = 0;
      player.grounded = true;
      this.inputs.set(sessionId, { x: 0, z: 0, jump: false });
    });
  }

  private updatePlayers(deltaTime: number) {
    if (!this.gameReady()) return;

    const deltaSeconds = deltaTime / 1000;
    const distance = MOVE_SPEED * deltaSeconds;

    this.inputs.forEach((input, sessionId) => {
      const player = this.state.players.get(sessionId);
      if (!player) return;

      const nextX = this.clampToBounds(player.x + input.x * distance, "x");
      const nextZ = this.clampToBounds(player.z + input.z * distance, "z");

      if (
        !this.hitsBarrier(nextX, player.z) &&
        !this.hitsPlayer(sessionId, nextX, player.y, player.z)
      ) {
        player.x = nextX;
      }
      if (
        !this.hitsBarrier(player.x, nextZ) &&
        !this.hitsPlayer(sessionId, player.x, player.y, nextZ)
      ) {
        player.z = nextZ;
      }

      this.updateVertical(player, input, deltaSeconds);
      input.jump = false;
    });

    this.checkHazards();
    this.checkGems();

    const wasDoorOpen = this.state.doorOpen;
    this.state.plateActive = Array.from(this.state.players.values()).some(
      (player) =>
        this.level.pressurePlates.some((plate) =>
          this.pointInRect(player.x, player.z, plate),
        ),
    );
    this.updateDoorOpen();
    if (wasDoorOpen && !this.state.doorOpen) {
      this.pushPlayersOutOfDoor();
    }
    this.state.playersAtExit = Array.from(this.state.players.values()).filter(
      (player) =>
        this.level.exits.some((exit) => this.pointInRect(player.x, player.z, exit)),
    ).length;
    const allRequiredGemsCollected = this.requiredGemsCollected();
    this.state.exitBlocked =
      this.state.players.size === 2 &&
      this.state.playersAtExit === 2 &&
      !allRequiredGemsCollected;
    if (
      this.state.players.size === 2 &&
      this.state.playersAtExit === 2 &&
      allRequiredGemsCollected
    ) {
      this.state.levelComplete = true;
    }
  }

  private hitsBarrier(x: number, z: number) {
    const hitsWall = this.level.walls.some((wall) =>
      this.circleIntersectsBox(x, z, wall),
    );
    const hitsDoor =
      !this.state.doorOpen &&
      this.level.doors.some((door) => this.circleIntersectsBox(x, z, door));

    return hitsWall || hitsDoor;
  }

  private hitsPlayer(sessionId: string, x: number, y: number, z: number) {
    let hit = false;

    this.state.players.forEach((other, otherId) => {
      if (otherId === sessionId) return;
      const collisionDistance = this.level.playerRadius * 2;
      if (
        Math.abs(other.y - y) < collisionDistance &&
        Math.hypot(other.x - x, other.z - z) < collisionDistance
      ) {
        hit = true;
      }
    });

    return hit;
  }

  private updateVertical(
    player: PlayerSchema,
    input: MovementInput,
    deltaSeconds: number,
  ) {
    if (input.jump && player.grounded) {
      player.velocityY = JUMP_SPEED;
      player.grounded = false;
    }

    if (player.grounded) {
      const supportY = this.groundHeightBelow(
        player.x,
        player.z,
        player.y + GROUND_EPSILON,
      );
      if (supportY === null || Math.abs(player.y - supportY) > GROUND_EPSILON) {
        player.grounded = false;
      } else {
        player.y = supportY;
        player.velocityY = 0;
        return;
      }
    }

    const previousY = player.y;
    player.velocityY -= GRAVITY * deltaSeconds;
    player.y += player.velocityY * deltaSeconds;

    const landingY = this.groundHeightBelow(
      player.x,
      player.z,
      previousY + GROUND_EPSILON,
    );
    if (
      player.velocityY <= 0 &&
      landingY !== null &&
      player.y <= landingY &&
      previousY >= landingY - GROUND_EPSILON
    ) {
      player.y = landingY;
      player.velocityY = 0;
      player.grounded = true;
    }

    if (player.y < FALL_RESPAWN_Y) {
      this.respawnPlayer(player);
    }
  }

  private updateDoorOpen() {
    this.state.doorOpen = this.state.plateActive || this.state.leverActive;
  }

  private clampToBounds(value: number, axis: "x" | "z") {
    const bounds = this.level.playerBounds;
    const size = axis === "x" ? bounds.size.x : bounds.size.z;
    const center = bounds.position[axis];
    const halfSize = size / 2;

    return Math.max(center - halfSize, Math.min(center + halfSize, value));
  }

  private pointInRect(x: number, z: number, rect: LevelBox) {
    return (
      Math.abs(x - rect.position.x) <= rect.size.x / 2 &&
      Math.abs(z - rect.position.z) <= rect.size.z / 2
    );
  }

  private groundHeightBelow(x: number, z: number, maxY: number) {
    const surfaces = [this.level.floor, ...this.level.platforms];
    let groundY: number | null = null;

    surfaces.forEach((surface) => {
      const topY = surface.position.y + surface.size.y / 2;
      if (!this.pointInRect(x, z, surface) || topY > maxY) return;
      groundY = groundY === null ? topY : Math.max(groundY, topY);
    });

    return groundY;
  }

  private playerOverlapsHazard(player: PlayerSchema, hazard: LevelHazard) {
    return (
      Math.abs(player.x - hazard.position.x) <=
        hazard.size.x / 2 + this.level.playerRadius &&
      Math.abs(player.z - hazard.position.z) <=
        hazard.size.z / 2 + this.level.playerRadius
    );
  }

  private playerOverlapsGem(player: PlayerSchema, gem: LevelGem) {
    return (
      Math.hypot(player.x - gem.position.x, player.z - gem.position.z) <=
      this.level.playerRadius + gem.radius
    );
  }

  private checkHazards() {
    this.state.players.forEach((player) => {
      if (!this.hasCharacter(player.character)) return;

      const hazard = this.level.hazards.find(
        (candidate) =>
          this.state.hazardStates.get(candidate.id) !== false &&
          this.playerOverlapsHazard(player, candidate),
      );
      if (!hazard || this.isSafeHazard(player.character, hazard)) return;

      this.respawnPlayer(player);
      this.broadcast("hazardStatus", this.hazardMessage(player.character, hazard));
    });
  }

  private checkGems() {
    this.state.players.forEach((player) => {
      if (!this.hasCharacter(player.character)) return;

      this.level.gems.forEach((gem) => {
        if (this.state.collectedGems.get(gem.id)) return;
        if (gem.type !== player.character) return;
        if (!this.playerOverlapsGem(player, gem)) return;

        this.state.collectedGems.set(gem.id, true);
        this.broadcast("gemStatus", `${this.characterName(player.character)} gem collected`);
      });
    });
  }

  private requiredGemsCollected() {
    return this.level.gems.every(
      (gem) => !gem.required || this.state.collectedGems.get(gem.id),
    );
  }

  private isSafeHazard(character: PlayerCharacter, hazard: LevelHazard) {
    return (
      (character === "water" && hazard.type === "water") ||
      (character === "fire" && hazard.type === "lava")
    );
  }

  private hazardMessage(character: PlayerCharacter, hazard: LevelHazard) {
    if (hazard.type === "poison") return "Player touched poison and respawned";

    return `${this.characterName(character)} touched ${
      hazard.type === "lava" ? "lava" : "water"
    } and respawned`;
  }

  private respawnPlayer(player: PlayerSchema) {
    const spawn = this.spawnFor(player);
    player.x = spawn.x;
    player.y = spawn.y;
    player.z = spawn.z;
    player.velocityY = 0;
    player.grounded = true;
  }

  private spawnFor(player: PlayerSchema) {
    return this.level.playerSpawns[player.spawnIndex] ?? this.level.playerSpawns[0];
  }

  private circleIntersectsBox(x: number, z: number, box: LevelBox) {
    return (
      Math.abs(x - box.position.x) <= box.size.x / 2 + this.level.playerRadius &&
      Math.abs(z - box.position.z) <= box.size.z / 2 + this.level.playerRadius
    );
  }

  private gameReady() {
    return (
      this.state.players.size === 2 &&
      Array.from(this.state.players.values()).every((player) =>
        this.hasCharacter(player.character),
      )
    );
  }

  private pushPlayersOutOfDoor() {
    this.state.players.forEach((player) => {
      this.level.doors.forEach((door) => {
        if (!this.circleIntersectsBox(player.x, player.z, door)) return;

        const safeOffset =
          door.size.z / 2 + this.level.playerRadius + COLLISION_MARGIN;
        player.z =
          player.z <= door.position.z
            ? door.position.z - safeOffset
            : door.position.z + safeOffset;
      });
    });
  }

  private sanitizeInput(message: unknown): MovementInput {
    if (!message || typeof message !== "object") {
      return { x: 0, z: 0, jump: false };
    }

    const input = message as Partial<MovementInput>;
    let x = typeof input.x === "number" && Number.isFinite(input.x) ? input.x : 0;
    let z = typeof input.z === "number" && Number.isFinite(input.z) ? input.z : 0;
    const jump = input.jump === true;

    x = Math.max(-1, Math.min(1, x));
    z = Math.max(-1, Math.min(1, z));

    const length = Math.hypot(x, z);
    return length > 1 ? { x: x / length, z: z / length, jump } : { x, z, jump };
  }

  private getSelectedCharacter(message: unknown): PlayerCharacter | null {
    if (!message || typeof message !== "object") return null;

    const selection = message as Partial<CharacterSelection>;
    const character = selection.character;
    return character === "water" || character === "fire" ? character : null;
  }

  private isCharacterTaken(character: PlayerCharacter) {
    return Array.from(this.state.players.values()).some(
      (player) => player.character === character,
    );
  }

  private characterName(character: PlayerCharacter) {
    return character === "water" ? "Water" : "Fire";
  }

  private hasCharacter(character: PlayerCharacterState): character is PlayerCharacter {
    return character === "water" || character === "fire";
  }

  private async generateRoomCode() {
    const currentCodes = await this.presence.smembers(ROOM_CODES);
    let code = "";

    do {
      code = Array.from(
        { length: 4 },
        () => LETTERS[Math.floor(Math.random() * LETTERS.length)],
      ).join("");
    } while (currentCodes.includes(code));

    await this.presence.sadd(ROOM_CODES, code);
    return code;
  }
}
