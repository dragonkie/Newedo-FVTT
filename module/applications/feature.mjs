import { NEWEDO } from "../config.mjs";
import { FeatureEffectData, FeatureItemData, FeatureTraitData } from "../data/feature.mjs";
import utils from "../helpers/sysUtil.mjs";
import NewedoApplication from "./application.mjs";
import NewedoDialog from "./dialog.mjs";

export class FeatureApplication extends NewedoApplication {
    static TEMPLATES = {
        CREATE: `systems/newedo/templates/dialog/feature/creator.hbs`,
        TRAIT: `systems/newedo/templates/dialog/feature/trait.hbs`,
        ITEM: `systems/newedo/templates/dialog/feature/item.hbs`,
        EFFECT: `systems/newedo/templates/dialog/feature/effect.hbs`,
    }

    static TYPES = [
        'trait',
        'item',
        'effect',
    ]

    static DEFAULT_OPTIONS = {
        classes: ['newedo', 'feature-app'],
        window: { title: "Feature Editor", },
        form: {
            submitOnChange: false,
            closeOnSubmit: false,
        },
        actions: {
            confirm: this._onConfirmChange,
            cancel: this._onCancelChange,
        }
    }

    static get PARTS() {
        return { form: { template: `systems/newedo/templates/dialog/feature.hbs` } }
    }

    constructor(document, feature) {
        super();
        if (!document || !feature) {
            utils.error(NEWEDO.error.noDocument);
            return {};
        }

        this.document = document;
        this.feature = feature;
    }

    /**
     * Creates a new feature of selected type from user input
     * @returns 
     */
    static async create() {

        // Wrapper to wait for the dialog box to be resolved for us
        const selection = await new Promise(async (resolve, reject) => {
            // creates the dialog input
            const app = await new NewedoDialog({
                window: { title: 'Create New Feature' },
                content: await foundry.applications.handlebars.renderTemplate(this.TEMPLATES.CREATE),
                buttons: [{
                    label: 'Cancel',
                    action: 'cancel',
                    callback: () => { reject('User Canceled') }
                }],
                close: () => { reject('User Canceled') },
                actions: {
                    featureTrait: () => {
                        resolve('trait');
                        app.close();
                    },
                    featureItem: () => {
                        resolve('item');
                        app.close();
                    },
                    featureEffect: () => {
                        resolve('effect');
                        app.close();
                    }
                }
            }).render(true);
        });

        // based of selection, augment the featyures data property
        switch (selection) {
            case 'trait':
                return new FeatureTraitData();
            case 'item':
                return new FeatureItemData()
            case 'effect':
                return new FeatureEffectData();
        }
    }

    async _prepareContext() {
        const context = {
            feature: this.feature,
            doc: this.document,
            user: game.user
        }

        if (this.feature.type == "item") {
            context.itemLinks = [];
            for (const i of this.feature.data.items) {
                context.itemLinks.push(await foundry.applications.ux.TextEditor.enrichHTML(`@UUID[${i.uuid}]{${i.name}}`));
            }
        }
        return context;
    }

    async _onDropItem(event, item) {
        if (this.feature.type == 'item') this.feature.data.items.push({ uuid: item.uuid, name: item.name });
        this.render(true);
    }

    static async _onConfirmChange(event, target) {
        const form = target.closest('form');

        const formData = form.querySelectorAll('name');

        const list = this.document.system.features;
        for (var i = 0; i < list.length; i++) {
            if (list[i].id == this.feature.id) {
                list[i] = this.feature;
                break;
            }
        }
        await this.document.update({ "system.features": list });
    }

    static async _onCancelChange(event, target) {
        this.close();
    }
}
