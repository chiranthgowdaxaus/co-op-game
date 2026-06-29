import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera.js";
import { Engine } from "@babylonjs/core/Engines/engine.js";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { CreateBox } from "@babylonjs/core/Meshes/Builders/boxBuilder.pure.js";
import { CreateGround } from "@babylonjs/core/Meshes/Builders/groundBuilder.pure.js";
import { CreateSphere } from "@babylonjs/core/Meshes/Builders/sphereBuilder.pure.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { Scene } from "@babylonjs/core/scene.js";
import { Client, Room } from "@colyseus/sdk";
import { TUTORIAL_LEVEL } from "@coop/shared";
import type {
  CharacterSelection,
  LevelBox,
  LevelExit,
  LevelLever,
  MovementInput,
  PlayerCharacter,
  PlayerCharacterState,
  PlayerState,
  RoomState,
} from "@coop/shared";
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
const leverStatusText =
  document.querySelector<HTMLParagraphElement>("#lever-status")!;
const characterPanel =
  document.querySelector<HTMLElement>("#character-panel")!;
const characterStatusText =
  document.querySelector<HTMLParagraphElement>("#character-status")!;
const chooseWaterButton =
  document.querySelector<HTMLButtonElement>("#choose-water")!;
const chooseFireButton =
  document.querySelector<HTMLButtonElement>("#choose-fire")!;

const engine = new Engine(canvas, true, { stencil: false });
const scene = new Scene(engine);
scene.clearColor = new Color4(0.06, 0.09, 0.14, 1);
const LEVEL = TUTORIAL_LEVEL;

const LEVEL_FOCUS = new Vector3(-1.2, 0, 3.5);
const CAMERA_OFFSET = new Vector3(0, 12.5, -13.5);
const cameraTarget = LEVEL_FOCUS.clone();
const camera = new FreeCamera("camera", LEVEL_FOCUS.add(CAMERA_OFFSET), scene);
camera.fov = 0.72;
camera.setTarget(cameraTarget);
camera.inputs.clear();

const light = new HemisphericLight("light", new Vector3(0, 1, 0), scene);
light.intensity = 1;

const ground = CreateGround(
  "ground",
  { width: LEVEL.floor.width, height: LEVEL.floor.depth },
  scene,
);
ground.position.set(LEVEL.floor.x, 0, LEVEL.floor.z);
const groundMaterial = new StandardMaterial("ground-material", scene);
groundMaterial.diffuseColor = new Color3(0.2, 0.26, 0.34);
ground.material = groundMaterial;

const blueMaterial = new StandardMaterial("blue-player", scene);
blueMaterial.diffuseColor = new Color3(0.2, 0.55, 1);
blueMaterial.emissiveColor = new Color3(0.03, 0.08, 0.14);

const orangeMaterial = new StandardMaterial("orange-player", scene);
orangeMaterial.diffuseColor = new Color3(1, 0.45, 0.2);
orangeMaterial.emissiveColor = new Color3(0.14, 0.06, 0.03);

const waterAuraMaterial = new StandardMaterial("water-aura", scene);
waterAuraMaterial.diffuseColor = new Color3(0.25, 0.7, 1);
waterAuraMaterial.emissiveColor = new Color3(0.05, 0.2, 0.35);
waterAuraMaterial.alpha = 0.28;

const fireAuraMaterial = new StandardMaterial("fire-aura", scene);
fireAuraMaterial.diffuseColor = new Color3(1, 0.5, 0.12);
fireAuraMaterial.emissiveColor = new Color3(0.35, 0.12, 0.02);
fireAuraMaterial.alpha = 0.28;

const plateInactiveMaterial = new StandardMaterial("plate-inactive", scene);
plateInactiveMaterial.diffuseColor = new Color3(0.9, 0.68, 0.18);

const plateActiveMaterial = new StandardMaterial("plate-active", scene);
plateActiveMaterial.diffuseColor = new Color3(0.2, 0.75, 0.3);

const doorClosedMaterial = new StandardMaterial("door-closed", scene);
doorClosedMaterial.diffuseColor = new Color3(0.75, 0.18, 0.12);

const doorOpenMaterial = new StandardMaterial("door-open", scene);
doorOpenMaterial.diffuseColor = new Color3(0.25, 0.65, 0.3);

