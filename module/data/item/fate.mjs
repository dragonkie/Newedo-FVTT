import { ItemDataModel } from "../abstract.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class FateData extends ItemDataModel {
    static defineSchema() {
        const schema = super.defineSchema();


        schema.start = new NumberField({ initial: 0 });
        schema.chance = new NumberField({ initial: 0 });

        // Boolean flags to trigger / enable reaction rolling of this fate, potentially automatically
        schema.triggers = new SchemaField({
            attackMelee: new BooleanField({ initial: false }),
            attackRange: new BooleanField({ initial: false }),
            hitMelee: new BooleanField({ initial: false }),
            hitRange: new BooleanField({ initial: false }),
            damagedMelee: new BooleanField({ initial: false }),
            damagedRange: new BooleanField({ initial: false }),
            healthGain: new BooleanField({ initial: false }),
            healthLost: new BooleanField({ initial: false }),
            spellCast: new BooleanField({ initial: false })
        });

        return schema;
    }

    prepareActorData(ActorData) {
        const allowed = super.prepareActorData(ActorData) || true;
        if (!allowed) return false;
    }

    prepareDerivedData() {
        super.prepareDerivedData();

        this.end = Math.max(this.start + this.chance - 1, 0);
    }
}