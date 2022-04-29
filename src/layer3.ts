import { TezosToolkit } from "@taquito/taquito";
import { b58cdecode, prefix } from "@taquito/utils";
import { DIDResolutionResult } from "did-resolver";
import { applyOperation, Operation } from "fast-json-patch";
import { Ed25519KeyPair } from "@transmute/ed25519-key-pair";
import { JWS } from "@transmute/jose-ld";

export async function update(
  _tezosToolkit: TezosToolkit,
  result: DIDResolutionResult,
  {
    publicKey,
    signedIetfJsonPatch,
  }: { publicKey?: string; signedIetfJsonPatch?: string }
): Promise<void> {
  if (result.didDocument === null) return;
  if (!result.didDocument.authentication) return;
  if (!signedIetfJsonPatch) return;

  if (!publicKey) throw new Error("Need public key for signed patches");

  const [b64Header, b64Payload] = signedIetfJsonPatch.split(".");
  const buffHeader = Buffer.from(b64Header, "base64");
  const buffPayload = Buffer.from(b64Payload, "base64");
  const controller = result.didDocument.id;
  const options = {
    detached: false,
    header: {
      kid: `${controller}#blockchainAccountId`,
    },
  };
  const buff = Buffer.from(b58cdecode(publicKey, prefix.edpk));
  const keyPair = await Ed25519KeyPair.from({
    id: `${controller}#blockchainAccountId`,
    type: "JsonWebKey2020",
    controller,
    publicKeyJwk: {
      crv: "Ed25519",
      kty: "OKP",
      x: buff.toString("base64"),
    },
  });
  const verifier = JWS.createVerifier(keyPair.verifier(), "EdDSA", options);
  const verified = await verifier.verify({
    data: buffPayload,
    signature: signedIetfJsonPatch,
  });

  if (!verified) throw new Error("SignedIetfJsonPatch verification failed");

  const header = JSON.parse(buffHeader.toString());
  const payload = JSON.parse(buffPayload.toString());

  if (!header.kid) throw new Error("Missing 'kid' header property");

  const authentication = result.didDocument.authentication.find((vm) => {
    return typeof vm === "string" ? vm === header.kid : vm.id === header.kid;
  });
  if (!authentication) throw new Error("Not authorized to propose updates");

  if (!payload["ietf-json-patch"])
    throw new Error("Missing 'ietf-json-patch' payload property");

  const operations = payload["ietf-json-patch"] as Array<Operation>;

  if (!(operations instanceof Array))
    throw new Error("Payload property 'ietf-json-patch' must be an array");

  for (let operation of operations) {
    result.didDocument = applyOperation(
      result.didDocument,
      operation,
      true,
      false
    ).newDocument;
  }
}
