import LOGGER from "./logger.mjs";

export function registerTemplates() {
    LOGGER.log(`Registering handelbars templates`);
    const id = game.system.id;
    const path = `systems/${id}/templates`;
    const partials = [

        //Sheet Partials
        `${path}/shared/tabs-nav.hbs`,
        `${path}/shared/tabs-content.hbs`,

        // Dialog popups
        `${path}/dialog/parts/roll-options.hbs`,
    ];

    const paths = {};
    for (const path of partials) {
        paths[path.replace(".hbs", ".html")] = path;
        paths[`${id}.${path.split("/").pop().replace(".hbs", "")}`] = path;
    }

    return loadTemplates(paths);
};

export function registerHelpers() {
    Handlebars.registerHelper('ledger', (target, id, label) => {
        return `<a data-action="editLedger" data-target="${target}" data-id="${id}" data-label="${label}"><i class="fa-solid fa-memo-pad"></i></a>`
    });
    Handlebars.registerHelper('toLowerCase', (str) => str.toLowerCase());
    Handlebars.registerHelper('toTitleCase', (str) => str.replace(/\w\S*/g, text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()))
    Handlebars.registerHelper('isGM', () => game.user.isGM);
    Handlebars.registerHelper('objectIsEmpty', (obj) => Object.keys(obj).length <= 0);
    Handlebars.registerHelper('getField', (schema, path) => schema.getField(path));
    Handlebars.registerHelper('toFieldGroup', (schema, path, options) => {
        let field = schema.getField(path);
        const { classes, label, hint, rootId, stacked, units, widget, ...inputConfig } = options.hash;
        const groupConfig = {
            label, hint, rootId, stacked, widget, localize: true, units,
            classes: typeof classes === "string" ? classes.split(" ") : []
        };
        const group = field.toFormGroup(groupConfig, inputConfig);
        return new Handlebars.SafeString(group.outerHTML);
    });
    Handlebars.registerHelper('toFieldInput', (schema, path, options) => {
        let field = schema.getField(path);
        const { classes, label, hint, rootId, stacked, units, widget, ...inputConfig } = options.hash;
        const groupConfig = {
            label, hint, rootId, stacked, widget, localize: true, units,
            classes: typeof classes === "string" ? classes.split(" ") : []
        };
        const group = field.toFormInput(groupConfig, inputConfig);
        return new Handlebars.SafeString(group.outerHTML);
    })
    /* -------------------------------------------- */
    /*  Math helpers                                */
    /* -------------------------------------------- */
    Handlebars.registerHelper('addition', (a, b) => a + b);
    Handlebars.registerHelper('ceil', (a) => Math.ceil(a));
    Handlebars.registerHelper('divide', (a, b) => a / b);
    Handlebars.registerHelper('floor', (a) => Math.floor(a));
    Handlebars.registerHelper('max', (...num) => Math.max(...num));
    Handlebars.registerHelper('min', (...num) => Math.min(...num));
    Handlebars.registerHelper('multiply', (a, b) => a * b);
    Handlebars.registerHelper('percent', (a, b) => a / b * 100);
    Handlebars.registerHelper('round', (a) => Math.ceil(a));
    Handlebars.registerHelper('subtraction', (a, b) => a - b);

    /* -------------------------------------------- */
    /*  Iterators                                   */
    /* -------------------------------------------- */
    Handlebars.registerHelper('repeat', (context, options) => {
        for (var i = 0, ret = ''; i < context; i++) ret = ret + options.fn(context[i]);
        return ret;
    });

    /* -------------------------------------------- */
    /*  element creators                            */
    /* -------------------------------------------- */
    Handlebars.registerHelper('selectDamage', (v, n) => newedo.elements.select.DamageTypes(v, n));
    Handlebars.registerHelper('selectSkill', (v, n) => newedo.elements.select.Skills(v, n));
    Handlebars.registerHelper('selectWeaponSkill', (v, n) => newedo.elements.select.WeaponSkills(v, n));
    Handlebars.registerHelper('selectTrait', (v, n) => newedo.elements.select.Traits(v, n));
}