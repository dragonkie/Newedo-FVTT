import LOGGER from "./logger.mjs";

export function registerTemplates() {
    LOGGER.log(`Registering handelbars templates`);
    const id = game.system.id;
    const path = `systems/${id}/templates`;
    const partials = [
        // Components
        `${path}/shared/resource-bar-inline.hbs`,
        `${path}/shared/resource-bar.hbs`,

        // Sheet Partials
        `${path}/shared/tabs-nav.hbs`,
        `${path}/shared/tabs-content.hbs`,

        // Actor Partials
        `${path}/actor/shared/armour-soaks.hbs`,
        `${path}/actor/shared/backgrounds.hbs`,
        `${path}/actor/shared/traits-attributes.hbs`,
        `${path}/actor/shared/traits-core.hbs`,
        `${path}/actor/shared/traits-derived.hbs`,

        // Dialog popups
        `${path}/dialog/parts/roll-options.hbs`,
    ];

    const paths = {};
    for (const path of partials) {
        paths[path.replace(".hbs", ".html")] = path;
        paths[`${id}.${path.split("/").pop().replace(".hbs", "")}`] = path;
    }

    return foundry.applications.handlebars.loadTemplates(paths);
};

//==============================================================================================
//> Register Helpers
//==============================================================================================
export function registerHelpers() {
    const helpers = [
        { name: 'selected', fn: (value) => { return value ? 'selected' : '' } },
        {
            name: 'objectKey',
            fn: (obj, key) => {
                if (Object.hasOwn(obj, key)) {
                    return obj[key];
                } else throw new Error(`Object does not have key: ${key}`);
            }
        },
        //======================================================================================
        //>- String Helpers
        //======================================================================================
        { name: 'toLowerCase', fn: (str) => str.toLowerCase() },
        { name: 'toTitleCase', fn: (str) => str.replace(/\w\S*/g, text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()) },

        //======================================================================================
        //>- Logic Helpers
        //======================================================================================
        { name: 'choose', fn: (a, b) => a ? a : b },
        {
            name: 'isEmpty',
            fn: (obj) => {
                console.log(obj)
                let value = 0;
                if (typeof obj == 'object') value = Object.keys(obj).length <= 0;
                if (typeof obj == 'array') value = obj.length <= 0;
                console.log(value)
                return value
            }
        },

        //======================================================================================
        //>- Permission Helpers
        //======================================================================================
        { name: 'isGM', fn: () => game.user.isGM },

        //======================================================================================
        //>- Math helpers
        //======================================================================================
        { name: 'addition', fn: (a, b) => a + b },
        { name: 'ceil', fn: (a) => Math.ceil(a) },
        { name: 'divide', fn: (a, b) => a / b },
        { name: 'floor', fn: (a) => Math.floor(a) },
        { name: 'max', fn: (...num) => Math.max(...num) },
        { name: 'min', fn: (...num) => Math.min(...num) },
        { name: 'multiply', fn: (a, b) => a * b },
        { name: 'percent', fn: (a, b) => a / b * 100 },
        { name: 'round', fn: (a) => Math.ceil(a) },
        { name: 'subtraction', fn: (a, b) => a - b },

        //======================================================================================
        //>- Elements
        //======================================================================================
        {// wraps a set of elements in a collapsible wrapper
            name: 'collapsible',
            fn: (label, options) => {
                if (!options) options = label, label = '';
                return new Handlebars.SafeString(`
                    <div class="collapsible">
                        <div class="flexrow">
                            <a data-action="collapse"><i class="fas fa-caret-down"></i></a>
                            <label>${label}</label>
                        </div>
                        <div class="collapsible-content">
                            <div class="wrapper">
                                ${options.fn(this)}
                            </div>
                        </div>
                    </div>`
                );
            }
        },
        {
            name: 'collapsed',
            fn: (label, options) => {
                if (!options) options = label, label = '';
                return new Handlebars.SafeString(`
                    <div class="collapsible collapsed">
                        <div class="flexrow">
                            <a data-action="collapse"><i class="fas fa-caret-down"></i></a>
                            <label>${label}</label>
                        </div>
                        <div class="collapsible-content">
                            <div class="wrapper">
                                ${options.fn(this)}
                            </div>
                        </div>
                    </div>`
                );
            }
        }, {
            name: 'ledger',
            fn: (target, id, label) => {
                return `<a data-action="editLedger" data-target="${target}" data-id="${id}" data-label="${label}"><i class="fa-solid fa-memo-pad"></i></a>`
            }
        },
        //======================================================================================
        //>- Iterators
        //======================================================================================
        {
            name: 'repeat',
            fn: (num, options) => {
                if (isNaN(num)) return options.fn(this);
                for (var i = 0, ret = ''; i < num; i++) ret += options.fn(i);
                return ret;
            }
        },

        //======================================================================================
        //>- Data Field Helpers
        //======================================================================================
        {
            name: 'getField',
            fn: (schema, path) => schema.getField(path)
        }, {
            name: 'toFieldGroup',
            fn: (schema, path, options) => {
                let field = schema.getField(path);
                const { classes, label, hint, rootId, stacked, units, widget, ...inputConfig } = options.hash;
                const groupConfig = {
                    label, hint, rootId, stacked, widget, localize: true, units,
                    classes: typeof classes === "string" ? classes.split(" ") : []
                };
                const group = field.toFormGroup(groupConfig, inputConfig);
                return new Handlebars.SafeString(group.outerHTML);
            }
        }, {
            name: 'toFieldInput',
            fn: (schema, path, options) => {
                let field = schema.getField(path);
                const { classes, label, hint, rootId, stacked, units, widget, ...inputConfig } = options.hash;
                const groupConfig = {
                    label, hint, rootId, stacked, widget, localize: true, units,
                    classes: typeof classes === "string" ? classes.split(" ") : []
                };
                const group = field.toInput(inputConfig);
                return new Handlebars.SafeString(group.outerHTML);
            }
        },

        //======================================================================================
        //>- Data Field Helpers
        //======================================================================================
        {
            name: 'arrayIndex',
            fn: (array, index, options) => {
                if (!Array.isArray(array)) throw new Error('Cannot parse non array as array');
                console.log(`Array accesed, index=${index} value of `, array[index])
                if (index < 0) index = 0;
                return array[index];
            }
        }
    ]

    /* -------------------------------------------- */
    /*  element creators                            */
    /* -------------------------------------------- */
    Handlebars.registerHelper('selectDamage', (v, n) => newedo.elements.select.DamageTypes(v, n));
    Handlebars.registerHelper('selectSkill', (v, n) => newedo.elements.select.Skills(v, n));
    Handlebars.registerHelper('selectTrait', (v, n) => newedo.elements.select.Traits(v, n));

    for (const helper of helpers) Handlebars.registerHelper(helper.name, helper.fn);
}