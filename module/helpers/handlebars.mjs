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
    const helpers = {
        selected: (value) => { return value ? 'selected' : '' },

        objectKey: (obj, key) => {
            if (Object.hasOwn(obj, key)) {
                return obj[key];
            } else throw new Error(`Object does not have key: ${key}`);
        },
        //======================================================================================
        //>- String Helpers
        //======================================================================================
        toLowerCase: (str) => str.toLowerCase(),
        toTitleCase: (str) => str.replace(/\w\S*/g, text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()),

        //======================================================================================
        //>- Logic Helpers
        //======================================================================================
        choose: (a, b) => a ? a : b,

        isEmpty: (obj) => {
            let value = 0;
            if (typeof obj == 'object') value = Object.keys(obj).length <= 0;
            if (typeof obj == 'array') value = obj.length <= 0;
            return value
        },


        //======================================================================================
        //>- Permission Helpers
        //======================================================================================
        isGM: () => { return game.user.isGM },

        //======================================================================================
        //>- Math helpers
        //======================================================================================
        addition: (a, b) => a + b,
        ceil: (a) => Math.ceil(a),
        divide: (a, b) => a / b,
        floor: (a) => Math.floor(a),
        max: (...num) => Math.max(...num),
        min: (...num) => Math.min(...num),
        multiply: (a, b) => a * b,
        percent: (a, b) => a / b * 100,
        round: (a) => Math.ceil(a),
        subtraction: (a, b) => a - b,

        //======================================================================================
        //>- Elements
        //======================================================================================
        // wraps a set of elements in a collapsible wrapper
        collapsible: (label, options) => {
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
        },

        collapsed: (label, options) => {
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
        },

        ledger: (target, id, label) => {
            return `<a data-action="editLedger" data-target="${target}" data-id="${id}" data-label="${label}"><i class="fa-solid fa-memo-pad"></i></a>`
        },
        //======================================================================================
        //>- Iterators
        //======================================================================================
        repeat: (num, options) => {
            if (isNaN(num)) return options.fn(this);
            for (var i = 0, ret = ''; i < num; i++) ret += options.fn(i);
            return ret;
        },

        //======================================================================================
        //>- Data Field Helpers
        //======================================================================================
        getField: (schema, path) => {
            return schema.getField(path)
        },
        toFieldGroup(schema, path, options) {
            let field = schema.getField(path);
            const { classes, label, hint, rootId, stacked, units, widget, ...inputConfig } = options.hash;
            const groupConfig = {
                label, hint, rootId, stacked, widget, localize: true, units,
                classes: typeof classes === "string" ? classes.split(" ") : []
            }
            const group = field.toFormGroup(groupConfig, inputConfig);
            return new Handlebars.SafeString(group.outerHTML);
        },
        toFieldInput(schema, path, options) {
            let field = schema.getField(path);
            const { classes, label, hint, rootId, stacked, units, widget, ...inputConfig } = options.hash;
            const groupConfig = {
                label, hint, rootId, stacked, widget, localize: true, units,
                classes: typeof classes === "string" ? classes.split(" ") : []
            }
            const group = field.toInput(inputConfig);
            return new Handlebars.SafeString(group.outerHTML);
        },
        systemFieldInput(system, path, options) {
            // auto fills in the details to the input using the provided path from the system data
            // the system needs to define a schema path as well
            const field = system?.schema.getField(path);
            if (!field) throw new Error("Couldn't find field path for system schema, was it included?");

            const { classes, label, hint, rootId, stacked, units, widget, ...inputConfig } = options.hash;
            const input = path.split(".");
            var value = system;
            input.forEach(p => {
                value = value[p];
            });

            inputConfig.value = value;

            const group = field.toInput(inputConfig);
            return new Handlebars.SafeString(group.outerHTML);
        },
        systemFieldGroup(system, path, options) {
            // auto fills in the details to the input using the provided path from the system data
            // the system needs to define a schema path as well
            const field = system?.schema.getField(path);
            if (!field) throw new Error("Couldn't find field path for system schema, was it included?");

            const { classes, label, hint, rootId, stacked, units, widget, ...inputConfig } = options.hash;
            const groupConfig = {
                label, hint, rootId, stacked, widget, localize: true, units,
                classes: typeof classes === "string" ? classes.split(" ") : []
            };

            const input = path.split(".");
            var value = system;
            input.forEach(p => {
                value = value[p];
            });

            inputConfig.value = value;

            const group = field.toFormGroup(groupConfig, inputConfig);
            return new Handlebars.SafeString(group.outerHTML);
        },
        //======================================================================================
        //>- Data Field Helpers
        //======================================================================================
        arrayIndex: (array, index, options) => {
            if (!Array.isArray(array)) throw new Error('Cannot parse non array as array');
            if (index < 0) index = 0;
            return array[index];
        }
    }

    /* -------------------------------------------- */
    /*  element creators                            */
    /* -------------------------------------------- */
    Handlebars.registerHelper('selectDamage', (v, n) => newedo.elements.select.DamageTypes(v, n));
    Handlebars.registerHelper('selectSkill', (v, n) => newedo.elements.select.Skills(v, n));
    Handlebars.registerHelper('selectTrait', (v, n) => newedo.elements.select.Traits(v, n));

    for (const [key, fn] of Object.entries(helpers)) Handlebars.registerHelper(key, fn);
}