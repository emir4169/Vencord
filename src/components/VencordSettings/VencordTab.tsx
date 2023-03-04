/*
 * Vencord, a modification for Discord's desktop app
 * Copyright (c) 2022 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { readFileSync } from 'fs';
import { useSettings } from "@api/settings";
import { classNameFactory } from "@api/Styles";
import DonateButton from "@components/DonateButton";
import ErrorBoundary from "@components/ErrorBoundary";
import { ErrorCard } from "@components/ErrorCard";
import IpcEvents from "@utils/IpcEvents";
import { Margins } from "@utils/margins";
import { identity, useAwaiter } from "@utils/misc";
import { Button, Card, Forms, React, Select, Slider, Switch } from "@webpack/common";

const cl = classNameFactory("vc-settings-");
const DEFAULT_DONATE_IMAGE = readFileSync("../../../defaultdonate.txt", "utf-8");
const SHIGGY_DONATE_IMAGE = readFileSync("../../../shiggydonate.txt", "utf-8");

type KeysOfType<Object, Type> = {
    [K in keyof Object]: Object[K] extends Type ? K : never;
}[keyof Object];

function VencordSettings() {
    const [settingsDir, , settingsDirPending] = useAwaiter(() => VencordNative.ipc.invoke<string>(IpcEvents.GET_SETTINGS_DIR), {
        fallbackValue: "Loading..."
    });
    const settings = useSettings();
    const notifSettings = settings.notifications;

    const donateImage = React.useMemo(() => Math.random() > 0.5 ? DEFAULT_DONATE_IMAGE : SHIGGY_DONATE_IMAGE, []);

    const isWindows = navigator.platform.toLowerCase().startsWith("win");

    const Switches: Array<false | {
        key: KeysOfType<typeof settings, boolean>;
        title: string;
        note: string;
    }> =
        [
            {
                key: "useQuickCss",
                title: "Enable Custom CSS",
                note: "Loads your Custom CSS"
            },
            !IS_WEB && {
                key: "enableReactDevtools",
                title: "Enable React Developer Tools",
                note: "Requires a full restart"
            },
            !IS_WEB && (!isWindows ? {
                key: "frameless",
                title: "Disable the window frame",
                note: "Requires a full restart"
            } : {
                key: "winNativeTitleBar",
                title: "Use Windows' native title bar instead of Discord's custom one",
                note: "Requires a full restart"
            }),
            !IS_WEB && {
                key: "transparent",
                title: "Enable window transparency",
                note: "Requires a full restart"
            },
            !IS_WEB && isWindows && {
                key: "winCtrlQ",
                title: "Register Ctrl+Q as shortcut to close Discord (Alternative to Alt+F4)",
                note: "Requires a full restart"
            }
        ];

    return (
        <React.Fragment>
            <DonateCard image={donateImage} />
            <Forms.FormSection title="Quick Actions">
                <Card className={cl("quick-actions-card")}>
                    {IS_WEB ? (
                        <Button
                            onClick={() => require("../Monaco").launchMonacoEditor()}
                            size={Button.Sizes.SMALL}
                            disabled={settingsDir === "Loading..."}>
                            Open QuickCSS File
                        </Button>
                    ) : (
                        <React.Fragment>
                            <Button
                                onClick={() => window.DiscordNative.app.relaunch()}
                                size={Button.Sizes.SMALL}>
                                Restart Client
                            </Button>
                            <Button
                                onClick={() => VencordNative.ipc.invoke(IpcEvents.OPEN_MONACO_EDITOR)}
                                size={Button.Sizes.SMALL}
                                disabled={settingsDir === "Loading..."}>
                                Open QuickCSS File
                            </Button>
                            <Button
                                onClick={() => window.DiscordNative.fileManager.showItemInFolder(settingsDir)}
                                size={Button.Sizes.SMALL}
                                disabled={settingsDirPending}>
                                Open Settings Folder
                            </Button>
                            <Button
                                onClick={() => VencordNative.ipc.invoke(IpcEvents.OPEN_EXTERNAL, "https://github.com/Vendicated/Vencord")}
                                size={Button.Sizes.SMALL}
                                disabled={settingsDirPending}>
                                Open in GitHub
                            </Button>
                        </React.Fragment>
                    )}
                </Card>
            </Forms.FormSection>

            <Forms.FormDivider />

            <Forms.FormSection className={Margins.top16} title="Settings" tag="h5">
                <Forms.FormText className={Margins.bottom20}>
                    Hint: You can change the position of this settings section in the settings of the "Settings" plugin!
                </Forms.FormText>
                {Switches.map(s => s && (
                    <Switch
                        key={s.key}
                        value={settings[s.key]}
                        onChange={v => settings[s.key] = v}
                        note={s.note}
                    >
                        {s.title}
                    </Switch>
                ))}
            </Forms.FormSection>


            <Forms.FormTitle tag="h5">Notification Style</Forms.FormTitle>
            {notifSettings.useNative !== "never" && Notification.permission === "denied" && (
                <ErrorCard style={{ padding: "1em" }} className={Margins.bottom8}>
                    <Forms.FormTitle tag="h5">Desktop Notification Permission denied</Forms.FormTitle>
                    <Forms.FormText>You have denied Notification Permissions. Thus, Desktop notifications will not work!</Forms.FormText>
                </ErrorCard>
            )}
            <Forms.FormText className={Margins.bottom8}>
                Some plugins may show you notifications. These come in two styles:
                <ul>
                    <li><strong>Vencord Notifications</strong>: These are in-app notifications</li>
                    <li><strong>Desktop Notifications</strong>: Native Desktop notifications (like when you get a ping)</li>
                </ul>
            </Forms.FormText>
            <Select
                placeholder="Notification Style"
                options={[
                    { label: "Only use Desktop notifications when Discord is not focused", value: "not-focused", default: true },
                    { label: "Always use Desktop notifications", value: "always" },
                    { label: "Always use Vencord notifications", value: "never" },
                ]satisfies Array<{ value: typeof settings["notifications"]["useNative"]; } & Record<string, any>>}
                closeOnSelect={true}
                select={v => notifSettings.useNative = v}
                isSelected={v => v === notifSettings.useNative}
                serialize={identity}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>Notification Position</Forms.FormTitle>
            <Select
                isDisabled={notifSettings.useNative === "always"}
                placeholder="Notification Position"
                options={[
                    { label: "Bottom Right", value: "bottom-right", default: true },
                    { label: "Top Right", value: "top-right" },
                ]satisfies Array<{ value: typeof settings["notifications"]["position"]; } & Record<string, any>>}
                select={v => notifSettings.position = v}
                isSelected={v => v === notifSettings.position}
                serialize={identity}
            />

            <Forms.FormTitle tag="h5" className={Margins.top16 + " " + Margins.bottom8}>Notification Timeout</Forms.FormTitle>
            <Forms.FormText className={Margins.bottom16}>Set to 0s to never automatically time out</Forms.FormText>
            <Slider
                disabled={notifSettings.useNative === "always"}
                markers={[0, 1000, 2500, 5000, 10_000, 20_000]}
                minValue={0}
                maxValue={20_000}
                initialValue={notifSettings.timeout}
                onValueChange={v => notifSettings.timeout = v}
                onValueRender={v => (v / 1000).toFixed(2) + "s"}
                onMarkerRender={v => (v / 1000) + "s"}
                stickToMarkers={false}
            />
        </React.Fragment>
    );
}


interface DonateCardProps {
    image: string;
}

function DonateCard({ image }: DonateCardProps) {
    return (
        <Card className={cl("card", "donate")}>
            <div>
                <Forms.FormTitle tag="h5">Support the Project</Forms.FormTitle>
                <Forms.FormText>Please consider supporting the development of Vencord by donating!</Forms.FormText>
                <DonateButton style={{ transform: "translateX(-1em)" }} />
            </div>
            <img
                role="presentation"
                src={image}
                alt=""
                height={128}
                style={{ marginLeft: "auto", transform: image === DEFAULT_DONATE_IMAGE ? "rotate(10deg)" : "" }}
            />
        </Card>
    );
}

export default ErrorBoundary.wrap(VencordSettings);
