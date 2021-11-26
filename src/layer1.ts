import { TezosToolkit } from "@taquito/taquito";
import { DIDResolutionResult, VerificationMethod } from "did-resolver";

export async function update(
  tezosToolkit: TezosToolkit,
  result: DIDResolutionResult,
  { address }: { address: string }
): Promise<void> {
  if (result.didDocument === null) return;

  result.didResolutionMetadata.contentType = "application/did+ld+json";

  const did = result.didDocument.id;
  const chainId = await tezosToolkit.rpc.getChainId();

  const verificationMethod: VerificationMethod = {
    id: `${did}#blockchainAccountId`,
    type: "Ed25519PublicKeyBLAKE2BDigestSize20Base58CheckEncoded2021",
    controller: did,
    blockchainAccountId: `tezos:${chainId}:${address}`,
  };
  result.didDocument.verificationMethod = [verificationMethod];
  result.didDocument.authentication = [verificationMethod.id];
  result.didDocument.assertionMethod = [verificationMethod.id];
}
