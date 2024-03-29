import { HttpRequestFailed, HttpResponseError } from "@taquito/http-utils";
import { TezosToolkit } from "@taquito/taquito";
import { Tzip16Module } from "@taquito/tzip16";
import {
  DIDResolutionOptions,
  DIDResolutionResult,
  DIDResolver,
  ParsedDID,
  Resolvable,
} from "did-resolver";
import { update as updateLayer1 } from "./layer1";
import { update as updateLayer2 } from "./layer2";
import { update as updateLayer3 } from "./layer3";
import { validateIdentifier, buildIndexerFromNetwork } from "./utils";

async function resolve(
  did: string,
  parsed: ParsedDID,
  _didResolver: Resolvable,
  options: DIDResolutionOptions
): Promise<DIDResolutionResult> {
  const result: DIDResolutionResult = {
    "@context": "https://w3id.org/did-resolution/v1",
    didResolutionMetadata: {},
    didDocument: null,
    didDocumentMetadata: {},
  };

  const validIdentifier = validateIdentifier(parsed.id);
  if (!validIdentifier) {
    return {
      ...result,
      didResolutionMetadata: { error: "invalidDid" },
    };
  }

  const { network, address } = validIdentifier;

  const rpc = options.rpc || `https://${network}.smartpy.io`;
  const tezosToolkit = new TezosToolkit(rpc);
  tezosToolkit.addExtension(new Tzip16Module());

  const chainId = await tezosToolkit.rpc.getChainId();

  result.didResolutionMetadata.contentType = "application/did+ld+json";
  result.didDocument = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/v1",
      "https://w3id.org/security/v2",
      "https://w3id.org/security/suites/jws-2020/v1",
      "https://w3id.org/security/suites/bls12381-2020/v1",
    ],
    id: did,
  };

  const defaultIndexer = buildIndexerFromNetwork(network);
  const indexer = options.indexer || defaultIndexer;

  const { publicKey, signedIetfJsonPatch } = options;

  try {
    await updateLayer1(tezosToolkit, result, { address, chainId, publicKey });
    await updateLayer2(tezosToolkit, result, {
      address,
      chainId,
      indexer,
    });
    await updateLayer3(tezosToolkit, result, {
      publicKey,
      signedIetfJsonPatch,
    });
  } catch (err) {
    const message =
      err instanceof Error ||
      err instanceof HttpResponseError ||
      err instanceof HttpRequestFailed
        ? err.message
        : "Unknown error";
    result.didResolutionMetadata.error = message;
  } finally {
    return result;
  }
}

export default {
  getResolver(): Record<string, DIDResolver> {
    return { tz: resolve };
  },
};
