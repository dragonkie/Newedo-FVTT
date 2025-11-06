import NewedoActorSheet from "../actor.mjs";
import NewedoDialog from "../../dialog.mjs";

import LOGGER from "../../../helpers/logger.mjs";

export default class NpcSheet extends NewedoActorSheet {
    static DEFAULT_OPTIONS = {
        classes: ["npc"],
        position: { height: 600, width: 700, top: 100, left: 200 },
        actions: {
            configSkills: this._onConfigureSkills
        }
    }

    static PARTS = {
        panel: { template: "systems/newedo/templates/actor/shared/panel.hbs" },
        body: { template: "systems/newedo/templates/actor/npc/body.hbs" },
        header: { template: "systems/newedo/templates/actor/npc/header.hbs" },
        traits: { template: "systems/newedo/templates/actor/npc/traits.hbs" },
        equipment: { template: "systems/newedo/templates/actor/npc/equipment.hbs" },
        magic: { template: "systems/newedo/templates/actor/npc/magic.hbs" },
        augments: { template: "systems/newedo/templates/actor/npc/augments.hbs" }
    }

    static TABS = {
        traits: { id: "traits", group: "primary", label: "NEWEDO.Generic.Trait.plrl" },
        equipment: { id: "equipment", group: "primary", label: "NEWEDO.Generic.Equipment" },
        augments: { id: "augments", group: "primary", label: "NEWEDO.Generic.Augments" },
        magic: { id: "magic", group: "primary", label: "NEWEDO.Generic.Magic" },
    }

    tabGroups = {
        primary: "traits"
    }

    async _prepareContext() {
        const context = await super._prepareContext();

        return context;
    }

    static async _onConfigureSkills(event, target) {
        let content = "";
        for (const skill of this.document.system.skills) {
            content += new foundry.data.fields.StringField().toFormGroup({label: skill.label}, {value: skill.trait}).outerHTML;
        }

        const app = await new NewedoDialog({
            content: content,
            window: {
                resizeable: false,
                minimizable: false,
                title: 'NEWEDO.Dialog.SkillConfig'
            },
            buttons: [{
                action: 'confirm',
                label: 'Confirm',
                icon: 'fas fa-check',
                default: true
            }, {
                action: 'cancel',
                label: 'Cancel',
                icon: 'fas fa-xmark'
            }],
            submit: (result) => {
                if (result !== 'confirm') return;
                let data = {};
                for (const input of app.element.querySelectorAll('input[name]')) {
                    data[input.name] = input.value;
                }
                //this.document.update(data);
            }
        }).render(true);
    }
}    