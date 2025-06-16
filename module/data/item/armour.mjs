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

        schema.soak = new SchemaField({
            kin: new NumberField({ initial: 0, required: true, nullable: false, label: NEWEDO.damageTypes.kin }),
            ele: new NumberField({ initial: 0, required: true, nullable: false, label: NEWEDO.damageTypes.ele }),
            bio: new NumberField({ initial: 0, required: true, nullable: false, label: NEWEDO.damageTypes.bio }),
            arc: new NumberField({ initial: 0, required: true, nullable: false, label: NEWEDO.damageTypes.arc })
        });

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

        for (const soak of Object.keys(this.soak)) ActorData.bonus.armour[soak] += this.soak[soak];
    }

    get isEquipped() {
        return this.equipped == true;
    }

    sheet_actions = () => {
        return [{
            label: NEWEDO.generic.equip,
            action: 'equip',
            icon: 'fas fa-briefcase-blank',
            condition: !this.equipped,
        }, {
            label: 'Unequip',
            action: 'equip',
            icon: 'fas fa-briefcase-blank',
            condition: this.equipped,
        }]
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