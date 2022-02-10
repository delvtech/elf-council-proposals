import { AddressesJsonFile } from "elf-council-tokenlist";
import { CoreVoting__factory } from "elf-council-typechain";
import { formatEther } from "ethers/lib/utils";
import fs from "fs";
import hre, { ethers } from "hardhat";

import { Proposal, ProposalsJson } from "src/types";

import { SNAPSHOT_SPACE_ID_GOERLI } from "src/snapshot";
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
  "0": "0xa924bf8887e96f64eabf30a5026eb432bd03b6f055df017061a1e480cf477c9a",
  "6": "0x91a739c399ba1b95d9b38013bf5c42b4cb83b56272b322d86587193859371f12",
  "7": "0x71df6710e26894685f985ae303b4bd64eeaa080f3e91703dac6ae539f66b5dd0",
};

const targetsByProposalId: Record<string, string[]> = {
  "0": ["0x36687bdD319a78AB4b4347f3A7459Da235AFc4f4"],
  "6": ["0x36687bdD319a78AB4b4347f3A7459Da235AFc4f4"],
  "7": ["0x36687bdD319a78AB4b4347f3A7459Da235AFc4f4"],
};

const callDatasByProposalId: Record<string, string[]> = {
  "0": [
    "0x88b49b8364ec53acdd6f74efcba0de586952c40e23aa87d547d57fabb1ee21203b7b09ea",
  ],
  "6": [
    "0x88b49b8364ec53acdd6f74efcba0de586952c40e23aa87d547d57fabb1ee21203b7b09ea",
  ],
  "7": [
    "0x88b49b8364ec53acdd6f74efcba0de586952c40e23aa87d547d57fabb1ee21203b7b09ea",
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
    proposalCreatedEvents
      .filter(
        ({
          args,
          args: { proposalId: proposalIdBN, created, execution, expiration },
        }) => {
          return !!snapshotIdsByProposalId[proposalIdBN.toString()];
        }
      )
      .map(
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
    snapshotSpace: SNAPSHOT_SPACE_ID_GOERLI,
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
