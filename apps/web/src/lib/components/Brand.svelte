<script lang="ts">
  interface Props {
    /** px size of the icon mark */
    size?: number;
    class?: string;
  }

  let { size = 22, class: className = '' }: Props = $props();
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 24 24"
  width={size}
  height={size}
  class={className}
  aria-hidden="true"
>
  <g stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" fill="none">
    <rect x="2" y="2" width="6.5" height="6.5" rx="1" fill="var(--color-paper)" />
    <rect x="8.75" y="2" width="6.5" height="6.5" rx="1" fill="var(--color-terracotta)" />
    <rect x="15.5" y="2" width="6.5" height="6.5" rx="1" fill="var(--color-paper)" />
    <rect x="2" y="8.75" width="6.5" height="6.5" rx="1" fill="var(--color-paper)" />
    <rect x="8.75" y="8.75" width="6.5" height="6.5" rx="1" fill="var(--color-sage)" />
    <rect x="15.5" y="8.75" width="6.5" height="6.5" rx="1" fill="currentColor" />
    <rect x="2" y="15.5" width="6.5" height="6.5" rx="1" fill="currentColor" />
    <rect x="8.75" y="15.5" width="6.5" height="6.5" rx="1" fill="var(--color-paper)" />
    <rect x="15.5" y="15.5" width="6.5" height="6.5" rx="1" fill="var(--color-paper)" />
  </g>
</svg>
