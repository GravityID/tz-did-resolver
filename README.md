# tz-did-resolver

W3C compliant DID Resolver for the Tezos DID Method

## tz DID Resolver

This library is intended to use Tezos accounts and smart contract addresses as fully self-managed [Decentralized Identifiers](https://w3c.github.io/did-core/#identifier) and wrap them in a [DID Document](https://w3c.github.io/did-core/#did-document-properties)

It supports the proposed [`did:tz` method spec](https://did-tezos-draft.spruceid.com/) spec from [`did-tezos`](https://github.com/spruceid/did-tezos).

It requires the `did-resolver` library, which is the primary interface for resolving DIDs.

## DID method

 To encode a DID for a Tezos address on the Tezos mainnet, simply prepend `did:tz:`

eg:

`did:tz:tz1TzrmTBSuiVHV2VfMnGRMYvTEPCP42oSM8`

Multi-network DIDs are also supported, if the proper configuration is provided during setup.

For example: `did:tz:granadanet:tz1TzrmTBSuiVHV2VfMnGRMYvTEPCP42oSM8` gets resolved on the Granadanet testnet, and represents a distinct identifier than the generic one, with different DID Documents and different key rotation history.

## DID Document

The minimal DID Document for a Tezos address `did:tz:tz1TzrmTBSuiVHV2VfMnGRMYvTEPCP42oSM8` with no transactions to the registry looks like this:

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/v1"
  ],
  "id": "did:tz:tz1TzrmTBSuiVHV2VfMnGRMYvTEPCP42oSM8",
  "verificationMethod": [
    {
      "id": "did:tz:tz1TzrmTBSuiVHV2VfMnGRMYvTEPCP42oSM8#blockchainAccountId",
      "type": "Ed25519PublicKeyBLAKE2BDigestSize20Base58CheckEncoded2021",
      "controller": "did:tz:tz1TzrmTBSuiVHV2VfMnGRMYvTEPCP42oSM8",
      "blockchainAccountId": "tezos:NetXdQprcVkpaWU:tz1TzrmTBSuiVHV2VfMnGRMYvTEPCP42oSM8"
    }
  ],
  "authentication": [
    "did:tz:tz1TzrmTBSuiVHV2VfMnGRMYvTEPCP42oSM8#blockchainAccountId"
  ],
  "assertionMethod": [
    "did:tz:tz1TzrmTBSuiVHV2VfMnGRMYvTEPCP42oSM8#blockchainAccountId"
  ]
}
```

##  Building a DID document

The DID Document is not stored as a file, but is built by using [`tzip-16`](https://tzip.tezosagora.org/proposal/tzip-16/) views functions.

Please see the [spec](https://gitlab.com/tezos/tzip/-/blob/master/proposals/tzip-19/tzip-19.md) for details of how the DID document and corresponding metadata are computed.

## Resolving a DID document

The library presents a `resolve()` function that returns a `Promise` including the DID Document. It is not meant to be used directly but through the [`did-resolver`](https://github.com/decentralized-identity/did-resolver) aggregator.

You can use the `getResolver()` method to produce an entry that can be used with the `Resolver` constructor:

```ts
import { Resolver } from 'did-resolver'
import { getResolver } from 'tz-did-resolver'

const tzResolver = getResolver()

const didResolver = new Resolver({
  ...tzResolver
  //...you can flatten multiple resolver methods into the Resolver
})

didResolver.resolve('did:tz:tz1TzrmTBSuiVHV2VfMnGRMYvTEPCP42oSM8').then(({ didDocument }) => console.log(didDocument))

// You can also use ES7 async/await syntax
const { didDocument } = await didResolver.resolve('did:tz:tz1TzrmTBSuiVHV2VfMnGRMYvTEPCP42oSM8')
console.log(didDocument)
```