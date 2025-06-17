import LOGGER from "./logger.mjs";

export default function registerSystemSettings() {
    LOGGER.log(`Registering system settings`);

    const settings = [{
        id: 'debugLogs',
        config: {
            name: "Debug Logs", // displayed name of the setting
            hint: "Enables debug logs in the console",
            scope: "client",
            config: true,
            type: Boolean,
            default: true,
        }
    }, {
        id: 'npcCritical',
        config: {
            name: "NPC critical hits",
            hint: "Adds a 5% chance for NPC actions to crit while still lacking fate cards",
            scope: "world",
            config: true,
            type: Boolean,
            default: false
        }
    }, {
        id: 'trackAmmo',
        config: {
            name: "NEWEDO.Setting.TrackAmmo.label",
            hint: "NEWEDO.Setting.TrackAmmo.hint",
            scope: "world",
            config: true,
            type: Boolean,
            default: true
        }
    }, {
        id: 'migrateSkillLinks',
        config: {
            name: "",
            hint: "",
            scope: "world",
            config: false,
            type: Boolean,
            default: false,
            onChange: () => { foundry.ui.notifications.notify('Finished migrating skill data') }
        }
    }, {
        id: 'migrateFateLinks',
        config: {
            name: "",
            hint: "",
            scope: "world",
            config: false,
            type: Boolean,
            default: false,
            onChange: () => { foundry.ui.notifications.notify('Finished migrating skill data') }
        }
    }]

    for (const setting of settings) {
        if (!setting.config.onChange) setting.config.onChange = (value) => { LOGGER.log(`SETTING | ${setting.id} set to ${value}`) }
        game.settings.register(game.system.id, setting.id, setting.config);
    }
};