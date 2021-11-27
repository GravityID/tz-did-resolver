import { expect } from "chai";
import { Resolver } from "did-resolver";
import * as faker from "faker";

import tz from "../src/index";

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

    it("should successfully resolve an implied DID Document from a valid DID", async function () {
      const did = "did:tz:granadanet:tz1TzrmTBSuiVHV2VfMnGRMYvTEPCP42oSM8";

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
        .and.to.not.have.property("error");
      expect(result.didDocument).to.be.an("object").and.to.not.be.empty;
      expect(result.didDocumentMetadata).to.be.an("object").and.to.be.empty;
    });

    it("should successfully resolve a deployed DID Document from a valid DID", async function () {
      const did = "did:tz:granadanet:tz1Mmhk4yVqnvKkciEgqDBjwNDAn7DtWaPkG";

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
        .and.to.not.have.property("error");
      expect(result.didDocument).to.be.an("object").and.to.not.be.empty;
      expect(result.didDocumentMetadata)
        .to.be.an("object")
        .and.to.have.keys("created", "updated");
    });
  });
});
