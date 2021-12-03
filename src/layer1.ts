import { TezosToolkit } from "@taquito/taquito";
import { Prefix } from "@taquito/utils";
import { DIDResolutionResult, VerificationMethod } from "did-resolver";

export async function update(
  _tezosToolkit: TezosToolkit,
  result: DIDResolutionResult,
  {
    address,
    chainId,
    publicKey,
  }: { address: string; chainId: string; publicKey?: string }
): Promise<void> {
  if (address.startsWith(Prefix.KT1)) return;
  if (result.didDocument === null) return;

  const did = result.didDocument.id;

  const verificationMethod: VerificationMethod = {
    id: `${did}#blockchainAccountId`,
    type: "Ed25519PublicKeyBLAKE2BDigestSize20Base58CheckEncoded2021",
    controller: did,
    blockchainAccountId: `tezos:${chainId}:${address}`,
  };
  const authentication: VerificationMethod = {
    id: `${did}#blockchainAccountId`,
    type: "Ed25519PublicKeyBLAKE2BDigestSize20Base58CheckEncoded2021",
    controller: did,
    publicKeyBase58: publicKey,
  };
  result.didDocument.verificationMethod = [verificationMethod];
  result.didDocument.authentication = [
    publicKey ? authentication : verificationMethod.id,
  ];
  result.didDocument.assertionMethod = [verificationMethod.id];
}
