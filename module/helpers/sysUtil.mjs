import { NEWEDO } from "../config.mjs";
import LOGGER from "./logger.mjs";

export default class utils {

    /**
  * Localize a string using internationalization.
  * 
  * this format calls the game.i18n.localize(), but is more convinient and easier to understand
  * @param {String} txt - The string to localized
  * @returns {String} The localized string
  */
    static localize(txt) { return game.i18n.localize(txt) ?? txt }

    static async getCompendium(name) {
        return await game.packs.get(name);
    }

    static async getPackDocs(name) {
        try {
            return await game.packs.get(name).getDocuments();
        } catch (err) {
            console.error('Missing compendium package', err);
            return undefined;
        }
    }

    static async getCoreCharDocs() {
        const documents = [];
        const skills = await this.getSkillDocuments();
        const fates = await this.getCoreFates();
        return documents.concat(skills, fates);
    }

    static async getSkillDocuments() {
        const skills = [];
        // Get world level skills
        for (const item of game.items.contents) if (item.type == 'skill') skills.push(item);

        // Get compendium skills
        for (const pack of game.packs.contents) {
            const items = await pack.getDocuments();
            for (const item of items) if (item.type == 'skill') skills.push(item);
        }

        return skills;
    }

    static async getCoreFates() {
        return await this.getPackDocs(`newedo.internal-fates`);
    }

    static backgroundRank(value) {
        if (value >= 91) return 5;
        else if (value >= 66) return 4;
        else if (value >= 31) return 3;
        else if (value >= 11) return 2;
        // A background cannot drop below one
        return 1;
    }

    static legendRank(value) {
        if (value > 160) return 5;
        if (value > 110) return 4;
        if (value > 75) return 3;
        if (value > 45) return 2;
        return 1;
    }

    static woundState(value) {
        let label = NEWEDO.woundStatus.healthy;
        let penalty = 0;

        if (value <= 0.0) {
            label = NEWEDO.woundStatus.burning;
            penalty = -10;
        } else if (value <= 0.10) {
            label = NEWEDO.woundStatus.beaten;
            penalty = -7;
        } else if (value <= 0.25) {
            label = NEWEDO.woundStatus.bloody;
            penalty = -5;
        } else if (value <= 0.75) {
            label = NEWEDO.woundStatus.wounded;
            penalty = -3;
        } else if (value <= 0.90) {
            label = NEWEDO.woundStatus.grazed;
            penalty = -1;
        }

        return {
            label: this.localize(label),
            value: penalty
        }
    }

    static clamp(value, min, max) {
        return Math.max(Math.min(value, max), min);
    }

    static info(message, options) {
        ui.notifications.info(this.localize(message), options);
    }

    static warn(message, options) {
        ui.notifications.warn(this.localize(message), options);
    }

    static error(message, options) {
        ui.notifications.error(this.localize(message), options);
    }

    static formulaAdd(base, string) {
        if (base === ``) return string;
        if (string === ``) return base;
        return base + `+` + string;
    }

    /**
     * 
     * @param {*} actor 
     * @param {*} cost 
     * @returns {String} returns a string of the legend spent, or null if it couldnt be spent
     */
    static spendLegend(actor, cost) {
        if (cost > 0) {
            if (actor.system.legend.value >= cost) {
                // Has enough legend to spend
                actor.update({ 'system.legend.value': actor.system.legend.value - cost });
                return true;
            } else {
                // Doesnt have enough legend to spend, and returns null
                this.warn(`NEWEDO.warn.notEnoughLegend`);
            }
        }
        return false;//returns nothing if there was no legend spent
    }

    static parseDrop(event) {
        return JSON.parse(event.dataTransfer.getData(`text/plain`));
    }

    /**
     * creates a new data object holding the details of the form passed as an argument
     * @argument {FormData} form the element to query
     * @param {String} selectors string of selectors to use
     * @returns 
     */
    static getFormData(form, selectors) {
        const matches = form.querySelectorAll(selectors);
        const data = {};
        for (const element of matches) {
            // Parse the input data based on type
            data[element.name] = this.parseElementValue(element);
        }

        return data;
    }

    static parseElementValue(element) {
        // Parse the input data based on type
        switch (element.type) {
            case 'number':// Converts a string to a number
            case 'range':
                return +element.value;
            case 'checkbox':// Returns boolean based on if the box is checked
                return element.checked;
            default:// Other values are taken in as strings
                return element.value;
        }
    }

