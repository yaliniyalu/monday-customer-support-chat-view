import http from "@/http";
import base64url from 'base64-url'

import mondaySdk from "monday-sdk-js";
import Vue from "vue";

const monday = mondaySdk();

const state = () => ({
    id: null,
    name: null,
    messages: [],
    customer: {
        name: null,
        id: null,
    },

    unreadMessages: {},

    context: {
        board: null,
        item: null,
        itemOwners: []
    },

    settings: {
        fieldEmail: null,
        fieldChatId: null,
        fieldOwner: null,
    },

    sendingMessageStatus: "unknown",
    loadingCounter: 0,
    error: null
})

// getters
const getters = {
    isLoading(state) {
        return state.loadingCounter > 0;
    },

    isSettingsAvailable(state) {
        return (state.settings.fieldEmail !== null && state.settings.fieldChatId !== null)
    },

    contextMessages(state) {
        return state.messages[state.id];
    }
}

// actions
const actions = {
    syncMessages({commit, state}, { chatId, customer }) {
        commit('addLoading');
        http.get(`board/${state.context.board}/customer/${base64url.encode(customer)}/chat/${chatId}/message`)
            .then(res => {
                commit('setMessages', { chatId, messages: res.data.data });
            })
            .catch(err => {
                commit('setError', { text: "Unable to get mails", type: "error" });
            })
            .finally(() => {
                commit('removeLoading')
            })
    },

    syncUnreadMessages({commit, dispatch, state},  { chatId, customer }) {
        http.get(`board/${state.context.board}/customer/${base64url.encode(customer)}/chat/${chatId}/message?unread=1`)
            .then(res => {
                commit('addMessages', { chatId, messages: res.data.data });
            })
            .catch(err => {
                // commit('setError', "Unable to get new mails");
            })
    },

    async loadViewData({commit, dispatch, state}) {
        commit('clearError');

        if (!state.context.item) {
            commit('setError', { text: "No items selected", type: "warning" });
            return;
        }

        if (!(state.settings.fieldEmail && state.settings.fieldChatId)) {
            return;
        }

        commit('addLoading');

        try {
            const fields = [
                state.settings.fieldEmail,
                state.settings.fieldChatId
            ];

            if (state.settings.fieldOwner) {
                fields.push(state.settings.fieldOwner)
            }

            const res = await monday.api(`
              query {
                items(limit: 1, ids:[${state.context.item}]) {
                  name
                  column_values(ids: [${'"' + fields.join('","') + '"'}]) {
                    id,
                    text,
                    value
                  }
                }
              }`
            );

            const item = res.data.items[0];

            const details = {};
            details.name = item.name;
            let owners = [];

            item.column_values.forEach(v => {
                if (v.id === state.settings.fieldEmail) {
                    const email = JSON.parse(v.value);
                    details.customer = {id: email.email, name: email.text};
                }
                else if (v.id === state.settings.fieldChatId) {
                    details.id = v.text;
                }
                else if (v.id === state.settings.fieldOwner) {
                    if (!v.value) {
                        return;
                    }
                    const data = JSON.parse(v.value)['personsAndTeams'];
                    data.forEach(v => {
                        if (v.kind === "person") {
                            owners.push(v.id);
                        }
                    })

                }
            });

            commit('setContextOwners', owners)
            dispatch('setChatDetails', details)
        }
        catch (e) {
            commit('setError', { text: "Unable to fetch column details", type: "error" } )
        }

        commit('removeLoading');
    },

    setChatDetails({ state, commit, dispatch }, { id, name, customer }) {
        commit('setChatName', name);
        commit('setChatId', id);
        commit('setCustomer', customer);

        if (!id) {
            commit("setError", { text: "No Chat Id", type: "error" } )
            return;
        }

        if (!customer.id) {
            commit("setError", { text: "No Email", type: "error" })
            return;
        }

        if (state.messages[id] && state.messages[id].length > 0) {
            dispatch('syncUnreadMessages', { chatId: id, customer: customer.id });
            return;
        }

        dispatch('syncMessages', { chatId: id, customer: customer.id });
    },

    setContextBoard({commit, dispatch, state, rootState}, board) {
        if (board === state.context.board) {
            return;
        }

        commit('setContextBoard', board)

        dispatch('auth/invalidateAuth', null, { root: true })

        if (board && rootState.auth.mondayToken) {
            dispatch('auth/getAccessToken', board, { root: true })
        }
    },

    setContextItem({commit, dispatch, state, rootState}, item) {
        if (item === state.context.item) {
            return;
        }

        commit('setContextItem', item);

        if (rootState.auth.accessToken) {
            dispatch('loadViewData');
        }
    },

    sendMessage({ state, commit }, message) {
        commit('setSendingMessageStatus', "sending");
        http.post(`board/${state.context.board}/customer/${base64url.encode(state.customer.id)}/chat/${state.id}/message/send`, { message: message })
            .then(res => {
                commit('addMessages', { chatId: state.id, messages: res.data.data });
                commit('setSendingMessageStatus', "success");
            })
            .catch(err => {
                commit('setSendingMessageStatus', "error");
            })
    },

    markUnreadMessageAsRead({ state, commit }, chatId) {
        if (!state.unreadMessages[chatId].length) {
            return;
        }

        const ids = state.unreadMessages[chatId].reduce((acc, v) => {
            acc.push(v.id);
            return acc;
        }, []);

        http.post(`board/${state.context.board}/customer/${base64url.encode(state.customer.id)}/message/mark/read`, { ids })
            .then(res => {
                commit('markUnreadMessageAsRead', { chatId, ids: res.data.data})
            })
            .catch(err => {

            })
    }
}

