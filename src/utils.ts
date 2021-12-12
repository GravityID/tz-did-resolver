import { BigMapAbstraction, ChainIds, TezosToolkit } from "@taquito/taquito";
import { tzip16 } from "@taquito/tzip16";
import {
  Prefix,
  validateAddress as _validateAddress,
  ValidationResult,
} from "@taquito/utils";

enum TezosNetworks {
  GRANADANET = "granadanet",
  MAINNET = "mainnet",
}

export function networkToChainId(network: string): ChainIds | undefined {
  const entry = Object.entries(ChainIds).find(([_network, _chainId]) => {
    return network.toUpperCase() === _network;
  });

  return entry && entry[1];
}

export function validateNetwork(network: string): boolean {
  return Object.values(TezosNetworks).includes(network as TezosNetworks);
}

export function validateAddress(address: string): boolean {
  return _validateAddress(address) === ValidationResult.VALID;
}

export async function isTzip019(
  tezosToolkit: TezosToolkit,
  address: string
): Promise<boolean> {
  if (!validateAddress(address)) return false;
  if (!address.startsWith(Prefix.KT1)) return false;

  const contract = await tezosToolkit.contract.at(address, tzip16);
  const storage = await contract.storage<any>();

  if (!(storage.metadata instanceof BigMapAbstraction)) return false;

  const { metadata } = await contract.tzip16().getMetadata();

  const views = await contract.tzip16().metadataViews();

  if (!metadata.interfaces) return false;
  if (!metadata.interfaces.includes("TZIP-019")) return false;
  if (!(views.GetVerificationMethod instanceof Function)) return false;
  if (!(views.GetService instanceof Function)) return false;

  return true;
}

export function validateIdentifier(id: string):
  | {
      network: string;
      address: string;
    }
  | false {
  const arr = id.split(":");
  if (arr.length !== 1 && arr.length !== 2) return false;

  const address = arr[arr.length - 1];
  if (!validateAddress(address)) return false;

  const network = arr.length === 2 ? arr[0] : TezosNetworks.MAINNET;
  if (!validateNetwork(network)) return false;

  return { address, network };
}
