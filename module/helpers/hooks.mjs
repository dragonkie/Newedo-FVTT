import LOGGER from "./logger.mjs";
import utils from "./sysUtil.mjs";

export default function registerHooks() {

    //==========================================================================================
    //> Hook once 'ready'
    //==========================================================================================
    Hooks.once("ready", async () => {

        //======================================================================================
        //>- repair broken skill links
        //======================================================================================
        // Fix world skill linking if things are messed up
        if (!game.settings.get(game.system.id, 'migrateSkillLinks')) {
            const WorldSkills = [];

            // Get custom world level skills
            for (const item of game.items) {
                if (item.type == 'skill' && item.system.linkID == "") WorldSkills.push(item)
            }

            // Get default skills from compendium packs
            for (const pack of game.packs.contents) {
                if (pack.documentName != 'Item') continue;
                for (const index of pack.index.contents) {
                    if (index.type != 'skill') continue;
                    const item = await (fromUuid(index.uuid));
                    WorldSkills.push(item);
                }
            }

            // Assign linkID to any skills that are missing them
            await WorldSkills.forEach(async (skill) => {
                if (skill.system.linkID == "") skill.update({ 'system.linkID': foundry.utils.randomID() })
            })

            // Update all skills on actors to match the new linking IDs
            for (const actor of game.actors.contents) {
                foundry.ui.notifications.notify('Updating skills for: ' + actor.name);
                actor.items.contents.forEach((item) => {
                    if (item.type == 'skill' && item.system.linkID == "") {
                        WorldSkills.forEach((skill) => {
                            if (skill.name == item.name) {
                                item.update({ 'system.linkID': skill.system.linkID });
                            }
                        })
                    }
                })
            }

            game.settings.set(game.system.id, 'migrateSkillLinks', true);
        }
        //======================================================================================
        //>- repair broken fate links
        //======================================================================================
        if (!game.settings.get(game.system.id, 'migrateFateLinks')) {
            const WorldFates = [];

            // Get custom world level skills
            for (const item of game.items) {
                if (item.type == 'fate' && item.system.linkID == "") WorldFates.push(item)
            }

            // Get default skills from compendium packs
            for (const pack of game.packs.contents) {
                if (pack.documentName != 'Item') continue;
                for (const index of pack.index.contents) {
                    if (index.type != 'fate') continue;
                    const item = await (fromUuid(index.uuid));
                    WorldFates.push(item);
                }
            }

            // Assign linkID to any skills that are missing them
            await WorldFates.forEach(async (fate) => {
                if (fate.system.linkID == "") fate.update({ 'system.linkID': foundry.utils.randomID() })
            })

            // Update all skills on actors to match the new linking IDs
            for (const actor of game.actors.contents) {
                foundry.ui.notifications.notify('Updating fates for: ' + actor.name);
                actor.items.contents.forEach((item) => {
                    if (item.type == 'fate' && item.system.linkID == "") {
                        WorldFates.forEach((fate) => {
                            if (fate.name == item.name) {
                                item.update({ 'system.linkID': fate.system.linkID });
                            }
                        })
                    }
                })
            }

            game.settings.set(game.system.id, 'migrateFateLinks', true);
        }
    });

    //==========================================================================================
    //> Hook 'renderChatMessageHTML'
    //==========================================================================================
    // Adds functionality to chat message buttons for combat
    Hooks.on('renderChatMessageHTML', (msg, element, data) => {
        // Link damage roll button
        element.querySelector('input.damage-button')?.addEventListener('click', async () => {
            const item = await fromUuid(element.querySelector('input.damage-button').dataset.uuid);
            if (item.type != 'weapon') return;

            let attackData = msg.getFlag('newedo', 'attackData');
            item.system._onDamage(attackData);
        });

        // Link damage application buttons
        for (const e of element.querySelectorAll('a.apply-damage')) {
            e.addEventListener('click', async () => {
                if (!game.user.isGM) return;
                let target = await fromUuid(e.dataset?.target);
                if (!target) return;

                let damage = {};
                let damageData = e.closest('.damage-data');
                let attacker = await fromUuid(damageData.dataset.attacker);
                damage.total = +damageData.dataset.damageTotal;
                damage.type = damageData.dataset.damageType;

                let damageCalc = document.createElement("div");
                damageCalc.style.display = "inline";
                let finalDamage = Math.max(damage.total - target.system.armour[damage.type].total, 0);
                damageCalc.textContent = `${finalDamage}`;

                target.update({ 'system.hp.value': target.system.hp.value - finalDamage });

                e.replaceWith(damageCalc);
            });
        };
    });

    //==========================================================================================
    //> Hook 'renderActorDirectory'
    //==========================================================================================
    Hooks.on('renderActorDirectory', async (directory, element, data) => {
        let ele = element.querySelector('.directory-footer.action-buttons');
        let btn = document.createElement('BUTTON');
        btn.innerHTML = utils.localize('NEWEDO.Button.CharacterCreator');
        ele.appendChild(btn);
        btn.addEventListener('click', async () => { });
    })
}