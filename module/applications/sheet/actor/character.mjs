import NewedoActorSheet from "../actor.mjs";

import LOGGER from "../../../helpers/logger.mjs";
import NewedoDialog from "../../dialog.mjs";
import utils from "../../../helpers/sysUtil.mjs";
import { NEWEDO } from "../../../config.mjs";

export default class CharacterSheet extends NewedoActorSheet {
    static DEFAULT_OPTIONS = {
        classes: ["character"],
        position: { height: 680, width: 840, top: 60, left: 125 },
        actions: {
            rest: this._onRest
        }
    }

    static get PARTS() {
        return {
            panel: { template: "systems/newedo/templates/actor/character/panel.hbs" },
            body: { template: "systems/newedo/templates/actor/character/body.hbs" },
            header: { template: "systems/newedo/templates/actor/character/header.hbs" },
            traits: { template: "systems/newedo/templates/actor/character/traits.hbs" },
            skills: { template: "systems/newedo/templates/actor/character/skills.hbs" },
            equipment: { template: "systems/newedo/templates/actor/character/equipment.hbs" },
            magic: { template: "systems/newedo/templates/actor/character/magic.hbs" },
            augments: { template: "systems/newedo/templates/actor/character/augments.hbs" },
            effects: { template: "systems/newedo/templates/actor/effects.hbs" },
            description: { template: "systems/newedo/templates/actor/character/biography.hbs" }
        }
    }

    static get TABS() {
        return {
            traits: { id: "traits", group: "primary", label: "NEWEDO.tab.traits" },
            skills: { id: "skills", group: "primary", label: "NEWEDO.tab.skills" },
            equipment: { id: "equipment", group: "primary", label: "NEWEDO.tab.equipment" },
            augments: { id: "augments", group: "primary", label: "NEWEDO.tab.augs" },
            magic: { id: "magic", group: "primary", label: "NEWEDO.tab.magic" },
            effects: { id: "effects", group: "primary", label: "NEWEDO.tab.effects" },
            description: { id: "description", group: "primary", label: "NEWEDO.tab.bio" }
        }
    }

    tabGroups = {
        primary: "traits"
    }

    async _prepareContext() {
        const context = await super._prepareContext();

        context.lineage = this.document.itemTypes.lineage[0];
        context.culture = this.document.itemTypes.culture[0];
        context.path = this.document.itemTypes.path[0];

        // Localize backgrounds
        for (let [k, v] of Object.entries(context.system.background)) {
            v.label = utils.localize(NEWEDO.background[k]);
        }

        LOGGER.debug('SHEET | CHARACTER | PREPARE CONTEXT', context);
        return context;
    }

    static async _onRest(event, target) {
        let heal = this.document.system.rest.total;
        let confirm = await NewedoDialog.confirm({
            content: `
            <p>Are you sure you would like to rest?</p>
            <p>This will restore ${heal} health and all temp legend.</p>
            `
        });

        if (confirm) {
            this.document.update({
                'system.hp.value': this.document.system.hp.value + heal,
                'system.legend.value': this.document.system.legend.max
            })
        }
    }
}