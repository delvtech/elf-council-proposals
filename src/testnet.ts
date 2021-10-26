import hre, { ethers } from "hardhat";
import fs from "fs";
import { AddressesJsonFile } from "src/addresses/AddressesJsonFile";
import { Proposal, ProposalsJson } from "src/types";
import { CoreVoting__factory } from "elf-council-typechain";
import { SNAPSHOT_SPACE_ID } from "src/snapshot";

const provider = hre.ethers.provider;
const addressesJson: AddressesJsonFile = require(`src/addresses/testnet.addresses.json`);
const coreVotingContract = CoreVoting__factory.connect(
  addressesJson.addresses.coreVoting,
  provider
);

/**
 * A mapping of localhost CoreVoting Proposal IDs -> random Snapshot proposal
 * ids from Element Finance.  This is how we show titles/descriptions for
 * testnet proposals in dev.
 *
 * Note: Sometimes the snapshot proposal ids are IPFS strings or hex strings 🤷
 */
const snapshotIdsByProposalId: Record<string, string> = {
  "0": "QmZSURBMfMh2qSTPSSjjaL2qPdqTMJsfpkvwxuKe72bH3y",
  "1": "0x46b4c3dbdb4b8b84fe42660ac5b5a41b9026c472c22e8a8d4a76ba71bf3dd825",
  "2": "0x0527654d3f94d4798d34ac8ec574da9203f7efe4b4a7a87092fa316abde25932",
};

getProposals("dist/testnet.proposals.json")
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

async function getProposals(outputPath: string): Promise<ProposalsJson> {
  // Source all proposals from events
  const proposalCreatedEvents = await coreVotingContract.queryFilter(
    coreVotingContract.filters.ProposalCreated()
  );

  const proposals: Proposal[] = await Promise.all(
    proposalCreatedEvents.map(
      async ({ args, args: { proposalId, created } }): Promise<Proposal> => {
        const proposalIdNumber = proposalId.toNumber();
        const createdBlock = await provider.getBlock(created.toNumber());

        const { unlock, expiration, proposalHash, lastCall, quorum } =
          await coreVotingContract.functions.proposals(proposalId);

        const snapshotId =
          snapshotIdsByProposalId[proposalIdNumber] ||
          // Temporary: default to the first one if more proposals exist
          // on-chain than are in the snapshot space,
          snapshotIdsByProposalId[0];

        return {
          proposalId: proposalIdNumber,
          proposalHash: proposalHash,
          unlock: unlock.toNumber(),
          lastCall: lastCall.toNumber(),
          created: createdBlock.timestamp,
          expiration: expiration.toNumber(),
          quorum: quorum.toNumber(),
          snapshotId: snapshotId,
        };
      }
    )
  );

  const proposalsJson: ProposalsJson = {
    version: "0.0.0",
    snapshotSpace: SNAPSHOT_SPACE_ID,
    proposals,
  };

  const proposalsJsonString = JSON.stringify(proposalsJson, null, 2);

  console.log(proposalsJsonString);

  // TODO: We have to validate this json schema ourselves before it can be
  // published to the uniswap directory.  For now, just look at this file in
  // vscode and make sure there are no squiggles.
  fs.writeFileSync(outputPath, proposalsJsonString);

  return proposalsJson;
}
