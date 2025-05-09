import { NEWEDO } from "../../config.mjs";
import NewedoRoll from "../../helpers/dice.mjs";
import LOGGER from "../../helpers/logger.mjs";
import utils from "../../helpers/sysUtil.mjs";

import { ItemDataModel } from "../abstract.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class RoteData extends ItemDataModel {
    static defineSchema() {
        const schema = super.defineSchema();

        schema.rank = new NumberField({ initial: 1, label: NEWEDO.generic.rank });
        schema.range = new NumberField({ initial: 1, label: NEWEDO.generic.range });
        schema.cost = new NumberField({ initial: 1, label: NEWEDO.generic.cost });
        schema.duration = new SchemaField({
            value: new NumberField({ initial: 1, required: true, nullable: false }),
            increments: new StringField({ initial: 'instant', required: true, nullable: false })
        });
        schema.skill = new SchemaField({
            linkID: new StringField({ initial: '' })
        });
        schema.tn = new NumberField({ initial: 5, label: NEWEDO.generic.targetNumber });
        schema.action = new StringField({ initial: 'full' });

        // Optional toggles for the different ways a spell can roll its values
        // in this scenario, value is an additional modifier added to the divider of spells
        schema.rules = new SchemaField({
            rollRange: new SchemaField({
                active: new BooleanField({ initial: false }),
                value: new NumberField({ initial: 0 })
            }),
            rollDuration: new SchemaField({
                active: new BooleanField({ initial: false }),
                value: new NumberField({ initial: 0 })
            }),
            rollPotency: new SchemaField({
                active: new BooleanField({ initial: false }),
                value: new NumberField({ initial: 0 })
            })
        })

        return schema;
    }

    prepareDerivedData() {
        super.prepareDerivedData();
    }

    getRollData() {
        LOGGER.debug('RoteData | getRollData');
        const data = super.getRollData();
        if (!data || !this.actor) return data;

        data.trait = this.actor.system.traits.core.shi;
        data.skill = this.getSkill();

        return data;
    }

    getSkill() {
        if (this.actor) {
            if (this.skill.linkID != '') {
                // Gets the linked item
                for (const i of this.actor.items.contents) if (i.type == 'skill' && i.system.linkID == this.skill.linkID) return i;
            } else {
                // If there isn't a linked item, we grab the first available skill and use it until otherwise assigned
                this.skill.linkID = this.actor.itemTypes.skill[0].system.linkID;
                return this.actor.itemTypes.skill[0];
            }
        }
        return null;
    }

    async use(action) {
        return this._onCast();
    }

    async _onCast() {
        const actor = this.actor;
        if (!actor) return;

        const rollData = this.getRollData();
        const skill = this.getSkill();

        const roll = new NewedoRoll({
            title: this.parent.name,
            document: this.parent,
            rollData: rollData
        });

        roll.AddPart({
            type: '',
            label: utils.localize(NEWEDO.generic.trait) + ":" + utils.localize(NEWEDO.traitsCore.shi),
            value: `${actor.system.traits.core.shi.rank}d10`
        });

        if (skill) {
            roll.AddPart({
                type: '',
                label: skill.name,
                value: skill.system.getRanks()
            })
        }

        roll.AddLegend(this.actor);

        await roll.evaluate();

        // Pad rolldata out with new values from the roll
        rollData.cs = Math.ceil(roll.total / this.tn);
        rollData.roll = {
            total: roll.total
        }

        let messageData = { content: `` };
        messageData.content += `
        <b>${this.parent.name}</b>
        <div class="flexrow" style="background: rgba(0, 0, 0, 0.1); border-radius: 3px; border: 1px solid var(--color-border-light-2); margin-bottom: 5px; text-align: center; padding: 3px;">
            <div>
                Skill: <b>${skill.name}</b>
            </div>
            <div>
                Action: <b>${this.action}</b>
            </div>
        </div>
        <div class="flexrow" style="background: rgba(0, 0, 0, 0.1); border-radius: 3px; border: 1px solid var(--color-border-light-2); margin-bottom: 5px; text-align: center; padding: 3px;">
            <div class="flexrow">
                TN: <b>${this.tn}</b>
            </div>
            <div class="flexrow">
                CS: <b>${rollData.cs}</b>
            </div>
            <div class="flexrow">
                Cost: <b>${this.cost}</b>
            </div>
            <div class="flexrow">
                Range: <b>${this.range}</b>
            </div>
        </div>
        </div>
        <div>${this.description}</div>
        `;
        messageData.content += await roll.render();
        messageData.content = await foundry.applications.ux.TextEditor.enrichHTML(messageData.content, { rollData: rollData });
        console.log(rollData);
        return await roll.toMessage(messageData);
    }

    static TEMPLATES = {
        rollCasting: `systems/newedo/templates/dialog/rote-roll.hbs`
    }
}