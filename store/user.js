import firebase from '~/plugins/firebase'
import { firebaseMutations, firebaseAction } from 'vuexfire'

const firestore = firebase.firestore()
const provider = new firebase.auth.TwitterAuthProvider()

Vue.use(Vuex)

export const state = () => ({
  currentUserId: null,
  users: []
})

export const getters = {
  users: state => state.users,
  user: state => state.users.filter(user => user.uid === state.currentUserId),
  currentUserId: state => state.currentUserId
}

export const mutations = {
  log(state, data) {
    console.log(state, data)
  },
  setCurrentUserId(state, { userId }) {
    state.currentUserId = userId
  },
  setUser(state, { user }) {
    state.user = user
  },
  ...firebaseMutations
}

export const actions = {
  async setCurrentUser({ commit }, { userId }) {
    commit('setCurrentUserId', { userId })
  },

  async saveUser({ commit }, { user }) {
    commit('log', true)
    const userRef = await Promise.all([
      usersCollection.doc(user.uid).set(user)
    ])
    return userRef
  },

  initUsers: firebaseAction(({ bindFirebaseRef }) => {
    bindFirebaseRef('users', usersCollection)
  }),

  async loginAnonymously({ commit, dispatch }) {
    const { user } = await firebase.auth().signInAnonymously()
    dispatch('saveUser', {
      user: {
        uid: user.uid
      }
    })
    commit('setCurrentUserId', { userId: user.uid })
  },

  async login({ commit, dispatch }) {
    await firebase.auth().signOut()
    const { user, credential, additionalUserInfo } = await firebase.auth().signInWithPopup(provider)
    dispatch('saveUser', {
      user: {
        uid: user.uid,
        twitterId: additionalUserInfo.profile.id_str,
        screenName: additionalUserInfo.profile.screen_name,
        profileImageUrl: additionalUserInfo.profile.profile_image_url
      },
      credential: {
        twitterAccessToken: credential.accessToken,
        twitterSecretToken: credential.secret
      }
    })
    this.$router.push(`/`)
    commit('setCurrentUserId', { userId: user.uid })
  },

  logout({ commit }) {
    firebase.auth().signOut()
    commit('setCurrentUserId', { userId: null })
  },

  popupWindow({ commit }, payload) {
    if (!process.browser) return false

    const w = 650
    const h = 450

    const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : screen.left
    const dualScreenTop = window.screenTop !== undefined ? window.screenTop : screen.top

    const width = window.innerWidth
      ? window.innerWidth
      : document.documentElement.clientWidth
      ? document.documentElement.clientWidth
      : screen.width
    const height = window.innerHeight
      ? window.innerHeight
      : document.documentElement.clientHeight
      ? document.documentElement.clientHeight
      : screen.height

    const left = width / 2 - w / 2 + dualScreenLeft
    const top = height / 2 - h / 2 + dualScreenTop

    const newWindow = window.open(
      payload.popup_url,
      payload.title,
      `scrollbars=yes, menubar=no, toolbar=no, width=${w}, height=${h}, top=${top}, left=${left}`
    )

    if (newWindow && window.focus) {
      newWindow.focus()
    }
    commit('log', true)
  }
}
