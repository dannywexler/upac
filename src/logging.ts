import { styleText } from "node:util"

export function logInfo(
    message: string,
    ...extraPieces: Array<string | number>
) {
    // biome-ignore lint/suspicious/noConsole: want to print stuff out
    console.log(message, ...extraPieces)
}

export function logSuccess(message: string) {
    // biome-ignore lint/suspicious/noConsole: want to print stuff out
    console.log(styleText("greenBright", message))
}

export function logWarning(message: string) {
    // biome-ignore lint/suspicious/noConsole: want to print stuff out
    console.warn(styleText("yellowBright", `WARNING: ${message}`))
}

export function logError<T extends string | Error>(whatToLog: T) {
    let text = ""
    if (typeof whatToLog === "string") {
        text = whatToLog
    } else {
        text = `${whatToLog.name}: ${whatToLog.message}`
    }
    // biome-ignore lint/suspicious/noConsole: want to print stuff out
    console.error(styleText("redBright", text))
    if (typeof whatToLog !== "string" && whatToLog.cause) {
        // biome-ignore lint/suspicious/noConsole: want to print stuff out
        console.dir(whatToLog.cause, { depth: null })
    }
}

export function logFatal<T extends string | Error>(whatToLog: T): never {
    if (typeof whatToLog === "string") {
        logError(`FatalError: ${whatToLog}`)
    } else {
        logError(whatToLog)
    }
    process.exit(1)
}

export function MUST<T>(
    item: T,
    variableName: string,
    message?: string,
): asserts item {
    if (item) {
        return
    }
    if (message) {
        return logFatal(`Expected ${variableName} ${message}`)
    }
    return logFatal(
        `Expected ${variableName} to be defined, but was actually: ${item}`,
    )
}
