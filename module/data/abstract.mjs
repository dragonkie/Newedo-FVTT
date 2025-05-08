
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

    getRollData() {
        // Get owning documents rolldata
        let data = { ...this };
        return data;
    }

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
            value: new NumberField({ initial: 10, ...this.RequiredIntegerConfig })
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

        schema.bonus = new SchemaField({
            TraitCore: new SchemaField({
                pow: new NumberField({ initial: 0 }),
                per: new NumberField({ initial: 0 }),
                pre: new NumberField({ initial: 0 }),
                hrt: new NumberField({ initial: 0 }),
                ref: new NumberField({ initial: 0 }),
                sav: new NumberField({ initial: 0 }),
                shi: new NumberField({ initial: 0 }),
            }),
            // Bonus to core trait totals, added after all other modifiers
            PowTotal: new NumberField({ initial: 0 }),
            PerTotal: new NumberField({ initial: 0 }),
            PreTotal: new NumberField({ initial: 0 }),
            HrtTotal: new NumberField({ initial: 0 }),
            RefTotal: new NumberField({ initial: 0 }),
            SavTotal: new NumberField({ initial: 0 }),
            ShiTotal: new NumberField({ initial: 0 }),
            DefTotal: new NumberField({ initial: 0 }),
            InitTotal: new NumberField({ initial: 0 }),
            MoveTotal: new NumberField({ initial: 0 }),
            ResTotal: new NumberField({ initial: 0 }),

            // Bonus to core trait ranks, very op
            PowRank: new NumberField({ initial: 0 }),
            PerRank: new NumberField({ initial: 0 }),
            PreRank: new NumberField({ initial: 0 }),
            HrtRank: new NumberField({ initial: 0 }),
            RefRank: new NumberField({ initial: 0 }),
            SavRank: new NumberField({ initial: 0 }),
            ShiRank: new NumberField({ initial: 0 }),

            // Bonus to derived trait base values (these bonuses are applied before the modifier is calculated)
            DefBase: new NumberField({ initial: 0 }),
            ResBase: new NumberField({ initial: 0 }),
            InitBase: new NumberField({ initial: 0 }),
            MoveBase: new NumberField({ initial: 0 }),

            // Bonus to derived trait mods
            DefMod: new NumberField({ initial: 0 }),
            ResMod: new NumberField({ initial: 0 }),
            InitMod: new NumberField({ initial: 0 }),
            MoveMod: new NumberField({ initial: 0 }),

            // Health modifiers
            HpBase: new NumberField({ initial: 0 }),
            HpTotal: new NumberField({ initial: 0 }),
            HpMod: new NumberField({ initial: 0 }),
            RestMod: new NumberField({ initial: 0 }),
            LiftMod: new NumberField({ initial: 0 }),

            // Bonus to attacks
            attackMelee: new NumberField({ initial: 0 }),
            attackRanged: new NumberField({ initial: 0 }),

            // Bonus to damage
            damageMelee: new NumberField({ initial: 0 }),
            damageRanged: new NumberField({ initial: 0 }),

            // Bonus to soaks
            SoakKin: new NumberField({ initial: 0 }),
            SoakEle: new NumberField({ initial: 0 }),
            SoakBio: new NumberField({ initial: 0 }),
            SoakArc: new NumberField({ initial: 0 }),
        })

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
        const bonus = this.bonus;

        for (const trait of Object.keys(core)) {
            core[trait].total = 0;
            core[trait].rank = 0;
        }

        for (const trait of Object.keys(derived)) derived[trait].total = 0;

        this.armour.kin.total = 0;
        this.armour.ele.total = 0;
        this.armour.bio.total = 0;
        this.armour.arc.total = 0;
        super.prepareBaseData();
    }

    //============================================================
    //>- Prepare Derived Data
    //============================================================
    prepareDerivedData() {
        super.prepareDerivedData();
        const { core, derived } = this.traits;
        const bonus = this.bonus;

        for (const item of this.parent.items.contents) item.prepareOwnerData(this);

        // Totals up core stats
        for (const trait of Object.keys(core)) {
            core[trait].total += core[trait].value + bonus.TraitCore[trait];
            core[trait].rank += Math.max(Math.floor(core[trait].total / 10), 0);
        }

        // Calculates derived traits for initative, move, defence, resolve, and max health
        derived.init.total += derived.init.flat + Math.ceil((core.sav.total + core.ref.total + bonus.InitBase) * (derived.init.mod + bonus.InitMod)) + bonus.InitTotal;
        derived.move.total += derived.move.flat + Math.ceil((((core.hrt.total + core.ref.total) / this.size.value) + bonus.MoveBase) * (derived.move.mod + bonus.MoveMod)) + bonus.MoveTotal;
        derived.def.total += derived.def.flat + Math.ceil((core.pow.total + core.ref.total + bonus.DefBase) * (derived.def.mod + bonus.DefMod)) + bonus.DefTotal;
        derived.res.total += derived.res.flat + Math.ceil((core.hrt.total + core.pre.total + bonus.ResBase) * (derived.res.mod + bonus.ResMod)) + bonus.ResTotal;

        // Sets health range, MIN is included for use with the token resource bars and is always 0
        this.hp.max = Math.ceil(core.hrt.total * (this.hp.mod + bonus.HpMod)) + bonus.HpTotal + this.hp.flat;
        this.hp.min = 0;

        // calculates the ammount of health healed by resting
        if (this.rest) this.rest.total = Math.ceil(this.rest.mod * this.rest.value) + this.rest.flat;

        // Gets the characters wound state
        this.wound = utils.woundState(this.hp.value / this.hp.max);

        // Totals up the armour soak values
        this.armour.kin.total += this.armour.kin.value + bonus.SoakKin;
        this.armour.ele.total += this.armour.ele.value + bonus.SoakEle;
        this.armour.bio.total += this.armour.bio.value + bonus.SoakBio;
        this.armour.arc.total += this.armour.arc.value + bonus.SoakArc;
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
     * Called by an owning actor to augment itself with data provided by this item
     * @param {ActorDataModel} ActorData The owning NewedoActorDocument
     */
    prepareOwnerData(ActorData) {

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