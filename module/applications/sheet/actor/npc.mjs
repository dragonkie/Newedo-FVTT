import NewedoActorSheet from "../actor.mjs";
import NewedoDialog from "../../dialog.mjs";
import utils from "../../../helpers/utils.mjs";
import { NEWEDO } from "../../../config.mjs";

export default class NpcSheet extends NewedoActorSheet {
    static DEFAULT_OPTIONS = {
        classes: ["npc"],
        position: { height: 600, width: 700, top: 100, left: 200 },
        actions: {
            editSkills: this._onEditSkills,
            createAttack: this._onCreateAttack,
            editAttack: this._onEditAttack,
            deleteAttack: this._onDeleteAttack
        }
    }

    static PARTS = {
        main: { template: "systems/newedo/templates/actor/npcv2/main.hbs" }
    }

    static TABS = {
        traits: { id: "traits", group: "primary", label: "NEWEDO.Generic.Trait.plrl" },
        equipment: { id: "equipment", group: "primary", label: "NEWEDO.Generic.Equipment" },
        augments: { id: "augments", group: "primary", label: "NEWEDO.Generic.Augments" },
        magic: { id: "magic", group: "primary", label: "NEWEDO.Generic.Magic" },
    }

    tabGroups = {
        primary: "traits"
    }

    async _prepareContext() {
        const context = await super._prepareContext();
        for (const [key, attack] of Object.entries(context.system.attacks)) {
            attack.formula = "";
            attack.avg_damage = 0;
            attack.avg_accuracy = 0;

            for (const [key, part] of Object.entries(attack.damage_parts)) {
                if (part.value && part.value != "") attack.formula += (attack.formula != "" ? "+" : "") + part.value;
            }

            // compile a simple version of the damage formula
            attack.formula = attack.formula.replaceAll(/\s+/g, "").replaceAll(/(\+\+|\-\-)/g, "+").replaceAll(/(\-\-|\+\-|\-\+)/g, "-");

            // for fun, check what the average damage roll is
            const parts = attack.formula.match(/([+-]?[0-9]+d[0-9]+|[-+]?[0-9]+)/g);
            for (var part of parts) {
                console.log(part)
                const negative = part.includes("-");
                part = part.replace("-", "");
                if (part.includes("d")) {
                    var [count, faces] = part.split("d");
                    var value = (Number(faces) / 2 + 0.5) * Number(count)
                    console.log({ num: value, count, faces })
                    if (negative) attack.avg_damage -= value;
                    else attack.avg_damage += value;
                } else {
                    console.log({ num: Number(part) })
                    attack.avg_damage += Number(part);
                }
            }

        }

        return context;
    }

    static async _onEditSkills(event, target) {
        const context = { doc: this.document, system: this.document.system };
        const content = await utils.renderTemplate(NEWEDO.templates.dialog.npcSkillEditor, context);
        const doc = this.document;
        const app = await new NewedoDialog({
            content: content,
            classes: ['newedo'],
            window: {
                resizeable: false,
                minimizable: false,
                title: 'NEWEDO.Dialog.SkillConfig'
            },
            buttons: [{
                action: 'confirm',
                label: 'Confirm',
                icon: 'fas fa-check',
                default: true
            }, {
                action: 'cancel',
                label: 'Cancel',
                icon: 'fas fa-xmark'
            }],
            actions: {
                create: () => {
                    const id = foundry.utils.randomID();
                    const skill = document.createElement('div');
                    skill.innerHTML = `
                        <div class="flexrow flex-gap-m">
                            <input type="text" name="system.skills.${id}.name" value="New Skill">
                            <input type="number" name="system.skills.${id}.rank" value="1">
                        </div>
                    `;
                    app.element.querySelector('.edo-skill-list').appendChild(skill);
                    doc.update({ [`system.skills.${id}`]: { name: "New Skill", rank: 1 } })
                }
            },
            submit: (result) => {
                if (result !== 'confirm') return;
                const data = {};
                for (const input of app.element.querySelectorAll('[name]')) {
                    data[input.name] = input.value;
                }
                this.document.update(data);
            }
        }).render(true);
    }

    static async _onCreateAttack(event, target) {
        await this.document.update({
            system: {
                attacks: {
                    [foundry.utils.randomID()]: {
                        name: "New Attack",
                        img: "icons/svg/sword.svg",
                        skill: "",
                        trait: "pow",
                        bonus: "",
                        damage_parts: {
                            [foundry.utils.randomID()]: {
                                value: "1d6",
                                type: "kin"
                            }
                        }
                    }
                }
            }
        });

        const fn = NpcSheet._onEditAttack.bind(this);
        return fn(event, target);
    }

    static async _onDeleteAttack(event, target) {
        const id = target.closest('[data-attack-id]').dataset.attackId;
        this.document.update({
            [`system.attacks.${id}`]: _del
        }, { recursive: true, applyOperators: true });
    }

    static async _onEditAttack(event, target) {
        const id = target.closest('[data-attack-id]').dataset.attackId;
        const attack = this.document.system.attacks[id];
        const context = await this._prepareContext();
        context.attack = attack;
        context.attack_id = id;
        context.attack_path = "attacks." + id;
        context.attack_field = context.system.schema.getField(`attacks.${id}`);
        const content = await utils.renderTemplate(NEWEDO.templates.dialog.npcAttackEditor, context);
        const dialog = await new NewedoDialog({
            id: "Actor." + this.document.uuid + ".Attacks." + id,
            content: content,
            classes: ['newedo'],
            buttons: [{ label: "##Submit", action: "submit" }],
            actions: {
                new: () => {
                    const list = dialog.element.querySelector('.edo-damage-parts');
                    const ele = document.createElement("div");
                    const part_id = foundry.utils.randomID();
                    ele.innerHTML = `
                    <div class="form-fields">
                        <input type="text" name="system.attacks.${id}.damage_parts.${part_id}.value" value="">
                        <select name="system.attacks.${id}.damage_parts.${part_id}.type">
                            <option value="">Kinetic</option>
                            <option value="">Elemental</option>
                            <option value="">Biological</option>
                            <option value="">Arcane</option>
                        </select>
                    </div>
                    `;

                    list.appendChild(ele);
                }
            },
            submit: (result, dialog) => {
                if (result != 'submit') return;

                const update = {};
                for (const ele of dialog.element.querySelectorAll("[name]")) {
                    update[ele.name] = ele.value;
                }
                console.log(update)
                this.document.update(update, { recursive: true });
            },
        }).render(true);
    }

    static async _onCreateSkill() {

    }

    static async _onDeleteSkill() {

    }

    static async _onEditSkill() {

    }
}    