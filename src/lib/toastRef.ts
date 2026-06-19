type ToastFn = (message: string, type?: 'error' | 'success' | 'info') => void

export const toastRef: { current: ToastFn | null } = {
  current: null,
}
