import LOGGER from "../helpers/logger.mjs";
let { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api

export default class NewedoApplication extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: 'newedo-app-{id}',
        tag: 'form',
        classes: ['newedo'],
        window: {
            frame: true,
            title: "New Window",
            icon: "fa-solid fa-note-sticky",
            minimizable: true,
            resizeable: true,
            positioned: true,
        },
        form: {
            submitOnChange: false,
            closeOnSubmit: true,
        }
    }

    // use a getter to return a parts object instead for dynamic templating
    static get PARTS() { return {} };

    async _prepareContext(options) { return {} };

    _onRender(context, options) {
        super._onRender(context, options);
        this._setupDragAndDrop();
    }

    /******************************************************************************************/
    /*                                                                                        */
    /*                                   DRAG N DROP                                          */
    /*                                                                                        */
    /******************************************************************************************/

    _setupDragAndDrop() {
        const dd = new foundry.applications.ux.DragDrop.implementation({
            dragSelector: "[data-item-uuid]",
            dropSelector: ".application",
            permissions: {
                dragstart: true,
                drop: true
            },
            callbacks: {
                dragstart: this._onDragStart.bind(this),
                drop: this._onDrop.bind(this)
            }
        });
        dd.bind(this.element);
    }

    /**
     * Prepares DragDrop data transfer
     * @param {*} event 
     */
    async _onDragStart(event) {
        const uuid = event.currentTarget.closest("[data-item-uuid]").dataset.itemUuid;
        if (!uuid) return;
        const item = await fromUuid(uuid);
        const data = item.toDragData();
        event.dataTransfer.setData("text/plain", JSON.stringify(data));
    }

    async _onDrop(event) {
        console.log('Got a drop')
        event.preventDefault();
        const target = event.target;
        const { type, uuid } = TextEditor.getDragEventData(event);
        if (!uuid) return;
        const item = await fromUuid(uuid);
        const itemData = item.toObject();

        // Clears meta data from owned items if neccesary
        const modification = {
            "-=_id": null,
            "-=ownership": null,
            "-=folder": null,
            "-=sort": null
        };

        switch (type) {
            case "Item":
                await this._onDropItem(event, item);
                break;
            case "Actor":
                await this._onDropActor(event, item);
                break;
            case "ActiveEffect":
                // Specific data to overide for active effects
                foundry.utils.mergeObject(modification, {
                    "duration.-=combat": null,
                    "duration.-=startRound": null,
                    "duration.-=startTime": null,
                    "duration.-=startTurn": null,
                    "system.source": null
                });
                await this._onDropActiveEffect(event, item);
                break;
            default: return;
        }
        // gets the new stuffs
        //foundry.utils.mergeObject(itemData, modification, { performDeletions: true });
        // gets the document class, then creats a new copy of it
        //getDocumentClass(type).create(itemData, { parent: this.document });
    }

    async _onDropItem(event, item) {

    }

    async _onDropActor(event, actor) {

    }

    async _onDropActiveEffect(event, effect) {

    }

    async _onSortItem(item, target) {
        if (item.documentName !== "Item") return;
        LOGGER.debug('Sorting item');
        const self = target.closest("[data-tab]")?.querySelector(`[data-item-uuid="${item.uuid}"]`);
        if (!self || !target.closest("[data-item-uuid]")) return;

        let sibling = target.closest("[data-item-uuid]") ?? null;
        if (sibling?.dataset.itemUuid === item.uuid) return;
        if (sibling) sibling = await fromUuid(sibling.dataset.itemUuid);

        let siblings = target.closest("[data-tab]").querySelectorAll("[data-item-uuid]");
        siblings = await Promise.all(Array.from(siblings).map(s => fromUuid(s.dataset.itemUuid)));
        siblings.findSplice(i => i === item);

        let updates = SortingHelpers.performIntegerSort(item, { target: sibling, siblings: siblings, sortKey: "sort" });
        updates = updates.map(({ target, update }) => ({ _id: target.id, sort: update.sort }));
        this.document.updateEmbeddedDocuments("Item", updates);
    }

    // used to modify sheet when dragging an item over a target
    // like a file upload site
    _onDragOver(event) {

    }
}