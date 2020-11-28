<template>
    <div>
        <p class="text-subtitle text-center">{{ text }}</p>
        <p class="text-subtitle text-center" v-if="code === 'auth-token-error'">
            Please connect your monday account and email account if not connected already. To connect set at least one integration.<br>
        </p>
    </div>
</template>

<script>
import MondayButton from "@/components/MondayButton";

import mondaySdk from "monday-sdk-js";
const monday = mondaySdk();

export default {
    name: "ErrorPage",
    components: {MondayButton},
    props: {
        error: {
            type: [String, Object],
            required: true
        }
    },

    computed: {
        text() {
            if (typeof this.error == "string") {
                return this.error;
            }

            return this.error.text;
        },

        code() {
            if (typeof this.error != "string" && this.error.code) {
                return this.error.code;
            }
            return null;
        }
    },

    methods: {

    }
}
</script>

<style scoped>

</style>