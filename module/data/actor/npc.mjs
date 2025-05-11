import { ActorDataModel } from "../abstract.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class NpcDataModel extends ActorDataModel {
    static defineSchema() {
        const schema = super.defineSchema();

        schema.rest = new SchemaField({
            mod: new NumberField({ initial: 2.0 }),
            value: new NumberField({ initial: 5, ...this.RequiredIntegerConfig }),
            flat: new NumberField({ initial: 0 }),
        });// 5 * rest hp healed on nap

        // Npc's need a rank for some abilities and spells, this gives us a place to store rank
        schema.rank = new NumberField({ initial: 1 });

        return schema;
    }

    get isAlive() {
        return this.hp.value >= 0
    }

    get isDead() {
        return this.hp.value <= 0;
    }

    prepareDerivedData() {
        super.prepareDerivedData();
    }
}