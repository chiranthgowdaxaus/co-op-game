import { spawn } from "node:child_process";

const children = ["@coop/server", "@coop/client"].map((workspace) =>
  spawn("npm", ["run", "dev", "-w", workspace], {
    stdio: "inherit",
  }),
);

const stop = () => children.forEach((child) => child.kill("SIGTERM"));

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

children.forEach((child) => {
  child.on("exit", (code) => {
    stop();
    process.exitCode = code ?? 0;
  });
});
