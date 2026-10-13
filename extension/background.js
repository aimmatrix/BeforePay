function scriptId(origin){return 'bp-'+origin.replace(/[^a-z0-9]/gi,'-');}
async function scanTab(tabId){
  const tab=await chrome.tabs.get(tabId);
  if(!tab.url||!/^https?:\/\//.test(tab.url))throw new Error('This page cannot be inspected. Open a shopping website.');
  await chrome.scripting.executeScript({target:{tabId},files:['content.js']});
  await chrome.scripting.executeScript({target:{tabId},func:()=>globalThis.BeforePayGuardian?.scan()});
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  // Only extension pages may request privileged actions.
  if(sender.id!==chrome.runtime.id||sender.url!==chrome.runtime.getURL('popup.html')){respond({ok:false,message:'Unsupported caller.'});return;}
  (async()=>{
    if(message.type==='SCAN_TAB')await scanTab(message.tabId);
    else if(message.type==='REGISTER_SITE'){
      const origin=message.origin;
      if(typeof origin!=='string'||!/^https?:\/\/[^/]+\/\*$/.test(origin)||!await chrome.permissions.contains({origins:[origin]}))throw new Error('Site permission is required.');
      const id=scriptId(origin);
      await chrome.scripting.unregisterContentScripts({ids:[id]}).catch(()=>{});
      await chrome.scripting.registerContentScripts([{id,matches:[origin],js:['content.js'],runAt:'document_idle',persistAcrossSessions:true}]);
    } else if(message.type==='UNREGISTER_SITE')await chrome.scripting.unregisterContentScripts({ids:[scriptId(message.origin)]}).catch(()=>{});
    else throw new Error('Unknown action.');
    respond({ok:true});
  })().catch(error=>respond({ok:false,message:error.message}));
  return true;
});
chrome.permissions.onRemoved.addListener(async()=>{
  for(const script of await chrome.scripting.getRegisteredContentScripts()){
    if(script.id.startsWith('bp-')&&!await chrome.permissions.contains({origins:script.matches}))await chrome.scripting.unregisterContentScripts({ids:[script.id]});
  }
});
