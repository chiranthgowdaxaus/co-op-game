import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder.pure.js";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder.pure.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { Scene } from "@babylonjs/core/scene.js";
import { Client, Room } from "@colyseus/sdk";
import type { MovementInput, PlayerState, RoomState } from "@coop/shared";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#renderCanvas")!;
const createButton = document.querySelector<HTMLButtonElement>("#create-room")!;
const joinForm = document.querySelector<HTMLFormElement>("#join-room")!;
const joinButton = joinForm.querySelector<HTMLButtonElement>("button")!;
const roomCodeInput = document.querySelector<HTMLInputElement>("#room-code-input")!;
const roomCodeText = document.querySelector<HTMLParagraphElement>("#room-code")!;
const identityText = document.querySelector<HTMLParagraphElement>("#identity")!;
const partnerText = document.querySelector<HTMLParagraphElement>("#partner")!;
const statusText = document.querySelector<HTMLParagraphElement>("#status")!;
const gameStatusText =
  document.querySelector<HTMLParagraphElement>("#game-status")!;

const engine = new Engine(canvas, true, { stencil: false });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.06, 0.09, 0.14, 1);

const camera = new FreeCamera("camera", new Vector3(0, 12, -14), scene);
camera.setTarget(Vector3.Zero());
camera.inputs.clear();

const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
light.intensity = 0.9;

const ground = CreateGround("ground", { width: 20, height: 20 }, scene);
const groundMaterial = new StandardMaterial("ground-material", scene);
groundMaterial.diffuseColor = new Color3(0.2, 0.26, 0.34);
ground.material = groundMaterial;

const blueMaterial = new StandardMaterial("blue-player", scene);
blueMaterial.diffuseColor = new Color3(0.2, 0.55, 1);

const orangeMaterial = new StandardMaterial("orange-player", scene);
orangeMaterial.diffuseColor = new Color3(1, 0.45, 0.2);

const plateInactiveMaterial = new StandardMaterial("plate-inactive", scene);
plateInactiveMaterial.diffuseColor = new Color3(0.55, 0.45, 0.15);

const plateActiveMaterial = new StandardMaterial("plate-active", scene);
plateActiveMaterial.diffuseColor = new Color3(0.2, 0.75, 0.3);

const doorMaterial = new StandardMaterial("door", scene);
doorMaterial.diffuseColor = new Color3(0.45, 0.2, 0.15);

const pressurePlate = CreateBox(
  "pressure-plate",
  { width: 1.8, height: 0.15, depth: 1.8 },
  scene,
);
pressurePlate.position.y = 0.075;
pressurePlate.material = plateInactiveMaterial;

const door = CreateBox("door", { width: 6, height: 3, depth: 0.5 }, scene);
door.position.set(0, 1.5, 3);
door.material = doorMaterial;

const leftWall = CreateBox(
  "left-wall",
  { width: 6, height: 3, depth: 0.5 },
  scene,
);
leftWall.position.set(-6, 1.5, 3);
leftWall.material = doorMaterial;

const rightWall = CreateBox(
  "right-wall",
  { width: 6, height: 3, depth: 0.5 },
  scene,
);
rightWall.position.set(6, 1.5, 3);
rightWall.material = doorMaterial;

const leverBase = CreateBox(
  "lever-base",
  { width: 0.7, height: 0.25, depth: 0.7 },
  scene,
);
leverBase.position.set(3, 0.125, 5);
leverBase.material = doorMaterial;

const leverStick = CreateBox(
  "lever-stick",
  { width: 0.15, height: 1.2, depth: 0.15 },
  scene,
);
leverStick.material = plateActiveMaterial;

const exitMaterial = new StandardMaterial("exit", scene);
exitMaterial.diffuseColor = new Color3(0.2, 0.65, 0.45);

const exitZone = CreateBox(
  "exit-zone",
  { width: 4, height: 0.08, depth: 3 },
  scene,
);
exitZone.position.set(0, 0.04, 7);
exitZone.material = exitMaterial;

const meshes = new Map<string, Mesh>();
const targets = new Map<string, PlayerState>();
const client = new Client(import.meta.env.VITE_SERVER_URL ?? "http://localhost:2567");
const pressedKeys = new Set<string>();
const LEVER_X = 3;
const LEVER_Z = 5;
const LEVER_PROMPT_DISTANCE = 1.5;

let room: Room<RoomState> | null = null;
let lastInput: MovementInput = { x: 0, z: 0 };

function syncPlayers(players: Map<string, PlayerState>) {
  const activePlayers = new Set<string>();
  let partner: PlayerState | undefined;

  players.forEach((player, sessionId) => {
    activePlayers.add(sessionId);
    targets.set(sessionId, { x: player.x, z: player.z, color: player.color });
    if (sessionId !== room?.sessionId) partner = player;

    if (!meshes.has(sessionId)) {
      const mesh = CreateBox(`player-${sessionId}`, { size: 1 }, scene);
      mesh.position.set(player.x, 0.5, player.z);
      mesh.material = player.color === "blue" ? blueMaterial : orangeMaterial;
      meshes.set(sessionId, mesh);
    }
  });

  const localPlayer = room ? players.get(room.sessionId) : undefined;
  if (localPlayer) {
    identityText.hidden = false;
    identityText.textContent = `You are ${capitalize(localPlayer.color)}`;
    partnerText.hidden = false;
    partnerText.textContent = partner
      ? `Partner: ${capitalize(partner.color)}`
      : "Partner: Waiting";
  }

  statusText.textContent =
    players.size === 2 ? "Partner joined. 2/2" : "Waiting for partner... 1/2";

  meshes.forEach((mesh, sessionId) => {
    if (activePlayers.has(sessionId)) return;
    mesh.dispose();
    meshes.delete(sessionId);
    targets.delete(sessionId);
  });
}

