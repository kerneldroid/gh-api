<script lang="ts">
  import { flip } from "svelte/animate";
  import { fly } from "svelte/transition";
  import { toastState } from "../toast.svelte";
  import { Icon } from "m3-svelte";
  import iconCheck from "@ktibow/iconset-material-symbols/check";
  import iconInfo from "@ktibow/iconset-material-symbols/info";
  import iconError from "@ktibow/iconset-material-symbols/error";

  const icons = {
    success: iconCheck,
    info: iconInfo,
    error: iconError
  };
</script>

<div class="toast-container" aria-live="polite">
  {#each toastState.current as toast (toast.id)}
    <div 
      class="toast toast-{toast.type}" 
      in:fly={{ y: 20, duration: 300 }} 
      out:fly={{ y: -20, duration: 250 }}
      animate:flip={{ duration: 200 }}
    >
      <div class="toast-icon">
        <Icon icon={icons[toast.type]} size={20} />
      </div>
      <span class="toast-message">{toast.message}</span>
      <button 
        type="button" 
        class="toast-close" 
        onclick={() => toastState.dismiss(toast.id)}
        aria-label="Dismiss notification"
      >
        &times;
      </button>
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 380px;
    width: calc(100vw - 48px);
  }

  .toast {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: var(--m3-shape-medium);
    box-shadow: var(--m3-elevation-3);
    font-size: 0.9rem;
    font-weight: 500;
    line-height: 1.4;
    transition: transform 0.2s ease;
  }

  .toast-success {
    background-color: var(--m3c-primary-container);
    color: var(--m3c-on-primary-container);
    border: 1px solid var(--m3c-primary);
  }

  .toast-info {
    background-color: var(--m3c-secondary-container);
    color: var(--m3c-on-secondary-container);
    border: 1px solid var(--m3c-secondary);
  }

  .toast-error {
    background-color: var(--m3c-error-container);
    color: var(--m3c-on-error-container);
    border: 1px solid var(--m3c-error);
  }

  .toast-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .toast-message {
    flex-grow: 1;
  }

  .toast-close {
    background: none;
    border: none;
    font-size: 1.25rem;
    color: inherit;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;
    opacity: 0.7;
    transition: opacity 0.2s;
  }

  .toast-close:hover {
    opacity: 1;
  }
</style>
