
import LOGGER from "../../helpers/logger.mjs";
import utils from "../../helpers/sysUtil.mjs";
import { ActorDataModel } from "../abstract.mjs";
import { ResourceField } from "../fields.mjs";
import { NEWEDO } from "../../config.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField, HTMLField,
} = foundry.data.fields;

export default class CharacterDataModel extends ActorDataModel {
    static defineSchema() {
        const schema = super.defineSchema();

        schema.legend = new SchemaField({
            min: new NumberField({ initial: 0 }),
            value: new NumberField({ initial: 0 }),
            max: new NumberField({ initial: 0 })
        });

        schema.xp = new SchemaField({
            value: new NumberField({ initial: 0 })
        });

        schema.rest = new SchemaField({
            mod: new NumberField({ initial: 2.0 }),
            value: new NumberField({ initial: 5, ...this.RequiredIntegerConfig }),
            flat: new NumberField({ initial: 0 }),
        });// 5 * rest hp healed on nap

        schema.money = new SchemaField({
            value: new NumberField({ initial: 0 }),
        });

        schema.background = new SchemaField({
            contacts: this.AddValueField(1),
            followers: this.AddValueField(1),
            soul: this.AddValueField(1),
            status: this.AddValueField(1),
            wealth: this.AddValueField(1),
        });

        const BioConfig = { initial: '', blank: true, required: false, nullable: true };
        schema.details = new SchemaField({
            age: new StringField({ ...BioConfig, label: 'NEWEDO.Generic.Age' }),
            gender: new StringField({ ...BioConfig, label: 'NEWEDO.Generic.Gender' }),
            height: new StringField({ ...BioConfig, label: 'NEWEDO.Generic.Height' }),
            weight: new StringField({ ...BioConfig, label: 'NEWEDO.Generic.Weight' }),
        })
        schema.description = new HTMLField({ ...BioConfig, label: 'NEWEDO.Generic.Description' });

        schema.priorities = new SchemaField({
            traits: new StringField({ ...BioConfig, label: 'NEWEDO.Generic.Trait.plrl' }),
            skills: new StringField({ ...BioConfig, label: 'NEWEDO.Generic.Skill.plrl' }),
            magic: new StringField({ ...BioConfig, label: 'NEWEDO.Generic.Magic' }),
            augments: new StringField({ ...BioConfig, label: 'NEWEDO.Generic.Augments' }),
            background: new StringField({ ...BioConfig, label: 'NEWEDO.Generic.Background.long' }),
        })

        return schema;
    }

    get isAlive() {
        return this.hp.value >= 0
    }

    get isDead() {
        return this.hp.value <= 0;
    }

    prepareBaseData() {
        super.prepareBaseData();
    }

    prepareDerivedData() {
        //==========================================================================================
        //> Derived Background Ranks
        //==========================================================================================
        for (let [key, bg] of Object.entries(this.background)) {
            bg.value = utils.clamp(bg.value, 0, 100);// Clamps the value to its range
            bg.rank = utils.backgroundRank(bg.value);// Calculates the rank of the background
        }

        //==========================================================================================
        //> Soul rank bonuses
        //==========================================================================================
        if (this.background.soul.rank >= 1) this.bonus.HrtTotal += 3;
        if (this.background.soul.rank >= 2) this.bonus.PreTotal += 3;
        if (this.background.soul.rank >= 3) this.bonus.PerTotal += 3;
        if (this.background.soul.rank >= 4) {
            this.bonus.SavTotal += 3;
            this.bonus.PreTotal += 3;
        }
        if (this.background.soul.rank >= 5) {
            this.bonus.SavTotal += 5;
            this.bonus.PowTotal += 5;
        }

        //calculates characters legend rank
        this.rank = utils.legendRank(this.legend.max);

        super.prepareDerivedData();
    }
}