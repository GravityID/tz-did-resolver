import { TezosToolkit } from "@taquito/taquito";
import { tzip16 } from "@taquito/tzip16";
import axios from "axios";
import {
  DIDResolutionResult,
  ServiceEndpoint,
  VerificationMethod,
  parse,
} from "did-resolver";

interface AccountContract {
  kind: string;
  address: string;
  balance: number;
  creationLevel: number;
  creationTime: string;
}

type AccountContracts = Array<AccountContract>;

async function findManager(
  tezosToolkit: TezosToolkit,
  {
    indexer,
    address,
  }: {
    indexer: string;
    address: string;
  }
): Promise<AccountContract | null> {
  const response = await axios.get<AccountContracts>(
    `${indexer}/v1/accounts/${address}/contracts`
  );

  for (let d of response.data) {
    if (d.kind !== "smart_contract") continue;

    const contract = await tezosToolkit.contract.at(d.address, tzip16);
    const { metadata } = await contract.tzip16().getMetadata();
    const views = await contract.tzip16().metadataViews();

    if (!metadata.interfaces) continue;
    if (!metadata.interfaces.includes("TZIP-019")) continue;
    if (!(views.GetVerificationMethod instanceof Function)) continue;
    if (!(views.GetService instanceof Function)) continue;

    return d;
  }

  return null;
}

/**
 * @todo Push only verification method id when `did-resolver` supports it
 * @todo Check validity of verification method id by DID URL dereferencing when `did-resolver` supports it
 */
export async function update(
  tezosToolkit: TezosToolkit,
  result: DIDResolutionResult,
  {
    indexer,
    address,
  }: {
    indexer: string;
    address: string;
  }
): Promise<void> {
  if (result.didDocument === null) return;
  if (!result.didDocument.verificationMethod) return;

  const did = result.didDocument.id;

  const d = await findManager(tezosToolkit, { indexer, address });
  if (d === null) return;

  const contract = await tezosToolkit.contract.at(d.address, tzip16);
  const { metadata } = await contract.tzip16().getMetadata();
  if (metadata.errors) {
    result.didResolutionMetadata.error = "tzip16Error";

    return;
  }

  result.didResolutionMetadata = Object.assign(
    {},
    result.didResolutionMetadata,
    metadata
  );
  delete result.didResolutionMetadata.views;

  const chainId = await tezosToolkit.rpc.getChainId();
  const views = await contract.tzip16().metadataViews();

  const _verificationMethod: string = await views
    .GetVerificationMethod()
    .executeView();

  const _parse = parse(_verificationMethod);
  if (_parse === null || !_parse.fragment) {
    result.didResolutionMetadata.error = "invalidDidUrl";

    return;
  }

  const { fragment: _type, did: _controller } = _parse;

  const verificationMethod: VerificationMethod = {
    id: _verificationMethod,
    type: _type,
    controller: _controller,
    blockchainAccountId: `tezos:${chainId}:${address}`,
  };
  result.didDocument.verificationMethod.push(verificationMethod);

  const _service = await views.GetService().executeView();
  const service: ServiceEndpoint = {
    id: `${did}#discovery`,
    type: _service.type_,
    serviceEndpoint: _service.endpoint,
  };
  result.didDocument.service = [service];

  result.didDocumentMetadata.created = d.creationTime;
}
