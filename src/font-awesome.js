import Vue from 'vue'

import { library } from '@fortawesome/fontawesome-svg-core'
import { faCircleNotch, faSyncAlt } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

library.add(faCircleNotch, faSyncAlt)

Vue.component('font-awesome-icon', FontAwesomeIcon)