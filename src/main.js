import Vue from 'vue'
import App from './App.vue'
import './registerServiceWorker'
import store from './store'

import './font-awesome'

Vue.config.productionTip = false

import "monday-ui-style/dist/index.css";

import vuescroll from 'vuescroll';
Vue.use(vuescroll)

import VueLoading from 'vue-loading-template'
Vue.use(VueLoading, /** options **/)

new Vue({
  store,
  render: h => h(App)
}).$mount('#app')
