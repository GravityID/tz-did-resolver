import {
  validateAddress as _validateAddress,
  ValidationResult,
} from "@taquito/utils";

enum TezosNetworks {
  GRANADANET = "granadanet",
  MAINNET = "mainnet",
}

export function validateNetwork(network: string): boolean {
  return Object.values(TezosNetworks).includes(network as TezosNetworks);
}

export function validateAddress(address: string): boolean {
  return _validateAddress(address) === ValidationResult.VALID;
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
