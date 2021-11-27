import { HttpRequestFailed, HttpResponseError } from "@taquito/http-utils";
import { TezosToolkit } from "@taquito/taquito";
import { Tzip16Module } from "@taquito/tzip16";
import {
  DIDResolutionOptions,
  DIDResolutionResult,
  DIDResolver,
  ParsedDID,
  Resolver,
} from "did-resolver";
import { update as updateLayer1 } from "./layer1";
import { update as updateLayer2 } from "./layer2";
import { validateIdentifier } from "./utils";

async function resolve(
  did: string,
  parsed: ParsedDID,
  _didResolver: Resolver,
  options: DIDResolutionOptions
): Promise<DIDResolutionResult> {
  const result: DIDResolutionResult = {
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

  result.didResolutionMetadata.contentType = "application/did+ld+json";
  result.didDocument = {
    "@context": [
      "https://www.w3.org/ns/did/v1",
      "https://w3id.org/security/v1",
    ],
    id: did,
  };

  const rpc = options.rpc || `https://${network}.api.tez.ie`;
  const tezosToolkit = new TezosToolkit(rpc);
  tezosToolkit.addExtension(new Tzip16Module());
  const indexer = options.indexer || `https://api.${network}.tzkt.io`;

  try {
    await updateLayer1(tezosToolkit, result, { address });
    await updateLayer2(tezosToolkit, result, { indexer, address });
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
