<template lang="pug">
div
  button(@click="logout" v-if="isLogggedIn") ログアウト
  button(@click="login" v-else) ログイン
</template>

<style lang="sass" scoped>

</style>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  props: {
  },
  computed: {
    ...mapGetters('users', ['isLogggedIn', 'user', 'users'])
  },
  methods: {
    ...mapActions('users', [
      'login',
      'logout',
    ])
  }
}
</script>
