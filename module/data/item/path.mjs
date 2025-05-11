import { ItemDataModel } from "../abstract.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField, ObjectField
} = foundry.data.fields;

export default class PathData extends ItemDataModel {
    static defineSchema() {
        const schema = super.defineSchema();
        schema.features = new ArrayField(this.FeatureField(), { initial: [] });
        return schema;
    }

    prepareOwnerData(ActorData) {

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
}