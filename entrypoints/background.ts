export default defineBackground(() => {
  browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
  browser.runtime.onInstalled.addListener(({ reason }) => {
    browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
    // Al instalar, se abre el Centro Navi para comenzar la guía de bienvenida.
    if (reason === 'install') browser.runtime.openOptionsPage().catch(console.error);
  });
});
