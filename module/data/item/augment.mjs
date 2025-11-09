import { ResourceField } from "../fields.mjs";
import { ItemDataModel } from "../abstract.mjs";
import { NEWEDO } from "../../config.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class AugmentData extends ItemDataModel {
    static TraitFields() {
        const CoreData = {};
        for (const [k, v] of Object.entries(NEWEDO.traitsBase)) CoreData[k] = new SchemaField({ value: new NumberField({ initial: 10, ...this.RequiredConfig, label: v }) });
        return CoreData;
    }

    static defineSchema() {
        const schema = super.defineSchema();

        schema.installed = new BooleanField({ initial: false });
        schema.biofeedback = new NumberField({ initial: 0 });
        schema.rank = new ResourceField(1, 1, 5);
        schema.noise = new SchemaField(this.TraitFields());

        return schema;
    }

    prepareDerivedData() {
        super.prepareDerivedData();
    }

    prepareActorData(ActorData) {
        const allowed = super.prepareActorData(ActorData) || true;
        if (!allowed) return false;
        if (!this.installed) return;

        for (const trait of Object.keys(this.noise)) ActorData.traits.core[trait].noise += this.noise[trait].value;
    }

    sheetActions() {
        return [{
            label: NEWEDO.ContextMenu.install,
            action: 'edit',
            group: 'general',
            icon: 'fas fa-edit',
            condition: !this.installed,
            callback: () => { }
        }, {
            label: NEWEDO.ContextMenu.uninstall,
            action: 'delete',
            group: 'general',
            icon: 'fas fa-trash',
            condition: this.installed,
            callback: () => { }
        },
        ...super.sheetActions]
    }

    async use(action) {
        return this.parent.update({ system: { installed: !this.installed } });
    }
}