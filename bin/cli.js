#!/home/francois/.nvm/versions/node/v14.18.1/bin/node

const { Command } = require("commander");
const pjson = require("../package.json");
const program = new Command(pjson.name);

program.version(pjson.version);

const { Resolver } = require("did-resolver");
const { default: tz } = require("..");
const tzResolver = tz.getResolver();
const resolver = new Resolver(tzResolver);

program
  .command("resolve")
  .argument("<did>", "DID to resolve")
  .description("Resolve a DID using the Tezos DID method")
  .action(
    /**
     * @param {string} did DID to resolve
     */
    async (did) => {
      const result = await resolver.resolve(did);
      const json = JSON.stringify(result, null, 2);

      console.log("\n\n", json);
    }
  );

program.parse(process.argv);
