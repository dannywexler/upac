import { configFolder } from "fluent-file"

import { upacPackagesFolder, useUpacConfig } from "$/config/config.impl"
import { installAPackage } from "$/lib/install"
import {
    LIQUID_SUFFIX_LENGTH,
    OS_INFO,
    readVariablesFile,
    safeRenderTemplate,
} from "$/lib/templates"
import { logInfo, logSuccess, logWarning } from "$/logging"
import { expectResult, indent } from "$/utils"

const leftPad = indent()

export async function syncCommand() {
    await readVariablesFile()
    const { packages } = useUpacConfig()
    const totalPackages = packages.length
    logInfo("Syncing", totalPackages, "packages")
    for (const [
        packageIndex,
        { packageName, packageManager },
    ] of packages.entries()) {
        const packageIndexString = (packageIndex + 1)
            .toString()
            .padStart(totalPackages.toString().length)
        logInfo(
            "Syncing package",
            packageIndexString,
            "of",
            totalPackages,
            packageName,
            "using",
            packageManager,
        )
        await installAPackage(packageName)

        const packageFolder = upacPackagesFolder.folder(packageName)
        const packageFolderExists = await packageFolder.exists()
        if (!packageFolderExists) {
            // logWarning(`${leftPad}${packageName} does not have any files to sync`)
            continue
        }
        const packageDestinationFolder = configFolder(packageName)

        logInfo(`Syncing dotfiles to ${packageDestinationFolder.path}:`)

        const foundFiles = await expectResult(
            packageFolder.findFiles(),
            () => `Error searching for files in: ${packageFolder.path}`,
        )
        if (foundFiles.length === 0) {
            logWarning(`${packageFolder.path} is an empty folder. Skipping.`)
        }

        let longestFileName = 1
        for (const foundFile of foundFiles) {
            const len = foundFile
                .path()
                .slice(packageFolder.path.length + 1).length
            if (len > longestFileName) {
                longestFileName = len
            }
        }

        for (const foundFile of foundFiles) {
            const relative = foundFile
                .path()
                .slice(packageFolder.path.length + 1)
                .padEnd(longestFileName + 2)

            if (foundFile.ext() === "liquid") {
                const foundFileText = await expectResult(
                    foundFile.readText(),
                    () => `${leftPad}Error reading ${foundFile.path()}`,
                )
                const renderedText = await expectResult(
                    safeRenderTemplate(foundFileText),
                    () => `${leftPad}Error rendering ${foundFile.path()}`,
                )
                const destinationFile = packageDestinationFolder.file(
                    // use -1 to slice off ".liquid" from end of file path
                    relative
                        .trim()
                        .slice(0, LIQUID_SUFFIX_LENGTH * -1),
                )
                await expectResult(
                    destinationFile.writeText(renderedText),
                    () => `${leftPad}Error writing ${foundFile.path()}`,
                )
                logSuccess(`${leftPad}${relative}RENDERED`)

                continue
            }

            if (OS_INFO.isWindows) {
                await expectResult(
                    foundFile.copyTo(packageDestinationFolder),
                    () =>
                        `${leftPad}Error copying ${foundFile.path()} into ${packageDestinationFolder.path}`,
                )
                logSuccess(`${leftPad}${relative}COPIED`)
            } else {
                await expectResult(
                    foundFile.symlinkTo(packageDestinationFolder),
                    () =>
                        `${leftPad}Error symlinking ${foundFile.path()} into ${packageDestinationFolder.path}`,
                )
                logSuccess(`${leftPad}${relative}SYMLINKED`)
            }
        }
    }
    logSuccess(`Synced ${totalPackages} packages`)
}
