import Vue from 'vue'
import moment from 'moment'

Vue.filter('addPlus', val => 100 <= val ? '100+' : val )
Vue.filter('capitalize', val => val.toUpperCase())
Vue.filter('formatDate', val => moment(String(val), moment.HTML5_FMT.DATETIME_LOCAL_SECONDS).format('YYYY.MM.DD'))
