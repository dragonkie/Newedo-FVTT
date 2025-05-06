import NewedoItemSheet from "../item.mjs";

export default class ArmourSheet extends NewedoItemSheet {
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
        settings: { template: "systems/newedo/templates/item/settings/armour.hbs" }
    }

    async _prepareContext() {
        const context = await super._prepareContext();
        context.isEquipped = context.system.equipped;
        context.isRanged = context.system.ranged;
        return context;
    }
}