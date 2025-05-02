import NewedoActorSheet from "../actor.mjs";

import LOGGER from "../../../helpers/logger.mjs";

export default class NpcSheet extends NewedoActorSheet {
    static DEFAULT_OPTIONS = {
        classes: ["npc"],
        position: { height: 600, width: 700, top: 100, left: 200 }
    }

    static PARTS = {
        panel: { template: "systems/newedo/templates/actor/shared/panel.hbs" },
        body: { template: "systems/newedo/templates/actor/npc/body.hbs" },
        header: { template: "systems/newedo/templates/actor/character/header.hbs" },
        traits: { template: "systems/newedo/templates/actor/npc/traits.hbs" },
        equipment: { template: "systems/newedo/templates/actor/npc/equipment.hbs" },
        magic: { template: "systems/newedo/templates/actor/npc/magic.hbs" },
        augments: { template: "systems/newedo/templates/actor/npc/augments.hbs" }
    }

    static TABS = {
        traits: { id: "traits", group: "primary", label: "NEWEDO.tab.traits" },
        equipment: { id: "equipment", group: "primary", label: "NEWEDO.tab.equipment" },
        augments: { id: "augments", group: "primary", label: "NEWEDO.tab.augs" },
        magic: { id: "magic", group: "primary", label: "NEWEDO.tab.magic" },
    }

    tabGroups = {
        primary: "traits"
    }

    async _prepareContext() {
        const context = await super._prepareContext();

        return context;
    }
}    