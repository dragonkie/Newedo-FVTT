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
            useItem: this._onUseItem,
            editItem: this._onEditItem,
            deleteItem: this._onDeleteItem,
            skillDice: this._onSkillDice,
            roll: this._onRoll,
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
        traits: { id: "traits", group: "primary", label: "NEWEDO.Generic.Trait.plural" },
        skills: { id: "skills", group: "primary", label: "NEWEDO.Generic.Skill.plural" },
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

        // Initialize containers.
        const skills = {};
        for (const [key, value] of Object.entries(NEWEDO.traitsCore)) {
            skills[key] = {
                label: utils.localize(value),
                list: []
            }
        }

        // Sort the mega list so the displayed lists are alphabetical
        context.itemTypes.skill.sort((a, b) => ('' + a.name).localeCompare(b.name))
        // Iterate through items, allocating to containers
        for (let i of context.itemTypes.skill) {
            i.img = i.img || DEFAULT_TOKEN;
            skills[i.system.trait].list.push(i);
        }

        context.skills = {
            l: {
                pow: skills.pow,
                hrt: skills.hrt,
                ref: skills.ref,
                pre: skills.pre
            },
            r: {
                per: skills.per,
                sav: skills.sav
            }
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
    static async getTargetItem(target) {
        let uuid = target.closest(".item[data-item-uuid]").dataset.itemUuid;
        if (!uuid) return undefined;
        return fromUuid(uuid);
    }

    static async _onEditItem(event, target) {
        const item = await this.constructor.getTargetItem(target);
        if (!item.sheet.rendered) item.sheet.render(true);
        else item.sheet.bringToFront();
    };

    static async _onUseItem(event, target) {
        // Get the item were actually targeting
        const item = await this.constructor.getTargetItem(target);
        // Grabs an optional argument to pass to the item, useful for when an item has multiple use cases such as weapons attacking / damaging
        const action = target.closest("[data-use]")?.dataset.use;
        return item.system.use(action);
    };

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

    static async _onDeleteItem(event, target) {
        const item = await this.constructor.getTargetItem(target);
        const confirm = await foundry.applications.api.DialogV2.confirm({
            content: `${utils.localize(NEWEDO.confirm.deleteItem)}: ${item.name}`,
            rejectClose: false,
            modal: true
        });
        if (confirm) return item.delete();
    }

    static _onChangeFateDisplay() {
        let settings = game.user.getFlag('newedo', 'settings');
        if (!settings) game.user.setFlag('newedo', 'settings', { fateDisplay: 'range' }).then(() => this.render(false));
        else if (settings.fateDisplay == 'range') game.user.setFlag('newedo', 'settings', { fateDisplay: '%' }).then(() => this.render(false));
        else game.user.setFlag('newedo', 'settings', { fateDisplay: 'range' }).then(() => this.render(false));
    }

    /**
     * Generic roll event, prompts user to spend legend and confirm the roll formula
     * @param {Event} event 
     * @param {HTMLElement} target 
     */
    static async _onRoll(event, target) {
        LOGGER.debug(`Standard roll action`, target);

        // adds the roll from the html element
        let ele = target.closest('[data-roll]');
        if (!ele) return;

        const useLegend = Object.hasOwn(this.document.system, 'legend');

        const roll = new NewedoRoll({
            legend: useLegend,
            title: 'NEWEDO.Generic.Trait.long',
            document: this.document,
            rollData: this.document.getRollData(),
            wounds: false,
        });

        roll.AddPart({
            type: ele.dataset?.rollLabel,
            label: ele.dataset?.rollLabel,
            value: ele.dataset.roll
        });

        const options = await roll.getRollOptions();
        if (options.cancelled) return;
        let r = await roll.evaluate();
        if (!r) return;

        let msg = r.toMessage({
            flavor: ele.dataset?.rollLabel || '',
            speaker: foundry.documents.ChatMessage.getSpeaker({
                scene: undefined,
                token: this.document.token,
                actor: this.document,
            })
        });
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
        let system = this.document.system;
        // Add in the derived traits
        let content = `<b>Derived Traits</b>`;
        content += `<div class="items-header flexrow"><div>Trait</div><div>Flat</div><div>Modifier</div></div>`;
        for (const [key, trait] of Object.entries(this.document.system.traits.derived)) {
            let field = new foundry.data.fields.NumberField();

            content += `<div class="form-group"><label>${utils.localize(NEWEDO.traitsDerived[key])}</label><div class="form-fields">`;
            content += this.document.system.schema.getField(`traits.derived.${key}.flat`).toInput({ value: trait.flat }).outerHTML;
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