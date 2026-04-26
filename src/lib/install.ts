import { fcmd } from "fluent-command"

import { useUpacConfig } from "$/config/config.impl"
import { logError, logFatal, logSuccess, MUST } from "$/logging"
import { packageExists } from "$/utils"

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
    if (alreadyExists) {
        return logSuccess(`${packageName} already installed`)
    }

    const installResult = await fcmd(
        resolvedPackage.packageManager,
        ...resolvedPackageManager.install,
        packageName,
    ).read()
    if (installResult.isErr()) {
        const { code, output } = installResult.error

        logError(`Failed to install ${packageName}. Got exit code: ${code}`)
        logFatal(output)
    }
    logSuccess(`Installed ${packageName}`)
}
