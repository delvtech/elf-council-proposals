import hre, { ethers } from "hardhat";
import fs from "fs";
import { AddressesJsonFile } from "src/addresses/AddressesJsonFile";
import { Proposal, ProposalsJson } from "src/types";
import { CoreVoting__factory } from "elf-council-typechain";

const provider = hre.ethers.provider;
const addressesJson: AddressesJsonFile = require(`src/addresses/testnet.addresses.json`);
const coreVotingContract = CoreVoting__factory.connect(
  addressesJson.addresses.coreVoting,
  provider
);

/**
 * For testnet just use a snapshot space w/ enough proposals populating it, ie:
 * Yam Finance
 */
const snapshotSpace = "yam.eth";

/**
 * A mapping of localhost CoreVoting Proposal IDs -> random Snapshot proposal ids from Yam.
 * This is how we show titles/descriptions for testnet proposals in dev.
 */
const snapshotIdsByProposalId: Record<string, string> = {
  "0": "QmZTGLiixG5Z28AuhDuVxkCBePpn4nrmoMargqcC8Mk7xw",
  "1": "QmPxMCuejEg9g3avMpbDwQjjo3ihEqeCMU3mMsHLyiauKE",
  "2": "QmSYrh4QD3iCgyGTFSMr2meRJddvBdhf9xtDbRH3y6w29A",
  "3": "QmTH6QZnNxrRGhMxyEbwiE7VFPCTz1TYGnDHRJghnvgMR9",
  "4": "QmeyKkjuqbfyrJfWVFJw6STLxd1EZcMVfTNfYepPT1poUG",
  "5": "QmT5o98bCNocPT5mHF6ApUFr1577HMtR84DnimM2xP2Z4P",
  "6": "QmdU2Xq6C4Ljrqm37Qz2pGzSKwESwDhohR3yYrDth28h5P",
  "7": "Qmagqp9z59D36dt22HX8sk6SdW21nNkBpLRsu7H38hgs65",
  "8": "QmNQBdxkjK5WCFUAKViXWT6utTDXXMYCQ2WU9BdoubdrNH",
  "9": "QmcmbqctnhMCaRHEBAAvz4jTk98bMV7ft6nozpv9tizpox",
  "10": "QmRwUZdc4B7qP9Kfp7GtggRVunoydMVzqLaLkM6qc58ZXr",
  "11": "QmZjCqA5581cBrys7T2Du8CN2R1FoKJbRP4J9rs7jcGaWu",
  "12": "QmYa5RuQNAFqNq3DuBv1G24izWB9LomKZE3Pq2DvAeb7db",
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

        return {
          proposalId: proposalIdNumber,
          proposalHash: proposalHash,
          unlock: unlock.toNumber(),
          lastCall: lastCall.toNumber(),
          created: createdBlock.timestamp,
          expiration: expiration.toNumber(),
          quorum: quorum.toNumber(),
          snapshotId: snapshotIdsByProposalId[proposalIdNumber],
        };
      }
    )
  );

  const proposalsJson: ProposalsJson = {
    version: "0.0.0",
    snapshotSpace,
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
