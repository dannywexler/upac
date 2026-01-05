import { AsyncLocalStorage } from "node:async_hooks"

import { configFolder, FileReadError } from "fluent-file"
import { ParseError } from "zerde"
import z from "zod"

import { logError, logFatal } from "$/logging"

import type { UpacConfig } from "./config.schema"
import { upacConfigSchema } from "./config.schema"

export const upacConfigFile = configFolder("upac")
    .file("upac.config.json")
    .schema(upacConfigSchema)

const upacConfigFilePath = upacConfigFile.path()

const upacConfigLocalStorage = new AsyncLocalStorage<UpacConfig>()

export function useUpacConfig() {
    const upacConfig = upacConfigLocalStorage.getStore()
    if (!upacConfig) {
        logFatal(`Attempted to upacConfigLocalStorage outside of context`)
    }
    return upacConfig
}

export async function runWithValidConfig(cb: () => void) {
    const configExists = await upacConfigFile.exists()
    if (!configExists) {
        logFatal(
            `UPAC config file was not found at path: ${upacConfigFilePath}`,
        )
    }
    const upacConfigResult = await upacConfigFile.read()
    if (upacConfigResult.isErr()) {
        logError(
            `Error reading UPAC config file at path: ${upacConfigFilePath}`,
        )
        const upacConfigError = upacConfigResult.error
        if (
            upacConfigError instanceof FileReadError ||
            upacConfigError instanceof ParseError
        ) {
            logFatal(upacConfigError)
        } else {
            logFatal(z.prettifyError(upacConfigError))
        }
    } else {
        upacConfigLocalStorage.run(upacConfigResult.value, cb)
    }
}
