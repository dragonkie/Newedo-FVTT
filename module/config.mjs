// Exported object
export const NEWEDO = {};

NEWEDO.traitsBase = {
    hrt: "NEWEDO.Trait.Core.Hrt.long",
    per: "NEWEDO.Trait.Core.Per.long",
    pow: "NEWEDO.Trait.Core.Pow.long",
    pre: "NEWEDO.Trait.Core.Pre.long",
    ref: "NEWEDO.Trait.Core.Ref.long",
    sav: "NEWEDO.Trait.Core.Sav.long",
}

// Base data
NEWEDO.traitsCore = {
    ...NEWEDO.traitsBase,
    shi: "NEWEDO.Trait.Core.Shi.long",
}

NEWEDO.traitsCoreAbbr = {};
for (const [k, v] of Object.entries(NEWEDO.traitsCore)) {
    NEWEDO.traitsCoreAbbr[k] = v.replace('long', 'abbr')
}

NEWEDO.traitsDerived = {
    init: "NEWEDO.Trait.Derived.Init.long",
    move: "NEWEDO.Trait.Derived.Move.long",
    def: "NEWEDO.Trait.Derived.Def.long",
    res: "NEWEDO.Trait.Derived.Res.long",
    hp: "NEWEDO.Trait.Derived.Hp.long",
}

NEWEDO.traitsDerivedMod = {
    init: 1,
    move: 1,
    def: 0.4,
    res: 0.4,
    hp: 1.5
}

NEWEDO.traitsDerivedAbbr = {};
for (const [k, v] of Object.entries(NEWEDO.traitsDerived)) {
    NEWEDO.traitsDerivedAbbr[k] = v.replace('long', 'abbr')
}

NEWEDO.traits = {
    ...NEWEDO.traitsCore,
    ...NEWEDO.traitsDerived
}

NEWEDO.traitsAbbr = {
    ...NEWEDO.traitsCoreAbbr,
    ...NEWEDO.traitsDerivedAbbr
}

NEWEDO.generic = {
    armour: "NEWEDO.Generic.Armour.long",
    attack: "NEWEDO.Generic.Attack.long",
    background: "NEWEDO.Generic.Background.long",
    bonus: "NEWEDO.Generic.Bonus.long",
    cast: "NEWEDO.Generic.Cast",
    core: "NEWEDO.Generic.Core.long",
    cost: "NEWEDO.Generic.Cost",
    damage: "NEWEDO.Generic.Damage.long",
    derived: "NEWEDO.Generic.Derived.long",
    equip: "NEWEDO.Generic.Equip",
    equipped: "NEWEDO.Generic.Equipped.long",
    experience: "NEWEDO.Generic.Experience.long",
    fate: "NEWEDO.Generic.Fate.long",
    grit: "NEWEDO.Generic.Grit.long",
    jump: "NEWEDO.Generic.Jump.long",
    legend: "NEWEDO.Generic.Legend.long",
    level: "NEWEDO.Generic.Level.long",
    lift: "NEWEDO.Generic.Lift.long",
    mod: "NEWEDO.Generic.Mod.long",
    raise: "NEWEDO.Generic.Raise.long",
    range: "NEWEDO.Generic.Range.long",
    rank: "NEWEDO.Generic.Rank.long",
    reload: "NEWEDO.Generic.Reload",
    rest: "NEWEDO.Generic.Rest.long",
    roll: "NEWEDO.Generic.Roll.long",
    situational: 'NEWEDO.Generic.Situational.long',
    size: "NEWEDO.Generic.Size.long",
    skill: "NEWEDO.Generic.Skill.long",
    soak: "NEWEDO.Generic.Soak.long",
    targetNumber: 'NEWEDO.Generic.TargetNumber',
    trait: "NEWEDO.Generic.Trait.long",
    wound: "NEWEDO.Generic.Wound.long",
};

NEWEDO.genericAbbr = {};
NEWEDO.genericPlural = {};
for (const [key, value] of Object.entries(NEWEDO.generic)) {
    NEWEDO.genericAbbr[key] = value.replace('long', 'abbr');
    NEWEDO.genericPlural[key] = value.replace('long', 'plrl');
}

NEWEDO.time = {
    instant: 'NEWEDO.Time.Instant',
    turns: 'NEWEDO.Time.Turns',
    rounds: 'NEWEDO.Time.Rounds',
    seconds: 'NEWEDO.Time.Seconds',
    minutes: 'NEWEDO.Time.Minutes',
    hours: 'NEWEDO.Time.Hours',
    days: 'NEWEDO.Time.Days',
}

