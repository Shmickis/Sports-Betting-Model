import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import type {
  HubSnapshot,
  HubUpdate,
  ModelState,
  OfficialPlay,
  PaperBet,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const RUNTIME_DIR = path.join(process.cwd(), ".runtime");

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(path.join(DATA_DIR, file), "utf8")) as T;
}

function ensureRuntime() {
  if (!existsSync(RUNTIME_DIR)) mkdirSync(RUNTIME_DIR, { recursive: true });
}

function runtimePath(file: string) {
  return path.join(RUNTIME_DIR, file);
}

function loadMutable<T>(file: string, seedFile: string): T {
  ensureRuntime();
  const target = runtimePath(file);
  if (!existsSync(target)) {
    writeFileSync(target, readFileSync(path.join(DATA_DIR, seedFile)));
  }
  return JSON.parse(readFileSync(target, "utf8")) as T;
}

function saveMutable(file: string, data: unknown) {
  ensureRuntime();
  writeFileSync(runtimePath(file), JSON.stringify(data, null, 2));
}

function recomputeOfficial(official: OfficialPlay[]) {
  const wins = official.filter((p) => p.result === "W").length;
  const losses = official.filter((p) => p.result === "L").length;
  const pnl = official.reduce((s, p) => s + p.pnl, 0);
  const risked = official.reduce((s, p) => s + p.stake, 0);
  return {
    settledCount: official.length,
    record: `${wins}-${losses}`,
    riskedUsd: Number(risked.toFixed(2)),
    pnlUsd: Number(pnl.toFixed(2)),
    rawRoiPct: risked ? Number(((pnl / risked) * 100).toFixed(2)) : 0,
  };
}

function recomputePaper(paper: PaperBet[]) {
  const graded = paper.filter((p) => p.result === "win" || p.result === "loss");
  return {
    rows: paper.length,
    open: paper.filter((p) => p.result === "not_bet").length,
    settledWL: graded.length,
    voids: paper.filter((p) => p.result === "void").length,
    pnlUsd: Number(graded.reduce((s, p) => s + p.pnl, 0).toFixed(2)),
  };
}

export function getSnapshot(): HubSnapshot {
  const model = loadMutable<ModelState>("model-state.json", "model-state.json");
  const official = loadMutable<OfficialPlay[]>(
    "official-plays.json",
    "official-plays.json",
  );
  const paper = loadMutable<PaperBet[]>("paper-bets.json", "paper-bets.json");
  const updates = loadMutable<HubUpdate[]>("updates.json", "updates.json");

  model.official = recomputeOfficial(official);
  model.paper = recomputePaper(paper);

  return {
    model,
    official,
    paper,
    updates: [...updates].sort((a, b) => b.at.localeCompare(a.at)),
    generatedAt: new Date().toISOString(),
  };
}

export type ModelPatch = {
  version?: string;
  notes?: string;
  status?: string;
  edgeFloor?: number;
  message?: string;
};

export function applyModelUpdate(patch: ModelPatch): HubSnapshot {
  const model = loadMutable<ModelState>("model-state.json", "model-state.json");
  const updates = loadMutable<HubUpdate[]>("updates.json", "updates.json");

  if (patch.version && patch.version !== model.version) {
    model.previousVersions = [
      model.version,
      ...model.previousVersions.filter((v) => v !== patch.version),
    ].slice(0, 12);
    model.version = patch.version;
  }
  if (typeof patch.notes === "string") model.notes = patch.notes;
  if (typeof patch.status === "string") model.status = patch.status;
  if (typeof patch.edgeFloor === "number") model.edgeFloor = patch.edgeFloor;
  model.updatedAt = new Date().toISOString();

  const update: HubUpdate = {
    id: `u-${Date.now()}`,
    at: model.updatedAt,
    kind: "manual",
    title: patch.message?.trim() || `Model bumped to ${model.version}`,
    body:
      patch.notes?.trim() ||
      `Live desk update · status ${model.status} · edge floor ${model.edgeFloor}`,
  };
  updates.unshift(update);

  saveMutable("model-state.json", model);
  saveMutable("updates.json", updates);
  return getSnapshot();
}

export type PaperPatch = {
  id: string;
  result?: PaperBet["result"];
  pnl?: number;
  classification?: string;
};

export function patchPaperBet(patch: PaperPatch): HubSnapshot {
  const paper = loadMutable<PaperBet[]>("paper-bets.json", "paper-bets.json");
  const updates = loadMutable<HubUpdate[]>("updates.json", "updates.json");
  const target = paper.find((p) => p.id === patch.id);
  if (!target) throw new Error("Paper bet not found");

  if (patch.result) target.result = patch.result;
  if (typeof patch.pnl === "number") target.pnl = patch.pnl;
  if (patch.classification) target.classification = patch.classification;

  const update: HubUpdate = {
    id: `u-${Date.now()}`,
    at: new Date().toISOString(),
    kind: "settle",
    title: `Paper board: ${target.side}`,
    body: `${target.event || target.sport} · ${target.result.toUpperCase()} · P/L $${target.pnl}`,
  };
  updates.unshift(update);

  saveMutable("paper-bets.json", paper);
  saveMutable("updates.json", updates);

  const model = loadMutable<ModelState>("model-state.json", "model-state.json");
  model.paper = recomputePaper(paper);
  model.updatedAt = update.at;
  saveMutable("model-state.json", model);

  return getSnapshot();
}

export function seedIfNeeded() {
  // Touch seed files so first read works in fresh deploys
  readJson<ModelState>("model-state.json");
}
