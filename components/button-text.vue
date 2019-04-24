<template lang="pug">
div
  button(v-if="buttonAction=='copy'" v-clipboard:copy="text") {{ buttonText }}
  a(v-else :href="text" target="_blank" rel="noopener") {{ buttonText }}
  span(type="text" readonly="readonly") {{ text }}
</template>

<style lang="sass" scoped>
div
  display: flex
  align-items: center
  height: 30px
  &:not(:last-child)
    margin-bottom: 10px
  &:first-child
    margin-top: 0
  >button,
  >a
    color: white
    font-size: 10px
    font-weight: bold
    border-radius: 3px
    outline: none
    border: 0
    cursor: pointer
    background-color: #7f00ff
    height: 100%
    width: 80px
    margin: 0
    border-radius: 3px 0 0 3px
    display: flex
    align-items: center
    justify-content: center
    flex-shrink: 0
    &:not([disabled])
      &:hover
        background-color: lighten(#7f00ff, 10)
      &:active
        background-color: lighten(#7f00ff, 20)

  span
    height: 100%
    border: 0
    outline: 0
    background: none
    background-color: #4c4c4c
    color: #ccc
    border-radius: 0 3px 3px 0
    padding: 0 10px
    margin: 0
    font-size: 11px
    white-space: nowrap
    display: flex
    align-items: center
</style>

<script>
export default {
  props: {
    text: {
      type: String,
      required: true
    },
    buttonText: {
      type: String,
      default: 'Copy'
    },
    buttonAction: {
      type: String,
      default: 'copy'
    }
  }
}
</script>
