import { AddressesJsonFile } from "elf-council-tokenlist";
import { CoreVoting__factory } from "elf-council-typechain";
import { formatEther } from "ethers/lib/utils";
import fs from "fs";
import hre from "hardhat";

import { Proposal, ProposalsJson } from "src/types";

import { SNAPSHOT_SPACE_ID_GOERLI } from "src/snapshot";

const provider = hre.ethers.provider;
const addressesJson: AddressesJsonFile = require(`src/addresses/testnet.addresses.json`);
const coreVotingContract = CoreVoting__factory.connect(
  addressesJson.addresses.coreVoting,
  provider
);

/**
 * A mapping of localhost CoreVoting Proposal IDs -> random Snapshot proposal
 * ids from Element Finance's goerli space.  This is how we show
 * titles/descriptions for testnet proposals in dev.
 *
 * Note: Sometimes the snapshot proposal ids are IPFS strings or hex strings 🤷
 */
const snapshotIdsByProposalId: Record<
  /* onchain proposal id */ string,
  /* snapshot proposal id */ string
> = {
  "0": "0xa924bf8887e96f64eabf30a5026eb432bd03b6f055df017061a1e480cf477c9a",
  "1": "0x91a739c399ba1b95d9b38013bf5c42b4cb83b56272b322d86587193859371f12",
  "2": "0x71df6710e26894685f985ae303b4bd64eeaa080f3e91703dac6ae539f66b5dd0",
};

const targetsByProposalId: Record<
  /* onchain proposal id */ string,
  /* targets id */ string[]
> = {
  "0": ["0x36687bdD319a78AB4b4347f3A7459Da235AFc4f4"],
  "1": ["0x36687bdD319a78AB4b4347f3A7459Da235AFc4f4"],
  "2": ["0x36687bdD319a78AB4b4347f3A7459Da235AFc4f4"],
};

const callDatasByProposalId: Record<
  /* onchain proposal id */ string,
  /* calldatas id */ string[]
> = {
  "0": [
    "0x88b49b8364ec53acdd6f74efcba0de586952c40e23aa87d547d57fabb1ee21203b7b09ea",
  ],
  "1": [
    "0x88b49b8364ec53acdd6f74efcba0de586952c40e23aa87d547d57fabb1ee21203b7b09ea",
  ],
  "2": [
    "0x88b49b8364ec53acdd6f74efcba0de586952c40e23aa87d547d57fabb1ee21203b7b09ea",
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
