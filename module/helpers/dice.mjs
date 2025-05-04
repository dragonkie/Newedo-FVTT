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

    useWounds = false;
    useLegend = false;
    useRaises = false; // Not directly used, raises are parsed externally on a seperate basis later on

    /**Accepts an optional list of dice objects to pre populate the tray */
    constructor(data) {
        console.log(data)

        for (const [k, v] of Object.entries(data)) if (Object.hasOwn(this, k)) this[k] = v;

        // prepare implied data
        if (!this.actor && data.document?.documentName == `Item`) this.actor = data.document.actor;
        if (!this.actor && data.document?.documentName == `Actor`) this.actor = data.document;

        if (!this.rollData) this.rollData = this.document.getRollData() || this.actor.getRollData();

        this.useWounds = data.wound;
        this.useLegend = data.legend;
        this.useRaises = data.raise;
    }

    /**
     * @typedef {Object} RollPart
     * @prop {String|Array<String>} label - localizeable string or array of them to appear on the roll popup
     * @prop {String} group - The roll grouping to place this part in
     * @prop {String|Number} value - Inputs value field and must be valid roll format
     * @prop {String|Array<String>} type - Additional tags to identify what this roll does for effects
     * @prop {Boolean} active - Whether this will actually be used in the roll
     * @prop {Boolean} stepper - Is this a stepper value?
     */

    /**
     * 
     * @returns {RollPart}
     */
    static getPartSchema() {
        return {
            group: '',
            type: 'formula',
            label: 'MISSING_LABEL',
            value: 0,
            active: true,
            stepper: false
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
    AddPart(parts) { // Function for assigning data parts, means I dont have to worry about fucking up templates again
        console.log('adding parts', parts)
        if (!Array.isArray(parts)) parts = [parts];
        for (const i of parts) {
            if (!i.value) continue;
            if (typeof i.value !== 'string') i.value = `${i.value}`;
            i.value = i.value.replaceAll(/\s/gm, '');
            i.value = i.value.replaceAll(/[\+\-\*\/]?0+d[\d]+/gm, '');
            if (i.value == '' || (i.value == '0' && !i.stepper)) continue;
            this.parts.push(Object.assign(this.constructor.getPartSchema(), i))
        }
    }

    AddWounds(actor) {
        console.log('Adding wounds')
        if ((!actor || actor?.documentName !== 'Actor') && !this.actor) throw new Error('Cant add wounds to roll without an actor');
        if (actor) this.actor = actor;
        this.AddPart({
            label: this.actor.system.wound.label,
            value: this.actor.system.wound.value,
            type: 'wound'
        })
    }

    AddLegend(actor) {
        console.log('Adding legend', this)
        console.log(!actor && !this.actor)
        if ((!actor || actor?.documentName !== 'Actor') && !this.actor) throw new Error('Cant add legend to roll without an actor');
        if (actor) this.actor = actor;
        this.AddPart({
            label: NEWEDO.generic.legend,
            value: '0',
            type: 'legend',
            stepper: true,
        })
    }

    AddRaise() {
        console.log('Adding raises')
        this.AddPart({
            label: NEWEDO.generic.raise,
            value: '0',
            type: 'raise',
            stepper: true,
        })
    }

    //=================================================================================================================
    //> Popup button controls
    //=================================================================================================================


    static template = 'systems/newedo/templates/dialog/roll-v2.hbs';

    async getRollOptions() {
        console.log(this.parts)
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
        for (const part of this.parts) if (!groups.includes(part.group) && part.group != '' && part.group) groups.push(part.group);

        const title = utils.localize(NEWEDO.generic.roll) + ": " + utils.localize(this.title);
        const render = await foundry.applications.handlebars.renderTemplate(this.constructor.template, {
            ...this.rollData,
            groups: groups,
            parts: utils.duplicate(this.parts)
        });

        //==========================================================================================
        //> Creates Roll dialog, returning a promise
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
                close: () => resolve({ cancelled: true }),
                submit: (result) => {
                    //===================================================================
                    //> Roll submission handler
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
                        if (element.dataset.formulaType == 'legend' && this.actor && +input.value > 0) {
                            console.log('spending legend');
                            // special handling for the legend option since it spends a resource
                            if (utils.spendLegend(this.actor, utils.parseElementValue(input))) {
                                // spent legend properly
                                this.options.pieces.push({
                                    value: input.value,
                                    active: true,
                                })
                            } else reject('Actor doesnt have enough legend for this roll');
                        }

                        // Catch any other roll parts to be added
                        if (Roll.validate(formula) && active && +input.value != 0) {
                            this.options.pieces.push({
                                value: input.value,
                                active: active.checked || true
                            })
                        } else if (!Roll.validate(formula) && active) reject(`Invalid formula piece: ${formula}`);

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
                let btn_i = c.querySelector('button[name=increase]');
                let btn_d = c.querySelector('button[name=decrease]');
                let val = c.querySelector('input[name=value]');

                btn_i.addEventListener('click', () => val.value = +val.value + 1);
                btn_d.addEventListener('click', () => val.value = +val.value - 1);
            };
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