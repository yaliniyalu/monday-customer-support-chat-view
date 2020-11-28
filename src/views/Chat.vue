<template>
    <div class="home" @mousedown="markAsRead">
        <div class="header">
            <div class="customer">
                <div class="name">{{ customer.name || customer.id }}</div>
                <div class="id">{{  customer.id }}</div>
            </div>
            <div class="settings" @click="refresh"><font-awesome-icon icon="sync-alt"/></div>
        </div>
        <vue-scroll :ops="scrollOptions" ref="scroll">
            <div class="body">
                <div class="conversation">
                    <div class="message" :data-actor="chatAccount.id === message.from.id ? 'staff' : 'customer'" v-for="message in messages" :key="message.id">
                        <div style="padding: 15px">
                            <span v-if="message.text">{{ message.text }}</span>
                            <span v-else-if="message.html" v-html="message.html"></span>
                            <br>
                            <ul class="attachments">
                                <li v-for="(attachment, index) in message.attachments" :key="index">
                                    <a :href="getAttachmentUrl(message.id, attachment.id)" :download="attachment.name">{{ attachment.name || `attachment-${index}` }}</a>
                                </li>
                            </ul>
                            <span class="time">{{ message.date | date }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </vue-scroll>

        <div :class="{footer: true, 'ck-toolbar-visible': editorToolbarVisible}" @focus="editorFocus" @blur="editorBlur" v-if="cantEdit">
            <ckeditor v-model="editorMessage" :config="editorConfig"
                      @ready="editorReady"
                      @focus="editorFocus"
                      @blur="editorBlur"
                      ref="editor"
            ></ckeditor>
            <monday-button class="btn-send" color="primary" title="Send" @click="send" :loading="sending" />
        </div>
        <div v-else>
            <error-page :error="{ text: 'You dont have privilege to send/modify mails', type: 'warning' }"/>
        </div>
    </div>
</template>

<script>
// @ is an alias to /src

import moment from 'moment'
import CKEditor from 'ckeditor4-vue';
import MondayButton from "@/components/MondayButton";
import mondaySdk from "monday-sdk-js";
import ErrorPage from "@/views/ErrorPage";
import http from "@/http";
import base64url from 'base64-url'

const monday = mondaySdk();

export default {
    name: 'Chat',
    components: {
        ErrorPage,
        MondayButton,
        ckeditor: CKEditor.component
    },

    filters: {
        date(val) {
            return moment().utc(val).local().format(' LLL');
        }
    },

    data() {
        return {
            editorConfig: {
                toolbarGroups: [
                    { name: 'styles', groups: [ 'styles' ] },
                    { name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ] },
                    { name: 'paragraph', groups: [ 'list', 'indent', 'blocks', 'align', 'bidi', 'paragraph' ] },
                    { name: 'links', groups: [ 'links' ] },
                    { name: 'insert', groups: [ 'insert' ] },
                ],
                removeButtons: 'Source,Save,Templates,NewPage,ExportPdf,Preview,Print,Cut,Copy,Paste,PasteText,PasteFromWord,Undo,Redo,Find,Replace,SelectAll,Form,Scayt,Checkbox,Radio,TextField,Textarea,Select,Button,ImageButton,HiddenField,Subscript,Superscript,CopyFormatting,RemoveFormat,BidiLtr,BidiRtl,Language,Outdent,Indent,Blockquote,CreateDiv,Flash,SpecialChar,PageBreak,Iframe,Unlink,Anchor,Font,TextColor,BGColor,Maximize,ShowBlocks,About,Styles',
                extraPlugins: 'autogrow',
                autoGrow_minHeight: 50,
                autoGrow_maxHeight: 200
            },
            editorMessage: '',
            editorToolbarVisible: false,
            scrollOptions: {
                bar: {
                    background: '#cecece',
                    keepShow: false,
                    opacity: 0.5
                },
                scrollPanel: {
                    scrollingX: false,
                }
            },

            sending: false
        }
    },

    computed: {
        messages() {
            return this.$store.getters["chat/contextMessages"]
        },
        customer() {
            return this.$store.state.chat.customer
        },
        chatAccount() {
            return this.$store.state.auth.chatAccount;
        },
        chatId() {
            return this.$store.state.chat.id
        },
        sendingMessageStatus() {
            return this.$store.state.chat.sendingMessageStatus;
        },
        cantEdit() {
            const permission = this.$store.state.auth.permission
            if (permission === 'view')
                return false;

            if (permission === 'edit')
                return true;

            if (permission === 'assignee') {
                let owners = this.$store.state.chat.context.itemOwners;
                return !!owners.includes(this.$store.state.auth.me.id);
            }
        }
    },

    watch: {
        editorToolbarVisible() {
            this.$nextTick(() => {
                this.chatScrollToBottom();
            })
        },

        messages() {
            this.$nextTick(() => {
                this.chatScrollToBottom();
            })
        },

        sendingMessageStatus(val) {
            if (val === 'error') {
                this.sending = false;
                monday.execute("notice", {
                    message: "Unable to send message. Unknown error.",
                    type: "error",
                    timeout: 5000,
                });
            }
            else if (val === 'success') {
                this.sending = false;
                this.editorMessage = '';
            }
            else if (val === 'sending') {
                this.sending = true;
            }
        }
    },

    methods: {
        editorFocus(e) {
            this.editorToolbarVisible = true;
            this.markAsRead();
        },
        editorBlur(e) {
            this.editorToolbarVisible = false
        },
        editorReady() {
            this.editorBlur();
        },
        chatScrollToBottom() {
            this.$refs["scroll"].scrollTo({ y: '100%'}, 500, "easeInQuad");
        },
        chatScrollToBottomNoAnim() {
            this.$refs["scroll"].scrollTo({ y: '100%'}, 0);
        },
        getAttachmentUrl(message, attachment) {
            const board = this.$store.state.chat.context.board;
            const customer = this.$store.state.chat.customer.id;
            const token = this.$store.state.auth.accessToken;
            return http.defaults.baseURL + `board/${board}/customer/${base64url.encode(customer)}/message/${message}/attachment/${attachment}?token=${token}`
        },
        send() {
            if (!this.editorMessage) {
                return;
            }

            this.sending = true;
            this.$store.dispatch('chat/sendMessage', this.editorMessage)
        },

        markAsRead() {
            if (this.cantEdit) {
                this.$store.dispatch('chat/markUnreadMessageAsRead', this.chatId);
            }
        },
        refresh() {
            this.$store.dispatch("chat/syncMessages");
        }
    },

    mounted() {
        this.$nextTick(() => {
            this.chatScrollToBottomNoAnim();
        })
    }
}
</script>