function syncWorld(state: RoomState) {
  syncPlayers(state.players);
  syncInteractionPrompt(state);
  pressurePlate.material = state.plateActive
    ? plateActiveMaterial
    : plateInactiveMaterial;
  door.position.y = state.doorOpen ? 4.5 : 1.5;
  const leverAngle = state.leverActive ? 0.6 : -0.6;
  leverStick.rotation.z = leverAngle;
  leverStick.position.set(
    3 - Math.sin(leverAngle) * 0.6,
    0.25 + Math.cos(leverAngle) * 0.6,
    5,
  );
  gameStatusText.hidden = false;
  gameStatusText.textContent = state.levelComplete
    ? "Level complete"
    : state.playersAtExit > 0
      ? "Waiting for partner at exit"
      : state.leverActive
        ? "Lever activated"
        : state.plateActive
          ? "Pressure plate active"
          : "Door closed";
}

const interactionText =
  document.querySelector<HTMLParagraphElement>("#interaction")!;

function syncInteractionPrompt(state: RoomState) {
  const localPlayer = room ? state.players.get(room.sessionId) : undefined;
  const nearLever =
    localPlayer &&
    Math.hypot(localPlayer.x - LEVER_X, localPlayer.z - LEVER_Z) <=
      LEVER_PROMPT_DISTANCE;

  interactionText.hidden = state.leverActive || !nearLever;
}

function capitalize(value: string) {
  return value[0].toUpperCase() + value.slice(1);
}

async function connect(action: () => Promise<Room<RoomState>>) {
  createButton.disabled = true;
  joinButton.disabled = true;
  roomCodeInput.disabled = true;
  statusText.textContent = "Connecting…";

  try {
    room = await action();
    joinButton.disabled = true;
    roomCodeText.hidden = false;
    roomCodeText.textContent = `Room code: ${room.roomId}`;
    statusText.textContent = "Waiting for partner... 1/2";

    room.onStateChange(syncWorld);
    room.onLeave(() => {
      room = null;
      statusText.textContent = "Disconnected.";
    });

    sendInput();
  } catch (error) {
    createButton.disabled = false;
    joinButton.disabled = false;
    roomCodeInput.disabled = false;
    const message = error instanceof Error ? error.message : "";
    statusText.textContent = /locked|already full/i.test(message)
      ? "Room is full"
      : message || "Could not connect.";
  }
}

function currentInput(): MovementInput {
  const x =
    Number(pressedKeys.has("KeyD") || pressedKeys.has("ArrowRight")) -
    Number(pressedKeys.has("KeyA") || pressedKeys.has("ArrowLeft"));
  const z =
    Number(pressedKeys.has("KeyW") || pressedKeys.has("ArrowUp")) -
    Number(pressedKeys.has("KeyS") || pressedKeys.has("ArrowDown"));
  const length = Math.hypot(x, z);

  return length > 1 ? { x: x / length, z: z / length } : { x, z };
}

function sendInput() {
  if (!room) return;

  const input = currentInput();
  if (input.x === lastInput.x && input.z === lastInput.z) return;

  lastInput = input;
  room.send("input", input);
}

createButton.addEventListener("click", () => {
  void connect(() => client.create<RoomState>("game"));
});

joinForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const code = roomCodeInput.value.trim().toUpperCase();
  if (code.length !== 4) {
    statusText.textContent = "Enter a 4-letter room code.";
    return;
  }

  void connect(() => client.joinById<RoomState>(code));
});

roomCodeInput.addEventListener("input", () => {
  roomCodeInput.value = roomCodeInput.value.toUpperCase().replace(/[^A-Z]/g, "");
});

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyE") {
    if (!event.repeat) room?.send("interact");
    return;
  }
  if (!event.code.startsWith("Arrow") && !event.code.startsWith("Key")) return;
  if (event.code.startsWith("Arrow")) event.preventDefault();
  pressedKeys.add(event.code);
  sendInput();
});

window.addEventListener("keyup", (event) => {
  pressedKeys.delete(event.code);
  sendInput();
});

window.addEventListener("blur", () => {
  pressedKeys.clear();
  sendInput();
});

window.addEventListener("resize", () => engine.resize());

engine.runRenderLoop(() => {
  const blend = Math.min(1, engine.getDeltaTime() / 80);

  meshes.forEach((mesh, sessionId) => {
    const target = targets.get(sessionId);
    if (!target) return;
    mesh.position.x += (target.x - mesh.position.x) * blend;
    mesh.position.z += (target.z - mesh.position.z) * blend;
  });

  scene.render();
});
