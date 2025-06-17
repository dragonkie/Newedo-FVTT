import { ItemDataModel } from "../abstract.mjs";
import { NEWEDO } from "../../config.mjs";
import utils from "../../helpers/sysUtil.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class CultureData extends ItemDataModel {
    static defineSchema() {
        const schema = super.defineSchema();

        schema.traits = new SchemaField(this.TraitFields());
        schema.armour = new SchemaField(this.ArmourFields());

        schema.attributes = new SchemaField({
            rest: new SchemaField({
                base: new NumberField({ ...this.RequiredConfig, initial: 0 }),// added before
                mod: new NumberField({ ...this.RequiredConfig, initial: 0 }),// multiplies the base
                bonus: new NumberField({ ...this.RequiredConfig, initial: 0 }),// added after
            }),
            lift: new SchemaField({
                base: new NumberField({ ...this.RequiredConfig, initial: 0 }),
                mod: new NumberField({ ...this.RequiredConfig, initial: 0 })
            }),
        })

        // List of linked items that are granted to an actor with this lineage
        schema.items = new ArrayField(new SchemaField({
            uuid: new StringField({ ...this.RequiredConfig, initial: '' })
        }), { ...this.RequiredConfig, initial: [] })

        return schema;
    }

    prepareActorData(ActorData) {
        const allowed = super.prepareActorData(ActorData) || true;
        if (!allowed) return false;

        Object.keys(this.armour).forEach(k => ActorData.bonus.armour[k] += this.armour[k].value);
        Object.keys(this.traits.derived).forEach(k => {
            ActorData.bonus.TraitDerived[k].mod += this.traits.derived[k].mod;
            ActorData.bonus.TraitDerived[k].value += this.traits.derived[k].value;
        })
    }

    //==========================================================================================================
    //> preCreate
    //==========================================================================================================
    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user) || true;
        if (!allowed) return false;

        const actor = this.actor;
        if (actor) {
            if (actor.itemTypes.culture.length > 0) {
                utils.warn('NEWEDO.Warn.OneCulturePerActor');
                return false;
            }

            //==================================================================================================
            //>- Add Items
            //==================================================================================================
            if (this.items.length > 0) {
                const itemList = [];
                for (const i of this.items) {
                    const item = await fromUuid(i.uuid);
                    const data = item.toObject();
                    const modification = {
                        "-=_id": null,
                        "-=ownership": null,
                        "-=folder": null,
                        "-=sort": null
                    };
                    foundry.utils.mergeObject(data, modification, { performDeletions: true });
                    itemList.push(data);
                }

                await actor.createEmbeddedDocuments('Item', itemList, {});
            }

            //==================================================================================================
            //>- Add core traits
            //==================================================================================================
            const updateData = actor.system.toObject();;
            for (const [key, trait] of Object.entries(this.traits.core)) {
                updateData.traits.core[key].value += this.traits.core[key].value;
            }

            await actor.update({ system: updateData });
        }
    }

    _onDelete(options, userId) {
        const actor = this.actor;
        if (actor) {
            const updateData = actor.system.toObject();

            for (const [key, trait] of Object.entries(this.traits.core)) {
                updateData.traits.core[key].value -= this.traits.core[key].value;
            }

            actor.update({ system: updateData });
        }
    }
}