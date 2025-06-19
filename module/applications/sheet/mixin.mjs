import { NEWEDO } from "../../config.mjs";
import LOGGER from "../../helpers/logger.mjs";
import utils from "../../helpers/sysUtil.mjs";
import NewedoContextMenu from "../context-menu.mjs";


export default function NewedoSheetMixin(Base) {
    const mixin = foundry.applications.api.HandlebarsApplicationMixin;
    return class NewedoDocumentSheet extends mixin(Base) {

        static SHEET_MODES = { PLAY: 1, EDIT: 2 };

        static DEFAULT_OPTIONS = {
            classes: ['newedo', 'sheet'],
            form: { submitOnChange: true },
            window: { resizable: true },
            actions: {// Default actions must be static functions
                editImage: this._onEditImage,
                toggleSheet: this._onToggleSheet,
                toggleMode: this._onToggleMode,
                toggleOpacity: this._ontoggleOpacity,
                toggleEffect: this._onToggleEffect,
                editEffect: this._onEditEffect,
                deleteEffect: this._onDeleteEffect,
                createEffect: this._onCreateEffect,
                toggleDescription: this._onToggleDescription,
                copyToClipboard: this._onCopyToClipboard,
            }
        };

        //==========================================================================================
        //> Sheet mode controls
        //==========================================================================================
        _sheetMode = this.constructor.SHEET_MODES.PLAY;

        get sheetMode() {
            return this._sheetMode;
        }

        get isPlayMode() {
            return this._sheetMode === this.constructor.SHEET_MODES.PLAY;
        }

        get isEditMode() {
            return this._sheetMode === this.constructor.SHEET_MODES.EDIT;
        }

        //==========================================================================================
        //> Sheet tabs
        //==========================================================================================
        tabGroups = {};

        static TABS = {};

        async _prepareContext() {
            const doc = this.document;
            const rollData = doc.getRollData();

            const context = {
                document: doc,
                actor: doc.actor,
                config: NEWEDO,
                system: doc.system,
                schema: doc.system.schema,
                flags: doc.flags,
                userFlags: game.user.flags,
                user: game.user,
                name: doc.name,
                rollData: rollData,
                tabs: this._getTabs(),
                isEditMode: this.isEditMode,
                isPlayMode: this.isPlayMode,
                isEditable: this.isEditable
            }
            return context;

        }

        _getTabs() {
            return Object.values(this.constructor.TABS).reduce((acc, v) => {
                const isActive = this.tabGroups[v.group] === v.id;
                acc[v.id] = {
                    ...v,
                    active: isActive,
                    cssClass: isActive ? "item active" : "item",
                    tabCssClass: isActive ? "tab active" : "tab"
                };
                return acc;
            }, {});
        }

        //======================================================================================================
        //> Sheet user focus control
        //======================================================================================================
        _lastFocusElement = null;

        _setFocusElement() {
            if (this.rendered && this.element.contains(document.activeElement)) {
                const ele = document.activeElement;

                var cList = '';
                ele.classList.forEach(c => cList += `.${c}`);

                this._lastFocusElement = {
                    name: ele.name || '',
                    value: ele.value || '',
                    class: cList,
                    tag: ele.tagName.toLowerCase()
                }
            }
        }

        _getFocusElement() {
            if (this._lastFocusElement !== null) {
                let selector = this._lastFocusElement.tag + this._lastFocusElement.class;
                if (this._lastFocusElement.name) selector += `[name="${this._lastFocusElement.name}"]`;

                /** @type {HTMLElement|undefined}*/
                const targetElement = this.element.querySelector(selector);
                if (targetElement) {
                    targetElement.focus();
                    if (targetElement.tagName == 'INPUT') targetElement.select();
                }
            }
        }

        //======================================================================================================
        //> Sheet Actions
        //======================================================================================================
        getRollData() {
            return this.document.getRollData();
        }

        _onClickAction(event, target) {

        }

        static _onEditImage(event, target) {
            if (!this.isEditable) return;
            const current = this.document.img;
            const fp = new FilePicker({
                type: "image",
                current: current,
                callback: path => this.document.update({ 'img': path }),
                top: this.position.top + 40,
                left: this.position.left + 10
            });
            fp.browse();
        }

        static _onCopyToClipboard(event, target) {
            const ele = target.closest('[data-copy]');

            if (!ele) {
                utils.warn('NEWEDO.Notification.Error.NoCopyElement');
                return;
            }
            if (ele.dataset.copy) {
                navigator.clipboard.writeText(ele.dataset.copy);
                utils.info('NEWEDO.Notification.Notify.CopiedToClipboard');
            } else if (ele.value) {
                navigator.clipboard.writeText(ele.value);
                utils.info('NEWEDO.Notification.Notify.CopiedToClipboard');
            } else {
                utils.warn('NEWEDO.Notfication.Error.FailedToCopy');
            }
        }

        static _onToggleMode() {
            if (this.isPlayMode) this._sheetMode = this.constructor.SHEET_MODES.EDIT;
            else this._sheetMode = this.constructor.SHEET_MODES.PLAY;
            const lock = this.window.header.querySelector('.fa-lock, .fa-lock-open');
            lock.classList.toggle('fa-lock');
            lock.classList.toggle('fa-lock-open');
            this.render(false);
        }

        //==========================================================================================
        //> Close sheet
        //==========================================================================================
        _onClose(options) {
            this._lastFocusElement = null;
            super._onClose();
        }

        //==========================================================================================
        //> Rendering
        //==========================================================================================
        async render(options, _options) {
            return super.render(options, _options);
        }

        _configureRenderOptions(options) {
            super._configureRenderOptions(options);
            return;
        }

        async _preRender(context, options) {
            this._setFocusElement();
            return super._preRender(context, options);
        }

        _onFirstRender(context, options) {
            let r = super._onFirstRender(context, options);
            this._setupContextMenu();
            return r;
        }

        _onRender(context, options) {
            let r = super._onRender(context, options);

            // Disables sheet inputs for non owners
            if (!this.isEditable) this.element.querySelectorAll("input, select, textarea, multi-select").forEach(n => { n.disabled = true; });

            this._getFocusElement();

            this._setupDragAndDrop();
            return r;
        }
        // Enables drag and drop features
        async _renderHTML(context, options) {
            return super._renderHTML(context, options);
        }

        async _renderFrame(options) {
            const frame = super._renderFrame(options);

            // Insert additional buttons into the window header
            // In this scenario we want to add a lock button
            if (this.isEditable && !this.document.getFlag("core", "sheetLock")) {
                const label = game.i18n.localize("NEWEDO.Generic.LockToggle");
                const icon = this.isEditMode ? 'fa-lock-open' : 'fa-lock';
                const sheetConfig = `<button type="button" class="header-control fa-solid ${icon} icon" data-action="toggleMode" data-tooltip="${label}" aria-label="${label}"></button>`;
                this.window.close.insertAdjacentHTML("beforebegin", sheetConfig);
            }

            return frame;
        }

        //=======================================================================================================================
        //> Drag and Drop
        //=======================================================================================================================
        static drag_selectors = '[data-item-uuid]';
        static drop_selectors = '.application';
        _setupDragAndDrop() {
            const dd = new foundry.applications.ux.DragDrop.implementation({
                dragSelector: NewedoDocumentSheet.drag_selectors,
                dropSelector: NewedoDocumentSheet.drop_selectors,
                permissions: {
                    dragstart: this._canDragStart.bind(this),
                    drop: this._canDragDrop.bind(this)
                },
                callbacks: {
                    dragstart: this._onDragStart.bind(this),
                    drop: this._onDrop.bind(this)
                }
            });
            dd.bind(this.element);
        }

        _canDragStart(selector) {
            return this.isEditable;
        }

        _canDragDrop(selector) {
            return this.isEditable && this.document.isOwner;
        }

        /**
         * Prepares DragDrop data transfer
         * @param {*} event 
         */
        async _onDragStart(event) {
            LOGGER.debug(`SHEET | BASE | Drag Event Started`, event);
            const uuid = event.currentTarget.closest("[data-item-uuid]").dataset.itemUuid;
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

            if (item.parent === this.document) return this._onSortItem(item, target);

            switch (type) {
                case "ActiveEffect": return this._onDropActiveEffect(event, item);
                case "Item": return this._onDropItem(event, item);
                case "Actor": return this._onDropActor(event, item);
                default: return;
            }
        }

        //=========================================================================================
        //>- Drop Handlers
        //=========================================================================================
        async _onDropItem(event, item) {
            if (!Object.keys(this.document.constructor.metadata.embedded).includes(item.documentName)) return;
            const itemData = item.toObject();
            const modification = {
                "-=_id": null,
                "-=ownership": null,
                "-=folder": null,
                "-=sort": null
            };
            foundry.utils.mergeObject(itemData, modification, { performDeletions: true });
            foundry.documents.Item.create(itemData, { parent: this.document });
        }

        async _onDropActor(event, actor) { }

        async _onDropActiveEffect(event, effect) {
            if (!Object.keys(this.document.constructor.metadata.embedded).includes(effect.documentName)) return;
            // Clears meta data from owned items if neccesary
            const modification = {
                "-=_id": null,
                "-=ownership": null,
                "-=folder": null,
                "-=sort": null
            };
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

        // useful for things like highlighting when your on a drop target
        _onDragOver(event) {

        }

        _syncPartState(partId, newElement, priorElement, state) {
            super._syncPartState(partId, newElement, priorElement, state);

            // Refocus on a delta.
            const focus = newElement.querySelector(":focus");
            if (focus && focus.classList.contains("delta")) focus.select();

            // Fade in or out a toggled effect.
            if (partId === "effects") {
                newElement.querySelectorAll("[data-item-uuid].effect").forEach(n => {
                    const uuid = n.dataset.itemUuid;
                    const newWrapper = n.querySelector(".wrapper");
                    const oldWrapper = priorElement.querySelector(`[data-item-uuid="${uuid}"].effect .wrapper`);
                    if (oldWrapper) {
                        newWrapper.animate([
                            { opacity: oldWrapper.style.opacity },
                            { opacity: newWrapper.style.opacity }
                        ], { duration: 200, easing: "ease-in-out" });
                    }
                });
            }
        }

        //====================================================================================================================
        //> Context Menu
        //====================================================================================================================
        context_menu = undefined;
        _setupContextMenu() {
            if (!this.isEditable) return;
            this.context_menu = new NewedoContextMenu(this.element, "[data-item-uuid]", [], {
                jQuery: false,
                onOpen: (element) => {
                    const item = fromUuidSync(element.dataset.itemUuid);
                    if (!item) return;
                    switch (item.documentName) {
                        case "ActiveEffect": ui.context.menuItems = this._getEffectContextOptions(item); break;
                        case "Item": ui.context.menuItems = this._getItemContextOptions(item); break;
                    }
                },
                onClose: (element) => {

                }
            });
        }

        _getItemContextOptions(item) {
            const isOwner = item.isOwner;

            // lists of item types for specifying different item types
            const giftable = ['ammo', 'augment', 'armour', 'weapon', 'upgrade'];
            const equippable = ['armour', 'augment', 'weapon'];

            // Generic options available to all item types
            let options = [{
                name: "NEWEDO.ContextMenu.Item.Edit",
                icon: "<i class='fa-solid fa-edit'></i>",
                group: "common",
                condition: isOwner,
                callback: () => item.sheet.render(true)
            }, {
                name: "NEWEDO.ContextMenu.Item.Delete",
                icon: "<i class='fa-solid fa-trash'></i>",
                group: "common",
                condition: isOwner,
                callback: () => item.delete()
            }, {
                name: "NEWEDO.ContextMenu.Item.Gift",
                icon: '<i class="fa-solid fa-gift"></i>',
                group: 'gear',
                condition: isOwner && giftable.includes(item.type),
                callback: () => LOGGER.debug('sending away item')
            }, {
                name: "NEWEDO.ContextMenu.Item.Equip",
                icon: '<i class="fa-solid fa-hand-rock"></i>',
                group: 'gear',
                condition: isOwner && equippable.includes(item.type) && !item.system.equipped,
                callback: () => { item.update({ system: { equipped: !item.system.equipped } }) }
            }, {
                name: "NEWEDO.ContextMenu.Item.Unequip",
                icon: '<i class="fa-solid fa-hand-paper"></i>',
                group: 'gear',
                condition: isOwner && equippable.includes(item.type) && item.system.equipped,
                callback: () => { item.update({ system: { equipped: !item.system.equipped } }) }
            }]

            return options;
        }

        _getEffectContextOptions(item) {
            let options = [{
                name: "NEWEDO.ContextMenu.item.delete",
                icon: "<i class='fa-solid fa-trash'></i>",
                condition: () => isOwner,
                callback: () => item.delete()
            }]

            // swap the enable / disable effect option

            return options;
        }
    }
}