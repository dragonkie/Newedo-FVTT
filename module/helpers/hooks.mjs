import LOGGER from "./logger.mjs";
import utils from "./sysUtil.mjs";

export default function registerHooks() {

    //==========================================================================================
    //> Hook once 'ready'
    //==========================================================================================
    Hooks.once("ready", async () => {
        // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to

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
        console.log('actorDirectory', element)
        let ele = element.querySelector('.directory-footer.action-buttons');
        let btn = document.createElement('BUTTON');
        btn.innerHTML = utils.localize('NEWEDO.Button.CharacterCreator');
        ele.appendChild(btn);
        btn.addEventListener('click', async () => { });
    })
}