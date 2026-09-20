export type OfficialPlay = {
  id: string;
  date: string;
  sport: string;
  event: string;
  market: string;
  side: string;
  line: number | null;
  book: string;
  odds: number;
  stake: number;
  result: "W" | "L";
  pnl: number;
  prob?: string;
  notes: string;
  quality: string;
};

export type PaperBet = {
  id: string;
  timestamp: string;
  sport: string;
  event: string;
  market: string;
  side: string;
  line: number | null;
  odds: number;
  stake: number;
  source: string;
  result: "win" | "loss" | "void" | "not_bet";
  pnl: number;
  edge: number;
  model: string;
  classification?: string;
};

export type ModelState = {
  name: string;
  version: string;
  previousVersions: string[];
  updatedAt: string;
  status: string;
  maturity: string;
  edgeFloor: number;
  notes: string;
  official: {
    settledCount: number;
    record: string;
    riskedUsd: number;
    pnlUsd: number;
    rawRoiPct: number;
  };
  paper: {
    rows: number;
    open: number;
    settledWL: number;
    voids: number;
    pnlUsd: number;
  };
};

export type HubUpdate = {
  id: string;
  at: string;
  kind: "ledger" | "settle" | "model" | "manual";
  title: string;
  body: string;
};

export type HubSnapshot = {
  model: ModelState;
  official: OfficialPlay[];
  paper: PaperBet[];
  updates: HubUpdate[];
  generatedAt: string;
};
