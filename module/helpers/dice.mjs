import NewedoDialog from "../applications/dialog.mjs";
import { NEWEDO } from "../config.mjs";
import LOGGER from "./logger.mjs";
import utils from "./sysUtil.mjs";


/**
 * Expanded roll option for use with the vast number of dice used in newedo
 * This is mostly for ease of use adding and removing dice from the roll
 * allows the formula given in chat to be condensed down into easy to read
 * formats despite containg potentially 10+ different dice and multiple modifier
 * sources
 */
export default class NewedoRoll {

    _ready = false;
    _roll = null;
    document = null;// an owning actor if needed
    actor = null;
    cancelled = false;
    rollData = null;// Roll data to use
    legend = true; // can you spend legend on this (Requires actor)
    wounds = true;
    options = {
        advantage: false,
        disadvantage: false,
        pieces: [],
        raise: 0,
    };// filled out when gathering roll data from the user
    parts = [];// pieces of the roll formula
    prompt = true;// if you should prompt the user or skip that step and just roll
    raise = false;// can you call raises
    title = 'NEWEDO.Generic.Roll';// popup window title

    /**Accepts an optional list of dice objects to pre populate the tray */
    constructor(_data) {
        for (const [k, v] of Object.entries(_data)) {
            if (Object.hasOwn(this, k)) this[k] = v;
        }
        console.log('Roll constructor data', _data)
        console.log('Roll object format', JSON.parse(JSON.stringify(this)));

        // prepare implied data
        if (this.document?.documentName === `Actor`) this.actor = this.document;
    }

    /**
     * @typedef {Object} RollPart
     * @property {String|Array<String>} label - localizeable string or array of them to appear on the roll popup
     * @property {String} group - The roll grouping to place this part in
     * @property {String|Number} value - Inputs value field and must be valid roll format
     * @property {String|Array<String>} type - Additional tags to identify what this roll does for effects
     * @property {Boolean} active - Whether this will actually be used in the roll
     */

    /**
     * 
     * @returns {RollPart}
     */
    static getPartSchema() {
        return {
            group: '',
            type: '',
            label: 'MISSING_LABEL',
            value: 0,
            active: true,
        }
    }

    /** 
     * @param {RollPart|Array<RollPart>} parts 
     * @example
     * AddPart([{
     *  label:"Strength", 
     *  value:"1d20+5"
     * }, {
     *  label:"Enchantment", 
     *  value:"+1"
     * }])
     */
    AddPart(parts) { // Function for assigning data parts, means I dont have to worry about fucking up templates again
        if (!Array.isArray(parts)) parts = [parts];
        for (const i of parts) {
            if (typeof i.value !== 'string') i.value = `${i.value}`;
            i.value = i.value.replaceAll(/\s/gm, '');
            i.value = i.value.replaceAll(/[\+\-\*\/]?0+d[\d]+/gm, '');
            if (i.value == '' || i.value == '0') continue;
            this.parts.push(Object.assign(this.constructor.getPartSchema(), i))
        }
    }

    static template = 'systems/newedo/templates/dialog/roll-v2.hbs';

