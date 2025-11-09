
import LOGGER from "../../helpers/logger.mjs";
import { ItemDataModel } from "../abstract.mjs";
import { ResourceField, PriceField, GritField } from "../fields.mjs";

import NewedoRoll from "../../helpers/dice.mjs";
import utils from "../../helpers/sysUtil.mjs";
import { NEWEDO } from "../../config.mjs";

const {
    ArrayField, BooleanField, IntegerSortField, NumberField, SchemaField, SetField, StringField
} = foundry.data.fields;

export default class WeaponData extends ItemDataModel {
    static defineSchema() {
        const schema = super.defineSchema();

        schema.price = new PriceField();
        schema.quality = new ResourceField(1, 1, 5, {});
        schema.skill = new SchemaField({
            linkID: new StringField({ initial: '', nullable: false, required: true })
        });
        schema.equipped = new BooleanField({ initial: false, required: true });

        schema.grit = new GritField();

        schema.damageParts = new ArrayField(new SchemaField({
            value: new StringField({ required: true, nullable: false, initial: '1d6' }),
            type: new StringField({
                required: true, nullable: false, initial: 'kin',
                choices: () => {
                    let data = { ...NEWEDO.damageTypes };
                    for (const a in data) data[a] = utils.localize(data[a]);
                    return data;
                }
            })
        }), {
            nullable: false, required: true, initial: [{
                value: '1d6',
                type: 'kin'
            }]
        })

        schema.ranged = new BooleanField({ initial: false });

        // Weapon ranges are either the melee/thrown ranges or short/long weapon ranges, only ranged weapons use the modifiers
        schema.range = new SchemaField({
            short: new NumberField({ initial: 10 }),
            long: new NumberField({ initial: 10 }),
            modShort: new NumberField({ initial: 3 }),
            modLong: new NumberField({ initial: 3 })
        })

        // Weapon magazine tracker, weapons with max of 1 should auto consume from their linked ammo item on attack rather than storing values here
        schema.ammo = new ResourceField(6, 0, 6);
        schema.burst = new SchemaField({
            active: new BooleanField({ initial: false, required: true, nullable: false }),
            roll: new NumberField({ initial: 2, required: true, nullable: false, min: 2 }),
            ammo: new NumberField({ initial: 0, required: true, nullable: false }),
        })

        return schema;
    }

    async _preCreate(data, options, user) {
        const allowed = super._preCreate(data, options, user) ?? true;
        if (!allowed) return false;

        this.updateSource({

        })
    }

    _calledRaise = 0;

    prepareBaseData() {
        super.prepareBaseData();
    }

    prepareActorData(ActorData) {
        const allowed = super.prepareActorData(ActorData) || true;
        if (!allowed) return false;
    }

    prepareDerivedData() {
        super.prepareDerivedData();

        // Corrects quality values
        if (this.quality.value > this.quality.max) this.quality.value = this.quality.max;
        if (this.quality.value < 1) this.quality.value = 1;

        // Corrects grit values
        this.grit.max = this.quality.value * 2;
        if (this.grit.value > this.quality.value * 2) this.grit.value = this.quality.value * 2;// Maximum grit is the quality of the weapon * 2
        if (this.grit.value < 0) this.grit.value = 0;// Minimum of 0 grit

        // If the grit modifiers are higher than what the grit allows, lowers them evenly until they are acceptable
        while (this.grit.atk + this.grit.dmg > this.grit.value / 2) {
            if (this.grit.atk > this.grit.dmg) this.grit.atk -= 1;
            else this.grit.dmg -= 1;
        }

        // Prep data relevant to skill
        if (this.actor && this.skill.linkID != '') {
            this.skill.label = this.getSkill()?.name;
        }
    }

    getRollData() {

        const data = super.getRollData();
        if (!data) return null;

        data.skill = this.getSkill();
        if (data.skill) data.trait = data.skill.system.getTrait();
        data.grit = this.grit;

        LOGGER.debug('WeaponData | getRollData', data);
        return data;
    }

    getSkill() {
        if (this.actor) {
            if (this.skill.linkID != '') {
                // Gets the linked item
                for (const skill of this.actor.items.contents) {
                    if (skill.system.linkID == this.skill.linkID) return skill;
                }
            } else {
                // If there isn't a linked item, we grab the first weapon skill available and use it until otherwise assigned
                for (const item of this.actor.items.contents) {
                    if (item.system.isWeaponSkill) {
                        this.skill.linkID = item.id;
                        return item;
                    }
                }
            }
        }
        return null;
    }

