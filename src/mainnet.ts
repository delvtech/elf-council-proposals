import { mainnetAddressList } from "elf-council-tokenlist";
import { CoreVoting__factory } from "elf-council-typechain";
import fs from "fs";
import hre, { ethers } from "hardhat";

import { ProposalsJson } from "src/types";

import { providers } from "ethers";
import { getProposals } from "src/getProposals";
import { SNAPSHOT_SPACE_ID_MAINNET } from "src/snapshot";

const ALCHEMY_MAINNET_RPC_HOST = `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_MAINNET_API_KEY}`;

const provider = new providers.JsonRpcProvider(ALCHEMY_MAINNET_RPC_HOST);

const currentProposalsJson: ProposalsJson = require(`src/proposals/mainnet.proposals.json`);
const coreVotingContract = CoreVoting__factory.connect(
  mainnetAddressList.addresses.coreVoting,
  provider
);

/**
 * The mapping of on-chain proposal ids to their corresponding snapshot proposal
 * id (off-chain).
 */
const snapshotIdsByProposalId: Record<string, string> = {};

const targetsByProposalId: Record<string, string[]> = {};

const callDatasByProposalId: Record<string, string[]> = {};

(async function () {
  try {
    const newProposals = await getProposals(
      provider,
      coreVotingContract,
      snapshotIdsByProposalId,
      targetsByProposalId,
      callDatasByProposalId,
      currentProposalsJson.proposals.map((proposal) => proposal.proposalId)
    );

    const proposalsJson: ProposalsJson = {
      version: "0.0.0",
      snapshotSpace: SNAPSHOT_SPACE_ID_MAINNET,
      proposals: [...currentProposalsJson.proposals, ...newProposals],
    };
    const proposalsJsonString = JSON.stringify(proposalsJson, null, 2);
    console.log(proposalsJsonString);

    fs.writeFileSync(
      "src/proposals/mainnet.proposals.json",
      proposalsJsonString
    );
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
