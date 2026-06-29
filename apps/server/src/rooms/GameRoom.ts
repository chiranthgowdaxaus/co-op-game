import { MapSchema, Schema, type } from "@colyseus/schema";
import { Client, Room } from "colyseus";
import type { MovementInput, PlayerCharacter } from "@coop/shared";

const ROOM_CODES = "$room_codes";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const TICK_MS = 50;
const MOVE_SPEED = 4;
const WORLD_LIMIT = 9;
const PLATE_HALF_SIZE = 0.9;
const DOOR_Z = 3;
const DOOR_HALF_WIDTH = 3;
const DOOR_HALF_DEPTH = 0.25;
const PLAYER_HALF_SIZE = 0.5;
const PLAYER_COLLISION_DISTANCE = PLAYER_HALF_SIZE * 2;
const COLLISION_MARGIN = 0.01;
const LEVER_X = 3;
const LEVER_Z = 5;
const LEVER_INTERACT_DISTANCE = 1.5;
const EXIT_HALF_WIDTH = 2;
const EXIT_CENTER_Z = 7;
const EXIT_HALF_DEPTH = 1.5;

class PlayerSchema extends Schema {
  @type("float32") x = 0;
  @type("float32") z = 0;
  @type("string") character: PlayerCharacter = "water";
}

class GameStateSchema extends Schema {
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type("boolean") plateActive = false;
  @type("boolean") leverActive = false;
  @type("boolean") doorOpen = false;
  @type("uint8") playersAtExit = 0;
  @type("boolean") levelComplete = false;
}

export class GameRoom extends Room<{ state: GameStateSchema }> {
  maxClients = 2;

  private readonly inputs = new Map<string, MovementInput>();

  async onCreate() {
    this.roomId = await this.generateRoomCode();
    this.setState(new GameStateSchema());

    this.onMessage("input", (client, message: unknown) => {
      this.inputs.set(client.sessionId, this.sanitizeInput(message));
    });

    this.onMessage("interact", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (
        player &&
        Math.hypot(player.x - LEVER_X, player.z - LEVER_Z) <=
          LEVER_INTERACT_DISTANCE
      ) {
        const wasDoorOpen = this.state.doorOpen;
        this.state.leverActive = !this.state.leverActive;
        this.updateDoorOpen();
        if (wasDoorOpen && !this.state.doorOpen) {
          this.pushPlayersOutOfDoor();
        }
      }
    });

    this.setSimulationInterval((deltaTime) => this.updatePlayers(deltaTime), TICK_MS);
  }

  onJoin(client: Client, options: unknown) {
    const character = this.getJoinCharacter(options);
    if (!character) {
      throw new Error("Choose Water or Fire");
    }
    if (this.isCharacterTaken(character)) {
      throw new Error(`${this.characterName(character)} is already taken`);
    }

    const player = new PlayerSchema();
    player.x = this.state.players.size === 0 ? -2 : 2;
    player.character = character;
    this.state.players.set(client.sessionId, player);
    this.inputs.set(client.sessionId, { x: 0, z: 0 });
  }

  onLeave(client: Client) {
    this.inputs.delete(client.sessionId);
    this.state.players.delete(client.sessionId);
  }

  async onDispose() {
    await this.presence.srem(ROOM_CODES, this.roomId);
  }

  private updatePlayers(deltaTime: number) {
    const distance = MOVE_SPEED * (deltaTime / 1000);

    this.inputs.forEach((input, sessionId) => {
      const player = this.state.players.get(sessionId);
      if (!player) return;

      const nextX = Math.max(
        -WORLD_LIMIT,
        Math.min(WORLD_LIMIT, player.x + input.x * distance),
      );
      const nextZ = Math.max(
        -WORLD_LIMIT,
        Math.min(WORLD_LIMIT, player.z + input.z * distance),
      );

      if (
        !this.hitsBarrier(nextX, player.z) &&
        !this.hitsPlayer(sessionId, nextX, player.z)
      ) {
        player.x = nextX;
      }
      if (
        !this.hitsBarrier(player.x, nextZ) &&
        !this.hitsPlayer(sessionId, player.x, nextZ)
      ) {
        player.z = nextZ;
      }
    });

    const wasDoorOpen = this.state.doorOpen;
    this.state.plateActive = Array.from(this.state.players.values()).some(
      (player) =>
        Math.abs(player.x) <= PLATE_HALF_SIZE &&
        Math.abs(player.z) <= PLATE_HALF_SIZE,
    );
    this.updateDoorOpen();
    if (wasDoorOpen && !this.state.doorOpen) {
      this.pushPlayersOutOfDoor();
    }
    this.state.playersAtExit = Array.from(this.state.players.values()).filter(
      (player) =>
        Math.abs(player.x) <= EXIT_HALF_WIDTH &&
        Math.abs(player.z - EXIT_CENTER_Z) <= EXIT_HALF_DEPTH,
    ).length;
    if (this.state.players.size === 2 && this.state.playersAtExit === 2) {
      this.state.levelComplete = true;
    }
  }

  private hitsBarrier(x: number, z: number) {
    if (Math.abs(z - DOOR_Z) > DOOR_HALF_DEPTH + PLAYER_HALF_SIZE) {
      return false;
    }

    const hitsSideWall = Math.abs(x) >= DOOR_HALF_WIDTH - PLAYER_HALF_SIZE;
    const hitsDoor =
      !this.state.doorOpen &&
      Math.abs(x) <= DOOR_HALF_WIDTH + PLAYER_HALF_SIZE;

    return hitsSideWall || hitsDoor;
  }

  private hitsPlayer(sessionId: string, x: number, z: number) {
    let hit = false;

    this.state.players.forEach((other, otherId) => {
      if (otherId === sessionId) return;
      if (Math.hypot(other.x - x, other.z - z) < PLAYER_COLLISION_DISTANCE) {
        hit = true;
      }
    });

    return hit;
  }

  private updateDoorOpen() {
    this.state.doorOpen = this.state.plateActive || this.state.leverActive;
  }

  private pushPlayersOutOfDoor() {
    const safeOffset =
      DOOR_HALF_DEPTH + PLAYER_HALF_SIZE + COLLISION_MARGIN;

    this.state.players.forEach((player) => {
      const overlapsDoor =
        Math.abs(player.x) <= DOOR_HALF_WIDTH + PLAYER_HALF_SIZE &&
        Math.abs(player.z - DOOR_Z) <=
          DOOR_HALF_DEPTH + PLAYER_HALF_SIZE;

      if (overlapsDoor) {
        player.z =
          player.z <= DOOR_Z ? DOOR_Z - safeOffset : DOOR_Z + safeOffset;
      }
    });
  }

  private sanitizeInput(message: unknown): MovementInput {
    if (!message || typeof message !== "object") return { x: 0, z: 0 };

    const input = message as Partial<MovementInput>;
    let x = typeof input.x === "number" && Number.isFinite(input.x) ? input.x : 0;
    let z = typeof input.z === "number" && Number.isFinite(input.z) ? input.z : 0;

    x = Math.max(-1, Math.min(1, x));
    z = Math.max(-1, Math.min(1, z));

    const length = Math.hypot(x, z);
    return length > 1 ? { x: x / length, z: z / length } : { x, z };
  }

  private getJoinCharacter(options: unknown): PlayerCharacter | null {
    if (!options || typeof options !== "object") return null;

    const character = (options as { character?: unknown }).character;
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
