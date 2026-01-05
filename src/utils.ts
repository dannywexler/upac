import { platform } from "node:os"

import { fcmd } from "fluent-command"
import { objectKeys } from "zerde"

export function isEmptyObject<T extends Record<string, unknown>>(obj: T) {
    return objectKeys(obj).length === 0
}

export function isNonEmptyObject<T extends Record<string, unknown>>(obj: T) {
    return !isEmptyObject(obj)
}

export async function programExists(programName: string) {
    return (
        await fcmd(
            platform() === "win32" ? "where" : "which",
            programName,
        ).read()
    ).isOk()
}
