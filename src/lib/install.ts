import { fcmd } from "fluent-command"

import { useUpacConfig } from "$/config/config.impl"
import { logError, logFatal, logInfo, logSuccess, MUST } from "$/logging"
import { indent, packageExists } from "$/utils"

const leftPad = indent()

export async function installAPackage(packageName: string) {
    const { packageManagers, packages } = useUpacConfig()
    const resolvedPackage = packages.find(
        (pkg) => pkg.packageName === packageName,
    )
    MUST(resolvedPackage, "resolvedPackage")
    const resolvedPackageManager =
        packageManagers[resolvedPackage.packageManager]
    MUST(resolvedPackageManager, "resolvedPackageManager")
    const alreadyExists = await packageExists(
        resolvedPackage.binary ?? packageName,
    )
    if (!alreadyExists) {
        logInfo("Installing", packageName)

        const installResult = await fcmd(
            resolvedPackage.packageManager,
            ...resolvedPackageManager.install,
            packageName,
        ).run()
        if (installResult.isErr()) {
            const { code, output } = installResult.error

            logError(`Failed to install ${packageName}. Got exit code: ${code}`)
            logFatal(output)
        }
    }
    logSuccess(`${leftPad}INST  ${packageName}`)
}
