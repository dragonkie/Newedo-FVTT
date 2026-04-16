import LOGGER from "../../helpers/logger.mjs";
import NewedoSheetMixin from "./mixin.mjs";
import NewedoRoll from "../../helpers/dice.mjs";
import NewedoLedger from "../ledger.mjs";
import utils from "../../helpers/sysUtil.mjs";
import { NEWEDO } from "../../config.mjs";
import NewedoDialog from "../dialog.mjs";

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export default class NewedoActorSheet extends NewedoSheetMixin(foundry.applications.sheets.ActorSheetV2) {

    static DEFAULT_OPTIONS = {
        classes: ["actor"],
        position: { height: 640, width: 840, top: 100, left: 200 },
        actions: {
            skillDice: this._onSkillDice,
            rollFate: this._onRollFate,
            editLedger: this._onEditLedger,
            fateDisplay: this._onChangeFateDisplay,
            createEffect: this._onCreateEffect,
            disableEffect: this._onDisableEffect,
            toggleWeaponBurst: this._onToggleWeaponBurst,
            reloadWeapon: this._onReloadWeapon,
            
            // actions that open configuration windows
            configSoaks: this._onConfigureSoaks,
            configDerived: this._onConfigureTraitsDerived
        }
    }

    static get PARTS() {

    }

    static TABS = {
        traits: { id: "traits", group: "primary", label: "NEWEDO.Generic.Trait.plrl" },
        skills: { id: "skills", group: "primary", label: "NEWEDO.Generic.Skill.plrl" },
        equipment: { id: "equipment", group: "primary", label: "NEWEDO.Generic.Equipment" },
        augments: { id: "augments", group: "primary", label: "NEWEDO.Generic.Augments" },
        magic: { id: "magic", group: "primary", label: "NEWEDO.Generic.Magic" },
        description: { id: "description", group: "primary", label: "NEWEDO.Generic.Description" }
    }

    tabGroups = {
        primary: "traits"
    }

    /** @override */
    get template() {
        return `systems/${game.system.id}/templates/actor/actor-${this.document.type}-sheet.hbs`;
    }

    //==========================================================================================
    //> Data preparation
    //==========================================================================================

    /** @override */
    async _prepareContext() {
        const context = await super._prepareContext();

        // Add the actor's data to cfontext.data for easier access, as well as flags.
        context.items = this.document.items;
        context.itemTypes = this.document.itemTypes;
        context.editable = this.isEditable && (this._mode === this.constructor.SHEET_MODES.EDIT);

        const { core, derived } = context.system.traits;

        // Localize core traits
        for (let [k, v] of Object.entries(core)) {
            v.label = utils.localize(NEWEDO.traitsCore[k]);
            v.abbr = utils.localize(NEWEDO.traitsCoreAbbr[k]);
        }

        // Localize Derived traits.
        for (let [k, v] of Object.entries(derived)) {
            v.label = utils.localize(NEWEDO.traitsDerived[k]);
            v.abbr = utils.localize(NEWEDO.traitsDerivedAbbr[k]);
        }

        // Localize armour labels
        for (let [k, v] of Object.entries(context.system.armour)) {
            v.label = utils.localize(NEWEDO.damageTypes[k]);
            v.abbr = utils.localize(NEWEDO.damageTypesAbbr[k]);
        }

        // Prepare item contexts
        const settings = game.user.getFlag('newedo', 'settings');

        // Setup active effect groups
        context.effects = {
            active: {
                label: 'Active',
                effects: []
            },
            passive: {
                label: 'Passive',
                effects: []
            },
            disabled: {
                label: 'Disabled',
                effects: []
            },
            suppressed: {
                label: 'Suppressed',
                effects: []
            }
        }

        for (const effect of this.document.effects) {
            if (effect.isSuppressed) context.effects.suppressed.effects.push(effect);
            else if (effect.isTemporary) context.effects.active.effects.push(effect);
            else if (effect.active) context.effects.passive.effects.push(effect);
            else context.effects.disabled.effects.push(effect);
        }

        // Initialize containers.
        context.skills = {};
        for (const [key, value] of Object.entries(NEWEDO.traitsCore)) {
            context.skills[key] = {
                label: utils.localize(value),
                list: [],
                hasRank: false,
                hasSkill: false,
            }
        }
        // Sort the mega list so the displayed lists are alphabetical
        context.itemTypes.skill.sort((a, b) => ('' + a.name).localeCompare(b.name))
        // Iterate through items, allocating to containers
        for (const i of context.itemTypes.skill) {
            context.skills[i.system.trait].list.push(i);
            context.skills[i.system.trait].hasSkill = true;
            if (i.system.rank > 0) context.skills[i.system.trait].hasRank = true;
        }

        //Proxies the fate list so we don't disorganize it
        context.fates = [].concat(context.itemTypes.fate);

        if (settings) {
            if (settings.fateDisplay == "range") {
                context.fates.sort((a, b) => {
                    return b.system.start - a.system.start;
                });
            } else {
                context.fates.sort((a, b) => {
                    return b.system.chance - a.system.chance;
                });
            }
        }

        return context;
    }

    //==========================================================================================
    //> Sheet Actions
    //==========================================================================================
    static async _onEditLedger(event, target) {
        let path = target.dataset?.target;// the value this ledger is targeting
        let label = target.dataset?.label;// the display name of this ledger, localizeable
        let id = target.dataset?.id;// identifier for which ledger is the one we want to pull up

        if (!id) {
            LOGGER.error('Missing ledger id')
            return null;
        }

        let ledgers = this.document.getFlag('newedo', 'ledger');

        // creates the ledger flag if it doesnt exist
        if (!ledgers) {
            LOGGER.debug('Creating ledger flag...')
            await this.document.setFlag('newedo', 'ledger', {});
            ledgers = this.document.getFlag('newedo', 'ledger');
        }
        // If the ledger flag doesnt have our id, add it to the list
        if (!ledgers[id]) {
            // adds the new ledger to the list
            let newLedger = {
                [id]: {
                    id: id,
                    label: label,
                    transactions: [],
                    target: path
                }
            }
            await this.document.setFlag('newedo', 'ledger', newLedger);
            ledgers = this.document.getFlag('newedo', 'ledger');
        }

        ledgers[id].label = label;
        new NewedoLedger(this.document, ledgers[id]).render(true);
    }

    static _onChangeFateDisplay() {
        let settings = game.user.getFlag('newedo', 'settings');
        if (!settings) game.user.setFlag('newedo', 'settings', { fateDisplay: 'range' }).then(() => this.render(false));
        else if (settings.fateDisplay == 'range') game.user.setFlag('newedo', 'settings', { fateDisplay: '%' }).then(() => this.render(false));
        else game.user.setFlag('newedo', 'settings', { fateDisplay: 'range' }).then(() => this.render(false));
    }

    /**Handle fate roll table calls
     * Managed seperately from the standard roll function to maintain simplicity
     * @param {Event} event The originating click event
     * @private
     */
    static async _onRollFate(event, target) {
        const roll = new Roll('1d100');
        await roll.evaluate();
        let render = await roll.render();

        let label = "";
        let description = "";

        for (let fate of this.document.itemTypes.fate) {
            let _bot = fate.system.start;
            let _top = fate.system.end;

            //checks that the roll result is in range, regardless if the start and end of the range are configured properly
            if (roll.total >= Math.min(_bot, _top) && roll.total <= Math.max(_bot, _top)) {
                label = " | " + fate.name;
                description = fate.system.description;
                break;
            }
        }


        //creates the role message, adding in the description and fate title if one was rolled
        //The description is enrichedHTML and can have inlineroles and UUID links
        return roll.toMessage({
            speaker: ChatMessage.getSpeaker({ actor: this.document }),
            flavor: `<div style="font-size: 20px; text-align: center;">${utils.localize(NEWEDO.generic.fate)}` + [label] + `</div>`,
            content: [render] + "<div>" + [description] + "</div>",
            create: true,
            rollMode: game.settings.get('core', 'rollMode')
        });
    }
    /**
     * Calls the relevant skills cycle dice function
     * @param {Event} event the originating click event
     * @private
     */
    static async _onSkillDice(event, target) {
        event.preventDefault();
        const item = await this.constructor.getTargetItem(target);
        return item?.system._cycleSkillDice(target.dataset.index, event.shiftKey);
    };

    static async _onCreateEffect(event, target) {
        let effect = await ActiveEffect.create({
            name: 'New Effect',
            type: 'base'
        }, { parent: this.document, renderSheet: true });
    }

    static async _onDisableEffect(event, target) {
        const item = await this.constructor.getTargetItem(target);
        item.update({ disabled: !item.disabled });
    }

    static async _onToggleWeaponBurst(event, target) {
        const item = await this.constructor.getTargetItem(target);
        if (item.type != 'weapon') return void pta.utils.error('NEWEDO.Error.ItemSettingMismatch');

        let flag = item.getFlag('newedo', 'burst_fire');
        if (!flag) await item.setFlag('newedo', 'burst_fire', true);
        else await item.setFlag('newedo', 'burst_fire', !flag);
        this.render(false);
    }

    static async _onReloadWeapon(event, target) {
        const item = await this.constructor.getTargetItem(target);
        let max = item.system.ammo.max;
        await item.update({ 'system.ammo.value': max });
        this.render(false);
        item.sheet.render(false);
    }

    //=====================================================================
    //> Configuration windows
    //=====================================================================
    static async _onConfigureSoaks(event, target) {
        let content = `<p><b>Base Soak Values</b></p>`;
        for (const [key, soak] of Object.entries(this.document.system.armour)) {
            let field = new foundry.data.fields.NumberField();
            content += field.toFormGroup({
                label: utils.localize(NEWEDO.damageTypes[key])
            }, {
                name: `system.armour.${key}.value`,
                value: soak.value
            }
            ).outerHTML;
        }

        const app = await new NewedoDialog({
            content: content,
            window: {
                resizeable: false,
                minimizable: false,
                title: 'NEWEDO.Dialog.SoakConfig'
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
                this.document.update(data);
            }
        }).render(true);
    }

    static async _onConfigureTraitsDerived(event, target) {
        const system = this.document.system;
        // Add in the derived traits
        let content = `<b>Derived Traits</b>`;
        content += `<div class="items-header flexrow"><div>Trait</div><div>Flat</div><div>Modifier</div></div>`;
        for (const [key, trait] of Object.entries(this.document.system.traits.derived)) {
            let field = new foundry.data.fields.NumberField();

            content += `<div class="form-group"><label>${utils.localize(NEWEDO.traitsDerived[key])}</label><div class="form-fields">`;
            content += this.document.system.schema.getField(`traits.derived.${key}.value`).toInput({ value: trait.value }).outerHTML;
            content += this.document.system.schema.getField(`traits.derived.${key}.mod`).toInput({ value: trait.mod }).outerHTML;
            content += `</div></div>`;
        }

        content += `<div class="form-group"><label>${utils.localize(NEWEDO.traitsDerived.hp)}</label><div class="form-fields">`;
        content += this.document.system.schema.getField(`hp.flat`).toInput({ value: system.hp.flat }).outerHTML;
        content += this.document.system.schema.getField(`hp.mod`).toInput({ value: system.hp.mod }).outerHTML;
        content += `</div></div>`;

        content += `<div class="form-group"><label>${utils.localize(NEWEDO.generic.lift)}</label><div class="form-fields">`;
        content += this.document.system.schema.getField(`lift.flat`).toInput({ value: system.lift.flat }).outerHTML;
        content += this.document.system.schema.getField(`lift.mod`).toInput({ value: system.lift.mod }).outerHTML;
        content += `</div></div>`;

        content += `<div class="form-group"><label>${utils.localize(NEWEDO.generic.rest)}</label><div class="form-fields">`;
        content += this.document.system.schema.getField(`rest.flat`).toInput({ value: system.rest.flat }).outerHTML;
        content += this.document.system.schema.getField(`rest.mod`).toInput({ value: system.rest.mod }).outerHTML;
        content += `</div></div>`;

        const app = await new NewedoDialog({
            id: `${this.id}-dialog-config-traits-derived`,
            content: content,
            window: {
                resizeable: false,
                minimizable: false,
                title: 'NEWEDO.Dialog.DerivedTraits'
            },
            position: {
                width: 500,
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
                this.document.update(data);
            }
        }).render(true);
    }

    //==========================================================================================
    //> Drag and Drop
    //==========================================================================================

}