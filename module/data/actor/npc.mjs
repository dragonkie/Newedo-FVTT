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