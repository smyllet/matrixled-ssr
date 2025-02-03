export function useBack() {
  return () => {
    window.history.back()
  }
}
