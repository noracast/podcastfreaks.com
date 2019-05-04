<template lang="pug">
div
  button(@click="login") ログイン
</template>

<style lang="sass" scoped>

</style>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  props: {
  },
  computed: {
    ...mapGetters('users', ['currentUserId', 'user', 'users'])
  },
  methods: {
    ...mapActions('users', [
      'login',
      'logout',
    ])
  }
}
</script>
