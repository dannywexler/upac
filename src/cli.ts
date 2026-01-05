import { Cli } from "clerc"

import packageJson from "../package.json" with { type: "json" }

export const cli = Cli()
    .scriptName(packageJson.name)
    .version(packageJson.version)
    .globalFlag("profile", "Profile to use", {
        type: String,
        short: "p",
    })
    .command("sync", "Sync config", {
        alias: "s",
    })
    .on("sync", (ctx) => {
        import("./commands/sync.cmd.ts").then((module) =>
            module.syncCommand(ctx.flags.profile),
        )
    })
