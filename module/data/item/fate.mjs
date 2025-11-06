import { ItemDataModel } from "../abstract.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class FateData extends ItemDataModel {
    static defineSchema() {
        const schema = super.defineSchema();


        schema.start = new NumberField({ initial: 0 });
        schema.chance = new NumberField({ initial: 0 });

        schema.linkID = new StringField({ initial: '', ...this.RequiredConfig })

        // Triggers to roll for this fate to be hooked onto
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

    async _preCreate(data, options, user) {
        const allowed = await super._preCreate() || true;
        if (!allowed) return false;

        // Check if this object already existed by looking for document stats
        if (!Object.hasOwn(data, '_stats')) {
            await this.updateSource({ linkID: foundry.utils.randomID() });
        }

        const actor = this.actor;
        if (actor && Object.hasOwn(data, 'system')) {
            for (const fate of actor.itemTypes.fate) {
                if ((fate.system.linkID != '' && fate.system.linkID == data.system.linkID) || data.name == fate.name) {
                    await fate.update({ system: { chance: fate.system.chance + data.system.chance } });
                    return false;
                }
            }
        }
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