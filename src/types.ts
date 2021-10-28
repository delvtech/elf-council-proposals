export declare const testnetProposals: ProposalsJson;

export interface Proposal {
  proposalHash: string;
  proposalId: number;
  /**
   * Timestamp in seconds of the block the proposal was created in.
   */
  created: number;
  /**
   * Block number for last vote
   */
  expiration: number;
  /**
   * Block number for start of execution period
   */
  unlock: number;
  /**
   * Block number for end of execution period
   */
  lastCall: number;
  quorum: number;
  snapshotId: string;
}

export interface ProposalsJson {
  version: "0.0.0";
  snapshotSpace: string;
  proposals: Proposal[];
}
