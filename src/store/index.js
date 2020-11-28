import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

import chat from './modules/chat'
import auth from './modules/auth'
/*import settings from './modules/settings'*/

export default new Vuex.Store({
  modules: {
    chat,
    auth
    /*settings,*/
  },
  strict: process.env.NODE_ENV !== 'production',
})