// mutations
const mutations = {
    setMessages(state, { chatId, messages }) {
        Vue.set(state.messages, chatId, [])
        Vue.set(state.unreadMessages, chatId, [])

        const unread = messages.filter(v => !v.isRead);
        state.unreadMessages[chatId].push(...unread)
        state.messages[chatId].push(...messages)
    },

    addMessages(state, { chatId, messages }) {
        if (state.messages[chatId].length) {
            const last = state.messages[chatId][state.messages[chatId].length - 1]
            messages = messages.filter(v => v.index > last.index)
        }

        const unread = messages.filter(v => !v.isRead);
        state.unreadMessages[chatId].push(...unread)
        state.messages[chatId].push(...messages)
    },

    addPushMessages(state, { messages }) {
        messages.forEach(v => {
            if (!state.messages[v.chatId]) {
                return;
            }
            state.messages[v.chatId].push(v)
        })
    },

    markUnreadMessageAsRead(state, { chatId, ids }) {
        state.unreadMessages[chatId] = state.unreadMessages[chatId].filter(v => {
            if (ids.includes(v.id)) {
                v.isRead = true;
                return false;
            }

            return true;
        })
    },

    setCustomer(state, customer) {
        state.customer = customer;
    },

    setChatId(state, id) {
        state.id = id;
    },

    setChatName(state, name) {
        state.name = name;
    },

    addLoading(state) {
        state.loadingCounter ++;
    },

    removeLoading(state) {
        state.loadingCounter --;
    },

    setSettings(state, { fieldEmail, fieldChatId, fieldOwner }) {
        state.settings = {
            fieldEmail,
            fieldChatId,
            fieldOwner,
        }
    },

    setContext(state, { board, item }) {
        state.context = {
            board,
            item
        }
    },

    setContextBoard(state, board) {
        state.context.board = board;
    },

    setContextItem(state, item) {
        state.context.item = item;
    },

    setContextOwners(state, owners) {
        state.context.itemOwners = owners;
    },

    setError(state, error) {
        state.error = error;
    },

    clearError(state) {
        state.error = null;
    },

    setSendingMessageStatus(state, message) {
        state.sendingMessageStatus = message;
    }
}

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}