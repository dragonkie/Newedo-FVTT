import { ItemDataModel } from "../abstract.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField, ObjectField
} = foundry.data.fields;

export default class PathData extends ItemDataModel {
    static defineSchema() {
        const schema = super.defineSchema();
        schema.features = new ArrayField(this.FeatureField(), { initial: [] });

        // the active rank of this path, triggers level up prompts
        schema.rank = new NumberField({initial: 1, min: 1, max: 5, required: true, nullable: false});
        return schema;
    }

    prepareActorData(ActorData) {
        const allowed = super.prepareActorData(ActorData) || true;
        if (!allowed) return false;

        for (const feature of this.features) {
            if (ActorData.rank >= feature.unlock) {
                if (feature.type == 'trait') {
                    for (const [g, e] of Object.entries(feature.data)) {
                        for (const [k, v] of Object.entries(e)) {
                            ActorData.bonus[k] += v;
                        }
                    }
                } else if (feature.type == 'item') {

                } else if (feature.type == 'effect') {

                }
            }
        }

    }

    // Add rank 1 features as defaut when the path is added to a character
    async _preCreate() {
        await super._preCreate();
    }

    // When this item is updated, check the actors level against this one
    _onUpdate() {

    }
}