NEWEDO.targets = {
    self: '',
    ally: '',
    enemy: '',
    any: '',
}

NEWEDO.actions = {
    full: 'NEWEDO.Action.Full',
    quick: 'NEWEDO.Action.Quick',
    interupt: 'NEWEDO.Action.Interupt',
}

NEWEDO.effect = {
    create: "NEWEDO.EffectCreate",
    delete: "NEWEDO.EffectDelete",
    toggle: "NEWEDO.EffectToggle",
    edit: "NEWEDO.EffectEdit"
}

NEWEDO.woundStatus = {
    healthy: "NEWEDO.WoundStatus.Healthy",
    grazed: "NEWEDO.WoundStatus.Grazed",
    wounded: "NEWEDO.WoundStatus.Wounded",
    bloody: "NEWEDO.WoundStatus.Bloody",
    beaten: "NEWEDO.WoundStatus.Beaten",
    burning: "NEWEDO.WoundStatus.Burning",
}

NEWEDO.damageTypes = {
    kin: "NEWEDO.DamageType.Kin.long",
    ele: "NEWEDO.DamageType.Ele.long",
    bio: "NEWEDO.DamageType.Bio.long",
    arc: "NEWEDO.DamageType.Arc.long",
}

NEWEDO.damageTypesAbbr = {};
for (const [k, v] of Object.entries(NEWEDO.damageTypes)) {
    NEWEDO.damageTypesAbbr[k] = v.replace('long', 'abbr')
}

NEWEDO.attribute = {
    exp: "NEWEDO.attribute.exp",
    lvl: "NEWEDO.attribute.lvl",
    size: "NEWEDO.attribute.size",
};

NEWEDO.skillsHeart = {
    crafting: "NEWEDO.Skill.Crafting.long",
    meditation: "NEWEDO.Skill.Meditation.long",
    rally: "NEWEDO.Skill.Rally.long",
    survival: "NEWEDO.Skill.Survival.long",
};
NEWEDO.skillsPerception = {
    archery: "NEWEDO.Skill.Archery.long",
    commerce: "NEWEDO.Skill.Commerce.long",
    gunnery: "NEWEDO.Skill.Gunnery.long",
    intuition: "NEWEDO.Skill.Intuition.long",
    investigation: "NEWEDO.Skill.Investigation.long",
    smallArms: "NEWEDO.Skill.SmallArms.long",
};
NEWEDO.skillsPower = {
    athletics: "NEWEDO.Skill.Athletics.long",
    heavyMelee: "NEWEDO.Skill.HeavyMelee.long",
    lightMelee: "NEWEDO.Skill.LightMelee.long",
    thrown: "NEWEDO.Skill.Thrown.long",
    unarmed: "NEWEDO.Skill.Unarmed.long",
};
NEWEDO.skillsPresence = {
    deception: "NEWEDO.Skill.Deception.long",
    eloquence: "NEWEDO.Skill.Eloquence.long",
    intimidation: "NEWEDO.Skill.Intimidation.long",
    performance: "NEWEDO.Skill.Performance.long",
    seduction: "NEWEDO.Skill.Seduction.long",
};
NEWEDO.skillsReflex = {
    banter: "NEWEDO.Skill.Banter.long",
    dodge: "NEWEDO.Skill.Dodge.long",
    drive: "NEWEDO.Skill.Drive.long",
    sleightOfHand: "NEWEDO.Skill.SleightOfHand.long",
    stealth: "NEWEDO.Skill.Stealth.long",
};
NEWEDO.skillsSavvy = {
    arcana: "NEWEDO.Skill.Arcana.long",
    computers: "NEWEDO.Skill.Computers.long",
    gambling: "NEWEDO.Skill.Gambling.long",
    hardware: "NEWEDO.Skill.Hardware.long",
    medicine: "NEWEDO.Skill.Medicine.long",
    security: "NEWEDO.Skill.Security.long",
    streetwise: "NEWEDO.Skill.Streetwise.long",
    study: "NEWEDO.Skill.Study.long",
    surveillance: "NEWEDO.Surveillance.Stealth.long",
    tactics: "NEWEDO.Skill.Tactics.long",
    toxicology: "NEWEDO.Skill.Toxicology.long",
    wetware: "NEWEDO.Skill.Wetware.long",
};

