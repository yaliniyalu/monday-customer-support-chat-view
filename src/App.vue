<template>
    <div id="app" class="light-app-theme">

        <chat v-if="isSettingsAvailable && isAccessTokenAvailable && !isLoading && !error"/>

        <request-set-fields v-if="!isSettingsAvailable"/>

        <error-page v-if="error" :error="error"/>

        <vue-loading v-if="isLoading" type="bars" color="var(--primary-color)" :size="{ width: '50px', height: '50px' }"></vue-loading>
    </div>
</template>

<script>

import mondaySdk from "monday-sdk-js";
import RequestSetFields from "@/views/RequestSetFields";
import Chat from "@/views/Chat";
import ErrorPage from "@/views/ErrorPage";
const monday = mondaySdk();

/** @type WebSocket */
let socket = null;

export default {
    name: 'Home',
    components: {ErrorPage, Chat, RequestSetFields},
    data() {
        return {
        }
    },

    computed: {
        isLoading() {
            return this.$store.getters["chat/isLoading"];
        },

        isSettingsAvailable() {
            return this.$store.getters["chat/isSettingsAvailable"];
        },

        isAccessTokenAvailable() {
            return this.$store.getters['auth/isAccessTokenAvailable'];
        },

        isMondayTokenAvailable() {
            return this.$store.getters['auth/isMondayTokenAvailable'];
        },

        context() {
            return this.$store.state.chat.context;
        },

        settings() {
            return this.$store.state.chat.settings;
        },

        error() {
            return this.$store.state.chat.error;
        },
    },

    watch: {
        isMondayTokenAvailable(val) {
            if (this.context.board && !this.isAccessTokenAvailable) {
                this.$store.dispatch('auth/getAccessToken', this.context.board)
            }
        },

        isAccessTokenAvailable(val) {
            if (val) {
                this.$store.dispatch('chat/loadViewData');
                this.subscribeMails();
            }
            else {
                this.unSubscribeMails();
            }
        },

        settings() {
            if (this.isAccessTokenAvailable) {
                this.$store.dispatch('chat/loadViewData');
            }
        },
    },

    methods: {
        subscribeMails() {
            if (socket) {
                socket.close();
                socket = null;
            }

            socket = new WebSocket(`${process.env.VUE_APP_WEBSOCKET_URL}?type=client&auth_token=${this.$store.state.auth.accessToken}`);
            socket.addEventListener('message', ({ data }) => {
                data = JSON.parse(data);
                this.$store.commit('chat/addPushMessages', { messages: data })
            });
        },

        unSubscribeMails() {
            if (socket) {
                socket.close();
                socket = null;
            }
        }
    },

    mounted() {
        this.$store.dispatch('auth/getMondayToken');

        monday.listen("settings", (res) => {
            let fieldEmail = null;
            let fieldChatId = null;
            let fieldOwner = null;

            if (res.data.fieldEmail) {
                fieldEmail = Object.keys(res.data.fieldEmail)[0];
            }

            if (res.data.fieldChatId) {
                fieldChatId = Object.keys(res.data.fieldChatId)[0];
            }

            if (res.data.fieldOwner) {
                fieldOwner = Object.keys(res.data.fieldOwner)[0];
            }

            this.$store.commit('chat/setSettings', { fieldEmail, fieldChatId, fieldOwner });
        });

        monday.listen("context", (res) => {
            if (res.data.boardId) {
                this.$store.dispatch('chat/setContextBoard', res.data.boardId);
            }

            if (res.data.itemId) {
                this.$store.dispatch('chat/setContextItem', res.data.itemId);
            }
        });
    }
}

</script>

<style lang="scss">
@import '../node_modules/typeface-roboto/index.css';

body {
    margin: 0;
    height: 100vh;
    width: 100vw;
    max-width: 100vw;
    max-height: 100vh;

    font-family: "Roboto", helvetica, arial, sans-serif;
    font-weight: 300;
    line-height: 1.5;
}

#app {
    font-family: "Roboto", helvetica, arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;

    background: var(--primary-background-color);

    padding: 10px;

    height: calc(100vh - 60px);
    //height: calc(100vh - 20px);
    width: calc(100vw - 20px);
}

html, body, div, span, applet, object, iframe, h1, h2, h3, h4, h5, h6, p, blockquote, pre, a, abbr, acronym, address, big, cite, code, del, dfn, em, img, ins, kbd, q, s, samp, small, strike, strong, sub, sup, tt, var, b, u, i, center, dl, dt, dd, ol, ul, li, fieldset, form, label, legend, table, caption, tbody, tfoot, thead, tr, th, td, article, aside, canvas, details, embed, figure, figcaption, footer, header, hgroup, menu, nav, output, ruby, section, summary, time, mark, audio, video {
    margin: 0;
    padding: 0;
    border: 0;
    font-size: 100%;
    vertical-align: baseline;
}

.text-subtitle {
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 300;
    white-space: normal;

    color: var(--primary-text-color);
}

.text-center {
    text-align: center;
}
</style>
