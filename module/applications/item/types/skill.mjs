import LOGGER from "../../../helpers/logger.mjs";
import sysUtil from "../../../helpers/sysUtil.mjs";
import NewedoItemSheet from "../item-sheet.mjs";

export default class SkillSheet extends NewedoItemSheet {
    static DEFAULT_OPTIONS = {
        actions: {
            changeSkillRank: this._onChangeSkillRank
        }
    }

    static PARTS = {
        header: { template: "systems/newedo/templates/item/header.hbs" },
        tabs: { template: "systems/newedo/templates/shared/tabs-nav.hbs" },
        body: { template: "systems/newedo/templates/item/body.hbs" },
        rules: { template: "systems/newedo/templates/item/rules.hbs" },
        description: { template: "systems/newedo/templates/item/description.hbs" },
        settings: { template: "systems/newedo/templates/item/settings/skill.hbs" }
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
        context.isEquipped = context.system.equipped;
        context.isRanged = context.system.ranged;
        return context;
    }

    /*--------------------------------------------*/
    /*                                            */
    /*                ACTIONS                     */
    /*                                            */
    /*--------------------------------------------*/
    static _onChangeSkillRank(event, target) {
        if (event.shiftKey) this.document.system._cycleSkillDice(target.dataset.index, true);
        else this.document.system._cycleSkillDice(target.dataset.index);
    }
}