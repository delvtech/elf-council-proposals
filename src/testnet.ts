import { AddressesJsonFile } from "elf-council-tokenlist";
import { CoreVoting__factory } from "elf-council-typechain";
import { formatEther } from "ethers/lib/utils";
import fs from "fs";
import hre from "hardhat";

import { Proposal, ProposalsJson } from "src/types";

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
  "3": "0x7c0bea7eb9340c9bbfcce5ba6b9ca3cbf46e214a7a8f113ab27472378a77aff5",
  "4": "0x45bdb2351a21da73162ba018a7b448231945b7754abec0ecdc66c3778e9e7720",
};

const targetsByProposalId: Record<string, string[]> = {
  "0": ["0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1"],
  "1": ["0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1"],
  "2": ["0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1"],
  "3": ["0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1"],
  "4": ["0x4ed7c70F96B99c776995fB64377f0d4aB3B0e1C1"],
};

const callDatasByProposalId: Record<string, string[]> = {
  "0": [
    "0x88b49b834dbdd3e053743c5483a6f5f453200c2c9201e1330e5e5f99997aafcbe4389a2a",
  ],
  "1": [
    "0x88b49b834dbdd3e053743c5483a6f5f453200c2c9201e1330e5e5f99997aafcbe4389a2a",
  ],
  "2": [
    "0x88b49b834dbdd3e053743c5483a6f5f453200c2c9201e1330e5e5f99997aafcbe4389a2a",
  ],
  "3": [
    "0x88b49b834dbdd3e053743c5483a6f5f453200c2c9201e1330e5e5f99997aafcbe4389a2a",
  ],
  "4": [
    "0x88b49b834dbdd3e053743c5483a6f5f453200c2c9201e1330e5e5f99997aafcbe4389a2a",
  ],
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
      async ({
        args,
        args: { proposalId: proposalIdBN, created },
      }): Promise<Proposal> => {
        const proposalId = proposalIdBN.toString();
        const createdBlock = await provider.getBlock(created.toNumber());

        const { unlock, expiration, proposalHash, lastCall, quorum } =
          await coreVotingContract.functions.proposals(proposalIdBN);

        const snapshotId =
          snapshotIdsByProposalId[proposalId] ||
          // Temporary: default to the first one if more proposals exist
          // on-chain than are in the snapshot space,
          snapshotIdsByProposalId[0];

        const targets = targetsByProposalId[proposalId];
        const calldatas = callDatasByProposalId[proposalId];

        return {
          proposalId,
          proposalHash: proposalHash,
          unlock: unlock.toNumber(),
          lastCall: lastCall.toNumber(),
          created: createdBlock.number,
          createdTimestamp: createdBlock.timestamp,
          expiration: expiration.toNumber(),
          quorum: formatEther(quorum),
          targets,
          calldatas,
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
