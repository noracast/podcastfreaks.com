import Vue from 'vue'
import moment from 'moment'

Vue.filter('capitalize', val => val.toUpperCase())
Vue.filter('formatDate', val => moment(String(val), moment.HTML5_FMT.DATETIME_LOCAL_SECONDS).format('YYYY.MM.DD'))
Vue.filter('roughlyTime', val => {
  if(!val){
    return null
  }
  let _val = moment(String(val), 'HH:mm:ss')
  if(2 <= _val.hours()){
    return '120min+'
  }
  else if(1 <= _val.hours()){
    if(30 <= _val.minutes()) {
      return '90-120min'
    }
    return '60-90min'
  }
  else if(45 < _val.minutes()){
    return '45-60min'
  }
  else if(30 < _val.minutes()){
    return '30-45min'
  }
  else if(15 < _val.minutes()){
    return '15-30min'
  }
  return '0-15min'
})