const wallMaterial = new StandardMaterial("wall", scene);
wallMaterial.diffuseColor = new Color3(0.3, 0.34, 0.42);

const leverBaseMaterial = new StandardMaterial("lever-base", scene);
leverBaseMaterial.diffuseColor = new Color3(0.16, 0.18, 0.22);

const leverInactiveMaterial = new StandardMaterial("lever-inactive", scene);
leverInactiveMaterial.diffuseColor = new Color3(0.95, 0.78, 0.25);

const exitMaterial = new StandardMaterial("exit", scene);
exitMaterial.diffuseColor = new Color3(0.1, 0.75, 0.65);

const exitBorderMaterial = new StandardMaterial("exit-border", scene);
exitBorderMaterial.diffuseColor = new Color3(0.35, 1, 0.85);

const pressurePlateMeshes = LEVEL.pressurePlates.map((plate) =>
  createLevelBox(`pressure-plate-${plate.id}`, plate, plateInactiveMaterial),
);

const doorMeshes = LEVEL.doors.map((doorDefinition) => ({
  definition: doorDefinition,
  mesh: createLevelBox(
    `door-${doorDefinition.id}`,
    doorDefinition,
    doorClosedMaterial,
    doorDefinition.closedY,
  ),
}));

LEVEL.walls.forEach((wall) =>
  createLevelBox(`wall-${wall.id}`, wall, wallMaterial),
);

const leverMeshes = LEVEL.levers.map((lever) => createLeverMeshes(lever));

LEVEL.exits.forEach((exit) => {
  createLevelBox(`exit-${exit.id}`, exit, exitMaterial);
  createExitBorder(exit);
});

function createLevelBox(
  name: string,
  box: LevelBox,
  material: StandardMaterial,
  y = box.height / 2,
) {
  const mesh = CreateBox(
    name,
    { width: box.width, height: box.height, depth: box.depth },
    scene,
  );
  mesh.position.set(box.x, y, box.z);
  mesh.material = material;
  return mesh;
}

function createLeverMeshes(definition: LevelLever) {
  const base = CreateBox(
    `lever-base-${definition.id}`,
    {
      width: definition.base.width,
      height: definition.base.height,
      depth: definition.base.depth,
    },
    scene,
  );
  base.position.set(definition.x, definition.base.height / 2, definition.z);
  base.material = leverBaseMaterial;

  const stick = CreateBox(
    `lever-stick-${definition.id}`,
    {
      width: definition.stick.width,
      height: definition.stick.height,
      depth: definition.stick.depth,
    },
    scene,
  );
  stick.material = leverInactiveMaterial;

  return { definition, stick };
}

function createExitBorder(exit: LevelExit) {
  createLevelBox(
    `exit-back-${exit.id}`,
    { ...exit, height: exit.borderHeight, depth: exit.borderHeight },
    exitBorderMaterial,
    exit.borderHeight / 2,
  ).position.z = exit.z + exit.depth / 2;
  createLevelBox(
    `exit-front-${exit.id}`,
    { ...exit, height: exit.borderHeight, depth: exit.borderHeight },
    exitBorderMaterial,
    exit.borderHeight / 2,
  ).position.z = exit.z - exit.depth / 2;
  createLevelBox(
    `exit-left-${exit.id}`,
    { ...exit, width: exit.borderHeight, height: exit.borderHeight },
    exitBorderMaterial,
    exit.borderHeight / 2,
  ).position.x = exit.x - exit.width / 2;
  createLevelBox(
    `exit-right-${exit.id}`,
    { ...exit, width: exit.borderHeight, height: exit.borderHeight },
    exitBorderMaterial,
    exit.borderHeight / 2,
  ).position.x = exit.x + exit.width / 2;
}

interface PlayerMeshes {
  body: Mesh;
  aura: Mesh;
}

const meshes = new Map<string, PlayerMeshes>();
const targets = new Map<string, PlayerState>();
const client = new Client(import.meta.env.VITE_SERVER_URL ?? "http://localhost:2567");
const pressedKeys = new Set<string>();

let room: Room<RoomState> | null = null;
let lastInput: MovementInput = { x: 0, z: 0 };
let canPlay = false;

