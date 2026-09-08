import Vue from 'vue'
import moment from 'moment'

Vue.filter('capitalize', val => val.toUpperCase())
Vue.filter('formatDate', val => moment(String(val), moment.HTML5_FMT.DATETIME_LOCAL_SECONDS).format('YYYY.MM.DD'))
