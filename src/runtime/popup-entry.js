import {mountPopup} from 'beforepay-components';
let tab=null;
let state={supported:false,originLabel:'Loading current tab…',siteAccess:'manual',motion:'system',busy:false,error:null};
const permissionOrigin=()=>{const url=new URL(tab.url);return `${url.protocol}//${url.hostname}/*`;};
const ui=mountPopup(document.getElementById('app'),{onAction:async action=>{
  try {
    if(action.type!=='SET_MOTION'&&(!tab||!state.supported)) throw new Error('Open a regular shopping website first.');
    if(action.type==='REQUEST_SITE_ACCESS') {
      const origin=permissionOrigin();
      const granted=await chrome.permissions.request({origins:[origin]});
      if(!granted) throw new Error('Site access was declined. Manual checking remains available.');
      const reply=await chrome.runtime.sendMessage({type:'REGISTER_SITE',origin});
      if(!reply?.ok) throw new Error(reply?.message||'Automatic site access could not be enabled.');
      state.siteAccess='granted';
    } else if(action.type==='REMOVE_SITE_ACCESS') {
      const origin=permissionOrigin();
      await chrome.permissions.remove({origins:[origin]});
      await chrome.runtime.sendMessage({type:'UNREGISTER_SITE',origin});state.siteAccess='manual';
    } else if(action.type==='SET_MOTION') {
      await chrome.storage.local.set({motion:action.value});state.motion=action.value;
    } else if(action.type==='SCAN_ACTIVE_TAB') {
      state.busy=true;ui.update(state);
      const reply=await chrome.runtime.sendMessage({type:'SCAN_TAB',tabId:tab.id});
      if(!reply?.ok) throw new Error(reply?.message||'The current page could not be inspected.');
    }
    state.error=null;state.busy=false;ui.update(state);
    return {ok:true,state:{...state},message:action.type==='SCAN_ACTIVE_TAB'?'Pip opened on the current page.':null};
  } catch(error){state.busy=false;state.error=error?.message||'This action could not complete.';ui.update(state);return {ok:false,state:{...state},message:state.error};}
}});
ui.update(state);
(async()=>{
  try {
    [tab]=await chrome.tabs.query({active:true,currentWindow:true});
    const url=new URL(tab?.url||'about:blank');
    state.supported=['http:','https:'].includes(url.protocol)&&!/(^|\.)(mail\.google\.com|outlook\.live\.com|outlook\.office\.com|accounts\.google\.com)$/.test(url.hostname.replace(/\.$/,''));
    state.originLabel=state.supported?url.hostname:'Page not supported';
    if(state.supported)state.siteAccess=await chrome.permissions.contains({origins:[permissionOrigin()]})?'granted':'manual';
    state.motion=(await chrome.storage.local.get('motion')).motion||'system';
  } catch(error){state.error=error?.message||'This action could not complete.';}
  ui.update(state);
})();