function syncPlayers(players: Map<string, PlayerState>) {
  const visiblePlayers = new Set<string>();
  let partner: PlayerState | undefined;

  players.forEach((player, sessionId) => {
    targets.set(sessionId, {
      x: player.x,
      z: player.z,
      character: player.character,
    });
    if (sessionId !== room?.sessionId) partner = player;
    if (!canPlay || !isCharacter(player.character)) return;

    visiblePlayers.add(sessionId);
    if (!meshes.has(sessionId)) {
      const body = CreateSphere(
        `player-${sessionId}`,
        { diameter: 1, segments: 16 },
        scene,
      );
      body.position.set(player.x, 0.5, player.z);
      body.material = playerMaterial(player.character);

      const aura = CreateSphere(
        `player-aura-${sessionId}`,
        { diameter: 1.35, segments: 12 },
        scene,
      );
      aura.position.copyFrom(body.position);
      aura.material = auraMaterial(player.character);

      meshes.set(sessionId, { body, aura });
    } else {
      const mesh = meshes.get(sessionId)!;
      mesh.body.material = playerMaterial(player.character);
      mesh.aura.material = auraMaterial(player.character);
    }
  });

  const localPlayer = room ? players.get(room.sessionId) : undefined;
  if (localPlayer) {
    const localCharacter = localPlayer.character;
    const localReady = isCharacter(localCharacter);
    identityText.hidden = !localReady;
    if (localReady) {
      identityText.textContent = `You are ${characterName(localCharacter)}`;
    }

    const partnerCharacter = partner?.character;
    partnerText.hidden = false;
    partnerText.textContent =
      partnerCharacter && isCharacter(partnerCharacter)
        ? `Partner: ${characterName(partnerCharacter)}`
        : "Partner: Waiting";
  }

  statusText.textContent =
    players.size === 2 ? "Partner joined. 2/2" : "Waiting for partner... 1/2";

  meshes.forEach((mesh, sessionId) => {
    if (visiblePlayers.has(sessionId)) return;
    mesh.body.dispose();
    mesh.aura.dispose();
    meshes.delete(sessionId);
    targets.delete(sessionId);
  });
}

function syncWorld(state: RoomState) {
  syncCharacterSelection(state);
  syncPlayers(state.players);
  pressurePlateMeshes.forEach((plate) => {
    plate.material = state.plateActive
      ? plateActiveMaterial
      : plateInactiveMaterial;
  });
  doorMeshes.forEach(({ definition, mesh }) => {
    mesh.position.y = state.doorOpen ? definition.openY : definition.closedY;
    mesh.material = state.doorOpen ? doorOpenMaterial : doorClosedMaterial;
  });
  const leverAngle = state.leverActive ? 0.6 : -0.6;
  leverMeshes.forEach(({ definition, stick }) => {
    stick.rotation.z = leverAngle;
    stick.material = state.leverActive
      ? plateActiveMaterial
      : leverInactiveMaterial;
    stick.position.set(
      definition.x - Math.sin(leverAngle) * (definition.stick.height / 2),
      definition.base.height + Math.cos(leverAngle) * (definition.stick.height / 2),
      definition.z,
    );
  });
  leverStatusText.hidden = !canPlay;
  leverStatusText.textContent = state.leverActive ? "Lever on" : "Lever off";
  gameStatusText.hidden = !canPlay;
  gameStatusText.textContent = state.levelComplete
    ? "Level complete"
    : state.playersAtExit > 0
      ? "Waiting for partner at exit"
      : state.leverActive
        ? "Lever on"
        : state.plateActive
          ? "Pressure plate active"
          : "Door closed";
  syncInteractionPrompt(state);
  if (canPlay) sendInput();
}

const interactionText =
  document.querySelector<HTMLParagraphElement>("#interaction")!;

function syncInteractionPrompt(state: RoomState) {
  const localPlayer = room ? state.players.get(room.sessionId) : undefined;
  const nearLever =
    localPlayer &&
    LEVEL.levers.some(
      (lever) =>
        Math.hypot(localPlayer.x - lever.x, localPlayer.z - lever.z) <=
        lever.interactDistance,
    );

  interactionText.hidden = !canPlay || !nearLever;
}

