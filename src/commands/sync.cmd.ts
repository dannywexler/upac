import { objectEntries, objectKeys } from "zerde"

import { useUpacConfig } from "$/config/config.impl"
import { installAProgram } from "$/lib/install"
import { logFatal, logInfo, MUST } from "$/logging"
import { programExists } from "$/utils"

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
    const { packageManager, programs } = resolvedProfileConfig
    const resolvedPackageManagerConfig = packageManagers[packageManager]
    MUST(
        resolvedPackageManagerConfig,
        "package manager",
        `${packageManager} to be one of the declared package managers: ${Object.keys(packageManagers).join(", ")}`,
    )

    const totalProgramsToSync = Object.keys(programs).length
    logInfo(
        `Syncing ${totalProgramsToSync} programs of profile "${resolvedProfileName}" using package manager "${packageManager}"`,
    )
    const packageManagerExists = await programExists(packageManager)
    MUST(
        packageManagerExists,
        "package manager",
        `"${packageManager}" to be installed!`,
    )

    for (const [index, [programName, programConfig]] of objectEntries(
        programs,
    ).entries()) {
        if (typeof programConfig === "boolean") {
            if (programConfig === false) {
                continue
            }
        }
        logInfo(
            `Syncing program ${(index + 1).toString().padStart(2)} of ${totalProgramsToSync}: ${programName}`,
        )
        await installAProgram({
            programName,
            packageManager,
            installArgs: resolvedPackageManagerConfig.install,
            profileName: resolvedProfileName,
        })
    }
}
