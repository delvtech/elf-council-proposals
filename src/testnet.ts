import { AddressesJsonFile } from "@elementfi/elf-council-tokenlist";
import { CoreVoting__factory } from "@elementfi/elf-council-typechain";
import fs from "fs";
import hre from "hardhat";

import { ProposalsJson } from "src/types";

import { SNAPSHOT_SPACE_ID_GOERLI } from "src/snapshot";
import { getProposals } from "src/getProposals";

const provider = hre.ethers.provider;
const addressesJson: AddressesJsonFile = require(`src/addresses/testnet.addresses.json`);

const coreVotingContract = CoreVoting__factory.connect(
  addressesJson.addresses.coreVoting,
  provider
);

const gscCoreVotingContract = CoreVoting__factory.connect(
  addressesJson.addresses.gscCoreVoting,
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

/**
 * A mapping of localhost CoreVoting Proposal IDs -> random Snapshot proposal
 * ids from Element Finance.  This is how we show titles/descriptions for
 * testnet proposals in dev.
 *
 * Note: Sometimes the snapshot proposal ids are IPFS strings or hex strings 🤷
 */
const gscSnapshotIdsByProposalId: Record<string, string> = {
  "0": "0x91a739c399ba1b95d9b38013bf5c42b4cb83b56272b322d86587193859371f12",
  "1": "0x71df6710e26894685f985ae303b4bd64eeaa080f3e91703dac6ae539f66b5dd0",
  "2": "0xa924bf8887e96f64eabf30a5026eb432bd03b6f055df017061a1e480cf477c9a",
};

const gscTargetsByProposalId: Record<string, string[]> = {
  "0": ["0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"],
  "1": ["0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"],
  "2": ["0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6"],
};

const gscCallDatasByProposalId: Record<string, string[]> = {
  "0": [
    "0x3eba045b000000000000000000000000000000000000000000000005f68e8131ecf80000",
  ],
  "1": [
    "0x3eba045b000000000000000000000000000000000000000000000005f68e8131ecf80000",
  ],
  "2": [
    "0x3eba045b000000000000000000000000000000000000000000000005f68e8131ecf80000",
  ],
};

(async function () {
  try {
    const newProposals = await getProposals(
      provider,
      coreVotingContract,
      snapshotIdsByProposalId,
      targetsByProposalId,
      callDatasByProposalId
    );

    const newGscProposals = await getProposals(
      provider,
      gscCoreVotingContract,
      gscSnapshotIdsByProposalId,
      gscTargetsByProposalId,
      gscCallDatasByProposalId
    );

    const proposalsJson: ProposalsJson = {
      version: "0.0.0",
      // hardhat should use the goerli snapshot
      snapshotSpace: SNAPSHOT_SPACE_ID_GOERLI,
      proposals: newProposals,
    };
    const proposalsJsonString = JSON.stringify(proposalsJson, null, 2);
    console.log(proposalsJsonString);

    fs.writeFileSync("dist/testnet.proposals.json", proposalsJsonString);

    const gscProposalsJson: ProposalsJson = {
      version: "0.0.0",
      // hardhat should use the goerli snapshot
      snapshotSpace: SNAPSHOT_SPACE_ID_GOERLI,
      proposals: newGscProposals,
    };
    const gscProposalsJsonString = JSON.stringify(gscProposalsJson, null, 2);
    console.log(gscProposalsJsonString);

    fs.writeFileSync("dist/testnet-gsc.proposals.json", gscProposalsJsonString);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
