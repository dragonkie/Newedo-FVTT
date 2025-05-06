import NewedoActorSheet from "../actor.mjs";

import LOGGER from "../../../helpers/logger.mjs";
import NewedoDialog from "../../dialog.mjs";
import utils from "../../../helpers/sysUtil.mjs";
import { NEWEDO } from "../../../config.mjs";

export default class CharacterSheet extends NewedoActorSheet {
    static DEFAULT_OPTIONS = {
        classes: ["character"],
        position: { height: 740, width: 860, top: 60, left: 100 },
        actions: {
            rest: this._onRest
        },
        resizeable: false

    }

    static get PARTS() {
        return {
            panel: { template: "systems/newedo/templates/actor/shared/panel.hbs" },
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
            traits: { id: "traits", group: "primary", label: "NEWEDO.Generic.Trait.plural" },
            skills: { id: "skills", group: "primary", label: "NEWEDO.Generic.Skill.plural" },
            equipment: { id: "equipment", group: "primary", label: "NEWEDO.Generic.Equipment" },
            augments: { id: "augments", group: "primary", label: "NEWEDO.Generic.Augments" },
            magic: { id: "magic", group: "primary", label: "NEWEDO.Generic.Magic" },
            effects: { id: "effects", group: "primary", label: "NEWEDO.Tab.Effects" },
            description: { id: "description", group: "primary", label: "NEWEDO.Tab.Description" }
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
        return context;
    }

    static async _onRest(event, target) {
        let heal = this.document.system.rest.total;
        await NewedoDialog.confirm({
            content: `
            <p>Are you sure you would like to rest?</p>
            <p>This will restore ${heal} health and all temp legend.</p>
            `,
            submit: (result) => {
                if (result) {
                    this.document.update({
                        'system.hp.value': Math.min(this.document.system.hp.value + heal, this.document.system.hp.max),
                        'system.legend.value': this.document.system.legend.max
                    })
                }
            }
        });
    }

    async _onDropItem(event, item) {
        switch (item.type) {
            case 'lineage':
                this._onDropLineage(event, item)
                break;
            case 'culture':
                this._onDropCulture(event, item)
                break;
            case 'path':
                this._onDropPath(event, item)
                break;
            default:
                super._onDropItem(event, item);
                break;
        }
    }

    async _onDropLineage(event, item) {
        // Check if the actor needs a culture, and offer them one


        // Validate what needs to be done for this drop
        let has_culture = false;
        for (const item of this.document.items) {
            if (item.type == 'lineage') return void utils.warn('NEWEDO.Warn.AlreadyHasLineage');
            if (item.type == 'culture') {
                has_culture = true;
                break;
            }
        }

        // If the actor doesnt have a culture yet, offer them one
        if (!has_culture) {
            let confirm = await NewedoDialog.confirm({
                content: "This actor doesn't have a culture, would you like to select one?",
            });

            if (confirm) {
                // get the list of choices
                const choices = {};
                for (const option of item.system.cultures) {
                    const item_data = await fromUuid(option.uuid);
                    choices[option.uuid] = item_data.name;
                }

                // prepares the dialog contents
                let content = '<div class="newedo">';
                content += `<div>Please select your culture.</div>`
                content += new foundry.data.fields.StringField({
                    blank: true, initial: '', choices: choices
                }).toFormGroup({}, { classes: ['edo-culture-select'] }).outerHTML;

                content += `</div>`
                let app_culture = await new NewedoDialog({
                    content: content,
                    buttons: [{
                        label: 'Confirm',
                        action: 'confirm',
                        icon: 'fas fa-check'
                    }, {
                        label: 'Cancel',
                        action: 'cancel',
                        icon: 'fas fa-xmark'
                    }],
                    submit: async (result) => {
                        console.log(app_culture);
                        if (result != 'confirm') return;
                        const ele = app_culture.element;
                        const uuid = ele.querySelector('.edo-culture-select').value
                        const culture = await fromUuid(uuid);
                        if (!culture) return;

                        const itemData = culture.toObject();
                        const modification = {
                            "-=_id": null,
                            "-=ownership": null,
                            "-=folder": null,
                            "-=sort": null
                        };
                        foundry.utils.mergeObject(itemData, modification, { performDeletions: true });
                        this.document.createEmbeddedDocuments(culture.documentName, [itemData], { parent: this.document });
                    }
                }).render(true);
            }
        }

        // Apply other items to be made, and the trait modifiers to be added
        console.log(item.system)
        const update_data = this.document.system.toObject();
        const system = this.document.system;

        // Updates armour values
        for (const [key, soak] of Object.entries(item.system.armour)) update_data.armour[key].value += soak.value;

        // Update core traits
        for (const [key, trait] of Object.entries(item.system.traits.core)) {
            update_data.traits.core[key].value += item.system.traits.core[key].value;
        }

        for (const [key, trait] of Object.entries(item.system.traits.derived)) {
            if (key == 'hp') continue;
            update_data.traits.derived[key].value += item.system.traits.derived[key].value;
            update_data.traits.derived[key].mod += item.system.traits.derived[key].mod;
        }

        update_data.hp.mod += item.system.traits.derived.hp.mod;

        console.log(update_data)
        await this.document.update({ system: update_data });

        // Calls back to the super to create the actual lineage item
        super._onDropItem(event, item);
    }

    async _onDropCulture(event, item) {

    }


    async _onDropPath(event, item) {

    }
}