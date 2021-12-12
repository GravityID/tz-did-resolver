import { TezosToolkit } from "@taquito/taquito";
import { tzip16 } from "@taquito/tzip16";
import { Prefix } from "@taquito/utils";
import axios from "axios";
import {
  DIDResolutionResult,
  parse,
  ServiceEndpoint,
  VerificationMethod,
} from "did-resolver";
import { isTzip019 } from "./utils";

interface ContractAccount {
  type: "contract";
  address: string;
  kind: string;
  balance: number;
  creator: {
    address: string;
  };
  numContracts: number;
  numDelegations: number;
  numOriginations: number;
  numTransactions: number;
  numReveals: number;
  numMigrations: number;
  firstActivity: number;
  firstActivityTime: string;
  lastActivity: number;
  lastActivityTime: string;
  typeHash: number;
  codeHash: number;
}

interface AccountContract {
  kind: string;
  address: string;
  balance: number;
  creationLevel: number;
  creationTime: string;
}

type AccountContracts = Array<AccountContract>;

/**
 * @todo Use @taquito/idx when available {@link https://github.com/ecadlabs/taquito/issues/185}
 */
async function findManager(
  tezosToolkit: TezosToolkit,
  {
    indexer,
    address,
  }: {
    indexer: string;
    address: string;
  }
): Promise<ContractAccount | null> {
  let managerAddress = "";

  if (address.startsWith(Prefix.KT1)) {
    if (!(await isTzip019(tezosToolkit, address)))
      throw new Error("Invalid Tzip19");

    managerAddress = address;
  } else {
    const contracts = await axios.get<AccountContracts>(
      `${indexer}/v1/accounts/${address}/contracts`
    );

    for (let d of contracts.data) {
      if (d.kind !== "smart_contract") continue;
      if (!(await isTzip019(tezosToolkit, d.address))) continue;

      managerAddress = d.address;
    }
  }

  if (!managerAddress) return null;

  const response = await axios.get<ContractAccount>(
    `${indexer}/v1/accounts/${managerAddress}`
  );

  return response.data;
}

/**
 * @todo Push only verification method id when `did-resolver` supports it
 * @todo Check existence of verification method by DID URL dereferencing when `did-resolver` supports it
 */
export async function update(
  tezosToolkit: TezosToolkit,
  result: DIDResolutionResult,
  {
    address,
    chainId,
    indexer,
  }: {
    address: string;
    chainId: string;
    indexer: string;
  }
): Promise<void> {
  const _chainId = await tezosToolkit.rpc.getChainId();
  if (chainId !== _chainId) throw new Error("chainMissmatch");

  if (result.didDocument === null) return;

  if (address.startsWith(Prefix.KT1)) {
    result.didDocument.verificationMethod = [];
  }

  if (!result.didDocument.verificationMethod) return;

  const did = result.didDocument.id;

  const d = await findManager(tezosToolkit, { indexer, address });
  if (d === null) return;

  const contract = await tezosToolkit.contract.at(d.address, tzip16);
  const { metadata } = await contract.tzip16().getMetadata();
  if (metadata.errors) throw new Error("Invalid Tzip16");

  result.didResolutionMetadata = Object.assign(
    {},
    result.didResolutionMetadata,
    metadata
  );
  delete result.didResolutionMetadata.views;

  const views = await contract.tzip16().metadataViews();

  const _verificationMethod: string = await views
    .GetVerificationMethod()
    .executeView();

  const _parse = parse(_verificationMethod);
  if (_parse === null || !_parse.fragment) throw new Error("Invalid DID URL");

  const { fragment: _type, did: _controller } = _parse;
  const [_, _address] = _parse.id.split(":");

  const verificationMethod: VerificationMethod = {
    id: _verificationMethod,
    type: _type,
    controller: _controller,
    blockchainAccountId: `tezos:${_chainId}:${_address}`,
  };
  result.didDocument.verificationMethod.push(verificationMethod);

  const _service = await views.GetService().executeView();
  const service: ServiceEndpoint = {
    id: `${did}#discovery`,
    type: _service.type_,
    serviceEndpoint: _service.endpoint,
  };
  result.didDocument.service = [service];

  result.didDocumentMetadata.created = d.firstActivityTime;
  result.didDocumentMetadata.updated = d.lastActivityTime;
}
