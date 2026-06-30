import { defineRoom, defineServer } from "colyseus";
import { assertValidLevels, LEVELS } from "@coop/shared";
import { GameRoom } from "./rooms/GameRoom.js";

const port = Number.parseInt(process.env.PORT ?? "2567", 10);

assertValidLevels(LEVELS);

const server = defineServer({
  rooms: {
    game: defineRoom(GameRoom),
  },
});

await server.listen(port);
console.log(`Game server listening on http://localhost:${port}`);
