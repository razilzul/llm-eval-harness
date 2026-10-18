import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";

let child: ChildProcess;
let nextId = 1;
const waiting = new Map<number, (m: any) => void>();

function rpc(method: string, params?: unknown): Promise<any> {
  const id = nextId++;
  return new Promise((resolve) => {
    waiting.set(id, resolve);
    child.stdin!.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  });
}

const call = async (name: string, args: unknown) => {
  const res = await rpc("tools/call", { name, arguments: args });
  return { isError: !!res.result.isError, body: res.result.content[0].text as string };
};

before(() => {
  child = spawn(process.execPath, ["--import", "tsx", "src/mcp.ts"], { stdio: ["pipe", "pipe", "inherit"] });
  createInterface({ input: child.stdout! }).on("line", (line) => {
    const m = JSON.parse(line); // throws if stdout carries anything but JSON
    waiting.get(m.id)?.(m);
  });
});
after(() => child.kill());

test("initialize echoes a supported protocol version", async () => {
  const res = await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "t", version: "0" } });
  assert.equal(res.result.protocolVersion, "2025-06-18");
  assert.ok(res.result.capabilities.tools);
  child.stdin!.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
});

test("tools/list exposes both tools", async () => {
  const res = await rpc("tools/list");
  assert.deepEqual(res.result.tools.map((t: any) => t.name), ["run_golden_set", "compare_models"]);
});

test("run_golden_set: mock:strong passes every case", async () => {
  const { isError, body } = await call("run_golden_set", { model: "mock:strong" });
  assert.equal(isError, false);
  const out = JSON.parse(body);
  assert.equal(out.accuracy, 1);
  assert.equal(out.trapAccuracy, 1);
  assert.deepEqual(out.failures, []);
});

test("run_golden_set: mock:weak lists failing traps", async () => {
  const out = JSON.parse((await call("run_golden_set", { model: "mock:weak" })).body);
  assert.ok(out.trapAccuracy < 1);
  assert.ok(out.failures.some((f: any) => f.id.startsWith("trap-")));
});

test("compare_models: weak -> strong passes the gate", async () => {
  const out = JSON.parse((await call("compare_models", { baseline: "mock:weak", candidate: "mock:strong" })).body);
  assert.equal(out.gate.passed, true);
});

test("compare_models: strong -> weak fails the gate with reasons", async () => {
  const out = JSON.parse((await call("compare_models", { baseline: "mock:strong", candidate: "mock:weak" })).body);
  assert.equal(out.gate.passed, false);
  assert.ok(out.gate.reasons.length > 0);
});

test("bad model ref is a tool error, not a crash", async () => {
  const { isError, body } = await call("run_golden_set", { model: "nonsense" });
  assert.equal(isError, true);
  assert.match(body, /Bad model ref/);
  assert.equal((await rpc("ping")).result !== undefined, true);
});

test("unknown tool and unknown method return JSON-RPC errors", async () => {
  assert.equal((await rpc("tools/call", { name: "nope" })).error.code, -32602);
  assert.equal((await rpc("nope")).error.code, -32601);
});
