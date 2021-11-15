import {
  ParsedDID,
  Resolver,
  DIDResolutionOptions,
  DIDResolutionResult,
  DIDResolver,
  VerificationMethod,
  DIDDocument,
} from "did-resolver";
import { Prefix, validateAddress, ValidationResult } from "@taquito/utils";

enum TezosNetworks {
  GRANADANET = "granadanet",
  FLORENCENET = "florencenet",
  MAINNET = "mainnet",
}

function validateNetwork(network: any): boolean {
  return Object.values(TezosNetworks).includes(network as TezosNetworks);
}

async function resolve(
  did: string,
  parsed: ParsedDID,
  _didResolver: Resolver,
  options: DIDResolutionOptions
): Promise<DIDResolutionResult> {
  const EMPTY_RESULT: DIDResolutionResult = {
    didResolutionMetadata: {},
    didDocument: null,
    didDocumentMetadata: {},
  };

  console.log("did = %s", did);
  for (let [key, value] of Object.entries(parsed))
    console.log("parsed.%s = %s", key, value);
  for (let [key, value] of Object.entries(options))
    console.log("options.%s = %s", key, value);

  const arr = parsed.id.split(":");

  if (arr.length !== 1 && arr.length !== 2) {
    return {
      ...EMPTY_RESULT,
      didResolutionMetadata: { error: "invalidIdentifier" },
    };
  }

  const address = arr[arr.length - 1];
  const validAddress = validateAddress(address);

  if (validAddress !== ValidationResult.VALID) {
    return {
      ...EMPTY_RESULT,
      didResolutionMetadata: { error: "invalidTezosAddress" },
    };
  }

  const network = arr.length === 2 && arr[0];
  const validNetwork = validateNetwork(network);

  if (typeof network === "string" && !validNetwork) {
    return {
      ...EMPTY_RESULT,
      didResolutionMetadata: { error: "invalidTezosNetwork" },
    };
  }

  if (parsed.id.startsWith(Prefix.KT1)) {
    return {
      ...EMPTY_RESULT,
      didResolutionMetadata: { error: "notImplemented" },
    };
  }

  const verificationMethod: VerificationMethod = {
    id: `${did}#blockchainAccountId`,
    type: "Ed25519PublicKeyBLAKE2BDigestSize20Base58CheckEncoded2021",
    controller: did,
    blockchainAccountId: `${address}@tezos${network ? `:${network}` : ""}`,
  };

  const didDocument: DIDDocument = {
    "@context": "https://www.w3.org/ns/did/v1",
    id: did,
    authentication: [verificationMethod],
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
