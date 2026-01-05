import { fcmd } from "fluent-command"
import { objectKeys } from "zerde"

import { mustWriteConfig, useUpacConfig } from "$/config/config.impl"
import { logError, logInfo, logSuccess, MUST } from "$/logging"
import { programExists } from "$/utils"

export type InstallAProgramOptions = {
    programName: string
    packageManager: string
    installArgs: Array<string>
    profileName: string
}

export async function installAProgram({
    installArgs,
    profileName,
    programName,
    packageManager,
}: InstallAProgramOptions) {
    const alreadyExists = await programExists(programName)
    if (alreadyExists) {
        return logSuccess(`${programName} already installed`)
    }

    logInfo(`Installing ${programName}`)
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
    logSuccess(`Installed  ${programName}`)
    // TODO: merge the newly installed program into the upac.config.json file
    // need to ensure to only add an entry if one does not already exist
    const existingConfig = useUpacConfig()
    const profileConfig = existingConfig.profiles[profileName]
    MUST(profileConfig, "profileConfig")

    const alreadyPresentPrograms = objectKeys(profileConfig.programs)

    if (alreadyPresentPrograms.includes(programName)) {
        return
    }
    logInfo(`Adding ${programName} to profile ${profileName}`)
    await mustWriteConfig({
        ...existingConfig,
        profiles: {
            ...existingConfig.profiles,
            [profileName]: {
                ...profileConfig,
                programs: {
                    ...profileConfig.programs,
                    [programName]: true,
                },
            },
        },
    })
    logInfo(`Added  ${programName} to profile ${profileName}`)
}
