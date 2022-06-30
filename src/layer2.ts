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

interface AccountContract {
  row_id: number;
  address: string;
  address_type: "contract";
  pubkey: string;
  counter: number;
  creator: string;
  first_in: number;
  first_out: number;
  last_in: number;
  last_out: number;
  first_seen: number;
  last_seen: number;
  first_seen_time: string;
  last_seen_time: string;
  total_received: number;
  total_sent: number;
  total_burned: number;
  total_fees_paid: number;
  spendable_balance: number;
  frozen_bond: number;
  lost_bond: number;
  is_funded: boolean;
  is_activated: boolean;
  is_delegated: boolean;
  is_revealed: boolean;
  is_baker: boolean;
  is_contract: boolean;
  n_ops: number;
  n_ops_failed: number;
  n_tx: number;
  n_delegation: number;
  n_origination: number;
  n_constants: number;
  token_gen_min: number;
  token_gen_max: number;
}

interface Contract {
  account_id: number;
  address: string;
  creator: string;
  baker: string;
  storage_size: number;
  storage_paid: number;
  storage_burn: number;
  first_seen: number;
  last_seen: number;
  first_seen_time: string;
  last_seen_time: string;
  n_calls_success: number;
  n_calls_failed: number;
  iface_hash: string;
  code_hash: string;
  storage_hash: string;
  call_stats: {
    default: number;
  };
  features: Array<string>;
  interfaces: Array<string>;
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
): Promise<Contract | null> {
  let managerAddress = "";

  if (address.startsWith(Prefix.KT1)) {
    if (!(await isTzip019(tezosToolkit, address)))
      throw new Error("Invalid Tzip19");

    managerAddress = address;
  } else {
    const contracts = await axios.get<AccountContracts>(
      `${indexer}/explorer/account/${address}/contracts`
    );

    for (let d of contracts.data) {
      if (d.address_type !== "contract") continue;
      if (!(await isTzip019(tezosToolkit, d.address))) continue;

      managerAddress = d.address;
      break;
    }
  }

  if (!managerAddress) return null;

  const response = await axios.get<Contract>(
    `${indexer}/explorer/contract/${managerAddress}`
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

  result.didDocumentMetadata.created = d.first_seen_time;
  result.didDocumentMetadata.updated = d.last_seen_time;
}
