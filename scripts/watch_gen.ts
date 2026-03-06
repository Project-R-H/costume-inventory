import chokidar from "chokidar";
import { spawn } from "node:child_process";

const targets = ["衣装管理.xlsx", "public/衣装写真/**/*.*"];

let running = false;
let queued = false;

function runGen() {
  if (running) { queued = true; return; }
  running = true;
  queued = false;

  const p = spawn("npm", ["run", "gen"], { stdio: "inherit", shell: true });
  p.on("close", () => {
    running = false;
    if (queued) runGen();
  });
}

console.log("watch:gen 監視開始:", targets.join(", "));
chokidar.watch(targets, { ignoreInitial: true }).on("all", (_ev, file) => {
  console.log("変更検知:", file);
  runGen();
});