import { NEWEDO } from "../../config.mjs";
import { ItemDataModel } from "../abstract.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class CultureData extends ItemDataModel {
    static defineSchema() {
        const schema = super.defineSchema();

        schema.traits = new SchemaField(this.TraitFields());
        schema.armour = new SchemaField(this.ArmourFields());

        schema.attributes = new SchemaField({
            rest: new SchemaField({
                base: new NumberField({ ...this.RequiredConfig, initial: 0 }),// added before
                mod: new NumberField({ ...this.RequiredConfig, initial: 0 }),// multiplies the base
                bonus: new NumberField({ ...this.RequiredConfig, initial: 0 }),// added after
            }),
            lift: new SchemaField({
                base: new NumberField({ ...this.RequiredConfig, initial: 0 }),
                mod: new NumberField({ ...this.RequiredConfig, initial: 0 })
            }),
        })

        // List of linked items that are granted to an actor with this lineage
        schema.items = new ArrayField(new SchemaField({
            uuid: new StringField({ ...this.RequiredConfig, initial: '' })
        }), { ...this.RequiredConfig, initial: [] })

        return schema;
    }

    prepareActorData(ActorData) {
        const allowed = super.prepareActorData(ActorData) || true;
        if (!allowed) return false;

        Object.keys(this.armour).forEach(k => ActorData.bonus.armour[k] += this.armour[k].value);
        Object.keys(this.traits.derived).forEach(k => {
            ActorData.bonus.TraitDerived[k].mod += this.traits.derived[k].mod;
            ActorData.bonus.TraitDerived[k].value += this.traits.derived[k].value;
        })
    }

    prepareDerivedData() {
        super.prepareDerivedData();
    }
}