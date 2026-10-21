import type { Theme } from "vitepress";
import { useData } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { defineComponent, h, onMounted, watch } from "vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout: defineComponent({
    setup() {
      const { isDark } = useData();
      onMounted(() => {
        const requested = new URLSearchParams(window.location.search).get("scoutTheme");
        if (requested === "dark" || requested === "light") {
          isDark.value = requested === "dark";
        }
        watch(isDark, (dark) => {
          document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
        }, { immediate: true });
      });
      return () => h(DefaultTheme.Layout);
    },
  }),
} satisfies Theme;