NEWEDO.skills = {
    ...NEWEDO.skillsHeart,
    ...NEWEDO.skillsPerception,
    ...NEWEDO.skillsPower,
    ...NEWEDO.skillsPresence,
    ...NEWEDO.skillsReflex,
    ...NEWEDO.skillsSavvy
};

NEWEDO.weaponSkillsMelee = {
    lightMelee: NEWEDO.skills.lightMelee,
    heavyMelee: NEWEDO.skills.heavyMelee,
    unarmed: NEWEDO.skills.unarmed,
    thrown: NEWEDO.skills.thrown,
}

NEWEDO.weaponSkillsRanged = {
    archery: NEWEDO.skills.archery,
    gunnery: NEWEDO.skills.gunnery,
    smallArms: NEWEDO.skills.smallArms
}

NEWEDO.weaponSkills = {
    ...NEWEDO.weaponSkillsMelee,
    ...NEWEDO.weaponSkillsRanged
}

NEWEDO.background = {
    contacts: "NEWEDO.Background.Contacts",
    followers: "NEWEDO.Background.Followers",
    soul: "NEWEDO.Background.Soul",
    status: "NEWEDO.Background.Status",
    wealth: "NEWEDO.Background.Wealth",
};

NEWEDO.itemTypes = {
    ammo: "TYPES.Item.ammo",
    armour: "TYPES.Item.armour",
    augment: "TYPES.Item.augment",
    culture: "TYPES.Item.culture",
    fate: "TYPES.Item.fate",
    feature: "TYPES.Item.feature",
    kami: "TYPES.Item.kami",
    lineage: "TYPES.Item.lineage",
    path: "TYPES.Item.path",
    rote: "TYPES.Item.rote",
    skill: "TYPES.Item.skill",
    upgrade: "TYPES.Item.upgrade",
    weapon: "TYPES.Item.weapon"
}

NEWEDO.actorTypes = {
    character: "TYPES.Actor.character",
    npc: "TYPES.Actor.npc",
    pet: "TYPES.Actor.pet",
    vehicle: "TYPES.Actor.vehicle",
}

NEWEDO.petTypes = {
    animal: "NEWEDO.PetType.Animal",
    kami: "NEWEDO.PetType.Kami",
    robot: "NEWEDO.PetType.Robot",
}

NEWEDO.types = {
    ...NEWEDO.actorTypes,
    ...NEWEDO.itemTypes
}

NEWEDO.biography = {
    personality: "NEWEDO.biography.personality",
    appearance: "NEWEDO.biography.appearance",
    background: "NEWEDO.biography.background",
    ambition: "NEWEDO.biography.ambition",
    ideal: "NEWEDO.biography.ideal",
    fear: "NEWEDO.biography.fear"
}


NEWEDO.notificaiton = {

}
NEWEDO.warning = {

}
NEWEDO.error = {
    noDocument: "NEWEDO.Notification.Error.NoDocument"
}
NEWEDO.prompt = {

}
NEWEDO.confirm = {
    deleteItem: 'NEWEDO.Dialog.Confirm.Delete.Item',
    deleteFeature: 'NEWEDO.Dialog.Confirm.Delete.Feature'
}
NEWEDO.dialog = {

}

NEWEDO.tabs = {
    character: {

    },
    npc: {},
    item: {}
}

NEWEDO.sheetParts = {
    character: {},
    npc: {},
    item: {}
}

NEWEDO.ContextMenu = {
    edit: "NEWEDO.ContextMenu.Edit",
    delete: "NEWEDO.ContextMenu.Delete",
    gift: "NEWEDO.ContextMenu.Gift",
    equip: "NEWEDO.ContextMenu.Equip",
    unequip: "NEWEDO.ContextMenu.Unequip",
    install: "NEWEDO.ContextMenu.Install",
    uninstall: "NEWEDO.ContextMenu.Uninstall",
    attack: "NEWEDO.ContextMenu.Attack",
    damage: "NEWEDO.ContextMenu.Damage",
}

NEWEDO.template = {
    app: {

    },
    dialog: {

    },
    sheet: {
        actor: {
            character: {

            },
            npc: {

            },
            pet: {

            },
            vehicle: {

            }
        },
        item: {
            augment: {},
            armour: {},
            culture: {},
            fate: {},
            kami: {},
            lineage: {},
            paht: {},
            rote: {},
            skill: {},
            weapon: {},
        }
    }
}