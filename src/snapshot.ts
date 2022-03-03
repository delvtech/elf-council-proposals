import { gql, request } from "graphql-request";

const SNAPSHOT_GRAPHQL_ENDPOINT = "https://hub.snapshot.org/graphql";

export const SNAPSHOT_SPACE_ID_MAINNET = "element-finance.eth";
export const SNAPSHOT_SPACE_ID_GOERLI = "element-finance-goerli.eth";

export interface SnapshotProposal {
  body: string;
  title: string;
}

export async function fetchSnapshotProposalTitleAndBody(
  snapshotId: string
): Promise<SnapshotProposal> {
  const { proposals } = await request(
    SNAPSHOT_GRAPHQL_ENDPOINT,
    gql`
      query {
        proposals(
          where: { id: ${JSON.stringify(snapshotId)} }
        ) {
          title
          body
        }
      }
    `
  );

  // return the first result, as we're only looking up a single snapshot id
  return proposals[0];
}
