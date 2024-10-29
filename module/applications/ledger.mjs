import NewedoApplication from "./base-application.mjs";
import LOGGER from "../helpers/logger.mjs"
import sysUtils from "../helpers/sysUtil.mjs"

export default class NewedoLedger extends NewedoApplication {

    // The character responsible for this ledger
    document = null;
    ledger = {};
    key = null;
    label = null;

    sorting = {
        priority: 'id',
        reverse: false
    }

    /**
     * 
     * @param {*} document the owning document
     * @param {Object} transactions the list with all previous transactions
     * @param {String} key the path pointing to this ledgers location on the document, neccessary to update the server
     * @returns 
     */
    constructor(document, ledger) {
        super();
        if (!document) {
            sysUtils.error('Cannot open ledger without a linked document')
            return {};
        }

        LOGGER.log('creating ledger:', ledger);

        this.document = document;
        this.ledger = ledger;
    }

    static DEFAULT_OPTIONS = {
        id: 'ledger-{id}',
        tag: 'form',
        classes: ['ledger', 'newedo'],
        window: {
            frame: true,
            positioned: true,
            title: "Ledger: {actor}'s {currency}",
            icon: "fa-solid fa-coin",
            minimizable: false,
            resizeable: true
        },
        form: {
            submitOnChange: false,
            closeOnSubmit: false,
        },
        position: {
            top: 300,
            left: 300,
            width: 650,
            height: 500,
            scale: 1.0
        },
        actions: {
            deleteIndex: this._onDeleteIndex,
            sortById: this._onSortById,
            sortByUser: this._onSortByUser,
            sortByValue: this._onSortByValue
        }
    }

    static PARTS = {
        form: { template: 'systems/newedo/templates/dialog/ledger.hbs' }
    }

    static TABS = {};

    tabGroups = {};

    /* Transaction format
    * {
        user: the player user who sumited
    *   id: transaction number
    *   date: when this happened
    *   operation: add, subtract, set
    *   value: the ammout to change by
    *   reason: text written by the user
    * }
    */
    _onRender(context, options) {

        let buttons = this.element.querySelectorAll('[data-operation]');

        for (const btn of buttons) {
            btn.addEventListener('click', async (event) => {

                let newRecord = {
                    user: game.user.name,
                    id: context.transactions.length + 1,
                    date: new Date().toLocaleDateString(),
                    operation: event.currentTarget.dataset.operation,
                    value: 1 * this.element.querySelector(`[name=value]`).value,
                    note: this.element.querySelector(`[name=note]`).value,
                }

                if (newRecord.value <= 0) return;

                // Modifies the ledger with the new data
                this.ledger.transactions.push(newRecord)

                // Push the updated ledger to the right flag
                LOGGER.log('Updating document flag')
                await this.document.setFlag('newedo', 'ledger', {
                    [this.ledger.id]: this.ledger
                });
                // update the local and database actors targeted value to the new sum
                LOGGER.log('Updating parent document');
                await this.document.update({ [this.ledger.target]: this.sum });
                // renders the sheet on screen to match new input
                this.render(true);
                this.document.render(false);

            })
        }

        this.element.querySelector('[name=value]').addEventListener('input', (event) => {
            let ele = event.currentTarget;
            if (ele.value == '') return;
            let v = Math.abs(Math.round(Number(ele.value)));
            ele.value = v;
        })
    }

    static async _onDeleteIndex(event, target) {
        const index = 1 * target.closest('[data-index]').dataset.index - 1;
        LOGGER.debug('Removing index', index);
        this.ledger.transactions.splice(index, 1);

        this.document.setFlag('newedo', 'ledger', {
            [this.ledger.id]: this.ledger
        });

        LOGGER.log('Updating parent document');
        this.document.update({ [this.ledger.target]: this.sum }).then(() => {
            // renders the sheet on screen to match new input
            this.render(true);
        });
    }

    static async _onSortByValue() {
        this.sorting.priority = 'value';
        this.render(true);
    }

    static async _onSortByUser() {
        this.sorting.priority = 'user';
        this.render(true);
    }

    static async _onSortById() {
        this.sorting.priority = 'id';
        this.render(true);
    }

    async _prepareContext() {
        LOGGER.log('ledger context', this);
        const context = await super._prepareContext();
        context.app = this;
        context.id = this.id;
        context.document = this.document;
        context.ledger = this.ledger;
        context.label = this.ledger.label;

        context.transactions = this.ledger.transactions.toReversed();
        if (this.sorting.priority == 'id') {
            context.transactions = this.ledger.transactions.toSorted((a, b) => {
                return b.id - a.id; // use the reverse, we want to default to showing highest to lowest
            })
        } else if (this.sorting.priority == 'user') {
            context.transactions = this.ledger.transactions.toSorted((a, b) => {
                if (a.user == b.user) {
                    return b.id - a.id;
                }

                if (a.user > b.user) return 1;
                if (b.user > a.user) return -1;
            })
        } else if (this.sorting.priority == 'value') {
            context.transactions = this.ledger.transactions.toSorted((a, b) => {
                return a - b;
            })
        }

        // Calculates the current sum based off of the transaction history
        context.sum = this.sum;

        return context
    }

    /**
     * Revaluates the
     */
    get sum() {
        let s = 0;
        let a = 1;
        for (const t of this.ledger.transactions) {
            t.id = a;
            a++;
            switch (t.operation) {
                case '+':
                    s += t.value;
                    break;
                case '-':
                    s -= t.value;
                    break;
                case '=':
                    s = t.value;
                    break;
                default:
                    LOGGER.error('Invalid operation found in ledger. Omitting from results', t.operation);
                    break;
            }
        }

        return s;
    }
}