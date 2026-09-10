<template>
  <div>
    <button v-if="buttonAction=='copy'" class="action" @click="copy">{{ buttonText }}</button>
    <a-blank v-else class="action" :href="text">{{ buttonText }}</a-blank><!-- URL そのものも開けるようにする。ボタンが「コピー」のときはここからしか開けない
    --><a-blank class="value" :href="text">
      <!-- flex の直下のテキストには text-overflow が効かないため、
           省略を受け持つ要素を1つ挟む -->
      <span>{{ text }}</span>
    </a-blank>
  </div>
</template>

<style scoped>

div {
  display: flex;
  align-items: center;
  height: 30px;
  &:not(:last-child) {
    margin-bottom: 10px;
  }
  &:first-child {
    margin-top: 0;
  }
  >.action {
    color: white;
    font-size: 10px;
    font-weight: bold;
    border-radius: 3px;
    outline: none;
    border: 0;
    cursor: pointer;
    background-color: #7f00ff;
    height: 100%;
    width: 80px;
    margin: 0;
    border-radius: 3px 0 0 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    &:not([disabled]) {
      &:hover {
        background-color: #9933ff;
      }
      &:active {
        background-color: #b266ff;
      }
    }
  }
  >.value {
    height: 100%;
    border: 0;
    outline: 0;
    background-color: #000;
    color: #ccc;
    border-radius: 0 3px 3px 0;
    padding: 0 10px;
    margin: 0;
    font-size: 11px;
    display: flex;
    align-items: center;
    /* 長いURLで子行からはみ出さないよう、収まらない分は省略する */
    min-width: 0;
    & span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    &:hover {
      color: #fff;
    }
  }
}
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
  },
  methods: {
    // もとは vue-clipboard2 の v-clipboard ディレクティブを使っていた。
    // navigator.clipboard は https と localhost でしか使えないが、
    // このサイトは https で配信しているので足りる
    copy: function() {
      navigator.clipboard.writeText(this.text).catch(() => {
        // 権限が無いなどで書けないことがある。URL は隣に出ていて
        // 選んでコピーできるので、ここでは何もしない
      })
    }
  }
}
</script>
