import { fcmd } from "fluent-command"

import { logError, logInfo, logSuccess } from "$/logging"
import { programExists } from "$/utils"

export async function installAProgram(
    programName: string,
    packageManager: string,
    installArgs: Array<string>,
) {
    const alreadyExists = await programExists(programName)
    if (alreadyExists) {
        return logSuccess(`${programName} already installed`)
    }

    logInfo(`Installing ${programName} ...`)
    const installResult = await fcmd(
        packageManager,
        ...installArgs,
        programName,
    ).read()
    if (installResult.isErr()) {
        const { code, output } = installResult.error

        logError(`Failed to install ${programName}. Got exit code: ${code}`)
        logError(output)
        process.exit(1)
    }
    logSuccess(`Installed ${programName}`)
    // TODO: merge the newly installed program into the upac.config.json file
    // need to ensure to only add an entry if one does not already exist
}
