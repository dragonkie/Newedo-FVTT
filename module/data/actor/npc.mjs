import { NEWEDO } from "../../config.mjs";
import { ActorDataModel } from "../abstract.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class NpcDataModel extends ActorDataModel {
    static defineSchema() {
        const schema = super.defineSchema();
        // Npc's need a rank for some abilities and spells, this gives us a place to store rank
        schema.rank = new NumberField({ initial: 1 });

        /**
         * BIG CHANGES TO HOW WE HANDLE NPC SHEETS
         * so previously Npc sheets were just dummed down versions of the player sheets
         * they would use items, could install augments, cast spells, etc.
         * This was inefficient.
         * 
         * Npc sheets will now have all their details built into the data schemas
         * their spells, attacks, and features are now kept as items inside the scehma rather than
         * needing them to accomodate for all the different styles of item handling, especially
         * with the legend costs required on certain powers, or requirements for augments,
         * and changes in how the traits and baselines work between different actors
         * 
         * A lot of this sheet and scehma are based on the work done for the official daggerheart adaptation,
         * thanks to them for all their hard work!
         */

        schema.skills = new ArrayField(new SchemaField({
            name: new StringField({ initial: "New Skill", nullable: false, blank: false, placeholder: NEWEDO.generic.skill }),
            rank: new NumberField({ initial: 1, nullable: false, min: 0, label: NEWEDO.generic.rank })
        }), { initial: [], nullable: false });

        schema.attacks = new ArrayField(new SchemaField({
            name: new StringField({ initial: "Attack", nullable: false, blank: true }),
            skill: new StringField(),
            trait: this.TraitSelectorField(),
            bonus: this.FormulaField(),
            damage: new ArrayField(new SchemaField({
                value: this.FormulaField(),
                type: this.DamageTypeSelectorField()
            }), {
                nullable: false, required: true, initial: [{
                    value: '1d6',
                    type: 'kin'
                }]
            }),

            // Ranged attacks
            isRanged: new BooleanField(),
            ammo: new SchemaField({
                value: new NumberField({ initial: 8, min: 0, nullable: false, required: false }),
                max: new NumberField({ initial: 8, min: 0, nullable: false, required: false }),
            }),
            range: new SchemaField({
                melee: new SchemaField({
                    value: new NumberField(),
                    mod: new NumberField(),
                }),
                short: new SchemaField({
                    value: new NumberField(),
                    mod: new NumberField(),
                }),
                long: new SchemaField({
                    value: new NumberField(),
                    mod: new NumberField(),
                })
            })
        }));

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