    static duplicate(original) {
        return JSON.parse(JSON.stringify(original));
    }

    /**
     * Creates a roll dialog prompt with the the advantage / disadvantage roll buttons
     * @param {*} data Relevant roll data to whats being rendered
     * @param {*} template  Path to the .html or .hbs file to load in, defaults to a standard roll setup for ease of use
     * @returns 
     */
    static async getRollOptions(data, template = `systems/newedo/templates/dialog/roll-default.hbs`) {
        LOGGER.log('Got roll options data', data);
        const title = data.title ? data.title : NEWEDO.generic.roll;
        const render = await foundry.applications.handlebars.renderTemplate(template, data);

        /**
         * Small internal function to handel the data form we recieve
         * @param {*} html 
         * @param {*} method 
         * @returns 
         */
        const handler = (html, method) => {
            const f = this.getFormData(html, "[name]");
            const d = { advantage: false, disadvantage: false, ...f };// spreads the form data across this new object

            // sets hte advantage / disadvantage of the roll options
            if (method == 'advantage') d.advantage = true;
            if (method == 'disadvantage') d.disadvantage = true;

            // Ensures the number text in the bonus field is valid for the roll
            if (d.bonus && d.bonus != "" && !Roll.validate(d.bonus)) {
                this.warn("NEWEDO.warn.invalidBonus");
                d.cancelled = true; // Flags that this roll should be discarded
            }

            return d;
        }

        // the promise constructor provides the resolve and reject functions
        // You can call the resolve or reject function to return the promise with the value provided to the resolve / reject
        return new Promise((resolve, reject) => {
            const options = {
                window: { title: title },
                content: render,
                buttons: [{
                    label: "Disadvantage",
                    action: 'disadvantage',
                    callback: (event, button, dialog) => resolve(handler(dialog, "disadvantage"))
                }, {
                    label: "Normal",
                    action: 'normal',
                    callback: (event, button, dialog) => resolve(handler(dialog, "normal"))
                }, {
                    label: "Advantage",
                    action: 'advantage',
                    callback: (event, button, dialog) => resolve(handler(dialog, "advantage"))
                }],
                close: () => resolve({ cancelled: true }),
                submit: (result) => resolve(result)
            }
            LOGGER.debug('dialog opts', options)
            new foundry.applications.api.DialogV2(options).render(true);
        });
    }

    static rayCollision(a, b) {
        const A = canvas.tokens.placeables.find(t => t.name === a);
        const B = canvas.tokens.placeables.find(t => t.name === b);

        const ray = new Ray({ x: A.x, y: A.y }, { x: B.x, y: B.y });
        const collisions = WallsLayer.getWallCollisionsForRay(ray, canvas.walls.blockVision);
        return collisions.length > 0;
    }

    static deepClone(original, { strict = false, _d = 0 } = {}) {
        return foundry.utils.deepClone();
    }

    /**
     * Unit testing to ensure the system is functioning before release
     */
    static async packageCompatabilityTest() {
        try {
            console.log('BEGINING UNIT TEST');
            console.log('TESTING DOCUMENT TYPE CREATION');
            // test the document types
            let actorTypes = game.documentTypes.Actor;
            let itemTypes = game.documentTypes.Item;

            let cleanupIndex = [];

            for (const a of actorTypes) {
                if (a == 'base') continue;
                let t = await Actor.create({
                    type: a,
                    name: `Testing ${a}`
                });

                cleanupIndex.push(t);
            }

            for (const i of itemTypes) {
                if (i == 'base') continue;
                let t = await Item.create({
                    type: i,
                    name: `Testing ${i}`
                });

                cleanupIndex.push(t);
            }
            console.log('REMOVING TEST DOCUMENTS');
            for (const i of cleanupIndex) i.delete();

            // test compendium pack data
            console.log('VALIDATING COMPENDIUM REFERENCES');
            if (this.getCoreFates() == undefined) throw new Error('No reference to core fates compendium');
            if (this.getSkillDocuments() == undefined) throw new Error('No reference to core skills compendium');
            if (this.getCoreCharDocs() == undefined) throw new Error('Missing reference to core character documents');
        }
        catch (err) {
            console.error(err);
        }
        console.log('ALL SYSTEMS READY TO GO!!!');
    }
}