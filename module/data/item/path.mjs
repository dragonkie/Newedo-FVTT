import { ItemDataModel } from "../abstract.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField, ObjectField
} = foundry.data.fields;

const ItemFeature = () => {

}

const EffectFeature = () => {
    return new ObjectField({

    })
}

const TraitFeature = () => {

}

const FeatureField = () => {
    const opts = {
        required: true,
        nullable: false,
    }
    return new SchemaField({
        type: new StringField({ ...opts, initial: "item" }),
        label: new StringField({ ...opts, initial: "New Feature" }),
        unlock: new NumberField({ ...opts, initial: 0 }), // 0 or 1 all unlocked by default, else match path rank
        data: new ObjectField({
            initial: {},
            ...opts
        })
    })
}

export default class PathData extends ItemDataModel {
    static defineSchema() {
        const schema = super.defineSchema();
        schema.features = new ArrayField(FeatureField(), { initial: [] });
        return schema;
    }

    prepareOwnerData(ActorData) {

        for (const feature of this.features) {
            if (ActorData.legend.rank >= feature.unlock) {
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