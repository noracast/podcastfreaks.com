import Vue from 'vue'
import moment from 'moment'

Vue.filter('capitalize', val => val.toUpperCase())
Vue.filter('formatDate', val => moment(String(val)).format('YYYY.MM.DD'))