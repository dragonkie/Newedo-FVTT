import { NEWEDO } from "../../config.mjs";
import utils from "../../helpers/sysUtil.mjs";
import { ActorDataModel } from "../abstract.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class PetDataModel extends ActorDataModel {
    static defineSchema() {
        const schema = super.defineSchema();

        schema.lineage = new StringField({
            initial: "animal",
            blank: false,
            ...this.RequiredConfig,
            choices: () => {
                const options = utils.duplicate(NEWEDO.petTypes);
                for (const key of Object.keys(options)) options[key] = utils.localize(options[key]);
                return options;
            }
        });

        const traits_core = {};
        for (const trait of Object.keys(NEWEDO.traitsCore).sort()) {
            if (trait != 'shi') traits_core[trait] = new SchemaField({
                value: new NumberField({ initial: 6, ...this.RequiredIntegerConfig })
            })
        }

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

        schema.skills = new ArrayField(this.SkillField(), { ...this.RequiredConfig, initial: [] });

        return schema;
    }

    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user) ?? true;
        if (!allowed) return false;

        return true;
    }

    prepareDerivedData() {
        super.prepareDerivedData();
    }
}