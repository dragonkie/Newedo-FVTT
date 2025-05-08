import NewedoItemSheet from "../item.mjs";
import { elements } from "../../../elements/_module.mjs"
import NewedoDialog from "../../dialog.mjs";
import { NEWEDO } from "../../../config.mjs";
import utils from "../../../helpers/sysUtil.mjs";

export default class WeaponSheet extends NewedoItemSheet {
    static DEFAULT_OPTIONS = {
        actions: {
            createDamagePart: this._onCreateDamagePart,
            deleteDamagePart: this._onDeleteDamagePart
        }
    }

    static PARTS = {
        header: { template: "systems/newedo/templates/item/header.hbs" },
        tabs: { template: "systems/newedo/templates/shared/tabs-nav.hbs" },
        body: { template: "systems/newedo/templates/item/body.hbs" },
        rules: { template: "systems/newedo/templates/item/rules.hbs" },
        description: { template: "systems/newedo/templates/item/description.hbs" },
        settings: { template: "systems/newedo/templates/item/settings/weapon.hbs" }
    }

    //==================================================================================================================
    //> Prepare Context
    //==================================================================================================================
    async _prepareContext(partId, content) {
        const context = await super._prepareContext(partId, content);

        // Boolean values for quick use and readability in templates
        context.isEquipped = context.system.equipped;
        context.isRanged = context.system.ranged;

        // prepares the damage parts for rendering
        context.damageParts = [];
        for (let a = 0; a < context.system.damageParts.length; a++) {
            const dmg = context.system.damageParts[a];
            context.damageParts.push({
                formula: {
                    value: dmg.value,
                    field: this.document.system.schema.fields.damageParts.element.fields.value,
                    path: `system.damageParts.${a}.value`
                },
                type: {
                    value: dmg.type,
                    field: this.document.system.schema.fields.damageParts.element.fields.type,
                    path: `system.damageParts.${a}.type`
                }
            })
        }

        // Selector lists to be rendered dynamically, others can use default handlebars templates
        const actor = this.document.actor;
        context.selector = {
            skill: {},
            damage: [],
        };


        //========================================================================================
        //>- Create skill list
        //========================================================================================
        // Creates the skill selector
        // grabs an array of all the items in the internal skills compendium
        const skills = [];

        if (actor) {
            //===================================================================================
            //>-- Actor Skill List
            //===================================================================================
            for (const item of actor.items) if (item.type == 'skill' && item.system.isWeaponSkill) skills.push(item);
        } else {
            //===================================================================================
            //>-- World skill list
            //===================================================================================
            for (const pack of game.packs.contents) {
                if (pack.documentName == 'Item') {
                    let documents = await pack.getDocuments();
                    for (const doc of documents) {
                        if (doc.type == 'skill' && doc.system.isWeaponSkill) skills.push(doc);
                    }
                }
            }

            for (const item of game.items.contents) if (item.type == 'skill' && item.system.isWeaponSkill) skills.push(item);
        }

        const options = {};
        for (const skill of skills) options[skill.system.linkID] = skill.name;

        context.selector.skill = new foundry.data.fields.StringField({
            blank: false,
            initial: this.document.system.skill.linkID,
            choices: options,
            label: NEWEDO.generic.skill,
        }).toFormGroup({ localize: true }, { blank: false, name: 'system.skill.linkID' }).outerHTML;

        return context;
    }

    static async _onCreateDamagePart(event, target) {
        this.document.system.damageParts.push({
            value: '1d6 + (@pow.mod)d10',
            type: 'kin'
        })

        await this.document.update({ system: { damageParts: this.document.system.damageParts } });
        this.render(false);
    }

    /**
     * 
     * @param {Event} event 
     * @param {*} target 
     */
    static async _onDeleteDamagePart(event, target) {
        let confirm = true;
        if (!event.shiftKey) confirm = await NewedoDialog.confirm({
            content: 'NEWEDO.Dialog.Confirm.DeleteDamage'
        })

        if (confirm) {
            let index = target.closest('[data-part-index]').dataset.partIndex;
            let parts = this.document.system.damageParts;
            parts.splice(index, 1);
            await this.document.update({ system: { damageParts: parts } })
            this.render(false);
        }
    }
}