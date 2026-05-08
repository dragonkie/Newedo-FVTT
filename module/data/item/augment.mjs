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
        schema.noise = new SchemaField({
            hrt: new NumberField({ initial: 0 }),
            per: new NumberField({ initial: 0 }),
            pow: new NumberField({ initial: 0 }),
            pre: new NumberField({ initial: 0 }),
            ref: new NumberField({ initial: 0 }),
            sav: new NumberField({ initial: 0 })
        });

        return schema;
    }

    prepareDerivedData() {
        super.prepareDerivedData();
    }

    prepareActorData(ActorData) {
        const allowed = super.prepareActorData(ActorData) || true;
        if (!allowed) return false;
        if (!this.installed) return;
        console.log(ActorData)
        console.log(this.noise)
        for (const [key, trait] of Object.keys(this.noise)) {
            ActorData.traits.core[key].noise += trait;
        }
    }

    sheetActions(context) {
        return [{
            name: NEWEDO.ContextMenu.install,
            action: 'install',
            group: 'augment',
            icon: '<i class="fas fa-microchip"></i>',
            condition: !this.installed,
            callback: () => { }
        }, {
            name: NEWEDO.ContextMenu.uninstall,
            action: 'install',
            group: 'augment',
            icon: '<i class="fas fa-circle-minus"></i>',
            condition: this.installed,
            callback: () => { }
        },
        ...super.sheetActions(context)]
    }

    async use(action) {
        return this.parent.update({ system: { installed: !this.installed } });
    }
}