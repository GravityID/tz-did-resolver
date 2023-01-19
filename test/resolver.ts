import { expect } from "chai";
import { Resolver } from "did-resolver";
import * as faker from "faker";
import { importJWK, SignJWT } from "jose";
import tz from "../src/index";

describe("DID Resolver", function () {
  let resolver: Resolver;
  // const indexer = "https://indexer.kathmandunet.gravity.earth";
  const rpc = "https://limanet.ecadinfra.com";

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
      const result = await resolver.resolve(did, { rpc });

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
      const result = await resolver.resolve(did, { rpc });

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
      const result = await resolver.resolve(did, { rpc });

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
      const did = "did:tz:limanet:tz1aSkwEot3L2kmUvcoxzjMomb9mvBNuzFK6";
      const publicKey =
        "edpkurPsQ8eUApnLUJ9ZPDvu98E8VNj4KtJa1aZr16Cr5ow5VHKnz4";

      it("should successfully resolve an implied DID Document from a valid DID", async function () {
        const result = await resolver.resolve(did, { rpc });

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
        const result = await resolver.resolve(did, { rpc, publicKey });

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

    // describe("Layer 2", function () {
    //   it("should successfully resolve a deployed DID Document from a valid DID based on an account address", async function () {
    //     const did = "did:tz:kathmandunet:tz1VSUr8wwNhLAzempoch5d6hLRiTh8Cjcjb";

    //     const result = await resolver.resolve(did, { rpc });

    //     expect(result)
    //       .to.be.an("object")
    //       .and.to.have.keys(
    //         "@context",
    //         "didResolutionMetadata",
    //         "didDocument",
    //         "didDocumentMetadata"
    //       );
    //     expect(result.didResolutionMetadata)
    //       .to.be.an("object")
    //       .and.to.not.have.property("error");
    //     expect(result.didDocument).to.be.an("object").and.to.not.be.empty;
    //     expect(result.didDocumentMetadata)
    //       .to.be.an("object")
    //       .and.to.have.keys("created", "updated");
    //   });

    //   it("should successfully resolve a deployed DID Document from a valid DID based on a smart contract address", async function () {
    //     const did = "did:tz:kathmandunet:KT1Ee7u3gGAVgYtbngWiLsexHbXBwKwELZ9C";

    //     const result = await resolver.resolve(did, { rpc });

    //     expect(result)
    //       .to.be.an("object")
    //       .and.to.have.keys(
    //         "@context",
    //         "didResolutionMetadata",
    //         "didDocument",
    //         "didDocumentMetadata"
    //       );
    //     expect(result.didResolutionMetadata)
    //       .to.be.an("object")
    //       .and.to.not.have.property("error");
    //     expect(result.didDocument).to.be.an("object").and.to.not.be.empty;
    //     expect(result.didDocumentMetadata)
    //       .to.be.an("object")
    //       .and.to.have.keys("created", "updated");
    //   });

    //   it("should fail resolving from a smart contract address that does not implement Tzip19", async function () {
    //     const did = "did:tz:kathmandunet:KT1PfaxsCuHmpds8crHNCzdVMjuEvjW5B9tV";

    //     const result = await resolver.resolve(did, { rpc });

    //     expect(result)
    //       .to.be.an("object")
    //       .and.to.have.keys(
    //         "@context",
    //         "didResolutionMetadata",
    //         "didDocument",
    //         "didDocumentMetadata"
    //       );
    //     expect(result.didResolutionMetadata)
    //       .to.be.an("object")
    //       .and.to.have.property("error")
    //       .and.to.be.a("string")
    //       .and.to.equal("Invalid Tzip19");
    //     expect(result.didDocument).to.be.an("object").and.to.not.be.empty;
    //     expect(result.didDocumentMetadata).to.be.an("object").and.to.be.empty;
    //   });
    // });

    describe("Layer 3", function () {
      const jwk = {
        kty: "OKP",
        crv: "Ed25519",
        x: "ROm8DWLwygV95uSyAafOsjdRWCTAKu-Hfa4IFBkODtQ",
        d: "l6Oqs9z3qB9XQZrJvw2KPuvvQDNV0pU2AnuKN30yXLA",
      };
      const did = "did:tz:limanet:tz1PXpQSpk8kytvLfX2or39jwEmX5smpDYxi";
      const publicKey =
        "edpkuAaEA2hfytsz5gfqGWqj1f8md5HLgESDoaKq5eShGEw6okXXLn";
      const header = {
        alg: "EdDSA",
        kid: "did:tz:limanet:tz1PXpQSpk8kytvLfX2or39jwEmX5smpDYxi#blockchainAccountId",
      };
      const payload = {
        "ietf-json-patch": [
          {
            op: "add",
            path: "/service",
            value: [
              {
                id: "test_service_id",
                type: "test_service",
                serviceEndpoint: "test_service_endpoint",
              },
            ],
          },
        ],
      };
      const keyPairEd25519 = importJWK(jwk, "EdBlake2b");

      it("should fail applying a patch without public key", async function () {
        const signedIetfJsonPatch = await new SignJWT(payload)
          .setProtectedHeader(header)
          .sign(await keyPairEd25519);

        const result = await resolver.resolve(did, {
          rpc,
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
          .and.to.equal("Need public key for signed patches");
        expect(result.didDocument).to.be.an("object").and.to.not.be.empty;
        expect(result.didDocumentMetadata).to.be.an("object");
      });

      it("should fail applying a patch with a missmatch public key", async function () {
        const signedIetfJsonPatch = await new SignJWT(payload)
          .setProtectedHeader(header)
          .sign(await keyPairEd25519);
        const publicKey =
          "edpkuix6Lv8vnrz6uDe1w8uaXY7YktitAxn6EHdy2jdzq5n5hZo94n";

        const result = await resolver.resolve(did, {
          rpc,
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
        expect(result.didDocumentMetadata).to.be.an("object");
      });

      it("should fail applying a patch without header property 'kid'", async function () {
        const header = { alg: "EdDSA" };
        const signedIetfJsonPatch = await new SignJWT(payload)
          .setProtectedHeader(header)
          .sign(await keyPairEd25519);

        const result = await resolver.resolve(did, {
          rpc,
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
        expect(result.didDocumentMetadata).to.be.an("object");
      });

      it("should fail applying a patch with a 'kid' that does not appear on the DID Document", async function () {
        const header = {
          alg: "EdDSA",
          kid: "hello",
        };
        const signedIetfJsonPatch = await new SignJWT(payload)
          .setProtectedHeader(header)
          .sign(await keyPairEd25519);

        const result = await resolver.resolve(did, {
          rpc,
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
        expect(result.didDocumentMetadata).to.be.an("object");
      });

      it("should fail applying a patch without payload property 'ietf-json-patch'", async function () {
        const payload = {};
        const signedIetfJsonPatch = await new SignJWT(payload)
          .setProtectedHeader(header)
          .sign(await keyPairEd25519);

        const result = await resolver.resolve(did, {
          rpc,
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
        expect(result.didDocumentMetadata).to.be.an("object");
      });

      it("should successfully apply a patch", async function () {
        const signedIetfJsonPatch = await new SignJWT(payload)
          .setProtectedHeader(header)
          .sign(await keyPairEd25519);

        const result = await resolver.resolve(did, {
          rpc,
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
          .and.to.not.have.property("error");
        expect(result.didDocument)
          .to.be.an("object")
          .and.to.have.property("service")
          .and.to.deep.equal(payload["ietf-json-patch"][0].value);
        expect(result.didDocumentMetadata).to.be.an("object");
      });
    });
  });
});
