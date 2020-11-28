import http from "@/http";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();

// state
const state = {
    mondayToken: null,
    accessToken: null,
    chatAccount: {
        name: null,
        id: null
    },
    me: {
        id: null,
        board_id: null
    },
    permission: 'view',
    accessTokenError: true,
}

//getters
const getters = {
    isMondayTokenAvailable(state) {
        return !!state.mondayToken;
    },
    isAccessTokenAvailable(state) {
        return !!state.accessToken;
    }
}

// actions
const actions = {
    async getAccessToken({ commit, state }, boardId) {
        commit('chat/addLoading', null, { root: true });

        try {
            const res = await http.post(`board/${boardId}/generate/token`, {}, {
                headers: {
                    Authorization: `Bearer ${state.mondayToken}`
                }
            });

            commit('setChatAccount', res.data.data['chat_account']);
            commit('setMe', res.data.data['me'])
            commit('setPermission', res.data.data['permission']['permission']);
            commit('setAccessToken', res.data.data.token);

            commit('chat/setError', null, { root: true })
        }
        catch(_) {
            commit('chat/setError', { text: 'Unable to get token', type: "error", code: "auth-token-error" }, { root: true })
        }

        commit('chat/removeLoading', null, { root: true })
    },

    getMondayToken({ commit }) {
        commit('chat/addLoading', null, { root: true })
        monday.get('sessionToken')
            .then(res => {
                commit('setMondayToken', res.data)
            })
            .catch(() => {
                commit('chat/setError', { text: 'Unable to get token', type: 'error' }, { root: true })
            })
            .finally(() => {
                commit('chat/removeLoading', null, { root: true })
            })
    },

    invalidateAuth({ commit }) {
        commit('setAccessToken', null);
        commit('setChatAccount', { id: null, name: null })
    }
}

// mutations
const mutations = {
    setMondayToken(state, token) {
        state.mondayToken = token;
    },

    setAccessToken(state, token) {
        http.defaults.headers.Authorization = `Bearer ${token}`
        state.accessToken = token;
    },

    setChatAccount(state, {id, name}) {
        state.chatAccount = {
            id,
            name
        }
    },

    setPermission(state, permission) {
        state.permission = permission
    },

    setMe(state, me) {
        state.me = me;
    }
}

export default {
    namespaced: true,
    state,
    getters,
    actions,
    mutations
}