export interface ToastMessage {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

let toasts = $state<ToastMessage[]>([]);

export const toastState = {
  get current() { return toasts; },
  show(message: string, type: "success" | "error" | "info" = "success") {
    const id = Date.now();
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== id);
    }, 4000);
  },
  dismiss(id: number) {
    toasts = toasts.filter(t => t.id !== id);
  }
};
