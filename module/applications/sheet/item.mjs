import LOGGER from "../../helpers/logger.mjs";

import NewedoSheetMixin from "./mixin.mjs";

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export default class NewedoItemSheet extends NewedoSheetMixin(foundry.applications.sheets.ItemSheetV2) {
    /** @override */
    static DEFAULT_OPTIONS = {
        classes: ['item'],
        position: { height: 360, width: 550, top: 100, left: 200 },
    }

    static get PARTS() {
        return {
            header: { template: "systems/newedo/templates/item/header.hbs" },
            tabs: { template: "systems/newedo/templates/shared/tabs-nav.hbs" },
            body: { template: "systems/newedo/templates/item/body.hbs" },
            rules: { template: "systems/newedo/templates/item/rules.hbs" },
            description: { template: "systems/newedo/templates/item/description.hbs" },
            settings: { template: "systems/newedo/templates/item/settings.hbs" }
        }
    }

    static TABS = {
        description: { id: "description", group: "primary", label: "NEWEDO.tab.description" },
        settings: { id: "settings", group: "primary", label: "NEWEDO.tab.settings" },
        rules: { id: "rules", group: "primary", label: "NEWEDO.tab.rules" }
    }

    tabGroups = {
        primary: "description"
    }

    async _onDrop(event) {
        await super._onDrop(event);
        const data = JSON.parse(event.dataTransfer.getData(`text/plain`));
        const item = this.item;
        if (typeof item._onDrop === `function`) item._onDrop(data);
    }

    /** @override */
    get template() {
        const path = `systems/${game.system.id}/templates/item`;
        return `${path}/item-${this.item.type}-sheet.hbs`;
    }

    /* -------------------------------------------- */

    /**
     * @override 
     * Passes the context data used to render the HTML template
    */
    async _prepareContext(partId, content) {
        LOGGER.debug('preparing item sheet context')
        const context = await super._prepareContext(partId, content);

        context.settings = await foundry.applications.handlebars.renderTemplate(`systems/newedo/templates/item/settings/${this.document.type}.hbs`, context);

        const enrichmentOptions = {
            rollData: context.rollData
        };

        context.description = {
            field: this.document.system.schema.getField('description'),
            value: this.document.system.description,
            enriched: await foundry.applications.ux.TextEditor.enrichHTML(context.system.description, enrichmentOptions),
        }

        return context;
    }
}