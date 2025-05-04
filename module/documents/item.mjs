import LOGGER from "../helpers/logger.mjs";
import utils from "../helpers/sysUtil.mjs";


/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export default class NewedoItem extends Item {


    //==========================================================================================
    //> Data Preparation
    //==========================================================================================
    prepareData() {
        // As with the actor class, items are documents that can have their data
        // preparation methods overridden (such as prepareBaseData()).

        //this function is used to ensure all the item data is properly managed, this 
        //includes making any calculations on creation, update, or when loading the server
        //Any items owned by a character will run this function when the server loads
        //when migrating system data, its possible to use prepareData to help manage and correct values alongside the actual migrateData function
        super.prepareData();
    }

    prepareBaseData() {
        super.prepareBaseData();
    }

    prepareDerivedData() {
        super.prepareDerivedData();
    }

    prepareOwnerData(data) {
        this.system.prepareOwnerData(data);
    }

    async deleteDialog(options = {}) {
        const type = utils.localize(this.constructor.metadata.label);
        let confirm = await foundry.applications.api.DialogV2.confirm({
            title: `${game.i18n.format("DOCUMENT.Delete", { type })}: ${this.name}`,
            content: `<h4>${game.i18n.localize("AreYouSure")}</h4><p>${game.i18n.format("SIDEBAR.DeleteWarning", { type })}</p>`,
            options: options
        });

        if (confirm) {
            this.delete();
            return true;
        } else return false;
    }

    /**
     * Prepare a data object which is passed to any Roll formulas which are related to this Item
     * @private
     */
    getRollData() {
        LOGGER.debug('Document | Item | getRollData');
        const data = this.system.getRollData();

        return data;
    }
}
