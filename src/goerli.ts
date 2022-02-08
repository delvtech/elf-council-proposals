import { AddressesJsonFile } from "elf-council-tokenlist";
import { CoreVoting__factory } from "elf-council-typechain";
import { formatEther } from "ethers/lib/utils";
import fs from "fs";
import hre, { ethers } from "hardhat";

import { Proposal, ProposalsJson } from "src/types";

import { SNAPSHOT_SPACE_ID } from "src/snapshot";
import { BigNumber, providers } from "ethers";

const ALCHEMY_GOERLI_RPC_HOST =
  "https://eth-goerli.alchemyapi.io/v2/fBuOKVPGvseZZb0h8HyPIDqtKC7nslig";
const provider = new providers.JsonRpcProvider(ALCHEMY_GOERLI_RPC_HOST);

const addressesJson: AddressesJsonFile = require(`src/addresses/goerli.addresses.json`);
const proposalsJsonFile: ProposalsJson = require(`src/proposals/goerli.proposals.json`);
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
  "5": "0xc9899417b7b6e69ed856d74b6e7e40bcae4a0e2f90cf69547faf79548547d946",
};

const targetsByProposalId: Record<string, string[]> = {
  "0": ["0x36687bdD319a78AB4b4347f3A7459Da235AFc4f4"],
  "1": ["0x36687bdD319a78AB4b4347f3A7459Da235AFc4f4"],
  "2": ["0x36687bdD319a78AB4b4347f3A7459Da235AFc4f4"],
  "3": ["0x36687bdD319a78AB4b4347f3A7459Da235AFc4f4"],
  "4": ["0x36687bdD319a78AB4b4347f3A7459Da235AFc4f4"],
  "5": ["0x36687bdD319a78AB4b4347f3A7459Da235AFc4f4"],
};

const callDatasByProposalId: Record<string, string[]> = {
  "0": [
    "0x88b49b8372416bb3ac6f3b340cccdbafbf60420e75bb439760acfe30a9078e52e60b6e79",
  ],
  "1": [
    "0x88b49b8372416bb3ac6f3b340cccdbafbf60420e75bb439760acfe30a9078e52e60b6e79",
  ],
  "2": [
    "0x88b49b8364ec53acdd6f74efcba0de586952c40e23aa87d547d57fabb1ee21203b7b09ea",
  ],
  "3": [
    "0x88b49b8364ec53acdd6f74efcba0de586952c40e23aa87d547d57fabb1ee21203b7b09ea",
  ],
  "4": [
    "0x88b49b836772a5a4807b25bc0b6b5641b858d3363f93421880294675a8f519860f814c74",
  ],
  "5": [
    "0x88b49b836772a5a4807b25bc0b6b5641b858d3363f93421880294675a8f519860f814c74",
  ],
};

getProposals("src/proposals/goerli.proposals.json")
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

type ProposalCreatedEvent = [
  proposalId: BigNumber,
  created: BigNumber,
  execution: BigNumber,
  expiration: BigNumber
];
async function getProposals(outputPath: string): Promise<ProposalsJson> {
  // Source all proposals from events
  const proposalCreatedEvents = await coreVotingContract.queryFilter(
    coreVotingContract.filters.ProposalCreated()
  );

  const proposals: Proposal[] = await Promise.all(
    proposalCreatedEvents.map(
      async (
        {
          args,
          args: { proposalId: proposalIdBN, created, execution, expiration },
        },
        index
      ): Promise<Proposal> => {
        /* NOTE: 🚨 Forever Hack!
         * Because of how the smart contracts work, proposals have their memory
         * slots cleared once they've been executed. To prevent a loss of
         * information in proposals.json, we never refetch on-chain proposals
         * once they've been scraped the first time.
         */
        const proposalId = proposalIdBN.toString();
        const existingProposal = proposalsJsonFile.proposals.find(
          (p) => p.proposalId === proposalId
        );
        if (existingProposal) {
          return existingProposal;
        }
        /* End Hack */

        const createdBlock = await provider.getBlock(created.toNumber());

        const { proposalHash, lastCall, quorum } =
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
          unlock: execution.toNumber(),
          lastCall: lastCall.toNumber(),
          created: created.toNumber(),
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
