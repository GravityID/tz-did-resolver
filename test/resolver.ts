import { expect } from "chai";
import { Resolver } from "did-resolver";
import * as faker from "faker";
import { importJWK, SignJWT } from "jose";
import tz from "../src/index";

const jwk = {
  kty: "OKP",
  crv: "Ed25519",
  x: "ROm8DWLwygV95uSyAafOsjdRWCTAKu-Hfa4IFBkODtQ",
  d: "l6Oqs9z3qB9XQZrJvw2KPuvvQDNV0pU2AnuKN30yXLA",
};

describe("DID Resolver", function () {
  let resolver: Resolver;

  describe("getResolver", function () {
    it("should successfully create a Resolver with the Tezos DID Method resolver", async function () {
      const tzResolver = tz.getResolver();

      expect(tzResolver)
        .to.be.an("object")
        .and.to.have.property("tz")
        .and.to.be.instanceOf(Function);

      resolver = new Resolver({
        ...tzResolver,
      });

      expect(resolver)
        .to.be.an("object")
        .and.to.be.instanceOf(Resolver)
        .and.to.have.property("registry")
        .and.to.be.an("object")
        .and.to.have.property("tz")
        .and.to.be.instanceOf(Function);
    });
  });

  describe("resolve", async function () {
    it("should fail resolving from a DID that is not respecting the DID Syntax", async function () {
      const did = faker.random.alphaNumeric();
      const result = await resolver.resolve(did);

      expect(result)
        .to.be.an("object")
        .and.to.have.keys(
          "didResolutionMetadata",
          "didDocument",
          "didDocumentMetadata"
        );
      expect(result.didResolutionMetadata)
        .to.be.an("object")
        .and.to.have.property("error")
        .and.to.be.a("string")
        .and.to.equal("invalidDid");
      expect(result.didDocument).to.be.null;
      expect(result.didDocumentMetadata).to.be.an("object").and.to.be.empty;
    });

    it("should fail resolving from a DID that is not using a known DID Method", async function () {
      const did = "did:eth:" + faker.random.alphaNumeric();
      const result = await resolver.resolve(did);

      expect(result)
        .to.be.an("object")
        .and.to.have.keys(
          "didResolutionMetadata",
          "didDocument",
          "didDocumentMetadata"
        );
      expect(result.didResolutionMetadata)
        .to.be.an("object")
        .and.to.have.property("error")
        .and.to.be.a("string")
        .and.to.equal("unsupportedDidMethod");
      expect(result.didDocument).to.be.null;
      expect(result.didDocumentMetadata).to.be.an("object").and.to.be.empty;
    });

    it("should fail resolving from a DID that has an invalid Tezos address as specific identifier", async function () {
      const did = "did:tz:" + faker.random.alphaNumeric();
      const result = await resolver.resolve(did);

      expect(result)
        .to.be.an("object")
        .and.to.have.keys(
          "@context",
          "didResolutionMetadata",
          "didDocument",
          "didDocumentMetadata"
        );
      expect(result.didResolutionMetadata)
        .to.be.an("object")
        .and.to.have.property("error")
        .and.to.be.a("string")
        .and.to.equal("invalidDid");
      expect(result.didDocument).to.be.null;
      expect(result.didDocumentMetadata).to.be.an("object").and.to.be.empty;
    });

    describe("Layer 1", function () {
      it("should successfully resolve an implied DID Document from a valid DID", async function () {
        const did = "did:tz:granadanet:tz1TzrmTBSuiVHV2VfMnGRMYvTEPCP42oSM8";

        const result = await resolver.resolve(did);

        expect(result)
          .to.be.an("object")
          .and.to.have.keys(
            "@context",
            "didResolutionMetadata",
            "didDocument",
            "didDocumentMetadata"
          );
        expect(result.didResolutionMetadata)
          .to.be.an("object")
          .and.to.not.have.property("error");
        expect(result.didDocument).to.be.an("object").and.to.not.be.empty;
        expect(result.didDocument)
          .to.have.property("authentication")
          .and.to.be.instanceOf(Array)
          .and.to.have.lengthOf(1)
          .and.to.have.property("0")
          .to.be.a("string");
        expect(result.didDocument)
          .to.have.property("assertionMethod")
          .and.to.be.instanceOf(Array)
          .and.to.have.lengthOf(1)
          .and.to.have.property("0")
          .to.be.a("string");
        expect(result.didDocumentMetadata).to.be.an("object").and.to.be.empty;
      });

      it("should successfully add a public key to an implied document", async function () {
        const did = "did:tz:granadanet:tz1TzrmTBSuiVHV2VfMnGRMYvTEPCP42oSM8";
        const publicKey =
          "edpkuix6Lv8vnrz6uDe1w8uaXY7YktitAxn6EHdy2jdzq5n5hZo94n";

        const result = await resolver.resolve(did, { publicKey });

        expect(result)
          .to.be.an("object")
          .and.to.have.keys(
            "@context",
            "didResolutionMetadata",
            "didDocument",
            "didDocumentMetadata"
          );
        expect(result.didResolutionMetadata)
          .to.be.an("object")
          .and.to.not.have.property("error");
        expect(result.didDocument).to.be.an("object").and.to.not.be.empty;
        expect(result.didDocument)
          .to.have.property("authentication")
          .and.to.be.instanceOf(Array)
          .and.to.have.lengthOf(1)
          .and.to.have.property("0")
          .to.be.an("object")
          .and.to.have.property("publicKeyBase58")
          .to.equal(publicKey);
        expect(result.didDocument)
          .to.have.property("assertionMethod")
          .and.to.be.instanceOf(Array)
          .and.to.have.lengthOf(1)
          .and.to.have.property("0")
          .to.be.a("string");
        expect(result.didDocumentMetadata).to.be.an("object").and.to.be.empty;
      });
    });

    describe("Layer 2", function () {
      it("should successfully resolve a deployed DID Document from a valid DID", async function () {
        const did = "did:tz:granadanet:tz1Mmhk4yVqnvKkciEgqDBjwNDAn7DtWaPkG";

        const result = await resolver.resolve(did);

        expect(result)
          .to.be.an("object")
          .and.to.have.keys(
            "@context",
            "didResolutionMetadata",
            "didDocument",
            "didDocumentMetadata"
          );
        expect(result.didResolutionMetadata)
          .to.be.an("object")
          .and.to.not.have.property("error");
        expect(result.didDocument).to.be.an("object").and.to.not.be.empty;
        expect(result.didDocumentMetadata)
          .to.be.an("object")
          .and.to.have.keys("created", "updated");
      });
    });

    describe("Layer 3", function () {
      it("should fail applying a patch without public key", async function () {
        const signedIetfJsonPatch =
          "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDp0ejpkZWxwaGluZXQ6dHoxV3Z2YkVHcEJYR2VUVmJMaVI2RFlCZTFpem1naVl1WmJxI2Jsb2NrY2hhaW5BY2NvdW50SWQifQ.eyJpZXRmLWpzb24tcGF0Y2giOiBbCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIm9wIjogImFkZCIsCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgInBhdGgiOiAiL3NlcnZpY2UvMSIsCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgInZhbHVlIjogewogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAiaWQiOiAidGVzdF9zZXJ2aWNlX2lkIiwKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgInR5cGUiOiAidGVzdF9zZXJ2aWNlIiwKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgInNlcnZpY2VFbmRwb2ludCI6ICJ0ZXN0X3NlcnZpY2VfZW5kcG9pbnQiCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdfQ.OTMe8ljEZEqZrdfkL1hhuiVXFGw_taFRVqNTfsycxFDq5FPu1ZSgaTOertyC61cQQXNLqTRo2kHAos8kx8PHAQ";
        const did = "did:tz:granadanet:tz1PXpQSpk8kytvLfX2or39jwEmX5smpDYxi";

        const result = await resolver.resolve(did, { signedIetfJsonPatch });

        expect(result)
          .to.be.an("object")
          .and.to.have.keys(
            "@context",
            "didResolutionMetadata",
            "didDocument",
            "didDocumentMetadata"
          );
        expect(result.didResolutionMetadata)
          .to.be.an("object")
          .and.to.have.property("error")
          .and.to.be.a("string")
          .and.to.equal("Need public key for signed patches");
        expect(result.didDocument).to.be.an("object").and.to.not.be.empty;
        expect(result.didDocumentMetadata)
          .to.be.an("object")
          .and.to.have.keys("created", "updated");
      });

      it("should fail applying a patch with a missmatch public key", async function () {
        const signedIetfJsonPatch =
          "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDp0ejpkZWxwaGluZXQ6dHoxV3Z2YkVHcEJYR2VUVmJMaVI2RFlCZTFpem1naVl1WmJxI2Jsb2NrY2hhaW5BY2NvdW50SWQifQ.eyJpZXRmLWpzb24tcGF0Y2giOiBbCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7CiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIm9wIjogImFkZCIsCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgInBhdGgiOiAiL3NlcnZpY2UvMSIsCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgInZhbHVlIjogewogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAiaWQiOiAidGVzdF9zZXJ2aWNlX2lkIiwKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgInR5cGUiOiAidGVzdF9zZXJ2aWNlIiwKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgInNlcnZpY2VFbmRwb2ludCI6ICJ0ZXN0X3NlcnZpY2VfZW5kcG9pbnQiCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfQogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBdfQ.OTMe8ljEZEqZrdfkL1hhuiVXFGw_taFRVqNTfsycxFDq5FPu1ZSgaTOertyC61cQQXNLqTRo2kHAos8kx8PHAQ";
        const publicKey =
          "edpkuix6Lv8vnrz6uDe1w8uaXY7YktitAxn6EHdy2jdzq5n5hZo94n";
        const did = "did:tz:granadanet:tz1PXpQSpk8kytvLfX2or39jwEmX5smpDYxi";

        const result = await resolver.resolve(did, {
          publicKey,
          signedIetfJsonPatch,
        });

        expect(result)
          .to.be.an("object")
          .and.to.have.keys(
            "@context",
            "didResolutionMetadata",
            "didDocument",
            "didDocumentMetadata"
          );
        expect(result.didResolutionMetadata)
          .to.be.an("object")
          .and.to.have.property("error")
          .and.to.be.a("string");
        expect(result.didDocument).to.be.an("object").and.to.not.be.empty;
        expect(result.didDocumentMetadata)
          .to.be.an("object")
          .and.to.have.keys("created", "updated");
      });

      it("should fail applying a patch without header property 'kid'", async function () {
        const did = "did:tz:granadanet:tz1PXpQSpk8kytvLfX2or39jwEmX5smpDYxi";
        const header = {
          alg: "EdDSA",
        };
        const payload = {
          "ietf-json-patch": [
            {
              op: "replace",
              path: "/service/0",
              value: {
                id: "test_service_id",
                type: "test_service",
                serviceEndpoint: "test_service_endpoint",
              },
            },
          ],
        };
        const publicKey =
          "edpkuAaEA2hfytsz5gfqGWqj1f8md5HLgESDoaKq5eShGEw6okXXLn";
        const jwt = new SignJWT(payload);
        jwt.setProtectedHeader(header);
        const key = await importJWK(jwk, "EdBlake2b");
        const signedIetfJsonPatch = await jwt.sign(key);

        const result = await resolver.resolve(did, {
          publicKey,
          signedIetfJsonPatch,
        });

        expect(result)
          .to.be.an("object")
          .and.to.have.keys(
            "@context",
            "didResolutionMetadata",
            "didDocument",
            "didDocumentMetadata"
          );
        expect(result.didResolutionMetadata)
          .to.be.an("object")
          .and.to.have.property("error")
          .and.to.be.a("string")
          .and.to.equal("Missing 'kid' header property");
        expect(result.didDocument).to.be.an("object").and.to.not.be.empty;
        expect(result.didDocumentMetadata)
          .to.be.an("object")
          .and.to.have.keys("created", "updated");
      });

      it("should fail applying a patch with a 'kid' that does not appear on the DID Document", async function () {
        const did = "did:tz:granadanet:tz1PXpQSpk8kytvLfX2or39jwEmX5smpDYxi";
        const header = {
          alg: "EdDSA",
          kid: "hello",
        };
        const payload = {
          "ietf-json-patch": [
            {
              op: "replace",
              path: "/service/0",
              value: {
                id: "test_service_id",
                type: "test_service",
                serviceEndpoint: "test_service_endpoint",
              },
            },
          ],
        };
        const publicKey =
          "edpkuAaEA2hfytsz5gfqGWqj1f8md5HLgESDoaKq5eShGEw6okXXLn";
        const jwt = new SignJWT(payload);
        jwt.setProtectedHeader(header);
        const key = await importJWK(jwk, "EdBlake2b");
        const signedIetfJsonPatch = await jwt.sign(key);

        const result = await resolver.resolve(did, {
          publicKey,
          signedIetfJsonPatch,
        });

        expect(result)
          .to.be.an("object")
          .and.to.have.keys(
            "@context",
            "didResolutionMetadata",
            "didDocument",
            "didDocumentMetadata"
          );
        expect(result.didResolutionMetadata)
          .to.be.an("object")
          .and.to.have.property("error")
          .and.to.be.a("string")
          .and.to.equal("Not authorized to propose updates");
        expect(result.didDocument).to.be.an("object").and.to.not.be.empty;
        expect(result.didDocumentMetadata)
          .to.be.an("object")
          .and.to.have.keys("created", "updated");
      });

      it("should fail applying a patch without payload property 'ietf-json-patch'", async function () {
        const did = "did:tz:granadanet:tz1PXpQSpk8kytvLfX2or39jwEmX5smpDYxi";
        const header = {
          alg: "EdDSA",
          kid: "did:tz:granadanet:tz1PXpQSpk8kytvLfX2or39jwEmX5smpDYxi#blockchainAccountId",
        };
        const payload = {};
        const publicKey =
          "edpkuAaEA2hfytsz5gfqGWqj1f8md5HLgESDoaKq5eShGEw6okXXLn";
        const jwt = new SignJWT(payload);
        jwt.setProtectedHeader(header);
        const key = await importJWK(jwk, "EdBlake2b");
        const signedIetfJsonPatch = await jwt.sign(key);

        const result = await resolver.resolve(did, {
          publicKey,
          signedIetfJsonPatch,
        });

        expect(result)
          .to.be.an("object")
          .and.to.have.keys(
            "@context",
            "didResolutionMetadata",
            "didDocument",
            "didDocumentMetadata"
          );
        expect(result.didResolutionMetadata)
          .to.be.an("object")
          .and.to.have.property("error")
          .and.to.be.a("string")
          .and.to.equal("Missing 'ietf-json-patch' payload property");
        expect(result.didDocument).to.be.an("object").and.to.not.be.empty;
        expect(result.didDocumentMetadata)
          .to.be.an("object")
          .and.to.have.keys("created", "updated");
      });
    });
  });
});
