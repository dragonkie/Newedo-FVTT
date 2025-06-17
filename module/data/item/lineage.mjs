import { ActorDataModel, ItemDataModel } from "../abstract.mjs";
import { NEWEDO } from "../../config.mjs";
import NewedoDialog from "../../applications/dialog.mjs";
import utils from "../../helpers/sysUtil.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class LineageData extends ItemDataModel {
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

        schema.cultures = new ArrayField(new SchemaField({
            uuid: new StringField({ ...this.RequiredConfig, initial: '' })
        }), { ...this.RequiredConfig, initial: [] });

        return schema;
    }

    /** @override */
    prepareActorData(ActorData) {
        const allowed = super.prepareActorData(ActorData) || true;
        if (!allowed || !ActorData) return false;

        Object.keys(this.armour).forEach(k => ActorData.bonus.armour[k] += this.armour[k].value);
        Object.keys(this.traits.derived).forEach(k => {
            ActorData.bonus.TraitDerived[k].value += this.traits.derived[k].value;
            ActorData.bonus.TraitDerived[k].mod += this.traits.derived[k].mod;
        });
    }

    //==========================================================================================================
    //> preCreate
    //==========================================================================================================
    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user) || true;
        if (!allowed) return false;

        console.log(data)
        console.log(options)
        console.log(user)

        const actor = this.actor;
        if (actor) {
            //==================================================================================================
            //>- Limit to one lineage on an actor
            //==================================================================================================
            if (actor.itemTypes.lineage.length > 0) {
                utils.warn('NEWEDO.Warn.OneLineagePerActor');
                return false;
            }

            //==================================================================================================
            //>- Add culture from lineage
            //==================================================================================================
            if (actor.itemTypes.culture.length == 0) {
                let confirm = await NewedoDialog.confirm({
                    content: "This actor doesn't have a culture, would you like to select one?",
                    modal: true
                });

                if (confirm) {
                    // get the list of choices
                    const choices = {};
                    for (const option of this.cultures) {
                        const item_data = await fromUuid(option.uuid);
                        if (!item_data) continue;
                        choices[option.uuid] = item_data.name;
                    }

                    await new Promise(async (resolve, reject) => {
                        // prepares the dialog contents
                        let content = '<div class="newedo">';
                        content += `<div>Please select your culture.</div>`
                        content += new foundry.data.fields.StringField({
                            blank: true, initial: '', choices: choices
                        }).toFormGroup({}, { classes: ['edo-culture-select'] }).outerHTML;

                        content += `</div>`
                        let app_culture = await new NewedoDialog({
                            content: content,
                            modal: true,
                            buttons: [{
                                label: 'Confirm',
                                action: 'confirm',
                                icon: 'fas fa-check'
                            }, {
                                label: 'Cancel',
                                action: 'cancel',
                                icon: 'fas fa-xmark'
                            }],
                            submit: async (result) => {
                                if (result != 'confirm') return reject();
                                const ele = app_culture.element;
                                const uuid = ele.querySelector('.edo-culture-select').value
                                const culture = await fromUuid(uuid);
                                if (!culture) return;

                                const itemData = culture.toObject();
                                const modification = {
                                    "-=_id": null,
                                    "-=ownership": null,
                                    "-=folder": null,
                                    "-=sort": null
                                };
                                foundry.utils.mergeObject(itemData, modification, { performDeletions: true });
                                await actor.createEmbeddedDocuments(culture.documentName, [itemData], {});
                                resolve();
                            },
                            close: () => { resolve() }
                        }).render(true);
                    })
                }
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