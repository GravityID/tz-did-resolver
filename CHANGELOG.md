# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.0 - 2022-06-30]

### Changed

- Use [`tzindex`] (https://github.com/blockwatch-cc/tzindex)

### Removed

- Bakingbad tzkt indexer (https://github.com/baking-bad/tzkt)

## [1.6.0 - 2022-06-16]

### Deprecated

- Support for HANGZHOUNET (chain id `NetXZSsxBpMQeAT`)

### Changed

- Use `@transmute/*` to verify `signedIetfJsonPatch`
- Update [`did-resolver`](https://www.npmjs.com/package/did-resolver) dependency to `~3.2.0`

### Added

- Features
  - Support for JAKARTANET (chain id `NetXLH1uAxK7CCh`)

## [1.4.1 - 2022-03-08]

### Fixed

- Update `mocha` dependency

## [1.4.0 - 2022-01-03]

### Added

- Features
  - Support for HANGZHOUNET (chain id `NetXZSsxBpMQeAT`)

### Deprecated

- Support for GRANADANET (chain id `NetXz969SFaFn8k`)

## [1.3.0 - 2021-12-12]

### Added

- Features
  - DID resolution [layer 2](https://did-tezos-draft.spruceid.com/#did-manager-smart-contract) on MAINNET (chain id `NetXdQprcVkpaWU`) and GRANADANET (chain id `NetXz969SFaFn8k`) for contract accounts (addresses starting with `KT1`)

## [1.2.0 - 2021-12-07]

### Added

- Files
  - `TODO.md`
  - `src/layer3.ts`
- Features
  - DID resolution [layer 3 - `signed-ietf-json-patch` updates](https://did-tezos-draft.spruceid.com/#signed-ietf-json-patch-updates) on MAINNET (chain id `NetXdQprcVkpaWU`) and GRANADANET (chain id `NetXz969SFaFn8k`)
  - DID resolution [layer 1](https://did-tezos-draft.spruceid.com/#implied-did-document) uses `options.publicKey` to include the public key in the resolution
  - New options on CLI

```sh
  --publicKey <publicKey>                      base58 encoded public key to use for authentication
  --signedIetfJsonPatch <signedIetfJsonPatch>  changes proposed by a controller in JWS format
```

### Changed

- DID resolution [layer 1](https://did-tezos-draft.spruceid.com/#implied-did-document) works offline and throws an error to indicate no indexer is reachable

### Fixed

- DID resolution [layer 2](https://did-tezos-draft.spruceid.com/#did-manager-smart-contract) now compares the chain identifiers of the blockchain networks targetted by the DID and `options.rpc`

### Removed

- Default values for CLI options `--rpc <rpc>` and `--indexer <indexer>`

## [1.1.0] - 2021-11-27

### Added

- Files
  - `src/layer1.ts`
  - `src/layer2.ts`
  - `src/utils.ts`
- Features
  - DID resolution [layer 2](https://did-tezos-draft.spruceid.com/#did-manager-smart-contract) on MAINNET (chain id `NetXdQprcVkpaWU`) and GRANADANET (chain id `NetXz969SFaFn8k`) for implicit accounts (addresses starting with `tz1`, `tz2`, and `tz3`). DID resolution for contract accounts (addresses starting with `KT1`) currently fails with `Not implemented`
  - New options on CLI

```sh
  --rpc <rpc>          rpc url to use to interact with the Tezos network (default: "http://localhost:8732", env: TEZOS_RPC)
  --indexer <indexer>  indexer url to use to interact with the Tezos network (default: "http://localhost:8080", env: TEZOS_INDEXER)
```

### Changed

- Source code splitted in multiple files
- Resolver uses `options.rpc` (resp. `options.indexer`) as rpc url (resp. indexer url)

## [1.0.0] - 2021-11-20

### Added

- Files
  - `.github/`
  - `CHANGELOG.md`
  - `tsconfig.json`
  - `bin/`
  - `src/`
  - `test/`
- Features
  - DID resolution [layer 1](https://did-tezos-draft.spruceid.com/#implied-did-document) on MAINNET (chain id `NetXdQprcVkpaWU`) and GRANADANET (chain id `NetXz969SFaFn8k`)
