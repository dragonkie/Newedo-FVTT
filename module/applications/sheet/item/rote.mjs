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
        const skill_options = {};

        // Prepares the dropdown selector for skills
        if (actor) {
            for (const skill of actor.itemTypes.skill) skill_options[skill.system.linkID] = skill.name;
        } else {
            // grabs an array of all the items in the internal skills compendium
            const skills = [];

            // Add all items from compendium packs we can see
            for (const pack of game.packs.contents) {
                if (pack.documentName == 'Item') {
                    let documents = await pack.getDocuments();
                    for (const doc of documents) {
                        if (doc.type == 'skill') skills.push(doc);
                    }
                }
            }

            // Add all items available from the global game context
            for (const item of game.items.contents) if (item.type == 'skill') skills.push(item);

            // sort the list of skills
            const sorted = skills.sort((a, b) => a.name.localeCompare(b.name));
            for (const skill of sorted) skill_options[skill.system.linkID] = skill.name;

            if (this.document.linkID == '' || !this.document.linkID) this.document.linkID = Object.keys(skill_options)[0];
        }

        // Generate the final selector
        context.selector.skill = new foundry.data.fields.StringField({
            initial: this.document.system.skill.linkID,
            blank: true,
            label: NEWEDO.generic.skill,
            choices: skill_options
        }).toFormGroup({ localize: true }, { name: 'system.skill.linkID' }).outerHTML;

        return context;
    }
}