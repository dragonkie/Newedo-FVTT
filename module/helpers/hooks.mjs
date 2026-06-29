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

    //==========================================================================================================
    //> Developer links
    //==========================================================================================================
    Hooks.on('rebderSettings', async (settings, html, context, options) => {
        try {
            const section = document.createElement('section');
            section.classList.add('flexcol');

            // create the divider header
            const divider = document.createElement('h4');
            divider.classList.add('divider');
            divider.textContent = 'System Developer';

            // System github
            const git = document.createElement('a');
            git.href = 'https://github.com/dragonkie/Newedo-FVTT';
            git.classList.add('button');
            git.innerHTML = `<i class="fa-brands fa-github"></i> Github`;

            // Developers patreon
            /* DISABLED AS OF TIME OF COMMIT LETS HOPE I GET THE ACCOUNT BACK
            const patreon = document.createElement('a');
            patreon.href = 'https://www.patreon.com/cw/AstasArmoury';
            patreon.classList.add('button');
            patreon.innerHTML = `<i class="fa-brands fa-patreon"></i> Support us on Patreon`;
            */

            // Ko-fi link
            const kofi = document.createElement('a');
            kofi.href = 'https://ko-fi.com/dragonkie';
            kofi.classList.add('button');
            kofi.innerHTML = `<i class="fas fa-coffee"></i> Buy the devs a coffee`;

            // add everything together
            section.appendChild(divider);
            section.appendChild(git);
            section.appendChild(kofi);
            section.appendChild(patreon);

            // append it to the settings tab
            html.appendChild(section);
        } catch (err) {
            console.error('Failed to append developer support links');
        }
    });

    // Asking community for help because I want my patreon account back but they don't believe me :<
    Hooks.once('ready', async (settings, html, context, options) => {
        var banned = game.user.getFlag(game.system.id, 'ban_support');
        if (banned === undefined) {
            game.user.setFlag(game.system.id, 'ban_support', false);
            banned = false;
        } else if (banned) return;

        new PtaDialog({
            classes: ['pta'],
            id: "PTA.Developer.SupportMeGettingMyAccountBackQ_Q",
            modal: true,
            buttons: [{
                action: "finish",
                label: "Okay, now let me play!"
            }, {
                action: "ban",
                label: "Don't show again"
            }],
            content: `
                <div style="max-width: 500px;">
                    <p><b>Hello everyone!</b> You may not know me, but I'm <b>&#0193;sta</b>, the developer + maintainer of the PTA3 foundry system!</p>
                    <p>I hope you've been having fun and the system hasn't had toooo many bugs ^_^ (Yeah, I know there's a lot... I fixed like 60+ in this update alone)</p>
                    <p><b>Unfortunately, today I'm here to ask for help.</b></p>
                    <p>I've dedicated hundreds of hours over many years to developing multiple different foundry systems such as NewEdo, Tales from Myriad, and PTA3.</p>
                    <p>Trying and get more time to work on these projects and amke a career from my passion, I made a Patreon account like many developers do.</p>
                    <p>Shortly after opening the page a common scam on Patreon happened to me. Scammers with stolen credit cards used my account to make payments, then get refunds to collect the money.</p>
                    <p>My accounts authenticity came into question, since then I've been trying to get reinstated to no avail.</p>
                    <p>I didn't ever want to have to ask this of the community, but now it's gotten to the point where my account will go from deactivated to deleted if I can't prove my legitimacy.</p>
                    <p>I'm not a very social person and with no social media backing, so unfortunately my last chance is to ask the community to help tell Patreon that I'm a real person and not a scammer.</p>
                    <p>I'm <b>NOT</b> asking for money, but if you have the time and like what I do, please <b>email Patreon</b> and tell them my page <b>"&#0193;sta's Armoury"</b> is legitimate, I'm just bad at marketing. :< </p>
                    <b><a href="https://support.patreon.com/hc/en-us/requests/new">Patreon Support Email</a></b>
                    <b><a href="https://www.patreon.com/cw/AstasArmoury">Link to my now missing page U^U</a></b>
                    <p>Again, I'm so sorry to be asking this, I wish beyond anything else that I didn't have to, and I appreciate all of your support!</p>
                    <p>Happy gaming! - &#0193;sta</p>
                </div>
            `,
            submit: (result, dialog) => {
                if (result == "ban") game.user.setFlag(game.system.id, 'ban_support', true);
            }
        }).render(true)
    });
}