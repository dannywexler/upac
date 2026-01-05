import { fcmd } from "fluent-command"
import { objectKeys } from "zerde"

import { useUpacConfig } from "$/config/config.impl"
import { logError, logFatal, logInfo, logSuccess, MUST } from "$/logging"
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
        logFatal(output)
    }
    logSuccess(`Installed  ${programName}`)

    const existingConfig = useUpacConfig()
    const profileConfig = existingConfig.profiles[profileName]
    MUST(profileConfig, "profileConfig")

    const alreadyPresentPrograms = objectKeys(profileConfig.programs)

    if (alreadyPresentPrograms.includes(programName)) {
        return
    }

    // TODO: Enable this section when adding install command, don't need it for now

    // logInfo(`Adding ${programName} to profile ${profileName}`)
    // await mustWriteConfig({
    //     ...existingConfig,
    //     profiles: {
    //         ...existingConfig.profiles,
    //         [profileName]: {
    //             ...profileConfig,
    //             programs: {
    //                 ...profileConfig.programs,
    //                 [programName]: "",
    //             },
    //         },
    //     },
    // })
    // logInfo(`Added  ${programName} to profile ${profileName}`)
}
