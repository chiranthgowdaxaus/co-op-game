import { MapSchema, Schema, type } from "@colyseus/schema";
import { Client, Room } from "colyseus";
import type { MovementInput, PlayerColor } from "@coop/shared";

const ROOM_CODES = "$room_codes";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const TICK_MS = 50;
const MOVE_SPEED = 4;
const WORLD_LIMIT = 9;

class PlayerSchema extends Schema {
  @type("float32") x = 0;
  @type("float32") z = 0;
  @type("string") color: PlayerColor = "blue";
}

class GameStateSchema extends Schema {
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
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

    this.setSimulationInterval((deltaTime) => this.updatePlayers(deltaTime), TICK_MS);
  }

  onJoin(client: Client) {
    const player = new PlayerSchema();
    player.x = this.state.players.size === 0 ? -2 : 2;
    player.color = this.state.players.size === 0 ? "blue" : "orange";
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

      player.x = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, player.x + input.x * distance));
      player.z = Math.max(-WORLD_LIMIT, Math.min(WORLD_LIMIT, player.z + input.z * distance));
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
