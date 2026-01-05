import { AsyncLocalStorage } from "node:async_hooks"

import { configFolder, FileReadError } from "fluent-file"
import { ParseError } from "zerde"
import z from "zod"

import { logError, logFatal } from "$/logging"
import { expectResult } from "$/utils"

import type { UpacConfig } from "./config.schema"
import { upacConfigSchema } from "./config.schema"

export const upacConfigFolder = configFolder("upac")
export const upacProgramsFolder = upacConfigFolder.folder("programs")
export const upacConfigFile = upacConfigFolder
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
    const config = await mustReadConfig()
    upacConfigLocalStorage.run(config, cb)
}

export async function mustReadConfig() {
    const configExists = await upacConfigFile.exists()
    if (!configExists) {
        logFatal(
            `UPAC config file was not found at path: ${upacConfigFilePath}`,
        )
    }
    return await expectResult(upacConfigFile.read(), (err) => {
        const baseMsg = `Error reading UPAC config file at path: ${upacConfigFilePath}`
        if (err instanceof FileReadError || err instanceof ParseError) {
            return baseMsg
        }
        logError(baseMsg)
        logFatal(z.prettifyError(err))
    })
}

export async function mustWriteConfig(config: UpacConfig) {
    await expectResult(
        upacConfigFile.write(config),
        () => `Error writing UPAC config file at path: ${upacConfigFilePath}`,
    )
}
