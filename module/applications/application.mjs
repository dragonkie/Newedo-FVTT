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

    //==========================================================================================
    //> Drag and Drop
    //==========================================================================================

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
        event.preventDefault();
        if (!this.isEditable) return;
        const target = event.target;
        const { type, uuid } = foundry.applications.ux.TextEditor.getDragEventData(event);
        const item = await fromUuid(uuid);
        const itemData = item.toObject();

        // Clears meta data from owned items if neccesary
        const modification = {
            "-=_id": null,
            "-=ownership": null,
            "-=folder": null,
            "-=sort": null
        };

        if (item.parent === this.document) return this._onSortItem(item, target);

        switch (type) {
            case "ActiveEffect": return this._onDropActiveEffect(event, item);
            case "Item": return this._onDropItem(event, item);
            case "Actor": return this._onDropActor(event, item);
            default: return;
        }
    }

    async _onDropItem(event, item) { }
    async _onDropActor(event, actor) { }
    async _onDropActiveEffect(event, effect) { }

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