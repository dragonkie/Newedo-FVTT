import utils from "../../helpers/sysUtil.mjs";
import NewedoApplication from "../application.mjs";
import NewedoDialog from "../dialog.mjs";

/**
 * Extension of the default NewedoApplication for a character creation wizard
 * This application uses resources found in world and compendiums to populate its options
 * as well as world defined rules about custom character creation options
 */
export default class CharacterCreator extends NewedoApplication {
    static DEFAULT_OPTIONS = {
        classes: ['edo-character-creator'],
        window: {
            title: 'NEWEDO.App.CharacterCreator',
            icon: 'fas fa-paintbrush-pencil',
            minimizable: false,
            resizeable: false
        },
        actions: {

        }
    }

    static PARTS = {

    }

    async _prepareContext() {

    }
}