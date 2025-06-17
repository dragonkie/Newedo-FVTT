import { ResourceField } from "../fields.mjs";
import { ItemDataModel } from "../abstract.mjs";
import { NEWEDO } from "../../config.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class AugmentData extends ItemDataModel {
    static defineSchema() {
        const schema = super.defineSchema();

        schema.installed = new BooleanField({ initial: false });
        schema.biofeedback = new NumberField({ initial: 0 });
        schema.rank = new ResourceField(1, 1, 5);

        schema.noise = new SchemaField(this.CoreTraitFields());

        return schema;
    }

    prepareDerivedData() {
        super.prepareDerivedData();
    }

    prepareActorData(ActorData) {
        const allowed = super.prepareActorData(ActorData) || true;
        if (!allowed) return false;
        if (!this.installed) return;

        for (const trait of Object.keys(this.noise)) ActorData.traits.core[trait].noise += this.noise[trait];
    }

    sheet_actions = () => {
        return [{
            label: NEWEDO.generic.equip,
            action: 'install',
            icon: 'fas microchip',
            condition: !this.installed,
        }, {
            label: 'Unequip',
            action: 'uninstall',
            icon: 'fas fa-circle-minus',
            condition: this.installed,
        }]
    }
}