// only add `router.base = '/<repository-name>/'` if `DEPLOY_ENV` is `GH_PAGES`
const routerBase = process.env.DEPLOY_ENV === 'GH_PAGES' ? {
  router: {
    base: '/podcast-freaks/'
  },
  modules: [
    ['@nuxtjs/google-analytics', {
      id: 'UA-117929880-2'
    }]
   ]
} : {}

module.exports = routerBase