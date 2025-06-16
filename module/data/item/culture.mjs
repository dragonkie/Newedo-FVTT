import { NEWEDO } from "../../config.mjs";
import { ItemDataModel } from "../abstract.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class CultureData extends ItemDataModel {
    static defineSchema() {
        const schema = super.defineSchema();

        schema.traits = new SchemaField({
            core: new SchemaField({
                pow: this.AddValueField('value', 0),
                per: this.AddValueField('value', 0),
                pre: this.AddValueField('value', 0),
                hrt: this.AddValueField('value', 0),
                ref: this.AddValueField('value', 0),
                sav: this.AddValueField('value', 0),
                shi: this.AddValueField('value', 0)
            }),
            derived: new SchemaField({
                init: new SchemaField({
                    value: new NumberField({ initial: 0 }),
                    mod: new NumberField({ initial: 0 })
                }),
                move: new SchemaField({
                    value: new NumberField({ initial: 0 }),
                    mod: new NumberField({ initial: 0 })
                }),
                def: new SchemaField({
                    value: new NumberField({ initial: 0 }),
                    mod: new NumberField({ initial: 0 })
                }),
                res: new SchemaField({
                    value: new NumberField({ initial: 0 }),
                    mod: new NumberField({ initial: 0 })
                }),
                hp: new SchemaField({
                    value: new NumberField({ initial: 0 }),
                    mod: new NumberField({ initial: 0 })
                })
            })
        });

        schema.lift = new SchemaField({
            value: new NumberField({ initial: 0 }),
            mod: new NumberField({ initial: 0 })
        });

        schema.rest = new SchemaField({
            value: new NumberField({ initial: 0 }),
            mod: new NumberField({ initial: 0 })
        });

        const ArmourData = {};
        for (const key of Object.keys(NEWEDO.damageTypes)) {
            ArmourData[key] = new NumberField({ initial: 0, label: NEWEDO.damageTypes[key] });
        }
        console.log(ArmourData);
        schema.armour = new SchemaField(ArmourData);

        return schema;
    }

    prepareActorData(ActorData) {
        const allowed = super.prepareActorData(ActorData) || true;
        if (!allowed) return false;

        for (const key of Object.keys(NEWEDO.damageTypes)) ActorData.bonus[key] += this.armour[key];
    }

    prepareDerivedData() {
        super.prepareDerivedData();
    }
}