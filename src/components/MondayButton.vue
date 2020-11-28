<template>
  <button
      :type="type"
      :disabled="disabled"
      :class="btnClass"

      v-on="$listeners"
  >
    <span v-if="!loading">
      {{ title }}
    </span>
    <span v-else>
      <font-awesome-icon class="icon" icon="circle-notch" spin />
    </span>
  </button>
</template>

<script>
export default {
  name: "MondayButton",
  props: {
    title: {
      type: String,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    disabled: {
      type: Boolean,
      default: false
    },
    type: {
      type: String,
      default: 'button'
    },
    color: {
      type: String,
      default: "primary"
    },
    size: {
      type: String,
      default: "sm"
    }
  },

  computed: {
    btnClass() {
      let cls = [ 'btn' ];
      cls.push(`btn-${this.color}`);
      cls.push(`btn-${this.size}`);


      if (this.loading) {
        cls.push(`loading`);
        cls.push(`disabled`);
      }
      else if (this.disabled) {
        cls.push(`disabled`);
      }

      return cls;
    }
  }
}
</script>

<style lang="scss">
.btn {
  --loader-padding: 8px;
  outline: none;
  border: none;
  height: auto;
  font-family: Roboto, Arial, sans-serif;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  transition: transform 50ms, min-width 0.1s cubic-bezier(0, 0, 0.35, 1);
  --element-width: 32;
  --element-height: 32;
  min-width: var(--element-width);

  .icon {
    padding: 0 var(--loader-padding);
  }
}

.btn.btn-primary {
  color: var(--text-color-on-primary);
  background-color: var(--primary-color);
}

.btn.btn-primary:hover {
  background-color: var(--primary-hover-color);;
}

.btn.btn-sm {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: Roboto, Arial, sans-serif;
  font-size: 14px;
  font-weight: 400;
  padding: 4px 8px;
  min-height: 32px;
  line-height: 24px;
}

.btn.disabled {
  pointer-events: none;
}

</style>