import { ChainIds } from "@taquito/taquito";
import { Prefix, validateAddress, ValidationResult } from "@taquito/utils";
import {
  DIDDocument,
  DIDResolutionOptions,
  DIDResolutionResult,
  DIDResolver,
  ParsedDID,
  Resolver,
  VerificationMethod,
} from "did-resolver";

enum TezosNetworks {
  GRANADANET = "granadanet",
  MAINNET = "mainnet",
}

function validateNetwork(network: any): boolean {
  return Object.values(TezosNetworks).includes(network as TezosNetworks);
}

async function resolve(
  did: string,
  parsed: ParsedDID,
  _didResolver: Resolver,
  _options: DIDResolutionOptions
): Promise<DIDResolutionResult> {
  const EMPTY_RESULT: DIDResolutionResult = {
    didResolutionMetadata: {},
    didDocument: null,
    didDocumentMetadata: {},
  };

  const arr = parsed.id.split(":");

  if (arr.length !== 1 && arr.length !== 2) {
    return {
      ...EMPTY_RESULT,
      didResolutionMetadata: { error: "invalidDid" },
    };
  }

  const address = arr[arr.length - 1];
  const validAddress = validateAddress(address);

  if (validAddress !== ValidationResult.VALID) {
    return {
      ...EMPTY_RESULT,
      didResolutionMetadata: { error: "invalidDid" },
    };
  }

  const network = arr.length === 2 ? arr[0] : TezosNetworks.MAINNET;
  const validNetwork = validateNetwork(network);

  if (!validNetwork) {
    return {
      ...EMPTY_RESULT,
      didResolutionMetadata: { error: "invalidDid" },
    };
  }

  if (parsed.id.startsWith(Prefix.KT1)) {
    return {
      ...EMPTY_RESULT,
      didResolutionMetadata: { error: "notImplemented" },
    };
  }

  const chainId = ChainIds[network.toUpperCase() as "MAINNET" | "GRANADANET"];

  const verificationMethod: VerificationMethod = {
    id: `${did}#blockchainAccountId`,
    type: "Ed25519PublicKeyBLAKE2BDigestSize20Base58CheckEncoded2021",
    controller: did,
    blockchainAccountId: `tezos:${chainId}:${address}`,
  };

  const didDocument: DIDDocument = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/v1",
    ],
    id: did,
    verificationMethod: [verificationMethod],
    authentication: [verificationMethod.id],
    assertionMethod: [verificationMethod.id],
  };

  return {
    ...EMPTY_RESULT,
    didDocument,
    didResolutionMetadata: { contentType: "application/did+ld+json" },
  };
}

export default {
  getResolver(): Record<string, DIDResolver> {
    return { tz: resolve };
  },
};
