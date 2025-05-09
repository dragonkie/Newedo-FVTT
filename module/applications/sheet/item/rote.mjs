import NewedoItemSheet from "../item.mjs";
import { elements } from "../../../elements/_module.mjs"
import { NEWEDO } from "../../../config.mjs";

export default class RoteSheet extends NewedoItemSheet {
    static DEFAULT_OPTIONS = {
        actions: {

        }
    }

    static PARTS = {
        header: { template: "systems/newedo/templates/item/header.hbs" },
        tabs: { template: "systems/newedo/templates/shared/tabs-nav.hbs" },
        body: { template: "systems/newedo/templates/item/body.hbs" },
        rules: { template: "systems/newedo/templates/item/rules.hbs" },
        description: { template: "systems/newedo/templates/item/description.hbs" },
        settings: { template: "systems/newedo/templates/item/settings/rote.hbs" }
    }

    async _prepareContext() {
        const context = await super._prepareContext();
        const actor = this.actor;

        context.isEquipped = context.system.equipped;
        context.isRanged = context.system.ranged;

        context.selector = {
            skill: {}
        }

        // Prepares the dropdown selector for skills
        if (actor) {
            const skills = {};
            for (const skill of actor.itemTypes.skill) skills[skill.system.linkID] = skill.name;

            context.selector.skill = new foundry.data.fields.StringField({
                initial: this.document.system.skill.linkID,
                blank: true,
                label: NEWEDO.generic.skill,
                choices: skills
            }).toFormGroup().outerHTML;
        } else {
            context.selector.skill = await elements.select.Skills(this.document.system.skill.linkID);
        }

        return context;
    }
}