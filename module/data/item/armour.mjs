import { PriceField } from "../fields.mjs";
import { ItemDataModel } from "../abstract.mjs";
import { NEWEDO } from "../../config.mjs";


const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class ArmourData extends ItemDataModel {
    static defineSchema() {
        const schema = super.defineSchema();

        schema.quality = new NumberField({ initial: 1 });
        schema.price = new PriceField();

        schema.equipped = new BooleanField({ initial: false, required: true, label: NEWEDO.generic.equipped });

        schema.soak = new SchemaField(this.ArmourFields());

        schema.conceal = new BooleanField({ initial: false });
        schema.fragile = new BooleanField({ initial: false });
        schema.stealth = new BooleanField({ initial: false });
        schema.intimidating = new BooleanField({ initial: false });

        return schema;
    }

    prepareDerivedData() {
        super.prepareDerivedData();
    }

    prepareActorData(ActorData) {
        const allowed = super.prepareActorData(ActorData) || true;
        if (!allowed) return false;
        if (!this.isEquipped) return;

        for (const soak of Object.keys(this.soak)) ActorData.bonus.armour[soak] += this.soak[soak].value;
    }

    get isEquipped() {
        return this.equipped == true;
    }

    sheetActions(context) {
        return [{
            name: NEWEDO.ContextMenu.equip,
            action: 'equip',
            group: 'equipment',
            icon: '<i class="fas fa-shirt"></i>',
            condition: !this.equipped,
            callback: () => this.parent.update({ system: { equipped: true } })
        }, {
            name: NEWEDO.ContextMenu.unequip,
            action: 'equip',
            group: 'equipment',
            icon: '<i class="fas fa-briefcase-blank"></i>',
            condition: this.equipped,
            callback: () => this.parent.update({ system: { equipped: false } })
        }, ...super.sheetActions(context)]
    }

    async use(action) {
        switch (action) {
            case 'equip': return this._onEquip();
            default:
                LOGGER.error('Unknown Armour action: ', action);
                return null;
        }
    }

    async _onEquip() {
        await this.parent.update({ 'system.equipped': !this.equipped });
    }
}