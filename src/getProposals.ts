import { formatEther } from "ethers/lib/utils";
import { Proposal, ProposalsJson } from "src/types";
import { fetchSnapshotProposalTitleAndBody } from "src/snapshot";
import { providers } from "ethers";
import { CoreVoting } from "elf-council-typechain";

export async function getProposals(
  provider: providers.JsonRpcProvider,
  coreVotingContract: CoreVoting,
  snapshotIdsByProposalId: Record<string, string>,
  targetsByProposalId: Record<string, string[]>,
  callDatasByProposalId: Record<string, string[]>,
  proposalIdsToSkip: string[] = []
): Promise<Proposal[]> {
  // Source all on-chain proposals from events
  const onChainProposalCreatedEvents = await coreVotingContract.queryFilter(
    coreVotingContract.filters.ProposalCreated()
  );

  /* NOTE: 🚨 Forever Hack!
   * Because of how the smart contracts work, proposals have their memory slots
   * cleared once they've been executed. This means we can't guarantee a
   * proposal's state will exist forever. To handle this, once you've scraped a
   * proposal, you can add it to the list of proposals to skip for future runs.
   */
  const newOnChainProposals = onChainProposalCreatedEvents.filter((events) => {
    const proposalId = events.args.proposalId.toString();
    const isNewProposal = !proposalIdsToSkip.find((p) => p === proposalId);
    const hasSnapshotMatch = !!snapshotIdsByProposalId[proposalId];
    return isNewProposal && hasSnapshotMatch;
  });

  const newProposalPromises = newOnChainProposals.map(
    async ({
      args: { proposalId: proposalIdBN, created, execution, expiration },
    }): Promise<Proposal> => {
      const createdBlock = await provider.getBlock(created.toNumber());
      const proposalId = proposalIdBN.toString();

      const { proposalHash, lastCall, quorum } =
        await coreVotingContract.functions.proposals(proposalIdBN);

      const snapshotId =
        snapshotIdsByProposalId[proposalId] ||
        // Temporary: default to the first one if more proposals exist
        // on-chain than are in the snapshot space,
        snapshotIdsByProposalId[0];

      const { body: description, title } =
        await fetchSnapshotProposalTitleAndBody(snapshotId);

      const targets = targetsByProposalId[proposalId];
      const calldatas = callDatasByProposalId[proposalId];

      return {
        proposalId,
        description,
        title,
        proposalHash: proposalHash,
        unlock: execution.toNumber(),
        lastCall: lastCall.toNumber(),
        created: created.toNumber(),
        createdTimestamp: createdBlock.timestamp,
        expiration: expiration.toNumber(),
        quorum: formatEther(quorum),
        targets,
        calldatas,
        snapshotId,
      };
    }
  );

  return Promise.all(newProposalPromises);
}
