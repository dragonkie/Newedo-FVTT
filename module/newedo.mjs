// declate global helpers
globalThis.newedo = { id: 'newedo' };
newedo.paths = {
    system: `systems/${newedo.id}`,
    templates: `systems/${newedo.id}/templates`,
    assets: `systems/${newedo.id}/assets`,
    character: `systems/${newedo.id}/templates/actor/character`
};

//import configuration
import { NEWEDO } from "./config.mjs";
import registerHooks from "./helpers/hooks.mjs";
import registerSystemSettings from "./helpers/settings.mjs";

// Import helpers
import * as helpers from "./helpers/_module.mjs";
import { elements } from "./elements/_module.mjs";
import LOGGER from "./helpers/logger.mjs";
import sysUtil from "./helpers/sysUtil.mjs";

// Import submodules
import * as applications from "./applications/_module.mjs";
import * as documents from "./documents/_module.mjs";
import * as dataModels from "./data/_module.mjs"

LOGGER.log('⛩️ Traveling to NewEdo ⛩️');

//==========================================================================================
//> Init Hook
//==========================================================================================
Hooks.once('init', async function () {
    LOGGER.log(`🌸🌸🌸 WELCOME TO NEWEDO SAMURAI 🌸🌸🌸`);

    // Add custom constants for configuration.
    CONFIG.NEWEDO = NEWEDO;

    // adds additional features to the global system reference
    newedo.utils = Object.assign(sysUtil, foundry.utils);
    newedo.application = applications;
    newedo.config = NEWEDO;
    newedo.data = dataModels;
    newedo.document = documents;
    newedo.elements = elements;
    newedo.helper = helpers;
    newedo.roll = helpers.NewedoRoll;

    // Add combat documents
    CONFIG.Combat.documentClass = documents.NewedoCombat;
    CONFIG.Combatant.documentClass = documents.NewedoCombatant;

    // Prepare document classes
    CONFIG.Actor.documentClass = documents.NewedoActor;
    CONFIG.Item.documentClass = documents.NewedoItem;

    // Link up system data models
    CONFIG.Actor.dataModels = dataModels.actor.config;
    CONFIG.Item.dataModels = dataModels.item.config;

    //register the system specific settings
    helpers.registerSystemSettings();
    helpers.registerHooks();
    helpers.handlebars.registerTemplates();
    helpers.handlebars.registerHelpers();

    // register actor sheets
    for (const sheet of applications.sheet.actor.config) {
        foundry.documents.collections.Actors.registerSheet("newedo", sheet.application, sheet.options);
    }

    // register item sheets
    for (const sheet of applications.sheet.item.config) {
        foundry.documents.collections.Items.registerSheet("newedo", sheet.application, sheet.options);
    }

    //==========================================================================================
    //> Register Socket Manager
    //==========================================================================================
    newedo.socket = new helpers.NewedoSocketManager();
});