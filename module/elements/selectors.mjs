

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

export function Skills(value, name) {
    let opts = [];
    for (const [key, skill] of Object.entries(NEWEDO.skills)) opts.push({ label: skill, value: key });

    opts.sort((a, b) => {
        if (a.value > b.value) return 1;
        if (a.value < b.value) return -1;
        return 0;
    });

    return foundry.applications.fields.createSelectInput({
        options: opts,
        value: value,
        valueAttr: "value",
        labelAttr: "label",
        localize: true,
        sort: true,
        name: name
    }).outerHTML;
}

export function WeaponSkills(value, name) {
    const opts = [];
    for (const [k, v] of Object.entries(NEWEDO.weaponSkills)) opts.push({ value: k, label: v });
    return foundry.applications.fields.createSelectInput({
        options: opts,
        value: value,
        valueAttr: "value",
        labelAttr: "label",
        localize: true,
        sort: true,
        name: name
    }).outerHTML;
}
