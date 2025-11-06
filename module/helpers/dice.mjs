import NewedoDialog from "../applications/dialog.mjs";
import { NEWEDO } from "../config.mjs";
import LOGGER from "./logger.mjs";
import utils from "./sysUtil.mjs";

// Declare valid entries for different data types
const PART_TYPES = ['input', 'selector', 'stepper'];
const PART_ELEMENTS = ['input', 'selector', 'stepper'];

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
    actor = null;
    cancelled = false;
    document = null;// an owning actor if needed
    rollData = null;// Roll data to use
    parts = [];// pieces of the roll formula
    prompt = true;// if you should prompt the user or skip that step and just roll
    title = 'NEWEDO.Generic.Roll';// popup window title

    // Final values from this roll, usually all these details are specified after
    // the roll has been prompted and confirmed by the player
    options = {
        advantage: false,
        disadvantage: false,
        pieces: [],
        raise: 0,
    };

    useTrait = false;
    useWounds = false;
    useLegend = false;
    useRaises = false; // Not directly used, raises are parsed externally on a seperate basis later on
    useTraits = false;

    /**
     * 
     * @param {*} param0 
     */
    constructor({ document, actor, rollData = {}, prompt = true, legend = false, wounds = false, raise = false, title = 'NEWEDO.Generic.Roll' } = {},) {
        for (const key of Object.keys(arguments[0])) if (Object.hasOwn(this, key)) this[key] = arguments[0][key];

        // prepare implied data
        if (!this.actor && this.document?.documentName == `Item`) this.actor = this.document.actor;
        if (!this.actor && this.document?.documentName == `Actor`) this.actor = this.document;

        this.rollData = rollData;
        if (!this.rollData) this.rollData = this.document.getRollData() || this.actor.getRollData();

        this.useWounds = wounds;
        this.useLegend = legend;
        this.useRaises = raise;
    }

    /**
     * @typedef {Object} SelectData
     * @prop {String} label - label on the selector
     * @prop {?Number|String} value - input fill value
     * @prop {Boolean} default - FALSE, if this is the value to start with, when not set uses firs entry, if multiple set, uses first in array
     */

    /**
     * @typedef {Object} RollPart
     * @prop {String|Array<String>} label - localizeable string or array of them to appear on the roll popup
     * @prop {String} group - The roll grouping to place this part in
     * @prop {String|Array<String>} tags - Additional tags to identify what this roll does for effects
     * @prop {String|Number} value - Inputs value field and must be valid roll format
     * @prop {String} element - Type of element to create on the roll popup [input, selector, stepper]
     * @prop {Number} sort - Value used to sort the list of parts on display, happens inside groups BIGGER = LOWER
     * @prop {Boolean} active - Whether this will actually be used in the roll
     * @prop {SelectData[]} select_options - Whether this will actually be used in the roll
     * @prop {Object} step_options - Whether this will actually be used in the roll
     * @prop {Number} step_options.size - Whether this will actually be used in the roll
     * @prop {String} id - random id value which can be used to identify specific parts, mostly here for debugging 
     */

    /**
     * @returns {RollPart}
     */
    static getPartSchema() {
        return {
            label: 'MISSING_LABEL',
            group: '',// groupings for the roll to make things cleaner
            tags: [],// special roll tags to specify
            value: 0,// default value of the given input
            element: 'input',
            sort: 0,//
            active: true,// is this value turned on by default
            select_options: [], // list of available options for the selector
            step_options: {
                size: 1
            },
            id: foundry.utils.randomID()
        }
    }

    //=================================================================================================================
    //> Roll part methods
    //=================================================================================================================
    /** 
     * @param {RollPart|RollPart[]} parts 
     * @example
     * AddPart({
     *  label:"Strength", 
     *  value:"1d20+5"
     * })
     */
    AddPart(parts) { // Function for assigning data parts, means I dont have to worry about breaking templates again
        if (!Array.isArray(parts)) parts = [parts];
        for (const p of parts) {
            const part = Object.assign(this.constructor.getPartSchema(), p);

            if (part.element && !PART_ELEMENTS.includes(part.element)) throw new Error(`Recieved invalid part element: ${part.element}`);
            if (part.element == 'input') {
                if (part.value === undefined) throw new Error('Input parts need a value ' + part.value);
                if (typeof part.value !== 'string') part.value = `${part.value}`;
                part.value = part.value.replaceAll(/\s+/gm, '');// cleans up spaces in the formula, removing gaps between values
                part.value = part.value.replaceAll(/[\+\-\*\/]?(0+d[\d]+|[\d]+d[0]+)/gm, ''); // Removes useless values, 0d10, 10d0
                if (part.value == '' || part.value == '0') continue; // part ended up empty and will be skipped
            }

            this.parts.push(part);
        }
    }

    AddWounds(actor) {
        if ((!actor || actor?.documentName !== 'Actor') && !this.actor) throw new Error('Cant add wounds to roll without an actor');
        if (actor) this.actor = actor;
        this.AddPart({
            label: this.actor.system.wound.label,
            value: this.actor.system.wound.value | 0,
            tags: ['wound']
        })
    }

    AddLegend(actor) {
        // ensure we have the actor tied in
        if ((!actor || actor?.documentName !== 'Actor') && !this.actor) throw new Error('Cant add legend to roll without an actor');
        if (actor) this.actor = actor;
        // Verify the actor has legend to use
        if (!Object.hasOwn(this.actor.system, 'legend')) throw new Error("Actor doesn't have legend to use");

        this.AddPart({
            label: NEWEDO.generic.legend,
            value: '0',
            tags: ['legend'],
            element: 'stepper',
        })
    }

    AddRaise(value = 0) {
        this.AddPart({
            label: NEWEDO.generic.raise,
            value: value,
            tags: ['raise'],
            element: 'stepper',
        })
    }

    /**
     * Adds a special field for controlling trait dice, requires the traits be provided in object format
     * @argument {String} key - the default trait to use
     * @argument {Object} traits - provided trait data
     * @argument {Object} options
     */
    AddTrait(key = 'hrt', config = {}) {
        // if the traits wern't provided, gather them from the available rolldata
        if (!config.traits) {
            // default values into empty
            config.traits = {};

            // Try and get values from the roll data 
            if (Object.hasOwn(this.rollData, 'traits') && Object.hasOwn(this.rollData.traits, 'core')) {
                config.traits = { ...this.rollData.traits.core }
            } else {
                for (const k of Object.keys(NEWEDO.traitsCore)) {
                    config.traits[k] = { rank: 0 };
                    if (Object.hasOwn(this.rollData, k)) config.traits[k] = this.rollData[k];
                }
            }
        }

        if (Object.keys(config.traits).length <= 0) throw new Error('Failed to add traits to roll');

        // if we succesfulyl found and made our trait data, we can now convert it to the options list and add the part
        const options = [];
        let value = `${config.traits[key].rank}d10`;
        for (const trait of Object.keys(config.traits)) {
            options.push({
                label: NEWEDO.traits[trait],
                value: `${config.traits[trait].rank}d10`,
                default: key == trait,
            })
        }

        this.AddPart({
            ...config,
            label: NEWEDO.generic.trait,
            element: 'selector',
            value: value,
            select_options: options,
            tags: ['trait'],
        })
    }

    //=================================================================================================================
    //> Popup button controls
    //=================================================================================================================


    static template = 'systems/newedo/templates/dialog/roll-v2.hbs';

    async getRollOptions() {
        // prepare contexual parts
        if (this.parts.length == 0) {
            utils.warn("NEWEDO.warn.NoDiceToRoll");
            this.cancelled = true;
            return { cancelled: true };
        }

        if (this.useWounds) this.AddWounds();
        if (this.useLegend) this.AddLegend();
        if (this.useRaises) this.AddRaise();

        // if there is no roll data attached, but we have an option to get it
        if (this.document != null && !this.rollData) this.rollData = this.document?.getRollData() || {};

        const groups = [];
        for (const part of this.parts) if (!groups.includes(part.group) && part.group) groups.push(part.group);

        const title = utils.localize(NEWEDO.generic.roll) + ": " + utils.localize(this.title);
        const sorted_parts = this.parts.sort((a, b) => { return a.sort - b.sort })
        const render = await foundry.applications.handlebars.renderTemplate(this.constructor.template, {
            ...this.rollData,
            groups: groups,
            parts: sorted_parts
        });

        //==========================================================================================
        //>- Creates Roll dialog, returning a promise
        //==========================================================================================
        return new Promise(async (resolve, reject) => {
            const app = await new NewedoDialog({
                window: { title: title },
                classes: ['newedo'],
                position: {
                    width: 500
                },
                content: render,
                buttons: [{
                    label: "Advantage",
                    action: 'advantage',
                }, {
                    label: "Normal",
                    action: 'normal',
                }, {
                    label: "Disadvantage",
                    action: 'disadvantage',
                },],
                close: () => {
                    this.cancelled = true;
                    resolve({ cancelled: true })
                },
                submit: (result) => {
                    //===================================================================
                    //>-- Roll submission handler
                    //===================================================================

                    // Gets all the pieces of the formula
                    const formulaParts = app.element.querySelectorAll(".edo-formula-group");
                    this.options.pieces = [];
                    this.options.raise = 0;

                    // Loops through the submitted form to gather the parts of the roll
                    for (const element of formulaParts) {
                        const input = element.querySelector('[name=value]');
                        const formula = input.value;
                        const active = element.querySelector('[name=active]');
                        const tags = element.dataset.tags?.split('|');

                        // Raises are special depending on how their used
                        // Usually they repersent either additional difficulty to a roll
                        // for a future benefit to the next one, specifically they're used
                        // like this for attack + damage rolls
                        // but similar behaviour can be observed in casting where you
                        // can take a stacking penalty to increase the effects of the rote
                        // in either case, this value is simply stored with the roll
                        // for future use
                        if (element.dataset.formulaType == 'raise' && +input.value > 0) {
                            this.options.raise = +input.value;
                            continue;
                        }

                        // Handles the spending of legend
                        if (tags.includes('legend') && this.actor && +input.value > 0) {
                            // special handling for the legend option since it spends a resource
                            if (utils.spendLegend(this.actor, utils.parseElementValue(input))) {
                                // spent legend properly
                                this.options.pieces.push({
                                    value: input.value,
                                    active: true,
                                })
                            } else throw new Error('Actor doesnt have enough legend for this roll');
                        }

                        // Catch any other roll parts to be added
                        if (Roll.validate(formula) && +input.value != 0) {
                            this.options.pieces.push({
                                value: input.value,
                                active: active?.checked ?? true
                            })
                        } else if (!Roll.validate(formula) && active) throw new Error(`Invalid formula piece: ${formula}`);

                    }

                    this.options.advantage = result == 'advantage';
                    this.options.disadvantage = result == 'disadvantage';
                    this._ready = true;
                    resolve(result);
                }
            }).render(true);

            // Hook up stepper elements in the roll dialog
            let clickers = app.element.querySelectorAll('.clicker');
            for (const c of clickers) {
                const btn_i = c.querySelector('button[name=increase]');
                const btn_d = c.querySelector('button[name=decrease]');
                const val = c.querySelector('input[name=value]');

                btn_i.addEventListener('click', () => val.value = +val.value + 1);
                btn_d.addEventListener('click', () => val.value = +val.value - 1);
            };

            // Set up selector elements
            const selectors = app.element.querySelectorAll('[data-part=selector]');
            for (const selector of selectors) {
                const option = selector.querySelector('select');
                const input = selector.querySelector('input[name=value]');
                option.addEventListener('change', () => { input.value = option.value });
            }
        });
    }

    // Pointer to the evaluate function, maintains parity with foundry rolls
    async roll() {
        return this.evaluate();
    }

    /**
     * Creates and rolls the values gotten here
     */
    async evaluate() {
        if (this.cancelled) return null;
        if (!this._ready && this.prompt) await this.getRollOptions();
        else if (!this._ready) {
            // assemble the roll without prompting the user
            for (const part of this.parts) {
                if (part.value == 0 || part.value == '' || part.value == '0') continue;
                this.options.pieces.push({
                    value: part.value,
                    active: part.active
                })
            }
        }

        if (this.cancelled) return null;


        // Handle the advantage / disadvantage roll first and foremost
        const adv = this.options.advantage;
        const dis = this.options.disadvantage;
        let formula = '';

        // Adds all the formula parts
        for (const part of this.options.pieces) {
            // if the formula has a piece in it already, add an operator to join them
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
                // if there were no d10's to drop, oops we gotta drop the next highest dice and that sucks, and probably wont ever happen so we leave it blank until its a problem t('l't )
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