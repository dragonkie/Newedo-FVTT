import NewedoActorSheet from "../actor.mjs";

import LOGGER from "../../../helpers/logger.mjs";

export default class PetSheet extends NewedoActorSheet {
    static DEFAULT_OPTIONS = {
        classes: ["pet"],
        position: { height: 740, width: 860, top: 60, left: 100 },
        actions: {
            rest: this._onRest
        },
        resizeable: false

    }

    static get PARTS() {
        return {
            body: { template: "systems/newedo/templates/actor/pet/body.hbs" },
            header: { template: "systems/newedo/templates/actor/pet/header.hbs" },

            features: { template: "systems/newedo/templates/actor/pet/features.hbs" },
            effects: { template: "systems/newedo/templates/actor/effects.hbs" },
            description: { template: "systems/newedo/templates/actor/pet/description.hbs" }
        }
    }

    static get TABS() {
        return {
            features: { id: "features", group: "primary", label: "NEWEDO.Tab.Features" },
            effects: { id: "effects", group: "primary", label: "NEWEDO.Tab.Effects" },
            description: { id: "description", group: "primary", label: "NEWEDO.Tab.Description" }
        }
    }

    tabGroups = {
        primary: "features"
    }

    async _prepareContext() {
        const context = await super._prepareContext();
        context.skills = [];
        for (const item of this.document.items.contents) {
            if (item.type == 'skill') context.skills.push(item);
        }
        return context;
    }
}