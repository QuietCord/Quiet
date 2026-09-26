/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { BaseText } from "@components/BaseText";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { Margins } from "@utils/margins";
import { RenderModalProps } from "@vencord/discord-types";
import { Forms, Modal, openModal, Select, useState } from "@webpack/common";

import {
    composeMergedBackup,
    finishCloudMergeImport,
    formatMergeNamespace,
    type SettingsMergeConflict,
} from "./cloudMerge";

type Side = "yours" | "theirs";

interface CloudMergeConflictModalProps extends RenderModalProps {
    conflicts: SettingsMergeConflict[];
    partialJson: string;
    shouldNotify: boolean;
    onDone: (applied: boolean) => void;
}

function CloudMergeConflictModal(props: CloudMergeConflictModalProps) {
    const { conflicts, partialJson, shouldNotify, onDone, onClose, ...modalProps } = props;

    const [picks, setPicks] = useState<Record<string, Side>>(() =>
        Object.fromEntries(conflicts.map(c => [c.namespace, "yours" as Side]))
    );
    const [busy, setBusy] = useState(false);

    return (
        <Modal
            {...modalProps}
            size="lg"
            title="Merge settings — resolve conflicts"
            onClose={() => {
                onDone(false);
                onClose();
            }}
        >
            <Forms.FormText className={Margins.bottom16}>
                Both devices changed the same areas. Choose which copy to keep for each item; everything else was merged automatically.
            </Forms.FormText>

            <Flex gap="0.5em" className={Margins.bottom16}>
                <Button
                    size="small"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setPicks(Object.fromEntries(conflicts.map(c => [c.namespace, "yours" as Side])))}
                >
                    This device for all
                </Button>
                <Button
                    size="small"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setPicks(Object.fromEntries(conflicts.map(c => [c.namespace, "theirs" as Side])))}
                >
                    Cloud for all
                </Button>
            </Flex>

            <Flex flexDirection="column" gap="1.25em">
                {conflicts.map(c => (
                    <div key={c.namespace}>
                        <Forms.FormTitle tag="h5">{formatMergeNamespace(c.namespace)}</Forms.FormTitle>
                        <Select
                            options={[
                                { label: "This device", value: "yours", default: true },
                                { label: "Cloud", value: "theirs" },
                            ]}
                            isSelected={v => (picks[c.namespace] ?? "yours") === v}
                            select={v => setPicks(prev => ({ ...prev, [c.namespace]: v as Side }))}
                            serialize={String}
                            closeOnSelect
                        />
                        <BaseText size="sm" color="text-muted" className={Margins.top4}>
                            {c.namespace}
                        </BaseText>
                    </div>
                ))}
            </Flex>

            <Flex className={Margins.top24} gap="0.75em" justifyContent="flex-end">
                <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                        onDone(false);
                        onClose();
                    }}
                >
                    Cancel
                </Button>
                <Button
                    variant="primary"
                    disabled={busy}
                    onClick={async () => {
                        setBusy(true);
                        try {
                            await finishCloudMergeImport(partialJson, shouldNotify, conflicts, picks);
                            onDone(true);
                            onClose();
                        } catch {
                            showNotification({
                                title: "Cloud Settings",
                                body: "Could not apply your merge choices.",
                                color: "var(--red-360)",
                            });
                        } finally {
                            setBusy(false);
                        }
                    }}
                >
                    Apply merge
                </Button>
            </Flex>
        </Modal>
    );
}

export function openCloudMergeConflictModal(options: {
    conflicts: SettingsMergeConflict[];
    partialJson: string;
    shouldNotify: boolean;
}): Promise<boolean> {
    return new Promise(resolve => {
        let settled = false;
        const finish = (applied: boolean) => {
            if (settled) return;
            settled = true;
            resolve(applied);
        };

        openModal(modalProps => (
            <CloudMergeConflictModal
                {...modalProps}
                conflicts={options.conflicts}
                partialJson={options.partialJson}
                shouldNotify={options.shouldNotify}
                onDone={finish}
            />
        ));
    });
}
