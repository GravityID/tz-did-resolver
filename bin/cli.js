#!/usr/bin/env node
const { Argument, Command, Option } = require("commander");
const pjson = require("../package.json");
const program = new Command(pjson.name);

program.version(pjson.version);

const { Resolver } = require("did-resolver");
const { default: tz } = require("..");
const tzResolver = tz.getResolver();
const resolver = new Resolver(tzResolver);

program
  .command("resolve")
  .addArgument(new Argument("<did>", "DID to resolve"))
  .addOption(
    new Option(
      "--rpc <rpc>",
      "rpc url to use to interact with the Tezos network"
    ).env("TEZOS_RPC")
  )
  .addOption(
    new Option(
      "--indexer <indexer>",
      "indexer url to use to interact with the Tezos network"
    ).env("TEZOS_INDEXER")
  )
  .addOption(
    new Option(
      "--publicKey <publicKey>",
      "base58 encoded public key to use for authentication"
    )
  )
  .addOption(
    new Option(
      "--signedIetfJsonPatch <signedIetfJsonPatch>",
      "changes proposed by a controller in JWS format"
    )
  )
  .description("resolve a DID using the Tezos DID method")
  .action(
    /**
     * @param {string} did DID to resolve
     */
    async (did, options) => {
      const result = await resolver.resolve(did, options);
      const json = JSON.stringify(result, null, 2);

      console.log(json);
    }
  );

program.parse(process.argv);
