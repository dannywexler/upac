import { objectEntries, objectKeys } from "zerde"

import { useUpacConfig } from "$/config/config.impl"
import { installAProgram } from "$/lib/install"
import { logFatal, logInfo, MUST } from "$/logging"

export async function syncCommand(profileName?: string) {
    const { profiles, packageManagers } = useUpacConfig()
    const allProfileNames = objectKeys(profiles)
    if (allProfileNames.length > 1) {
        // TODO: Handle more than 1 profile
        logFatal("More than 1 profile is upcoming feature")
    }
    const firstProfile = allProfileNames.at(0)
    MUST(firstProfile, "firstProfile")
    const resolvedProfileName = profileName ?? firstProfile
    const resolvedProfileConfig = profiles[resolvedProfileName]
    MUST(
        resolvedProfileConfig,
        "profileNameToSync",
        `${resolvedProfileName} to be one of the available profiles: ${allProfileNames.join(", ")}`,
    )
    const resolvedPackageManagerConfig =
        packageManagers[resolvedProfileConfig.packageManager]
    MUST(
        resolvedPackageManagerConfig,
        "packageManagerConfig",
        `${resolvedProfileConfig.packageManager} to be one of the declared package managers: ${Object.keys(packageManagers).join(", ")}`,
    )

    logInfo("Syncing profile:", resolvedProfileName)

    for (const [programName, programConfig] of objectEntries(
        resolvedProfileConfig.programs,
    )) {
        if (typeof programConfig === "boolean") {
            if (programConfig === false) {
                continue
            }
        }
        logInfo("Syncing", programName)
        await installAProgram(
            programName,
            resolvedProfileConfig.packageManager,
            resolvedPackageManagerConfig.install,
        )
    }
}
