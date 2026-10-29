// Do not load the calculator bundle while the early Android redirect is active.
if (document.documentElement.dataset.storeRedirect !== 'true') {
 void import('./main.tsx')
}
export {}
