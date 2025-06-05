import { NEWEDO } from "../../config.mjs";
import { ActorDataModel } from "../abstract.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class NpcDataModel extends ActorDataModel {
    static defineSchema() {
        const schema = super.defineSchema();

        schema.rest = new SchemaField({
            mod: new NumberField({ initial: 2.0 }),
            value: new NumberField({ initial: 5, ...this.RequiredIntegerConfig }),
            flat: new NumberField({ initial: 0 }),
        });// 5 * rest hp healed on nap

        // Npc's need a rank for some abilities and spells, this gives us a place to store rank
        schema.rank = new NumberField({ initial: 1 });

        schema.skills = new ArrayField(this.SkillField(), { initial: [], ...this.RequiredConfig });

        return schema;
    }

    get isAlive() {
        return this.hp.value >= 0
    }

    get isDead() {
        return this.hp.value <= 0;
    }

    prepareDerivedData() {
        super.prepareDerivedData();
    }

    async _preCreate(data, options, user) {
        const allowed = await super._preCreate(data, options, user) ?? true;
        if (!allowed) return false;

        //==========================================================================================
        //> Populate default skills
        //==========================================================================================
        const skill_documents = [{
            linkID: 'NEWEDOATTACK',
            label: NEWEDO.generic.attack,
            trait: 'pow',
            ranks: [0, 0, 0, 0, 0]
        }];

        const SkillData = () => {
            return {
                linkID: '',
                label: '',
                trait: Object.keys(NEWEDO.traitsCore)[0],
                ranks: [0, 0, 0, 0, 0]
            }
        }

        //=======================================================================
        //>- Compendium skills
        //=======================================================================
        for (const pack of game.packs.contents) {
            if (pack.documentName != 'Item') continue;

            const documents = await pack.getDocuments();
            for (const doc of documents) {
                if (doc.type == 'skill') {
                    skill_documents.push(Object.assign(SkillData(), { linkID: doc.system.linkID, label: doc.name, trait: doc.system.trait }));
                }
            }
        }

        //=======================================================================
        //>- World skills
        //=======================================================================
        for (const item of game.items.contents) {
            if (item.type == 'skill') {
                skill_documents.push(Object.assign(SkillData(), { linkID: item.system.linkID, label: item.name, trait: item.system.trait }));
            }
        }

        //=======================================================================
        //>- Finalize skills
        //=======================================================================
        await this.updateSource({
            skills: skill_documents
        })

        return true;
    }
}