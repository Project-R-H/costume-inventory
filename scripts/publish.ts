import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

function run(cmd: string, args: string[], allowFail = false) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (!allowFail && (r.status ?? 1) !== 0) process.exit(r.status ?? 1);
  return r.status ?? 0;
}

function capture(cmd: string, args: string[]) {
  const r = spawnSync(cmd, args, { encoding: "utf8", shell: false });
  if ((r.status ?? 1) !== 0) return "";
  return (r.stdout ?? "").toString();
}

const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

run(npmCmd, ["run", "gen"]);

if (!existsSync(".git")) {
  console.log("ERROR: このフォルダは git リポジトリではありません（git init が必要）");
  process.exit(1);
}

run("git", ["add", "-A"]);

const status = capture("git", ["status", "--porcelain"]).trim();
if (!status) {
  console.log("変更なし：commit/push をスキップ");
  process.exit(0);
}

run("git", ["commit", "-m", "update"]);
run("git", ["push"]);

console.log("push完了 → GitHub Actions → Pages更新");