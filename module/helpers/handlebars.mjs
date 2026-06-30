import { NEWEDO } from "../config.mjs";
import { SystemDataModel } from "../data/abstract.mjs";
import LOGGER from "./logger.mjs";
import utils from "./utils.mjs";

export function registerTemplates() {
    LOGGER.log(`Registering handelbars templates`);
    const path = `systems/${game.system.id}/templates`;
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
        paths[`${game.system.id}.${path.split("/").pop().replace(".hbs", "")}`] = path;
    }

    return foundry.applications.handlebars.loadTemplates(paths);
};
//=========================================================================================================
//> Utility functions
//=========================================================================================================

/**
 * @param {SystemDataModel} system - the system data model containg a valid schema
 * @param {String|Object} path - dot delimited path for the field
 * @param {Object} options 
 * @param {String[]} options.ids - Id / array of field ids for dynamic fields such as arrays or TypedObjectFields
 * @returns 
 */
function getSystemField(system, path, options) {
    const { classes, label, hint, rootId, stacked, units, widget, ...inputConfig } = options.hash;

    if (typeof path == "object") path = path.string; // account for concat handlebars helper
    if (!system.schema) throw new Error("Missing system schema to reference");
    var field = system?.schema.getField(path);

    // if we didn't find the field, check for dynamic elements, such as TypedObjectField | ArrayField
    if (!field) {
        console.log("Path", { path })
        const path_pieces = path.split(".");
        var ref = system.schema;
        for (const piece of path_pieces) {
            // if theres a container reference element, this part of the path can be discarded
            if (Object.hasOwn(ref, "element")) {
                ref = ref.element;
            } else ref = ref.getField(piece);
        }
        field = ref;

        // if a specific name wasn't provided, set it to the working path
        if (!inputConfig.name) inputConfig.name = "system." + path;
    }

    if (!field) throw new Error("Couldn't find specified path on included schema, is it correct?");

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
    return { field, config: { group: groupConfig, input: inputConfig } }
}

//=========================================================================================================
//> Register Helpers
//=========================================================================================================
export function registerHelpers() {
    const helpers = {
        selected: (value) => { return value ? 'selected' : '' },

        //=================================================================================================
        //>  Data Management
        //=================================================================================================
        JSON: (str) => JSON.parse(str),
        isArray: (arr) => Array.isArray(arr),
        arrayLength: (arr) => {
            if (Array.isArray(arr)) return arr.length;
            else throw new Error("Can't get length of non array value");
        },
        objectIsEmpty: (obj) => Object.keys(obj).length <= 0,
        objectValue: (obj, key) => obj[key],
        systemConfig: () => NEWEDO,
        objectKey: (obj, key) => {
            if (Object.hasOwn(obj, key)) {
                return obj[key];
            } else throw new Error(`Object does not have key: ${key}`);
        },
        //=======================================================================
        //>  Strings and Text
        //=======================================================================
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
        gameSetting: (scope, id) => { return game.settings.get(scope, id) },
        systemSetting: (id) => { return game.settings.get(game.system.id, id) },
        //=======================================================================
        //>  Math                              
        //=======================================================================
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
        selected: (val) => {
            if (val) return new Handlebars.SafeString('selected');
            return '';
        },

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
        getField: (schema, path) => schema.getField(path),
        toFieldGroup(schema, path, options) {
            if (typeof path == "object") path = path.string; // account for concat handlebars helper
            const field = schema.getField(path);
            const { classes, label, hint, rootId, stacked, units, widget, ...inputConfig } = options.hash;
            const groupConfig = {
                label, hint, rootId, stacked, widget, localize: true, units,
                classes: typeof classes === "string" ? classes.split(" ") : []
            }
            const group = field.toFormGroup(groupConfig, inputConfig);
            return new Handlebars.SafeString(group.outerHTML);
        },
        toFieldInput(schema, path, options) {
            if (typeof path == "object") path = path.string; // account for concat handlebars helper
            const field = schema.getField(path);
            const { classes, label, hint, rootId, stacked, units, widget, ...inputConfig } = options.hash;
            const groupConfig = {
                label, hint, rootId, stacked, widget, localize: true, units,
                classes: typeof classes === "string" ? classes.split(" ") : []
            }
            const group = field.toInput(inputConfig);
            return new Handlebars.SafeString(group.outerHTML);
        },
        //======================================================================================
        //> System field helpers
        //======================================================================================
        systemFieldInput(system, path, options) {
            const data = getSystemField(system, path, options);
            console.log(data)
            const group = data.field.toInput(data.config.input);
            return new Handlebars.SafeString(group.outerHTML);
        },
        systemFieldGroup(system, path, options) {
            const data = getSystemField(system, path, options);
            const group = data.field.toFormGroup(data.config.group, data.config.input);
            return new Handlebars.SafeString(group.outerHTML);
        },
        //======================================================================================
        //>- Data Field Helpers
        //======================================================================================
        arrayIndex: (array, index, options) => {
            if (!Array.isArray(array)) throw new Error('Cannot parse non array as array');
            if (index < 0) index = 0;
            return array[index];
        },
        repeat(context, options) {
            for (var i = 0, ret = ''; i < context; i++) ret = ret + options.fn(context[i]);
            return ret;
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