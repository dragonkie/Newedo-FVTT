import LOGGER from "../helpers/logger.mjs";
import utils from "../helpers/sysUtil.mjs";
import sysUtil from "../helpers/sysUtil.mjs";

/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export default class NewedoActor extends foundry.documents.Actor {

    /**
     * @override
     * @async
     * @static
     */
    static async create(data, options) {
        const createData = data;
        const newActor = typeof data.system === `undefined`;

        if (newActor) {
            LOGGER.debug(`Creating new actor`)
            createData.items = [];
            const coreItems = await utils.getCoreCharDocs();
            if (coreItems) {
                coreItems.forEach((item) => {
                    let newItem = item.toObject();
                    newItem.flags = {
                        newedo: {
                            compendiumSource: item.uuid
                        }
                    }
                    createData.items.push(newItem);
                });
            } else {
                sysUtil
            }
        }

        const actor = await super.create(createData, options);
        return actor;
    }

    //==========================================================================================
    //> Data Preperation
    //==========================================================================================

    prepareData() {
        super.prepareData();
    }

    prepareBaseData() {
        super.prepareBaseData();
    }

    prepareEmbeddedDocuments() {
        super.prepareEmbeddedDocuments();
    }

    prepareDerivedData() {
        super.prepareDerivedData();
    }

    //==========================================================================================
    //> Document Updating
    //==========================================================================================

    _onUpdate(changed, options, userId) {
        //if (game.user.id != userId) return;
        return super._onUpdate(changed, options, userId);
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
     * @Override getRollData() that's supplied to rolls.
     */
    getRollData() {
        const data = this.system.getRollData();
        return data;
    }

    /**
     * 
     * @param {String} slug the identifying slug of the actor to retrieve 
     * @returns 
     */
    getSkill(slug) {
        for (let skill of this.itemTypes.skill) {
            if (skill.system.slug == slug) return skill;
        }
        return undefined;
    }

    /**
     * Shorthand for grabbing values from long paths quickly
     * @param {String} tag localize tag for the requested field
     * @returns {Object} safe clone of requested data
     */
    getTrait(tag) {
        switch (tag) {
            case 'pow':
            case 'ref':
            case 'hrt':
            case 'sav':
            case 'shi':
            case 'per':
            case 'pre':
                return utils.duplicate(this.system.traits.core[tag]);
            case 'init':
            case 'move':
            case 'def':
            case 'res':
                return utils.duplicate(this.system.traits.derived[tag]);
            case 'hp':
                return utils.duplicate(this.system.hp);
            case 'kin':
            case 'ele':
            case 'bio':
            case 'arc':
                return utils.duplicate(this.system.armour[tag]);
            default: return undefined;
        }
    }

    get traits() {
        return this.system.traits;
    }

    get woundPenalty() {
        return this.system.wound.value;
    }

    // Item getters, useable with handelbars for itterable arrays of items sorted by type
    get skills() {
        return this.itemTypes.skill;
    }

    get weapons() {
        return this.itemTypes.weapon;
    }
}