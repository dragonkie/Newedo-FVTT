import { ActorDataModel } from "../abstract.mjs";

const {
    BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class VehicleDataModel extends ActorDataModel {
    static defineSchema() {
        const schema = super.defineSchema();
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