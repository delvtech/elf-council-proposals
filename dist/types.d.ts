export declare const testnetProposals: ProposalsJson;
export interface Proposal {
    proposalHash: string;
    proposalId: number;
    /**
     * Timestamp in seconds of the block the proposal was created in.
     */
    created: number;
    /**
     * Block number
     */
    expiration: number;
    /**
     * Block number
     */
    unlock: number;
    /**
     * Block number
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
