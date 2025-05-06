import NewedoItemSheet from "../item.mjs";
import utils from "../../../helpers/sysUtil.mjs";
import { NEWEDO } from "../../../config.mjs";
import NewedoDialog from "../../dialog.mjs";

export default class LineageSheet extends NewedoItemSheet {
    static DEFAULT_OPTIONS = {
        actions: {
            configSoaks: this._onConfigureSoaks,
            configTraits: this._onConfigureTraits,
            delete: this._onDelete,
            edit: this._onEdit
        }
    }

    static PARTS = {
        header: { template: "systems/newedo/templates/item/header.hbs" },
        tabs: { template: "systems/newedo/templates/shared/tabs-nav.hbs" },
        body: { template: "systems/newedo/templates/item/body.hbs" },
        rules: { template: "systems/newedo/templates/item/rules.hbs" },
        description: { template: "systems/newedo/templates/item/description.hbs" },
        settings: { template: "systems/newedo/templates/item/settings/lineage.hbs" }
    }

    static TABS = {
        description: { id: "description", group: "primary", label: "NEWEDO.tab.description" },
        settings: { id: "settings", group: "primary", label: "NEWEDO.tab.settings" },
        rules: { id: "rules", group: "primary", label: "NEWEDO.tab.rules" }
    }

    tabGroups = {
        primary: "description"
    }

    async _prepareContext() {
        const context = await super._prepareContext();

        for (const [key, trait] of Object.entries(context.system.traits.core)) {
            trait.label = utils.localize(NEWEDO.traits[key]);
        }

        for (const [key, trait] of Object.entries(context.system.traits.derived)) {
            trait.label = utils.localize(NEWEDO.traits[key]);
        }

        for (const item of context.system.items) {
            item.data = await fromUuid(item.uuid);
        }

        for (const item of context.system.cultures) {
            item.data = await fromUuid(item.uuid);
        }

        return context;
    }

    static async _onConfigureSoaks(event, target) {

    }

    static async _onConfigureTraits(event, target) {
        const system = this.document.system;
        // Add in the derived traits
        let content = '';
        for (const [key, trait] of Object.entries(system.traits.core)) {
            content += system.schema.getField(`traits.core.${key}.value`).toFormGroup({}, { value: trait.value }).outerHTML;
        }

        content += `<div class="items-header flexrow"><div>Trait</div><div>Flat</div><div>Modifier</div></div>`;
        for (const [key, trait] of Object.entries(system.traits.derived)) {
            content += `<div class="form-group"><label>${utils.localize(NEWEDO.traitsDerived[key])}</label><div class="form-fields">`;
            content += system.schema.getField(`traits.derived.${key}.value`).toInput({ value: trait.value }).outerHTML;
            content += system.schema.getField(`traits.derived.${key}.mod`).toInput({ value: trait.mod }).outerHTML;
            content += `</div></div>`;
        }

        const app = await new NewedoDialog({
            id: `${this.id}-dialog-config-traits`,
            content: content,
            window: {
                resizeable: false,
                minimizable: false,
                title: 'NEWEDO.Dialog.Traits'
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

    static async _onEdit(event, target) {
        let uuid = target.closest('[data-uuid]').dataset.uuid;
        let item = await fromUuid(uuid)
        item.sheet.render(true);
    }

    static async _onDelete(event, target) {

        let element_index = target.closest('[data-index]');
        let element_list = target.closest('[data-list]');

        if (!element_index || !element_list) return;

        let index = element_index.dataset.index;
        let key = 'system.' + element_list.dataset.list;
        let list = this.document.system[element_list.dataset.list];

        let copy = utils.duplicate(list);
        copy.splice(index, 1);
        await this.document.update({ [key]: copy });
        await this.render(true);
    }

    async _onDropItem(event, item) {
        if (item.type == 'culture') {
            // Cultures are unique and are kept seperate from other options
            // When added to a sheet, if the actor doesnt have a culture they will be prompted to select one

            let copy = utils.duplicate(this.document.system.cultures);
            copy.push({ uuid: item.uuid });
            this.document.update({ system: { cultures: copy } });
        } else {
            const blacklist = ['lineage', 'path'];
            if (blacklist.includes(item.type)) return;

            let copy = utils.duplicate(this.document.system.items);
            copy.push({ uuid: item.uuid });
            this.document.update({ system: { items: copy } });
        }

    }
}