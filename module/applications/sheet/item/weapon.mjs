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

        // Prepares the dropdown selector for skills
        if (actor) {
            context.selector.skill = new foundry.data.fields.StringField({
                blank: false,
                nullable: false,
                required: true,
                initial: this.document.system.skill.slug,
                choices: () => {
                    let options = {};
                    for (const skill of actor.itemTypes.skill) {
                        if (skill.system.isWeaponSkill) options[skill.id] = skill.name;
                    }
                    return options;
                }
            }).toFormGroup({ label: utils.localize(NEWEDO.generic.skill) }, {
                value: this.document.system.skill.slug
            }).outerHTML;

        } else {
            context.selector.skill = elements.select.WeaponSkills(this.document.system.skill.slug, 'system.skill.slug');
        }

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