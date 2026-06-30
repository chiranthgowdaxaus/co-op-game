# Side-view level authoring

Levels are defined in `packages/shared/src/levels.ts` as `LevelDefinition`.
The server uses this data for authoritative gameplay and collision. The client
uses the same data only to render meshes and UI.

## Coordinate system

- `x`: horizontal progression through the level. Higher `x` means farther right.
- `y`: elevation. Floor height is usually `y: 0`; platforms use higher `y`.
- `z`: lane depth / visual separation. Current convention:
  - top Fire lane: `z: -3`
  - bottom Water lane: `z: 3`
- `position`: center point of an object, `{ x, y, z }`.
- `size`: dimensions of an object, `{ x, y, z }`.

Box top height is `position.y + size.y / 2`. Flat floors use `size.y: 0`.

## Schema fields

- `id`: unique level id used by the registry.
- `name`: readable level name.
- `playerRadius`: server collision radius.
- `floor`: bottom-lane ground surface.
- `playerBounds`: allowed movement area.
- `playerSpawns`: at least two spawn points. Current side-view convention:
  - spawn 0: Fire/top lane
  - spawn 1: Water/bottom lane
- `walls`: static blockers.
- `doors`: blockers that move between `closedY` and `openY`.
- `pressurePlates`: temporary door triggers.
- `platforms`: raised landing surfaces.
- `levers`: interactable toggles with simple base/stick visual sizes.
- `hazards`: `water`, `lava`, or `poison` pools.
- `gems`: `water` or `fire` collectibles.
- `exits`: goal zones.

Level progression is controlled by `LEVELS`, `FIRST_LEVEL_ID`,
`LEVEL_REGISTRY`, and `getNextLevelId()`. Add finished levels to `LEVELS` in
play order. Do not add templates to `LEVELS`.

## Gameplay rules

- Players choose Fire or Water after joining a room.
- Movement is side-view:
  - `A` / Left: move left
  - `D` / Right: move right
  - Space: jump
- Server owns positions, jump/gravity, collisions, hazards, gems, doors, exits,
  restart, and next-level progression.
- Pressure plates open doors only while occupied.
- Levers toggle doors on/off.
- Water is safe on water, dies on lava and poison.
- Fire is safe on lava, dies on water and poison.
- Water can collect only water gems.
- Fire can collect only fire gems.
- Required gems must be collected before completion.
- Both players must reach an exit before the level completes.
- Restart resets the current level.
- Next Level loads the next registered level; if none exists, the UI shows all
  levels complete.

## Side-view authoring tips

- Keep top and bottom lane objects near their lane `z` values.
- Use `platforms` for top-lane floors and jump steps.
- Keep `floor` for the bottom lane unless a level needs multiple bottom
  platforms.
- Keep doors narrow on `x` and tall on `y` for side-view gates.
- Keep hazards shallow on `y`, usually `0.06`.
- Place gems within `playerBounds`; validation checks this for required gems.
- Use simple boxes only. Do not add renderer-specific objects to level data.

## Template

See `packages/shared/src/sideViewLevelTemplate.ts` for a type-checked example
with:

- top and bottom lane spawns;
- platforms;
- one wall/blocker;
- water and lava hazards;
- water and fire gems;
- exits;
- optional pressure plate, lever, and door.

Copy the template into `levels.ts`, rename all ids, tune positions/sizes, then
register the finished level in `LEVELS`.

## Validation

The server calls `assertValidLevels(LEVELS)` at startup. Validation is
lightweight and dependency-free. It checks:

- `LEVELS` is not empty;
- unique level ids;
- unique object ids per level;
- required fields;
- numeric positions and sizes;
- at least two spawns;
- spawns, exits, and required gems are inside `playerBounds`;
- allowed hazard types;
- allowed gem types;
- valid platform sizes;
- at least one exit per level.

If validation fails, the server throws a clear error before listening.
