import { ItemDataModel } from "../abstract.mjs";

import LOGGER from "../../helpers/logger.mjs";
import NewedoRoll from "../../helpers/dice.mjs";
import { NEWEDO } from "../../config.mjs";
import utils from "../../helpers/sysUtil.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class SkillData extends ItemDataModel {
    static defineSchema() {
        const schema = super.defineSchema();

        schema.trait = new StringField({
            initial: 'hrt', required: true, nullable: false, label: NEWEDO.generic.trait, choices: () => {
                let options = utils.duplicate(NEWEDO.traitsCore);
                for (const key of Object.keys(options)) options[key] = utils.localize(options[key]);
                return options;
            }
        });

        schema.isWeaponSkill = new BooleanField({ initial: false, required: true, nullable: false });
        schema.useTraitRank = new BooleanField({ initial: true, required: true, nullable: false });
        schema.slug = new StringField({ initial: '' });
        schema.ranks = new ArrayField(
            new NumberField({
                initial: 0,
                required: true,
                nullable: false
            }),
            {
                initial: [0, 0, 0, 0, 0],
                required: true,
                nullable: false
            }
        );

        return schema;
    }

    prepareDerivedData() {
        super.prepareDerivedData();

        if (this.slug === '') this.slug = this.parent.name.toLowerCase().replaceAll(' ', '');
    }

    prepareOwnerData(ActorData) {

    }

    async use() {
        this.roll();
    }

    getRollData() {
        LOGGER.debug('SkillData | getRollData');
        const data = super.getRollData();
        if (!data) return null;

        data.trait = data[this.trait];
        data.formula = {}
        data.formula.ranks = this.getRanks()
        data.formula.full = `${data.trait.rank}d10` + (data.formula.ranks != `+${data.formula.ranks}` ? '' : '');

        return data;
    }

    getTrait() {
        if (this.actor) return this.actor.system.traits.core[this.trait];
        return null;
    }

    getFormula() {
        if (!this.actor) return ``;
        let trait = this.getTrait();
        let ranks = this.getRanks();
        return `${trait.rank}d10+${ranks}`;
    }

    getRanks() {
        let dice = [];

        // check through all the skill ranks
        for (const r of this.ranks) {
            if (r != 0) { // make sure the rank isnt empty
                // check existing dice to add to a match if possible
                let found = false;
                for (const d of dice) {
                    if (d.faces == r) {
                        d.count += 1;
                        found = true;
                        break;
                    }
                }

                // if there wasnt a matching dice already, add a new one
                if (!found) {
                    dice.push({
                        count: 1,
                        faces: r
                    })
                }
            }
        }

        // sort the dice array to make it look pretty
        dice.sort((a, b) => a.faces - b.faces);

        // convert the grouped dice into the formula
        let f = '';
        for (const d of dice) {
            if (f != '') f += '+';
            f += `${d.count}d${d.faces}`;
        }
        return f;
    }

    /**
     * Updates a skill rank but moving the dice up or down a tier
     * @param {Event} event 
     * @returns 
     */
    async _cycleSkillDice(index, invert = false) {
        const ranks = this.ranks;

        if (!invert) {
            ranks[index] += 2;
            if (ranks[index] === 2 || ranks[index] === 10) ranks[index] += 2;
            else if (ranks[index] > 12) ranks[index] = 0;
        } else if (invert) {
            ranks[index] -= 2;
            if (ranks[index] === 2 || ranks[index] === 10) ranks[index] -= 2;
            else if (ranks[index] < 0) ranks[index] = 12;
        }

        return await this.parent.update({ system: { ranks: ranks } });
    }

    // Creates and rolls a NewedoRoll using this item, giving it the context that this is a skill roll
    async roll() {
        let rollData = this.getRollData();
        if (!rollData) return;

        const roll = new NewedoRoll({
            document: this.parent,
            title: this.parent.name,
            rollData: rollData
        });

        roll.AddPart([{
            type: '',
            label: NEWEDO.traitsCore[this.trait],
            value: `${rollData.trait.rank}d10`,
            active: this.useTraitRank
        }, {
            type: '',
            label: this.parent.name,
            value: this.getRanks()
        }]);

        await roll.evaluate();
        await roll.toMessage();

        return roll;
    }

    static TEMPLATES = {
        roll: () => `systems/${game.system.id}/templates/dialog/skill-roll.hbs`
    }
}