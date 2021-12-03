import DIDKit from "@spruceid/didkit";
import { TezosToolkit } from "@taquito/taquito";
import { DIDResolutionResult } from "did-resolver";
import { applyOperation, Operation } from "fast-json-patch";
import { importJWK, JWK, jwtVerify } from "jose";

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

  const jwk = DIDKit.jwkFromTezosKey(publicKey);
  const publicKeyJWK = await importJWK(jwk as JWK);

  const { payload, protectedHeader } = await jwtVerify(
    signedIetfJsonPatch,
    publicKeyJWK
  );

  if (!protectedHeader.kid) throw new Error("Missing 'kid' header property");

  const authentication = result.didDocument.authentication.find((vm) => {
    return typeof vm === "string"
      ? vm === protectedHeader.kid
      : vm.id === protectedHeader.kid;
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
