
import { BonusField, ResourceField } from "./fields.mjs"
import LOGGER from "../helpers/logger.mjs";
import utils from "../helpers/sysUtil.mjs";
import { NEWEDO } from "../config.mjs";


const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField, ObjectField, HTMLField
} = foundry.data.fields;

//======================================================================================
//> System Data Model
//======================================================================================
export class SystemDataModel extends foundry.abstract.TypeDataModel {
    /**
     * Quick function to create a number value field, but returns full schema field to give space for
     * derived data to extend this particular field context
     * @param {String} key a valid data path name for an object key to asign this value too
     * @param {Number} value the initial value of this entry
     * @returns {SchemaField}
     */
    static AddValueField(key, value) {
        const field = new SchemaField({
            [key]: new NumberField({ initial: value })
        });
        return field
    }

    static FeatureField() {
        const opts = {
            required: true,
            nullable: false,
        }
        return new SchemaField({
            type: new StringField({ ...opts, initial: "item" }),
            label: new StringField({ ...opts, initial: "New Feature" }),
            unlock: new NumberField({ ...opts, initial: 1, min: 1, max: 5 }),
            id: new StringField({ ...opts, initial: foundry.utils.randomID() }),
            data: new ObjectField({
                initial: {},
                ...opts
            })
        })
    }

    static TraitField(init = 'hrt') {
        if (init !== '' && !Object.keys(NEWEDO.traitsCore).includes(init)) init = Object.keys(NEWEDO.traitsCore)[0];
        return new StringField({
            initial: init,
            required: true,
            nullable: false,
            blank: true,
            label: NEWEDO.generic.trait,
            choices: () => {
                let options = utils.duplicate(NEWEDO.traitsCore);
                for (const key of Object.keys(options)) options[key] = utils.localize(options[key]);
                return options;
            }
        });
    }

    static SkillField() {
        return new SchemaField({
            linkID: new StringField({ initial: '', required: false, nullable: true }), // Used by skills to auto link the skill to items that need it
            label: new StringField({ initial: 'NEWEDO.Generic.NewSkill', required: false, nullable: true }), // Localizeable field for the name of this skill
            trait: this.TraitField(),// the core trait associated with this skill
            ranks: new ArrayField(new NumberField(), { initial: [0, 0, 0, 0, 0], nullable: false, required: true, min: 5, max: 5 }) //NPC's can only have d8's by default, this is here so that rule can be homebrewed by DMs
        })
    }

    getRollData() {
        // Get owning documents rolldata
        let data = { ...this };
        return data;
    }

    get document() { return this.parent };

    //==================================================================================
    //>- Field config presets
    //==================================================================================
    static RequiredConfig = {
        required: true,
        nullable: false
    }

    static RequiredIntegerConfig = {
        required: true,
        nullable: false,
        integer: true
    }

    //==================================================================================
    //>- Create Functions
    //==================================================================================
    async _preCreate(data, options, user) {
        return super._preCreate(data, options, user);
    }

    _onCreate(data, options, userId) {
        return super._onCreate(data, options, userId);
    }

    //==================================================================================
    //>- Update functions
    //==================================================================================
    async _preUpdate(changes, options, user) {
        return super._preUpdate(changes, options, user);
    }

    _onUpdate(changed, options, userId) {
        return super._onUpdate(changed, options, userId);
    }

    //==================================================================================
    //>- Delete functions
    //==================================================================================
    async _preDelete(options, user) {
        return super._preDelete(options, user);
    }

    _onDelete(options, userId) {
        return super._onDelete(options, userId);
    }
}

//======================================================================================
//> Actor Data Model
//======================================================================================
export class ActorDataModel extends SystemDataModel {
    static defineSchema() {
        const schema = {};

        schema.hp = new SchemaField({
            min: new NumberField({ initial: 0 }),
            value: new NumberField({ initial: 20, min: 0 }),
            mod: new NumberField({ initial: 1.5 }),
            flat: new NumberField({ initial: 0 }),
        });

        schema.size = this.AddValueField('value', 5);
        schema.lift = new SchemaField({
            mod: new NumberField({ initial: 3.0 }),
            flat: new NumberField({ initial: 0 }),
        });// mod * pow kg

        const traits_core = {};
        for (const trait of Object.keys(NEWEDO.traitsCore).sort()) traits_core[trait] = new SchemaField({
            value: new NumberField({ initial: trait != 'shi' ? 10 : 0, ...this.RequiredIntegerConfig })
        })

        schema.traits = new SchemaField({
            core: new SchemaField(traits_core),
            derived: new SchemaField({
                init: new SchemaField({
                    mod: new NumberField({ initial: 1.0 }),
                    flat: new NumberField({ initial: 0 }),
                }),
                move: new SchemaField({
                    mod: new NumberField({ initial: 1.0 }),
                    flat: new NumberField({ initial: 0 }),
                }),
                def: new SchemaField({
                    mod: new NumberField({ initial: 0.4 }),
                    flat: new NumberField({ initial: 0 }),
                }),
                res: new SchemaField({
                    mod: new NumberField({ initial: 0.4 }),
                    flat: new NumberField({ initial: 0 }),
                }),
            })
        });

        schema.armour = new SchemaField({
            kin: this.AddValueField('value', 0),
            ele: this.AddValueField('value', 0),
            bio: this.AddValueField('value', 0),
            arc: this.AddValueField('value', 0)
        });

        return schema;
    }

