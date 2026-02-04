export interface LeagueTransferResult {
  playersTransferred: number;
  charactersTransferred: number;
  bagItemsTransferred: number;
  goldTransferred: bigint;
  sourceLeagueId: string;
  targetLeagueId: string;
}

export interface LeagueTransferPlayerResult {
  telegramId: string;
  goldMerged: string;
  charactersMoved: number;
  bagItemsMoved: number;
}
