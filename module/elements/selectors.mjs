import { NEWEDO } from "../config.mjs";
import utils from "../helpers/sysUtil.mjs";

export function DamageTypes(value = '', name = '') {
    const opts = [];
    for (const [k, v] of Object.entries(NEWEDO.damageTypes)) {
        opts.push({ value: k, label: v });
    }
    return foundry.applications.fields.createSelectInput({
        options: opts,
        value: value,
        valueAttr: "value",
        labelAttr: "label",
        localize: true,
        sort: false,
        name: name
    }).outerHTML;
}

export function Traits(value = '', name = '') {
    const opts = [];
    for (const [k, v] of Object.entries(NEWEDO.traitsCore)) opts.push({ value: k, label: v });

    return foundry.applications.fields.createSelectInput({
        options: opts,
        value: value,
        valueAttr: "value",
        labelAttr: "label",
        localize: true,
        name: name,
    }).outerHTML;
}

export async function Skills(linkID) {
    // grabs an array of all the items in the internal skills compendium
    const skills = [];

    // Add all items from compendium packs we can see
    for (const pack of game.packs.contents) {
        if (pack.documentName == 'Item') {
            let documents = await pack.getDocuments();
            for (const doc of documents) {
                if (doc.type == 'skill') skills.push(doc);
            }
        }
    }

    for (const item of game.items.contents) if (item.type == 'skill') skills.push(item);

    const options = {};
    for (const skill of skills) options[skill.system.linkID] = skill.name;

    console.log('options', options)

    if (linkID == '' || !linkID) linkID = Object.keys(options)[0];
    console.log('default skill linkID', linkID)

    return new foundry.data.fields.StringField({
        blank: false,
        initial: linkID,
        choices: options,
        label: NEWEDO.generic.skill,
    }).toFormGroup({ localize: true }, { blank: false }).outerHTML;
}