    // List of item controls to be added to their list on actor sheets
    sheetActions() {
        return [{
            label: NEWEDO.generic.reload,
            action: 'reload',
            icon: 'fas fa-arrow-rotate-left',
            condition: this.ammo.max > 0 && this.ranged
        }, {
            label: NEWEDO.generic.attack,
            action: 'attack',
            icon: 'fas fa-sword',
            condition: true,
        }, {
            label: NEWEDO.generic.damage,
            action: 'damage',
            icon: 'fas fa-droplet',
            condition: true,
        }, {
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
            case 'attack': return this._onAttack();
            case 'damage': return this._onDamage();
            case 'reload': return;
            default:
                LOGGER.error('Unknown weapon action: ', action);
                return null;
        }
    }

    async _onEquip() {
        LOGGER.debug('Weapon isEquipped changed to: ', !this.isEquipped);
        await this.parent.update({ 'system.equipped': !this.equipped });
    }

    //======================================================================================================
    //> Attack action
    //======================================================================================================
    async _onAttack() {
        // if there isnt an owning actor
        const actor = this.actor;
        if (!actor) return;

        // Spend ammo if this is ranged, or cancel the attack, only happens if enforcing ammo tracking
        const track_ammo = game.settings.get(game.system.id, 'trackAmmo');
        if (track_ammo && this.isRanged && this.ammo.max > 0) { // weapons with ammo max set to 0 or less dont require ammo, like bows
            const flag = this.parent.getFlag('newedo', 'burst_fire');
            const ammoUsed = flag ? this.burst.ammo : 1; // get the ammount of ammo to use
            // if we spend the ammo and go under 0, we cant make the attack, reaching 0 means we used last ammo and is fine
            if (this.ammo.value - ammoUsed < 0) return void utils.warn('NEWEDO.Warn.NoAmmo'); // if we dont have ammo, cancel by default
            this.parent.update({ 'system.ammo.value': this.ammo.value - ammoUsed })
        }

        // Gather relevant data
        const rollData = this.getRollData();
        const skill = rollData.skill;

        const useLegend = Object.hasOwn(this.actor.system, 'legend');

        const roll = new NewedoRoll({
            title: NEWEDO.generic.attack,
            document: this.parent,
            rollData: rollData,
            wounds: true,
            legend: useLegend,
            raise: true,
        });

        roll.AddTrait(rollData.skill.system.trait);

        roll.AddPart([{
            label: skill.name,
            value: skill.system.getRanks()
        }, {
            label: NEWEDO.generic.grit,
            value: this.grit.atk
        }]);

        const result = await roll.evaluate();

        LOGGER.debug('Roll options: ', roll);
        if (roll.cancelled) return;

        // Gets the list of targets and if they were hit or not, if they were in range, etc
        const userTargets = game.user.targets;
        const scene = game.scenes.get(game.user.viewedScene);
        let targets = [];

        let attacker = this.actor;
        let attacker_token = this.actor.token;
        if (!attacker_token) {
            for (let t of scene.tokens.contents) {
                if (t.actorId == this.actor.id) {
                    attacker_token = t;
                    break;
                }
            }
        }

        if (attacker_token && game.user.targets.size > 0) {
            for (const [token, t] of userTargets.entries()) {
                // prep a data object releveant to how we hit the target
                let data = {
                    hit: false,
                    name: token.actor.name,
                    uuid: token.actor.uuid,
                    def: token.actor.system.traits.derived.def.total,
                    size: token.actor.system.size.value,
                    dist: Math.sqrt(Math.pow(attacker_token.x - token.x, 2) + Math.pow(attacker_token.y - token.y, 2)) / scene.grid.size,
                    range: "short",
                    tn: 0,
                    raise: roll.options.raise * 5
                }

                // Checks if the attack hits
                if (this.ranged) {
                    data.tn = token.actor.system.size.value * this.range.modShort;
                    if (data.dist > this.range.short) data.tn = token.actor.system.size.value * this.range.modLong;
                } else data.tn = data.def;

                if (roll.total >= data.tn + data.raise) data.hit = true;

                // relevant targeting data like if the weapon is out of range, or in the long shot / thrown range
                if (data.dist > this.range.short) data.range = "long";
                else if (data.dist > this.range.long) data.range = "oor";

                targets.push(data);
            }
        }

        const messageData = {
            content: `<div>@UUID[${this.actor.uuid}] attacks with @UUID[${this.parent.uuid}]</div><br>`,
            speaker: foundry.documents.ChatMessage.getSpeaker({
                scene: undefined,
                token: this.actor.token,
                actor: this.actor,
            })
        };

        if (roll.options.raise > 0) {
            messageData.content += `<div>Raised <b>${roll.options.raise}</b> times, TN raised by <b>${roll.options.raise * 5}</b></div><br>`;
        }

        for (const t of targets) {
            messageData.content += `
            <div style="margin-bottom: 5px;">
                @UUID[${t.uuid}]: 
                <b style="color: ${t.hit ? "green" : "red"};">${t.hit ? "HIT" : "MISS"}</b> 
                TN ${t.tn + roll.options.raise * 5} ${t.range == "oor" ? "(Out of range)" : (t.range == "long" ? (this.ranged ? "(Long Range)" : "(Thrown)") : "")}
            </div>
            `;
        }

        messageData.content += await roll.render();

        messageData.content += `<input data-uuid="${this.parent.uuid}" class="damage-button" type="button" value="Damage">`;

        LOGGER.debug('Message Data: ', messageData);
        let msg = await roll.toMessage(messageData);

        const parts = [];

        msg.setFlag('newedo', 'attackData', {
            attacker: {
                actor: this.actor.uuid,
                token: this.actor.token
            },
            targets: targets,
            roll_parts: [],
            raises: roll.options.raise,
        })

        // if the user called an attack raise, we store the value in a flag so this weapons next damage roll recieves the boost
        // raise can also be stored in the data for an attack rolls message flag
        if (roll.options.raise > 0) this._calledRaise = roll.options.raise;

        //===============================================================================
        //>- Generate attack data
        //===============================================================================

        return roll;
    }

    getDamageParts() {
        return parts;
    }

    // newer version of the attack roll

    /**
     * @typedef {Object} AttackData
     * @prop {Number} [raises=0] - The number of raises called on the previous roll
     * @prop {}
     */

    //======================================================================================================
    //> Damage action
    //======================================================================================================
    /**
     * 
     * @param {*} attack 
     * @returns 
     */
    async _onDamage({ raises = 1 } = {}) {
        let attack = { ...arguments };
        // if there isnt an owning actor
        const actor = this.actor;
        if (!actor) return;

        // Gather relevant data
        const rollData = this.getRollData();
        if (!rollData) return null;

        const roll = new NewedoRoll({
            title: NEWEDO.generic.damage,
            document: this.parent,
            rollData: rollData,
        });

        // Add trait dice for non ranged attacks 
        if (!this.isRanged) roll.AddTrait('pow');

        // add weapon damage parts
        const options = [];
        for (const p of this.damageParts) {
            options.push({
                group: 'NEWEDO.Generic.WeaponDamage',
                type: p.type,
                label: 'Weapon',
                value: p.value
            })
        }

        options.push({
            type: this.damageParts[0].type,
            label: NEWEDO.generic.grit,
            value: this.grit.dmg
        });

        roll.AddPart(options);

        // adds raise dice if a raise was called
        if (attack?.raises > 0) {
            roll.AddPart({
                label: NEWEDO.generic.raise,
                value: `${attack.raises}d10`
            })
        } else {
            roll.raise = true;
        }

        await roll.evaluate();
        if (roll.cancelled) return;

        // COVNERT ROLL INTO CHAT CARD
        const messageData = {
            content: `<div>Damage dealt by ${this.parent.name}!</div>`,
            speaker: foundry.documents.ChatMessage.getSpeaker({
                scene: undefined,
                token: this.actor.token,
                actor: this.actor,
            })
        };

        // If we have data passed into the argument, that means this was called with targeting data
        if (attack.targets && Array.isArray(attack.targets) && attack.targets.length > 0) {
            const targets = [];
            messageData.content += `<div class="damage-data" data-attacker_token="${this.actor?.uuid}" data-damage-total="${roll.total}" data-damage-type="${this.damage.type}">`;

            for (const t of attack.targets) {
                targets.push(await fromUuid(t.uuid));

                messageData.content += `
                <div style="margin: 5px 0;">
                    @UUID[${t.uuid}]{${t.name}}
                    <a class="apply-damage" title="apply damage" data-target="${t.uuid}">
                        <b style="color: ${t.hit ? "green" : "red"};">${t.hit ? "HIT" : "MISS"}</b>
                        <i class="fa-solid fa-bolt"></i>
                    </a>
                </div>`;
            }

            messageData.content += `
            <div>
                <input class="apply-damage-all" type="button" value="${utils.localize('NEWEDO.chat.applyAllDamage')}">
                <input class="undo-damage-all" type="button" value="${utils.localize('NEWEDO.chat.undoAllDamage')}">
            </div>
            `;

            messageData.content += `</div>`;
        }
        messageData.content += await roll.render();

        return await roll.toMessage(messageData);
    }

    static TEMPLATES = {
        rollAttack: `systems/newedo/templates/dialog/weapon-attack.hbs`,
        rollDamage: `systems/newedo/templates/dialog/weapon-damage.hbs`
    }

    get isRanged() {
        return this.ranged == true;
    }

    get isEquipped() {
        return this.equipped == true;
    }
}