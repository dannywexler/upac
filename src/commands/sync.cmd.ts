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

        logInfo(
            `${indent(2)}Syncing dotfiles to ${packageDestinationFolder.path}:`,
        )

        const foundFiles = await expectResult(
            packageFolder.findFiles(),
            () => `Error searching for files in: ${packageFolder.path}`,
        )
        if (foundFiles.length === 0) {
            logWarning(`${packageFolder.path} is an empty folder. Skipping.`)
        }

        const leftPad = indent()

        for (const foundFile of foundFiles) {
            const relativePath = foundFile.relativePath(packageFolder)
            let destinationFile = packageDestinationFolder.file(relativePath)

            if (foundFile.ext() === "liquid") {
                const foundFileText = await expectResult(
                    foundFile.readText(),
                    () => `${leftPad}Error reading ${foundFile.path()}`,
                )
                const renderedText = await expectResult(
                    safeRenderTemplate(foundFileText),
                    () => `${leftPad}Error rendering ${foundFile.path()}`,
                )
                destinationFile = packageDestinationFolder.file(
                    relativePath.slice(0, LIQUID_SUFFIX_LENGTH * -1),
                )
                await expectResult(
                    destinationFile.writeText(renderedText),
                    () =>
                        `${leftPad}Error writing rendered text into file: ${destinationFile.path()}`,
                )
                logSuccess(`${leftPad}REND  ${relativePath}`)
            } else if (OS_INFO.isWindows) {
                await expectResult(
                    foundFile.copyTo(destinationFile),
                    () =>
                        `${leftPad}Error copying ${foundFile.path()} to ${destinationFile.path()}`,
                )
                logSuccess(`${leftPad}COPY  ${relativePath}`)
            } else {
                await expectResult(
                    foundFile.symlinkTo(destinationFile),
                    () =>
                        `${leftPad}Error symlinking ${foundFile.path()} to ${destinationFile.path()}`,
                )
                logSuccess(`${leftPad}SLNK  ${relativePath}`)
            }
        }
    }
    logSuccess(`Synced ${totalPackages} packages`)
}