    //==========================================================================================
    //>- Prepare Data
    //==========================================================================================
    /**
     * Foundry data preperation goes as follows
     * DataModel prepareBaseData();
     * Document prepareBaseData();
     * EmbeddedDocument();
     * DataModel prepareDerivedData();
     * Document prepareDerivedData();
     * 
     * only prepareData(); and prepareEmbeddedDocuments(); need to call their supers for proper functionality
     * rest can be overidden and inherited as needed
     */

    prepareBaseData() {
        const { core, derived } = this.traits;

        for (const trait of Object.keys(core)) {
            core[trait].total = 0;
            core[trait].rank = 0;
            core[trait].noise = 0;
        }

        for (const trait of Object.keys(derived)) derived[trait].total = 0;

        //===================================================================================
        //> Bonus Fields
        //===================================================================================
        this.bonus = {
            TraitCore: {
                pow: 0,
                per: 0,
                pre: 0,
                hrt: 0,
                ref: 0,
                sav: 0,
                shi: 0,
            },
            TraitDerived: {
                init: {
                    mod: 0,
                    value: 0,
                    total: 0,
                },
                move: {
                    mod: 0,
                    value: 0,
                    total: 0,
                },
                def: {
                    mod: 0,
                    value: 0,
                    total: 0,
                },
                res: {
                    mod: 0,
                    value: 0,
                    total: 0,
                },
            },

            // Health modifiers
            hp: {
                value: 0,
                total: 0,
                mod: 0,
            },
            rest: {
                value: 0,
                total: 0,
                mod: 0,
            },
            lift: {
                value: 0,
                total: 0,
                mod: 0
            },

            // Bonus to attacks
            attackMelee: 0,
            attackRanged: 0,

            // Bonus to damage
            damageMelee: 0,
            damageRanged: 0,

            // Bonus to soaks
            armour: {
                kin: 0,
                ele: 0,
                bio: 0,
                arc: 0,
            }
        }

        //===================================================================================
        //> Calculation totals
        //===================================================================================
        this.armour.kin.total = 0;
        this.armour.ele.total = 0;
        this.armour.bio.total = 0;
        this.armour.arc.total = 0;
        super.prepareBaseData();
    }

    //===================================================================================================
    //>- Prepare Derived Data
    //===================================================================================================
    prepareDerivedData() {
        super.prepareDerivedData();
        const { core, derived } = this.traits;
        const bonus = this.bonus;
        const bc = bonus.TraitCore;
        const bd = bonus.TraitDerived;

        //===============================================================================================
        //>-- Get item related modifiers
        //===============================================================================================
        for (const item of this.parent.items.contents) item.prepareActorData(this);

        //===============================================================================================
        //>-- Core trait totals
        //===============================================================================================
        for (const trait of Object.keys(core)) {
            core[trait].total += core[trait].value + bc[trait];
            core[trait].rank += Math.max(Math.floor(core[trait].total / 10), 0);
        }

        //===============================================================================================
        //>-- Derived trait totals
        //===============================================================================================
        // Calculates derived traits for initative, move, defence, resolve, and max health
        derived.init.total += derived.init.flat + Math.ceil((core.sav.total + core.ref.total + bd.init.value) * (derived.init.mod + bd.init.mod)) + bd.init.total;
        derived.move.total += derived.move.flat + Math.ceil((((core.hrt.total + core.ref.total) / this.size.value) + bd.move.value) * (derived.move.mod + bd.move.mod)) + bd.move.total;
        derived.def.total += derived.def.flat + Math.ceil((core.pow.total + core.ref.total + bd.def.value) * (derived.def.mod + bd.def.mod)) + bd.def.total;
        derived.res.total += derived.res.flat + Math.ceil((core.hrt.total + core.pre.total + bd.res.value) * (derived.res.mod + bd.res.mod)) + bd.res.total;

        // Sets health range, MIN is included for use with the token resource bars and is always 0
        this.hp.max = Math.ceil(core.hrt.total * (this.hp.mod + bonus.HpMod)) + bonus.HpTotal + this.hp.flat;
        this.hp.min = 0;

        // calculates the ammount of health healed by resting
        if (this.rest) this.rest.total = Math.ceil(this.rest.mod * this.rest.value) + this.rest.flat;

        // Gets the characters wound state
        this.wound = utils.woundState(this.hp.value / this.hp.max);

        // Totals up the armour soaks
        for (const [key, soak] of Object.entries(this.armour)) soak.total += soak.value + bonus.armour[key];
    }

    getRollData() {
        const data = super.getRollData();
        // Adds trait data directly to the rolldata for easy access
        // such as @pow.rank or @def.total
        for (let [group, traits] of Object.entries(this.traits)) {
            for (let [trait, value] of Object.entries(traits)) {
                data[trait] = value;
            }
        }

        return data;
    }

    get isAlive() {
        return this.hp.value >= 0
    }

    get isDead() {
        return this.hp.value <= 0;
    }
}

//======================================================================================
//> Item Data Model
//======================================================================================
export class ItemDataModel extends SystemDataModel {
    static defineSchema() {
        const schema = {};

        schema.description = new HTMLField({ initial: "" });

        return schema;
    }

    prepareBaseData() {

    }

    prepareDerivedData() {

    }

    /**
     * Called as part of prepareDer
     * @param {ActorDataModel} ActorData 
     * @returns 
     */
    prepareActorData(ActorData) {
        if (!this.actor) console.error('No actor on this item?', this.actor);
        if (!this.actor) return false;
    }

    getRollData() {
        const actorData = this.actor?.getRollData();
        if (!this.actor) return null;
        console.log(actorData)
        const data = {
            ...actorData,
            ...utils.duplicate(this)
        }

        return data;
    }

    /**Quick reference to the actor getter of the parent document*/
    get actor() {
        return this.parent.actor;
    }

    async use(action) {

    }
}