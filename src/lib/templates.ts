import {
    arch,
    availableParallelism,
    EOL,
    endianness,
    homedir,
    hostname,
    machine,
    networkInterfaces,
    platform,
    release,
    type,
    userInfo,
    version,
} from "node:os"

import {
    cacheFolder,
    configFolder,
    dataFolder,
    logsFolder,
    tempFolder,
} from "fluent-file"
import type { LiquidError } from "liquidjs"
import { Liquid } from "liquidjs"
import { fromAsyncThrowable } from "neverthrow"
import { stringifyYAML } from "zerde"
import z from "zod"

import { upacVariablesFile } from "$/config/config.impl"
import { upacVariablesSchema } from "$/config/config.schema"
import { logError, logFatal, logInfo, MUST } from "$/logging"
import { expectResult } from "$/utils"

export const LIQUID_SUFFIX_LENGTH = ".liquid".length

const osType = type()

export const OS_INFO = Object.freeze({
    ...userInfo(),
    // biome-ignore lint/style/useNamingConvention: is uppercase constant
    EOL,
    arch: arch(),
    availableParallelism: availableParallelism(),
    cacheFolder: cacheFolder(),
    configFolder: configFolder(),
    dataFolder: dataFolder(),
    endianness: endianness(),
    homedir: homedir(),
    hostname: hostname(),
    isDarwin: osType === "Windows_NT",
    isLinux: osType === "Linux",
    isWindows: osType === "Darwin",
    logsFolder: logsFolder(),
    machine: machine(),
    networkInterfaces: networkInterfaces(),
    platform: platform(),
    release: release(),
    tempFolder: tempFolder(),
    type: osType,
    version: version(),
})

let liquid = createLiquid()

function createLiquid(globalVariables: Record<string, unknown> = {}) {
    return new Liquid({
        extname: "liquid",
        globals: {
            os: OS_INFO,
            // biome-ignore lint/style/noProcessEnv: need to access env vars here
            env: process.env,
            ...globalVariables,
        },
        jsTruthy: true,
        strictFilters: true,
        strictVariables: true,
    })
}

export const safeRenderTemplate = fromAsyncThrowable(
    async (template: string) => {
        const renderedResults = await liquid.parseAndRender(template)
        if (typeof renderedResults !== "string") {
            logFatal(
                `UPAC variables file ${upacVariablesFile.name()} was not rendered as a string but ${typeof renderedResults}`,
            )
        }
        return renderedResults
    },
    (e) => {
        const error = e as LiquidError

        const stack = error.stack
        MUST(stack, "liquidErrorStack")
        const cleanedStack = stack
            .split("\n")
            .filter(
                (line) =>
                    !(
                        line.startsWith("    at ") ||
                        line.startsWith(error.name)
                    ),
            )
            .join("\n")
        return `${error.name}: ${cleanedStack}`
    },
)

export async function readVariablesFile() {
    const variablesFile = `UPAC variables file: ${upacVariablesFile.name()}`
    const variablesFileExists = await upacVariablesFile.exists()
    if (!variablesFileExists) {
        logInfo(`No ${variablesFile}`)
        return
    }
    const variablesFileText = await expectResult(
        upacVariablesFile.readText(),
        () => `Error reading ${variablesFile}`,
    )
    const unknownFileContents = await expectResult(
        safeRenderTemplate(variablesFileText),
        (err) => {
            logError(`Error rendering ${variablesFile}`)
            logFatal(err)
        },
    )
    let unknownParsedContents: unknown
    try {
        unknownParsedContents = JSON.parse(unknownFileContents)
    } catch (err) {
        const error = err as SyntaxError
        logError(`${variablesFile} was not valid JSON`)
        logFatal(`${error.name}: ${error.message}`)
    }

    const parseResult = upacVariablesSchema.safeParse(unknownParsedContents)

    if (!parseResult.success) {
        logError(`Parsed contents of ${variablesFile} were not valid`)
        logFatal(z.prettifyError(parseResult.error))
    }
    const parsedVariables = parseResult.data
    logInfo(`Parsed variables from ${upacVariablesFile.name()}:\n`)
    logInfo(stringifyYAML(parsedVariables, { indent: 4 }))

    liquid = createLiquid(parsedVariables)
}