function syncCharacterSelection(state: RoomState) {
  const localPlayer = room ? state.players.get(room.sessionId) : undefined;
  const players = Array.from(state.players.values());
  const localReady = !!localPlayer && isCharacter(localPlayer.character);
  const allReady =
    state.players.size === 2 &&
    players.every((player) => isCharacter(player.character));
  const waterTaken = players.some((player) => player.character === "water");
  const fireTaken = players.some((player) => player.character === "fire");

  canPlay = allReady;
  characterPanel.hidden = !room || allReady;
  characterStatusText.textContent = localReady
    ? "Waiting for partner to choose..."
    : "Choose your character";

  chooseWaterButton.disabled = localReady || waterTaken;
  chooseWaterButton.textContent = waterTaken ? "Water taken" : "Choose Water";
  chooseFireButton.disabled = localReady || fireTaken;
  chooseFireButton.textContent = fireTaken ? "Fire taken" : "Choose Fire";
}

function updateCamera(blend: number) {
  const localTarget = room ? targets.get(room.sessionId) : undefined;
  const targetX = localTarget
    ? LEVEL_FOCUS.x + localTarget.x * 0.22
    : LEVEL_FOCUS.x;
  const targetZ = localTarget
    ? LEVEL_FOCUS.z + (localTarget.z - LEVEL_FOCUS.z) * 0.24
    : LEVEL_FOCUS.z;

  cameraTarget.x += (targetX - cameraTarget.x) * blend;
  cameraTarget.z += (targetZ - cameraTarget.z) * blend;
  camera.position.set(
    cameraTarget.x + CAMERA_OFFSET.x,
    cameraTarget.y + CAMERA_OFFSET.y,
    cameraTarget.z + CAMERA_OFFSET.z,
  );
  camera.setTarget(cameraTarget);
}

function playerMaterial(character: PlayerCharacter) {
  return character === "water" ? blueMaterial : orangeMaterial;
}

function auraMaterial(character: PlayerCharacter) {
  return character === "water" ? waterAuraMaterial : fireAuraMaterial;
}

function characterName(character: PlayerCharacter) {
  return character === "water" ? "Water" : "Fire";
}

function isCharacter(
  character: PlayerCharacterState,
): character is PlayerCharacter {
  return character === "water" || character === "fire";
}

function setConnectControlsDisabled(disabled: boolean) {
  createButton.disabled = disabled;
  joinButton.disabled = disabled;
  roomCodeInput.disabled = disabled;
}

function connectionErrorMessage(message: string) {
  if (/locked|already full/i.test(message)) return "Room is full";

  return message || "Could not connect.";
}

async function connect(action: () => Promise<Room<RoomState>>) {
  setConnectControlsDisabled(true);
  statusText.textContent = "Connecting…";

  try {
    room = await action();
    joinButton.disabled = true;
    roomCodeText.hidden = false;
    roomCodeText.textContent = `Room code: ${room.roomId}`;
    statusText.textContent = "Waiting for partner... 1/2";

    room.onStateChange(syncWorld);
    room.onMessage("selectionError", (message: string) => {
      statusText.textContent = message;
    });
    room.onLeave(() => {
      room = null;
      canPlay = false;
      characterPanel.hidden = true;
      statusText.textContent = "Disconnected.";
    });

    sendInput();
  } catch (error) {
    setConnectControlsDisabled(false);
    const message = error instanceof Error ? error.message : "";
    statusText.textContent = connectionErrorMessage(message);
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
  if (!room || !canPlay) return;

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

function selectCharacter(character: PlayerCharacter) {
  const selection: CharacterSelection = { character };
  room?.send("selectCharacter", selection);
}

chooseWaterButton.addEventListener("click", () => {
  selectCharacter("water");
});

chooseFireButton.addEventListener("click", () => {
  selectCharacter("fire");
});

roomCodeInput.addEventListener("input", () => {
  roomCodeInput.value = roomCodeInput.value.toUpperCase().replace(/[^A-Z]/g, "");
});

window.addEventListener("keydown", (event) => {
  if (event.code === "KeyE") {
    if (!event.repeat && canPlay) room?.send("interact");
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
  const deltaTime = engine.getDeltaTime();
  const blend = Math.min(1, deltaTime / 80);
  const cameraBlend = Math.min(1, deltaTime / 240);

  meshes.forEach(({ body, aura }, sessionId) => {
    const target = targets.get(sessionId);
    if (!target) return;
    body.position.x += (target.x - body.position.x) * blend;
    body.position.z += (target.z - body.position.z) * blend;
    aura.position.copyFrom(body.position);
  });

  updateCamera(cameraBlend);
  scene.render();
});
