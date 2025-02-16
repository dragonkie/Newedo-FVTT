import NewedoRoll from "../../helpers/dice.mjs";
import LOGGER from "../../helpers/logger.mjs";
import sysUtil from "../../helpers/sysUtil.mjs";
import { ItemDataModel } from "../abstract.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class RoteData extends ItemDataModel {
    static defineSchema() {
        const schema = super.defineSchema();

        schema.rank = new NumberField({ initial: 1 });
        schema.range = new NumberField({ initial: 1 });
        schema.cost = new NumberField({ initial: 1 });
        schema.duration = new SchemaField({
            value: new NumberField({ initial: 1, required: true, nullable: false }),
            increments: new StringField({ initial: 'instant', required: true, nullable: false })
        });
        schema.skill = new SchemaField({
            slug: new StringField({ initial: 'arcana' }),
            id: new StringField({ initial: '' })
        });
        schema.tn = new NumberField({ initial: 5 });
        schema.action = new StringField({ initial: 'full' });

        schema.rules = new SchemaField({
            rollRange: new SchemaField({
                active: new BooleanField({ initial: false }),
            }),
            rollDuration: new SchemaField({
                active: new BooleanField({ initial: false }),
            }),
            rollPotency: new SchemaField({
                active: new BooleanField({ initial: false }),
            })
        })

        return schema;
    }

    prepareDerivedData() {
        super.prepareDerivedData();

        if (this.actor) {
            if (this.skill.id != '') {
                this.skill.label = this.actor.items.get(this.skill.id).name;
            }
        }
    }

    getRollData() {
        LOGGER.debug('RoteData | getRollData');
        const data = super.getRollData();
        if (!data || !this.actor) return null;

        data.trait = this.actor.system.traits.core.shi;

        return data;
    }

    getSkill() {
        if (this.actor) {
            if (this.skill.id != '') {
                // Gets the linked item
                return this.actor.items.get(this.skill.id);
            } else {
                // If there isn't a linked item, we grab the first available skill and use it until otherwise assigned
                this.skill.id = this.actor.itemTypes.skill[0].id;
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

        if (!skill) return;

        const roll = new NewedoRoll({
            title: this.parent.name,
            actor: actor,
            data: rollData
        });

        roll.AddPart([{
            type: "NEWEDO.generic.trait",
            label: "NEWEDO.trait.core.shi",
            value: `${actor.system.traits.core.shi.rank}d10`
        }, {
            type: "NEWEDO.generic.skill",
            label: skill.name,
            value: skill.system.getRanks()
        }]);

        await roll.evaluate();

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
        return await roll.toMessage(messageData);
    }

    static TEMPLATES = {
        rollCasting: `systems/newedo/templates/dialog/rote-roll.hbs`
    }
}