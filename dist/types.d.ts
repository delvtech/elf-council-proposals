export declare const testnetProposals: ProposalsJson;
export interface Proposal {
    /**
     * A hash of the targets and calldatas for the proposal
     */
    proposalHash: string;
    /**
     * The nonce identifier of the proposal stored in CoreVoting
     */
    proposalId: string;
    /**
     * The block number the proposal was create at
     */
    created: number;
    /**
     * Timestamp in seconds of the block the proposal was created in
     */
    createdTimestamp: number;
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
    /**
     * minimum vote power to pass or reject a proposal
     */
    quorum: number;
    /**
     * list of addresses the Timelock contract will call when executing a proposal
     */
    targets: string[];
    /**
     * The calldata associated with each target address, must be the same length as targets
     */
    calldatas: string[];
    /**
     * id of the snapshot proposal
     */
    snapshotId: string;
}
export interface ProposalsJson {
    version: "0.0.0";
    snapshotSpace: string;
    proposals: Proposal[];
}
