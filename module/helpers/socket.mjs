import LOGGER from "./logger.mjs";
import utils from "./sysUtil.mjs";

/**
 * @typedef {Object} NewedoEvent
 * @prop {String} type - The event type to call / trigger
 * @prop {Object} data - Additional data to be sent
 * @prop {String[]|null} reciever - The targets to recieve the event, null will broadcast to all other clients
 * @prop {Boolean} response - If this event needs a response
 * @prop {Number} timeout - how long to wait before timeing out the request, 0 = no timeout
 */

/**
 * @typedef {Object} NotificationData
 * @prop {String} msg - The data to display
 * @prop {String} type - the type of notification
 * @prop {Boolean} localize - Should this message be localized
 * @prop {Boolean} permanent - Should the notification time out
 * @prop {Boolean} console - Should the notification time out
 * @prop {Object} config - Formatting values
 */

/**
 * @typedef {Object}  ResolveData
 * @prop {String} id - ID of the event being resolved
 * @prop {Boolean} resolved - if the event was completed succesfully or not according to the recievers
 */


/** Socket event manager for Newedo */
export default class NewedoSocketManager {

    /**
     * Constructor for the socket manager
     * intializes the default event handlers
     */
    constructor() {
        this.identifier = 'system.newedo';

        // register socket maps
        this.callbacks = new Map();
        this.listeners = new Map();
        this.requests = new Map();

        // register the socket handler
        game.socket.on(this.identifier, async (event) => {
            console.log('Recieved event', event)
            try {
                // Validate that we are meant to recieve this event
                if (event.reciever) {
                    let cancel = true;
                    if (typeof event.reciever == 'string') event.reciever = [event.reciever];
                    for (const user of event.reciever) if (user == game.user.id) cancel = false;
                    if (cancel) return;
                }

                // Check if we have the called event registered
                let f = this.listeners.get(event.type);
                if (!f) throw new Error('No registered listener for type: ' + event.type, event);

                // If there was a registered handler, call it and wait for its result
                let result = await f(event);
                if (event.response === false || event.type == 'RESOLVE') return result;

                this.resolve(event);

            } catch (err) {
                console.error(err);
                return null;
            }
        })

        // call the initial event manager setup
        this.#initialize();
    }

    DEFAULT_EVENTS = {
        /**
         * Resolves a previous socket event this client sent out
         * @param {NewedoEvent} event 
         * @param {ResolveData} event.data
         * @returns 
         */
        RESOLVE: async (event) => {
            if (this.callbacks.has(event.data.id)) {
                const cb = this.callbacks.get(event.data.id);
                let _d = cb(event);
                this.callbacks.delete(event.data.id);
                return _d;
            } else return event;
        },
        NOTIFICATION: async (event) => {
            const { message = '', type = 'info', ...config } = event.data;
            ui.notifications.notify(message, type, config);
        },
    }

    #initialize() {
        for (const [EVENT, FN] of Object.entries(this.DEFAULT_EVENTS)) this.registerEvent(EVENT, FN);
    }

    /**
     * 
     * @param {String} tag 
     * @param {Function} fn 
     */
    registerEvent(tag, fn) {
        this.listeners.set(tag, fn)
    }

    async emit(type, data, { recievers = null, callback = null, response = true } = {}) {

        const args = {
            type: type,// Event type
            data: data,// Data for this event
            reciever: recievers,// User targeted for this event
            sender: game.userId,// The user who triggered this event
            id: foundry.utils.randomID(),// ID used to watch for this specific event and it's callbacks
            response: response,
        }

        let serverAck = new Promise(resolve => {
            game.socket.emit(this.identifier, args, response => {
                resolve(args);
            });
        })

        // If this is a resoloution confirmation for a previous event, we dont need to register a callback and can just confirm the server recieved our request
        // Or if the user states they don't need a response, we can also skip it
        if (type == 'RESOLVE' || !response) return serverAck;

        // registers a client callback for when the target has resolved the request
        // and returns a promise that will be resolved when the callback is retrieved
        return new Promise(resolve => {
            this.callbacks.set(args.id, (response) => {
                if (typeof callback == 'function') {
                    callback(response)
                    resolve(response);
                } else resolve(response);
                this.callbacks.delete(response.id);
            })
        })
    };

    async resolve(event) {
        this.emit('RESOLVE', {
            id: event.id
        }, {
            reciever: event.sender,
            response: false,
        });
    }
}