import { MapSchema, Schema, type } from "@colyseus/schema";
import { Client, Room } from "colyseus";
import type {
  CharacterSelection,
  LevelBox,
  LevelHazard,
  LevelRect,
  MovementInput,
  PlayerCharacter,
  PlayerCharacterState,
} from "@coop/shared";
import { TUTORIAL_LEVEL } from "@coop/shared";

const ROOM_CODES = "$room_codes";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const TICK_MS = 50;
const MOVE_SPEED = 4;
const LEVEL = TUTORIAL_LEVEL;
const PLAYER_COLLISION_DISTANCE = LEVEL.playerRadius * 2;
const COLLISION_MARGIN = 0.01;

class PlayerSchema extends Schema {
  @type("float32") x = 0;
  @type("float32") z = 0;
  @type("uint8") spawnIndex = 0;
  @type("string") character: PlayerCharacterState = "";
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
        LEVEL.levers.some(
          (lever) =>
            Math.hypot(player.x - lever.x, player.z - lever.z) <=
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

    this.setSimulationInterval((deltaTime) => this.updatePlayers(deltaTime), TICK_MS);
  }

  onJoin(client: Client) {
    const player = new PlayerSchema();
    player.spawnIndex = this.state.players.size;
    const spawn = this.spawnFor(player);
    player.x = spawn.x;
    player.z = spawn.z;
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
    if (!this.gameReady()) return;

    const distance = MOVE_SPEED * (deltaTime / 1000);

    this.inputs.forEach((input, sessionId) => {
      const player = this.state.players.get(sessionId);
      if (!player) return;

      const nextX = this.clampToBounds(player.x + input.x * distance, "x");
      const nextZ = this.clampToBounds(player.z + input.z * distance, "z");

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

    this.checkHazards();

    const wasDoorOpen = this.state.doorOpen;
    this.state.plateActive = Array.from(this.state.players.values()).some(
      (player) =>
        LEVEL.pressurePlates.some((plate) =>
          this.pointInRect(player.x, player.z, plate),
        ),
    );
    this.updateDoorOpen();
    if (wasDoorOpen && !this.state.doorOpen) {
      this.pushPlayersOutOfDoor();
    }
    this.state.playersAtExit = Array.from(this.state.players.values()).filter(
      (player) =>
        LEVEL.exits.some((exit) => this.pointInRect(player.x, player.z, exit)),
    ).length;
    if (this.state.players.size === 2 && this.state.playersAtExit === 2) {
      this.state.levelComplete = true;
    }
  }

  private hitsBarrier(x: number, z: number) {
    const hitsWall = LEVEL.walls.some((wall) =>
      this.circleIntersectsBox(x, z, wall),
    );
    const hitsDoor =
      !this.state.doorOpen &&
      LEVEL.doors.some((door) => this.circleIntersectsBox(x, z, door));

    return hitsWall || hitsDoor;
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

  private clampToBounds(value: number, axis: "x" | "z") {
    const bounds = LEVEL.playerBounds;
    const size = axis === "x" ? bounds.width : bounds.depth;
    const center = bounds[axis];
    const halfSize = size / 2;

    return Math.max(center - halfSize, Math.min(center + halfSize, value));
  }

  private pointInRect(x: number, z: number, rect: LevelRect) {
    return (
      Math.abs(x - rect.x) <= rect.width / 2 &&
      Math.abs(z - rect.z) <= rect.depth / 2
    );
  }

  private playerOverlapsHazard(player: PlayerSchema, hazard: LevelHazard) {
    return (
      Math.abs(player.x - hazard.position.x) <=
        hazard.size.width / 2 + LEVEL.playerRadius &&
      Math.abs(player.z - hazard.position.z) <=
        hazard.size.depth / 2 + LEVEL.playerRadius
    );
  }

  private checkHazards() {
    this.state.players.forEach((player) => {
      if (!this.hasCharacter(player.character)) return;

      const hazard = LEVEL.hazards.find((candidate) =>
        this.playerOverlapsHazard(player, candidate),
      );
      if (!hazard || this.isSafeHazard(player.character, hazard)) return;

      this.respawnPlayer(player);
      this.broadcast("hazardStatus", this.hazardMessage(player.character, hazard));
    });
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
    player.z = spawn.z;
  }

  private spawnFor(player: PlayerSchema) {
    return LEVEL.playerSpawns[player.spawnIndex] ?? LEVEL.playerSpawns[0];
  }

  private circleIntersectsBox(x: number, z: number, box: LevelBox) {
    return (
      Math.abs(x - box.x) <= box.width / 2 + LEVEL.playerRadius &&
      Math.abs(z - box.z) <= box.depth / 2 + LEVEL.playerRadius
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
      LEVEL.doors.forEach((door) => {
        if (!this.circleIntersectsBox(player.x, player.z, door)) return;

        const safeOffset =
          door.depth / 2 + LEVEL.playerRadius + COLLISION_MARGIN;
        player.z = player.z <= door.z ? door.z - safeOffset : door.z + safeOffset;
      });
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
