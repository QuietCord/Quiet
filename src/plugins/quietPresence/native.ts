/*
 * Quiet — personal fork of Vencord
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { existsSync, readFileSync } from "fs";
import { join } from "path";

import { QUIET_DEV_REPO_PATH } from "@shared/brand";

export interface DevGitContext {
    /** Dev overlay should auto-enable (QUIET_DEV=1 or valid local repo). */
    active: boolean;
    branch: string | null;
    repoPath: string | null;
}

function isDevEnvFlagSet() {
    const v = process.env.QUIET_DEV?.trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
}

function readGitBranch(repoRoot: string): string | null {
    try {
        const head = readFileSync(join(repoRoot, ".git", "HEAD"), "utf8").trim();
        if (head.startsWith("ref: refs/heads/")) return head.slice("ref: refs/heads/".length);
        if (head.startsWith("ref: ")) return head.split("/").pop() ?? null;
        return head.slice(0, 7);
    } catch {
        return null;
    }
}

function resolveRepoPath(): string | null {
    const envPath = process.env.QUIET_REPO_PATH?.trim();
    if (envPath && existsSync(join(envPath, ".git"))) return envPath;

    const branded = QUIET_DEV_REPO_PATH.trim();
    if (branded && existsSync(join(branded, ".git"))) return branded;

    return null;
}

export function getDevGitContext(): DevGitContext {
    const repoPath = resolveRepoPath();
    const branch = repoPath ? readGitBranch(repoPath) : null;
    const active = isDevEnvFlagSet() || branch != null;

    return { active, branch, repoPath };
}