<style lang="scss">
.home {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;

    .header {
        color: var(--primary-text-color);
        border-bottom: 1px solid var(--ui-border-color);
        display: flex;
        margin-bottom: 15px;

        .customer {
            .name {
                font-weight: 500;
                font-size: 18px;
            }

            .id {
                font-size: 12px;
            }

            padding: 5px 0;
            width: 100%;
        }

        .settings {
            width: 20px;
            align-self: center;
            cursor: pointer;
        }
    }

    .body {
        flex-grow: 1;
        //overflow: hidden;
    }

    .conversation {
        display: flex;
        flex-direction: column;

        .message {
            border-radius: var(--border-radius-medium);
            //padding: 15px;
            font-size: 16px;
            font-weight: 300;
            width: 85%;
            color: var(--primary-text-color);
            background: var(--primary-background-color);
            overflow: hidden;

            margin-bottom: 15px;

            &[data-actor=staff] {
                background: var(--dark-background-color);
                align-self: end;
            }

            &[data-actor=customer] {
                border: 1px solid var(--ui-border-color);
                align-self: start;
            }

            .attachments {
                list-style: none;
                padding: 0;
                a {
                    color: var(--link-color);
                    text-decoration: none;
                }
            }

            .time {
                display: block;
                text-align: right;
                color: var(--secondary-text-color);
                font-size: 12px;
                font-weight: 400;
                margin-top: 5px;
                font-style: italic;
            }
        }
    }

    .footer {
        text-align: right;
    }

    .cke_top {
        display: none;
        height: 0;
        opacity: 0;
        overflow: hidden;
        transition: height 2ms ease-in-out, opacity 2ms ease-in-out;
        background: none;
    }

    .ck-toolbar-visible .cke_top {
        display: block;
        height: auto;
        opacity: 1;
    }

    .ck-toolbar-visible {
        border-color: var(--primary-color);

    }

    .cke, .cke_inner, .cke_contents {
        border-radius: var(--border-radius-medium);
        border-color: var(--primary-color);
    }

    .cke_top {
        border-radius: var(--border-radius-medium) var(--border-radius-medium) 0 0;
        border-color: var(--primary-color);
        border-bottom-color: var(--ui-border-color);
    }
}

.btn-send {
    margin-top: 5px;
}
</style>
