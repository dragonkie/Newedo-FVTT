import { NEWEDO } from "../../config.mjs";
import utils from "../../helpers/sysUtil.mjs";
import { ItemDataModel } from "../abstract.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class LineageData extends ItemDataModel {
    static defineSchema() {
        const schema = super.defineSchema();

        const traits_core = {};
        const traits_derived = {};
        for (const trait of Object.keys(NEWEDO.traitsCore)) traits_core[trait] = new SchemaField({
            value: new NumberField({ initial: 0, ...this.RequiredIntegerConfig, label: utils.localize(NEWEDO.traitsCore[trait]) })
        })

        for (const trait of Object.keys(NEWEDO.traitsDerived)) traits_derived[trait] = new SchemaField({
            value: new NumberField({ initial: 0, ...this.RequiredIntegerConfig, label: utils.localize(NEWEDO.traitsDerived[trait]) }), // Added before multiplier
            mod: new NumberField({ initial: 0, ...this.RequiredConfig, label: utils.localize(NEWEDO.traitsDerived[trait]) }), // the multiplier
        })

        schema.traits = new SchemaField({
            core: new SchemaField(traits_core),
            derived: new SchemaField(traits_derived)
        });

        schema.lift = new SchemaField({
            value: new NumberField({ initial: 0 }),
            mod: new NumberField({ initial: 0 })
        });

        schema.rest = new SchemaField({
            value: new NumberField({ initial: 0 }),
            mod: new NumberField({ initial: 0 })
        });

        schema.armour = new SchemaField({
            kin: this.AddValueField('value', 0),
            ele: this.AddValueField('value', 0),
            bio: this.AddValueField('value', 0),
            arc: this.AddValueField('value', 0)
        });

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

        schema.cultures = new ArrayField(new SchemaField({
            uuid: new StringField({ ...this.RequiredConfig, initial: '' })
        }), { ...this.RequiredConfig, initial: [] });

        return schema;
    }
}