    async getRollOptions() {

        // prepare contexual parts
        if (this.parts.length == 0) {
            utils.warn("NEWEDO.warn.NoDiceToRoll");
            this.cancelled = true;
            return { cancelled: true };
        }

        if (this.document != null) {
            if (!this.rollData) this.rollData = this.document.getRollData();
        }

        if (this.wounds && this.rollData?.wound) {
            this.AddPart({
                label: NEWEDO.generic.wound + ':' + this.rollData.wound.label,
                value: this.rollData.wound.value,
                type: ''
            })
        }

        const title = utils.localize(NEWEDO.generic.roll) + ": " + utils.localize(this.title);
        const render = await foundry.applications.handlebars.renderTemplate(this.constructor.template, this);

        /**
         * Small internal function to handel the data form we recieve
         * @param {*} html 
         * @param {*} method 
         * @returns 
         */
        const handler = (dialog, method) => {
            console.log(dialog)
            console.log(method)
            // Gets all the pieces of the formula
            const formulaParts = dialog.element.querySelectorAll("[data-formula]");
            this.options.pieces = [];
            this.options.raise = 0;
            // Get the data from the formula pieces
            for (let element of formulaParts) {
                let v = element.querySelector('[name=value]');
                let a = element.querySelector('[name=active]');

                // validates the user input to make sure the formula is valid, or aborts
                if (element.dataset['formula'] == 'extra') {
                    // Ensures the number text in the bonus field is valid for the roll
                    if (v.value != "" && !Roll.validate(v.value)) {
                        utils.warn("NEWEDO.warn.invalidBonus");
                        this.options.cancelled = true; // Flags that this roll should be discarded
                        return this.options;
                    } else {
                        this.options.pieces.push({
                            type: element.dataset['formula'],
                            value: v.value,
                            active: true,
                        });
                        continue;
                    }
                }

                // adds raise value if we used any
                if (element.dataset['formula'] == 'raise' && v.value > 0) this.options.raise = v.value;

                if (element.dataset['formula'] == 'legend' && this.actor && v.value != '0') {
                    // special handling for the legend option since it spends a resource
                    if (utils.spendLegend(this.actor, utils.parseElementValue(v))) {
                        // spent legend properly
                        this.options.pieces.push({
                            type: element.dataset['formula'],
                            value: v.value,
                            active: true,
                        })
                    } else {
                        // ran out of legend so abort, they should be alerted by the spend legend function already
                        this.options.cancelled = true;
                        return this.options;
                    }
                } else {
                    // Parses all common roll values
                    if (v && a && v.value != '' && v.value != '0') {
                        this.options.pieces.push({
                            type: element.dataset['formula'],
                            value: v.value,
                            active: a ? a.checked : true,
                        })
                    }
                }
            }
            this.options.advantage = method == 'adv' ? true : false;
            this.options.disadvantage = method == 'dis' ? true : false;
            this._ready = true;
            return this.options;
        }

        // the promise constructor provides the resolve and reject functions
        // You can call the resolve or reject function to return the promise with the value provided to the resolve / reject
        this.options = await new Promise((resolve, reject) => {
            const options = {
                window: { title: title },
                content: render,
                buttons: [{
                    label: "Disadvantage",
                    action: 'dis',
                    callback: (event, button, dialog) => resolve(handler(dialog, "dis"))
                }, {
                    label: "Normal",
                    action: 'norm',
                    callback: (event, button, dialog) => resolve(handler(dialog, "normal"))
                }, {
                    label: "Advantage",
                    action: 'adv',
                    callback: (event, button, dialog) => resolve(handler(dialog, "adv"))
                }],
                close: () => resolve({ cancelled: true }),
                submit: (result) => {
                    resolve(result)
                }
            }

            // Link up buttons if any and set up sheet
            const app = new NewedoDialog(options, null);
            app.render(true).then(() => {
                let el = app.element;
                let clickers = el.querySelectorAll('[name=clicker]');
                for (const c of clickers) {
                    let btn_i = c.querySelector('[name=increase]');
                    let btn_d = c.querySelector('[name=decrease]');
                    let val = c.querySelector('input[name=value]');

                    btn_i.addEventListener('click', () => val.value = +val.value + 1);
                    btn_d.addEventListener('click', () => val.value = +val.value - 1);
                }
            });
        });

        return this.options;
    }

    // Pointer to the evaluate function, maintains parity with foundry rolls
    async roll() {
        return this.evaluate();
    }

    /**
     * Creates and rolls the values gotten here
     */
    async evaluate() {
        if (!this._ready && this.prompt) await this.getRollOptions();
        if (this.options.cancelled) return null;

        // Handle the advantage / disadvantage roll first and foremost
        let adv = this.options.advantage;
        let dis = this.options.disadvantage;
        let formula = '';

        // Adds all the formula parts
        for (let part of this.options.pieces) {
            // if the formula has a piece in it already, add osmething to join them
            if (!part.active || part.value == 0 || part.value == '') continue; // Skips parts that were marked as inactive, or that are empty
            switch (Array.from(part)[0]) {
                case "/":
                case "+":
                case "*":
                case "*":
                    break;
                default:
                    formula += "+";
                    break;
            }

            formula += part.value;
        }

        // Cleans the formula, as well as removes exploding dice, and simplifying things
        formula = formula.replaceAll('d10x10', 'd10').replaceAll(' ', '');
        formula = formula.replace(/^[\+\*\/]/, '');
        formula = formula.replaceAll("+-", "-");

        // Adds the advantage / disadvantage bonus
        if (adv && !dis) {
            LOGGER.debug('Advantage checks');

            // Search for a positive d10 to add too
            let match = formula.match(/(?<![\-\*\/])[0-9]+d10/)[0];
            if (match) {
                let s = match.split("d");
                let n = +s[0];
                formula = formula.replace(match, `${n + 1}d10`);
            } else {
                // Just add the dice if there wern't any d10's already
                formula = "1d10+" + formula;
            }
        } else if (dis && !adv) {
            // Search for a positive d10 to lower 
            let term = formula.match(/\+?\d+d10(\w+)?/)[0];

            if (term) {
                let dice = term.match(/\dd10/)[0].split('d');
                let count = dice[0];

                if (count < 1) {
                    formula = formula.replace(term, ``);
                } else {
                    // Create modify the term to match what we need to create
                    let newTerm = term.replace(`${count}d10`, `${count - 1}d10`)
                    formula = formula.replace(term, newTerm);
                }
            } else {
                // if there were no d10's to drop, fucking oops we gotta drop the next highest dice and that sucks
            }
        }

        formula = formula.replaceAll('d10', 'd10x10');
        if (formula == "") return;

        this._roll = new Roll(formula, this.data);
        return this._roll.evaluate();
    }

    async rollToMessage() {
        await this.evaluate();
        return await this._roll.toMessage();;
    }

    async toMessage(data) {
        if (this._roll) return this._roll.toMessage(data);
        return null;
    }

    async render() {
        if (this._roll) return this._roll.render();
        return null;
    }

    get total() {
        if (this._roll) return this._roll.total;
        return null;
    }

    get result() {
        if (this._roll) return this._roll.result;
        return null;
    }

    get formula() {
        if (this._roll) return this._roll.formula;
        return null;
    }
};