import { Cli, friendlyErrorPlugin } from "clerc"

import { name, version } from "../package.json" with { type: "json" }

export const cli = Cli()
    .scriptName(name)
    .version(version)
    .use(friendlyErrorPlugin())
    .command("sync", "Sync config", { alias: "s" })
    .on("sync", () => {
        import("./commands/sync.cmd.ts").then((module) => module.syncCommand())
    })
