import { platform } from "node:os"

import { configFolder, folder } from "fluent-file"
import { objectEntries, objectKeys } from "zerde"

import {
    upacConfigFolder,
    upacProgramsFolder,
    useUpacConfig,
} from "$/config/config.impl"
import { installAProgram } from "$/lib/install"
import { logFatal, logInfo, logWarning, MUST } from "$/logging"
import { expectResult, programExists } from "$/utils"

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

    let index = 1
    for (const [programName, programDestination] of objectEntries(programs)) {
        logInfo(
            `Syncing program ${(index++).toString().padStart(2)} of ${totalProgramsToSync}: ${programName}`,
        )
        await installAProgram({
            programName,
            packageManager,
            installArgs: resolvedPackageManagerConfig.install,
            profileName: resolvedProfileName,
        })

        const programFolder = upacProgramsFolder.folder(programName)
        const programFolderExists = await programFolder.exists()
        if (!programFolderExists) {
            logInfo(`${programName} does not have any files to sync`)
            continue
        }

        const resolvedDestination =
            programDestination.length === 0
                ? configFolder(programName)
                : folder(programDestination)

        const foundFiles = await expectResult(
            programFolder.findFiles(),
            () => `Error searching for files in: ${programFolder.path}`,
        )
        if (foundFiles.length === 0) {
            logWarning(`${programFolder.path} is an empty folder. Skipping.`)
        }

        for (const foundFile of foundFiles) {
            const relative = foundFile.relativePath(upacConfigFolder)
            if (platform() === "win32") {
                await expectResult(
                    foundFile.copyTo(resolvedDestination),
                    () =>
                        `Error copying ${foundFile.path()} into ${resolvedDestination.path}`,
                )
                logInfo(`${relative}  COPIED INTO  ${resolvedDestination.path}`)
            } else {
                await expectResult(
                    foundFile.symlinkTo(resolvedDestination),
                    () =>
                        `Error symlinking ${foundFile.path()} into ${resolvedDestination.path}`,
                )
                logInfo(
                    `${relative}  SYMLINKED INTO  ${resolvedDestination.path}`,
                )
            }
        }
    }
}
