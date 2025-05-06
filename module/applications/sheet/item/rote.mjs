import NewedoItemSheet from "../item.mjs";
import { elements } from "../../../elements/_module.mjs"

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
            // if this item is owned, the skill list is generated from their available skills
            // this allows custom skills to be added
            // Only skills toggled as weapon skills will appear here to prevent bloat
            let skills = [];
            for (const skill of actor.itemTypes.skill) skills.push({ value: skill.id, label: skill.name });

            skills.sort((a, b) => {
                if (a.label > b.label) return 1;
                if (b.label > a.label) return -1;
                return 0;
            })

            context.selector.skill = foundry.applications.fields.createSelectInput({
                options: skills,
                value: this.document.system.skill.id,
                valueAttr: "value",
                labelAttr: "label",
                localize: true,
                sort: false,
                name: 'system.skill.id'
            }).outerHTML;
        } else {
            context.selector.skill = elements.select.Skills(this.document.system.skill.slug, 'system.skill.slug');
        }

        return context;
    }
}